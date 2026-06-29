import { verifyToken, extractBearerToken } from "./jwt.js";
import { AUTH_COOKIE_NAME } from "./authCookie.js";
import { verifySessionToken } from "./sessionToken.js";
import { getUserDataDB } from "../dataBase/getUserDataDB.js";

function resolveToken(req) {
  const bearer = extractBearerToken(req.headers?.authorization);
  if (bearer) return bearer;
  const cookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookie === "string" && cookie.trim()) return cookie.trim();
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = resolveToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = verifyToken(token);
    const login = payload.sub;
    if (!login) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await getUserDataDB(login);
    if (!user || !user.activated) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    if (payload.sessionHash) {
      const valid = await verifySessionToken(user.session_token_hash, token);
      if (!valid) {
        return res.status(401).json({ error: "Session expired" });
      }
    }

    req.user = {
      login: user.login,
      fio: user.fio || payload.fio || "",
      isAdmin: Boolean(user.isadmin ?? user.isAdmin ?? payload.isAdmin),
    };
    req.authToken = token;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function optionalAuth(req, res, next) {
  const token = resolveToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, next);
}
