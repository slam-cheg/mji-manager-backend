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

/** Настройки AI по умолчанию (модель и промпты для парсера PDF). */
export const DEFAULT_AI_SYSTEM_PROMPT = `Ты эксперт по извлечению структурированных данных из технических отчетов обследования зданий.

Твоя задача - внимательно прочитать PDF документ (или его часть) и извлечь все данные в структурированном JSON формате.

Структура данных должна включать:
- шапка: { компания, регистрационный_номер, дата }
- адрес: { улица, дом, корпус, строение, район_поселение }
- паспортные_данные: объект с полями паспорта здания
- результаты_обследования: ОБЯЗАТЕЛЬНО в следующем виде (два массива, не один "элементы"):

  результаты_обследования: {
    "конструкции_и_системы": [
      {
        "наименование": "Крыша" | "Водоотвод" | "Фасад" | "Балконы" | "Стены" | "Подвал" | "Тех. подполье" | "Лестницы" | "Перекрытия" | "Система отопления" | "Система ГВС" | "Система ХВС" | "Канализация" | "Мусоропроводы" | "Места общего пользования" и т.д.,
        "характеристика": "строка с описанием",
        "дефекты": [
          {
            "элемент": "Кровля" | "Свесы" | "Чердак" | "" | ... (подэлемент или пусто),
            "характер_и_местоположение": "текст дефекта",
            "оценка_по_предыдущему_обследованию": "У" | "Р" | "Н" | "",
            "процент_дефектной_части": число или "",
            "оценка_текущая": "У" | "Р" | "Н" | "ОГР" | ""
          }
        ]
      }
    ],
    "инженерные_системы_и_оборудование": [
      {
        "наименование": "Связь с ОДС" | "Вентиляция" | "Лифты" | "Система ЭС (ВРУ - вводно-распределительное устройство)" | "Система ППАиДУ" | "Система оповещения о пожаре" и т.д.,
        "характеристика": "строка",
        "дефекты": "строка (описание состояния, не массив)",
        "номер_и_дата_последнего_обследования": "",
        "специализированная_организация": "",
        "оценка_предыдущая": "У" | "Р" | "Н" | "",
        "оценка_текущая": "У" | "Р" | "Н" | ""
      }
    ]
  }

НЕ используй один массив "элементы". Всегда возвращай именно конструкции_и_системы (массив) и инженерные_системы_и_оборудование (массив) внутри результаты_обследования.

ВАЖНЫЕ ПРАВИЛА:
1. Извлекай ТОЛЬКО данные, которые явно присутствуют в документе
2. Если поле не найдено - оставь пустое значение (пустая строка "", 0, пустой массив [])
3. Сохраняй структуру вложенных объектов и массивов
4. Для числовых значений используй числа, для строк - строки
5. Если документ содержит несколько отчетов - извлекай данные для каждого отдельно
6. Если это часть документа (не все страницы) - извлекай только те данные, которые есть на этих страницах

Верни ТОЛЬКО валидный JSON объект (или массив объектов, если отчетов несколько) без дополнительных комментариев, объяснений или markdown разметки.`;

export const DEFAULT_AI_USER_PROMPT_TEMPLATE = `Проанализируй страницы {{start}}-{{end}} этого PDF документа и извлеки все данные согласно шаблону.{{firstChunkHint}}{{middleChunkHint}}{{lastChunkHint}}

Верни ТОЛЬКО валидный JSON объект без дополнительного текста.`;

export interface AiSettings {
  model: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

@Injectable()
export class ConfigService {
  private readonly flagsFilePath: string;
  private readonly aiSettingsFilePath: string;

  constructor() {
    // Порядок: project root (при запуске из корня), затем относительно dist (при деплое копируйте appConfig в dist)
    const candidates = [
      path.join(process.cwd(), "appConfig", "appFlags.json"),
      path.join(__dirname, "../../appConfig", "appFlags.json"),
      path.join(__dirname, "../appConfig", "appFlags.json"),
    ];
    this.flagsFilePath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
    const appConfigDir = path.dirname(this.flagsFilePath);
    this.aiSettingsFilePath = path.join(appConfigDir, "ai-settings.json");
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

  /** Настройки AI (модель и промпты). Читает из ai-settings.json с подстановкой значений по умолчанию. */
  getAiSettings(): AiSettings {
    const defaultModel =
      process.env.ROUTERAI_DEEPSEEK_MODEL ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek/deepseek-v3.2";
    const defaults: AiSettings = {
      model: defaultModel,
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      userPromptTemplate: DEFAULT_AI_USER_PROMPT_TEMPLATE,
    };
    try {
      if (!fs.existsSync(this.aiSettingsFilePath)) {
        return defaults;
      }
      const data = fs.readFileSync(this.aiSettingsFilePath, "utf-8");
      const parsed = JSON.parse(data) as Partial<AiSettings>;
      return {
        model:
          typeof parsed.model === "string" && parsed.model.trim()
            ? parsed.model.trim()
            : defaults.model,
        systemPrompt:
          typeof parsed.systemPrompt === "string"
            ? parsed.systemPrompt
            : defaults.systemPrompt,
        userPromptTemplate:
          typeof parsed.userPromptTemplate === "string"
            ? parsed.userPromptTemplate
            : defaults.userPromptTemplate,
      };
    } catch (error) {
      console.error("Ошибка чтения ai-settings.json:", error);
      return defaults;
    }
  }

  /** Сохранение настроек AI в ai-settings.json (онлайн, без перезапуска). */
  updateAiSettings(settings: AiSettings): boolean {
    try {
      const dir = path.dirname(this.aiSettingsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.aiSettingsFilePath,
        JSON.stringify(
          {
            model: settings.model?.trim() || "deepseek/deepseek-v3.2",
            systemPrompt: settings.systemPrompt ?? "",
            userPromptTemplate: settings.userPromptTemplate ?? "",
          },
          null,
          2,
        ),
      );
      return true;
    } catch (error) {
      console.error("Ошибка записи ai-settings.json:", error);
      return false;
    }
  }
}
