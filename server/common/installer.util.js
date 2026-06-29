import { existsSync, readFileSync } from "fs";

const MIN_INSTALLER_BYTES = 1024;

export function isValidInstallerBuffer(buffer) {
  if (!buffer || buffer.length < MIN_INSTALLER_BYTES) return false;
  return buffer[0] === 0x4d && buffer[1] === 0x5a;
}

export function isValidInstallerFile(filePath) {
  if (!filePath || !existsSync(filePath)) return false;
  try {
    const header = readFileSync(filePath, { flag: "r" });
    return isValidInstallerBuffer(header);
  } catch {
    return false;
  }
}
