import { ApiProperty } from '@nestjs/swagger';

export class EncerrarAulaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['ENCERRADA'] })
  status: 'ENCERRADA';

  @ApiProperty()
  dataFim: string;

  @ApiProperty({ nullable: true })
  qrToken: string | null;

  @ApiProperty({ nullable: true })
  qrExpiresAt: string | null;
}
