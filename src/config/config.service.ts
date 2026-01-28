import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { API_ROUTES } from "./api.config";

@Injectable()
export class ConfigService {
  private readonly flagsFilePath: string;

  constructor() {
    this.flagsFilePath = path.join(__dirname, "../../appConfig/appFlags.json");
  }

  // Чтение функций из файла
  getFunctionsList(): Record<string, any> {
    try {
      const data = fs.readFileSync(this.flagsFilePath, "utf-8");
      console.log("Функции получены. Передача на фронт.");
      return JSON.parse(data);
    } catch (error) {
      console.error("Ошибка чтения appFlags.json:", error);
      return {};
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
