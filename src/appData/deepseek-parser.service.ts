import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import * as fs from "fs";
import * as path from "path";

/**
 * Сервис для парсинга PDF через DeepSeek API с разбивкой на части
 * 
 * Поддерживает:
 * - Документы до 4000+ страниц
 * - Файлы до 100 МБ
 * - Разбивку на части по 10 страниц
 * - Использование mistral-ocr для OCR
 * - Лимит 131000 токенов за запрос
 */
@Injectable()
export class DeepSeekParserService {
	private readonly API_BASE_URL = process.env.ROUTERAI_API_URL || process.env.OPENROUTER_API_BASE_URL || "https://openrouter.ai/api/v1";
	private readonly API_KEY = process.env.ROUTERAI_API_KEY || process.env.OPENROUTER_API_KEY;
	private readonly DEEPSEEK_MODEL = process.env.ROUTERAI_DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL || "deepseek/deepseek-v3.2";
	// Движок определяется автоматически на основе типа PDF (не из env)
	private readonly PAGES_PER_CHUNK = 10; // Разбиваем по 10 страниц
	private readonly MAX_TOKENS = 131000; // Лимит токенов
	private readonly MAX_RETRIES = 3; // Количество попыток при ошибке
	private readonly RETRY_DELAY = 2000; // Задержка между попытками (мс)

	constructor(private readonly httpService: HttpService) {
		if (!this.API_KEY) {
			console.warn("⚠️ API ключ не задан (ROUTERAI_API_KEY или OPENROUTER_API_KEY). Парсинг через DeepSeek будет недоступен.");
		} else {
			console.log(`✅ DeepSeek парсер инициализирован: ${this.API_BASE_URL}`);
		}
	}

	/**
	 * Автоматически определяет тип PDF и выбирает подходящий движок
	 * Согласно документации RouterAI:
	 * - pdf-text: для текстовых PDF (бесплатно)
	 * - mistral-ocr: для отсканированных документов (платно)
	 * - native: для моделей с нативной поддержкой (оплачивается как входные токены)
	 * 
	 * @param filePath - путь к PDF файлу
	 * @returns название движка: "pdf-text" для текстовых PDF, "mistral-ocr" для отсканированных
	 */
	private async detectPdfEngine(filePath: string): Promise<string> {
		try {
			// Пытаемся извлечь текст из первых страниц для определения типа
			const { execFile } = await import("child_process");
			const { promisify } = await import("util");
			const execFileAsync = promisify(execFile);

			const pythonScript = `
import sys
try:
    import pdfplumber
    with pdfplumber.open("${filePath.replace(/\\/g, "/")}") as pdf:
        # Извлекаем текст с первых 3 страниц
        text = ""
        for i, page in enumerate(pdf.pages[:3]):
            page_text = page.extract_text()
            if page_text:
                text += page_text
        
        # Если извлечено достаточно текста (более 500 символов) - это текстовый PDF
        # Используем pdf-text (бесплатно) для текстовых PDF
        if len(text) > 500:
            print("pdf-text")
        else:
            # Мало текста - вероятно отсканированный документ
            print("mistral-ocr")
except:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader("${filePath.replace(/\\/g, "/")}")
        text = ""
        for i, page in enumerate(reader.pages[:3]):
            page_text = page.extract_text()
            if page_text:
                text += page_text
        
        if len(text) > 500:
            print("pdf-text")
        else:
            print("mistral-ocr")
    except Exception as e:
        # По умолчанию используем pdf-text (бесплатно и быстрее)
        print("pdf-text")
`;

			const tempScriptPath = path.join(process.cwd(), "temp_detect_pdf.py");
			fs.writeFileSync(tempScriptPath, pythonScript);

			const { stdout } = await execFileAsync("python", [tempScriptPath]);
			fs.unlinkSync(tempScriptPath);

			const engine = stdout.trim();
			// Поддерживаем только pdf-text и mistral-ocr
			// native используется автоматически RouterAI для моделей с нативной поддержкой
			return engine === "mistral-ocr" ? "mistral-ocr" : "pdf-text";
		} catch (error) {
			console.warn(`⚠️ Не удалось определить тип PDF, используем pdf-text по умолчанию: ${error.message}`);
			// По умолчанию используем pdf-text (бесплатно и быстрее согласно документации)
			return "pdf-text";
		}
	}

