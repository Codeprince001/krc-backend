import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UpdateFcmTokenDto,
} from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findAll(paginationDto, role);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.updateRole(userId, updateRoleDto, adminId);
  }

  @Put(':id/toggle-status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async toggleStatus(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.toggleStatus(userId, adminId);
  }

  @Put('fcm-token')
  async updateFcmToken(
    @CurrentUser('id') userId: string,
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(userId, updateFcmTokenDto);
  }

  @Delete('fcm-token/:token')
  async removeFcmToken(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ) {
    return this.usersService.removeFcmToken(userId, token);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.remove(userId, adminId);
  }
}
