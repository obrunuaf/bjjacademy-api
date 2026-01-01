import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export enum TipoNotificacao {
  MATRICULA_APROVADA = 'MATRICULA_APROVADA',
  MATRICULA_PENDENTE = 'MATRICULA_PENDENTE',
  MATRICULA_REJEITADA = 'MATRICULA_REJEITADA',
  AULA_PROXIMA = 'AULA_PROXIMA',
  CHECKIN_SUCESSO = 'CHECKIN_SUCESSO',
  GRADUACAO_PENDENTE = 'GRADUACAO_PENDENTE',
  GRADUACAO_APROVADA = 'GRADUACAO_APROVADA',
  STREAK_ALCANCADO = 'STREAK_ALCANCADO',
  META_ALCANCADA = 'META_ALCANCADA',
  SISTEMA = 'SISTEMA',
}

interface NotificacaoRow {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string | null;
  dados_json: Record<string, any> | null;
  lida: boolean;
  lida_em: string | null;
  criado_em: string;
}

export interface NotificacaoDto {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string | null;
  dadosJson: Record<string, any> | null;
  lida: boolean;
  lidaEm: string | null;
  criadoEm: string;
}

@Injectable()
export class NotificacoesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listar(usuarioId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      this.databaseService.query<NotificacaoRow>(
        `
        SELECT id, usuario_id, tipo, titulo, mensagem, dados_json, lida, lida_em, criado_em
        FROM notificacoes
        WHERE usuario_id = $1
        ORDER BY criado_em DESC
        LIMIT $2 OFFSET $3
        `,
        [usuarioId, limit, offset],
      ),
      this.databaseService.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM notificacoes WHERE usuario_id = $1`,
        [usuarioId],
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      items: items.map(this.mapToDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listarRecentes(usuarioId: string, limit = 5): Promise<NotificacaoDto[]> {
    const rows = await this.databaseService.query<NotificacaoRow>(
      `
      SELECT id, usuario_id, tipo, titulo, mensagem, dados_json, lida, lida_em, criado_em
      FROM notificacoes
      WHERE usuario_id = $1
      ORDER BY criado_em DESC
      LIMIT $2
      `,
      [usuarioId, limit],
    );

    return rows.map(this.mapToDto);
  }

  async contarNaoLidas(usuarioId: string): Promise<number> {
    const result = await this.databaseService.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notificacoes WHERE usuario_id = $1 AND lida = false`,
      [usuarioId],
    );
    return parseInt(result?.count || '0', 10);
  }

  async marcarComoLida(id: string, usuarioId: string): Promise<NotificacaoDto | null> {
    const row = await this.databaseService.queryOne<NotificacaoRow>(
      `
      UPDATE notificacoes
      SET lida = true, lida_em = NOW()
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, usuario_id, tipo, titulo, mensagem, dados_json, lida, lida_em, criado_em
      `,
      [id, usuarioId],
    );

    return row ? this.mapToDto(row) : null;
  }

  async marcarTodasComoLidas(usuarioId: string): Promise<{ success: boolean }> {
    await this.databaseService.query(
      `UPDATE notificacoes SET lida = true, lida_em = NOW() WHERE usuario_id = $1 AND lida = false`,
      [usuarioId],
    );
    return { success: true };
  }

  async criar(
    usuarioId: string,
    tipo: TipoNotificacao,
    titulo: string,
    mensagem?: string,
    dadosJson?: Record<string, any>,
    academiaId?: string,
  ): Promise<NotificacaoDto> {
    const row = await this.databaseService.queryOne<NotificacaoRow>(
      `
      INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, dados_json, academia_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, usuario_id, tipo, titulo, mensagem, dados_json, lida, lida_em, criado_em
      `,
      [usuarioId, tipo, titulo, mensagem || null, dadosJson ? JSON.stringify(dadosJson) : null, academiaId || null],
    );

    return this.mapToDto(row!);
  }

  // Helper para criar notificação de matrícula aprovada
  async notificarMatriculaAprovada(usuarioId: string, academiaNome: string, academiaId?: string) {
    return this.criar(
      usuarioId,
      TipoNotificacao.MATRICULA_APROVADA,
      'Matrícula aprovada!',
      `Sua matrícula na ${academiaNome} foi aprovada. Você já pode fazer check-in nas aulas.`,
      undefined,
      academiaId,
    );
  }

  // Helper para notificar próxima aula
  async notificarProximaAula(usuarioId: string, turmaNome: string, horario: string, academiaId?: string) {
    return this.criar(
      usuarioId,
      TipoNotificacao.AULA_PROXIMA,
      `Aula em breve: ${turmaNome}`,
      `Sua aula começa às ${horario}. Não se atrase!`,
      undefined,
      academiaId,
    );
  }

  // Helper para streak alcançado
  async notificarStreak(usuarioId: string, semanas: number, academiaId?: string) {
    return this.criar(
      usuarioId,
      TipoNotificacao.STREAK_ALCANCADO,
      `🔥 ${semanas} semanas consecutivas!`,
      `Parabéns! Você está treinando há ${semanas} semanas sem faltar. Continue assim!`,
      undefined,
      academiaId,
    );
  }

  private mapToDto(row: NotificacaoRow): NotificacaoDto {
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      tipo: row.tipo,
      titulo: row.titulo,
      mensagem: row.mensagem,
      dadosJson: row.dados_json,
      lida: row.lida,
      lidaEm: row.lida_em,
      criadoEm: row.criado_em,
    };
  }
}
