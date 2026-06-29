import bcrypt from "bcrypt";

export async function hashSessionToken(token) {
  return bcrypt.hash(token, 10);
}

export async function verifySessionToken(stored, token) {
  if (!stored) return false;
  if (stored.startsWith("$2")) return bcrypt.compare(token, stored);
  return stored === token;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
