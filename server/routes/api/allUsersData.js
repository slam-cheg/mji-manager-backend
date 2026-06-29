import { getAllUsersDB } from "../../dataBase/getAllUsersDB.js";
import { getFunctionsDocument } from "../../dataBase/appData.service.js";
import { timeStamp } from "../../utils/timeStamp.js";
import { writeLog } from "../../dataBase/writeLog.js";

export const AllUsersData = async (req, res) => {
  const login = req.body.login;
  const functionsList = await getFunctionsDocument();
  const result = {
    staffList: "",
    functionsList,
  };
  const getAdminInfo = {
    status: `Ошибка получения данных о правах пользователя.`,
    login,
    boolean: false,
    timeStamp: timeStamp(),
  };

  try {
    const staffList = await getAllUsersDB();
    if (!staffList) {
      writeLog(getAdminInfo, "getAdminInfo");
      res.send(result).end();
      return;
    }

    getAdminInfo.status = `Данные о правах пользователя успешно получены.`;
    getAdminInfo.boolean = true;
    writeLog(getAdminInfo, "getAdminInfo");

    result.staffList = staffList;
    res.send(result).end();
  } catch (error) {
    console.error("AllUsersData error:", error);
    writeLog(getAdminInfo, "getAdminInfo");
    res.status(500).send({ error: "Failed to load users data" }).end();
  }
};
