import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { EmailService } from '../email/email.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findUserByEmail: jest.fn(),
            findAcademiaByCode: jest.fn(),
            createUserWithRoleAndMatricula: jest.fn(),
            createPasswordResetToken: jest.fn(),
            markInviteAsUsed: jest.fn(),
            findInviteByToken: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue({ success: true }),
            sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);
  });

  describe('forgotPassword', () => {
    const dto = { email: 'test@example.com' };

    it('should generate OTP and call emailService.sendOtpEmail if user exists', async () => {
      // Arrange
      const user = { id: 'user-id', email: dto.email };
      authRepository.findUserByEmail.mockResolvedValue(user as any);
      authRepository.createPasswordResetToken.mockResolvedValue({ id: 'token-id' } as any);

      // Act
      const result = await service.forgotPassword(dto);

      // Assert
      expect(authRepository.findUserByEmail).toHaveBeenCalledWith(dto.email);
      expect(authRepository.createPasswordResetToken).toHaveBeenCalled();
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(dto.email, expect.any(String));
      expect(result.message).toContain('Se o email existir');
    });

    it('should NOT call emailService if user does not exist (security)', async () => {
      // Arrange
      authRepository.findUserByEmail.mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword(dto);

      // Assert
      expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('Se o email existir');
    });
  });

  describe('signup', () => {
    const signupDto = {
      nomeCompleto: 'Test User',
      email: 'new@example.com',
      senha: 'password123',
      codigoAcademia: 'CODE123',
      aceitouTermos: true,
    };

    it('should create user and call emailService.sendWelcomeEmail', async () => {
      // Arrange
      const academia = { id: 'acad-id', nome: 'Academia Teste', codigo: 'CODE123' };
      authRepository.findAcademiaByCode.mockResolvedValue(academia);
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUserWithRoleAndMatricula.mockResolvedValue({
        usuario_id: 'new-user-id',
        academia_id: 'acad-id',
        numero_matricula: 1,
      } as any);

      // Act
      await service.signup(signupDto);

      // Assert
      expect(authRepository.createUserWithRoleAndMatricula).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        signupDto.email,
        signupDto.nomeCompleto,
        academia.nome,
      );
    });

    it('should throw if email already registered', async () => {
      // Arrange
      authRepository.findAcademiaByCode.mockResolvedValue({ id: 'acad-id' } as any);
      authRepository.findUserByEmail.mockResolvedValue({ id: 'existing' } as any);

      // Act & Assert
      await expect(service.signup(signupDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('register (via invite)', () => {
    const registerDto = {
      codigoConvite: 'INVITE123',
      email: 'invited@example.com',
      senha: 'password123',
      nomeCompleto: 'Invited User',
      aceitouTermos: true,
    };

    it('should register user and call emailService.sendWelcomeEmail', async () => {
      // Arrange
      const invite = {
        id: 'invite-id',
        email: 'invited@example.com',
        academia_id: 'acad-id',
        academia_nome: 'Academia Teste',
        papel_sugerido: UserRole.ALUNO,
      };
      authRepository.findInviteByToken.mockResolvedValue(invite as any);
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUserWithRoleAndMatricula.mockResolvedValue({
        usuario_id: 'invited-user-id',
        academia_id: 'acad-id',
        numero_matricula: 2,
      } as any);

      // Act
      await service.register(registerDto);

      // Assert
      expect(authRepository.createUserWithRoleAndMatricula).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.nomeCompleto,
        invite.academia_nome,
      );
      expect(authRepository.markInviteAsUsed).toHaveBeenCalledWith('invite-id', 'invited-user-id');
    });
  });
});
