import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AulasService,
  CurrentUser as CurrentUserPayload,
} from './aulas.service';
import { AulaQrCodeDto } from './dtos/aula-qrcode.dto';
import { AulaDto } from './dtos/aula.dto';

@ApiTags('Aulas')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aulas')
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Get('hoje')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista aulas do dia' })
  @ApiOkResponse({ type: [AulaDto] })
  async listarHoje(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AulaDto[]> {
    return this.aulasService.listarHoje(user);
  }

  @Get(':id/qrcode')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Obtem token de QR Code da aula' })
  @ApiOkResponse({ type: AulaQrCodeDto })
  async obterQrCode(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AulaQrCodeDto> {
    return this.aulasService.gerarQrCode(id, user);
  }
}
