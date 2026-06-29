import { getAiSettings, saveAiSettings } from "../../dataBase/appData.service.js";
import { writeLog } from "../../dataBase/writeLog.js";
import { timeStamp } from "../../utils/timeStamp.js";

export async function GetAiSettings(req, res) {
  try {
    const settings = await getAiSettings();
    res.json(settings).end();
  } catch (error) {
    console.error("GetAiSettings error:", error);
    res.status(500).json({ error: "Failed to load AI settings" }).end();
  }
}

export async function UpdateAiSettings(req, res) {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  const logEntry = {
    status: "Настройки AI не изменены. Ошибка.",
    boolean: false,
    login: req.user?.login ?? null,
    timeStamp: timeStamp(),
  };

  try {
    const settings = {
      model: String(req.body.model ?? "").trim() || "deepseek/deepseek-v3.2",
      userPromptTemplate: String(req.body.userPromptTemplate ?? ""),
      rephraseDefectPrompt: String(req.body.rephraseDefectPrompt ?? ""),
    };

    await saveAiSettings(settings);

    logEntry.status = "Настройки AI успешно изменены.";
    logEntry.boolean = true;
    writeLog(logEntry, "Change AI settings");

    res.json({ success: true }).end();
  } catch (error) {
    console.error("UpdateAiSettings error:", error);
    writeLog(logEntry, "Change AI settings");
    res.status(500).json({ success: false, error: "Failed to save AI settings" }).end();
  }
}
