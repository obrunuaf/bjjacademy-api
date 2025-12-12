import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckinService } from './checkin.service';
import { CheckinDisponivelDto } from './dtos/checkin-disponivel.dto';
import { CheckinResponseDto } from './dtos/checkin-response.dto';
import { CreateCheckinDto } from './dtos/create-checkin.dto';

@ApiTags('Checkin')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('disponiveis')
  @Roles(UserRole.ALUNO)
  @ApiOperation({ summary: 'Lista aulas do dia para check-in' })
  @ApiOkResponse({ type: [CheckinDisponivelDto] })
  async listarDisponiveis(): Promise<CheckinDisponivelDto[]> {
    return this.checkinService.listarDisponiveis();
  }

  @Post()
  @Roles(UserRole.ALUNO)
  @ApiOperation({ summary: 'Realiza check-in (manual ou QR)' })
  @ApiCreatedResponse({ type: CheckinResponseDto })
  async criarCheckin(
    @Body() dto: CreateCheckinDto,
  ): Promise<CheckinResponseDto> {
    return this.checkinService.criarCheckin(dto);
  }
}
