import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import * as fs from "fs";
import { DeepSeekParserService } from "./deepseek-parser.service";

@Injectable()
export class UploadService {
  constructor(
    private readonly httpService: HttpService,
    private readonly deepSeekParser: DeepSeekParserService,
  ) {}

  // === Основной метод обработки (вызывается с фронта) ===
  async processFile(
    filePath: string,
    useAI: boolean,
    _prevSurveyNumber: string,
    useDeepSeek: boolean = false,
    address: string = "",
    registrationNumber: string = "",
  ): Promise<any> {
    try {
      console.log(`✅ Файл успешно сохранен: ${filePath}`);

      let reports: any[];
      const hasFilter = !!(registrationNumber?.trim() || address?.trim());

      // Сначала по регистрационному № (точнее), затем по адресу — парсим только чанк ~10 страниц по этому дому
      if (registrationNumber && registrationNumber.trim()) {
        console.log(
          `📄 Парсинг по регистрационному №: "${registrationNumber.trim()}" (только листы этого отчёта)`,
        );
        reports = await this.deepSeekParser.parsePdfChunkBySearchTerm(
          filePath,
          registrationNumber.trim(),
          "регистрационный №",
        );
      } else if (address && address.trim()) {
        console.log(
          `📄 Парсинг по адресу: "${address.trim()}" (только релевантные страницы)`,
        );
        reports = await this.deepSeekParser.parsePdfChunkByAddress(
          filePath,
          address.trim(),
        );
      } else {
        console.log(`🧠 Регистрационный № и адрес не переданы — парсим весь файл через DeepSeek...`);
        reports = await this.deepSeekParser.parsePdfWithDeepSeek(filePath);
      }

      console.log(`✅ Парсинг завершен. Найдено отчетов: ${reports.length}`);

      // Нормализуем ключи под расширение: "Результаты обследования" -> "Результаты выборочного обследования", "Описание дефектов" -> "Выявленные дефекты"
      reports = reports.map((r) => this.normalizeParsedToExtension(r));

      // Если нужен AI — перефразируем каждую фразу дефектов через DeepSeek
      if (useAI) {
        const modifiedReports = await Promise.all(
          reports.map((r) => this.modifyDataWithAI(r)),
        );
        return hasFilter && modifiedReports.length > 0
          ? modifiedReports[0]
          : modifiedReports;
      }

      return hasFilter && reports.length > 0 ? reports[0] : reports;
    } catch (error) {
      console.error("❌ Ошибка обработки файла:", error);
      throw error;
    } finally {
      await fs.promises.unlink(filePath);
      console.log(`🧹 Временный файл удален: ${filePath}`);
    }
  }

  /**
   * Нормализует распарсенный отчёт под формат расширения (loadData):
   * результаты_обследования (snake_case от DeepSeek) -> "Результаты выборочного обследования",
   * "Результаты обследования" -> "Результаты выборочного обследования",
   * "Описание дефектов" -> "Выявленные дефекты".
   */
  private normalizeParsedToExtension(data: any): any {
    if (!data || typeof data !== "object") return data;
    const out = JSON.parse(JSON.stringify(data));
    // DeepSeek возвращает результаты_обследования с конструкциями_и_системы и инженерные_системы_и_оборудование — конвертируем в плоский формат для расширения и AI
    if (out["результаты_обследования"] != null) {
      out["Результаты выборочного обследования"] = this.convertDeepSeekResultsBlock(
        out["результаты_обследования"],
      );
      delete out["результаты_обследования"];
    }
    const resultsKey =
      out["Результаты выборочного обследования"] != null
        ? "Результаты выборочного обследования"
        : out["Результаты обследования"] != null
          ? "Результаты обследования"
          : null;
    if (resultsKey && resultsKey === "Результаты обследования") {
      out["Результаты выборочного обследования"] = out["Результаты обследования"];
      delete out["Результаты обследования"];
    }
    const block =
      out["Результаты выборочного обследования"] ||
      out["Результаты обследования"];
    if (block && typeof block === "object") {
      this.normalizeDefectKeys(block);
    }
    return out;
  }

