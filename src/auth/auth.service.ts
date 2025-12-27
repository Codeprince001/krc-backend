import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { PasswordHelper } from '../common/utils';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { AuthProvider, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.db.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phoneNumber ? [{ phoneNumber: dto.phoneNumber }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await PasswordHelper.hash(dto.password);

    // Create user
    const user = await this.db.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        gender: dto.gender,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.MEMBER,
        isVerified: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        role: true,
        phoneNumber: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      message: 'Registration successful',
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Validate user credentials
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await PasswordHelper.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists in database
      const storedToken = await this.db.refreshToken.findFirst({
        where: {
          token: dto.refreshToken,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gte: new Date() },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Revoke old refresh token
      await this.db.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async googleAuth(googleUser: any) {
    // Check if user exists with Google ID
    let user = await this.db.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    // If not, check by email
    if (!user) {
      user = await this.db.user.findUnique({
        where: { email: googleUser.email.toLowerCase() },
      });

      // If user exists with email but no Google ID, link accounts
      if (user) {
        user = await this.db.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatar: user.avatar || googleUser.avatar,
            authProvider: AuthProvider.GOOGLE,
          },
        });
      }
    }

    // If user doesn't exist, create new user
    if (!user) {
      user = await this.db.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          googleId: googleUser.googleId,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          displayName: `${googleUser.firstName} ${googleUser.lastName}`,
          avatar: googleUser.avatar,
          authProvider: AuthProvider.GOOGLE,
          isVerified: true, // Google accounts are pre-verified
          role: UserRole.MEMBER,
          isActive: true,
        },
      });
    }

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Google authentication successful',
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      await this.db.refreshToken.updateMany({
        where: {
          userId,
          token: refreshToken,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      // Revoke all user's refresh tokens
      await this.db.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      message: 'Logout successful',
    };
  }

  async getProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        phoneNumber: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        country: true,
        role: true,
        authProvider: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    // Store refresh token in database
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days

    await this.db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: expirationDate,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
