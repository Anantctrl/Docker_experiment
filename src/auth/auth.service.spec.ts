import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'MEMBER' as const,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      } as any,
      session: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      } as any,
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const defaults: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
          BCRYPT_SALT_ROUNDS: '12',
        };
        return defaults[key] ?? defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a new user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user',
      email: 'new@example.com',
    });

    const dto: RegisterDto = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
    };

    const result = await service.register(dto);

    expect(result.email).toBe('new@example.com');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('should throw ConflictException if email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'wrong',
    };

    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });
});
