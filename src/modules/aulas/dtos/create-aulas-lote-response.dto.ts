import { ApiProperty } from '@nestjs/swagger';

export class AulaLoteConflitoDto {
  @ApiProperty()
  dataInicio: string;

  @ApiProperty()
  motivo: string;
}

export class CreateAulasLoteResponseDto {
  @ApiProperty()
  criadas: number;

  @ApiProperty()
  ignoradas: number;

  @ApiProperty({ type: [AulaLoteConflitoDto] })
  conflitos: AulaLoteConflitoDto[];
}
