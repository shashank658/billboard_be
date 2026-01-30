import { eq, ilike, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taxes } from '../db/schema/index.js';

export interface CreateTaxDto {
  name: string;
  percentage: number;
  hsnSacCode?: string;
  description?: string;
  createdBy?: string;
}

export interface UpdateTaxDto {
  name?: string;
  percentage?: number;
  hsnSacCode?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

class TaxService {
  async getAllTaxes(options: PaginationOptions) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search, isActive } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(ilike(taxes.name, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(taxes.isActive, isActive));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'percentage':
        orderByColumn = taxes.percentage;
        break;
      case 'hsnSacCode':
        orderByColumn = taxes.hsnSacCode;
        break;
      case 'createdAt':
        orderByColumn = taxes.createdAt;
        break;
      default:
        orderByColumn = taxes.name;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(taxes)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(taxes)
        .where(whereCondition),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize),
      },
    };
  }

  async getTaxById(id: string) {
    const [tax] = await db
      .select()
      .from(taxes)
      .where(eq(taxes.id, id))
      .limit(1);
    return tax;
  }

  async createTax(data: CreateTaxDto) {
    const [tax] = await db
      .insert(taxes)
      .values({
        name: data.name,
        percentage: String(data.percentage),
        hsnSacCode: data.hsnSacCode,
        description: data.description,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return tax;
  }

  async updateTax(id: string, data: UpdateTaxDto) {
    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.percentage !== undefined) updateData.percentage = String(data.percentage);
    if (data.hsnSacCode !== undefined) updateData.hsnSacCode = data.hsnSacCode;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [tax] = await db
      .update(taxes)
      .set(updateData)
      .where(eq(taxes.id, id))
      .returning();
    return tax;
  }

  async deleteTax(id: string) {
    // TODO: Check if tax is used in any invoices before deleting
    await db.delete(taxes).where(eq(taxes.id, id));
  }

  async getTaxesForDropdown() {
    return db
      .select({
        id: taxes.id,
        name: taxes.name,
        percentage: taxes.percentage,
      })
      .from(taxes)
      .where(eq(taxes.isActive, true))
      .orderBy(asc(taxes.name));
  }
}

export const taxService = new TaxService();
