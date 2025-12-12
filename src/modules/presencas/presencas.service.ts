import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { DatabaseService } from '../../database/database.service';
import { CheckinResponseDto } from '../checkin/dtos/checkin-response.dto';
import { HistoricoPresencaDto } from './dtos/historico-presenca.dto';
import { PresencaPendenteDto } from './dtos/presenca-pendente.dto';
import { UpdatePresencaStatusDto } from './dtos/update-presenca-status.dto';

export type CurrentUser = {
  id: string;
  role: UserRole;
  roles: UserRole[];
  academiaId: string;
};

type PresencaPendenteRow = {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aula_id: string;
  turma_nome: string;
  data_inicio: string;
  origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';
  status: string;
};

type PresencaRow = {
  id: string;
  academia_id: string;
  aula_id: string;
  aluno_id: string;
  status: string;
  origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';
  criado_em: string;
  registrado_por: string | null;
};

@Injectable()
export class PresencasService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listarPendencias(
    currentUser: CurrentUser,
  ): Promise<PresencaPendenteDto[]> {
    const tz = this.databaseService.getAppTimezone();
    const { startUtc, endUtc } =
      await this.databaseService.getTodayBoundsUtc(tz);

    const pendencias = await this.databaseService.query<PresencaPendenteRow>(
      `
        select
          p.id,
          p.aluno_id,
          u.nome_completo as aluno_nome,
          p.aula_id,
          t.nome as turma_nome,
          a.data_inicio,
          p.origem,
          p.status
        from presencas p
        join aulas a on a.id = p.aula_id
        join turmas t on t.id = a.turma_id
        join usuarios u on u.id = p.aluno_id
        where p.academia_id = $1
          and a.academia_id = $1
          and p.status = 'PENDENTE'
          and a.data_inicio >= $2
          and a.data_inicio < $3
        order by a.data_inicio asc;
      `,
      [currentUser.academiaId, startUtc, endUtc],
    );

    return pendencias.map((row) => ({
      id: row.id,
      alunoId: row.aluno_id,
      alunoNome: row.aluno_nome,
      aulaId: row.aula_id,
      turmaNome: row.turma_nome,
      dataInicio: new Date(row.data_inicio).toISOString(),
      origem: row.origem,
      status: 'PENDENTE',
    }));
  }

  async atualizarStatus(
    id: string,
    dto: UpdatePresencaStatusDto,
    currentUser: CurrentUser,
  ): Promise<CheckinResponseDto> {
    const existente = await this.databaseService.queryOne<PresencaRow>(
      `
        select id, academia_id, aula_id, aluno_id, status, origem, criado_em, registrado_por
        from presencas
        where id = $1
        limit 1;
      `,
      [id],
    );

    if (!existente) {
      throw new NotFoundException('Presenca nao encontrada');
    }

    if (existente.academia_id !== currentUser.academiaId) {
      throw new ForbiddenException(
        'Presenca nao pertence a academia do usuario',
      );
    }

    const atualizada = await this.databaseService.queryOne<PresencaRow>(
      `
        update presencas
           set status = $1,
               registrado_por = $2
         where id = $3
           and academia_id = $4
         returning id, aula_id, aluno_id, status, origem, criado_em, registrado_por;
      `,
      [dto.status, currentUser.id, id, currentUser.academiaId],
    );

    if (!atualizada) {
      throw new NotFoundException('Presenca nao encontrada');
    }

    return {
      id: atualizada.id,
      aulaId: atualizada.aula_id,
      alunoId: atualizada.aluno_id,
      status: atualizada.status as CheckinResponseDto['status'],
      origem: atualizada.origem,
      criadoEm: new Date(atualizada.criado_em).toISOString(),
      registradoPor: atualizada.registrado_por ?? undefined,
    };
  }

  async historicoDoAluno(
    alunoId: string,
    currentUser: CurrentUser,
    filters?: { from?: string; to?: string; limit?: number },
  ): Promise<HistoricoPresencaDto[]> {
    await this.ensureAlunoScope(alunoId, currentUser);

    const whereClauses = [
      'p.aluno_id = $1',
      'p.academia_id = $2',
      'a.academia_id = $2',
    ];
    const params: (string | number)[] = [alunoId, currentUser.academiaId];
    let paramIndex = params.length;

    const fromDate = this.parseDateFilter(filters?.from, 'from');
    if (fromDate) {
      paramIndex += 1;
      whereClauses.push(`a.data_inicio::date >= $${paramIndex}`);
      params.push(fromDate);
    }

    const toDate = this.parseDateFilter(filters?.to, 'to');
    if (toDate) {
      paramIndex += 1;
      whereClauses.push(`a.data_inicio::date <= $${paramIndex}`);
      params.push(toDate);
    }

    const limit = Math.min(filters?.limit ?? 50, 100);
    params.push(limit);
    paramIndex += 1;

    const historico = await this.databaseService.query<{
      id: string;
      aula_id: string;
      data_inicio: string;
      turma_nome: string;
      tipo_treino: string | null;
      status: string;
      origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';
      criado_em: string;
    }>(
      `
        select
          p.id,
          p.aula_id,
          a.data_inicio,
          t.nome as turma_nome,
          tt.nome as tipo_treino,
          p.status,
          p.origem,
          p.criado_em
        from presencas p
        join aulas a on a.id = p.aula_id
        join turmas t on t.id = a.turma_id
        left join tipos_treino tt on tt.id = t.tipo_treino_id
        where ${whereClauses.join(' and ')}
        order by a.data_inicio desc
        limit $${paramIndex};
      `,
      params,
    );

    return historico.map((row) => ({
      presencaId: row.id,
      aulaId: row.aula_id,
      dataInicio: new Date(row.data_inicio).toISOString(),
      turmaNome: row.turma_nome,
      tipoTreino: row.tipo_treino ?? null,
      status: row.status as HistoricoPresencaDto['status'],
      origem: row.origem,
    }));
  }

  private async ensureAlunoScope(
    alunoId: string,
    currentUser: CurrentUser,
  ): Promise<void> {
    if (currentUser.role === UserRole.ALUNO && currentUser.id !== alunoId) {
      throw new ForbiddenException('Aluno so pode acessar o proprio historico');
    }

    const vinculo = await this.databaseService.queryOne<{ academia_id: string }>(
      `
        select academia_id
        from usuarios_papeis
        where usuario_id = $1
          and academia_id = $2
        union
        select academia_id
        from matriculas
        where usuario_id = $1
          and academia_id = $2
        limit 1;
      `,
      [alunoId, currentUser.academiaId],
    );

    if (vinculo) {
      return;
    }

    const existeAluno = await this.databaseService.queryOne<{ id: string }>(
      `select id from usuarios where id = $1 limit 1;`,
      [alunoId],
    );

    if (!existeAluno) {
      throw new NotFoundException('Aluno nao encontrado');
    }

    throw new ForbiddenException('Aluno pertence a outra academia');
  }

  private parseDateFilter(
    value?: string,
    field: 'from' | 'to' = 'from',
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Parametro ${field} invalido`);
    }

    return value;
  }
}
