import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserRole } from '../../common/enums/user-role.enum';
import { DatabaseService } from '../../database/database.service';
import { AulaQrCodeDto } from './dtos/aula-qrcode.dto';
import { AulaDto } from './dtos/aula.dto';

export type CurrentUser = {
  id: string;
  roles: UserRole[];
  academiaId: string;
};

type AulaRow = {
  id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  turma_id: string;
  turma_nome: string;
  turma_horario_padrao: string;
  tipo_treino: string;
  instrutor_nome: string | null;
};

type AulaQrRow = {
  id: string;
  academia_id: string;
  data_inicio: string;
  turma_nome: string;
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
          instrutor.nome_completo as instrutor_nome
        from aulas a
        join turmas t on t.id = a.turma_id
        join tipos_treino tt on tt.id = t.tipo_treino_id
        left join usuarios instrutor on instrutor.id = t.instrutor_padrao_id
        where a.academia_id = $1
          and a.data_inicio >= $2
          and a.data_inicio < $3
          and a.status <> 'CANCELADA'
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
      turmaHorarioPadrao: aula.turma_horario_padrao,
      tipoTreino: aula.tipo_treino,
      instrutorNome: aula.instrutor_nome ?? null,
    }));
  }

  async gerarQrCode(
    id: string,
    currentUser: CurrentUser,
  ): Promise<AulaQrCodeDto> {
    const aula = await this.databaseService.queryOne<AulaQrRow>(
      `
        select
          a.id,
          a.academia_id,
          a.data_inicio,
          t.nome as turma_nome
        from aulas a
        join turmas t on t.id = a.turma_id
        where a.id = $1
        limit 1;
      `,
      [id],
    );

    if (!aula) {
      throw new NotFoundException('Aula nao encontrada');
    }

    if (aula.academia_id !== currentUser.academiaId) {
      throw new ForbiddenException('Aula nao pertence a academia do usuario');
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

  private resolveQrTtlMinutes(): number {
    const raw = Number(process.env.QR_TTL_MINUTES ?? 5);
    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }
    return 5;
  }
}
