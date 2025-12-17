import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DecisaoMatriculaEnum {
  APROVAR = 'APROVAR',
  REJEITAR = 'REJEITAR',
}

export class DecisaoMatriculaDto {
  @ApiProperty({ enum: DecisaoMatriculaEnum })
  @IsEnum(DecisaoMatriculaEnum)
  decisao: DecisaoMatriculaEnum;

  @ApiPropertyOptional({ description: 'Faixa inicial ao aprovar (opcional)' })
  @IsOptional()
  @IsString()
  faixaInicialSlug?: string;

  @ApiPropertyOptional({ description: 'Motivo da rejeição (opcional)' })
  @IsOptional()
  @IsString()
  motivoRejeicao?: string;
}

export class DecisaoMatriculaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  message: string;
}
