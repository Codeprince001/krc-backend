import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateBookDto,
  UpdateBookDto,
  CreateBookCategoryDto,
  UpdateBookCategoryDto,
  SearchBooksDto,
} from './dto';
import { PaginationDto, createPaginationMeta } from '../common/dto';
import { SlugHelper } from '../common/utils';

@Injectable()
export class BooksService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== BOOKS ====================

  async create(dto: CreateBookDto) {
    // Validate category exists
    const category = await this.db.bookCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check ISBN uniqueness
    if (dto.isbn) {
      const existing = await this.db.book.findUnique({
        where: { isbn: dto.isbn },
      });
      if (existing) {
        throw new ConflictException('Book with this ISBN already exists');
      }
    }

    // Generate slug
    const slug = SlugHelper.generateUnique(dto.title, Date.now().toString());

    const book = await this.db.book.create({
      data: {
        ...dto,
        slug,
        publishedDate: dto.publishedDate
          ? new Date(dto.publishedDate)
          : undefined,
      },
      include: {
        category: true,
      },
    });

    return {
      message: 'Book created successfully',
      book,
    };
  }

  async findAll(paginationDto: PaginationDto, searchDto?: SearchBooksDto) {
    const { skip, limit, page } = paginationDto;

    const where: any = { deletedAt: null, isActive: true };

    if (searchDto?.search) {
      where.OR = [
        { title: { contains: searchDto.search, mode: 'insensitive' } },
        { author: { contains: searchDto.search, mode: 'insensitive' } },
        { description: { contains: searchDto.search, mode: 'insensitive' } },
      ];
    }

    if (searchDto?.categoryId) {
      where.categoryId = searchDto.categoryId;
    }

    if (searchDto?.isFeatured !== undefined) {
      where.isFeatured = searchDto.isFeatured;
    }

    if (searchDto?.isDigital !== undefined) {
      where.isDigital = searchDto.isDigital;
    }

    if (searchDto?.minPrice !== undefined || searchDto?.maxPrice !== undefined) {
      where.price = {};
      if (searchDto.minPrice !== undefined) {
        where.price.gte = searchDto.minPrice;
      }
      if (searchDto.maxPrice !== undefined) {
        where.price.lte = searchDto.maxPrice;
      }
    }

    const orderBy: any = {};
    const sortBy = searchDto?.sortBy || 'createdAt';
    const order = searchDto?.order || 'desc';
    orderBy[sortBy] = order;

    const [books, total] = await Promise.all([
      this.db.book.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
      }),
      this.db.book.count({ where }),
    ]);

    return {
      data: books,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const book = await this.db.book.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Increment view count
    await this.db.book.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return book;
  }

  async findBySlug(slug: string) {
    const book = await this.db.book.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: {
        category: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Increment view count
    await this.db.book.update({
      where: { id: book.id },
      data: { viewCount: { increment: 1 } },
    });

    return book;
  }

  async update(id: string, dto: UpdateBookDto) {
    const book = await this.db.book.findFirst({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.db.bookCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Check ISBN uniqueness if changed
    if (dto.isbn && dto.isbn !== book.isbn) {
      const existing = await this.db.book.findFirst({
        where: { isbn: dto.isbn, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Book with this ISBN already exists');
      }
    }

    // Update slug if title changed
    let slug = book.slug;
    if (dto.title && dto.title !== book.title) {
      slug = SlugHelper.generateUnique(dto.title, Date.now().toString());
    }

    const updatedBook = await this.db.book.update({
      where: { id },
      data: {
        ...dto,
        slug,
        publishedDate: dto.publishedDate
          ? new Date(dto.publishedDate)
          : undefined,
      },
      include: {
        category: true,
      },
    });

    return {
      message: 'Book updated successfully',
      book: updatedBook,
    };
  }

  async remove(id: string) {
    const book = await this.db.book.findFirst({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.db.book.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Book deleted successfully',
    };
  }

  async updateStock(id: string, quantity: number) {
    const book = await this.db.book.findFirst({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const updatedBook = await this.db.book.update({
      where: { id },
      data: {
        stockQuantity: Math.max(0, book.stockQuantity + quantity),
      },
    });

    return {
      message: 'Stock updated successfully',
      book: updatedBook,
    };
  }

  async getFeatured(limit: number = 10) {
    const books = await this.db.book.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        deletedAt: null,
      },
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { soldCount: 'desc' },
    });

    return books;
  }

  async getTopSelling(limit: number = 10) {
    const books = await this.db.book.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { soldCount: 'desc' },
    });

    return books;
  }

  // ==================== CATEGORIES ====================

  async createCategory(dto: CreateBookCategoryDto) {
    const slug = SlugHelper.generate(dto.name);

    const existing = await this.db.bookCategory.findFirst({
      where: {
        OR: [{ name: dto.name }, { slug }],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = await this.db.bookCategory.create({
      data: {
        ...dto,
        slug,
      },
    });

    return {
      message: 'Category created successfully',
      category,
    };
  }

  async findAllCategories() {
    const categories = await this.db.bookCategory.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        _count: {
          select: { books: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return categories;
  }

  async findCategory(id: string) {
    const category = await this.db.bookCategory.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { books: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, dto: UpdateBookCategoryDto) {
    const category = await this.db.bookCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Update slug if name changed
    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = SlugHelper.generate(dto.name);

      const existing = await this.db.bookCategory.findFirst({
        where: {
          OR: [{ name: dto.name }, { slug }],
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.db.bookCategory.update({
      where: { id },
      data: { ...dto, slug },
    });

    return {
      message: 'Category updated successfully',
      category: updatedCategory,
    };
  }

  async removeCategory(id: string) {
    const category = await this.db.bookCategory.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { books: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.books > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing books. Please reassign books first.',
      );
    }

    await this.db.bookCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Category deleted successfully',
    };
  }

  async getStats() {
    const [total, active, featured, digital, outOfStock, totalSales] =
      await Promise.all([
        this.db.book.count({ where: { deletedAt: null } }),
        this.db.book.count({ where: { isActive: true, deletedAt: null } }),
        this.db.book.count({
          where: { isFeatured: true, deletedAt: null },
        }),
        this.db.book.count({ where: { isDigital: true, deletedAt: null } }),
        this.db.book.count({
          where: { stockQuantity: 0, isDigital: false, deletedAt: null },
        }),
        this.db.book.aggregate({
          where: { deletedAt: null },
          _sum: { soldCount: true },
        }),
      ]);

    return {
      total,
      active,
      featured,
      digital,
      outOfStock,
      totalSales: totalSales._sum.soldCount || 0,
    };
  }
}
