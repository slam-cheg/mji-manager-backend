import { saveRates } from "../../dataBase/appData.service.js";
import { writeLog } from "../../dataBase/writeLog.js";
import { timeStamp } from "../../utils/timeStamp.js";

export const SaveRates = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  const logEntry = {
    status: `Таблица оценок не изменена. Ошибка.`,
    boolean: false,
    login: req.body.login,
    timeStamp: timeStamp(),
  };

  try {
    await saveRates(req.body.rates ?? {});

    logEntry.status = `Таблица оценок успешно изменена.`;
    logEntry.boolean = true;

    writeLog(logEntry, "Change rates");
    res.send({ Success: true }).end();
  } catch (error) {
    console.error("SaveRates error:", error);
    writeLog(logEntry, "Change rates");
    res.status(500).send({ Success: false }).end();
  }
};
