import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BooksService } from './books.service';
import {
  CreateBookDto,
  UpdateBookDto,
  CreateBookCategoryDto,
  UpdateBookCategoryDto,
  SearchBooksDto,
} from './dto';
import { Public, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto';
import { UserRole } from '@prisma/client';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // ==================== BOOKS ====================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  async create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Public()
  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() searchDto: SearchBooksDto,
  ) {
    return this.booksService.findAll(paginationDto, searchDto);
  }

  @Public()
  @Get('featured')
  async getFeatured(@Query('limit') limit?: number) {
    return this.booksService.getFeatured(limit);
  }

  @Public()
  @Get('top-selling')
  async getTopSelling(@Query('limit') limit?: number) {
    return this.booksService.getTopSelling(limit);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats() {
    return this.booksService.getStats();
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(id, updateBookDto);
  }

  @Put(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.booksService.updateStock(id, quantity);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  // ==================== CATEGORIES ====================

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  async createCategory(@Body() createCategoryDto: CreateBookCategoryDto) {
    return this.booksService.createCategory(createCategoryDto);
  }

  @Public()
  @Get('categories/list')
  async findAllCategories() {
    return this.booksService.findAllCategories();
  }

  @Public()
  @Get('categories/:id')
  async findCategory(@Param('id') id: string) {
    return this.booksService.findCategory(id);
  }

  @Put('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.WORKER)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateBookCategoryDto,
  ) {
    return this.booksService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async removeCategory(@Param('id') id: string) {
    return this.booksService.removeCategory(id);
  }
}
