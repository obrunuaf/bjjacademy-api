-- ============================================
-- Migration: Adicionar academia_id à tabela de notificações
-- Data: 2024-12-31
-- Objetivo: Permitir notificações por perfil/academia
-- ============================================

-- 1. Adicionar coluna academia_id (nullable no início para dados existentes)
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS academia_id UUID REFERENCES academias(id) ON DELETE CASCADE;

-- 2. Criar índice para queries por academia
CREATE INDEX IF NOT EXISTS idx_notificacoes_academia 
  ON notificacoes (academia_id);

-- 3. Criar índice composto para queries de contagem por usuário e academia
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_academia_lida 
  ON notificacoes (usuario_id, academia_id, lida);

-- ============================================
-- NOTA: Para notificações existentes (sem academia_id), 
-- elas aparecerão em TODAS as unidades do usuário.
-- Novas notificações devem sempre incluir academia_id.
-- ============================================
