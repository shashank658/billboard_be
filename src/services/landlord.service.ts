import { eq, ilike, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { landlords, billboards } from '../db/schema/index.js';

// Types
export type PaymentFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface CreateLandlordDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  agreementDetails?: string;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  createdBy?: string;
}

export interface UpdateLandlordDto {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  agreementDetails?: string;
  rentAmount?: number;
  paymentFrequency?: PaymentFrequency;
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

class LandlordService {
  async getAllLandlords(options: PaginationOptions) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search, isActive } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(ilike(landlords.name, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(landlords.isActive, isActive));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'contactPerson':
        orderByColumn = landlords.contactPerson;
        break;
      case 'rentAmount':
        orderByColumn = landlords.rentAmount;
        break;
      case 'createdAt':
        orderByColumn = landlords.createdAt;
        break;
      default:
        orderByColumn = landlords.name;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(landlords)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(landlords)
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

  async getLandlordById(id: string) {
    const [landlord] = await db
      .select()
      .from(landlords)
      .where(eq(landlords.id, id))
      .limit(1);
    return landlord;
  }

  async createLandlord(data: CreateLandlordDto) {
    const [landlord] = await db
      .insert(landlords)
      .values({
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        ifscCode: data.ifscCode,
        agreementDetails: data.agreementDetails,
        rentAmount: String(data.rentAmount),
        paymentFrequency: data.paymentFrequency,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return landlord;
  }

  async updateLandlord(id: string, data: UpdateLandlordDto) {
    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.ifscCode !== undefined) updateData.ifscCode = data.ifscCode;
    if (data.agreementDetails !== undefined) updateData.agreementDetails = data.agreementDetails;
    if (data.rentAmount !== undefined) updateData.rentAmount = String(data.rentAmount);
    if (data.paymentFrequency !== undefined) updateData.paymentFrequency = data.paymentFrequency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [landlord] = await db
      .update(landlords)
      .set(updateData)
      .where(eq(landlords.id, id))
      .returning();
    return landlord;
  }

  async deleteLandlord(id: string) {
    // Check if landlord has billboards
    const [billboardCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(billboards)
      .where(eq(billboards.landlordId, id));

    if (billboardCount.count > 0) {
      throw new Error('Cannot delete landlord with existing billboards');
    }

    await db.delete(landlords).where(eq(landlords.id, id));
  }

  async getLandlordsForDropdown() {
    return db
      .select({
        id: landlords.id,
        name: landlords.name,
      })
      .from(landlords)
      .where(eq(landlords.isActive, true))
      .orderBy(asc(landlords.name));
  }
}

export const landlordService = new LandlordService();
