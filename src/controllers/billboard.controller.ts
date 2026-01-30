import type { Request, Response } from 'express';
import { billboardService, type BillboardType, type BillboardStatus } from '../services/billboard.service.js';
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

// Get all billboards with filters
export const getBillboards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(
      req,
      ['name', 'code', 'type', 'status', 'ratePerDay', 'createdAt'],
      'name'
    );
    const search = getString(req.query.search);
    const type = getString(req.query.type) as BillboardType | undefined;
    const status = getString(req.query.status) as BillboardStatus | undefined;
    const zoneId = getString(req.query.zoneId);
    const cityId = getString(req.query.cityId);
    const regionId = getString(req.query.regionId);
    const landlordId = getString(req.query.landlordId);

    const result = await billboardService.getAllBillboards({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      type,
      status,
      zoneId,
      cityId,
      regionId,
      landlordId,
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
      sendError(res, 'Failed to fetch billboards', 500);
    }
  }
};

// Get billboard by ID
export const getBillboardById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const billboard = await billboardService.getBillboardById(id);

    if (!billboard) {
      sendError(res, 'Billboard not found', 404);
      return;
    }

    sendSuccess(res, billboard);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch billboard', 500);
    }
  }
};

// Create billboard
export const createBillboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      description,
      type,
      status,
      width,
      height,
      orientation,
      zoneId,
      address,
      latitude,
      longitude,
      illumination,
      installationDate,
      landlordId,
      ratePerDay,
      loopDuration,
      slotCount,
      slotDuration,
    } = req.body;

    // Check if code already exists
    const existingCode = await billboardService.getBillboardByCode(code);
    if (existingCode) {
      sendError(res, 'Billboard code already exists', 409);
      return;
    }

    // Check if zone exists
    const zone = await locationService.getZoneById(zoneId);
    if (!zone) {
      sendError(res, 'Zone not found', 404);
      return;
    }

    // Validate digital billboard fields
    if (type === 'digital') {
      if (!loopDuration || !slotCount || !slotDuration) {
        sendError(res, 'Digital billboards require loopDuration, slotCount, and slotDuration', 400);
        return;
      }
    }

    const billboard = await billboardService.createBillboard({
      name,
      code,
      description,
      type,
      status,
      width: parseFloat(width),
      height: parseFloat(height),
      orientation,
      zoneId,
      address,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      illumination,
      installationDate: installationDate ? new Date(installationDate) : undefined,
      landlordId,
      ratePerDay: parseFloat(ratePerDay),
      loopDuration: loopDuration ? parseInt(loopDuration) : undefined,
      slotCount: slotCount ? parseInt(slotCount) : undefined,
      slotDuration: slotDuration ? parseInt(slotDuration) : undefined,
      createdBy: req.user?.id,
    });

    sendSuccess(res, billboard, 'Billboard created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create billboard', 500);
    }
  }
};

// Update billboard
export const updateBillboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const {
      name,
      code,
      description,
      type,
      status,
      width,
      height,
      orientation,
      zoneId,
      address,
      latitude,
      longitude,
      illumination,
      installationDate,
      landlordId,
      ratePerDay,
      loopDuration,
      slotCount,
      slotDuration,
    } = req.body;

    // Check if billboard exists
    const existing = await billboardService.getBillboardById(id);
    if (!existing) {
      sendError(res, 'Billboard not found', 404);
      return;
    }

    // Check if new code already exists (excluding current billboard)
    if (code) {
      const codeExists = await billboardService.getBillboardByCode(code);
      if (codeExists && codeExists.id !== id) {
        sendError(res, 'Billboard code already exists', 409);
        return;
      }
    }

    // Check if zone exists
    if (zoneId) {
      const zone = await locationService.getZoneById(zoneId);
      if (!zone) {
        sendError(res, 'Zone not found', 404);
        return;
      }
    }

    // Validate digital billboard fields
    const finalType = type || existing.type;
    if (finalType === 'digital') {
      const finalLoopDuration = loopDuration ?? existing.loopDuration;
      const finalSlotCount = slotCount ?? existing.slotCount;
      const finalSlotDuration = slotDuration ?? existing.slotDuration;
      if (!finalLoopDuration || !finalSlotCount || !finalSlotDuration) {
        sendError(res, 'Digital billboards require loopDuration, slotCount, and slotDuration', 400);
        return;
      }
    }

    const billboard = await billboardService.updateBillboard(id, {
      name,
      code,
      description,
      type,
      status,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      orientation,
      zoneId,
      address,
      latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
      illumination,
      installationDate: installationDate ? new Date(installationDate) : undefined,
      landlordId,
      ratePerDay: ratePerDay ? parseFloat(ratePerDay) : undefined,
      loopDuration: loopDuration !== undefined ? parseInt(loopDuration) : undefined,
      slotCount: slotCount !== undefined ? parseInt(slotCount) : undefined,
      slotDuration: slotDuration !== undefined ? parseInt(slotDuration) : undefined,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, billboard, 'Billboard updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update billboard', 500);
    }
  }
};

// Delete billboard
export const deleteBillboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await billboardService.getBillboardById(id);
    if (!existing) {
      sendError(res, 'Billboard not found', 404);
      return;
    }

    await billboardService.deleteBillboard(id);
    sendSuccess(res, null, 'Billboard deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete billboard', 500);
    }
  }
};

// Get billboards for dropdown
export const getBillboardsDropdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const zoneId = getString(req.query.zoneId);
    const billboards = await billboardService.getBillboardsForDropdown(zoneId);
    sendSuccess(res, billboards);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch billboards', 500);
    }
  }
};

// Get billboard statistics
export const getBillboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await billboardService.getBillboardStats();
    sendSuccess(res, stats);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch billboard statistics', 500);
    }
  }
};
