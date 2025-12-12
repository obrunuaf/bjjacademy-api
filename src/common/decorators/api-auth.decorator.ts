import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiAuth = () =>
  applyDecorators(
    ApiBearerAuth('JWT'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
