# MJI Manager API Contract

Shared contract for `mji-manager-backend`, `mji-manager-frontend`, and `mji-manager-extension`.

## Auth

### POST `/auth/experthub/callback`

Exchange ExpertHub authorization code for application JWT.

**Request body:**
```json
{
  "code": "string",
  "redirect_uri": "string",
  "state": "string (optional)"
}
```

**Response (200):**
```json
{
  "accessToken": "jwt-string",
  "user": {
    "login": "user@example.com",
    "fio": "Иванов Иван",
    "isAdmin": false
  }
}
```

Also sets httpOnly cookie `mji_token` (7 days).

**Errors:** 400 invalid redirect_uri, 401 Hub auth failed, 503 Hub unreachable.

### POST `/auth/relogin`

Restore session from existing JWT.

**Request body:**
```json
{ "accessToken": "jwt-string (optional if cookie present)" }
```

**Response (200):** same as callback.

### POST `/auth/logout`

Clears session cookie and invalidates server-side session hash.

**Response:** 204 No Content.

### GET `/auth/me`

**Headers:** `Authorization: Bearer <token>` or cookie `mji_token`.

**Response (200):**
```json
{
  "login": "user@example.com",
  "fio": "Иванов Иван",
  "isAdmin": false
}
```

### Deprecated (410 Gone)

- `POST /auth/registration`
- `POST /auth/activation`
- `POST /auth/login`

## JWT payload

```json
{
  "sub": "user@example.com",
  "fio": "string",
  "isAdmin": boolean,
  "sessionHash": "string"
}
```

TTL: 7 days.

## Protected API

All `/api/*` routes require valid JWT (Bearer header or `mji_token` cookie), except public release endpoints below.

Admin-only routes require `isAdmin: true`:
- `POST /api/allusersdata`
- `POST /api/change-permissions`
- `POST /api/save-defects`
- `POST /api/change-functions`
- `GET /api/admin/releases`
- `POST /api/admin/releases`
- `PATCH /api/admin/releases/:id/activate`

## Releases (public)

### GET `/api/releases/meta`

```json
{
  "appVersion": "3.2.0.0",
  "versionCode": 3020000,
  "distVersion": 1,
  "updatedAt": "2026-06-25T16:17:54.000Z",
  "downloadAvailable": true
}
```

Null fields when no active release.

### GET `/api/releases/installer`

Binary stream (`application/octet-stream`) of active installer `.exe`.

## Releases (admin)

### GET `/api/admin/releases`

Returns `Release[]` ordered by `distVersion DESC`.

```json
{
  "id": "uuid",
  "appVersion": "3.2.0.0",
  "versionCode": 3020000,
  "distVersion": 1,
  "filename": "MJI-manager-Setup-3.2.0.0-d1.exe",
  "filePath": "string",
  "isActive": true,
  "uploadedByEmail": "admin@sste.ru",
  "notes": null,
  "createdAt": "2026-06-25T16:17:54.000Z"
}
```

### POST `/api/admin/releases`

`multipart/form-data`:
- `file` — Windows PE installer (.exe), required
- `activate` — `"true"` | `"false"` (default true)
- `appVersion` — optional override
- `notes` — optional

### PATCH `/api/admin/releases/:id/activate`

Activates release, deactivates all others, copies to legacy `INSTALLER_FILE_PATH`.
