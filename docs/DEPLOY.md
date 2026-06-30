# MJI Manager — production deploy (Windows Docker)

Backend and frontend deploy **independently** from separate repositories. Changing one repo does not trigger deploy of the other.

Deploy pattern matches **AutoPZV** and **archive-***: GitHub Actions packs sources, SCP to Windows Server (`SSH :2222`), `docker compose` builds on the server.

## Architecture

| Container | Port (default) | Repo | Server path |
|-----------|----------------|------|-------------|
| `mji-manager-backend` | 2010 | `slam-cheg/mji-manager-backend` | `C:/Users/AdministratorOffice/sites/mji-manager-backend` |
| `mji-manager-frontend` | 2020 | `eternumart/mji-manager-frontend` | `C:/Users/AdministratorOffice/sites/mji-manager-frontend` |

Public URL: `https://mji.sste.ru` (Nginx → frontend :2020; Next rewrites `/api` → backend :2010).

## Workflows

| Repo | Workflow | Trigger |
|------|----------|---------|
| `mji-manager-backend` | `deploy-windows.yml` | **manual only** (`workflow_dispatch`) |
| `mji-manager-frontend` | `deploy-windows.yml` | **manual only** (`workflow_dispatch`) |
| `mji-manager-extension` | `deploy-extension.yml` | push `main` / tags, manual (installer only) |

No cross-repo workflow triggers. Each repo checks out and deploys only itself.

## GitHub Secrets — backend (`mji-manager-backend`)

### Shared (corporate-app)

| Secret | Example |
|--------|---------|
| `HOST` | `hub.sste.ru` |
| `USERNAME` | `AdministratorOffice` |
| `SSH_KEY` | private key (PEM) |

### Required

| Secret | Description |
|--------|-------------|
| `TARGET_PATH` | `C:/Users/AdministratorOffice/sites/mji-manager-backend` |
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
| `INSTALLER_HOST_PATH` | `E:/mji-data/installer` |
| `INSTALLER_RELEASES_HOST_PATH` | `C:/Users/.../sites/mji-installers` |
| `BACKEND_PUBLISH_PORT` | `2010` |

## GitHub Secrets — frontend (`mji-manager-frontend`)

| Secret | Description |
|--------|-------------|
| `HOST`, `USERNAME`, `SSH_KEY` | same as backend |
| `TARGET_PATH` | `C:/Users/AdministratorOffice/sites/mji-manager-frontend` |
| `PUBLIC_URL` | `https://mji.sste.ru` |
| `API_URL` | optional; auto `http://<host-ip>:2010` at deploy if unset |
| `NEXT_PUBLIC_API_URL` | optional; defaults to `PUBLIC_URL` |
| `NEXT_PUBLIC_EXPERT_HUB_SSO_URL` | `https://hub.sste.ru` |
| `NEXT_PUBLIC_EXPERT_HUB_SSO_CLIENT_ID` | `mji-manager` |
| `WEB_PUBLISH_PORT` | `2020` |
| `BACKEND_PUBLISH_PORT` | `2010` (for API_URL auto-resolution) |
| `WINDOWS_HOST_IP` | optional IPv4 override |

## Manual first-time server setup

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\AdministratorOffice\sites\mji-manager-backend'
Set-Content 'C:\Users\AdministratorOffice\sites\mji-manager-backend\.mji-deploy-target' 'MJI Manager backend deploy target: prod'
New-Item -ItemType Directory -Force -Path 'C:\Users\AdministratorOffice\sites\mji-manager-frontend'
Set-Content 'C:\Users\AdministratorOffice\sites\mji-manager-frontend\.mji-deploy-target' 'MJI Manager frontend deploy target: prod'
New-Item -ItemType Directory -Force -Path 'E:\mji-data\installer'
New-Item -ItemType Directory -Force -Path 'C:\Users\AdministratorOffice\sites\mji-installers'
docker version
```


## Agents and CI/CD

Push to master/main runs **CI only** (ci.yml). Production deploy does **not** run on push.

Before starting a manual deploy (workflow_dispatch), check that no deploy is already running or queued:

`ash
gh run list -R slam-cheg/mji-manager-backend --workflow deploy-windows.yml --status in_progress --status queued
`

Do **not** push a fix commit and run gh workflow run for the same deploy unless the user explicitly asked for redeploy.


## Deploy order

1. Deploy **backend** first (`mji-manager-backend` → Actions → Deploy MJI Manager Backend).
2. Deploy **frontend** (`mji-manager-frontend` → Actions → Deploy MJI Manager Frontend).

## Local smoke after deploy

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:2010/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:2020/
docker compose -f docker-compose.windows.yml -p mji-manager-backend --profile prod ps
```

## Extension release flow

1. Push to `mji-manager-extension` `main` → `deploy-extension.yml` builds installer and SCP's to `INSTALLER_RELEASES_HOST_PATH`.
2. Does **not** trigger backend or frontend deploy.

## Troubleshooting

- **Frontend cannot reach API**: set `WINDOWS_HOST_IP` to the server's LAN IPv4; ensure backend is running on :2010.
- **DB connection fails**: use PostgreSQL host IP visible inside Docker NAT, not `localhost`.

See also `docs/ENV_MATRIX.md`.
