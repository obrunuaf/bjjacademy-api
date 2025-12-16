import { ConflictException, NotFoundException } from '@nestjs/common';
import { AulasService } from './aulas.service';
import { createMockDatabaseService, mockAula, mockUser } from '../../testing/mocks';

describe('AulasService', () => {
  let service: AulasService;
  let mockDb: ReturnType<typeof createMockDatabaseService>;

  beforeEach(() => {
    mockDb = createMockDatabaseService();
    service = new AulasService(mockDb as any);
  });

  describe('encerrarAula', () => {
    const user = mockUser.staff();

    it('should change AGENDADA to ENCERRADA', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce(mockAula.agendada()) // buscarAulaBasica
        .mockResolvedValueOnce(mockAula.encerrada()); // update returning

      // Act
      const result = await service.encerrarAula('aula-id', user);

      // Assert
      expect(result.status).toBe('ENCERRADA');
      expect(result.qrToken).toBeNull();
      expect(result.qrExpiresAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
    });

    it('should be idempotent - calling twice returns same result', async () => {
      // Arrange - aula already ENCERRADA
      mockDb.queryOne
        .mockResolvedValueOnce(mockAula.encerrada()) // buscarAulaBasica
        .mockResolvedValueOnce(mockAula.encerrada()); // update returning

      // Act
      const result = await service.encerrarAula('aula-id', user);

      // Assert
      expect(result.status).toBe('ENCERRADA');
      expect(result.qrToken).toBeNull();
    });

    it('should throw 409 when aula is CANCELADA', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce(mockAula.cancelada());

      // Act & Assert
      await expect(service.encerrarAula('aula-id', user))
        .rejects
        .toThrow(ConflictException);
    });

    it('should throw 404 when aula not found', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.encerrarAula('invalid-id', user))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should clear qr_token and qr_expires_at', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce(mockAula.agendada({ qr_token: 'abc123', qr_expires_at: new Date().toISOString() }))
        .mockResolvedValueOnce(mockAula.encerrada());

      // Act
      const result = await service.encerrarAula('aula-id', user);

      // Assert - verify UPDATE SQL includes nullifying qr fields
      const updateCall = mockDb.queryOne.mock.calls[1];
      const sql = updateCall[0];
      expect(sql).toContain('qr_token = null');
      expect(sql).toContain('qr_expires_at = null');
      expect(result.qrToken).toBeNull();
      expect(result.qrExpiresAt).toBeNull();
    });
  });
});
