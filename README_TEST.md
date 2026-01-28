# Тестирование DeepSeek парсера

## Быстрый старт

### 1. Установите зависимости (если еще не установлены)

```bash
npm install
```

### 2. Убедитесь, что в `.env` файле есть:

```env
# Основные переменные (приоритет у ROUTERAI_*)
ROUTERAI_API_KEY=your_api_key_here
ROUTERAI_API_URL=https://routerai.ru/api/v1
ROUTERAI_DEEPSEEK_MODEL=deepseek/deepseek-v3.2
ROUTERAI_DEEPSEEK_ENGINE=mistral-ocr

# Или альтернативные (OpenRouter):
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_API_BASE_URL=https://openrouter.ai/api/v1
DEEPSEEK_MODEL=deepseek/deepseek-v3.2
DEEPSEEK_PDF_ENGINE=mistral-ocr
```

### 3. Запустите тест

```bash
npx ts-node test-deepseek-parser.ts uploads/Головинский\ 2023.pdf
```

Или для Windows PowerShell:

```powershell
npx ts-node test-deepseek-parser.ts "uploads\Головинский 2023.pdf"
```

## Что делает скрипт

1. ✅ Проверяет наличие API ключа
2. ✅ Определяет количество страниц в PDF
3. ✅ Разбивает документ на части по 10 страниц
4. ✅ Отправляет каждую часть в DeepSeek API
5. ✅ Объединяет результаты
6. ✅ Сохраняет результат в `deepseek-parser-result.json`

## Пример вывода

```
✅ API ключ найден
📋 Модель: deepseek/deepseek-v3.2
🔧 OCR движок: mistral-ocr

🚀 Начинаем парсинг PDF через DeepSeek: uploads/Головинский 2023.pdf

📄 Всего страниц в документе: 50

📦 Разбито на 5 частей по 10 страниц

📋 Обработка части 1/5 (страницы 1-10)...

📤 Отправляем страницы 1-10 в DeepSeek...
✅ Страницы 1-10 успешно обработаны
⏳ Задержка 1 секунда перед следующим запросом...

...

🔗 Объединяем результаты из 5 частей...

✅ Парсинг завершен. Получено отчетов: 1

💾 Результат сохранен в: deepseek-parser-result.json

📊 Статистика:
   - Отчетов: 1
   - Компания: ООО «СпецСтройЭксперт»
   - Рег. номер: С-23-0003239
```

## Устранение проблем

### Ошибка: "API ключ не найден"

Проверьте `.env` файл и убедитесь, что ключ указан правильно:
- `ROUTERAI_API_KEY=your_key` (приоритет)
- или `OPENROUTER_API_KEY=your_key`

### Ошибка: "Файл не найден"

Убедитесь, что путь к файлу указан правильно. Используйте абсолютный путь или путь относительно корня проекта.

### Ошибка: "Не удалось определить количество страниц"

Убедитесь, что установлены Python библиотеки:
```bash
pip install pdfplumber PyPDF2
```

### Ошибка при парсинге JSON

DeepSeek иногда возвращает JSON с небольшими ошибками. Скрипт пытается их исправить автоматически, но если проблема сохраняется, проверьте логи.

## Результат

Результат сохраняется в файл `deepseek-parser-result.json` в корне проекта в формате массива отчетов согласно `template.json`.
