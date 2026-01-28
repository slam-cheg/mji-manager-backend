import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { DatabaseModule } from "./database/database.module";
import { AppConfigModule } from "./config/config.module";
import { SystemModule } from "./system/system.module";
import { AppDataModule } from "./appData/appData.module";

@Module({
  imports: [
    AuthModule,
    UserModule,
    DatabaseModule,
    AppConfigModule,
    SystemModule,
    AppDataModule,
  ],
})
export class AppModule {}
