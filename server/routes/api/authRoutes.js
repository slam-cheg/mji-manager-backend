import crypto from "crypto";
import { dataBase } from "../../../server.js";
import { exchangeCodeForProfile, isExpertHubNetworkError } from "../../auth/expertHub.js";
import { isAllowedOAuthRedirectUri, setAuthCookie, clearAuthCookie } from "../../auth/authCookie.js";
import { createSessionHash, signToken, verifyToken, extractBearerToken } from "../../auth/jwt.js";
import { hashSessionToken, verifySessionToken, hashPassword } from "../../auth/sessionToken.js";
import { mapExpertHubRolesToIsAdmin } from "../../auth/roles.js";
import { getUserDataDB } from "../../dataBase/getUserDataDB.js";
import { AUTH_COOKIE_NAME } from "../../auth/authCookie.js";

async function issueSession(user, res) {
  const sessionHash = createSessionHash();
  const accessToken = signToken({
    sub: user.login,
    fio: user.fio || "",
    isAdmin: Boolean(user.isadmin ?? user.isAdmin),
    sessionHash,
  });

  const sessionTokenHash = await hashSessionToken(accessToken);
  await dataBase.query(
    `UPDATE "users" SET "session_token_hash" = $1 WHERE "login" = $2`,
    [sessionTokenHash, user.login]
  );

  setAuthCookie(res, accessToken);
  return accessToken;
}

async function upsertUserFromProfile(profile) {
  const email = profile.email?.trim()?.toLowerCase();
  const fio = profile.fullName || profile.name || profile.full_name || email;
  const hubIsAdmin = mapExpertHubRolesToIsAdmin(profile.roles || profile.role || profile.groups);

  let user = await getUserDataDB(email);
  if (!user) {
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(randomPassword);
    const key = crypto.randomBytes(8).toString("hex");
    await dataBase.query(
      `INSERT INTO "users" ("login", "password", "usid", "key", "activated", "fio", "isadmin", "hub_sub")
       VALUES ($1, $2, 0, $3, true, $4, $5, $6)`,
      [email, passwordHash, key, fio, hubIsAdmin, profile.sub || null]
    );
    user = await getUserDataDB(email);
  } else {
    const isAdmin = hubIsAdmin || Boolean(user.isadmin ?? user.isAdmin);
    await dataBase.query(
      `UPDATE "users" SET "fio" = $1, "activated" = true, "isadmin" = $2, "hub_sub" = COALESCE($3, "hub_sub")
       WHERE "login" = $4`,
      [fio, isAdmin, profile.sub || null, email]
    );
    user = await getUserDataDB(email);
  }
  return user;
}

export async function ExpertHubCallback(req, res) {
  const { code, redirect_uri } = req.body || {};
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: "code and redirect_uri are required" });
  }
  if (!isAllowedOAuthRedirectUri(redirect_uri)) {
    return res.status(400).json({ error: "Invalid redirect_uri" });
  }

  try {
    const profile = await exchangeCodeForProfile(code, redirect_uri);
    if (!profile.email) {
      return res.status(400).json({ error: "ExpertHub profile missing email" });
    }

    const user = await upsertUserFromProfile(profile);
    const accessToken = await issueSession(user, res);

    return res.json({
      accessToken,
      user: {
        login: user.login,
        fio: user.fio || "",
        isAdmin: Boolean(user.isadmin ?? user.isAdmin),
      },
    });
  } catch (err) {
    if (isExpertHubNetworkError(err)) {
      return res.status(503).json({ error: "ExpertHub temporarily unavailable" });
    }
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Authentication failed" });
  }
}

export async function AuthRelogin(req, res) {
  const token =
    req.body?.accessToken?.trim() ||
    req.cookies?.[AUTH_COOKIE_NAME] ||
    extractBearerToken(req.headers?.authorization);

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = verifyToken(token);
    const user = await getUserDataDB(payload.sub);
    if (!user || !user.activated) {
      return res.status(401).json({ error: "User not found" });
    }

    const valid = await verifySessionToken(user.session_token_hash, token);
    if (!valid) {
      return res.status(401).json({ error: "Session expired" });
    }

    return res.json({
      accessToken: token,
      user: {
        login: user.login,
        fio: user.fio || "",
        isAdmin: Boolean(user.isadmin ?? user.isAdmin),
      },
    });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function AuthLogout(req, res) {
  const token =
    req.body?.accessToken?.trim() ||
    req.cookies?.[AUTH_COOKIE_NAME] ||
    extractBearerToken(req.headers?.authorization);

  clearAuthCookie(res);

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.sub) {
        await dataBase.query(`UPDATE "users" SET "session_token_hash" = NULL WHERE "login" = $1`, [payload.sub]);
      }
    } catch {
      // ignore invalid token on logout
    }
  }

  return res.status(204).send();
}

export async function AuthMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({
    login: req.user.login,
    fio: req.user.fio,
    isAdmin: req.user.isAdmin,
  });
}

export function DeprecatedAuth(req, res) {
  return res.status(410).json({
    error: "This authentication method is deprecated. Use ExpertHub SSO.",
  });
}

/** Landing page после OAuth redirect для расширения (dev: localhost). */
export function ExpertHubExtensionCallbackPage(_req, res) {
  return res
    .type("html")
    .send(
      `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>МЖИ Менеджер</title></head>` +
        `<body style="font-family:sans-serif;padding:2rem;text-align:center">` +
        `<p>Авторизация через ExpertHub прошла успешно.</p>` +
        `<p>Можно закрыть эту вкладку и вернуться в расширение.</p></body></html>`
    );
}
