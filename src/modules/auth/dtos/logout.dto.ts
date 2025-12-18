import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token a ser revogado' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutResponseDto {
  @ApiProperty()
  message: string;
}

export class LogoutAllDto {
  // No body needed - uses authenticated user
}

export class LogoutAllResponseDto {
  @ApiProperty()
  sessionsRevoked: number;

  @ApiProperty()
  message: string;
}
