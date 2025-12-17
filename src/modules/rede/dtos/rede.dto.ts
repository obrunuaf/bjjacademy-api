import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  ativo: boolean;

  @ApiProperty()
  totalAcademias: number;

  @ApiProperty()
  criadoEm: string;
}

export class AcademiaRedeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiPropertyOptional()
  codigo: string | null;

  @ApiProperty()
  ativo: boolean;

  @ApiPropertyOptional()
  endereco: string | null;

  @ApiPropertyOptional()
  telefone: string | null;

  @ApiProperty()
  totalAlunos: number;

  @ApiProperty()
  criadoEm: string;
}

export class VincularAcademiaDto {
  @ApiProperty({ description: 'Código de signup da academia a vincular' })
  @IsString()
  @IsNotEmpty()
  codigoAcademia: string;
}

export class VincularAcademiaResponseDto {
  @ApiProperty()
  academiaId: string;

  @ApiProperty()
  academiaName: string;

  @ApiProperty()
  message: string;
}
