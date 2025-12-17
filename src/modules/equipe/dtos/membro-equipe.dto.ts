import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MembroEquipeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  usuarioId: string;

  @ApiProperty()
  nomeCompleto: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  telefone: string | null;

  @ApiProperty({ description: 'Papel principal na academia' })
  papel: string;

  @ApiProperty({ description: 'Todos os papéis do usuário', type: [String] })
  papeis: string[];

  @ApiPropertyOptional()
  faixaAtual: string | null;

  @ApiPropertyOptional()
  grauAtual: number | null;

  @ApiProperty()
  criadoEm: string;
}
