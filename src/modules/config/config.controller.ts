import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AcademiaStatusGuard } from '../../common/guards/academia-status.guard';
import { ConfigService, CurrentUser as CurrentUserPayload } from './config.service';
import { RegraGraduacaoDto } from './dtos/regra-graduacao.dto';
import { TipoTreinoDto } from './dtos/tipo-treino.dto';
import { UpdateRegraGraduacaoDto } from './dtos/update-regra-graduacao.dto';
import { MotivoCancelamentoDto } from './dtos/motivo-cancelamento.dto';

@ApiTags('Config')
@ApiAuth()
@UseGuards(JwtAuthGuard, AcademiaStatusGuard, RolesGuard)
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('tipos-treino')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista tipos/modalidades de treino' })
  @ApiOkResponse({ type: [TipoTreinoDto] })
  async listarTipos(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TipoTreinoDto[]> {
    return this.configService.listarTiposTreino(user);
  }

  @Get('regras-graduacao')
  @Roles(UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista regras de graduação' })
  @ApiOkResponse({ type: [RegraGraduacaoDto] })
  async listarRegras(): Promise<RegraGraduacaoDto[]> {
    return this.configService.listarRegrasGraduacao();
  }

  @Put('regras-graduacao/:faixaSlug')
  @Roles(UserRole.ADMIN, UserRole.TI, UserRole.PROFESSOR)
  @ApiOperation({ summary: 'Atualiza regras de graduação para faixa' })
  @ApiOkResponse({ type: RegraGraduacaoDto })
  async atualizarRegra(
    @Param('faixaSlug') faixaSlug: string,
    @Body() dto: UpdateRegraGraduacaoDto,
  ): Promise<RegraGraduacaoDto> {
    return this.configService.atualizarRegra(faixaSlug, dto);
  }

  @Get('motivos-cancelamento')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista motivos de cancelamento de presença' })
  @ApiOkResponse({ type: [MotivoCancelamentoDto] })
  async listarMotivosCancelamento(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MotivoCancelamentoDto[]> {
    return this.configService.listarMotivosCancelamento(user.academiaId, 'PRESENCA');
  }

  @Get('motivos-cancelamento-aula')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista motivos de cancelamento de aula' })
  @ApiOkResponse({ type: [MotivoCancelamentoDto] })
  async listarMotivosCancelamentoAula(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MotivoCancelamentoDto[]> {
    return this.configService.listarMotivosCancelamento(user.academiaId, 'AULA');
  }
}
