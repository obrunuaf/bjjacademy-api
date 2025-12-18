import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MatriculaPendenteDto } from './dtos/matricula-pendente.dto';
import {
  DecisaoMatriculaDto,
  DecisaoMatriculaEnum,
  DecisaoMatriculaResponseDto,
} from './dtos/decisao-matricula.dto';
import { EmailService } from '../email/email.service';

type CurrentUser = {
  id: string;
  academiaId: string;
};

@Injectable()
export class MatriculasService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  async listarPendentes(user: CurrentUser): Promise<MatriculaPendenteDto[]> {
    const rows = await this.databaseService.query<{
      id: string;
      usuario_id: string;
      nome_completo: string;
      email: string;
      telefone: string | null;
      numero_matricula: number;
      status: string;
      criado_em: string;
    }>(
      `
        SELECT 
          m.id,
          m.usuario_id,
          u.nome_completo,
          u.email,
          u.telefone,
          m.numero_matricula,
          m.status,
          m.criado_em
        FROM matriculas m
        JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.academia_id = $1
          AND m.status = 'PENDENTE'
        ORDER BY m.criado_em DESC
      `,
      [user.academiaId],
    );

    return rows.map((row) => ({
      id: row.id,
      usuarioId: row.usuario_id,
      nomeCompleto: row.nome_completo,
      email: row.email,
      telefone: row.telefone,
      numeroMatricula: row.numero_matricula,
      status: row.status,
      dataSolicitacao: row.criado_em,
    }));
  }

  async decidir(
    matriculaId: string,
    dto: DecisaoMatriculaDto,
    user: CurrentUser,
  ): Promise<DecisaoMatriculaResponseDto> {
    // Verify matricula exists and belongs to user's academia
    const matricula = await this.databaseService.queryOne<{
      id: string;
      usuario_id: string;
      status: string;
      academia_id: string;
      aluno_nome: string;
      aluno_email: string;
      academia_nome: string;
    }>(
      `
        SELECT 
          m.id, m.usuario_id, m.status, m.academia_id,
          u.nome_completo as aluno_nome,
          u.email as aluno_email,
          a.nome as academia_nome
        FROM matriculas m
        JOIN usuarios u ON u.id = m.usuario_id
        JOIN academias a ON a.id = m.academia_id
        WHERE m.id = $1
      `,
      [matriculaId],
    );

    if (!matricula) {
      throw new NotFoundException('Matricula nao encontrada');
    }

    if (matricula.academia_id !== user.academiaId) {
      throw new NotFoundException('Matricula nao encontrada');
    }

    if (matricula.status !== 'PENDENTE') {
      throw new BadRequestException(
        `Matricula ja foi processada (status: ${matricula.status})`,
      );
    }

    const novoStatus =
      dto.decisao === DecisaoMatriculaEnum.APROVAR ? 'ATIVA' : 'INATIVA';

    // Update matricula status
    await this.databaseService.query(
      `UPDATE matriculas SET status = $1 WHERE id = $2`,
      [novoStatus, matriculaId],
    );

    // If approved and faixaInicialSlug provided, update user's belt
    if (dto.decisao === DecisaoMatriculaEnum.APROVAR && dto.faixaInicialSlug) {
      await this.databaseService.query(
        `UPDATE usuarios SET faixa_atual_slug = $1, grau_atual = 0 WHERE id = $2`,
        [dto.faixaInicialSlug, matricula.usuario_id],
      );
    }

    // Send notification email (don't await to avoid blocking)
    if (dto.decisao === DecisaoMatriculaEnum.APROVAR) {
      this.emailService
        .sendMatriculaAprovadaEmail(
          matricula.aluno_email,
          matricula.aluno_nome,
          matricula.academia_nome,
        )
        .catch((err) =>
          console.error('Error sending matricula approval email:', err),
        );
    } else {
      this.emailService
        .sendMatriculaRejeitadaEmail(
          matricula.aluno_email,
          matricula.aluno_nome,
          matricula.academia_nome,
          dto.motivoRejeicao,
        )
        .catch((err) =>
          console.error('Error sending matricula rejection email:', err),
        );
    }

    const message =
      dto.decisao === DecisaoMatriculaEnum.APROVAR
        ? 'Matricula aprovada com sucesso'
        : 'Matricula rejeitada';

    return {
      id: matriculaId,
      status: novoStatus,
      message,
    };
  }
}
