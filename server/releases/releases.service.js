import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { basename, dirname, isAbsolute, join, resolve } from "path";
import { dataBase } from "../../server.js";
import { extractVersionFromExe } from "../common/exe-version.util.js";
import { isValidInstallerBuffer, isValidInstallerFile } from "../common/installer.util.js";
import { versionToCode } from "../common/version.util.js";

function getLegacyInstallerPath() {
  return process.env.INSTALLER_FILE_PATH?.trim();
}

function getReleasesDir() {
  const configured = process.env.INSTALLER_RELEASES_DIR?.trim();
  if (configured) return configured;
  const legacy = getLegacyInstallerPath();
  if (legacy) return join(dirname(legacy), "releases");
  return join(process.cwd(), "installer", "releases");
}

function resolveReleaseFilePath(storedPath) {
  const trimmed = storedPath?.trim();
  if (!trimmed) return trimmed;
  if (isValidInstallerFile(trimmed)) return trimmed;
  const byFilename = join(getReleasesDir(), basename(trimmed));
  if (isValidInstallerFile(byFilename)) return byFilename;
  try {
    const resolved = resolveInputPath(trimmed);
    if (isValidInstallerFile(resolved)) return resolved;
  } catch {
    // ignore
  }
  return trimmed;
}

function resolveInputPath(inputPath) {
  const trimmed = inputPath.trim();
  if (!trimmed) throw new Error("filePath is required");
  if (isAbsolute(trimmed)) return trimmed;
  const legacy = getLegacyInstallerPath();
  if (legacy) return resolve(dirname(legacy), trimmed);
  return resolve(process.cwd(), trimmed);
}

function buildStoredFilename(originalName, appVersion, distVersion) {
  const safeVersion = appVersion.replace(/[^\d.]+/g, "_");
  const ext = basename(originalName).includes(".")
    ? basename(originalName).slice(basename(originalName).lastIndexOf("."))
    : ".exe";
  return `MJI-manager-Setup-${safeVersion}-d${distVersion}${ext}`;
}

function guessVersionFromFilename(name) {
  const match = name.match(/(\d+\.\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

function syncLegacyInstallerCopy(sourcePath) {
  const legacy = getLegacyInstallerPath();
  if (!legacy || !existsSync(sourcePath)) return;
  try {
    mkdirSync(dirname(legacy), { recursive: true });
    copyFileSync(sourcePath, legacy);
  } catch {
    // best-effort
  }
}

function mapRow(row) {
  return {
    id: row.id,
    appVersion: row.app_version,
    versionCode: row.version_code,
    distVersion: row.dist_version,
    filename: row.filename,
    filePath: row.file_path,
    isActive: row.is_active,
    uploadedByEmail: row.uploaded_by_email,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

async function nextDistVersion() {
  const result = await dataBase.query(`SELECT MAX(dist_version) AS max FROM releases`);
  const current = Number(result.rows[0]?.max ?? 0);
  return Number.isFinite(current) ? current + 1 : 1;
}

async function getActiveRelease() {
  const result = await dataBase.query(`SELECT * FROM releases WHERE is_active = true LIMIT 1`);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function getReleaseMeta() {
  const active = await getActiveRelease();
  if (!active) {
    const fallbackPath = getLegacyInstallerPath();
    return {
      appVersion: null,
      versionCode: null,
      distVersion: null,
      updatedAt: null,
      downloadAvailable: isValidInstallerFile(fallbackPath),
    };
  }
  return {
    appVersion: active.appVersion,
    versionCode: active.versionCode,
    distVersion: active.distVersion,
    updatedAt: active.createdAt ? new Date(active.createdAt).toISOString() : null,
    downloadAvailable: isValidInstallerFile(resolveReleaseFilePath(active.filePath)),
  };
}

export async function resolveInstallerPath() {
  const active = await getActiveRelease();
  if (active) {
    const resolved = resolveReleaseFilePath(active.filePath);
    if (isValidInstallerFile(resolved)) return resolved;
  }
  const legacy = getLegacyInstallerPath();
  return isValidInstallerFile(legacy) ? legacy : null;
}

export async function listAllReleases() {
  const result = await dataBase.query(
    `SELECT * FROM releases ORDER BY dist_version DESC, created_at DESC`
  );
  return result.rows.map(mapRow);
}

async function activateReleaseById(id) {
  const find = await dataBase.query(`SELECT * FROM releases WHERE id = $1`, [id]);
  if (find.rowCount === 0) throw Object.assign(new Error("Release not found"), { status: 404 });

  const release = find.rows[0];
  const resolvedPath = resolveReleaseFilePath(release.file_path);
  if (!isValidInstallerFile(resolvedPath)) {
    throw Object.assign(new Error("Installer file missing on disk"), { status: 400 });
  }

  await dataBase.query("BEGIN");
  try {
    await dataBase.query(`UPDATE releases SET is_active = false WHERE is_active = true`);
    await dataBase.query(`UPDATE releases SET is_active = true, file_path = $1 WHERE id = $2`, [
      resolvedPath,
      id,
    ]);
    await dataBase.query("COMMIT");
  } catch (err) {
    await dataBase.query("ROLLBACK");
    throw err;
  }

  syncLegacyInstallerCopy(resolvedPath);
  const updated = await dataBase.query(`SELECT * FROM releases WHERE id = $1`, [id]);
  return mapRow(updated.rows[0]);
}

export async function uploadRelease({ buffer, originalName, appVersion, uploadedByEmail, activate = true }) {
  if (!buffer?.length) throw Object.assign(new Error("Installer file is required"), { status: 400 });
  if (!isValidInstallerBuffer(buffer)) {
    throw Object.assign(new Error("File is not a valid Windows PE installer"), { status: 400 });
  }

  const resolvedVersion =
    appVersion?.trim() ||
    extractVersionFromExe(buffer) ||
    guessVersionFromFilename(originalName) ||
    "0.0.0.0";
  const versionCode = versionToCode(resolvedVersion);
  const distVersion = await nextDistVersion();
  const filename = buildStoredFilename(originalName, resolvedVersion, distVersion);
  const filePath = join(getReleasesDir(), filename);

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);

  const insert = await dataBase.query(
    `INSERT INTO releases (app_version, version_code, dist_version, filename, file_path, is_active, uploaded_by_email)
     VALUES ($1, $2, $3, $4, $5, false, $6) RETURNING *`,
    [resolvedVersion, versionCode, distVersion, filename, filePath, uploadedByEmail || null]
  );

  const saved = mapRow(insert.rows[0]);
  if (activate) return activateReleaseById(saved.id);
  return saved;
}

export async function activateRelease(id) {
  return activateReleaseById(id);
}

export async function streamActiveInstaller(res) {
  const installerPath = await resolveInstallerPath();
  if (!installerPath) {
    return res.status(404).json({ error: "Installer not available" });
  }
  const filename = basename(installerPath);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  createReadStream(installerPath).pipe(res);
}
