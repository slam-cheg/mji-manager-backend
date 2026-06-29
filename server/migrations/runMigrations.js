import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { dataBase } from "../../server.js";
import { seedAppDataIfEmpty } from "../dataBase/seedAppData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = ["001_sso_and_releases.sql", "002_app_data_tables.sql", "003_ai_settings.sql"];

export async function runMigrations() {
  for (const filename of MIGRATIONS) {
    const sqlPath = join(__dirname, filename);
    const sql = readFileSync(sqlPath, "utf8");
    await dataBase.query(sql);
    console.log(`Migrations applied: ${filename}`);
  }

  await seedAppDataIfEmpty();
}
