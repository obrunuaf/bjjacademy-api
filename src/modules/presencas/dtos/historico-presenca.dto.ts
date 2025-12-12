import { ApiProperty } from '@nestjs/swagger';

export class HistoricoPresencaDto {
  @ApiProperty()
  presencaId: string;

  @ApiProperty()
  aulaId: string;

  @ApiProperty()
  dataInicio: string;

  @ApiProperty()
  turmaNome: string;

  @ApiProperty({ required: false, nullable: true })
  tipoTreino?: string | null;

  @ApiProperty({ enum: ['PRESENTE', 'FALTA', 'PENDENTE', 'JUSTIFICADA', 'AJUSTADO'] })
  status: 'PRESENTE' | 'FALTA' | 'PENDENTE' | 'JUSTIFICADA' | 'AJUSTADO';

  @ApiProperty({ enum: ['MANUAL', 'QR_CODE', 'SISTEMA'] })
  origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';
}
