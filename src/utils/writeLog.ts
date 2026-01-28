import * as fs from "fs";
import * as path from "path";

export function writeLog(data: any, type: string) {
  const logsDir = path.join(__dirname, "../../logs");
  const logFile = path.join(logsDir, `${type}.log`);
  const logMessage = `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`;

  // ✅ Создаём директорию `logs/`, если её нет
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // ✅ Записываем лог в файл
  fs.appendFileSync(logFile, logMessage);
}
