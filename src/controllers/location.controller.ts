import type { Request, Response } from 'express';
import { locationService } from '../services/location.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, getSortParams } from '../utils/pagination.js';

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getParamId = (params: Record<string, unknown>): string => {
  const id = params.id;
  if (typeof id !== 'string') {
    throw new Error('Invalid ID parameter');
  }
  return id;
};

// ==================== REGIONS ====================

export const getRegions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'code'], 'name');
    const search = getString(req.query.search);

    const result = await locationService.getAllRegions({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch regions', 500);
    }
  }
};

export const getRegionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const region = await locationService.getRegionById(id);

    if (!region) {
      sendError(res, 'Region not found', 404);
      return;
    }

    sendSuccess(res, region);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch region', 500);
    }
  }
};

export const createRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body;

    // Check if code already exists
    const existing = await locationService.getRegionByCode(code);
    if (existing) {
      sendError(res, 'Region code already exists', 409);
      return;
    }

    const region = await locationService.createRegion({
      name,
      code,
      createdBy: req.user?.id,
    });

    sendSuccess(res, region, 'Region created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create region', 500);
    }
  }
};

export const updateRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const { name, code } = req.body;

    const existing = await locationService.getRegionById(id);
    if (!existing) {
      sendError(res, 'Region not found', 404);
      return;
    }

    // Check if code already exists (excluding current region)
    if (code) {
      const codeExists = await locationService.getRegionByCode(code);
      if (codeExists && codeExists.id !== id) {
        sendError(res, 'Region code already exists', 409);
        return;
      }
    }

    const region = await locationService.updateRegion(id, {
      name,
      code,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, region, 'Region updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update region', 500);
    }
  }
};

export const deleteRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await locationService.getRegionById(id);
    if (!existing) {
      sendError(res, 'Region not found', 404);
      return;
    }

    await locationService.deleteRegion(id);
    sendSuccess(res, null, 'Region deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete region', 500);
    }
  }
};

// ==================== CITIES ====================

export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'code'], 'name');
    const search = getString(req.query.search);
    const regionId = getString(req.query.regionId);

    const result = await locationService.getAllCities({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      regionId,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch cities', 500);
    }
  }
};

export const getCityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const city = await locationService.getCityById(id);

    if (!city) {
      sendError(res, 'City not found', 404);
      return;
    }

    sendSuccess(res, city);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch city', 500);
    }
  }
};

export const createCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionId, name, code } = req.body;

    // Check if region exists
    const region = await locationService.getRegionById(regionId);
    if (!region) {
      sendError(res, 'Region not found', 404);
      return;
    }

    // Check if code already exists
    const existing = await locationService.getCityByCode(code);
    if (existing) {
      sendError(res, 'City code already exists', 409);
      return;
    }

    const city = await locationService.createCity({
      regionId,
      name,
      code,
      createdBy: req.user?.id,
    });

    sendSuccess(res, city, 'City created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create city', 500);
    }
  }
};

export const updateCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const { regionId, name, code } = req.body;

    const existing = await locationService.getCityById(id);
    if (!existing) {
      sendError(res, 'City not found', 404);
      return;
    }

    // Check if region exists
    if (regionId) {
      const region = await locationService.getRegionById(regionId);
      if (!region) {
        sendError(res, 'Region not found', 404);
        return;
      }
    }

    // Check if code already exists (excluding current city)
    if (code) {
      const codeExists = await locationService.getCityByCode(code);
      if (codeExists && codeExists.id !== id) {
        sendError(res, 'City code already exists', 409);
        return;
      }
    }

    const city = await locationService.updateCity(id, {
      regionId,
      name,
      code,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, city, 'City updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update city', 500);
    }
  }
};

export const deleteCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await locationService.getCityById(id);
    if (!existing) {
      sendError(res, 'City not found', 404);
      return;
    }

    await locationService.deleteCity(id);
    sendSuccess(res, null, 'City deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete city', 500);
    }
  }
};

// ==================== ZONES ====================

export const getZones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'code'], 'name');
    const search = getString(req.query.search);
    const cityId = getString(req.query.cityId);
    const regionId = getString(req.query.regionId);

    const result = await locationService.getAllZones({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      cityId,
      regionId,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch zones', 500);
    }
  }
};

export const getZoneById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const zone = await locationService.getZoneById(id);

    if (!zone) {
      sendError(res, 'Zone not found', 404);
      return;
    }

    sendSuccess(res, zone);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch zone', 500);
    }
  }
};

export const createZone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cityId, name, code } = req.body;

    // Check if city exists
    const city = await locationService.getCityById(cityId);
    if (!city) {
      sendError(res, 'City not found', 404);
      return;
    }

    // Check if code already exists
    const existing = await locationService.getZoneByCode(code);
    if (existing) {
      sendError(res, 'Zone code already exists', 409);
      return;
    }

    const zone = await locationService.createZone({
      cityId,
      name,
      code,
      createdBy: req.user?.id,
    });

    sendSuccess(res, zone, 'Zone created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create zone', 500);
    }
  }
};

export const updateZone = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const { cityId, name, code } = req.body;

    const existing = await locationService.getZoneById(id);
    if (!existing) {
      sendError(res, 'Zone not found', 404);
      return;
    }

    // Check if city exists
    if (cityId) {
      const city = await locationService.getCityById(cityId);
      if (!city) {
        sendError(res, 'City not found', 404);
        return;
      }
    }

    // Check if code already exists (excluding current zone)
    if (code) {
      const codeExists = await locationService.getZoneByCode(code);
      if (codeExists && codeExists.id !== id) {
        sendError(res, 'Zone code already exists', 409);
        return;
      }
    }

    const zone = await locationService.updateZone(id, {
      cityId,
      name,
      code,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, zone, 'Zone updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update zone', 500);
    }
  }
};

export const deleteZone = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await locationService.getZoneById(id);
    if (!existing) {
      sendError(res, 'Zone not found', 404);
      return;
    }

    await locationService.deleteZone(id);
    sendSuccess(res, null, 'Zone deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete zone', 500);
    }
  }
};

// ==================== DROPDOWN OPTIONS ====================

export const getRegionsDropdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const regions = await locationService.getRegionsForDropdown();
    sendSuccess(res, regions);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch regions', 500);
    }
  }
};

export const getCitiesDropdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const regionId = getString(req.query.regionId);
    const cities = await locationService.getCitiesForDropdown(regionId);
    sendSuccess(res, cities);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch cities', 500);
    }
  }
};

export const getZonesDropdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const cityId = getString(req.query.cityId);
    const zones = await locationService.getZonesForDropdown(cityId);
    sendSuccess(res, zones);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch zones', 500);
    }
  }
};
