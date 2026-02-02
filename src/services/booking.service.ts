import { eq, and, desc, asc, sql, gte, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, billboards, customers, campaigns } from '../db/schema/index.js';
import { sequenceService } from './sequence.service.js';

export interface CreateBookingDto {
  customerId: string;
  billboardId: string;
  campaignId?: string;
  slotNumber?: number;
  startDate: string;
  endDate: string;
  notionalValue?: string;
  creativeRef?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateBookingDto {
  customerId?: string;
  billboardId?: string;
  campaignId?: string | null;
  slotNumber?: number | null;
  startDate?: string;
  endDate?: string;
  notionalValue?: string;
  status?: string;
  creativeRef?: string;
  notes?: string;
  updatedBy?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  billboardId?: string;
  status?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface AvailabilityQuery {
  billboardId: string;
  startDate: string;
  endDate: string;
  slotNumber?: number;
  excludeBookingId?: string;
}

class BookingService {
  async getAllBookings(options: PaginationOptions) {
    const { page, pageSize, sortBy = 'createdAt', sortOrder = 'desc', customerId, billboardId, status, startDateFrom, startDateTo } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (customerId) {
      conditions.push(eq(bookings.customerId, customerId));
    }
    if (billboardId) {
      conditions.push(eq(bookings.billboardId, billboardId));
    }
    if (status) {
      conditions.push(eq(bookings.status, status));
    }
    if (startDateFrom) {
      conditions.push(gte(bookings.startDate, startDateFrom));
    }
    if (startDateTo) {
      conditions.push(lte(bookings.startDate, startDateTo));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'startDate':
        orderByColumn = bookings.startDate;
        break;
      case 'endDate':
        orderByColumn = bookings.endDate;
        break;
      case 'referenceCode':
        orderByColumn = bookings.referenceCode;
        break;
      case 'status':
        orderByColumn = bookings.status;
        break;
      default:
        orderByColumn = bookings.createdAt;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          booking: bookings,
          customer: {
            id: customers.id,
            name: customers.name,
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
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
        .leftJoin(campaigns, eq(bookings.campaignId, campaigns.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(whereCondition),
    ]);

    return {
      data: data.map(row => ({
        ...row.booking,
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

  async getBookingById(id: string) {
    const [result] = await db
      .select({
        booking: bookings,
        customer: {
          id: customers.id,
          name: customers.name,
          contactPerson: customers.contactPerson,
          email: customers.email,
          phone: customers.phone,
        },
        billboard: {
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
          type: billboards.type,
          ratePerDay: billboards.ratePerDay,
          slotCount: billboards.slotCount,
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
      .where(eq(bookings.id, id))
      .limit(1);

    if (!result) return null;

    return {
      ...result.booking,
      customer: result.customer,
      billboard: result.billboard,
      campaign: result.campaign,
    };
  }

  async checkAvailability(query: AvailabilityQuery): Promise<{ available: boolean; conflicts: Array<{ id: string; referenceCode: string; startDate: string; endDate: string; slotNumber: number | null }> }> {
    const { billboardId, startDate, endDate, slotNumber, excludeBookingId } = query;

    // Get billboard to check if it's digital
    const [billboard] = await db
      .select()
      .from(billboards)
      .where(eq(billboards.id, billboardId))
      .limit(1);

    if (!billboard) {
      throw new Error('Billboard not found');
    }

    // Build conditions for overlapping bookings
    const conditions = [
      eq(bookings.billboardId, billboardId),
      // Overlap: existing.start <= query.end AND existing.end >= query.start
      lte(bookings.startDate, endDate),
      gte(bookings.endDate, startDate),
    ];

    // Exclude current booking if updating
    if (excludeBookingId) {
      conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
    }

    // For digital billboards, only conflict if same slot
    if (billboard.type === 'digital' && slotNumber !== undefined) {
      conditions.push(eq(bookings.slotNumber, slotNumber));
    }

    const conflicts = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        slotNumber: bookings.slotNumber,
      })
      .from(bookings)
      .where(and(...conditions));

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  async createBooking(data: CreateBookingDto) {
    // Check availability first
    const availability = await this.checkAvailability({
      billboardId: data.billboardId,
      startDate: data.startDate,
      endDate: data.endDate,
      slotNumber: data.slotNumber,
    });

    if (!availability.available) {
      throw new Error(`Billboard is not available for the selected dates. Conflicts with: ${availability.conflicts.map(c => c.referenceCode).join(', ')}`);
    }

    // Get billboard rate for notional value calculation if not provided
    let notionalValue = data.notionalValue;
    if (!notionalValue) {
      const [billboard] = await db
        .select()
        .from(billboards)
        .where(eq(billboards.id, data.billboardId))
        .limit(1);

      if (billboard) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const rate = parseFloat(billboard.ratePerDay);
        notionalValue = (rate * days).toFixed(2);
      }
    }

    // Generate reference code
    const referenceCode = await sequenceService.getNextSequence('booking');

    const [booking] = await db
      .insert(bookings)
      .values({
        referenceCode,
        customerId: data.customerId,
        billboardId: data.billboardId,
        campaignId: data.campaignId || null,
        slotNumber: data.slotNumber || null,
        startDate: data.startDate,
        endDate: data.endDate,
        notionalValue: notionalValue || '0',
        creativeRef: data.creativeRef,
        notes: data.notes,
        status: 'created',
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    return this.getBookingById(booking.id);
  }

  async updateBooking(id: string, data: UpdateBookingDto) {
    // Get existing booking first
    const existingBooking = await this.getBookingById(id);
    if (!existingBooking) {
      throw new Error('Booking not found');
    }

    // Prevent editing completed or po_generated bookings
    const nonEditableStatuses = ['completed', 'po_generated', 'invoiced'];
    if (nonEditableStatuses.includes(existingBooking.status)) {
      throw new Error(`Cannot edit booking in "${existingBooking.status}" status. Booking is finalized.`);
    }

    // Check if updating dates/billboard/slot
    if (data.startDate || data.endDate || data.billboardId || data.slotNumber !== undefined) {
      const availability = await this.checkAvailability({
        billboardId: data.billboardId || existingBooking.billboardId,
        startDate: data.startDate || existingBooking.startDate,
        endDate: data.endDate || existingBooking.endDate,
        slotNumber: data.slotNumber !== undefined ? (data.slotNumber ?? undefined) : (existingBooking.slotNumber ?? undefined),
        excludeBookingId: id,
      });

      if (!availability.available) {
        throw new Error(`Billboard is not available for the selected dates. Conflicts with: ${availability.conflicts.map(c => c.referenceCode).join(', ')}`);
      }
    }

    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.billboardId !== undefined) updateData.billboardId = data.billboardId;
    if (data.campaignId !== undefined) updateData.campaignId = data.campaignId;
    if (data.slotNumber !== undefined) updateData.slotNumber = data.slotNumber;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.notionalValue !== undefined) updateData.notionalValue = data.notionalValue;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.creativeRef !== undefined) updateData.creativeRef = data.creativeRef;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id));

    return this.getBookingById(id);
  }

  async deleteBooking(id: string) {
    const booking = await this.getBookingById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Only allow deletion of created bookings
    if (booking.status !== 'created') {
      throw new Error('Only bookings in "created" status can be deleted');
    }

    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async getCalendarBookings(billboardId: string, year: number, month: number) {
    // Get bookings for a specific billboard in a given month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        slotNumber: bookings.slotNumber,
        status: bookings.status,
        customerName: customers.name,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .where(
        and(
          eq(bookings.billboardId, billboardId),
          // Overlap with the month
          lte(bookings.startDate, endDate),
          gte(bookings.endDate, startDate)
        )
      )
      .orderBy(asc(bookings.startDate));

    return data;
  }

  async getBookingsForDateRange(startDate: string, endDate: string, billboardIds?: string[]) {
    const conditions = [
      // Overlap with the date range
      lte(bookings.startDate, endDate),
      gte(bookings.endDate, startDate),
    ];

    if (billboardIds && billboardIds.length > 0) {
      conditions.push(sql`${bookings.billboardId} IN (${sql.raw(billboardIds.map(id => `'${id}'`).join(','))})`);
    }

    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        billboardId: bookings.billboardId,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        slotNumber: bookings.slotNumber,
        status: bookings.status,
        customerName: customers.name,
        billboardName: billboards.name,
        billboardCode: billboards.code,
        billboardType: billboards.type,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .where(and(...conditions))
      .orderBy(asc(bookings.startDate));

    return data;
  }

  async updateBookingStatus(id: string, status: string, updatedBy?: string) {
    const validStatuses = ['created', 'confirmed', 'active', 'completed', 'po_generated', 'invoiced'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const [booking] = await db
      .update(bookings)
      .set({
        status,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    return booking;
  }

  async shortCloseBooking(id: string, actualEndDate: string, reason: string, updatedBy?: string) {
    // Get booking details
    const booking = await this.getBookingById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate booking status - can only short close active or confirmed bookings
    const validStatuses = ['created', 'confirmed', 'active'];
    if (!validStatuses.includes(booking.status)) {
      throw new Error(`Cannot short close booking in "${booking.status}" status. Booking must be in created, confirmed, or active status.`);
    }

    // Validate actual end date is before original end date
    const originalEndDate = new Date(booking.endDate);
    const newEndDate = new Date(actualEndDate);
    const startDate = new Date(booking.startDate);

    if (newEndDate >= originalEndDate) {
      throw new Error('Actual end date must be before the original end date for short closing');
    }

    if (newEndDate < startDate) {
      throw new Error('Actual end date cannot be before the start date');
    }

    // Update booking with actual end date (keep original end date) and mark as completed
    await db
      .update(bookings)
      .set({
        actualEndDate: actualEndDate,
        status: 'completed',
        notes: booking.notes ? `${booking.notes}\n\nShort Closed: ${reason}` : `Short Closed: ${reason}`,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id));

    // Return the updated booking
    return this.getBookingById(id);
  }
}

export const bookingService = new BookingService();
