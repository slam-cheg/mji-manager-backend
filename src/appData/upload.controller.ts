import { Controller, Post, Body, Res } from "@nestjs/common";
import { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { UploadService } from "./upload.service"; // Импортируем UploadService
import { API_ROUTES } from "src/config/api.config";

@Controller("api")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {} // Внедряем сервис

  @Post(API_ROUTES.app.uploadPDF)
  async uploadPdf(
    @Body()
    body: {
      fileName: string;
      fileData: string;
      useAI: boolean;
      useDeepSeek?: boolean;
      address?: string; // адрес дома — парсим только страницы с этим адресом
      registrationNumber?: string; // регистрационный № отчёта (напр. С-23-0003239) — парсим только листы этого отчёта
    },
    @Res() res: Response,
  ) {
    if (!body || !body.fileName || !body.fileData) {
      console.error("❌ Ошибка: данные не получены должным образом.");
      res.status(400).json({ success: false, message: "Неверный формат данных" });
      return;
    }

    try {
      console.log(`📥 Декодируем base64 в PDF для файла: ${body.fileName}`);

      // Расширение шлёт data URL (data:application/pdf;base64,...), бэкенд принимает и его, и голый base64
      const base64Data =
        typeof body.fileData === "string" && body.fileData.includes(",")
          ? body.fileData.split(",")[1]
          : body.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, body.fileName);
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Файл успешно сохранен: ${filePath}`);

      // Поток NDJSON: расширение обновляет статусы по шагам (Загрузка PDF → Парсинг → AI → Вставка)
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.flushHeaders?.();

      const sendStep = (step: number, status: string) => {
        res.write(JSON.stringify({ step, status }) + "\n");
        res.flush?.();
      };
      sendStep(0, "done"); // Загрузка PDF уже выполнена

      const parsedData = await this.uploadService.processFile(
        filePath,
        body.useAI ?? false,
        "",
        body.useDeepSeek ?? true,
        body.address || "",
        body.registrationNumber || "",
        sendStep,
      );
      console.log(`Парсинг завершен`);

      const bodySize = JSON.stringify(parsedData).length;
      console.log(`📤 Отправляем ответ клиенту, размер data: ${bodySize} символов`);
      res.write(JSON.stringify({ done: true, data: parsedData }) + "\n");
      res.end();
    } catch (error) {
      console.error("❌ Ошибка обработки Base64 PDF:", error);
      const errMsg = (error as Error).message;
      if (res.headersSent) {
        res.write(JSON.stringify({ error: errMsg }) + "\n");
        res.end();
      } else {
        res.status(500).json({ success: false, error: errMsg });
      }
    }
  }

  /**
   * Перефразирование блока "Результаты выборочного обследования" через DeepSeek.
   * Используется при «Вставить» в расширении с включённым AI.
   */
  @Post(API_ROUTES.app.rephraseDefectsBlock)
  async rephraseDefectsBlock(
    @Body()
    body: { results: Record<string, any> },
  ) {
    if (!body?.results || typeof body.results !== "object") {
      return { success: false, error: "Неверный формат: ожидается { results }" };
    }
    try {
      const rephrased = await this.uploadService.rephraseDefectsBlock(
        body.results,
      );
      return { success: true, data: rephrased };
    } catch (error) {
      console.error("❌ Ошибка перефразирования блока дефектов:", error);
      return { success: false, error: (error as Error).message };
    }
  }
}
