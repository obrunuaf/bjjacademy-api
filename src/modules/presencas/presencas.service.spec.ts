import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PresencasService } from './presencas.service';
import { createMockDatabaseService, mockPresenca, mockUser } from '../../testing/mocks';

describe('PresencasService', () => {
  let service: PresencasService;
  let mockDb: ReturnType<typeof createMockDatabaseService>;

  beforeEach(() => {
    mockDb = createMockDatabaseService();
    service = new PresencasService(mockDb as any);
  });

  describe('decidirPresenca', () => {
    const user = mockUser.staff();

    it('should approve PENDENTE presence to PRESENTE', async () => {
      // Arrange - mock audit columns check
      mockDb.query.mockResolvedValueOnce([
        { column_name: 'decidido_em' },
        { column_name: 'decidido_por' },
        { column_name: 'decisao_observacao' },
        { column_name: 'updated_at' },
      ]);
      mockDb.queryOne
        .mockResolvedValueOnce(mockPresenca.pendente()) // buscarPresenca
        .mockResolvedValueOnce(mockPresenca.presente()); // update returning

      // Act
      const result = await service.decidirPresenca('presenca-id', {
        decisao: 'APROVAR',
        observacao: 'Test',
      }, user);

      // Assert
      expect(result.status).toBe('PRESENTE');
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
    });

    it('should throw 409 when presence already decided', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce(mockPresenca.presente()); // already PRESENTE

      // Act & Assert
      await expect(service.decidirPresenca('presenca-id', {
        decisao: 'APROVAR',
      }, user)).rejects.toThrow(ConflictException);
    });

    it('should throw 404 when presence not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.decidirPresenca('invalid-id', {
        decisao: 'APROVAR',
      }, user)).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 when presence belongs to different academia', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce(mockPresenca.pendente({
        academia_id: 'different-academia',
      }));

      // Act & Assert
      await expect(service.decidirPresenca('presenca-id', {
        decisao: 'APROVAR',
      }, user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('decidirLote', () => {
    const user = mockUser.staff();

    it('should process multiple pendentes at once', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce([ // audit columns
          { column_name: 'decidido_em' },
          { column_name: 'decidido_por' },
        ])
        .mockResolvedValueOnce([ // select presencas
          mockPresenca.pendente({ id: 'p1' }),
          mockPresenca.pendente({ id: 'p2' }),
        ])
        .mockResolvedValueOnce([ // update returning
          mockPresenca.presente({ id: 'p1' }),
          mockPresenca.presente({ id: 'p2' }),
        ]);

      // Act
      const result = await service.decidirLote({
        ids: ['p1', 'p2'],
        decisao: 'APROVAR',
      }, user);

      // Assert
      expect(result.processados).toBe(2);
      expect(result.atualizados).toContain('p1');
      expect(result.atualizados).toContain('p2');
      expect(result.ignorados).toHaveLength(0);
    });

    it('should ignore already decided presences', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce([]) // audit columns
        .mockResolvedValueOnce([ // select presencas - one already PRESENTE
          mockPresenca.pendente({ id: 'p1' }),
          mockPresenca.presente({ id: 'p2' }),
        ])
        .mockResolvedValueOnce([ // update returning - only p1
          mockPresenca.presente({ id: 'p1' }),
        ]);

      // Act
      const result = await service.decidirLote({
        ids: ['p1', 'p2'],
        decisao: 'APROVAR',
      }, user);

      // Assert
      expect(result.processados).toBe(1);
      expect(result.atualizados).toContain('p1');
      expect(result.ignorados).toContainEqual({ id: 'p2', motivo: 'JA_DECIDIDA' });
    });

    it('should return empty result for empty ids array', async () => {
      // Act
      const result = await service.decidirLote({
        ids: [],
        decisao: 'APROVAR',
      }, user);

      // Assert
      expect(result.processados).toBe(0);
      expect(result.atualizados).toHaveLength(0);
      expect(result.ignorados).toHaveLength(0);
    });
  });
});
