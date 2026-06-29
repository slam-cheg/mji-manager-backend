import { buildMjiPopupLayout } from "../../appData/mjiPopupLayout.js";
import { getFunctionsFlags } from "../../dataBase/appData.service.js";
import { timeStamp } from "../../utils/timeStamp.js";
import { writeLog } from "../../dataBase/writeLog.js";

export const GetApp = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  try {
    const functions = await getFunctionsFlags();
    const getAppData = {
      status: `Верстка приложения отдана.`,
      boolean: true,
      layout: buildMjiPopupLayout(functions),
      timeStamp: timeStamp(),
    };

    writeLog(getAppData, "getApp");
    res.send(getAppData).end();
  } catch (error) {
    console.error("GetApp error:", error);
    res.status(500).send({ error: "Failed to load app layout" }).end();
  }
};
