import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { AppConfigModule } from "../config/config.module"; // ✅ Импортируем ConfigModule
import { ConfigService } from "../config/config.service"; // ✅ Импортируем сервис

@Module({
  imports: [TypeOrmModule.forFeature([User]), AppConfigModule], // ✅ Добавили ConfigModule
  controllers: [UserController],
  providers: [UserService, ConfigService], // ✅ Добавили ConfigService
  exports: [UserService],
})
export class UserModule {}
