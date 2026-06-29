import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readExtensionVersion() {
  const candidates = [
    path.resolve(__dirname, "../../../mji-manager-extension/releases/version.json"),
    path.resolve(process.cwd(), "../mji-manager-extension/releases/version.json"),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const version = String(data?.version ?? "").trim();
      if (version) return version;
    } catch {
      // try next candidate
    }
  }

  return String(process.env.MJI_EXTENSION_VERSION ?? "3.2.0.8").trim();
}

export const MJI_POPUP_VERSION = readExtensionVersion();
