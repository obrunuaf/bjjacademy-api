import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AcademiaService } from './academia.service';
import { AcademiaResponseDto } from './dtos/academia-response.dto';
import { CreateAcademiaDto, AcademiasListDto } from './dtos/create-academia.dto';
import { UpdateAcademiaDto } from './dtos/update-academia.dto';

/**
 * Controller para operações TI-only em múltiplas academias
 * Diferente de /academia/me que é para ADMIN da própria academia
 */
@ApiTags('Academias (TI)')
@ApiAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TI)
@Controller('academias')
export class AcademiasController {
  constructor(private readonly academiaService: AcademiaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as academias (TI only)' })
  @ApiOkResponse({ type: AcademiasListDto })
  async listAll(): Promise<AcademiasListDto> {
    return this.academiaService.listAcademias();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma nova academia (TI only)' })
  @ApiCreatedResponse({ type: AcademiaResponseDto })
  async create(@Body() dto: CreateAcademiaDto): Promise<AcademiaResponseDto> {
    return this.academiaService.createAcademia(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados de uma academia (TI only)' })
  @ApiOkResponse({ type: AcademiaResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAcademiaDto,
  ): Promise<AcademiaResponseDto> {
    return this.academiaService.updateById(id, dto);
  }

  @Patch(':id/desativar')
  @ApiOperation({ summary: 'Desativa uma academia (TI only)' })
  async deactivate(@Param('id') id: string) {
    return this.academiaService.deactivate(id);
  }

  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativa uma academia (TI only)' })
  async reactivate(@Param('id') id: string) {
    return this.academiaService.reactivate(id);
  }
}
