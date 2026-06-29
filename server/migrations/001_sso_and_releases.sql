-- Run once against Manager database

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_token_hash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hub_sub" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isadmin" BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version VARCHAR(32) NOT NULL,
  version_code INTEGER NOT NULL,
  dist_version INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  uploaded_by_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_releases_one_active ON releases (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_releases_dist_version ON releases (dist_version DESC);
