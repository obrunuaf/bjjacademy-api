import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MembroEquipeDto } from './dtos/membro-equipe.dto';
import { UpdateRoleDto, UpdateRoleResponseDto } from './dtos/update-role.dto';
import { UserRole } from '../../common/enums/user-role.enum';

type CurrentUser = {
  id: string;
  academiaId: string;
  role: UserRole;
};

// Role priority for determining main role
const ROLE_PRIORITY: Record<string, number> = {
  TI: 5,
  ADMIN: 4,
  PROFESSOR: 3,
  INSTRUTOR: 2,
  ALUNO: 1,
};

@Injectable()
export class EquipeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listarEquipe(user: CurrentUser): Promise<MembroEquipeDto[]> {
    const rows = await this.databaseService.query<{
      usuario_id: string;
      nome_completo: string;
      email: string;
      telefone: string | null;
      faixa_atual_slug: string | null;
      grau_atual: number | null;
      criado_em: string;
      papeis: string[];
    }>(
      `
        SELECT 
          u.id as usuario_id,
          u.nome_completo,
          u.email,
          u.telefone,
          u.faixa_atual_slug,
          u.grau_atual,
          u.criado_em,
          array_agg(up.papel ORDER BY up.papel) as papeis
        FROM usuarios u
        JOIN usuarios_papeis up ON u.id = up.usuario_id
        WHERE up.academia_id = $1
        GROUP BY u.id, u.nome_completo, u.email, u.telefone, u.faixa_atual_slug, u.grau_atual, u.criado_em
        ORDER BY u.nome_completo
      `,
      [user.academiaId],
    );

    return rows.map((row) => {
      // Calculate main role based on priority
      const mainRole = row.papeis.reduce((acc, papel) => {
        return (ROLE_PRIORITY[papel] || 0) > (ROLE_PRIORITY[acc] || 0) ? papel : acc;
      }, row.papeis[0]);

      return {
        id: row.usuario_id,
        usuarioId: row.usuario_id,
        nomeCompleto: row.nome_completo,
        email: row.email,
        telefone: row.telefone,
        papel: mainRole,
        papeis: row.papeis,
        faixaAtual: row.faixa_atual_slug,
        grauAtual: row.grau_atual,
        criadoEm: row.criado_em,
      };
    });
  }

  async atualizarPapeis(
    usuarioId: string,
    dto: UpdateRoleDto,
    user: CurrentUser,
  ): Promise<UpdateRoleResponseDto> {
    // Verify user belongs to same academia
    const membro = await this.databaseService.queryOne<{ id: string }>(
      `SELECT u.id FROM usuarios u
       JOIN usuarios_papeis up ON u.id = up.usuario_id
       WHERE u.id = $1 AND up.academia_id = $2
       LIMIT 1`,
      [usuarioId, user.academiaId],
    );

    if (!membro) {
      throw new NotFoundException('Membro não encontrado na sua academia');
    }

    // Prevent self-demotion for TI/ADMIN
    if (usuarioId === user.id) {
      const hasAdminRole = dto.papeis.some(p => ['TI', 'ADMIN'].includes(p));
      if (!hasAdminRole && ['TI', 'ADMIN'].includes(user.role)) {
        throw new BadRequestException('Você não pode remover seu próprio papel administrativo');
      }
    }

    // Delete existing roles for this academia
    await this.databaseService.query(
      `DELETE FROM usuarios_papeis WHERE usuario_id = $1 AND academia_id = $2`,
      [usuarioId, user.academiaId],
    );

    // Insert new roles
    for (const papel of dto.papeis) {
      await this.databaseService.query(
        `INSERT INTO usuarios_papeis (usuario_id, academia_id, papel) VALUES ($1, $2, $3)`,
        [usuarioId, user.academiaId, papel],
      );
    }

    return {
      usuarioId,
      papeis: dto.papeis,
      message: 'Papéis atualizados com sucesso',
    };
  }
}
