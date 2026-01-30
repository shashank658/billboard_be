import { eq, ilike, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, bookings } from '../db/schema/index.js';

export interface CreateCustomerDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  billingAddress?: string;
  gstNumber?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  createdBy?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  billingAddress?: string;
  gstNumber?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
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

class CustomerService {
  async getAllCustomers(options: PaginationOptions) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search, isActive } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(ilike(customers.name, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(customers.isActive, isActive));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'contactPerson':
        orderByColumn = customers.contactPerson;
        break;
      case 'email':
        orderByColumn = customers.email;
        break;
      case 'createdAt':
        orderByColumn = customers.createdAt;
        break;
      default:
        orderByColumn = customers.name;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
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

  async getCustomerById(id: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return customer;
  }

  async createCustomer(data: CreateCustomerDto) {
    const [customer] = await db
      .insert(customers)
      .values({
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        billingAddress: data.billingAddress,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        ifscCode: data.ifscCode,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerDto) {
    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber;
    if (data.panNumber !== undefined) updateData.panNumber = data.panNumber;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.ifscCode !== undefined) updateData.ifscCode = data.ifscCode;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string) {
    // Check if customer has bookings
    const [bookingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.customerId, id));

    if (bookingCount.count > 0) {
      throw new Error('Cannot delete customer with existing bookings');
    }

    await db.delete(customers).where(eq(customers.id, id));
  }

  async getCustomersForDropdown() {
    return db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(asc(customers.name));
  }
}

export const customerService = new CustomerService();
