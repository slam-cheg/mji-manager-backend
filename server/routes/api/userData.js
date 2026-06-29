import { getUserDataDB } from "../../dataBase/getUserDataDB.js";
import { timeStamp } from "../../utils/timeStamp.js";
import { writeLog } from "../../dataBase/writeLog.js";

export const UserData = (req, res) => {
	if (!req.body) {
		res.sendStatus(400);
	}
	const accountInfo = {
		fio: "",
		login: "",
		isAdmin: "",
		activated: false,
		timeStamp: timeStamp(),
	};

	const reqData = req.body;
	console.log(`Начат процесс получения данных об аккаунте ${reqData.login}. . . `);
	const resData = getUserDataDB(reqData.login);

	resData.then((resPromise) => {
		if (resPromise === undefined) {
			res.send(accountInfo).end();
		}

		accountInfo.fio = resPromise.fio;
		accountInfo.login = resPromise.login;
		accountInfo.isAdmin = resPromise.isadmin ?? resPromise.isAdmin;
		accountInfo.activated = resPromise.activated;

		writeLog(accountInfo, "getAccountInfo");
		res.send(accountInfo).end();
	});
};
