import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatriculaPendenteDto {
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

  @ApiProperty()
  numeroMatricula: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  dataSolicitacao: string;
}
