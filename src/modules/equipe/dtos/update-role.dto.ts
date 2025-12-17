import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UpdateRoleDto {
  @ApiProperty({ 
    description: 'Novos papéis do usuário', 
    enum: UserRole, 
    isArray: true,
    example: ['INSTRUTOR', 'ALUNO']
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  papeis: UserRole[];
}

export class UpdateRoleResponseDto {
  @ApiProperty()
  usuarioId: string;

  @ApiProperty({ type: [String] })
  papeis: string[];

  @ApiProperty()
  message: string;
}
