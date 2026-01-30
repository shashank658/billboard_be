import { eq, ilike, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { regions, cities, zones } from '../db/schema/index.js';

// Types
export interface CreateRegionDto {
  name: string;
  code: string;
  createdBy?: string;
}

export interface UpdateRegionDto {
  name?: string;
  code?: string;
  updatedBy?: string;
}

export interface CreateCityDto {
  regionId: string;
  name: string;
  code: string;
  createdBy?: string;
}

export interface UpdateCityDto {
  regionId?: string;
  name?: string;
  code?: string;
  updatedBy?: string;
}

export interface CreateZoneDto {
  cityId: string;
  name: string;
  code: string;
  createdBy?: string;
}

export interface UpdateZoneDto {
  cityId?: string;
  name?: string;
  code?: string;
  updatedBy?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

class LocationService {
  // ==================== REGIONS ====================

  async getAllRegions(options: PaginationOptions) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search } = options;
    const offset = (page - 1) * pageSize;

    const whereCondition = search
      ? ilike(regions.name, `%${search}%`)
      : undefined;

    const orderByColumn = sortBy === 'code' ? regions.code : regions.name;
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(regions)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(regions)
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

  async getRegionById(id: string) {
    const [region] = await db
      .select()
      .from(regions)
      .where(eq(regions.id, id))
      .limit(1);
    return region;
  }

  async getRegionByCode(code: string) {
    const [region] = await db
      .select()
      .from(regions)
      .where(eq(regions.code, code.toUpperCase()))
      .limit(1);
    return region;
  }

  async createRegion(data: CreateRegionDto) {
    const [region] = await db
      .insert(regions)
      .values({
        name: data.name,
        code: data.code.toUpperCase(),
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return region;
  }

  async updateRegion(id: string, data: UpdateRegionDto) {
    const [region] = await db
      .update(regions)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase() }),
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(regions.id, id))
      .returning();
    return region;
  }

  async deleteRegion(id: string) {
    // Check if region has cities
    const [cityCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cities)
      .where(eq(cities.regionId, id));

    if (cityCount.count > 0) {
      throw new Error('Cannot delete region with existing cities');
    }

    await db.delete(regions).where(eq(regions.id, id));
  }

  // ==================== CITIES ====================

  async getAllCities(options: PaginationOptions & { regionId?: string }) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search, regionId } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(ilike(cities.name, `%${search}%`));
    }
    if (regionId) {
      conditions.push(eq(cities.regionId, regionId));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByColumn = sortBy === 'code' ? cities.code : cities.name;
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: cities.id,
          regionId: cities.regionId,
          name: cities.name,
          code: cities.code,
          createdAt: cities.createdAt,
          updatedAt: cities.updatedAt,
          region: {
            id: regions.id,
            name: regions.name,
            code: regions.code,
          },
        })
        .from(cities)
        .leftJoin(regions, eq(cities.regionId, regions.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(cities)
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

  async getCityById(id: string) {
    const [city] = await db
      .select({
        id: cities.id,
        regionId: cities.regionId,
        name: cities.name,
        code: cities.code,
        createdAt: cities.createdAt,
        updatedAt: cities.updatedAt,
        region: {
          id: regions.id,
          name: regions.name,
          code: regions.code,
        },
      })
      .from(cities)
      .leftJoin(regions, eq(cities.regionId, regions.id))
      .where(eq(cities.id, id))
      .limit(1);
    return city;
  }

  async getCityByCode(code: string) {
    const [city] = await db
      .select()
      .from(cities)
      .where(eq(cities.code, code.toUpperCase()))
      .limit(1);
    return city;
  }

  async createCity(data: CreateCityDto) {
    const [city] = await db
      .insert(cities)
      .values({
        regionId: data.regionId,
        name: data.name,
        code: data.code.toUpperCase(),
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return this.getCityById(city.id);
  }

  async updateCity(id: string, data: UpdateCityDto) {
    const [city] = await db
      .update(cities)
      .set({
        ...(data.regionId && { regionId: data.regionId }),
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase() }),
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(cities.id, id))
      .returning();
    return this.getCityById(city.id);
  }

  async deleteCity(id: string) {
    // Check if city has zones
    const [zoneCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(zones)
      .where(eq(zones.cityId, id));

    if (zoneCount.count > 0) {
      throw new Error('Cannot delete city with existing zones');
    }

    await db.delete(cities).where(eq(cities.id, id));
  }

  // ==================== ZONES ====================

  async getAllZones(options: PaginationOptions & { cityId?: string; regionId?: string }) {
    const { page, pageSize, sortBy = 'name', sortOrder = 'asc', search, cityId, regionId } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(ilike(zones.name, `%${search}%`));
    }
    if (cityId) {
      conditions.push(eq(zones.cityId, cityId));
    }
    if (regionId) {
      conditions.push(eq(cities.regionId, regionId));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByColumn = sortBy === 'code' ? zones.code : zones.name;
    const orderBy = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: zones.id,
          cityId: zones.cityId,
          name: zones.name,
          code: zones.code,
          createdAt: zones.createdAt,
          updatedAt: zones.updatedAt,
          cityName: cities.name,
          cityCode: cities.code,
          regionId: cities.regionId,
          regionName: regions.name,
          regionCode: regions.code,
        })
        .from(zones)
        .leftJoin(cities, eq(zones.cityId, cities.id))
        .leftJoin(regions, eq(cities.regionId, regions.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(zones)
        .leftJoin(cities, eq(zones.cityId, cities.id))
        .where(whereCondition),
    ]);

    // Transform data to include nested city and region objects
    const transformedData = data.map(item => ({
      id: item.id,
      cityId: item.cityId,
      name: item.name,
      code: item.code,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      city: {
        id: item.cityId,
        name: item.cityName,
        code: item.cityCode,
        region: {
          id: item.regionId,
          name: item.regionName,
          code: item.regionCode,
        },
      },
    }));

    return {
      data: transformedData,
      pagination: {
        page,
        pageSize,
        totalItems: countResult[0]?.count || 0,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize),
      },
    };
  }

  async getZoneById(id: string) {
    const [data] = await db
      .select({
        id: zones.id,
        cityId: zones.cityId,
        name: zones.name,
        code: zones.code,
        createdAt: zones.createdAt,
        updatedAt: zones.updatedAt,
        cityName: cities.name,
        cityCode: cities.code,
        regionId: cities.regionId,
        regionName: regions.name,
        regionCode: regions.code,
      })
      .from(zones)
      .leftJoin(cities, eq(zones.cityId, cities.id))
      .leftJoin(regions, eq(cities.regionId, regions.id))
      .where(eq(zones.id, id))
      .limit(1);

    if (!data) return undefined;

    return {
      id: data.id,
      cityId: data.cityId,
      name: data.name,
      code: data.code,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      city: {
        id: data.cityId,
        name: data.cityName,
        code: data.cityCode,
        region: {
          id: data.regionId,
          name: data.regionName,
          code: data.regionCode,
        },
      },
    };
  }

  async getZoneByCode(code: string) {
    const [zone] = await db
      .select()
      .from(zones)
      .where(eq(zones.code, code.toUpperCase()))
      .limit(1);
    return zone;
  }

  async createZone(data: CreateZoneDto) {
    const [zone] = await db
      .insert(zones)
      .values({
        cityId: data.cityId,
        name: data.name,
        code: data.code.toUpperCase(),
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return this.getZoneById(zone.id);
  }

  async updateZone(id: string, data: UpdateZoneDto) {
    const [zone] = await db
      .update(zones)
      .set({
        ...(data.cityId && { cityId: data.cityId }),
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase() }),
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(zones.id, id))
      .returning();
    return this.getZoneById(zone.id);
  }

  async deleteZone(id: string) {
    // Check if zone has billboards
    // This will be checked when billboards are implemented
    await db.delete(zones).where(eq(zones.id, id));
  }

  // ==================== DROPDOWN OPTIONS ====================

  async getRegionsForDropdown() {
    return db
      .select({
        id: regions.id,
        name: regions.name,
        code: regions.code,
      })
      .from(regions)
      .orderBy(asc(regions.name));
  }

  async getCitiesForDropdown(regionId?: string) {
    const condition = regionId ? eq(cities.regionId, regionId) : undefined;
    return db
      .select({
        id: cities.id,
        name: cities.name,
        code: cities.code,
        regionId: cities.regionId,
      })
      .from(cities)
      .where(condition)
      .orderBy(asc(cities.name));
  }

  async getZonesForDropdown(cityId?: string) {
    const condition = cityId ? eq(zones.cityId, cityId) : undefined;
    return db
      .select({
        id: zones.id,
        name: zones.name,
        code: zones.code,
        cityId: zones.cityId,
      })
      .from(zones)
      .where(condition)
      .orderBy(asc(zones.name));
  }
}

export const locationService = new LocationService();
