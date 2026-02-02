import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { purchaseOrders, bookings, customers, billboards, campaigns } from '../db/schema/index.js';
import { sequenceService } from './sequence.service.js';
import { bookingService } from './booking.service.js';

export interface CreatePurchaseOrderDto {
  bookingId: string;
  actualStartDate: string;
  actualEndDate: string;
  actualValue?: string; // If not provided, will be calculated with pro-rata
  adjustmentNotes?: string;
  createdBy?: string;
}

export interface UpdatePurchaseOrderDto {
  actualStartDate?: string;
  actualEndDate?: string;
  actualValue?: string;
  adjustmentNotes?: string;
  updatedBy?: string;
}

export interface PurchaseOrderPaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseOrderWithDetails {
  id: string;
  poNumber: string;
  bookingId: string;
  actualStartDate: string;
  actualEndDate: string;
  actualValue: string;
  adjustmentNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  booking: {
    id: string;
    referenceCode: string;
    startDate: string;
    endDate: string;
    actualEndDate?: string | null;
    notionalValue: string;
    status: string;
    slotNumber?: number | null;
    creativeRef?: string | null;
    notes?: string | null;
  };
  customer: {
    id: string;
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    gstNumber?: string | null;
    panNumber?: string | null;
  } | null;
  billboard: {
    id: string;
    name: string;
    code: string;
    type: string;
    address?: string | null;
    ratePerDay?: string;
  } | null;
  campaign?: {
    id: string;
    name: string;
    referenceCode: string;
  } | null;
}

class PurchaseOrderService {
  async getAllPurchaseOrders(options: PurchaseOrderPaginationOptions) {
    const { page, pageSize, sortBy = 'createdAt', sortOrder = 'desc', customerId, search, dateFrom, dateTo } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (customerId) {
      conditions.push(eq(bookings.customerId, customerId));
    }
    if (search) {
      conditions.push(
        sql`(${purchaseOrders.poNumber} ILIKE ${'%' + search + '%'} OR ${bookings.referenceCode} ILIKE ${'%' + search + '%'})`
      );
    }
    if (dateFrom) {
      conditions.push(gte(purchaseOrders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(purchaseOrders.createdAt, new Date(dateTo)));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'poNumber':
        orderByColumn = purchaseOrders.poNumber;
        break;
      case 'actualValue':
        orderByColumn = purchaseOrders.actualValue;
        break;
      case 'actualStartDate':
        orderByColumn = purchaseOrders.actualStartDate;
        break;
      case 'actualEndDate':
        orderByColumn = purchaseOrders.actualEndDate;
        break;
      default:
        orderByColumn = purchaseOrders.createdAt;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          purchaseOrder: purchaseOrders,
          booking: {
            id: bookings.id,
            referenceCode: bookings.referenceCode,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            actualEndDate: bookings.actualEndDate,
            notionalValue: bookings.notionalValue,
            status: bookings.status,
          },
          customer: {
            id: customers.id,
            name: customers.name,
            contactPerson: customers.contactPerson,
          },
          billboard: {
            id: billboards.id,
            name: billboards.name,
            code: billboards.code,
            type: billboards.type,
          },
          campaign: {
            id: campaigns.id,
            name: campaigns.name,
            referenceCode: campaigns.referenceCode,
          },
        })
        .from(purchaseOrders)
        .innerJoin(bookings, eq(purchaseOrders.bookingId, bookings.id))
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
        .leftJoin(campaigns, eq(bookings.campaignId, campaigns.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .innerJoin(bookings, eq(purchaseOrders.bookingId, bookings.id))
        .where(whereCondition),
    ]);

    return {
      data: data.map(row => ({
        ...row.purchaseOrder,
        booking: row.booking,
        customer: row.customer,
        billboard: row.billboard,
        campaign: row.campaign,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize),
      },
    };
  }

  async getPurchaseOrderById(id: string) {
    const [result] = await db
      .select({
        purchaseOrder: purchaseOrders,
        booking: {
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          startDate: bookings.startDate,
          endDate: bookings.endDate,
          actualEndDate: bookings.actualEndDate,
          notionalValue: bookings.notionalValue,
          status: bookings.status,
          slotNumber: bookings.slotNumber,
          creativeRef: bookings.creativeRef,
          notes: bookings.notes,
        },
        customer: {
          id: customers.id,
          name: customers.name,
          contactPerson: customers.contactPerson,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          gstNumber: customers.gstNumber,
          panNumber: customers.panNumber,
        },
        billboard: {
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
          type: billboards.type,
          address: billboards.address,
          ratePerDay: billboards.ratePerDay,
        },
        campaign: {
          id: campaigns.id,
          name: campaigns.name,
          referenceCode: campaigns.referenceCode,
        },
      })
      .from(purchaseOrders)
      .innerJoin(bookings, eq(purchaseOrders.bookingId, bookings.id))
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .leftJoin(campaigns, eq(bookings.campaignId, campaigns.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!result) return null;

    return {
      ...result.purchaseOrder,
      booking: result.booking,
      customer: result.customer,
      billboard: result.billboard,
      campaign: result.campaign,
    };
  }

  async getPurchaseOrderByBookingId(bookingId: string) {
    const [result] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.bookingId, bookingId))
      .limit(1);

    return result || null;
  }

