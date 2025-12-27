import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/users')
  getUserAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getUserAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/revenue')
  getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getRevenueAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/content')
  getContentAnalytics() {
    return this.adminService.getContentAnalytics();
  }

  @Get('analytics/community')
  getCommunityAnalytics() {
    return this.adminService.getCommunityAnalytics();
  }

  @Get('system/health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('activity-log')
  getActivityLog(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.getActivityLog(page, limit);
  }
}
