import { saveRepresentatives } from "../../dataBase/appData.service.js";
import { writeLog } from "../../dataBase/writeLog.js";
import { timeStamp } from "../../utils/timeStamp.js";

export const SaveRepresentatives = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  const logEntry = {
    status: `Список подписантов не изменён. Ошибка.`,
    boolean: false,
    login: req.body.login,
    timeStamp: timeStamp(),
  };

  try {
    await saveRepresentatives(req.body.representatives ?? {});

    logEntry.status = `Список подписантов успешно изменён.`;
    logEntry.boolean = true;

    writeLog(logEntry, "Change representatives");
    res.send({ Success: true }).end();
  } catch (error) {
    console.error("SaveRepresentatives error:", error);
    writeLog(logEntry, "Change representatives");
    res.status(500).send({ Success: false }).end();
  }
};
