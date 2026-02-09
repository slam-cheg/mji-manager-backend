import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "./config.service";
import { ActiveFunctionsDTO } from "./dto/active-functions.dto";
import { writeLog } from "../utils/writeLog";
import { timeStamp } from "../utils/timeStamp";
import { API_ROUTES } from "./api.config";
import type { AiSettings } from "./config.service";

@Controller("api")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Post(API_ROUTES.config.changeFunctions)
  async updateActiveFunctions(@Body() body: ActiveFunctionsDTO) {
    console.log("Начат процесс изменения активных функций...");

    const updateSuccess = await this.configService.updateActiveFunctions(
      body.functions,
    );

    const response = {
      status: updateSuccess
        ? "Работа функций успешно изменена."
        : "Работа функций не изменена. Ошибка.",
      boolean: updateSuccess,
      timeStamp: timeStamp(),
    };

    writeLog(response, "changingFunctions");
    return { Success: updateSuccess };
  }

  @Get(API_ROUTES.config.getAiSettings)
  @UseGuards(AuthGuard("jwt"))
  async getAiSettings(@Req() req: { user?: { login: string; isAdmin: boolean } }) {
    if (!req.user?.isAdmin) {
      throw new ForbiddenException("Доступ только для администратора");
    }
    return this.configService.getAiSettings();
  }

  @Post(API_ROUTES.config.updateAiSettings)
  @UseGuards(AuthGuard("jwt"))
  async updateAiSettings(
    @Req() req: { user?: { login: string; isAdmin: boolean } },
    @Body() body: AiSettings,
  ) {
    if (!req.user?.isAdmin) {
      throw new ForbiddenException("Доступ только для администратора");
    }
    const updateSuccess = this.configService.updateAiSettings(body);
    return {
      success: updateSuccess,
      status: updateSuccess
        ? "Настройки AI успешно сохранены."
        : "Ошибка сохранения настроек AI.",
    };
  }
}
