import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UpdateFcmTokenDto,
} from './dto';
import { PasswordHelper } from '../common/utils';
import { PaginationDto, createPaginationMeta } from '../common/dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(paginationDto: PaginationDto, role?: UserRole) {
    const { skip, limit, page } = paginationDto;

    const where = role ? { role, deletedAt: null } : { deletedAt: null };

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          role: true,
          phoneNumber: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      data: users,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const user = await this.db.user.findFirst({
      where: { id, deletedAt: null },
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
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check if phone number is already taken
    if (dto.phoneNumber) {
      const existingUser = await this.db.user.findFirst({
        where: {
          phoneNumber: dto.phoneNumber,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new ConflictException('Phone number already in use');
      }
    }

    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
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
        updatedAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    // Verify current password
    const isValid = await PasswordHelper.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await PasswordHelper.hash(dto.newPassword);

    await this.db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens to force re-login
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'Password changed successfully. Please login again.',
    };
  }

  async updateRole(userId: string, dto: UpdateUserRoleDto, adminId: string) {
    // Check if admin is trying to modify themselves
    if (userId === adminId) {
      throw new ForbiddenException('Cannot modify your own role');
    }

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return {
      message: 'User role updated successfully',
      user: updatedUser,
    };
  }

  async toggleStatus(userId: string, adminId: string) {
    // Check if admin is trying to modify themselves
    if (userId === adminId) {
      throw new ForbiddenException('Cannot modify your own status');
    }

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return {
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser,
    };
  }

  async updateFcmToken(userId: string, dto: UpdateFcmTokenDto) {
    // Check if token already exists
    const existingToken = await this.db.fcmToken.findUnique({
      where: { token: dto.token },
    });

    if (existingToken) {
      // Update existing token
      await this.db.fcmToken.update({
        where: { token: dto.token },
        data: {
          userId,
          device: dto.device,
        },
      });
    } else {
      // Create new token
      await this.db.fcmToken.create({
        data: {
          userId,
          token: dto.token,
          device: dto.device,
        },
      });
    }

    return {
      message: 'FCM token updated successfully',
    };
  }

  async removeFcmToken(userId: string, token: string) {
    await this.db.fcmToken.deleteMany({
      where: {
        userId,
        token,
      },
    });

    return {
      message: 'FCM token removed successfully',
    };
  }

  async remove(userId: string, adminId: string) {
    // Check if admin is trying to delete themselves
    if (userId === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  async getStats() {
    const [total, active, verified, byRole] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null } }),
      this.db.user.count({ where: { isActive: true, deletedAt: null } }),
      this.db.user.count({ where: { isVerified: true, deletedAt: null } }),
      this.db.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      verified,
      byRole: byRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
