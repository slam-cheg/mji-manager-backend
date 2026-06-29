import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { dataBase } from "../../server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DATA_DIR = join(__dirname, "../appData");

function readJsonFile(filename) {
  return JSON.parse(readFileSync(join(APP_DATA_DIR, filename), "utf-8"));
}

async function tableIsEmpty(tableName) {
  const result = await dataBase.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return result.rows[0].count === 0;
}

async function seedFunctions() {
  if (!(await tableIsEmpty("functions"))) return;

  const raw = readJsonFile("activeFunctions.json");
  const { names = {}, ...flags } = raw;

  for (const [key, enabled] of Object.entries(flags)) {
    if (typeof enabled !== "boolean") continue;
    await dataBase.query(
      `INSERT INTO functions (key, enabled, label) VALUES ($1, $2, $3)`,
      [key, enabled, names[key] ?? null]
    );
  }
  console.log("Seeded functions from activeFunctions.json");
}

async function syncMissingFunctions() {
  const raw = readJsonFile("activeFunctions.json");
  const { names = {}, ...flags } = raw;

  for (const [key, enabled] of Object.entries(flags)) {
    if (typeof enabled !== "boolean") continue;
    await dataBase.query(
      `INSERT INTO functions (key, enabled, label) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [key, enabled, names[key] ?? null]
    );
  }
}

async function seedSingleton(tableName, filename) {
  if (!(await tableIsEmpty(tableName))) return;

  const data = readJsonFile(filename);
  await dataBase.query(`INSERT INTO ${tableName} (id, data) VALUES (1, $1::jsonb)`, [
    JSON.stringify(data),
  ]);
  console.log(`Seeded ${tableName} from ${filename}`);
}

export async function seedAppDataIfEmpty() {
  await seedFunctions();
  await syncMissingFunctions();
  await seedSingleton("defects", "defects.json");
  await seedSingleton("rates", "rates.json");
  await seedSingleton("representatives", "representatives.json");
  await seedSingleton("ai_settings", "aiSettings.json");
}
