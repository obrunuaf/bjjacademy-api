/**
 * Mock DatabaseService for unit tests
 * Provides controlled responses without real database
 */
import { UserRole } from '../common/enums/user-role.enum';

export const createMockDatabaseService = () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  getAppTimezone: jest.fn().mockReturnValue('America/Sao_Paulo'),
  getTodayBoundsUtc: jest.fn().mockResolvedValue({
    startUtc: new Date('2025-01-01T03:00:00Z'),
    endUtc: new Date('2025-01-02T03:00:00Z'),
  }),
  getDayBoundsUtc: jest.fn().mockResolvedValue({
    startUtc: new Date('2025-01-01T03:00:00Z'),
    endUtc: new Date('2025-01-02T03:00:00Z'),
  }),
});

export type MockDatabaseService = ReturnType<typeof createMockDatabaseService>;

/**
 * Common mock data factories
 */
export const mockUser = {
  staff: () => ({
    id: 'staff-user-id',
    role: UserRole.PROFESSOR,
    roles: [UserRole.PROFESSOR],
    academiaId: 'academia-id',
  }),
  aluno: () => ({
    id: 'aluno-user-id',
    role: UserRole.ALUNO,
    roles: [UserRole.ALUNO],
    academiaId: 'academia-id',
  }),
};

export const mockAula = {
  agendada: (overrides = {}) => ({
    id: 'aula-id',
    status: 'AGENDADA',
    data_fim: null,
    qr_token: 'qr-token-123',
    qr_expires_at: new Date().toISOString(),
    deleted_at: null,
    turma_deleted_at: null,
    ...overrides,
  }),
  encerrada: (overrides = {}) => ({
    id: 'aula-id',
    status: 'ENCERRADA',
    data_fim: new Date().toISOString(),
    qr_token: null,
    qr_expires_at: null,
    deleted_at: null,
    turma_deleted_at: null,
    ...overrides,
  }),
  cancelada: (overrides = {}) => ({
    id: 'aula-id',
    status: 'CANCELADA',
    data_fim: null,
    qr_token: null,
    qr_expires_at: null,
    deleted_at: null,
    turma_deleted_at: null,
    ...overrides,
  }),
};

export const mockPresenca = {
  pendente: (overrides = {}) => ({
    id: 'presenca-id',
    academia_id: 'academia-id',
    aula_id: 'aula-id',
    aluno_id: 'aluno-id',
    status: 'PENDENTE',
    origem: 'QR_CODE',
    criado_em: new Date().toISOString(),
    registrado_por: null,
    ...overrides,
  }),
  presente: (overrides = {}) => ({
    id: 'presenca-id',
    academia_id: 'academia-id',
    aula_id: 'aula-id',
    aluno_id: 'aluno-id',
    status: 'PRESENTE',
    origem: 'QR_CODE',
    criado_em: new Date().toISOString(),
    registrado_por: null,
    decidido_em: new Date().toISOString(),
    decidido_por: 'staff-user-id',
    ...overrides,
  }),
  falta: (overrides = {}) => ({
    id: 'presenca-id',
    academia_id: 'academia-id',
    aula_id: 'aula-id',
    aluno_id: 'aluno-id',
    status: 'FALTA',
    origem: 'QR_CODE',
    criado_em: new Date().toISOString(),
    registrado_por: null,
    decidido_em: new Date().toISOString(),
    decidido_por: 'staff-user-id',
    ...overrides,
  }),
};

export const mockTurma = {
  active: (overrides = {}) => ({
    id: 'turma-id',
    nome: 'Turma Teste',
    dias_semana: [1, 3, 5],
    horario_padrao: '19:00',
    tipo_treino: 'Gi',
    tipo_treino_cor: '#0000FF',
    instrutor_id: 'instrutor-id',
    instrutor_nome: 'Professor Teste',
    deleted_at: null,
    academia_id: 'academia-id',
    ...overrides,
  }),
};
