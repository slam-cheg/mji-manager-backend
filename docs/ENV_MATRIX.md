# MJI Manager Environment Matrix

## Hub (corporate-app) — one-time

No per-app client registration required. Hub accepts any valid `client_id` with shared secret.

```env
EXPERT_HUB_SSO_CLIENT_SECRET=<shared-with-all-apps>
EXPERT_HUB_SSO_SIGNING_SECRET=<hub-only>
EXPERT_HUB_SSO_REDIRECT_HOST_SUFFIXES=.sste.ru,localhost,127.0.0.1,chromiumapp.org
```

## Backend (`mji-manager-backend`)

```env
NODE_ENV=development
PORT=2010

# Database (override config.js defaults)
DB_HOST=192.168.0.99
DB_PORT=3001
DB_NAME=Manager
DB_USER=postgres
DB_PASSWORD=

# ExpertHub SSO
EXPERT_HUB_SSO_URL=https://hub.sste.ru
EXPERT_HUB_SSO_CLIENT_ID=mji-manager
EXPERT_HUB_SSO_CLIENT_SECRET=<same-as-hub>
EXPERT_HUB_FETCH_TIMEOUT_MS=30000

# JWT & cookies
JWT_SECRET=<random-32+-chars>
JWT_EXPIRES_IN=7d
OAUTH_REDIRECT_URIS=http://localhost:3000/auth/expert-hub/callback,https://mjimanager.ru/auth/expert-hub/callback
CORS_ORIGINS=http://localhost:3000,http://192.168.0.133:3000,https://mjimanager.ru
AUTH_COOKIE_SAMESITE=lax
AUTH_CROSS_ORIGIN_COOKIES=false

# Extension releases
INSTALLER_FILE_PATH=./installer/MJI-manager.exe
INSTALLER_RELEASES_DIR=./installer/releases
```

## Frontend (`mji-manager-frontend`)

```env
API_URL=http://localhost:2010
NEXT_PUBLIC_API_URL=http://localhost:2010
NEXT_PUBLIC_EXPERT_HUB_SSO_URL=https://hub.sste.ru
NEXT_PUBLIC_EXPERT_HUB_SSO_CLIENT_ID=mji-manager
```

## Extension (`mji-manager-extension`)

```env
REACT_APP_API_URL=http://localhost:2010
REACT_APP_EXPERT_HUB_SSO_URL=https://hub.sste.ru
REACT_APP_EXPERT_HUB_SSO_CLIENT_ID=mji-manager
```

Chrome extension OAuth redirect: `https://<extension-id>.chromiumapp.org/` — add to `OAUTH_REDIRECT_URIS` on backend when extension ID is known.

## Local dev stack

| Service | URL |
|---------|-----|
| Hub | http://localhost:3000 |
| Backend | http://localhost:2010 |
| Frontend | http://localhost:3000 (or 192.168.0.133:3000) |

See AutoPZV `docs/LOCAL_SSO_DEV.md` for Hub + app wiring.
