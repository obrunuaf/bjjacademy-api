import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { DatabaseService } from '../../database/database.service';
import { CheckinDisponivelDto } from './dtos/checkin-disponivel.dto';
import { CheckinResponseDto } from './dtos/checkin-response.dto';
import { CreateCheckinDto } from './dtos/create-checkin.dto';

export type CurrentUser = {
  id: string;
  role: UserRole;
  academiaId: string;
};

type CheckinDisponivelRow = {
  aula_id: string;
  data_inicio: string;
  data_fim: string;
  status_aula: string;
  turma_nome: string;
  tipo_treino: string | null;
  ja_fez_checkin: boolean;
};

type AulaRow = {
  id: string;
  academia_id: string;
  status: string;
  qr_token: string | null;
  qr_expires_at: string | null;
};

@Injectable()
export class CheckinService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listarDisponiveis(
    currentUser: CurrentUser,
  ): Promise<CheckinDisponivelDto[]> {
    await this.ensureAlunoComMatriculaAtiva(
      currentUser.id,
      currentUser.academiaId,
    );

    const tz = this.databaseService.getAppTimezone();
    const { startUtc, endUtc } =
      await this.databaseService.getTodayBoundsUtc(tz);

    const aulas = await this.databaseService.query<CheckinDisponivelRow>(
      `
        select
          a.id as aula_id,
          a.data_inicio,
          a.data_fim,
          a.status as status_aula,
          t.nome as turma_nome,
          tt.nome as tipo_treino,
          (p.id is not null) as ja_fez_checkin
        from aulas a
        join turmas t on t.id = a.turma_id
        left join tipos_treino tt on tt.id = t.tipo_treino_id
        left join presencas p
          on p.aula_id = a.id
         and p.aluno_id = $4
         and p.academia_id = a.academia_id
        where a.academia_id = $1
          and a.data_inicio >= $2
          and a.data_inicio < $3
          and a.status <> 'CANCELADA'
        order by a.data_inicio asc;
      `,
      [currentUser.academiaId, startUtc, endUtc, currentUser.id],
    );

    return aulas.map((row) => ({
      aulaId: row.aula_id,
      turmaNome: row.turma_nome,
      dataInicio: new Date(row.data_inicio).toISOString(),
      dataFim: new Date(row.data_fim).toISOString(),
      tipoTreino: row.tipo_treino ?? null,
      statusAula: row.status_aula,
      jaFezCheckin: !!row.ja_fez_checkin,
    }));
  }

  async criarCheckin(
    dto: CreateCheckinDto,
    currentUser: CurrentUser,
  ): Promise<CheckinResponseDto> {
    await this.ensureAlunoComMatriculaAtiva(
      currentUser.id,
      currentUser.academiaId,
    );

    if (dto.tipo === 'QR' && !dto.qrToken) {
      throw new BadRequestException(
        'qrToken e obrigatorio para check-in via QR',
      );
    }

    const aula = await this.databaseService.queryOne<AulaRow>(
      `select id, academia_id, status, qr_token, qr_expires_at from aulas where id = $1 limit 1;`,
      [dto.aulaId],
    );

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    if (aula.academia_id !== currentUser.academiaId) {
      throw new ForbiddenException('Aula nao pertence a academia do usuario');
    }

    if (aula.status === 'CANCELADA') {
      throw new UnprocessableEntityException('Aula cancelada para check-in');
    }

    const jaExiste = await this.databaseService.queryOne<{
      id: string;
    }>(
      `
        select id
        from presencas
        where aula_id = $1
          and aluno_id = $2
          and academia_id = $3
        limit 1;
      `,
      [dto.aulaId, currentUser.id, currentUser.academiaId],
    );

    if (jaExiste) {
      throw new UnprocessableEntityException(
        'Aluno ja realizou check-in nesta aula',
      );
    }

    if (dto.tipo === 'QR') {
      if (!aula.qr_token || aula.qr_token !== dto.qrToken) {
        throw new UnprocessableEntityException('QR code invalido para a aula');
      }

      if (!aula.qr_expires_at || new Date(aula.qr_expires_at) <= new Date()) {
        throw new UnprocessableEntityException('QR code expirado');
      }
    }

    const status = dto.tipo === 'QR' ? 'PRESENTE' : 'PENDENTE';
    const origem = dto.tipo === 'QR' ? 'QR_CODE' : 'MANUAL';

    try {
      const presenca = await this.databaseService.queryOne<{
        id: string;
        aula_id: string;
        aluno_id: string;
        status: string;
        origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';
        criado_em: string;
      }>(
        `
          insert into presencas (academia_id, aula_id, aluno_id, status, origem, registrado_por)
          values ($1, $2, $3, $4, $5, $6)
          returning id, aula_id, aluno_id, status, origem, criado_em;
        `,
        [
          currentUser.academiaId,
          dto.aulaId,
          currentUser.id,
          status,
          origem,
          currentUser.id,
        ],
      );

      if (!presenca) {
        throw new InternalServerErrorException('Falha ao criar presenca');
      }

      return {
        id: presenca.id,
        aulaId: presenca.aula_id,
        alunoId: presenca.aluno_id,
        status: presenca.status as CheckinResponseDto['status'],
        origem: presenca.origem,
        criadoEm: new Date(presenca.criado_em).toISOString(),
        registradoPor: currentUser.id,
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new UnprocessableEntityException(
          'Aluno ja realizou check-in nesta aula',
        );
      }
      throw error;
    }
  }

  private async ensureAlunoComMatriculaAtiva(
    alunoId: string,
    academiaId: string,
  ): Promise<void> {
    const matriculaAtiva = await this.databaseService.queryOne<{ id: string }>(
      `
        select id
        from matriculas
        where usuario_id = $1
          and academia_id = $2
          and status = 'ATIVA'
        limit 1;
      `,
      [alunoId, academiaId],
    );

    if (matriculaAtiva) {
      return;
    }

    const existeAluno = await this.databaseService.queryOne<{ id: string }>(
      `select id from usuarios where id = $1 limit 1;`,
      [alunoId],
    );

    if (!existeAluno) {
      throw new NotFoundException('Aluno nao encontrado');
    }

    throw new ForbiddenException('Aluno nao possui matricula ativa na academia');
  }
}
