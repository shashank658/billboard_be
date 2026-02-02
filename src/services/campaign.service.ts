import { eq, and, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { campaigns, customers, bookings, billboards } from '../db/schema/index.js';
import { sequenceService } from './sequence.service.js';
import { bookingService } from './booking.service.js';

export interface BillboardSelection {
  billboardId: string;
  slotNumber?: number; // For digital billboards
}

export interface CreateCampaignDto {
  name: string;
  customerId: string;
  description?: string;
  startDate: string; // Required - campaign period
  endDate: string;   // Required - campaign period
  billboards: BillboardSelection[]; // Required - at least one billboard
  createdBy?: string;
}

export interface UpdateCampaignDto {
  name?: string;
  customerId?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  updatedBy?: string;
}

export interface CampaignPaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

class CampaignService {
  async getAllCampaigns(options: CampaignPaginationOptions) {
    const { page, pageSize, sortBy = 'createdAt', sortOrder = 'desc', customerId, search, startDateFrom, startDateTo } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (customerId) {
      conditions.push(eq(campaigns.customerId, customerId));
    }
    if (search) {
      conditions.push(sql`(${campaigns.name} ILIKE ${'%' + search + '%'} OR ${campaigns.referenceCode} ILIKE ${'%' + search + '%'})`);
    }
    if (startDateFrom) {
      conditions.push(gte(campaigns.startDate, new Date(startDateFrom)));
    }
    if (startDateTo) {
      conditions.push(lte(campaigns.startDate, new Date(startDateTo)));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByColumn;
    switch (sortBy) {
      case 'name':
        orderByColumn = campaigns.name;
        break;
      case 'referenceCode':
        orderByColumn = campaigns.referenceCode;
        break;
      case 'startDate':
        orderByColumn = campaigns.startDate;
        break;
      case 'endDate':
        orderByColumn = campaigns.endDate;
        break;
      case 'totalValue':
        orderByColumn = campaigns.totalValue;
        break;
      default:
        orderByColumn = campaigns.createdAt;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          campaign: campaigns,
          customer: {
            id: customers.id,
            name: customers.name,
            contactPerson: customers.contactPerson,
          },
          bookingCount: sql<number>`(SELECT COUNT(*)::int FROM ${bookings} WHERE ${bookings.campaignId} = ${campaigns.id})`,
        })
        .from(campaigns)
        .leftJoin(customers, eq(campaigns.customerId, customers.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(whereCondition),
    ]);

    return {
      data: data.map(row => ({
        ...row.campaign,
        customer: row.customer,
        bookingCount: row.bookingCount,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize),
      },
    };
  }

  async getCampaignById(id: string) {
    const [result] = await db
      .select({
        campaign: campaigns,
        customer: {
          id: customers.id,
          name: customers.name,
          contactPerson: customers.contactPerson,
          email: customers.email,
          phone: customers.phone,
        },
      })
      .from(campaigns)
      .leftJoin(customers, eq(campaigns.customerId, customers.id))
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!result) return null;

    // Get bookings for this campaign
    const campaignBookings = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        notionalValue: bookings.notionalValue,
        status: bookings.status,
        slotNumber: bookings.slotNumber,
        billboard: {
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
          type: billboards.type,
        },
      })
      .from(bookings)
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .where(eq(bookings.campaignId, id))
      .orderBy(asc(bookings.startDate));

    return {
      ...result.campaign,
      customer: result.customer,
      bookings: campaignBookings,
      bookingCount: campaignBookings.length,
    };
  }

  async createCampaign(data: CreateCampaignDto) {
    console.log('Creating campaign with data:', JSON.stringify(data, null, 2));

    // Validate billboards
    if (!data.billboards || data.billboards.length === 0) {
      throw new Error('At least one billboard must be selected for the campaign');
    }

    // Validate dates
    if (!data.startDate || !data.endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get billboard details to calculate values and check availability
    const billboardIds = data.billboards.map(b => b.billboardId);
    console.log('Billboard IDs:', billboardIds);

    const billboardDetails = await db
      .select()
      .from(billboards)
      .where(inArray(billboards.id, billboardIds));

    console.log('Found billboards:', billboardDetails.length);

    if (billboardDetails.length !== billboardIds.length) {
      throw new Error('One or more billboards not found');
    }

    // Check availability for each billboard
    for (const selection of data.billboards) {
      const availability = await bookingService.checkAvailability({
        billboardId: selection.billboardId,
        startDate: data.startDate,
        endDate: data.endDate,
        slotNumber: selection.slotNumber,
      });

      if (!availability.available) {
        const billboard = billboardDetails.find(b => b.id === selection.billboardId);
        throw new Error(`Billboard "${billboard?.name}" is not available for the selected dates. Conflicts with: ${availability.conflicts.map(c => c.referenceCode).join(', ')}`);
      }
    }

    // Generate campaign reference code
    const referenceCode = await sequenceService.getNextSequence('campaign');

    // Create the campaign first
    const [campaign] = await db
      .insert(campaigns)
      .values({
        referenceCode,
        name: data.name,
        customerId: data.customerId,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        totalValue: '0',
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    // Create bookings for each billboard
    let totalValue = 0;
    for (const selection of data.billboards) {
      const billboard = billboardDetails.find(b => b.id === selection.billboardId);
      if (!billboard) continue;

      // Calculate notional value
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const rate = parseFloat(billboard.ratePerDay);
      const notionalValue = (rate * days).toFixed(2);
      totalValue += parseFloat(notionalValue);

      // Generate booking reference code
      const bookingRefCode = await sequenceService.getNextSequence('booking');

      // Create booking
      await db.insert(bookings).values({
        referenceCode: bookingRefCode,
        customerId: data.customerId,
        campaignId: campaign.id,
        billboardId: selection.billboardId,
        slotNumber: selection.slotNumber || null,
        startDate: data.startDate,
        endDate: data.endDate,
        notionalValue,
        status: 'created',
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      });
    }

    // Update campaign total value
    await db
      .update(campaigns)
      .set({
        totalValue: totalValue.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    return this.getCampaignById(campaign.id);
  }

  async updateCampaign(id: string, data: UpdateCampaignDto) {
    const existing = await this.getCampaignById(id);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, id));

    return this.getCampaignById(id);
  }

  async deleteCampaign(id: string) {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if campaign has bookings
    if (campaign.bookingCount > 0) {
      throw new Error('Cannot delete campaign with existing bookings. Remove bookings from the campaign first.');
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async updateCampaignTotals(campaignId: string) {
    // Calculate total value from all bookings
    const [result] = await db
      .select({
        totalValue: sql<string>`COALESCE(SUM(${bookings.notionalValue}::numeric), 0)::text`,
        minStartDate: sql<Date>`MIN(${bookings.startDate})`,
        maxEndDate: sql<Date>`MAX(${bookings.endDate})`,
      })
      .from(bookings)
      .where(eq(bookings.campaignId, campaignId));

    await db
      .update(campaigns)
      .set({
        totalValue: result?.totalValue || '0',
        startDate: result?.minStartDate || null,
        endDate: result?.maxEndDate || null,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));
  }

  async addBookingToCampaign(campaignId: string, bookingId: string, updatedBy?: string) {
    // Verify campaign exists
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Verify booking exists and belongs to the same customer
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.customerId !== campaign.customerId) {
      throw new Error('Booking must belong to the same customer as the campaign');
    }

    // Update booking to link to campaign
    await db
      .update(bookings)
      .set({
        campaignId,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Update campaign totals
    await this.updateCampaignTotals(campaignId);

    return this.getCampaignById(campaignId);
  }

  async removeBookingFromCampaign(campaignId: string, bookingId: string, updatedBy?: string) {
    // Verify booking belongs to this campaign
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.campaignId, campaignId)))
      .limit(1);

    if (!booking) {
      throw new Error('Booking not found in this campaign');
    }

    // Remove booking from campaign
    await db
      .update(bookings)
      .set({
        campaignId: null,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Update campaign totals
    await this.updateCampaignTotals(campaignId);

    return this.getCampaignById(campaignId);
  }

  async getBookingsNotInCampaign(customerId: string, excludeCampaignId?: string) {
    // Get bookings for the customer that are not in any campaign (or in a different campaign)
    const conditions = [
      eq(bookings.customerId, customerId),
    ];

    if (excludeCampaignId) {
      conditions.push(sql`(${bookings.campaignId} IS NULL OR ${bookings.campaignId} != ${excludeCampaignId})`);
    } else {
      conditions.push(sql`${bookings.campaignId} IS NULL`);
    }

    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        notionalValue: bookings.notionalValue,
        status: bookings.status,
        billboard: {
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
        },
      })
      .from(bookings)
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.createdAt));

    return data;
  }

  async getAvailableBillboards(startDate: string, endDate: string) {
    // Get all active billboards
    const allBillboards = await db
      .select()
      .from(billboards)
      .where(eq(billboards.status, 'active'))
      .orderBy(asc(billboards.name));

    // For each billboard, check availability and get slot info
    const result = [];
    for (const billboard of allBillboards) {
      const availability = await bookingService.checkAvailability({
        billboardId: billboard.id,
        startDate,
        endDate,
      });

      // For digital billboards, check each slot
      if (billboard.type === 'digital' && billboard.slotCount) {
        const availableSlots: number[] = [];
        for (let slot = 1; slot <= billboard.slotCount; slot++) {
          const slotAvailability = await bookingService.checkAvailability({
            billboardId: billboard.id,
            startDate,
            endDate,
            slotNumber: slot,
          });
          if (slotAvailability.available) {
            availableSlots.push(slot);
          }
        }
        result.push({
          ...billboard,
          isAvailable: availableSlots.length > 0,
          availableSlots,
          conflicts: availability.conflicts,
        });
      } else {
        // Static billboard
        result.push({
          ...billboard,
          isAvailable: availability.available,
          availableSlots: [],
          conflicts: availability.conflicts,
        });
      }
    }

    return result;
  }
}

export const campaignService = new CampaignService();
