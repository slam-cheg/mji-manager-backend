import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigController } from "./config.controller"; // 🟢 Добавляем контроллер!

@Module({
  controllers: [ConfigController], // 🟢 Добавляем контроллер в модуль!
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
