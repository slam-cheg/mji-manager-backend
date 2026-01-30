import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { API_ROUTES } from "./api.config";

/** Флаги по умолчанию, если appFlags.json недоступен (расширение показывает вкладку «Основное» и кнопки). */
const DEFAULT_APP_FLAGS: Record<string, boolean> = {
  searchAllInputs: true,
  saveData: true,
  loadData: true,
  clearData: true,
  downloadPhotos: true,
  createFakeSelects: true,
  setRepresentatives: true,
  setRatings: true,
  parser: true,
  parserPDF: true,
  useAI: true,
  algorythms: false,
};

@Injectable()
export class ConfigService {
  private readonly flagsFilePath: string;

  constructor() {
    // Порядок: project root (при запуске из корня), затем относительно dist (при деплое копируйте appConfig в dist)
    const candidates = [
      path.join(process.cwd(), "appConfig", "appFlags.json"),
      path.join(__dirname, "../../appConfig", "appFlags.json"),
      path.join(__dirname, "../appConfig", "appFlags.json"),
    ];
    this.flagsFilePath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  }

  // Чтение функций из файла
  getFunctionsList(): Record<string, any> {
    try {
      const data = fs.readFileSync(this.flagsFilePath, "utf-8");
      console.log("Функции получены. Передача на фронт.");
      return JSON.parse(data);
    } catch (error) {
      console.error("Ошибка чтения appFlags.json:", error);
      return { ...DEFAULT_APP_FLAGS };
    }
  }

  // Обновление функций в файле
  updateActiveFunctions(functions: Record<string, any>): boolean {
    try {
      fs.writeFileSync(this.flagsFilePath, JSON.stringify(functions, null, 2));
      return true;
    } catch (error) {
      console.error("Ошибка записи в appFlags.json:", error);
      return false;
    }
  }
}
