import { sql, eq, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { billboards, bookings, customers, purchaseOrders, campaigns } from '../db/schema/index.js';

export interface DashboardStats {
  totalBillboards: number;
  activeBillboards: number;
  totalBookings: number;
  activeBookings: number;
  totalCustomers: number;
  activeCustomers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
}

export interface RecentBooking {
  id: string;
  referenceCode: string;
  customerName: string;
  billboardName: string;
  billboardCode: string;
  startDate: string;
  endDate: string;
  notionalValue: string;
  status: string;
}

export interface OccupancyData {
  billboardId: string;
  billboardName: string;
  billboardCode: string;
  billboardType: string;
  totalDays: number;
  bookedDays: number;
  occupancyRate: number;
}

export interface RevenueByMonth {
  month: string;
  year: number;
  revenue: number;
  bookingCount: number;
}

class DashboardService {
  private getMonthDateRange(monthsAgo: number = 0) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - monthsAgo;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  async getStats(): Promise<DashboardStats> {
    const thisMonth = this.getMonthDateRange(0);
    const lastMonth = this.getMonthDateRange(1);

    // Get billboard counts
    const [totalBillboards] = await db
      .select({ count: count() })
      .from(billboards);

    const [activeBillboards] = await db
      .select({ count: count() })
      .from(billboards)
      .where(eq(billboards.status, 'active'));

    // Get booking counts
    const [totalBookings] = await db
      .select({ count: count() })
      .from(bookings);

    const [activeBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        sql`${bookings.status} IN ('created', 'confirmed', 'active')`
      );

    // Get customer counts
    const [totalCustomers] = await db
      .select({ count: count() })
      .from(customers);

    const [activeCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.isActive, true));

    // Get campaign counts
    const [totalCampaigns] = await db
      .select({ count: count() })
      .from(campaigns);

    // Count active campaigns as those with end date in the future or no end date
    const [activeCampaigns] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(
        sql`${campaigns.endDate} IS NULL OR ${campaigns.endDate} > NOW()`
      );

    // Get revenue this month (from POs)
    const [revenueThisMonth] = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseOrders.actualValue}::numeric), 0)` })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.createdAt, new Date(thisMonth.startDate)),
          lte(purchaseOrders.createdAt, new Date(thisMonth.endDate + 'T23:59:59'))
        )
      );

    // Get revenue last month (from POs)
    const [revenueLastMonth] = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseOrders.actualValue}::numeric), 0)` })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.createdAt, new Date(lastMonth.startDate)),
          lte(purchaseOrders.createdAt, new Date(lastMonth.endDate + 'T23:59:59'))
        )
      );

    // Get bookings this month
    const [bookingsThisMonth] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, new Date(thisMonth.startDate)),
          lte(bookings.createdAt, new Date(thisMonth.endDate + 'T23:59:59'))
        )
      );

    // Get bookings last month
    const [bookingsLastMonth] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, new Date(lastMonth.startDate)),
          lte(bookings.createdAt, new Date(lastMonth.endDate + 'T23:59:59'))
        )
      );

    return {
      totalBillboards: totalBillboards.count,
      activeBillboards: activeBillboards.count,
      totalBookings: totalBookings.count,
      activeBookings: activeBookings.count,
      totalCustomers: totalCustomers.count,
      activeCustomers: activeCustomers.count,
      totalCampaigns: totalCampaigns.count,
      activeCampaigns: activeCampaigns.count,
      revenueThisMonth: revenueThisMonth.total || 0,
      revenueLastMonth: revenueLastMonth.total || 0,
      bookingsThisMonth: bookingsThisMonth.count,
      bookingsLastMonth: bookingsLastMonth.count,
    };
  }

  async getRecentBookings(limit: number = 5): Promise<RecentBooking[]> {
    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        customerName: customers.name,
        billboardName: billboards.name,
        billboardCode: billboards.code,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        notionalValue: bookings.notionalValue,
        status: bookings.status,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .orderBy(sql`${bookings.createdAt} DESC`)
      .limit(limit);

    return data.map(row => ({
      id: row.id,
      referenceCode: row.referenceCode,
      customerName: row.customerName || 'Unknown',
      billboardName: row.billboardName || 'Unknown',
      billboardCode: row.billboardCode || '-',
      startDate: row.startDate,
      endDate: row.endDate,
      notionalValue: row.notionalValue,
      status: row.status,
    }));
  }

  async getOccupancyRates(startDate: string, endDate: string): Promise<OccupancyData[]> {
    // Get all active billboards
    const billboardList = await db
      .select({
        id: billboards.id,
        name: billboards.name,
        code: billboards.code,
        type: billboards.type,
      })
      .from(billboards)
      .where(eq(billboards.status, 'active'));

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const occupancyData: OccupancyData[] = [];

    for (const billboard of billboardList) {
      // Get bookings that overlap with the date range
      const billboardBookings = await db
        .select({
          startDate: bookings.startDate,
          endDate: bookings.endDate,
          actualEndDate: bookings.actualEndDate,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.billboardId, billboard.id),
            lte(bookings.startDate, endDate),
            gte(bookings.endDate, startDate),
            sql`${bookings.status} NOT IN ('cancelled')`
          )
        );

      // Calculate booked days
      let bookedDays = 0;
      const bookedDates = new Set<string>();

      for (const booking of billboardBookings) {
        const bookingStart = new Date(Math.max(new Date(booking.startDate).getTime(), start.getTime()));
        const effectiveEndDate = booking.actualEndDate || booking.endDate;
        const bookingEnd = new Date(Math.min(new Date(effectiveEndDate).getTime(), end.getTime()));

        for (let d = new Date(bookingStart); d <= bookingEnd; d.setDate(d.getDate() + 1)) {
          bookedDates.add(d.toISOString().split('T')[0]);
        }
      }

      bookedDays = bookedDates.size;

      occupancyData.push({
        billboardId: billboard.id,
        billboardName: billboard.name,
        billboardCode: billboard.code,
        billboardType: billboard.type,
        totalDays,
        bookedDays,
        occupancyRate: totalDays > 0 ? (bookedDays / totalDays) * 100 : 0,
      });
    }

    // Sort by occupancy rate descending
    return occupancyData.sort((a, b) => b.occupancyRate - a.occupancyRate);
  }

  async getRevenueByMonth(months: number = 6): Promise<RevenueByMonth[]> {
    const result: RevenueByMonth[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const { startDate, endDate } = this.getMonthDateRange(i);
      const monthDate = new Date(startDate);

      const [data] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${purchaseOrders.actualValue}::numeric), 0)`,
          count: count(),
        })
        .from(purchaseOrders)
        .where(
          and(
            gte(purchaseOrders.createdAt, new Date(startDate)),
            lte(purchaseOrders.createdAt, new Date(endDate + 'T23:59:59'))
          )
        );

      result.push({
        month: monthDate.toLocaleString('en-US', { month: 'short' }),
        year: monthDate.getFullYear(),
        revenue: data.revenue || 0,
        bookingCount: data.count,
      });
    }

    return result;
  }

  async getUpcomingBookings(days: number = 7): Promise<RecentBooking[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const endDate = futureDate.toISOString().split('T')[0];

    const data = await db
      .select({
        id: bookings.id,
        referenceCode: bookings.referenceCode,
        customerName: customers.name,
        billboardName: billboards.name,
        billboardCode: billboards.code,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        notionalValue: bookings.notionalValue,
        status: bookings.status,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(billboards, eq(bookings.billboardId, billboards.id))
      .where(
        and(
          gte(bookings.startDate, today),
          lte(bookings.startDate, endDate),
          sql`${bookings.status} IN ('created', 'confirmed')`
        )
      )
      .orderBy(sql`${bookings.startDate} ASC`)
      .limit(10);

    return data.map(row => ({
      id: row.id,
      referenceCode: row.referenceCode,
      customerName: row.customerName || 'Unknown',
      billboardName: row.billboardName || 'Unknown',
      billboardCode: row.billboardCode || '-',
      startDate: row.startDate,
      endDate: row.endDate,
      notionalValue: row.notionalValue,
      status: row.status,
    }));
  }
}

export const dashboardService = new DashboardService();
