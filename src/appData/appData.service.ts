import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { AppData } from "./appData.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { mjiPopupLayout } from "./mjipopuplayout";
import { fakeSelectsLayout } from "./fakeSelectsLayout";
import { mjiPopupStyles } from "./mjiPopupStyles";
import { writeLog } from "src/utils/writeLog";
import { UpdateDefectsDTO } from "./dto/update-defects.dto";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class AppDataService {
  constructor(
    private readonly ConfigService: ConfigService,
    @InjectRepository(AppData)
    private readonly appDataRepository: Repository<AppData>, // Получаем данные из БД
  ) {}

  // Метод для получения данных приложения, включая функции
  async getAppData() {
    const appData = await this.appDataRepository.findOne({ where: { id: 1 } });

    if (!appData) {
      throw new Error("Данные приложения не найдены.");
    }

    // Получаем список функций через FunctionsService
    const functions = await this.ConfigService.getFunctionsList();

    // Формируем структуру layout с учетом полученных функций
    const appLayout = {
      popupLayout: mjiPopupLayout(functions),
      fakeSelectList: fakeSelectsLayout,
      stylesLayout: mjiPopupStyles,
    };

    // Статус данных
    const dataStatus = {
      defectsData: appData.defectsData ? "OK" : "No data",
      ratesData: appData.ratesData ? "OK" : "No data",
      representativesData: appData.representativesData ? "OK" : "No data",
      appLayout: appLayout ? "OK" : "No data",
      functions: functions ? "OK" : "No data",
    };

    return {
      defectsData: appData.defectsData,
      appLayout: appLayout,
      ratesData: appData.ratesData,
      representativesData: appData.representativesData,
      dataStatus: dataStatus,
      functions: functions,
    };
  }

  // Метод для получения только верстки
  async getAppLayout() {
    const appData = await this.appDataRepository.findOne({ where: { id: 1 } });

    if (!appData) {
      throw new Error("Данные приложения не найдены.");
    }

    const functions = await this.ConfigService.getFunctionsList();

    return {
      status: "Верстка приложения отдана.",
      boolean: true,
      layout: mjiPopupLayout(functions), // Используем функции, полученные из БД
      timeStamp: new Date().toISOString(),
    };
  }

  // Метод для обновления дефектов
  async updateDefects(dto: UpdateDefectsDTO): Promise<{ Success: boolean }> {
    const { login, defects } = dto;

    const existingAppData = await this.appDataRepository.findOne({
      where: { id: 1 },
    });

    if (!existingAppData) {
      throw new Error("Данные приложения не найдены.");
    }

    existingAppData.defectsData = defects;
    await this.appDataRepository.save(existingAppData);

    const logInfo = {
      status: "Список дефектов успешно изменен.",
      boolean: true,
      login,
      timeStamp: new Date().toISOString(),
    };

    writeLog(logInfo, "ChangeDefects");

    return { Success: true };
  }
}
