import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserRole } from '../../common/enums/user-role.enum';
import { DatabaseService } from '../../database/database.service';
import { AulaQrCodeDto } from './dtos/aula-qrcode.dto';
import { AulaDto } from './dtos/aula.dto';
import { AulaResponseDto } from './dtos/aula-response.dto';
import { CreateAulaDto } from './dtos/create-aula.dto';
import { CreateAulasLoteDto } from './dtos/create-aulas-lote.dto';
import { CreateAulasLoteResponseDto } from './dtos/create-aulas-lote-response.dto';
import { ListAulasQueryDto } from './dtos/list-aulas-query.dto';
import { UpdateAulaDto } from './dtos/update-aula.dto';

export type CurrentUser = {
  id: string;
  academiaId: string;
  roles?: UserRole[];
  role?: UserRole;
};

type AulaRow = {
  id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  turma_id: string;
  turma_nome: string;
  tipo_treino: string;
  instrutor_nome: string | null;
  instrutor_id?: string | null;
  turma_horario_padrao?: string | null;
  turma_dias_semana?: number[] | null;
  qr_token?: string | null;
  qr_expires_at?: string | null;
  deleted_at: string | null;
  academia_id: string;
};

@Injectable()
export class AulasService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listarHoje(currentUser: CurrentUser): Promise<AulaDto[]> {
    const tz = this.databaseService.getAppTimezone();
    const { startUtc, endUtc } =
      await this.databaseService.getTodayBoundsUtc(tz);

    const aulas = await this.databaseService.query<AulaRow>(
      `
        select
          a.id,
          a.data_inicio,
          a.data_fim,
          a.status,
          t.id as turma_id,
          t.nome as turma_nome,
          to_char(t.horario_padrao, 'HH24:MI') as turma_horario_padrao,
          tt.nome as tipo_treino,
          instrutor.nome_completo as instrutor_nome,
          a.deleted_at,
          a.academia_id
        from aulas a
        join turmas t on t.id = a.turma_id
        join tipos_treino tt on tt.id = t.tipo_treino_id
        left join usuarios instrutor on instrutor.id = t.instrutor_padrao_id
        where a.academia_id = $1
          and a.data_inicio >= $2
          and a.data_inicio < $3
          and a.status <> 'CANCELADA'
          and a.deleted_at is null
          and t.deleted_at is null
        order by a.data_inicio asc;
      `,
      [currentUser.academiaId, startUtc, endUtc],
    );

