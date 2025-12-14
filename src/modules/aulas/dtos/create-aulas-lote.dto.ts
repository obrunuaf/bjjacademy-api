import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateAulasLoteDto {
  @ApiProperty({ description: 'UUID da turma' })
  @IsUUID()
  turmaId: string;

  @ApiProperty({ description: 'Data inicial no formato YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fromDate deve estar no formato YYYY-MM-DD',
  })
  fromDate: string;

  @ApiProperty({ description: 'Data final no formato YYYY-MM-DD (inclusiva)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'toDate deve estar no formato YYYY-MM-DD',
  })
  toDate: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Dias da semana (0=Domingo ... 6=Sabado). Se vazio, usa dias da turma',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];

  @ApiPropertyOptional({
    description: 'Horario de inicio HH:MM (se vazio, usa horario_padrao da turma)',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'horaInicio deve estar no formato HH:MM',
  })
  horaInicio?: string;

  @ApiPropertyOptional({
    description: 'Duracao em minutos (default 90)',
    default: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracaoMinutos?: number;
}
