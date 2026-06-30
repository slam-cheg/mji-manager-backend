import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { dataBase } from "../../server.js";
import { seedAppDataIfEmpty } from "../dataBase/seedAppData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_MIGRATIONS = ["002_app_data_tables.sql", "003_ai_settings.sql"];

async function columnExists(table, column) {
  const { rows } = await dataBase.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const { rows } = await dataBase.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function indexExists(indexName) {
  const { rows } = await dataBase.query(
    `SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1
     LIMIT 1`,
    [indexName]
  );
  return rows.length > 0;
}

function ownershipHint(table) {
  return (
    `Database user lacks ownership of "${table}". ` +
    `Run as PostgreSQL superuser: ALTER TABLE "${table}" OWNER TO <app_user>;`
  );
}

async function ensureColumn(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`Migration skip: ${table}.${column} already exists`);
    return;
  }

  try {
    await dataBase.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`Migration applied: ${table}.${column}`);
  } catch (err) {
    if (err.code === "42501") {
      throw new Error(`${err.message}. ${ownershipHint(table)}`);
    }
    throw err;
  }
}

async function ensureIndex(name, sql) {
  if (await indexExists(name)) {
    console.log(`Migration skip: index ${name} already exists`);
    return;
  }

  try {
    await dataBase.query(sql);
    console.log(`Migration applied: index ${name}`);
  } catch (err) {
    if (err.code === "42501") {
      throw new Error(`${err.message}. ${ownershipHint("releases")}`);
    }
    throw err;
  }
}

async function applySsoAndReleasesMigration() {
  await ensureColumn("users", "session_token_hash", "TEXT");
  await ensureColumn("users", "hub_sub", "TEXT");
  await ensureColumn("users", "isadmin", "BOOLEAN DEFAULT false");

  if (!(await tableExists("releases"))) {
    await dataBase.query(`
      CREATE TABLE releases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_version VARCHAR(32) NOT NULL,
        version_code INTEGER NOT NULL,
        dist_version INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        is_active BOOLEAN DEFAULT false,
        uploaded_by_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log("Migration applied: releases table");
  } else {
    console.log("Migration skip: releases table already exists");
  }

  await ensureIndex(
    "idx_releases_one_active",
    "CREATE UNIQUE INDEX idx_releases_one_active ON releases (is_active) WHERE is_active = true"
  );
  await ensureIndex(
    "idx_releases_dist_version",
    "CREATE INDEX idx_releases_dist_version ON releases (dist_version DESC)"
  );

  console.log("Migrations applied: 001_sso_and_releases");
}

export async function runMigrations() {
  await applySsoAndReleasesMigration();

  for (const filename of SQL_MIGRATIONS) {
    const sqlPath = join(__dirname, filename);
    const sql = readFileSync(sqlPath, "utf8");
    await dataBase.query(sql);
    console.log(`Migrations applied: ${filename}`);
  }

  await seedAppDataIfEmpty();
}
