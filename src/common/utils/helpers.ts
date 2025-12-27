import * as bcrypt from 'bcrypt';

export class PasswordHelper {
  private static readonly SALT_ROUNDS = 10;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export class SlugHelper {
  static generate(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static generateUnique(text: string, suffix?: string): string {
    const baseSlug = this.generate(text);
    return suffix ? `${baseSlug}-${suffix}` : baseSlug;
  }
}

export class OrderNumberHelper {
  static generate(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
}

export class DateHelper {
  static isWednesday(date: Date): boolean {
    return date.getDay() === 3;
  }

  static getNextWednesday(from: Date = new Date()): Date {
    const date = new Date(from);
    const daysUntilWednesday = (3 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilWednesday);
    return date;
  }

  static getSundayOfWeek(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
