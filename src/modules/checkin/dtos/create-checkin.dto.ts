import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateCheckinDto {
  @ApiProperty()
  @IsUUID()
  aulaId: string;

  @ApiProperty({ enum: ['MANUAL', 'QR'] })
  @IsIn(['MANUAL', 'QR'])
  tipo: 'MANUAL' | 'QR';

  @ApiProperty({ required: false })
  @ValidateIf((dto) => dto.tipo === 'QR')
  @IsString()
  @IsNotEmpty()
  qrToken?: string;
}
