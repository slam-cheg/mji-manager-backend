import { dataBase } from "../../server.js";

async function getSingletonData(tableName) {
  const result = await dataBase.query(`SELECT data FROM ${tableName} WHERE id = 1`);
  if (result.rowCount === 0) return {};
  return result.rows[0].data ?? {};
}

async function saveSingletonData(tableName, data) {
  await dataBase.query(
    `INSERT INTO ${tableName} (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(data)]
  );
}

export async function getFunctionsFlags() {
  const result = await dataBase.query(`SELECT key, enabled FROM functions ORDER BY key`);
  return Object.fromEntries(result.rows.map((row) => [row.key, row.enabled]));
}

export async function getFunctionsDocument() {
  const result = await dataBase.query(`SELECT key, enabled, label FROM functions ORDER BY key`);
  const flags = {};
  const names = {};

  for (const row of result.rows) {
    flags[row.key] = row.enabled;
    if (row.label) names[row.key] = row.label;
  }

  return { ...flags, names };
}

export async function updateFunctionFlags(flags) {
  for (const [key, enabled] of Object.entries(flags)) {
    if (key === "names" || typeof enabled !== "boolean") continue;
    await dataBase.query(
      `UPDATE functions SET enabled = $1, updated_at = now() WHERE key = $2`,
      [enabled, key]
    );
  }
}

export async function getDefects() {
  return getSingletonData("defects");
}

export async function saveDefects(data) {
  await saveSingletonData("defects", data);
}

export async function getRates() {
  return getSingletonData("rates");
}

export async function saveRates(data) {
  await saveSingletonData("rates", data);
}

export async function getRepresentatives() {
  return getSingletonData("representatives");
}

export async function saveRepresentatives(data) {
  await saveSingletonData("representatives", data);
}

const AI_SETTINGS_DEFAULTS = {
  model: "deepseek/deepseek-v3.2",
  userPromptTemplate: "",
  rephraseDefectPrompt: "",
};

export async function getAiSettings() {
  const data = await getSingletonData("ai_settings");
  return {
    model: data.model ?? AI_SETTINGS_DEFAULTS.model,
    userPromptTemplate: data.userPromptTemplate ?? AI_SETTINGS_DEFAULTS.userPromptTemplate,
    rephraseDefectPrompt: data.rephraseDefectPrompt ?? AI_SETTINGS_DEFAULTS.rephraseDefectPrompt,
  };
}

export async function saveAiSettings(data) {
  await saveSingletonData("ai_settings", {
    model: String(data.model ?? AI_SETTINGS_DEFAULTS.model).trim() || AI_SETTINGS_DEFAULTS.model,
    userPromptTemplate: String(data.userPromptTemplate ?? ""),
    rephraseDefectPrompt: String(data.rephraseDefectPrompt ?? ""),
  });
}
