import { eq, ilike, and, desc, asc, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { billboards, zones, cities, regions, landlords } from '../db/schema/index.js';

// Types
export type BillboardType = 'static' | 'digital';
export type BillboardStatus = 'active' | 'inactive' | 'maintenance';
export type Orientation = 'portrait' | 'landscape';

export interface CreateBillboardDto {
  name: string;
  code: string;
  description?: string;
  type: BillboardType;
  status?: BillboardStatus;
  width: number;
  height: number;
  orientation?: Orientation;
  zoneId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  illumination?: string;
  installationDate?: Date;
  landlordId: string;
  ratePerDay: number;
  // Digital specific
  loopDuration?: number;
  slotCount?: number;
  slotDuration?: number;
  createdBy?: string;
}

export interface UpdateBillboardDto {
  name?: string;
  code?: string;
  description?: string;
  type?: BillboardType;
  status?: BillboardStatus;
  width?: number;
  height?: number;
  orientation?: Orientation;
  zoneId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  illumination?: string;
  installationDate?: Date;
  landlordId?: string;
  ratePerDay?: number;
  // Digital specific
  loopDuration?: number;
  slotCount?: number;
  slotDuration?: number;
  updatedBy?: string;
}

export interface BillboardFilters {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  type?: BillboardType;
  status?: BillboardStatus;
  zoneId?: string;
  cityId?: string;
  regionId?: string;
  landlordId?: string;
}

class BillboardService {
  async getAllBillboards(filters: BillboardFilters) {
    const {
      page,
      pageSize,
      sortBy = 'name',
      sortOrder = 'asc',
      search,
      type,
      status,
      zoneId,
      cityId,
      regionId,
      landlordId,
    } = filters;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(billboards.name, `%${search}%`),
          ilike(billboards.code, `%${search}%`),
          ilike(billboards.address, `%${search}%`)
        )
      );
    }
    if (type) {
      conditions.push(eq(billboards.type, type));
    }
    if (status) {
      conditions.push(eq(billboards.status, status));
    }
    if (zoneId) {
      conditions.push(eq(billboards.zoneId, zoneId));
    }
    if (cityId) {
      conditions.push(eq(zones.cityId, cityId));
    }
    if (regionId) {
      conditions.push(eq(cities.regionId, regionId));
    }
    if (landlordId) {
      conditions.push(eq(billboards.landlordId, landlordId));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column
    let orderByColumn;
    switch (sortBy) {
      case 'code':
        orderByColumn = billboards.code;
        break;
      case 'type':
        orderByColumn = billboards.type;
        break;
      case 'status':
        orderByColumn = billboards.status;
        break;
      case 'ratePerDay':
        orderByColumn = billboards.ratePerDay;
        break;
      case 'createdAt':
        orderByColumn = billboards.createdAt;
        break;
      default:
        orderByColumn = billboards.name;
    }
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: billboards.id,
          name: billboards.name,
          code: billboards.code,
          description: billboards.description,
          type: billboards.type,
          status: billboards.status,
          width: billboards.width,
          height: billboards.height,
          orientation: billboards.orientation,
          zoneId: billboards.zoneId,
          address: billboards.address,
          latitude: billboards.latitude,
          longitude: billboards.longitude,
          illumination: billboards.illumination,
          installationDate: billboards.installationDate,
          landlordId: billboards.landlordId,
          ratePerDay: billboards.ratePerDay,
          loopDuration: billboards.loopDuration,
          slotCount: billboards.slotCount,
          slotDuration: billboards.slotDuration,
          createdAt: billboards.createdAt,
          updatedAt: billboards.updatedAt,
          zone: {
            id: zones.id,
            name: zones.name,
            code: zones.code,
          },
          city: {
            id: cities.id,
            name: cities.name,
            code: cities.code,
          },
          region: {
            id: regions.id,
            name: regions.name,
            code: regions.code,
          },
          landlord: {
            id: landlords.id,
            name: landlords.name,
          },
        })
        .from(billboards)
        .leftJoin(zones, eq(billboards.zoneId, zones.id))
        .leftJoin(cities, eq(zones.cityId, cities.id))
        .leftJoin(regions, eq(cities.regionId, regions.id))
        .leftJoin(landlords, eq(billboards.landlordId, landlords.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(billboards)
        .leftJoin(zones, eq(billboards.zoneId, zones.id))
        .leftJoin(cities, eq(zones.cityId, cities.id))
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

  async getBillboardById(id: string) {
    const [data] = await db
      .select({
        id: billboards.id,
        name: billboards.name,
        code: billboards.code,
        description: billboards.description,
        type: billboards.type,
        status: billboards.status,
        width: billboards.width,
        height: billboards.height,
        orientation: billboards.orientation,
        zoneId: billboards.zoneId,
        address: billboards.address,
        latitude: billboards.latitude,
        longitude: billboards.longitude,
        illumination: billboards.illumination,
        installationDate: billboards.installationDate,
        landlordId: billboards.landlordId,
        ratePerDay: billboards.ratePerDay,
        loopDuration: billboards.loopDuration,
        slotCount: billboards.slotCount,
        slotDuration: billboards.slotDuration,
        createdAt: billboards.createdAt,
        updatedAt: billboards.updatedAt,
        zone: {
          id: zones.id,
          name: zones.name,
          code: zones.code,
        },
        city: {
          id: cities.id,
          name: cities.name,
          code: cities.code,
        },
        region: {
          id: regions.id,
          name: regions.name,
          code: regions.code,
        },
        landlord: {
          id: landlords.id,
          name: landlords.name,
          contactPerson: landlords.contactPerson,
          phone: landlords.phone,
          email: landlords.email,
        },
      })
      .from(billboards)
      .leftJoin(zones, eq(billboards.zoneId, zones.id))
      .leftJoin(cities, eq(zones.cityId, cities.id))
      .leftJoin(regions, eq(cities.regionId, regions.id))
      .leftJoin(landlords, eq(billboards.landlordId, landlords.id))
      .where(eq(billboards.id, id))
      .limit(1);

    return data;
  }

  async getBillboardByCode(code: string) {
    const [billboard] = await db
      .select()
      .from(billboards)
      .where(eq(billboards.code, code.toUpperCase()))
      .limit(1);
    return billboard;
  }

  async createBillboard(data: CreateBillboardDto) {
    const [billboard] = await db
      .insert(billboards)
      .values({
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type,
        status: data.status || 'active',
        width: String(data.width),
        height: String(data.height),
        orientation: data.orientation || 'landscape',
        zoneId: data.zoneId,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        illumination: data.illumination,
        installationDate: data.installationDate,
        landlordId: data.landlordId,
        ratePerDay: String(data.ratePerDay),
        loopDuration: data.loopDuration,
        slotCount: data.slotCount,
        slotDuration: data.slotDuration,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    return this.getBillboardById(billboard.id);
  }

  async updateBillboard(id: string, data: UpdateBillboardDto) {
    const updateData: Record<string, unknown> = {
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.width !== undefined) updateData.width = String(data.width);
    if (data.height !== undefined) updateData.height = String(data.height);
    if (data.orientation !== undefined) updateData.orientation = data.orientation;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.illumination !== undefined) updateData.illumination = data.illumination;
    if (data.installationDate !== undefined) updateData.installationDate = data.installationDate;
    if (data.landlordId !== undefined) updateData.landlordId = data.landlordId;
    if (data.ratePerDay !== undefined) updateData.ratePerDay = String(data.ratePerDay);
    if (data.loopDuration !== undefined) updateData.loopDuration = data.loopDuration;
    if (data.slotCount !== undefined) updateData.slotCount = data.slotCount;
    if (data.slotDuration !== undefined) updateData.slotDuration = data.slotDuration;

    const [billboard] = await db
      .update(billboards)
      .set(updateData)
      .where(eq(billboards.id, id))
      .returning();

    return this.getBillboardById(billboard.id);
  }

  async deleteBillboard(id: string) {
    // TODO: Check if billboard has bookings before deleting
    await db.delete(billboards).where(eq(billboards.id, id));
  }

  async getBillboardsForDropdown(zoneId?: string) {
    const condition = zoneId ? eq(billboards.zoneId, zoneId) : undefined;
    return db
      .select({
        id: billboards.id,
        name: billboards.name,
        code: billboards.code,
        type: billboards.type,
      })
      .from(billboards)
      .where(condition)
      .orderBy(asc(billboards.name));
  }

  async getBillboardStats() {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${billboards.status} = 'active')::int`,
        inactive: sql<number>`count(*) filter (where ${billboards.status} = 'inactive')::int`,
        maintenance: sql<number>`count(*) filter (where ${billboards.status} = 'maintenance')::int`,
        static: sql<number>`count(*) filter (where ${billboards.type} = 'static')::int`,
        digital: sql<number>`count(*) filter (where ${billboards.type} = 'digital')::int`,
      })
      .from(billboards);

    return stats;
  }
}

export const billboardService = new BillboardService();
