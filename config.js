function parseOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (raw?.trim()) {
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return true;
}

export const ServerConfig = {
  address: {
    production: {
      ip: process.env.HOST || "0.0.0.0",
      port: Number(process.env.PORT) || 2010,
    },
    dev: {
      ip: process.env.HOST || "0.0.0.0",
      port: Number(process.env.PORT) || 2010,
    },
  },
  corsOptions: {
    origin: parseOrigins(),
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    optionsSuccessStatus: 200,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  },
  routes: {
    pages: {
      home: "/",
      node: "/node",
      registration: "/registration",
      login: "/login",
      profile: "/profile",
      defectEditor: "/defect-editor",
    },
    api: {
      registration: "/auth/registration",
      login: "/auth/login",
      activation: "/auth/activation",
      expertHubCallback: "/auth/experthub/callback",
      expertHubExtensionCallback: "/auth/experthub/extension-callback",
      authRelogin: "/auth/relogin",
      authLogout: "/auth/logout",
      authMe: "/auth/me",
      releasesMeta: "/api/releases/meta",
      releasesInstaller: "/api/releases/installer",
      adminReleases: "/api/admin/releases",
      adminReleaseActivate: "/api/admin/releases/:id/activate",
      getApp: "/api/get-app",
      userData: "/api/userdata",
      allUsersData: "/api/allusersdata",
      saveDefects: "/api/save-defects",
      saveRates: "/api/save-rates",
      saveRepresentatives: "/api/save-representatives",
      saveFio: "/api/savefio",
      activeFunctions: "/api/change-functions",
      changeUserPermissions: "/api/change-permissions",
      changeAccount: "/api/change-account",
      deactivateAccount: "/api/deactivate-account",
      getAppData: "/api/get-app-data",
      health: "/api/health",
      checkResponseFromServer: "/api/check-response-from-server",
      getScripts: "/api/get-scripts",
      aiSettings: "/api/ai-settings",
      rephraseDefectsBlock: "/api/rephrase-defects-block",
    },
  },
  dataBase: {
    host: process.env.DB_HOST || "200.0.0.100",
    port: Number(process.env.DB_PORT) || 3001,
    database: process.env.DB_NAME || "Manager",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "Es12345678",
  },
};
