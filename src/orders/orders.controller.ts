import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  ProcessPaymentDto,
  QueryOrdersDto,
} from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PASTOR)
  findAll(
    @Query() query: QueryOrdersDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ordersService.findAll(query, page, limit);
  }

  @Get('my-orders')
  findMyOrders(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ordersService.findAllByUser(userId, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/process-payment')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  processPayment(
    @Param('id') id: string,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    return this.ordersService.processPayment(id, processPaymentDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancel(id, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
