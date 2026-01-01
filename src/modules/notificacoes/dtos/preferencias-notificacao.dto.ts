import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class PreferenciaNotificacaoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  usuarioId: string;

  @ApiPropertyOptional()
  academiaId?: string;

  @ApiPropertyOptional()
  academiaNome?: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  pushAtivo: boolean;

  @ApiProperty()
  emailAtivo: boolean;

  @ApiPropertyOptional()
  silenciadoAte?: string;
}

export class UpdatePreferenciaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushAtivo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailAtivo?: boolean;

  @ApiPropertyOptional({ description: 'Data até quando silenciar (ISO string), ou null para dessilenciar' })
  @IsOptional()
  @IsDateString()
  silenciadoAte?: string | null;
}

export class CreatePreferenciaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academiaId?: string;

  @ApiProperty({ description: 'Tipo de notificação: AULA_PROXIMA, CHECKIN_SUCESSO, MATRICULA_APROVADA, etc.' })
  @IsString()
  tipo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushAtivo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailAtivo?: boolean;
}

export class PreferenciasListDto {
  @ApiProperty({ type: [PreferenciaNotificacaoDto] })
  preferencias: PreferenciaNotificacaoDto[];

  @ApiProperty({ description: 'Tipos de notificação disponíveis' })
  tiposDisponiveis: string[];
}
