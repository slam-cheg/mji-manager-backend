import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.resolve(
  __dirname,
  "../../mji-manager-frontend/public/images/brand/logo.png",
);
const outPath = path.resolve(__dirname, "../server/appData/mjiPopupLogo.js");
const b64 = fs.readFileSync(logoPath).toString("base64");
fs.writeFileSync(
  outPath,
  `export const MJI_POPUP_LOGO_DATA_URL = "data:image/png;base64,${b64}";\n`,
);
console.log(`Wrote ${outPath} (${b64.length} base64 chars)`);