    return aulas.map((aula) => ({
      id: aula.id,
      dataInicio: new Date(aula.data_inicio).toISOString(),
      dataFim: new Date(aula.data_fim).toISOString(),
      status: aula.status,
      turmaId: aula.turma_id,
      turmaNome: aula.turma_nome,
      turmaHorarioPadrao: aula.turma_horario_padrao ?? '',
      tipoTreino: aula.tipo_treino,
      instrutorNome: aula.instrutor_nome ?? null,
    }));
  }

  async gerarQrCode(
    id: string,
    currentUser: CurrentUser,
  ): Promise<AulaQrCodeDto> {
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: false,
    });

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    const ttlMinutes = this.resolveQrTtlMinutes();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const qrToken = randomBytes(32).toString('hex');

    await this.databaseService.query(
      `
        update aulas
           set qr_token = $1,
               qr_expires_at = $2
         where id = $3
           and academia_id = $4;
      `,
      [qrToken, expiresAt, id, currentUser.academiaId],
    );

    return {
      aulaId: id,
      qrToken,
      expiresAt: expiresAt.toISOString(),
      turma: aula.turma_nome,
      horario: new Date(aula.data_inicio).toISOString(),
    };
  }

  async listar(
    query: ListAulasQueryDto,
    currentUser: CurrentUser,
  ): Promise<AulaResponseDto[]> {
    const { where, params } = await this.buildListQuery(query, currentUser);

    const aulas = await this.databaseService.query<AulaRow>(
      `
        select
          a.id,
          a.data_inicio,
          a.data_fim,
          a.status,
          a.turma_id,
          t.nome as turma_nome,
          tt.nome as tipo_treino,
          instrutor.nome_completo as instrutor_nome,
          t.instrutor_padrao_id as instrutor_id,
          to_char(t.horario_padrao, 'HH24:MI') as turma_horario_padrao,
          t.dias_semana as turma_dias_semana,
          a.deleted_at,
          a.academia_id
        from aulas a
        join turmas t on t.id = a.turma_id
        join tipos_treino tt on tt.id = t.tipo_treino_id
        left join usuarios instrutor on instrutor.id = t.instrutor_padrao_id
        where ${where.join(' and ')}
          order by a.data_inicio asc;
      `,
      params,
    );

    return aulas.map((row) => this.mapRow(row));
  }

  async detalhar(
    id: string,
    currentUser: CurrentUser,
    includeDeleted?: boolean,
  ): Promise<AulaResponseDto> {
    const allowDeleted = includeDeleted && this.userIsStaff(currentUser);
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: allowDeleted,
    });
    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    if (!allowDeleted && aula.deleted_at) {
      throw new NotFoundException('Aula nao encontrada');
    }

    return this.mapRow(aula, { includeQr: this.userIsStaff(currentUser) });
  }

  async criar(
    dto: CreateAulaDto,
    currentUser: CurrentUser,
  ): Promise<AulaResponseDto> {
    this.ensureStaff(currentUser);
    await this.validarTurma(dto.turmaId, currentUser.academiaId);
    this.ensureDateOrder(dto.dataInicio, dto.dataFim);
    await this.ensureAulaUnica(dto.turmaId, dto.dataInicio, currentUser.academiaId);

    const created = await this.databaseService.queryOne<AulaRow>(
      `
        insert into aulas (
          academia_id,
          turma_id,
          data_inicio,
          data_fim,
          status
        ) values ($1, $2, $3, $4, $5)
        returning
          id,
          data_inicio,
          data_fim,
          status,
          turma_id,
          (select nome from turmas where id = $2) as turma_nome,
          (select nome from tipos_treino where id = (select tipo_treino_id from turmas where id = $2)) as tipo_treino,
          (select u.nome_completo from usuarios u join turmas t on t.instrutor_padrao_id = u.id where t.id = $2) as instrutor_nome,
          (select instrutor_padrao_id from turmas where id = $2) as instrutor_id,
          (select to_char(horario_padrao, 'HH24:MI') from turmas where id = $2) as turma_horario_padrao,
          (select dias_semana from turmas where id = $2) as turma_dias_semana,
          qr_token,
          qr_expires_at,
          deleted_at,
          academia_id;
      `,
      [
        currentUser.academiaId,
        dto.turmaId,
        dto.dataInicio,
        dto.dataFim,
        dto.status ?? 'AGENDADA',
      ],
    );

    if (!created) {
      throw new BadRequestException('Falha ao criar aula');
    }

    return this.mapRow(created);
  }

  async criarEmLote(
    dto: CreateAulasLoteDto,
    currentUser: CurrentUser,
  ): Promise<CreateAulasLoteResponseDto> {
    this.ensureStaff(currentUser);

    if (new Date(dto.toDate) < new Date(dto.fromDate)) {
      throw new BadRequestException('toDate deve ser maior ou igual a fromDate');
    }

    const turma = await this.databaseService.queryOne<{
      id: string;
      dias_semana: number[];
      horario_padrao: string;
      deleted_at: string | null;
    }>(
      `
        select
          id,
          dias_semana,
          to_char(horario_padrao, 'HH24:MI') as horario_padrao,
          deleted_at
        from turmas
        where id = $1
          and academia_id = $2
        limit 1;
      `,
      [dto.turmaId, currentUser.academiaId],
    );

    if (!turma) {
      throw new NotFoundException('Turma nao encontrada');
    }

    if (turma.deleted_at) {
      throw new ConflictException('Turma deletada nao pode receber aulas');
    }

    const diasSemana = (dto.diasSemana ?? turma.dias_semana ?? []).map(Number);
    if (!diasSemana.length) {
      throw new BadRequestException(
        'diasSemana obrigatorio (informe no corpo ou configure na turma)',
      );
    }

    const horaInicio = dto.horaInicio ?? turma.horario_padrao;
    const duracaoMinutos = dto.duracaoMinutos ?? 90;
    const tz = this.databaseService.getAppTimezone();

    const candidatos = await this.databaseService.query<{
      data_inicio: string;
      data_fim: string;
      ja_existe: boolean;
    }>(
      `
        with params as (
          select
            $1::uuid as turma_id,
            $2::uuid as academia_id,
            $3::date as from_date,
            $4::date as to_date,
            $5::int[] as dias_semana,
            $6::time as hora_inicio,
            $7::int as duracao_minutos,
            $8::text as tz
        ),
        dias as (
          select generate_series(from_date, to_date, interval '1 day') as dia
          from params
        ),
        candidatas as (
          select
            (dia + hora_inicio)::timestamp at time zone (select tz from params) as data_inicio,
            ((dia + hora_inicio)::timestamp at time zone (select tz from params))
              + make_interval(mins := (select duracao_minutos from params)) as data_fim
          from dias, params
          where extract(dow from dia) = any(params.dias_semana)
        )
        select
          c.data_inicio,
          c.data_fim,
          exists (
            select 1
            from aulas a
            join params p
              on p.turma_id = a.turma_id
             and p.academia_id = a.academia_id
            where a.data_inicio = c.data_inicio
              and a.deleted_at is null
          ) as ja_existe
        from candidatas c
        order by c.data_inicio;
      `,
      [
        dto.turmaId,
        currentUser.academiaId,
        dto.fromDate,
        dto.toDate,
        diasSemana,
        horaInicio,
        duracaoMinutos,
        tz,
      ],
    );

    const paraCriar = candidatos.filter((c) => !c.ja_existe);
    const datasInicio = paraCriar.map((c) => c.data_inicio);
    const datasFim = paraCriar.map((c) => c.data_fim);

    let criadas = 0;
    if (datasInicio.length) {
      const inseridas = await this.databaseService.query<{ data_inicio: string }>(
        `
          insert into aulas (academia_id, turma_id, data_inicio, data_fim, status)
          select $1, $2, unnest($3::timestamptz[]), unnest($4::timestamptz[]), 'AGENDADA'
          returning data_inicio;
        `,
        [currentUser.academiaId, dto.turmaId, datasInicio, datasFim],
      );
      criadas = inseridas.length;
    }

    const conflitos = candidatos
      .filter((c) => c.ja_existe)
      .map((c) => ({
        dataInicio: new Date(c.data_inicio).toISOString(),
        motivo: 'Ja existe aula para a turma neste horario',
      }));

    return {
      criadas,
      ignoradas: conflitos.length,
      conflitos,
    };
  }

  async atualizar(
    id: string,
    dto: UpdateAulaDto,
    currentUser: CurrentUser,
  ): Promise<AulaResponseDto> {
    this.ensureStaff(currentUser);
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: false,
    });

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    if (dto.dataInicio || dto.dataFim) {
      this.ensureDateOrder(
        dto.dataInicio ?? aula.data_inicio,
        dto.dataFim ?? aula.data_fim,
      );
    }

    if (dto.dataInicio && dto.dataInicio !== aula.data_inicio) {
      await this.ensureAulaUnica(
        aula.turma_id,
        dto.dataInicio,
        currentUser.academiaId,
        aula.id,
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const push = (field: string, value: any) => {
      updates.push(`${field} = $${idx}`);
      params.push(value);
      idx += 1;
    };

    if (dto.dataInicio !== undefined) push('data_inicio', dto.dataInicio);
    if (dto.dataFim !== undefined) push('data_fim', dto.dataFim);
    if (dto.status !== undefined) push('status', dto.status);

    if (updates.length === 0) {
      return this.mapRow(aula);
    }

    params.push(id, currentUser.academiaId);

    const updated = await this.databaseService.queryOne<AulaRow>(
      `
        update aulas
           set ${updates.join(', ')}
         where id = $${idx}
           and academia_id = $${idx + 1}
         returning
           id,
           data_inicio,
           data_fim,
           status,
           turma_id,
           (select nome from turmas where id = turma_id) as turma_nome,
           (select nome from tipos_treino where id = (select tipo_treino_id from turmas where id = turma_id)) as tipo_treino,
           (select u.nome_completo from usuarios u join turmas t on t.instrutor_padrao_id = u.id where t.id = turma_id) as instrutor_nome,
           (select instrutor_padrao_id from turmas where id = turma_id) as instrutor_id,
           (select to_char(horario_padrao, 'HH24:MI') from turmas where id = turma_id) as turma_horario_padrao,
           (select dias_semana from turmas where id = turma_id) as turma_dias_semana,
           qr_token,
           qr_expires_at,
           deleted_at,
           academia_id;
      `,
      params,
    );

    if (!updated) {
      throw new NotFoundException('Aula nao encontrada');
    }

    return this.mapRow(updated);
  }

  async remover(id: string, currentUser: CurrentUser): Promise<void> {
    this.ensureStaff(currentUser);
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: true,
    });
    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    await this.databaseService.query(
      `
        update aulas
           set deleted_at = now(),
               qr_token = null,
               qr_expires_at = null
         where id = $1
           and academia_id = $2;
      `,
      [id, currentUser.academiaId],
    );
  }

  async restaurar(id: string, currentUser: CurrentUser): Promise<AulaResponseDto> {
    this.ensureStaff(currentUser);
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: true,
    });

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    if (!aula.deleted_at) {
      throw new ConflictException('Aula nao esta deletada');
    }

    await this.ensureAulaUnica(aula.turma_id, aula.data_inicio, currentUser.academiaId);

    await this.databaseService.query(
      `
        update aulas
           set deleted_at = null
         where id = $1
           and academia_id = $2;
      `,
      [id, currentUser.academiaId],
    );

    const restored = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: false,
    });

    if (!restored) {
      throw new NotFoundException('Aula nao encontrada apos restaurar');
    }

    return this.mapRow(restored);
  }

  async cancelar(id: string, currentUser: CurrentUser): Promise<AulaResponseDto> {
    this.ensureStaff(currentUser);
    const aula = await this.buscarAula(id, currentUser.academiaId, {
      includeDeleted: false,
    });

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    const updated = await this.databaseService.queryOne<AulaRow>(
      `
        update aulas
           set status = 'CANCELADA',
               qr_token = null,
               qr_expires_at = null
         where id = $1
           and academia_id = $2
         returning
           id,
           data_inicio,
           data_fim,
           status,
           turma_id,
           (select nome from turmas where id = turma_id) as turma_nome,
           (select nome from tipos_treino where id = (select tipo_treino_id from turmas where id = turma_id)) as tipo_treino,
           (select u.nome_completo from usuarios u join turmas t on t.instrutor_padrao_id = u.id where t.id = turma_id) as instrutor_nome,
           (select instrutor_padrao_id from turmas where id = turma_id) as instrutor_id,
           (select to_char(horario_padrao, 'HH24:MI') from turmas where id = turma_id) as turma_horario_padrao,
           (select dias_semana from turmas where id = turma_id) as turma_dias_semana,
           qr_token,
           qr_expires_at,
           deleted_at,
           academia_id;
      `,
      [id, currentUser.academiaId],
    );

    if (!updated) {
      throw new NotFoundException('Aula nao encontrada');
    }

    return this.mapRow(updated);
  }

  private ensureStaff(user: CurrentUser) {
    if (!this.userIsStaff(user)) {
      throw new ForbiddenException('Apenas staff pode executar esta acao');
    }
  }

  private userIsStaff(user: CurrentUser): boolean {
    const roles = (user.roles ?? (user.role ? [user.role] : [])).map((r) =>
      (r as string).toUpperCase(),
    );
    const allowed = [
      UserRole.INSTRUTOR,
      UserRole.PROFESSOR,
      UserRole.ADMIN,
      UserRole.TI,
    ];
    return roles.some((r) => allowed.includes(r as UserRole));
  }

  private ensureDateOrder(dataInicio: string, dataFim: string) {
    if (new Date(dataFim) <= new Date(dataInicio)) {
      throw new BadRequestException('dataFim deve ser maior que dataInicio');
    }
  }

  private async normalizeDateParam(
    value: string | undefined,
    tz: string,
    boundary: 'start' | 'end',
  ): Promise<Date | undefined> {
    if (!value) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const { startUtc, endUtc } =
        await this.databaseService.getDayBoundsUtc(value, tz);
      return boundary === 'start' ? startUtc : endUtc;
    }
    return new Date(value);
  }

  private async validarTurma(turmaId: string, academiaId: string) {
    const turma = await this.databaseService.queryOne<{ id: string; deleted_at: string | null }>(
      `
        select id, deleted_at
        from turmas
        where id = $1
          and academia_id = $2
        limit 1;
      `,
      [turmaId, academiaId],
    );

    if (!turma) {
      throw new NotFoundException('Turma nao encontrada');
    }

    if (turma.deleted_at) {
      throw new ConflictException('Turma deletada nao pode receber aulas');
    }
  }

  private async ensureAulaUnica(
    turmaId: string,
    dataInicio: string,
    academiaId: string,
    ignoreAulaId?: string,
  ) {
    const exists = await this.databaseService.queryOne<{ id: string }>(
      `
        select id
        from aulas
        where turma_id = $1
          and academia_id = $2
          and data_inicio = $3
          and deleted_at is null
          ${ignoreAulaId ? 'and id <> $4' : ''}
        limit 1;
      `,
      ignoreAulaId
        ? [turmaId, academiaId, dataInicio, ignoreAulaId]
        : [turmaId, academiaId, dataInicio],
    );

    if (exists) {
      throw new ConflictException(
        'Ja existe aula ativa para a turma neste horario',
      );
    }
  }

  private async buildListQuery(
    query: ListAulasQueryDto,
    currentUser: CurrentUser,
  ): Promise<{ where: string[]; params: any[] }> {
    const where = ['a.academia_id = $1', 't.deleted_at is null'];
    const params: any[] = [currentUser.academiaId];
    let idx = 2;

    const onlyDeleted = !!query.onlyDeleted;
    const includeDeleted = !!query.includeDeleted;
    const isStaff = this.userIsStaff(currentUser);

    if ((onlyDeleted || includeDeleted) && !isStaff) {
      throw new ForbiddenException('Apenas staff pode listar aulas deletadas');
    }

    if (onlyDeleted) {
      where.push('a.deleted_at is not null');
    } else if (!includeDeleted) {
      where.push('a.deleted_at is null');
    }

    if (query.turmaId) {
      where.push(`a.turma_id = $${idx}`);
      params.push(query.turmaId);
      idx += 1;
    }

    if (query.status) {
      where.push(`a.status = $${idx}`);
      params.push(query.status);
      idx += 1;
    }

    const tz = this.databaseService.getAppTimezone();
    const fromValue = await this.normalizeDateParam(query.from, tz, 'start');
    const toValue = await this.normalizeDateParam(query.to, tz, 'end');

    if (fromValue && toValue && new Date(toValue) < new Date(fromValue)) {
      throw new BadRequestException('to deve ser maior ou igual a from');
    }

    if (fromValue) {
      where.push(`a.data_inicio >= $${idx}`);
      params.push(fromValue);
      idx += 1;
    }

    if (toValue) {
      where.push(`a.data_inicio < $${idx}`);
      params.push(toValue);
      idx += 1;
    }

    if (!fromValue && !toValue) {
      const { startUtc, endUtc } =
        await this.databaseService.getTodayBoundsUtc(tz);
      where.push(`a.data_inicio >= $${idx}`);
      where.push(`a.data_inicio < $${idx + 1}`);
      params.push(startUtc, endUtc);
    }

    return { where, params };
  }

  private async buscarAula(
    id: string,
    academiaId: string,
    opts?: { includeDeleted?: boolean },
  ): Promise<AulaRow | null> {
    return this.databaseService.queryOne<AulaRow>(
      `
        select
          a.id,
          a.data_inicio,
          a.data_fim,
          a.status,
          a.turma_id,
          t.nome as turma_nome,
          tt.nome as tipo_treino,
          instrutor.nome_completo as instrutor_nome,
          t.instrutor_padrao_id as instrutor_id,
          to_char(t.horario_padrao, 'HH24:MI') as turma_horario_padrao,
          t.dias_semana as turma_dias_semana,
          a.qr_token,
          a.qr_expires_at,
          a.deleted_at,
          a.academia_id
        from aulas a
        join turmas t on t.id = a.turma_id
        join tipos_treino tt on tt.id = t.tipo_treino_id
        left join usuarios instrutor on instrutor.id = t.instrutor_padrao_id
        where a.id = $1
          and a.academia_id = $2
          and t.deleted_at is null
          ${opts?.includeDeleted ? '' : 'and a.deleted_at is null'}
        limit 1;
      `,
      [id, academiaId],
    );
  }

  private resolveQrTtlMinutes(): number {
    const raw = Number(process.env.QR_TTL_MINUTES ?? 5);
    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }
    return 5;
  }

  private mapRow(
    row: AulaRow,
    opts?: { includeQr?: boolean },
  ): AulaResponseDto {
    return {
      id: row.id,
      turmaId: row.turma_id,
      turmaNome: row.turma_nome,
      turmaHorarioPadrao: row.turma_horario_padrao ?? null,
      turmaDiasSemana: Array.isArray(row.turma_dias_semana)
        ? row.turma_dias_semana.map(Number)
        : null,
      dataInicio: new Date(row.data_inicio).toISOString(),
      dataFim: new Date(row.data_fim).toISOString(),
      status: row.status,
      tipoTreino: row.tipo_treino,
      instrutorPadraoId: row.instrutor_id ?? null,
      instrutorNome: row.instrutor_nome ?? null,
      qrToken: opts?.includeQr ? row.qr_token ?? null : null,
      qrExpiresAt:
        opts?.includeQr && row.qr_expires_at
          ? new Date(row.qr_expires_at).toISOString()
          : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    };
  }
}
