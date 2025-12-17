-- ================================================
-- 012-refresh-tokens.sql - Real Refresh Token System
-- ================================================

-- Table: refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Comments
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for multi-device auth';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA256 hash of the actual token';
COMMENT ON COLUMN refresh_tokens.device_info IS 'Human-readable device description';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was revoked (logout)';
COMMENT ON COLUMN refresh_tokens.ultimo_uso IS 'Last time token was used to refresh';

-- Cleanup job: delete expired/revoked tokens older than 30 days
-- (Run manually or via cron)
-- DELETE FROM refresh_tokens WHERE 
--   expires_at < now() - interval '30 days' OR 
--   revoked_at < now() - interval '30 days';
