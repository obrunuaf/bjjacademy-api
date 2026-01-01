import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateAcademiaDto {
  @ApiProperty({ description: 'Nome da academia' })
  @IsString()
  @MinLength(3)
  nome: string;

  @ApiPropertyOptional({ description: 'Endereço' })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class AcademiaListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  ativo: boolean;

  @ApiPropertyOptional()
  endereco?: string;

  @ApiPropertyOptional()
  telefone?: string;

  @ApiProperty()
  totalAlunos: number;

  @ApiProperty()
  criadoEm: string;
}

export class AcademiasListDto {
  @ApiProperty({ type: [AcademiaListItemDto] })
  academias: AcademiaListItemDto[];

  @ApiProperty()
  total: number;
}
