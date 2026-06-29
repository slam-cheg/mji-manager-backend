export function parseVersionParts(version) {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const digits = part.replace(/\D/g, "");
      return digits ? Number.parseInt(digits, 10) : 0;
    })
    .slice(0, 4);
}

export function versionToCode(version) {
  const parts = parseVersionParts(version);
  while (parts.length < 4) parts.push(0);
  const [major, minor, patch, build] = parts.slice(0, 4);
  return major * 1_000_000 + minor * 10_000 + patch * 100 + build;
}
