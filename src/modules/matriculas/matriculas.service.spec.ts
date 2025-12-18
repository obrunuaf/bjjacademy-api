import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MatriculasService } from './matriculas.service';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';
import { DecisaoMatriculaEnum } from './dtos/decisao-matricula.dto';

describe('MatriculasService', () => {
  let service: MatriculasService;
  let databaseService: jest.Mocked<DatabaseService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = { id: 'staff-id', academiaId: 'acad-id' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatriculasService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMatriculaAprovadaEmail: jest.fn().mockResolvedValue({ success: true }),
            sendMatriculaRejeitadaEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<MatriculasService>(MatriculasService);
    databaseService = module.get(DatabaseService);
    emailService = module.get(EmailService);
  });

  describe('decidir', () => {
    const matriculaId = 'mat-id';
    const matriculaBase = {
      id: matriculaId,
      usuario_id: 'user-id',
      status: 'PENDENTE',
      academia_id: 'acad-id',
      aluno_nome: 'Aluno Teste',
      aluno_email: 'aluno@teste.com',
      academia_nome: 'Academia Teste',
    };

    it('should approve enrollment and send email', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue(matriculaBase);
      const dto = { decisao: DecisaoMatriculaEnum.APROVAR, faixaInicialSlug: 'branca' };

      // Act
      const result = await service.decidir(matriculaId, dto, mockUser);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matriculas SET status = $1'),
        ['ATIVA', matriculaId]
      );
      expect(emailService.sendMatriculaAprovadaEmail).toHaveBeenCalledWith(
        matriculaBase.aluno_email,
        matriculaBase.aluno_nome,
        matriculaBase.academia_nome
      );
      expect(result.status).toBe('ATIVA');
    });

    it('should reject enrollment and send email with reason', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue(matriculaBase);
      const dto = { decisao: DecisaoMatriculaEnum.REJEITAR, motivoRejeicao: 'Documentacao incompleta' };

      // Act
      const result = await service.decidir(matriculaId, dto, mockUser);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matriculas SET status = $1'),
        ['INATIVA', matriculaId]
      );
      expect(emailService.sendMatriculaRejeitadaEmail).toHaveBeenCalledWith(
        matriculaBase.aluno_email,
        matriculaBase.aluno_nome,
        matriculaBase.academia_nome,
        dto.motivoRejeicao
      );
      expect(result.status).toBe('INATIVA');
    });

    it('should throw NotFoundException if matricula not found', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue(null);
      const dto = { decisao: DecisaoMatriculaEnum.APROVAR };

      // Act & Assert
      await expect(service.decidir(matriculaId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if academiaId does not match', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue({ ...matriculaBase, academia_id: 'other-acad' });
      const dto = { decisao: DecisaoMatriculaEnum.APROVAR };

      // Act & Assert
      await expect(service.decidir(matriculaId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not PENDENTE', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue({ ...matriculaBase, status: 'ATIVA' });
      const dto = { decisao: DecisaoMatriculaEnum.APROVAR };

      // Act & Assert
      await expect(service.decidir(matriculaId, dto, mockUser)).rejects.toThrow(BadRequestException);
    });
  });
});
