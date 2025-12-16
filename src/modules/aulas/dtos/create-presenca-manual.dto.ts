import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePresencaManualDto {
  @ApiProperty({ description: 'ID do aluno' })
  @IsUUID()
  alunoId: string;

  @ApiPropertyOptional({
    enum: ['PRESENTE', 'FALTA'],
    default: 'PRESENTE',
    description: 'Status da presença (default: PRESENTE)',
  })
  @IsOptional()
  @IsIn(['PRESENTE', 'FALTA'])
  status?: 'PRESENTE' | 'FALTA';

  @ApiPropertyOptional({ description: 'Observação opcional' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({
    description: 'Inclui aulas/turmas soft-deletadas (somente staff)',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  includeDeleted?: boolean;
}
