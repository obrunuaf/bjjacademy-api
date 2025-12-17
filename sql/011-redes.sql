-- ================================================
-- 011-redes.sql - Networks/Franchise Model MVP
-- ================================================

-- 1. Table: redes (networks/franchises)
CREATE TABLE IF NOT EXISTS redes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table: redes_admins (network administrators)
CREATE TABLE IF NOT EXISTS redes_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rede_id UUID NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL DEFAULT 'ADMIN_REDE',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_redes_admins UNIQUE (rede_id, usuario_id)
);

-- 3. Add rede_id to academias (nullable - independent academies have NULL)
ALTER TABLE academias ADD COLUMN IF NOT EXISTS rede_id UUID REFERENCES redes(id);

-- 4. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_academias_rede ON academias(rede_id);
CREATE INDEX IF NOT EXISTS idx_redes_admins_usuario ON redes_admins(usuario_id);

-- 5. Comments
COMMENT ON TABLE redes IS 'Networks/Franchises that group multiple academies';
COMMENT ON TABLE redes_admins IS 'Administrators who manage entire networks';
COMMENT ON COLUMN academias.rede_id IS 'Reference to parent network (NULL = independent academy)';
