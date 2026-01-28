import { Controller, Post, Body, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ActivateUserDTO } from "./dto/activate-user.dto";
import { IRegisterUserDTO } from "./dto/register-user.dto";
import { API_ROUTES } from "src/config/api.config";
import { JwtService } from "@nestjs/jwt";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post(API_ROUTES.auth.login)
  async login(@Body() body: { data: { login: string; password: string } }) {
    return this.authService.validateUser(body);
  }

  @Post(API_ROUTES.auth.refreshToken)
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Post(API_ROUTES.auth.register)
  async register(@Body() body: IRegisterUserDTO) {
    return this.authService.registerUser(body);
  }

  @Post(API_ROUTES.auth.activate)
  async activateAccount(@Body() body: ActivateUserDTO) {
    return this.authService.activateUser(body.login, body.password, body.key);
  }

  @Post(API_ROUTES.auth.checkToken)
  async checkToken(@Body() body: { token: string }) {
    try {
      const decoded = this.jwtService.verify(body.token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn < 60) {
        // Если до истечения < 60 сек, выдаем новый токен
        const newToken = this.jwtService.sign({
          login: decoded.login,
          isAdmin: decoded.isAdmin,
        });
        return { valid: true, user: decoded, newToken };
      }

      return { valid: true, user: decoded };
    } catch (error) {
      throw new UnauthorizedException("Токен недействителен");
    }
  }
}
