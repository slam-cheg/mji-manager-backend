import https from "https";
import http from "http";

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

const ipv4HttpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
});

export function getExpertHubFetchTimeoutMs() {
  const raw = process.env.EXPERT_HUB_FETCH_TIMEOUT_MS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_FETCH_TIMEOUT_MS;
}

export function getExpertHubSsoUrl() {
  return (process.env.EXPERT_HUB_SSO_URL || "https://hub.sste.ru").replace(/\/+$/, "");
}

function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    undefined
  );
}

function proxyAuthHeader(proxy) {
  if (!proxy.username) return undefined;
  const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password || "")}`;
  return { "Proxy-Authorization": `Basic ${Buffer.from(credentials).toString("base64")}` };
}

function readResponseBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    res.on("error", reject);
  });
}

function toResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

function httpsRequestDirect(urlStr, method, headers, body, timeoutMs) {
  const url = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        agent: ipv4HttpsAgent,
        family: 4,
        timeout: timeoutMs,
        headers: {
          ...headers,
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      async (res) => {
        try {
          const responseBody = await readResponseBody(res);
          resolve(toResponse(res.statusCode ?? 0, responseBody));
        } catch (err) {
          reject(err);
        }
      }
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("ExpertHub HTTPS request timed out"), { code: "ETIMEDOUT" })));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpsRequestViaProxy(urlStr, proxyUrl, method, headers, body, timeoutMs) {
  const target = new URL(urlStr);
  const proxy = new URL(proxyUrl);
  return new Promise((resolve, reject) => {
    const connectReq = http.request({
      hostname: proxy.hostname,
      port: proxy.port || 80,
      method: "CONNECT",
      path: `${target.hostname}:443`,
      family: 4,
      timeout: timeoutMs,
      headers: proxyAuthHeader(proxy),
    });
    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }
      const req = https.request(
        {
          hostname: target.hostname,
          port: 443,
          path: `${target.pathname}${target.search}`,
          method,
          agent: false,
          headers: {
            ...headers,
            Host: target.hostname,
            ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
          },
          createConnection: () => socket,
        },
        async (response) => {
          try {
            const responseBody = await readResponseBody(response);
            resolve(toResponse(response.statusCode ?? 0, responseBody));
          } catch (err) {
            reject(err);
          }
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
    connectReq.on("error", reject);
    connectReq.end();
  });
}

function performRequest(url, init, timeoutMs) {
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    return httpsRequestViaProxy(url, proxyUrl, init.method, init.headers, init.body, timeoutMs);
  }
  return httpsRequestDirect(url, init.method, init.headers, init.body, timeoutMs);
}

export function isExpertHubNetworkError(err) {
  if (!(err instanceof Error)) {
    return String(err).includes("ETIMEDOUT") || String(err).includes("fetch failed");
  }
  const code = err.code;
  if (["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND"].includes(code)) return true;
  return err.message.includes("timed out") || err.message.includes("fetch failed");
}

export async function fetchExpertHub(url, init = {}, attempt = 1) {
  const timeoutMs = getExpertHubFetchTimeoutMs();
  const method = init.method ?? "GET";
  const headers = init.headers ?? {};
  try {
    return await performRequest(url, { method, headers, body: init.body }, timeoutMs);
  } catch (err) {
    if (isExpertHubNetworkError(err) && attempt < MAX_ATTEMPTS) {
      return fetchExpertHub(url, init, attempt + 1);
    }
    throw err;
  }
}

export async function exchangeCodeForProfile(code, redirectUri) {
  const hubUrl = getExpertHubSsoUrl();
  const clientId = process.env.EXPERT_HUB_SSO_CLIENT_ID;
  const clientSecret = process.env.EXPERT_HUB_SSO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw Object.assign(new Error("ExpertHub integration not configured"), { status: 400 });
  }

  const tokenRes = await fetchExpertHub(`${hubUrl}/api/auth/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    throw Object.assign(new Error(detail || "ExpertHub token exchange failed"), {
      status: tokenRes.status >= 400 && tokenRes.status < 500 ? tokenRes.status : 401,
    });
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw Object.assign(new Error("ExpertHub did not return access_token"), { status: 502 });
  }

  const profileRes = await fetchExpertHub(`${hubUrl}/api/auth/oauth/profile`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw Object.assign(new Error("ExpertHub profile fetch failed"), { status: 401 });
  }

  return profileRes.json();
}
