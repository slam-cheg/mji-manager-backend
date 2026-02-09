import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Требуется авторизация");
    }
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<{ login: string; isAdmin: boolean }>(token);
      if (!payload.isAdmin) {
        throw new ForbiddenException("Доступ только для администратора");
      }
      (request as Request & { user: { login: string; isAdmin: boolean } }).user = payload;
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new UnauthorizedException("Недействительный токен");
    }
  }
}
