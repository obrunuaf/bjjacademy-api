import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AcademiaStatusGuard } from '../../common/guards/academia-status.guard';
import { EquipeService } from './equipe.service';
import { MembroEquipeDto } from './dtos/membro-equipe.dto';
import { UpdateRoleDto, UpdateRoleResponseDto } from './dtos/update-role.dto';

@ApiTags('Equipe')
@ApiAuth()
@UseGuards(JwtAuthGuard, AcademiaStatusGuard, RolesGuard)
@Controller('staff/equipe')
export class EquipeController {
  constructor(private readonly equipeService: EquipeService) {}

  @Get()
  @Roles(UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Lista membros da equipe da academia' })
  @ApiOkResponse({ type: [MembroEquipeDto] })
  async listarEquipe(
    @CurrentUser() user: { id: string; academiaId: string; role: UserRole },
  ): Promise<MembroEquipeDto[]> {
    return this.equipeService.listarEquipe(user);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Atualiza papéis de um membro da equipe' })
  @ApiOkResponse({ type: UpdateRoleResponseDto })
  async atualizarPapeis(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: { id: string; academiaId: string; role: UserRole },
  ): Promise<UpdateRoleResponseDto> {
    return this.equipeService.atualizarPapeis(id, dto, user);
  }
}