	/**
	 * Получает количество страниц в PDF файле
	 */
	private async getPdfPageCount(filePath: string): Promise<number> {
		try {
			// Используем Python для определения количества страниц
			const { execFile } = await import("child_process");
			const { promisify } = await import("util");
			const execFileAsync = promisify(execFile);

			const pythonScript = `
import sys
try:
    import pdfplumber
    with pdfplumber.open("${filePath.replace(/\\/g, "/")}") as pdf:
        print(len(pdf.pages))
except:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader("${filePath.replace(/\\/g, "/")}")
        print(len(reader.pages))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
`;

			const tempScriptPath = path.join(process.cwd(), "temp_count_pages.py");
			fs.writeFileSync(tempScriptPath, pythonScript);

			const { stdout } = await execFileAsync("python", [tempScriptPath]);
			fs.unlinkSync(tempScriptPath);

			const pageCount = parseInt(stdout.trim(), 10);
			if (isNaN(pageCount) || pageCount <= 0) {
				throw new Error("Не удалось определить количество страниц");
			}

			return pageCount;
		} catch (error) {
			console.error("❌ Ошибка при определении количества страниц:", error);
			throw new Error(`Не удалось определить количество страниц: ${error.message}`);
		}
	}

	/**
	 * Разбивает диапазон страниц на чанки по PAGES_PER_CHUNK страниц
	 */
	private getPageChunks(totalPages: number): Array<{ start: number; end: number }> {
		const chunks: Array<{ start: number; end: number }> = [];
		
		// Всегда используем PAGES_PER_CHUNK (10 страниц)
		const chunkSize = this.PAGES_PER_CHUNK;

		for (let start = 1; start <= totalPages; start += chunkSize) {
			const end = Math.min(start + chunkSize - 1, totalPages);
			chunks.push({ start, end });
		}

		return chunks;
	}

	/**
	 * Загружает template.json для создания промпта
	 */
	private loadTemplate(): any {
		const templatePath = path.join(process.cwd(), "parser", "template.json");
		if (!fs.existsSync(templatePath)) {
			throw new Error(`Шаблон не найден: ${templatePath}`);
		}
		return JSON.parse(fs.readFileSync(templatePath, "utf-8"));
	}

	/**
	 * Создает системный промпт для извлечения данных по template.json
	 */
	private createSystemPrompt(template: any): string {
		// Всегда используем упрощенный промпт, чтобы избежать проблем с большими шаблонами
		// Template.json слишком большой и может вызывать ошибки при сериализации JSON payload
		return `Ты эксперт по извлечению структурированных данных из технических отчетов обследования зданий.

Твоя задача - внимательно прочитать PDF документ (или его часть) и извлечь все данные в структурированном JSON формате.

Структура данных должна включать:
- Шапка: Компания, Регистрационный №, Дата
- Адрес: полный адрес здания
- Паспортные данные: тип здания, год постройки, этажность и т.д.
- Результаты обследования: детальная информация о дефектах, повреждениях, характеристиках
- Выводы и рекомендации

ВАЖНЫЕ ПРАВИЛА:
1. Извлекай ТОЛЬКО данные, которые явно присутствуют в документе
2. Если поле не найдено - оставь пустое значение (пустая строка "", 0, пустой массив [])
3. Сохраняй структуру вложенных объектов и массивов
4. Для числовых значений используй числа, для строк - строки
5. Если документ содержит несколько отчетов - извлекай данные для каждого отдельно
6. Если это часть документа (не все страницы) - извлекай только те данные, которые есть на этих страницах

Верни ТОЛЬКО валидный JSON объект (или массив объектов, если отчетов несколько) без дополнительных комментариев, объяснений или markdown разметки.`;
	}

