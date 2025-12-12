import { ApiProperty } from '@nestjs/swagger';

export class CheckinResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  aulaId: string;

  @ApiProperty()
  alunoId: string;

  @ApiProperty({ enum: ['PENDENTE', 'PRESENTE', 'FALTA', 'JUSTIFICADA', 'AJUSTADO'] })
  status: 'PENDENTE' | 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' | 'AJUSTADO';

  @ApiProperty({ enum: ['MANUAL', 'QR_CODE', 'SISTEMA'] })
  origem: 'MANUAL' | 'QR_CODE' | 'SISTEMA';

  @ApiProperty()
  criadoEm: string;

  @ApiProperty({ required: false })
  registradoPor?: string;
}
