const VERSION_RE = /^\d+\.\d+\.\d+\.\d+$/;

export function extractVersionFromExe(buffer) {
  if (!buffer || buffer.length < 64) return null;
  if (buffer[0] !== 0x4d || buffer[1] !== 0x5a) return null;
  return (
    readVersionAfterUtf16Key(buffer, "FileVersion") ??
    readVersionAfterUtf16Key(buffer, "ProductVersion")
  );
}

function readVersionAfterUtf16Key(buffer, key) {
  const keyBuf = Buffer.from(`${key}\0`, "utf16le");
  let searchFrom = 0;
  while (searchFrom < buffer.length) {
    const idx = buffer.indexOf(keyBuf, searchFrom);
    if (idx < 0) break;
    searchFrom = idx + keyBuf.length;
    let offset = (idx + keyBuf.length + 3) & ~3;
    const direct = readUtf16NullTerminated(buffer, offset);
    if (direct && VERSION_RE.test(direct)) return direct;
    const sliceEnd = Math.min(offset + 512, buffer.length);
    const found = scanUtf16Version(buffer.subarray(offset, sliceEnd));
    if (found) return found;
  }
  return null;
}

function readUtf16NullTerminated(buffer, offset) {
  if (offset < 0 || offset >= buffer.length) return null;
  const chars = [];
  for (let i = offset; i + 1 < buffer.length; i += 2) {
    const code = buffer.readUInt16LE(i);
    if (code === 0) break;
    if (code < 0x20 || code > 0x7e) return null;
    chars.push(String.fromCharCode(code));
  }
  const value = chars.join("").trim();
  return value || null;
}

function scanUtf16Version(buffer) {
  for (let i = 0; i + 7 < buffer.length; i += 2) {
    const value = readUtf16NullTerminated(buffer, i);
    if (!value) continue;
    if (VERSION_RE.test(value)) return value;
    if (value.length > 24) i += value.length * 2;
  }
  return null;
}
