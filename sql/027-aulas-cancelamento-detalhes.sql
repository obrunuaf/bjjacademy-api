-- Adiciona colunas para detalhes de cancelamento de aula
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS cancelamento_motivo VARCHAR(100);
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS cancelamento_observacao TEXT;
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES usuarios(id);
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP;
