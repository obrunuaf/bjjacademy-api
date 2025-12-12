import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HistoricoPresencaDto } from './dtos/historico-presenca.dto';
import { PresencasService } from './presencas.service';

@ApiTags('Presencas')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alunos')
export class AlunoPresencasController {
  constructor(private readonly presencasService: PresencasService) {}

  @Get(':id/historico-presencas')
  @Roles(
    UserRole.ALUNO,
    UserRole.INSTRUTOR,
    UserRole.PROFESSOR,
    UserRole.ADMIN,
    UserRole.TI,
  )
  @ApiOperation({ summary: 'Histórico de presenças do aluno' })
  @ApiOkResponse({ type: [HistoricoPresencaDto] })
  async historico(@Param('id') id: string): Promise<HistoricoPresencaDto[]> {
    return this.presencasService.historicoDoAluno(id);
  }
}
