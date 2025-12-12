import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdatePresencaStatusDto {
  @ApiProperty({ enum: ['PRESENTE', 'FALTA', 'JUSTIFICADA'] })
  @IsIn(['PRESENTE', 'FALTA', 'JUSTIFICADA'])
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
}
