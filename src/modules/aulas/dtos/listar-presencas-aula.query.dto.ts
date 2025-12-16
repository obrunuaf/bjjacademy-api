import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ListarPresencasAulaQueryDto {
  @ApiPropertyOptional({
    enum: ['PENDENTE', 'PRESENTE', 'FALTA'],
    description: 'Filtra pelo status da presenca',
  })
  @IsOptional()
  @IsIn(['PENDENTE', 'PRESENTE', 'FALTA'])
  status?: 'PENDENTE' | 'PRESENTE' | 'FALTA';

  @ApiPropertyOptional({
    description: 'Busca por nome do aluno (ILIKE %q%)',
  })
  @IsOptional()
  @IsString()
  q?: string;

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
