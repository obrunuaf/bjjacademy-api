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
import { AulasService } from './aulas.service';
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
  async listarHoje(): Promise<AulaDto[]> {
    return this.aulasService.listarHoje();
  }

  @Get(':id/qrcode')
  @Roles(UserRole.INSTRUTOR, UserRole.PROFESSOR, UserRole.ADMIN, UserRole.TI)
  @ApiOperation({ summary: 'Obtém token de QR Code da aula' })
  @ApiOkResponse({ type: AulaQrCodeDto })
  async obterQrCode(@Param('id') id: string): Promise<AulaQrCodeDto> {
    return this.aulasService.gerarQrCode(id);
  }
}
