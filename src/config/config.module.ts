import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigController } from "./config.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "secret",
        signOptions: { expiresIn: "1h" },
      }),
    }),
  ],
  controllers: [ConfigController],
  providers: [ConfigService, AdminAuthGuard],
  exports: [ConfigService],
})
export class AppConfigModule {}
