import { Controller, Post, Body } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ActiveFunctionsDTO } from "./dto/active-functions.dto";
import { writeLog } from "../utils/writeLog";
import { timeStamp } from "../utils/timeStamp";
import { API_ROUTES } from "./api.config";

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
}
