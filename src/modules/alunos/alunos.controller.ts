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
import { AlunosService } from './alunos.service';
import { AlunoDetalheDto } from './dtos/aluno-detalhe.dto';
import { AlunoDto } from './dtos/aluno.dto';
import { EvolucaoAlunoDto } from './dtos/evolucao-aluno.dto';

@ApiTags('Alunos')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alunos')
export class AlunosController {
  constructor(private readonly alunosService: AlunosService) {}

  @Get()
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista alunos' })
  @ApiOkResponse({ type: [AlunoDto] })
  async listar(): Promise<AlunoDto[]> {
    return this.alunosService.listar();
  }

  @Get(':id')
  @Roles(
    UserRole.ALUNO,
    UserRole.INSTRUTOR,
    UserRole.PROFESSOR,
    UserRole.ADMIN,
    UserRole.TI,
  )
  @ApiOperation({ summary: 'Detalhe do aluno' })
  @ApiOkResponse({ type: AlunoDetalheDto })
  async detalhar(@Param('id') id: string): Promise<AlunoDetalheDto> {
    return this.alunosService.detalhar(id);
  }

  @Get(':id/evolucao')
  @Roles(
    UserRole.ALUNO,
    UserRole.INSTRUTOR,
    UserRole.PROFESSOR,
    UserRole.ADMIN,
    UserRole.TI,
  )
  @ApiOperation({ summary: 'Evolução e histórico de graduações do aluno' })
  @ApiOkResponse({ type: EvolucaoAlunoDto })
  async evolucao(@Param('id') id: string): Promise<EvolucaoAlunoDto> {
    return this.alunosService.evolucao(id);
  }
}
