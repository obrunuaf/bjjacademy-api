-- Migration: adicionar colunas de soft-delete em turmas e aulas

alter table turmas
  add column if not exists deleted_at timestamptz;

alter table aulas
  add column if not exists deleted_at timestamptz;

create index if not exists idx_turmas_academia_deleted
  on turmas (academia_id, deleted_at);

create index if not exists idx_aulas_turma_data_deleted
  on aulas (turma_id, data_inicio, deleted_at);
