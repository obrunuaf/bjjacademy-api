import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  PreferenciaNotificacaoDto,
  UpdatePreferenciaDto,
  CreatePreferenciaDto,
  PreferenciasListDto,
} from './dtos/preferencias-notificacao.dto';
import { TipoNotificacao } from './notificacoes.service';

interface PreferenciaRow {
  id: string;
  usuario_id: string;
  academia_id: string | null;
  academia_nome: string | null;
  tipo: string;
  push_ativo: boolean;
  email_ativo: boolean;
  silenciado_ate: string | null;
}

@Injectable()
export class PreferenciasNotificacaoService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Lista de tipos disponíveis
  private readonly tiposDisponiveis = Object.values(TipoNotificacao);

  async listar(usuarioId: string): Promise<PreferenciasListDto> {
    const rows = await this.databaseService.query<PreferenciaRow>(
      `
      SELECT 
        p.id, p.usuario_id, p.academia_id, p.tipo,
        p.push_ativo, p.email_ativo, p.silenciado_ate,
        a.nome as academia_nome
      FROM preferencias_notificacao p
      LEFT JOIN academias a ON a.id = p.academia_id
      WHERE p.usuario_id = $1
      ORDER BY p.academia_id NULLS FIRST, p.tipo
      `,
      [usuarioId],
    );

    return {
      preferencias: rows.map(this.mapToDto),
      tiposDisponiveis: this.tiposDisponiveis,
    };
  }

  async listarPorAcademia(usuarioId: string, academiaId: string): Promise<PreferenciaNotificacaoDto[]> {
    const rows = await this.databaseService.query<PreferenciaRow>(
      `
      SELECT 
        p.id, p.usuario_id, p.academia_id, p.tipo,
        p.push_ativo, p.email_ativo, p.silenciado_ate,
        a.nome as academia_nome
      FROM preferencias_notificacao p
      LEFT JOIN academias a ON a.id = p.academia_id
      WHERE p.usuario_id = $1 AND (p.academia_id = $2 OR p.academia_id IS NULL)
      ORDER BY p.academia_id NULLS FIRST, p.tipo
      `,
      [usuarioId, academiaId],
    );

    return rows.map(this.mapToDto);
  }

  async criar(usuarioId: string, dto: CreatePreferenciaDto): Promise<PreferenciaNotificacaoDto> {
    const row = await this.databaseService.queryOne<PreferenciaRow>(
      `
      INSERT INTO preferencias_notificacao (id, usuario_id, academia_id, tipo, push_ativo, email_ativo)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, academia_id, tipo) 
      DO UPDATE SET push_ativo = $4, email_ativo = $5
      RETURNING id, usuario_id, academia_id, tipo, push_ativo, email_ativo, silenciado_ate
      `,
      [
        usuarioId,
        dto.academiaId || null,
        dto.tipo,
        dto.pushAtivo ?? true,
        dto.emailAtivo ?? true,
      ],
    );

    return this.mapToDto(row!);
  }

  async atualizar(
    usuarioId: string,
    academiaId: string | null,
    tipo: string,
    dto: UpdatePreferenciaDto,
  ): Promise<PreferenciaNotificacaoDto | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.pushAtivo !== undefined) {
      sets.push(`push_ativo = $${idx++}`);
      params.push(dto.pushAtivo);
    }
    if (dto.emailAtivo !== undefined) {
      sets.push(`email_ativo = $${idx++}`);
      params.push(dto.emailAtivo);
    }
    if (dto.silenciadoAte !== undefined) {
      sets.push(`silenciado_ate = $${idx++}`);
      params.push(dto.silenciadoAte);
    }

    if (sets.length === 0) return null;

    params.push(usuarioId, academiaId, tipo);

    const row = await this.databaseService.queryOne<PreferenciaRow>(
      `
      UPDATE preferencias_notificacao
      SET ${sets.join(', ')}
      WHERE usuario_id = $${idx++} 
        AND (academia_id = $${idx++} OR (academia_id IS NULL AND $${idx - 1} IS NULL))
        AND tipo = $${idx++}
      RETURNING id, usuario_id, academia_id, tipo, push_ativo, email_ativo, silenciado_ate
      `,
      params,
    );

    return row ? this.mapToDto(row) : null;
  }

  async silenciar(
    usuarioId: string,
    academiaId: string | null,
    tipo: string,
    duracao: '1h' | '8h' | '24h' | '7d' | 'sempre',
  ): Promise<PreferenciaNotificacaoDto | null> {
    let silenciadoAte: string | null = null;

    if (duracao !== 'sempre') {
      const now = new Date();
      const duracaoMap: Record<string, number> = {
        '1h': 1 * 60 * 60 * 1000,
        '8h': 8 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      now.setTime(now.getTime() + duracaoMap[duracao]);
      silenciadoAte = now.toISOString();
    }

    // Upsert
    const row = await this.databaseService.queryOne<PreferenciaRow>(
      `
      INSERT INTO preferencias_notificacao (id, usuario_id, academia_id, tipo, silenciado_ate)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      ON CONFLICT (usuario_id, academia_id, tipo) 
      DO UPDATE SET silenciado_ate = $4
      RETURNING id, usuario_id, academia_id, tipo, push_ativo, email_ativo, silenciado_ate
      `,
      [usuarioId, academiaId, tipo, silenciadoAte],
    );

    return row ? this.mapToDto(row) : null;
  }

  async deveEnviarNotificacao(
    usuarioId: string,
    academiaId: string | null,
    tipo: string,
    canal: 'push' | 'email',
  ): Promise<boolean> {
    const pref = await this.databaseService.queryOne<PreferenciaRow>(
      `
      SELECT push_ativo, email_ativo, silenciado_ate
      FROM preferencias_notificacao
      WHERE usuario_id = $1 
        AND (academia_id = $2 OR (academia_id IS NULL AND $2 IS NULL))
        AND tipo = $3
      `,
      [usuarioId, academiaId, tipo],
    );

    // Se não tem preferência configurada, assume que deve enviar
    if (!pref) return true;

    // Verifica silenciamento temporário
    if (pref.silenciado_ate) {
      const silenciadoAte = new Date(pref.silenciado_ate);
      if (silenciadoAte > new Date()) {
        return false; // Ainda está silenciado
      }
    }

    // Verifica preferência do canal
    return canal === 'push' ? pref.push_ativo : pref.email_ativo;
  }

  private mapToDto(row: PreferenciaRow): PreferenciaNotificacaoDto {
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      academiaId: row.academia_id || undefined,
      academiaNome: row.academia_nome || undefined,
      tipo: row.tipo,
      pushAtivo: row.push_ativo,
      emailAtivo: row.email_ativo,
      silenciadoAte: row.silenciado_ate || undefined,
    };
  }
}
