import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresencaAulaItemDto {
  @ApiProperty()
  presencaId: string;

  @ApiProperty()
  alunoId: string;

  @ApiProperty()
  alunoNome: string;

  @ApiPropertyOptional({ nullable: true })
  alunoFaixa?: string | null;

  @ApiPropertyOptional({ nullable: true })
  alunoGrau?: number | null;

  @ApiProperty({
    enum: ['PENDENTE', 'PRESENTE', 'FALTA', 'JUSTIFICADA', 'AJUSTADO'],
  })
  status: 'PENDENTE' | 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' | 'AJUSTADO';

  @ApiProperty({ enum: ['QR_CODE', 'SISTEMA', 'MANUAL'] })
  origem: 'QR_CODE' | 'SISTEMA' | 'MANUAL';

  @ApiProperty()
  criadoEm: string;

  @ApiPropertyOptional({ nullable: true })
  registradoPor?: string | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  decididoEm?: string | null;

  @ApiPropertyOptional({ nullable: true })
  decididoPor?: string | null;

  @ApiPropertyOptional({ nullable: true })
  decisaoObservacao?: string | null;
}
