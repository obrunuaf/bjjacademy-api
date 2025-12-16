import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TurmasService } from './turmas.service';
import { createMockDatabaseService, mockTurma, mockUser } from '../../testing/mocks';

describe('TurmasService', () => {
  let service: TurmasService;
  let mockDb: ReturnType<typeof createMockDatabaseService>;

  beforeEach(() => {
    mockDb = createMockDatabaseService();
    service = new TurmasService(mockDb as any);
  });

  describe('remover', () => {
    const user = mockUser.staff();

    it('should soft-delete turma when no future aulas exist', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce(mockTurma.active()) // buscarTurma
        .mockResolvedValueOnce(null); // no future aulas
      mockDb.query.mockResolvedValueOnce([]); // soft delete update

      // Act
      await service.remover('turma-id', user);

      // Assert
      expect(mockDb.query).toHaveBeenCalled();
      const updateCall = mockDb.query.mock.calls[0];
      const sql = updateCall[0];
      expect(sql).toContain('deleted_at = now()');
    });

    it('should throw 409 when turma has future aulas', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce(mockTurma.active()) // buscarTurma
        .mockResolvedValueOnce({ id: 'future-aula-id' }); // has future aula!

      // Act & Assert
      await expect(service.remover('turma-id', user))
        .rejects
        .toThrow(ConflictException);
    });

    it('should throw 404 when turma not found', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.remover('invalid-id', user))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw 403 when user is ALUNO', async () => {
      // Arrange
      const alunoUser = mockUser.aluno();

      // Act & Assert
      await expect(service.remover('turma-id', alunoUser))
        .rejects
        .toThrow(ForbiddenException);
    });

    it('should allow deletion after future aulas are removed', async () => {
      // Arrange - first call has future aula, second doesn't
      mockDb.queryOne
        .mockResolvedValueOnce(mockTurma.active()) // buscarTurma (first attempt)
        .mockResolvedValueOnce({ id: 'future-aula' }); // has future aula

      // First attempt should fail
      await expect(service.remover('turma-id', user))
        .rejects
        .toThrow(ConflictException);

      // Reset and try again after "removing" aula
      mockDb.queryOne
        .mockResolvedValueOnce(mockTurma.active()) // buscarTurma (second attempt)
        .mockResolvedValueOnce(null); // no more future aulas
      mockDb.query.mockResolvedValueOnce([]);

      // Second attempt should succeed
      await expect(service.remover('turma-id', user)).resolves.toBeUndefined();
    });
  });
});
