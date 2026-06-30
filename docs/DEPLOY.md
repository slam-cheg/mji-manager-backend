# MJI Manager — production deploy (Windows Docker)

Deploy pattern matches **AutoPZV** and **archive-***: GitHub Actions packs sources, SCP to Windows Server (`SSH :2222`), `docker compose` builds on the server.

## Architecture

| Container | Port (default) | Role |
|-----------|----------------|------|
| `mji-manager-backend` | 2010 | Express API, SSO, releases |
| `mji-manager-frontend` | 2020 | Next.js standalone (public entry) |

Smoke check: `GET http://127.0.0.1:2020/api/health` (Next rewrites → backend).

## Server prerequisites

1. Windows Server 2019 + **Docker Windows containers** (LTSC 2019).
2. OpenSSH on port **2222** (same as corporate-app / AutoPZV).
3. PostgreSQL reachable from containers (`DB_HOST` ≠ `127.0.0.1`).
4. Host folders for extension installers (created by workflow):
   - `E:/mji-data/installer` — legacy/active installer mount (read-only in container)
   - `C:/Users/AdministratorOffice/sites/mji-installers` — admin release uploads

## Workflows

| Repo | Workflow | Trigger |
|------|----------|---------|
| `mji-manager-backend` | `deploy-windows.yml` | push `main`, manual |
| `mji-manager-frontend` | `deploy-windows.yml` | triggers backend deploy |
| `mji-manager-extension` | `deploy-extension.yml` | push `main` / tags, manual |

**Main deploy** lives in `mji-manager-backend`: checks out `mji-manager-frontend` into `frontend/`, zips both, runs `docker-compose.windows.yml` on the server.

## GitHub Secrets (`mji-manager-backend`)

### Shared (corporate-app)

| Secret | Example |
|--------|---------|
| `HOST` | server IP or hostname |
| `USERNAME` | SSH user |
| `SSH_KEY` | private key (PEM) |

### Required

| Secret | Description |
|--------|-------------|
| `TARGET_PATH` | `C:/Users/.../mji-manager` |
| `PUBLIC_URL` | `https://mji.sste.ru` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL |
| `JWT_SECRET` | random 32+ chars |
| `OAUTH_REDIRECT_URIS` | ExpertHub callbacks (web + extension) |
| `CORS_ORIGINS` | must include `PUBLIC_URL` |
| `EXPERT_HUB_SSO_URL` | `https://hub.sste.ru` |
| `EXPERT_HUB_SSO_CLIENT_ID` | `mji-manager` |
| `EXPERT_HUB_SSO_CLIENT_SECRET` | shared Hub secret |

### Optional

| Secret | Default |
|--------|---------|
| `REPO_ACCESS_TOKEN` | PAT to read `mji-manager-frontend` from backend workflow |
| `INSTALLER_HOST_PATH` | `E:/mji-data/installer` |
| `INSTALLER_RELEASES_HOST_PATH` | `C:/Users/.../sites/mji-installers` |
| `WEB_PUBLISH_PORT` | `2020` |
| `BACKEND_PUBLISH_PORT` | `2010` |
| `WINDOWS_HOST_IP` | auto-detected LAN IP for frontend→backend on Windows NAT |
| `API_URL` | auto `http://<host-ip>:2010` at deploy time |
| `NEXT_PUBLIC_*` | derived from `PUBLIC_URL` / SSO secrets |

Copy the same `HOST`, `USERNAME`, `SSH_KEY`, `INSTALLER_RELEASES_HOST_PATH` to **mji-manager-extension** for installer upload.

## Manual first-time server setup

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\AdministratorOffice\sites\mji-manager'
Set-Content 'C:\Users\AdministratorOffice\sites\mji-manager\.mji-deploy-target' 'MJI Manager deploy target: prod'
New-Item -ItemType Directory -Force -Path 'E:\mji-data\installer'
New-Item -ItemType Directory -Force -Path 'C:\Users\AdministratorOffice\sites\mji-installers'
docker version
```

## Local smoke after deploy

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:2020/api/health
docker compose -f docker-compose.windows.yml -p mji-manager --profile prod ps
```

## Extension release flow

1. Push to `mji-manager-extension` `main` → `deploy-extension.yml` builds the extension (`npm run build`) and compiles an **Inno Setup** installer (`MJI-manager-Setup-{version}.exe`) on `windows-latest`.
2. `.exe` is SCP'd to `INSTALLER_RELEASES_HOST_PATH`.
3. Admin activates release in web UI (`/lk` → Релизы) or upload via API.

Local installer build (Windows, [Inno Setup 6](https://jrsoftware.org/isdl.php) required):

```powershell
npm run build
npm run build:installer
```

Output: `installer/output/MJI-manager-Setup-{version}.exe`

## Troubleshooting

- **Frontend cannot reach API**: set `WINDOWS_HOST_IP` to the server's LAN IPv4.
- **DB connection fails**: use PostgreSQL host IP visible inside Docker NAT, not `localhost`.
- **Checkout frontend fails**: add `REPO_ACCESS_TOKEN` (classic PAT, `repo` scope) to backend repo secrets.

See also `docs/ENV_MATRIX.md`.
