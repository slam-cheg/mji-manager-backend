import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppData } from "./appData.entity";
import { AppDataController } from "./appData.controller";
import { AppDataService } from "./appData.service";
import { AppConfigModule } from "../config/config.module";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { DeepSeekParserService } from "./deepseek-parser.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppData]),
    AppConfigModule,
    HttpModule, // Ensure this module is included for FunctionsService
  ],
  controllers: [AppDataController, UploadController],
  providers: [AppDataService, UploadService, DeepSeekParserService],
  exports: [AppDataService],
})
export class AppDataModule {}