	/**
	 * Создает пользовательский промпт для конкретной части документа
	 */
	private createUserPrompt(chunk: { start: number; end: number }, isFirstChunk: boolean, isLastChunk: boolean): string {
		let prompt = `Проанализируй страницы ${chunk.start}-${chunk.end} этого PDF документа и извлеки все данные согласно шаблону.`;

		if (isFirstChunk) {
			prompt += "\n\nЭто начало документа. Обрати особое внимание на извлечение данных из шапки (компания, регистрационный номер, дата), адреса и паспортных данных здания.";
		}

		if (!isFirstChunk && !isLastChunk) {
			prompt += "\n\nЭто средняя часть документа. Сосредоточься на извлечении данных из секции 'РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ'.";
		}

		if (isLastChunk) {
			prompt += "\n\nЭто конец документа. Обрати особое внимание на извлечение выводов и рекомендаций.";
		}

		prompt += "\n\nВерни ТОЛЬКО валидный JSON объект без дополнительного текста.";

		return prompt;
	}

	/**
	 * Пытается исправить распространенные ошибки в JSON строке
	 */
	private fixJsonString(jsonStr: string): string {
		// Исправляем множественные закрывающие скобки перед закрытием массива
		// Обрабатываем случаи: }}]}, }}]}, }}}], и т.д.
		// Сначала тройные и более сложные случаи (}}]} -> }])
		jsonStr = jsonStr.replace(/\}\}\}+(\s*\])/g, '}$1');
		
		// Затем двойные закрывающие скобки (}}] -> }])
		// Сначала точное совпадение без пробелов
		jsonStr = jsonStr.replace(/}}]/g, '}]');
		
		// Затем обрабатываем случаи с пробелами/переносами: }} ], }}\n], и т.д.
		jsonStr = jsonStr.replace(/\}\}(\s*\])/g, '}$1');
		
		// Исправляем тройные закрывающие скобки в других местах (}}} -> })
		jsonStr = jsonStr.replace(/\}\}\}+/g, '}');
		
		// Удаляем trailing commas перед закрывающими скобками/фигурными скобками
		// Используем более агрессивный подход - удаляем запятые перед любыми закрывающими скобками
		jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
		
		// Удаляем множественные запятые подряд
		jsonStr = jsonStr.replace(/,{2,}/g, ',');
		
		// Исправляем запятые после последнего элемента в массиве (более точный паттерн)
		// Ищем паттерн: элемент, затем запятая, затем пробелы/переносы, затем ]
		jsonStr = jsonStr.replace(/,(\s*\n?\s*[}\]])/g, '$1');
		
		// Исправляем незакрытые объекты/массивы - пытаемся закрыть их
		// Считаем открывающие и закрывающие скобки
		const openBraces = (jsonStr.match(/\{/g) || []).length;
		const closeBraces = (jsonStr.match(/\}/g) || []).length;
		const openBrackets = (jsonStr.match(/\[/g) || []).length;
		const closeBrackets = (jsonStr.match(/\]/g) || []).length;
		
		// Добавляем недостающие закрывающие скобки
		if (openBraces > closeBraces) {
			jsonStr += '}'.repeat(openBraces - closeBraces);
		}
		if (openBrackets > closeBrackets) {
			jsonStr += ']'.repeat(openBrackets - closeBrackets);
		}
		
		return jsonStr;
	}

	/**
	 * Извлекает указанные страницы из PDF в отдельный временный файл
	 */
	private async extractPdfPages(filePath: string, startPage: number, endPage: number): Promise<string> {
		try {
			const { execFile } = await import("child_process");
			const { promisify } = await import("util");
			const execFileAsync = promisify(execFile);
			const os = await import("os");
			const path = await import("path");

			const tempOutputPath = path.join(os.tmpdir(), `pdf_chunk_${Date.now()}_${startPage}-${endPage}.pdf`);
			const tempOutputPathNormalized = tempOutputPath.replace(/\\/g, "/");
			const filePathNormalized = filePath.replace(/\\/g, "/");

			const pythonScript = `
import sys
import os
try:
    from PyPDF2 import PdfWriter, PdfReader
    
    input_path = r"${filePathNormalized}"
    output_path = r"${tempOutputPathNormalized}"
    
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    # Извлекаем страницы (индексация с 0, но пользователь указывает с 1)
    start_idx = ${startPage - 1}
    end_idx = min(${endPage}, len(reader.pages))
    
    for page_num in range(start_idx, end_idx):
        writer.add_page(reader.pages[page_num])
    
    with open(output_path, "wb") as output_file:
        writer.write(output_file)
    
    print(output_path)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`;

			const tempScriptPath = path.join(process.cwd(), "temp_extract_pages.py");
			fs.writeFileSync(tempScriptPath, pythonScript);

			const { stdout, stderr } = await execFileAsync("python", [tempScriptPath]);
			fs.unlinkSync(tempScriptPath);

			if (stderr && stderr.trim()) {
				console.warn(`⚠️ Предупреждение при извлечении страниц: ${stderr.trim()}`);
			}

			const extractedFilePath = stdout.trim();
			if (!extractedFilePath || extractedFilePath.startsWith("ERROR") || !fs.existsSync(extractedFilePath)) {
				throw new Error(`Не удалось извлечь страницы из PDF: ${extractedFilePath || stderr || "неизвестная ошибка"}`);
			}

			return extractedFilePath;
		} catch (error) {
			console.warn(`⚠️ Не удалось извлечь страницы, используем весь файл: ${error.message}`);
			// В случае ошибки возвращаем оригинальный файл
			return filePath;
		}
	}

	/**
	 * Отправляет часть PDF в DeepSeek API
	 */
	private async parseChunkWithDeepSeek(
		filePath: string,
		chunk: { start: number; end: number },
		template: any,
		isFirstChunk: boolean,
		isLastChunk: boolean,
		engine: string // Движок передается извне
	): Promise<any> {
		if (!this.API_KEY) {
			throw new Error("API ключ не задан в переменных окружения (ROUTERAI_API_KEY или OPENROUTER_API_KEY)");
		}

		// Извлекаем только нужные страницы в отдельный файл
		let chunkFilePath: string;
		let shouldDeleteChunk = false;
		
		try {
			chunkFilePath = await this.extractPdfPages(filePath, chunk.start, chunk.end);
			shouldDeleteChunk = chunkFilePath !== filePath; // Удаляем только если создали новый файл
		} catch (error) {
			console.warn(`⚠️ Не удалось извлечь страницы, используем весь файл: ${error.message}`);
			chunkFilePath = filePath;
		}

		// Читаем файл (или извлеченные страницы) в base64
		const fileBuffer = fs.readFileSync(chunkFilePath);
		const base64 = fileBuffer.toString("base64");
		
		// Удаляем временный файл сразу после чтения (до отправки в API)
		if (shouldDeleteChunk && chunkFilePath !== filePath) {
			try {
				fs.unlinkSync(chunkFilePath);
			} catch (e) {
				// Игнорируем ошибки удаления
			}
		}

		const systemPrompt = this.createSystemPrompt(template);
		const userPrompt = this.createUserPrompt(chunk, isFirstChunk, isLastChunk);

		// Проверяем размер системного промпта
		if (systemPrompt.length > 100000) {
			console.warn(`⚠️ Системный промпт очень большой (${systemPrompt.length} символов). Это может вызвать проблемы.`);
		}

		const payload = {
			model: this.DEEPSEEK_MODEL,
			messages: [
				{ role: "system", content: systemPrompt },
				{
					role: "user",
					content: [
						{ type: "text", text: userPrompt },
						{
							type: "file",
							file: {
								filename: path.basename(filePath),
								mime_type: "application/pdf",
								file_data: `data:application/pdf;base64,${base64}`,
							},
						},
					],
				},
			],
			temperature: 0.2,
			max_tokens: Math.min(50000, this.MAX_TOKENS - 50000), // Увеличено до 50k для больших ответов
			extra_body: {
					plugins: [
					{
						id: "file-parser",
						pdf: {
							engine: engine, // Используем определенный движок
							// pages не указываем, так как отправляем уже извлеченные страницы
						},
					},
				],
			},
		};

		// Retry логика
		let lastError: any = null;
		for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
			try {
				if (attempt > 1) {
					console.log(`🔄 Попытка ${attempt}/${this.MAX_RETRIES} для страниц ${chunk.start}-${chunk.end}...`);
					await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY * (attempt - 1)));
				} else {
					console.log(`📤 Отправляем страницы ${chunk.start}-${chunk.end} в DeepSeek...`);
				}

				const response = await firstValueFrom(
					this.httpService.post(
						`${this.API_BASE_URL}/chat/completions`,
						payload,
						{
							headers: {
								Authorization: `Bearer ${this.API_KEY}`,
								"Content-Type": "application/json",
								...(process.env.ROUTERAI_HTTP_REFERER || process.env.OPENROUTER_HTTP_REFERER) && {
									"HTTP-Referer": process.env.ROUTERAI_HTTP_REFERER || process.env.OPENROUTER_HTTP_REFERER,
								},
								...(process.env.ROUTERAI_X_TITLE || process.env.OPENROUTER_X_TITLE) && {
									"X-Title": process.env.ROUTERAI_X_TITLE || process.env.OPENROUTER_X_TITLE,
								},
							},
							timeout: 300000, // 5 минут на запрос
						}
					)
				);

				const content = response.data?.choices?.[0]?.message?.content?.trim();
				if (!content) {
					throw new Error("Пустой ответ от DeepSeek API");
				}

				// Пытаемся распарсить JSON из ответа
				let jsonStr = content
					.replace(/```json\s*/gi, "")
					.replace(/```\s*/g, "")
					.trim();

				// Пытаемся найти JSON объект или массив
				const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
				const jsonArrayMatch = jsonStr.match(/\[[\s\S]*\]/);
				
				if (jsonObjectMatch) {
					jsonStr = jsonObjectMatch[0];
				} else if (jsonArrayMatch) {
					jsonStr = jsonArrayMatch[0];
				}

				// Пытаемся исправить распространенные ошибки в JSON
				jsonStr = this.fixJsonString(jsonStr);
				
				// Дополнительная проверка: если все еще есть множественные закрывающие скобки, исправляем вручную
				if (jsonStr.includes('}}]') || jsonStr.includes('}}]}')) {
					console.warn(`⚠️ Обнаружены множественные закрывающие скобки в JSON, исправляем...`);
					// Исправляем все варианты: }}]}, }}]}, }}}], и т.д.
					jsonStr = jsonStr.replace(/\}\}\}+(\s*\])/g, '}$1');
					jsonStr = jsonStr.replace(/}}]/g, '}]');
				}
				
				// Проверяем, не обрезан ли JSON - если заканчивается на }] или ], добавляем закрывающую скобку
				jsonStr = jsonStr.trim();
				if (jsonStr.endsWith('}]') || jsonStr.endsWith(']')) {
					// Считаем открывающие и закрывающие скобки объектов
					const openBraces = (jsonStr.match(/\{/g) || []).length;
					const closeBraces = (jsonStr.match(/\}/g) || []).length;
					// Если не хватает закрывающих скобок объектов, добавляем
					if (openBraces > closeBraces) {
						jsonStr += '}'.repeat(openBraces - closeBraces);
						console.warn(`⚠️ JSON был обрезан, добавлено ${openBraces - closeBraces} закрывающих скобок`);
					}
				}

				let parsed: any;
				try {
					parsed = JSON.parse(jsonStr);
				} catch (parseError: any) {
					// Сохраняем проблемный ответ для отладки (полный, не обрезанный)
					const debugResponsePath = `debug-response-error-${chunk.start}-${chunk.end}.json`;
					const errorPosition = parseError.message.match(/position (\d+)/)?.[1];
					const position = errorPosition ? parseInt(errorPosition, 10) : null;
					
					// Сохраняем полный контент и JSON
					fs.writeFileSync(debugResponsePath, JSON.stringify({
						originalContent: content,
						extractedJson: jsonStr,
						error: parseError.message,
						position: errorPosition || "unknown",
						// Добавляем контекст вокруг ошибки
						contextAroundError: position && position < jsonStr.length 
							? jsonStr.substring(Math.max(0, position - 200), Math.min(jsonStr.length, position + 200))
							: null
					}, null, 2));
					
					// Также сохраняем raw JSON для ручного анализа
					const rawJsonPath = `debug-response-raw-${chunk.start}-${chunk.end}.json`;
					fs.writeFileSync(rawJsonPath, jsonStr, 'utf-8');
					
					console.error(`❌ Ошибка парсинга JSON. Ответ сохранен в ${debugResponsePath}`);
					console.error(`   Raw JSON сохранен в ${rawJsonPath}`);
					if (position) {
						console.error(`   Позиция ошибки: ${position}, контекст: ${jsonStr.substring(Math.max(0, position - 50), Math.min(jsonStr.length, position + 50))}`);
					}
					throw new Error(`Не удалось распарсить JSON ответ: ${parseError.message}`);
				}

				console.log(`✅ Страницы ${chunk.start}-${chunk.end} успешно обработаны`);

				return parsed;
			} catch (error) {
				lastError = error;
				const errorMessage = error.response?.data?.error || error.message || "Неизвестная ошибка";
				const statusCode = error.response?.status || "N/A";
				
				console.error(`❌ Попытка ${attempt}/${this.MAX_RETRIES} не удалась для страниц ${chunk.start}-${chunk.end}:`);
				console.error(`   Статус: ${statusCode}, Ошибка: ${errorMessage}`);
				
				// Если это ошибка парсинга файла (503/400), не повторяем
				if (statusCode === 503 || statusCode === 400) {
					const errorText = JSON.stringify(error.response?.data || {}).toLowerCase();
					if (errorText.includes("failed to parse") || errorText.includes("parse")) {
						console.error(`⚠️ Файл не может быть распарсен API. Возможно, файл слишком большой или поврежден.`);
						throw new Error(`Файл не может быть обработан API: ${errorMessage}`);
					}
				}
				
				// Если это последняя попытка, выбрасываем ошибку
				if (attempt === this.MAX_RETRIES) {
					throw error;
				}
			}
		}
		
		// Не должно сюда дойти, но на всякий случай
		throw lastError || new Error("Неизвестная ошибка");
	}

	/**
	 * Объединяет результаты из разных чанков в единый массив отчетов
	 */
	private mergeChunkResults(chunkResults: any[]): any[] {
		if (chunkResults.length === 0) {
			return [];
		}

		// Если первый чанк вернул массив отчетов, используем его структуру
		const firstResult = chunkResults[0];
		const isArray = Array.isArray(firstResult);

		if (isArray) {
			// Если каждый чанк возвращает массив отчетов, объединяем их
			const allReports: any[] = [];
			const reportMap = new Map<string, any>(); // Ключ: регистрационный номер

			for (const chunkResult of chunkResults) {
				if (Array.isArray(chunkResult)) {
					for (const report of chunkResult) {
      const regNumber = report?.["Шапка"]?.["Регистрационный №"];
						
						if (regNumber) {
							// Если отчет с таким номером уже есть, объединяем данные
							if (reportMap.has(regNumber)) {
								const existing = reportMap.get(regNumber);
								// Глубокое слияние объектов
								this.deepMerge(existing, report);
							} else {
								reportMap.set(regNumber, JSON.parse(JSON.stringify(report))); // Deep copy
							}
						} else {
							// Если нет регистрационного номера, добавляем как отдельный отчет
							allReports.push(report);
						}
					}
				} else if (chunkResult) {
					// Если чанк вернул один объект, обрабатываем его
     const regNumber = chunkResult?.["Шапка"]?.["Регистрационный №"];
					
					if (regNumber) {
						if (reportMap.has(regNumber)) {
							this.deepMerge(reportMap.get(regNumber), chunkResult);
						} else {
							reportMap.set(regNumber, JSON.parse(JSON.stringify(chunkResult)));
						}
					} else {
						allReports.push(chunkResult);
					}
				}
			}

			// Добавляем все отчеты из map
			allReports.push(...Array.from(reportMap.values()));

			return allReports.length > 0 ? allReports : [firstResult];
		} else {
			// Если результат - один объект, пытаемся объединить данные из разных чанков
			const merged = JSON.parse(JSON.stringify(firstResult)); // Deep copy первого результата

			for (let i = 1; i < chunkResults.length; i++) {
				this.deepMerge(merged, chunkResults[i]);
			}

			return [merged];
		}
	}

	/**
	 * Глубокое слияние двух объектов (объединяет данные, не перезаписывая существующие)
	 */
	private deepMerge(target: any, source: any): void {
		if (!source || typeof source !== "object" || Array.isArray(source)) {
			return;
		}

		for (const key in source) {
			if (source.hasOwnProperty(key)) {
				const sourceValue = source[key];
				const targetValue = target[key];

				if (sourceValue === null || sourceValue === undefined || sourceValue === "" || sourceValue === 0) {
					// Пропускаем пустые значения
					continue;
				}

				if (targetValue === null || targetValue === undefined || targetValue === "" || targetValue === 0) {
					// Если в target пустое значение, заменяем на source
					target[key] = JSON.parse(JSON.stringify(sourceValue)); // Deep copy
				} else if (typeof sourceValue === "object" && !Array.isArray(sourceValue) && typeof targetValue === "object" && !Array.isArray(targetValue)) {
					// Рекурсивно объединяем вложенные объекты
					this.deepMerge(targetValue, sourceValue);
				} else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
					// Для массивов добавляем новые элементы
					for (const item of sourceValue) {
						if (item && !targetValue.some((existing: any) => JSON.stringify(existing) === JSON.stringify(item))) {
							targetValue.push(JSON.parse(JSON.stringify(item)));
						}
					}
				}
			}
		}
	}

	/**
	 * Основной метод для парсинга PDF через DeepSeek
	 * 
	 * @param filePath - путь к PDF файлу
	 * @returns массив отчетов в формате template.json
	 */
	async parsePdfWithDeepSeek(filePath: string): Promise<any[]> {
		if (!this.API_KEY) {
			throw new Error("API ключ не задан. Установите переменную окружения ROUTERAI_API_KEY или OPENROUTER_API_KEY.");
		}

		if (!fs.existsSync(filePath)) {
			throw new Error(`Файл не найден: ${filePath}`);
		}

		try {
			console.log(`🚀 Начинаем парсинг PDF через DeepSeek: ${filePath}`);

			// 1. Проверяем размер файла
			const fileStats = fs.statSync(filePath);
			const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
			console.log(`📦 Размер файла: ${fileSizeMB} МБ`);
			
			if (fileStats.size > 100 * 1024 * 1024) {
				console.warn(`⚠️ Файл очень большой (${fileSizeMB} МБ). Обработка может занять много времени.`);
			}
			
			// 2. Определяем количество страниц
			const totalPages = await this.getPdfPageCount(filePath);
			console.log(`📄 Всего страниц в документе: ${totalPages}`);

			// 3. Разбиваем на чанки
			const chunks = this.getPageChunks(totalPages);
			console.log(`📦 Разбито на ${chunks.length} частей по ${this.PAGES_PER_CHUNK} страниц`);

			// 4. Автоматически определяем тип PDF и выбираем движок
			console.log(`🔍 Определяем тип PDF...`);
			const pdfEngine = await this.detectPdfEngine(filePath);
			console.log(`✅ Выбран движок: ${pdfEngine} (${pdfEngine === "pdf-text" ? "текстовый PDF" : "отсканированный PDF"})`);

			// 5. Загружаем шаблон
			const template = this.loadTemplate();

			// 6. Обрабатываем каждый чанк
			const chunkResults: any[] = [];
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const isFirstChunk = i === 0;
				const isLastChunk = i === chunks.length - 1;

				console.log(`\n📋 Обработка части ${i + 1}/${chunks.length} (страницы ${chunk.start}-${chunk.end})...`);

				try {
					const result = await this.parseChunkWithDeepSeek(filePath, chunk, template, isFirstChunk, isLastChunk, pdfEngine);
					chunkResults.push(result);

					// Небольшая задержка между запросами, чтобы не перегружать API
					if (i < chunks.length - 1) {
						await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 секунда задержка
					}
				} catch (error) {
					console.error(`❌ Критическая ошибка при обработке части ${i + 1}:`, error.message);
					// Продолжаем обработку остальных частей, но логируем ошибку
					// Можно добавить счетчик ошибок и остановить обработку при слишком большом количестве
				}
			}

			// 6. Объединяем результаты
			console.log(`\n🔗 Объединяем результаты из ${chunkResults.length} частей...`);
			const mergedReports = this.mergeChunkResults(chunkResults);

			console.log(`✅ Парсинг завершен. Получено отчетов: ${mergedReports.length}`);
			return mergedReports;
		} catch (error) {
			console.error("❌ Критическая ошибка при парсинге через DeepSeek:", error);
			throw error;
		}
	}
}
