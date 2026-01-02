import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RegraGraduacaoDto } from './dtos/regra-graduacao.dto';
import { TipoTreinoDto } from './dtos/tipo-treino.dto';
import { UpdateRegraGraduacaoDto } from './dtos/update-regra-graduacao.dto';
import { MotivoCancelamentoDto } from './dtos/motivo-cancelamento.dto';

export type CurrentUser = {
  id: string;
  role: string;
  roles?: string[];
  academiaId: string;
};

@Injectable()
export class ConfigService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listarTiposTreino(currentUser: CurrentUser): Promise<TipoTreinoDto[]> {
    const tipos = await this.databaseService.query<{
      id: string;
      codigo: string;
      nome: string;
      descricao: string | null;
      cor_identificacao: string | null;
    }>(
      `
        select id, lower(codigo) as codigo, nome, descricao, cor_identificacao
          from tipos_treino
         where academia_id = $1
         order by lower(codigo) asc;
      `,
      [currentUser.academiaId],
    );

    return tipos.map((tipo) => ({
      id: tipo.codigo,
      uuid: tipo.id,
      nome: tipo.nome,
      descricao: tipo.descricao ?? undefined,
      corIdentificacao: tipo.cor_identificacao ?? null,
    }));
  }

  async listarRegrasGraduacao(): Promise<RegraGraduacaoDto[]> {
    return [
      {
        faixaSlug: 'azul',
        aulasMinimas: 50,
        tempoMinimoMeses: 12,
        observacoes: 'Mock rule',
      },
    ];
    // TODO: puxar regras reais por academia (spec 3.5.5)
  }

  async atualizarRegra(
    faixaSlug: string,
    dto: UpdateRegraGraduacaoDto,
  ): Promise<RegraGraduacaoDto> {
    return {
      faixaSlug,
      aulasMinimas: dto.aulasMinimas,
      tempoMinimoMeses: dto.tempoMinimoMeses,
      observacoes: dto.observacoes,
    };
    // TODO: persistir atualização de regras (spec 3.5.6)
  }

  /**
   * Lista motivos de cancelamento.
   * Busca da tabela `motivos_cancelamento` ou usa fallback hardcoded.
   * @param academiaId ID da academia
   * @param tipo 'PRESENCA' ou 'AULA'
   */
  async listarMotivosCancelamento(
    academiaId: string | null,
    tipo: 'PRESENCA' | 'AULA' = 'PRESENCA',
  ): Promise<MotivoCancelamentoDto[]> {
    try {
      // Busca motivos globais (academia_id IS NULL) ou específicos da academia, filtrando por tipo
      const rows = await this.databaseService.query<{
        id: string;
        label: string;
        icon: string;
      }>(
        `
        SELECT slug as id, label, icon
        FROM motivos_cancelamento
        WHERE ativo = true
          AND tipo = $1
          AND (academia_id IS NULL OR academia_id = $2)
        ORDER BY ordem ASC, label ASC
        `,
        [tipo, academiaId || null],
      );

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      // Table doesn't exist or column 'tipo' doesn't exist yet, use fallback
      console.log(`Tabela motivos_cancelamento (tipo=${tipo}) erro ou vazia, usando fallback`);
    }

    // Fallback: motivos padrão hardcoded
    if (tipo === 'AULA') {
      return [
        { id: 'instrutor_indisponivel', label: 'Instrutor indisponível', icon: 'person-remove-outline' },
        { id: 'feriado', label: 'Feriado / Recesso', icon: 'calendar-outline' },
        { id: 'manutencao', label: 'Manutenção do espaço', icon: 'construct-outline' },
        { id: 'baixa_demanda', label: 'Baixa demanda', icon: 'people-outline' },
        { id: 'evento_especial', label: 'Evento especial', icon: 'star-outline' },
        { id: 'emergencia', label: 'Emergência', icon: 'warning-outline' },
        { id: 'outro', label: 'Outro motivo', icon: 'ellipsis-horizontal' },
      ];
    }

    return [
      { id: 'erro_registro', label: 'Erro no registro', icon: 'bug-outline' },
      { id: 'saiu_cedo', label: 'Aluno saiu mais cedo', icon: 'exit-outline' },
      { id: 'nao_compareceu', label: 'Não compareceu de fato', icon: 'close-circle-outline' },
      { id: 'duplicado', label: 'Check-in duplicated', icon: 'copy-outline' },
      { id: 'outro', label: 'Outro motivo', icon: 'ellipsis-horizontal' },
    ];
  }
}