  /**
   * Конвертирует блок результаты_обследования от DeepSeek (конструкции_и_системы + инженерные_системы_и_оборудование)
   * в плоский объект "раздел" -> { "Выявленные дефекты", "% деф. части", "Оценка" } для расширения и rephraseDefectBlock.
   */
  private convertDeepSeekResultsBlock(raw: any): Record<string, any> {
    const rez: Record<string, any> = {};
    const constructions =
      raw?.["конструкции_и_системы"] ?? raw?.конструкции_и_системы ?? [];
    const engineering =
      raw?.["инженерные_системы_и_оборудование"] ??
      raw?.инженерные_системы_и_оборудование ??
      [];
    const SECTION_MAP: Record<string, string> = {
      "Тех. подполье": "Тех.подполье",
      "Тех. этаж": "Тех.этаж",
      "Система ГВС": "ГВС",
      "Система ХВС": "ХВС",
    };
    const ENG_MAP: Record<string, string> = {
      "Система ЭС (ВРУ - вводно-распределительное устройство)": "Система ЭС",
      "Система ППАиДУ": "ППАиДУ",
    };
    const sectionKey = (name: string) => SECTION_MAP[name] ?? name;
    const engKey = (name: string) => ENG_MAP[name] ?? name;
    const defectTextKeys = [
      "характер_и_местоположение",
      "характер и местоположение",
      "описание",
      "текст",
      "дефект",
      "описание_дефекта",
      "содержание",
    ];
    const elementNameKeys = ["элемент", "element", "наименование", "name"];
    const getDefectText = (d: any): string => {
      if (!d || typeof d !== "object") return "";
      for (const k of defectTextKeys) {
        const v = d[k];
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
      for (const k of Object.keys(d)) {
        if (elementNameKeys.includes(k)) continue;
        const v = d[k];
        if (typeof v === "string" && v.trim() !== "") return v.trim();
      }
      return "";
    };
    const getElementName = (d: any): string => {
      if (!d || typeof d !== "object") return "";
      for (const k of elementNameKeys) {
        const v = d[k];
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
      return "";
    };
    const getDefectPercent = (d: any): string =>
      d?.процент_дефектной_части != null ? String(d.процент_дефектной_части) : "";
    const getDefectOcenka = (d: any): string =>
      d?.оценка_текущая != null && String(d.оценка_текущая).trim() !== ""
        ? String(d.оценка_текущая).trim()
        : "-";
    const defectToRow = (d: any) => ({
      "Выявленные дефекты": getDefectText(d),
      "% деф. части": getDefectPercent(d),
      Оценка: getDefectOcenka(d),
    });

    for (const item of constructions) {
      const name = String(item?.наименование ?? "").trim();
      if (!name) continue;
      const key = sectionKey(name);
      const defects = Array.isArray(item?.дефекты) ? item["дефекты"] : [];
      if (defects.length === 0) {
        rez[key] = { "Выявленные дефекты": "", "% деф. части": "", Оценка: "-" };
        continue;
      }
      const hasSub = defects.some((d: any) => getElementName(d) !== "");
      if (hasSub) {
        const nested: Record<string, any> = {};
        for (const d of defects) {
          const subName = getElementName(d);
          nested[subName || "Все элементы"] = defectToRow(d);
        }
        rez[key] = nested;
      } else {
        rez[key] =
          defects[0] != null
            ? defectToRow(defects[0])
            : { "Выявленные дефекты": "", "% деф. части": "", Оценка: "-" };
      }
    }
    for (const item of engineering) {
      const name = String(item?.наименование ?? "").trim();
      if (!name) continue;
      const key = engKey(name);
      const defectsStr = typeof item?.дефекты === "string" ? item["дефекты"] : "";
      rez[key] = {
        "Выявленные дефекты": String(defectsStr ?? "").trim(),
        "№ и дата последнего обслед.": String(
          item?.номер_и_дата_последнего_обследования ?? "",
        ).trim(),
        "Специализированная организация": String(
          item?.специализированная_организация ?? "",
        ).trim(),
        Оценка: String(item?.оценка_текущая ?? "").trim() || "-",
      };
    }
    return rez;
  }

  private normalizeDefectKeys(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (key === "Описание дефектов" && typeof v === "string") {
        obj["Выявленные дефекты"] = v;
        delete obj["Описание дефектов"];
      } else if (key === "Оц. по пред. обсл." && v !== undefined) {
        obj["Оценка пред."] = v;
        delete obj["Оц. по пред. обсл."];
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        this.normalizeDefectKeys(v);
      }
    }
  }

  /**
   * Перефразирует через DeepSeek каждую непустую фразу дефектов в блоке "Результаты выборочного обследования".
   */
  async modifyDataWithAI(data: any): Promise<any> {
    const block =
      data["Результаты выборочного обследования"] ||
      data["Результаты обследования"];
    if (!block || typeof block !== "object") {
      console.log("🧠 AI: блок результатов обследования не найден, возвращаем как есть.");
      return data;
    }
    console.log("🧠 AI: перефразирование описаний дефектов через DeepSeek...");
    await this.rephraseDefectBlock(block);
    if (!data["Результаты выборочного обследования"])
      data["Результаты выборочного обследования"] = block;
    return data;
  }

  private async rephraseDefectBlock(obj: any): Promise<void> {
    if (!obj || typeof obj !== "object") return;
    const defectKey =
      obj["Выявленные дефекты"] !== undefined
        ? "Выявленные дефекты"
        : obj["Описание дефектов"] !== undefined
          ? "Описание дефектов"
          : null;
    if (defectKey) {
      const text = String(obj[defectKey] || "").trim();
      if (text) {
        const rephrased = await this.deepSeekParser.rephraseDefectText(text);
        obj["Выявленные дефекты"] = rephrased;
        if (defectKey !== "Выявленные дефекты") delete obj[defectKey];
      }
    }
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (v && typeof v === "object" && !Array.isArray(v))
        await this.rephraseDefectBlock(v);
    }
  }

  /**
   * Перефразирует блок "Результаты выборочного обследования" (для кнопки «Вставить» с AI).
   */
  async rephraseDefectsBlock(results: Record<string, any>): Promise<Record<string, any>> {
    const out = JSON.parse(JSON.stringify(results));
    await this.rephraseDefectBlock(out);
    return out;
  }

}
