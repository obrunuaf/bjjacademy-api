import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  RedeResponseDto,
  AcademiaRedeDto,
  VincularAcademiaResponseDto,
} from './dtos/rede.dto';

type CurrentUser = {
  id: string;
  academiaId: string;
};

@Injectable()
export class RedeService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get user's network (if they are a network admin)
   */
  async getRede(user: CurrentUser): Promise<RedeResponseDto> {
    // Check if user is a network admin
    const redeAdmin = await this.databaseService.queryOne<{
      rede_id: string;
    }>(
      `SELECT rede_id FROM redes_admins WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    if (!redeAdmin) {
      throw new ForbiddenException('Você não é administrador de nenhuma rede');
    }

    const rede = await this.databaseService.queryOne<{
      id: string;
      nome: string;
      ativo: boolean;
      criado_em: string;
      total_academias: string;
    }>(
      `
        SELECT 
          r.id, r.nome, r.ativo, r.criado_em,
          (SELECT COUNT(*) FROM academias WHERE rede_id = r.id) as total_academias
        FROM redes r
        WHERE r.id = $1
      `,
      [redeAdmin.rede_id],
    );

    if (!rede) {
      throw new NotFoundException('Rede não encontrada');
    }

    return {
      id: rede.id,
      nome: rede.nome,
      ativo: rede.ativo,
      totalAcademias: parseInt(rede.total_academias, 10),
      criadoEm: rede.criado_em,
    };
  }

  /**
   * List all academies in the network
   */
  async listarAcademias(user: CurrentUser): Promise<AcademiaRedeDto[]> {
    // Get user's network
    const redeAdmin = await this.databaseService.queryOne<{ rede_id: string }>(
      `SELECT rede_id FROM redes_admins WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    if (!redeAdmin) {
      throw new ForbiddenException('Você não é administrador de nenhuma rede');
    }

    const academias = await this.databaseService.query<{
      id: string;
      nome: string;
      codigo: string | null;
      ativo: boolean;
      endereco: string | null;
      telefone: string | null;
      criado_em: string;
      total_alunos: string;
    }>(
      `
        SELECT 
          a.id, a.nome, a.codigo, a.ativo, a.endereco, a.telefone, a.criado_em,
          (SELECT COUNT(*) FROM matriculas m WHERE m.academia_id = a.id AND m.status = 'ATIVA') as total_alunos
        FROM academias a
        WHERE a.rede_id = $1
        ORDER BY a.nome
      `,
      [redeAdmin.rede_id],
    );

    return academias.map((a) => ({
      id: a.id,
      nome: a.nome,
      codigo: a.codigo,
      ativo: a.ativo,
      endereco: a.endereco,
      telefone: a.telefone,
      totalAlunos: parseInt(a.total_alunos, 10),
      criadoEm: a.criado_em,
    }));
  }

  /**
   * Toggle academy active status
   */
  async toggleAcademiaAtivo(
    academiaId: string,
    ativo: boolean,
    user: CurrentUser,
  ): Promise<{ id: string; ativo: boolean; message: string }> {
    // Check user is network admin
    const redeAdmin = await this.databaseService.queryOne<{ rede_id: string }>(
      `SELECT rede_id FROM redes_admins WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    if (!redeAdmin) {
      throw new ForbiddenException('Você não é administrador de nenhuma rede');
    }

    // Check academy belongs to this network
    const academia = await this.databaseService.queryOne<{ id: string; rede_id: string | null }>(
      `SELECT id, rede_id FROM academias WHERE id = $1`,
      [academiaId],
    );

    if (!academia) {
      throw new NotFoundException('Academia não encontrada');
    }

    if (academia.rede_id !== redeAdmin.rede_id) {
      throw new ForbiddenException('Esta academia não pertence à sua rede');
    }

    // Update
    await this.databaseService.query(
      `UPDATE academias SET ativo = $1 WHERE id = $2`,
      [ativo, academiaId],
    );

    return {
      id: academiaId,
      ativo,
      message: ativo ? 'Academia ativada' : 'Academia desativada',
    };
  }

  /**
   * Link an existing academy to the network by its signup code
   */
  async vincularAcademia(
    codigoAcademia: string,
    user: CurrentUser,
  ): Promise<VincularAcademiaResponseDto> {
    // Check user is network admin
    const redeAdmin = await this.databaseService.queryOne<{ rede_id: string }>(
      `SELECT rede_id FROM redes_admins WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    if (!redeAdmin) {
      throw new ForbiddenException('Você não é administrador de nenhuma rede');
    }

    // Find academy by code
    const academia = await this.databaseService.queryOne<{
      id: string;
      nome: string;
      rede_id: string | null;
    }>(
      `SELECT id, nome, rede_id FROM academias WHERE UPPER(codigo) = UPPER($1)`,
      [codigoAcademia],
    );

    if (!academia) {
      throw new NotFoundException('Academia não encontrada com este código');
    }

    if (academia.rede_id) {
      throw new BadRequestException('Esta academia já pertence a uma rede');
    }

    // Link
    await this.databaseService.query(
      `UPDATE academias SET rede_id = $1 WHERE id = $2`,
      [redeAdmin.rede_id, academia.id],
    );

    return {
      academiaId: academia.id,
      academiaName: academia.nome,
      message: `Academia "${academia.nome}" vinculada à rede com sucesso`,
    };
  }
}
