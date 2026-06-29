import { fakeSelectsLayout } from "../../appData/fakeSelectsLayout.js";
import { buildMjiPopupLayout } from "../../appData/mjiPopupLayout.js";
import { mjiPopupStyles } from "../../appData/mjiPopupStyles.js";
import {
  getDefects,
  getFunctionsDocument,
  getRates,
  getRepresentatives,
} from "../../dataBase/appData.service.js";
import { timeStamp } from "../../utils/timeStamp.js";

export const GetAppData = async (req, res) => {
  if (!req.body) {
    res.sendStatus(400).end();
    return;
  }

  try {
    const appData = await buildAppData();
    console.log(`appData отдан на фронт ${timeStamp()}`);
    res.send(appData).end();
  } catch (error) {
    console.error("GetAppData error:", error);
    res.status(500).send({ error: "Failed to load app data" }).end();
  }
};

async function buildAppData() {
  const [defectsData, ratesData, representativesData, functions] = await Promise.all([
    getDefects(),
    getRates(),
    getRepresentatives(),
    getFunctionsDocument(),
  ]);

  const { names: _names, ...functionFlags } = functions;
  const appLayout = {
    popupLayout: buildMjiPopupLayout(functionFlags),
    fakeSelectList: fakeSelectsLayout,
    stylesLayout: mjiPopupStyles,
  };

  const dataStatus = {
    defectsData: `${defectsData ? "OK" : "No data"}`,
    ratesData: `${ratesData ? "OK" : "No data"}`,
    representativesData: `${representativesData ? "OK" : "No data"}`,
    appLayout: `${appLayout ? "OK" : "No data"}`,
    functions: `${functions ? "OK" : "No data"}`,
  };

  return { defectsData, appLayout, ratesData, representativesData, dataStatus, functions };
}
