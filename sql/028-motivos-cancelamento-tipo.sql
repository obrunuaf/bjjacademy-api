-- Adiciona coluna tipo na tabela motivos_cancelamento
-- Pode ser 'PRESENCA' ou 'AULA'
ALTER TABLE motivos_cancelamento ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'PRESENCA';

-- Atualiza restrição de unicidade para incluir o tipo
ALTER TABLE motivos_cancelamento DROP CONSTRAINT IF EXISTS motivos_cancelamento_academia_id_slug_key;
ALTER TABLE motivos_cancelamento ADD CONSTRAINT motivos_cancelamento_academia_id_slug_tipo_key UNIQUE(academia_id, slug, tipo);

-- Inserir motivos de cancelamento de AULA globais
INSERT INTO motivos_cancelamento (academia_id, slug, label, icon, ordem, tipo) VALUES
  (NULL, 'instrutor_indisponivel', 'Instrutor indisponível', 'person-remove-outline', 1, 'AULA'),
  (NULL, 'feriado', 'Feriado / Recesso', 'calendar-outline', 2, 'AULA'),
  (NULL, 'manutencao', 'Manutenção do espaço', 'construct-outline', 3, 'AULA'),
  (NULL, 'baixa_demanda', 'Baixa demanda', 'people-outline', 4, 'AULA'),
  (NULL, 'evento_especial', 'Evento especial', 'star-outline', 5, 'AULA'),
  (NULL, 'emergencia', 'Emergência', 'warning-outline', 6, 'AULA'),
  (NULL, 'outro', 'Outro motivo', 'ellipsis-horizontal', 99, 'AULA')
ON CONFLICT (academia_id, slug, tipo) DO NOTHING;
