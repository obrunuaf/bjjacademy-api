import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RedeService } from './rede.service';
import {
  RedeResponseDto,
  AcademiaRedeDto,
  VincularAcademiaDto,
  VincularAcademiaResponseDto,
} from './dtos/rede.dto';

@ApiTags('Rede')
@ApiAuth()
@UseGuards(JwtAuthGuard)
@Controller('rede')
export class RedeController {
  constructor(private readonly redeService: RedeService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retorna dados da rede do admin autenticado' })
  @ApiOkResponse({ type: RedeResponseDto })
  async getRede(
    @CurrentUser() user: { id: string; academiaId: string },
  ): Promise<RedeResponseDto> {
    return this.redeService.getRede(user);
  }

  @Get('academias')
  @ApiOperation({ summary: 'Lista todas as academias da rede' })
  @ApiOkResponse({ type: [AcademiaRedeDto] })
  async listarAcademias(
    @CurrentUser() user: { id: string; academiaId: string },
  ): Promise<AcademiaRedeDto[]> {
    return this.redeService.listarAcademias(user);
  }

  @Patch('academias/:id/ativar')
  @ApiOperation({ summary: 'Ativa uma academia da rede' })
  async ativarAcademia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: { id: string; academiaId: string },
  ) {
    return this.redeService.toggleAcademiaAtivo(id, true, user);
  }

  @Patch('academias/:id/desativar')
  @ApiOperation({ summary: 'Desativa uma academia da rede' })
  async desativarAcademia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: { id: string; academiaId: string },
  ) {
    return this.redeService.toggleAcademiaAtivo(id, false, user);
  }

  @Post('academias/vincular')
  @ApiOperation({ summary: 'Vincula uma academia existente à rede pelo código' })
  @ApiOkResponse({ type: VincularAcademiaResponseDto })
  async vincularAcademia(
    @Body() dto: VincularAcademiaDto,
    @CurrentUser() user: { id: string; academiaId: string },
  ): Promise<VincularAcademiaResponseDto> {
    return this.redeService.vincularAcademia(dto.codigoAcademia, user);
  }
}
