import { saveDefects } from "../../dataBase/appData.service.js";
import { writeLog } from "../../dataBase/writeLog.js";
import { timeStamp } from "../../utils/timeStamp.js";

export const SaveDefects = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  const defectsChanging = {
    status: `Список дефектов не изменен. Ошибка.`,
    boolean: false,
    login: req.body.login,
    timeStamp: timeStamp(),
  };

  try {
    await saveDefects(req.body.defects ?? {});

    defectsChanging.status = `Список дефектов успешно изменен.`;
    defectsChanging.boolean = true;

    writeLog(defectsChanging, "Change defects list");
    res.send({ Success: true }).end();
  } catch (error) {
    console.error("SaveDefects error:", error);
    writeLog(defectsChanging, "Change defects list");
    res.status(500).send({ Success: false }).end();
  }
};
