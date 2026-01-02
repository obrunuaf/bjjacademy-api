import { ApiProperty } from '@nestjs/swagger';

export class MotivoCancelamentoDto {
  @ApiProperty({ example: 'erro_registro' })
  id: string;

  @ApiProperty({ example: 'Erro no registro' })
  label: string;

  @ApiProperty({ example: 'bug-outline' })
  icon: string;
}