  async createPurchaseOrder(data: CreatePurchaseOrderDto) {
    // Get booking details
    const booking = await bookingService.getBookingById(data.bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if PO already exists for this booking
    const existingPO = await this.getPurchaseOrderByBookingId(data.bookingId);
    if (existingPO) {
      throw new Error('Purchase order already exists for this booking');
    }

    // Validate booking status - should be completed or confirmed/active to generate PO
    const validStatuses = ['completed', 'confirmed', 'active'];
    if (!validStatuses.includes(booking.status)) {
      throw new Error(`Cannot generate PO for booking in "${booking.status}" status. Booking must be completed first.`);
    }

    // Calculate actual value with pro-rata adjustment if not provided
    let actualValue = data.actualValue;
    if (!actualValue && booking.billboard) {
      const actualStartDate = new Date(data.actualStartDate);
      const actualEndDate = new Date(data.actualEndDate);
      const actualDays = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const rate = parseFloat(booking.billboard.ratePerDay);
      actualValue = (rate * actualDays).toFixed(2);
    }

    // Generate PO number
    const poNumber = await sequenceService.getNextSequence('po');

    // Create the purchase order
    const [purchaseOrder] = await db
      .insert(purchaseOrders)
      .values({
        poNumber,
        bookingId: data.bookingId,
        actualStartDate: data.actualStartDate,
        actualEndDate: data.actualEndDate,
        actualValue: actualValue || '0',
        adjustmentNotes: data.adjustmentNotes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    // Update booking status to po_generated
    await bookingService.updateBookingStatus(data.bookingId, 'po_generated', data.createdBy);

    return this.getPurchaseOrderById(purchaseOrder.id);
  }

  async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderDto) {
    const existing = await this.getPurchaseOrderById(id);
    if (!existing) {
      throw new Error('Purchase order not found');
    }

    // Check if invoice exists - can't modify PO if invoiced
    // TODO: Add invoice check when invoice module is implemented

    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.actualValue !== undefined) updateData.actualValue = data.actualValue;
    if (data.adjustmentNotes !== undefined) updateData.adjustmentNotes = data.adjustmentNotes;

    await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id));

    return this.getPurchaseOrderById(id);
  }

  async deletePurchaseOrder(id: string, updatedBy?: string) {
    const purchaseOrder = await this.getPurchaseOrderById(id);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // TODO: Check if invoice exists - can't delete PO if invoiced

    // Revert booking status to completed
    await bookingService.updateBookingStatus(purchaseOrder.booking.id, 'completed', updatedBy);

    // Delete the purchase order
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async getBookingsEligibleForPO(customerId?: string) {
    // Get bookings that are completed/confirmed/active and don't have a PO yet
    const conditions = [
      sql`${bookings.status} IN ('completed', 'confirmed', 'active')`,
      sql`NOT EXISTS (SELECT 1 FROM ${purchaseOrders} WHERE ${purchaseOrders.bookingId} = ${bookings.id})`,
    ];

    if (customerId) {
      conditions.push(eq(bookings.customerId, customerId));
    }

    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        actualEndDate: bookings.actualEndDate,
        notionalValue: bookings.notionalValue,
        status: bookings.status,
        slotNumber: bookings.slotNumber,
        customer: {
          id: customers.id,
          name: customers.name,
        },
        billboard: {
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
          type: billboards.type,
          ratePerDay: billboards.ratePerDay,
        },
        campaign: {
          id: campaigns.id,
          name: campaigns.name,
          referenceCode: campaigns.referenceCode,
        },
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .leftJoin(campaigns, eq(bookings.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.endDate));

    return data;
  }

  async calculateProRataValue(bookingId: string, actualStartDate: string, actualEndDate: string) {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking || !booking.billboard) {
      throw new Error('Booking or billboard not found');
    }

    const originalStartDate = new Date(booking.startDate);
    const originalEndDate = new Date(booking.endDate);
    const actualStart = new Date(actualStartDate);
    const actualEnd = new Date(actualEndDate);

    const originalDays = Math.ceil((originalEndDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const actualDays = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const rate = parseFloat(booking.billboard.ratePerDay);
    const notionalValue = parseFloat(booking.notionalValue);
    const actualValue = rate * actualDays;
    const adjustment = actualValue - notionalValue;

    return {
      originalDays,
      actualDays,
      ratePerDay: rate,
      notionalValue,
      actualValue,
      adjustment,
      adjustmentPercentage: ((adjustment / notionalValue) * 100).toFixed(2),
    };
  }
}

export const purchaseOrderService = new PurchaseOrderService();
