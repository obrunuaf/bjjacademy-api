import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { NotificacoesService } from './notificacoes.service';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';
import { CreatePreferenciaDto, UpdatePreferenciaDto } from './dtos/preferencias-notificacao.dto';

interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  roles: string[];
  academiaId: string;
}

@ApiTags('Notificações')
@Controller('notificacoes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificacoesController {
  constructor(
    private readonly notificacoesService: NotificacoesService,
    private readonly preferenciasService: PreferenciasNotificacaoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações do usuário (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listar(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificacoesService.listar(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('recentes')
  @ApiOperation({ summary: 'Lista últimas 5 notificações (para dropdown)' })
  async listarRecentes(@CurrentUser() user: CurrentUserPayload) {
    const notificacoes = await this.notificacoesService.listarRecentes(user.id);
    const naoLidas = await this.notificacoesService.contarNaoLidas(user.id);
    return { notificacoes, naoLidas };
  }

  @Get('count')
  @ApiOperation({ summary: 'Conta notificações não lidas' })
  async contarNaoLidas(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificacoesService.contarNaoLidas(user.id);
    return { count };
  }

  @Patch(':id/lida')
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  async marcarComoLida(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificacoesService.marcarComoLida(id, user.id);
  }

  @Patch('todas/lidas')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  async marcarTodasComoLidas(@CurrentUser() user: CurrentUserPayload) {
    return this.notificacoesService.marcarTodasComoLidas(user.id);
  }

  // ========== PREFERÊNCIAS ==========

  @Get('preferencias')
  @ApiOperation({ summary: 'Lista preferências de notificação do usuário' })
  async listarPreferencias(@CurrentUser() user: CurrentUserPayload) {
    return this.preferenciasService.listar(user.id);
  }

  @Post('preferencias')
  @ApiOperation({ summary: 'Cria/atualiza preferência de notificação' })
  async criarPreferencia(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePreferenciaDto,
  ) {
    return this.preferenciasService.criar(user.id, dto);
  }

  @Patch('preferencias/:tipo')
  @ApiOperation({ summary: 'Atualiza preferência de notificação por tipo' })
  @ApiQuery({ name: 'academiaId', required: false, type: String })
  async atualizarPreferencia(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tipo') tipo: string,
    @Query('academiaId') academiaId?: string,
    @Body() dto?: UpdatePreferenciaDto,
  ) {
    return this.preferenciasService.atualizar(
      user.id,
      academiaId || null,
      tipo,
      dto || {},
    );
  }

  @Post('preferencias/:tipo/silenciar')
  @ApiOperation({ summary: 'Silencia notificações por período: 1h, 8h, 24h, 7d, sempre' })
  @ApiQuery({ name: 'academiaId', required: false, type: String })
  @ApiQuery({ name: 'duracao', required: true, enum: ['1h', '8h', '24h', '7d', 'sempre'] })
  async silenciar(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tipo') tipo: string,
    @Query('academiaId') academiaId?: string,
    @Query('duracao') duracao: '1h' | '8h' | '24h' | '7d' | 'sempre' = '8h',
  ) {
    return this.preferenciasService.silenciar(
      user.id,
      academiaId || null,
      tipo,
      duracao,
    );
  }
}
