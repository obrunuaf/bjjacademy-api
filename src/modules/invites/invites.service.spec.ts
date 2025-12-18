import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('InvitesService', () => {
  let service: InvitesService;
  let databaseService: jest.Mocked<DatabaseService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = { id: 'staff-id', academiaId: 'acad-id' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
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
            sendInviteEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
    databaseService = module.get(DatabaseService);
    emailService = module.get(EmailService);
  });

  describe('criar', () => {
    it('should generate token, save to db and send email', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue({ nome: 'Academia Teste' });
      const dto = { email: 'convidado@teste.com', roleSugerido: UserRole.ALUNO };

      // Act
      const result = await service.criar(dto as any, mockUser);

      // Assert
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT nome FROM academias'),
        [mockUser.academiaId]
      );
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO convites'),
        [mockUser.academiaId, dto.email, expect.any(String), dto.roleSugerido, expect.any(Date)]
      );
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith(
        dto.email,
        'Academia Teste',
        expect.stringContaining(result.codigo)
      );
      expect(result.codigo).toBeDefined();
    });

    it('should throw BadRequestException if academia not found', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue(null);
      const dto = { email: 'convidado@teste.com', roleSugerido: UserRole.ALUNO };

      // Act & Assert
      await expect(service.criar(dto as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should NOT send email if email is not provided', async () => {
      // Arrange
      databaseService.queryOne.mockResolvedValue({ nome: 'Academia Teste' });
      const dto = { roleSugerido: UserRole.ALUNO };

      // Act
      await service.criar(dto as any, mockUser);

      // Assert
      expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
    });
  });
});
