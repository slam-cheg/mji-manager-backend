import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { DeepSeekParserService } from "./deepseek-parser.service";

@Injectable()
export class UploadService {
	constructor(
		private readonly httpService: HttpService,
		private readonly deepSeekParser: DeepSeekParserService
	) {}

	// === Основной метод обработки (вызывается с фронта) ===
	async processFile(
		filePath: string,
		useAI: boolean,
		prevSurveyNumber: string,
		useDeepSeek: boolean = false
	): Promise<any> {
		try {
			console.log(`✅ Файл успешно сохранен: ${filePath}`);

			let reports: any[];

			// Выбираем метод парсинга
			if (useDeepSeek) {
				console.log(`🧠 Используем DeepSeek парсер...`);
				reports = await this.deepSeekParser.parsePdfWithDeepSeek(filePath);
			} else {
				console.log(`🐍 Используем Python парсер...`);
				reports = await this.runPythonParser(filePath);
			}

			console.log(`✅ Парсинг завершен. Найдено отчетов: ${reports.length}`);

			// 3. Если нужен AI — прогоняем через modifyDataWithAI
			if (useAI) {
				const modifiedReports = await Promise.all(reports.map(this.modifyDataWithAI.bind(this)));
				return modifiedReports;
			}

			return reports;
		} catch (error) {
			console.error("❌ Ошибка обработки файла:", error);
			throw error;
		} finally {
			// 4. Удаляем файл после обработки
			await fs.promises.unlink(filePath);
			console.log(`🧹 Временный файл удален: ${filePath}`);
		}
	}

	// === Заглушка для AI (можно доработать под свои нужды) ===
	async modifyDataWithAI(data: any): Promise<any> {
		// Тут можешь вставить интеграцию с AI
		console.log("🧠 AI обработка (заглушка)...");
		return data;
	}

	// === Запускаем Python-парсер на файле PDF ===
	private runPythonParser(filePath: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const pythonScriptPath = path.resolve(process.cwd(), "parser", "parser.py"); // Указывает на корень

			console.log("🚀 Запускаем Python-скрипт:");
			console.log(`  📄 Путь к скрипту: ${pythonScriptPath}`);
			console.log(`  📄 Путь к PDF: ${filePath}`);

			execFile("python", [pythonScriptPath, filePath], (error, stdout, stderr) => {
				if (error) {
					console.error(`❌ Ошибка выполнения Python-скрипта: ${stderr}`);
					return reject(error);
				}

				try {
					console.log(`📤 Ответ парсера: ${stdout}`);
					const parsedReports = JSON.parse(stdout);
					resolve(parsedReports);
				} catch (parseError) {
					console.error(`❌ Ошибка парсинга JSON из Python: ${parseError}`);
					reject(parseError);
				}
			});
		});
	}
}
