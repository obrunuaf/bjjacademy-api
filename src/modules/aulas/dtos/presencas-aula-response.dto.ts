import { ApiProperty } from '@nestjs/swagger';
import { PresencaAulaItemDto } from './presenca-aula-item.dto';

export class PresencasAulaResumoDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pendentes: number;

  @ApiProperty()
  presentes: number;

  @ApiProperty()
  faltas: number;
}

export class PresencasAulaResponseDto {
  @ApiProperty()
  aulaId: string;

  @ApiProperty({ type: PresencasAulaResumoDto })
  resumo: PresencasAulaResumoDto;

  @ApiProperty({ type: [PresencaAulaItemDto] })
  itens: PresencaAulaItemDto[];
}
