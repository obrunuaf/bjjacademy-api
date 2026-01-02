-- ============================================================================
-- 026-motivos-cancelamento.sql
-- Tabela de motivos de cancelamento de presença
-- ============================================================================

-- Criar tabela de motivos de cancelamento
CREATE TABLE IF NOT EXISTS motivos_cancelamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID REFERENCES academias(id) ON DELETE CASCADE,
  slug VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'help-outline',
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Slug único por academia (NULL = global)
  UNIQUE(academia_id, slug)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_motivos_cancelamento_academia 
  ON motivos_cancelamento(academia_id);
CREATE INDEX IF NOT EXISTS idx_motivos_cancelamento_ativo 
  ON motivos_cancelamento(ativo);

-- Inserir motivos globais (academia_id = NULL = disponível para todas)
INSERT INTO motivos_cancelamento (academia_id, slug, label, icon, ordem) VALUES
  (NULL, 'erro_registro', 'Erro no registro', 'bug-outline', 1),
  (NULL, 'saiu_cedo', 'Aluno saiu mais cedo', 'exit-outline', 2),
  (NULL, 'nao_compareceu', 'Não compareceu de fato', 'close-circle-outline', 3),
  (NULL, 'duplicado', 'Check-in duplicado', 'copy-outline', 4),
  (NULL, 'outro', 'Outro motivo', 'ellipsis-horizontal', 99)
ON CONFLICT (academia_id, slug) DO NOTHING;

-- ============================================================================
-- IMPORTANTE: Coluna observacao unificada na tabela presencas
-- Se ainda não migrou as colunas antigas, execute:
-- ============================================================================
-- ALTER TABLE presencas ADD COLUMN IF NOT EXISTS observacao TEXT;
-- UPDATE presencas SET observacao = COALESCE(decisao_observacao, aprovacao_observacao)
--   WHERE observacao IS NULL AND (decisao_observacao IS NOT NULL OR aprovacao_observacao IS NOT NULL);
-- ALTER TABLE presencas DROP COLUMN IF EXISTS decisao_observacao;
-- ALTER TABLE presencas DROP COLUMN IF EXISTS aprovacao_observacao;
