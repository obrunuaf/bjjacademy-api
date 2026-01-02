import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelAulaDto {
  @ApiProperty({ example: 'Instrutor indisponível', description: 'Motivo do cancelamento' })
  @IsString()
  motivo: string;

  @ApiProperty({ example: 'Imprevisto de última hora', description: 'Observação adicional', required: false })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiProperty({ example: true, description: 'Se deve notificar os alunos', required: false })
  @IsOptional()
  @IsBoolean()
  notificarAlunos?: boolean;
}
