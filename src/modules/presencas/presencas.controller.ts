import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser as CurrentUserDecorator } from '../../common/decorators/user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckinResponseDto } from '../checkin/dtos/checkin-response.dto';
import { CurrentUser, PresencasService } from './presencas.service';
import { PresencaPendenteDto } from './dtos/presenca-pendente.dto';
import { UpdatePresencaStatusDto } from './dtos/update-presenca-status.dto';

@ApiTags('Presencas')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presencas')
export class PresencasController {
  constructor(private readonly presencasService: PresencasService) {}

  @Get('pendencias')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista presenças pendentes' })
  @ApiOkResponse({ type: [PresencaPendenteDto] })
  async listarPendencias(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<PresencaPendenteDto[]> {
    return this.presencasService.listarPendencias(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Atualiza status de presença' })
  @ApiOkResponse({ type: CheckinResponseDto })
  async atualizarStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePresencaStatusDto,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CheckinResponseDto> {
    return this.presencasService.atualizarStatus(id, dto, user);
  }
}
