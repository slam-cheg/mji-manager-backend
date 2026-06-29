import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pkg from "pg";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ServerConfig } from "./config.js";
import { HomePage } from "./server/routes/pages/home.js";
import { RegistrationPage } from "./server/routes/pages/registration.js";
import { Registration } from "./server/routes/api/registration.js";
import { Activation } from "./server/routes/api/activation.js";
import { Login } from "./server/routes/api/login.js";
import { UserData } from "./server/routes/api/userData.js";
import { AllUsersData } from "./server/routes/api/allUsersData.js";
import { LoginPage } from "./server/routes/pages/login.js";
import { ProfilePage } from "./server/routes/pages/profile.js";
import { DefectEditorPage } from "./server/routes/pages/defectEditor.js";
import { SaveDefects } from "./server/routes/api/saveDefects.js";
import { SaveRates } from "./server/routes/api/saveRates.js";
import { SaveRepresentatives } from "./server/routes/api/saveRepresentatives.js";
import { UpdateFio } from "./server/routes/api/updateFio.js";
import { ActiveFunctions } from "./server/routes/api/activeFunctions.js";
import { ChangeUserPermissions } from "./server/routes/api/changeUserPermissions.js";
import { ChangeProfile } from "./server/routes/api/changeProfile.js";
import { DeactivateAccount } from "./server/routes/api/deactivateAccount.js";
import { GetAppData } from "./server/routes/api/getAppData.js";
import { GetApp } from "./server/routes/api/getApp.js";
import { NodePage } from "./server/routes/api/nodePage.js";
import { CheckResponseFromServer } from "./server/routes/api/checkResponseFromServer.js";
import { Health } from "./server/routes/api/health.js";
import {
  ExpertHubCallback,
  ExpertHubExtensionCallbackPage,
  AuthRelogin,
  AuthLogout,
  AuthMe,
  DeprecatedAuth,
} from "./server/routes/api/authRoutes.js";
import { requireAuth, requireAdmin } from "./server/auth/middleware.js";
import {
  ReleasesMeta,
  ReleasesInstaller,
  AdminListReleases,
  AdminUploadRelease,
  AdminActivateRelease,
} from "./server/routes/api/releasesRoutes.js";
import { runMigrations } from "./server/migrations/runMigrations.js";
import { GetAiSettings, UpdateAiSettings } from "./server/routes/api/aiSettings.js";
import { RephraseDefectsBlock } from "./server/routes/api/rephraseDefectsBlock.js";

const { Client } = pkg;
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const app = express();

app.use(cors(ServerConfig.corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(__dirname));

const corsMw = cors(ServerConfig.corsOptions);
const auth = [corsMw, requireAuth];
const admin = [corsMw, requireAuth, requireAdmin];

// PAGES
app.get(ServerConfig.routes.pages.home, corsMw, HomePage);
app.get(ServerConfig.routes.pages.node, corsMw, NodePage);
app.get(ServerConfig.routes.pages.registration, corsMw, RegistrationPage);
app.get(ServerConfig.routes.pages.login, corsMw, LoginPage);
app.get(ServerConfig.routes.pages.profile, corsMw, ProfilePage);
app.get(ServerConfig.routes.pages.defectEditor, corsMw, DefectEditorPage);

// AUTH — SSO
app.get(ServerConfig.routes.api.expertHubExtensionCallback, corsMw, ExpertHubExtensionCallbackPage);
app.post(ServerConfig.routes.api.expertHubCallback, corsMw, ExpertHubCallback);
app.post(ServerConfig.routes.api.authRelogin, corsMw, AuthRelogin);
app.post(ServerConfig.routes.api.authLogout, corsMw, AuthLogout);
app.get(ServerConfig.routes.api.authMe, ...auth, AuthMe);

// AUTH — deprecated
app.post(ServerConfig.routes.api.registration, corsMw, DeprecatedAuth);
app.post(ServerConfig.routes.api.activation, corsMw, DeprecatedAuth);
app.post(ServerConfig.routes.api.login, corsMw, DeprecatedAuth);

// HEALTH — public
app.get(ServerConfig.routes.api.health, corsMw, Health);

// RELEASES — public
app.get(ServerConfig.routes.api.releasesMeta, corsMw, ReleasesMeta);
app.get(ServerConfig.routes.api.releasesInstaller, corsMw, ReleasesInstaller);

// RELEASES — admin
app.get(ServerConfig.routes.api.adminReleases, ...admin, AdminListReleases);
app.post(ServerConfig.routes.api.adminReleases, ...admin, AdminUploadRelease);
app.patch(
  ServerConfig.routes.api.adminReleaseActivate,
  ...admin,
  AdminActivateRelease
);

// API — protected
app.post(ServerConfig.routes.api.userData, ...auth, UserData);
app.post(ServerConfig.routes.api.allUsersData, ...admin, AllUsersData);
app.post(ServerConfig.routes.api.saveDefects, ...admin, SaveDefects);
app.post(ServerConfig.routes.api.saveRates, ...admin, SaveRates);
app.post(ServerConfig.routes.api.saveRepresentatives, ...admin, SaveRepresentatives);
app.get(ServerConfig.routes.api.aiSettings, ...admin, GetAiSettings);
app.post(ServerConfig.routes.api.aiSettings, ...admin, UpdateAiSettings);
app.post(ServerConfig.routes.api.saveFio, ...auth, UpdateFio);
app.post(ServerConfig.routes.api.activeFunctions, ...admin, ActiveFunctions);
app.post(ServerConfig.routes.api.changeUserPermissions, ...admin, ChangeUserPermissions);
app.post(ServerConfig.routes.api.changeAccount, ...auth, ChangeProfile);
app.post(ServerConfig.routes.api.deactivateAccount, ...auth, DeactivateAccount);
app.post(ServerConfig.routes.api.getAppData, ...auth, GetAppData);
app.post(ServerConfig.routes.api.rephraseDefectsBlock, ...auth, RephraseDefectsBlock);
app.get(ServerConfig.routes.api.checkResponseFromServer, corsMw, CheckResponseFromServer);
app.get(ServerConfig.routes.api.getApp, corsMw, GetApp);

export const dataBase = new Client(ServerConfig.dataBase);
await dataBase.connect();
await runMigrations();
