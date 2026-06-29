import { updateFunctionFlags } from "../../dataBase/appData.service.js";
import { timeStamp } from "../../utils/timeStamp.js";
import { writeLog } from "../../dataBase/writeLog.js";

export const ActiveFunctions = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  const changingFunctions = {
    status: `Работа функций не изменена. Ошибка.`,
    boolean: false,
    timeStamp: timeStamp(),
  };

  try {
    await updateFunctionFlags(req.body.functions ?? {});

    changingFunctions.status = `Работа функций успешно изменена.`;
    changingFunctions.boolean = true;

    writeLog(changingFunctions, "changingFunctions");
    res.send({ Success: true }).end();
  } catch (error) {
    console.error("ActiveFunctions error:", error);
    writeLog(changingFunctions, "changingFunctions");
    res.status(500).send({ Success: false }).end();
  }
};
