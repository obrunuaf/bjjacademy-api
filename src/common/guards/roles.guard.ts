import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (!user.role && !user.roles)) {
      throw new ForbiddenException('User role not provided');
    }

    const rolesFromToken: UserRole[] =
      (user.roles as UserRole[] | undefined)?.map(
        (role: string) => (role as string).toUpperCase() as UserRole,
      ) ?? [];

    if (
      rolesFromToken.some((role) =>
        requiredRoles.includes(role as UserRole),
      )
    ) {
      return true;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // TODO: considerar regras adicionais para TI como superadmin, se aplicǭvel.
    throw new ForbiddenException('Insufficient role');
  }
}
