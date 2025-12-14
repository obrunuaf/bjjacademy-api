import { ApiProperty } from '@nestjs/swagger';

export class TurmaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  tipoTreino: string;

  @ApiProperty({ nullable: true, description: 'Cor do tipo de treino (#RRGGBB)' })
  tipoTreinoCor: string | null;

  @ApiProperty({
    type: [Number],
    description: 'Dias da semana (0=Domingo ... 6=Sabado)',
  })
  diasSemana: number[];

  @ApiProperty({ description: 'Horario padrao no formato HH:MM (hora local)' })
  horarioPadrao: string;

  @ApiProperty({ nullable: true })
  instrutorPadraoId: string | null;

  @ApiProperty({ nullable: true })
  instrutorPadraoNome: string | null;

  @ApiProperty({ nullable: true, description: 'Data de delecao (soft-delete)' })
  deletedAt: string | null;
}
