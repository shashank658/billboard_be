import type { Request, Response } from 'express';
import { taxService } from '../services/tax.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, getSortParams } from '../utils/pagination.js';

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const getParamId = (params: Record<string, unknown>): string => {
  const id = params.id;
  if (typeof id !== 'string') {
    throw new Error('Invalid ID parameter');
  }
  return id;
};

// Get all taxes
export const getTaxes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'percentage', 'hsnSacCode', 'createdAt'], 'name');
    const search = getString(req.query.search);
    const isActive = getBoolean(req.query.isActive);

    const result = await taxService.getAllTaxes({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      isActive,
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
      sendError(res, 'Failed to fetch taxes', 500);
    }
  }
};

// Get tax by ID
export const getTaxById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const tax = await taxService.getTaxById(id);

    if (!tax) {
      sendError(res, 'Tax not found', 404);
      return;
    }

    sendSuccess(res, tax);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch tax', 500);
    }
  }
};

// Create tax
export const createTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      percentage,
      hsnSacCode,
      description,
    } = req.body;

    const tax = await taxService.createTax({
      name,
      percentage: typeof percentage === 'number' ? percentage : parseFloat(percentage),
      hsnSacCode: hsnSacCode || undefined,
      description: description || undefined,
      createdBy: req.user?.id,
    });

    sendSuccess(res, tax, 'Tax created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create tax', 500);
    }
  }
};

// Update tax
export const updateTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const {
      name,
      percentage,
      hsnSacCode,
      description,
      isActive,
    } = req.body;

    const existing = await taxService.getTaxById(id);
    if (!existing) {
      sendError(res, 'Tax not found', 404);
      return;
    }

    const tax = await taxService.updateTax(id, {
      name: name || undefined,
      percentage: percentage !== undefined ? (typeof percentage === 'number' ? percentage : parseFloat(percentage)) : undefined,
      hsnSacCode: hsnSacCode || undefined,
      description: description || undefined,
      isActive,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, tax, 'Tax updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update tax', 500);
    }
  }
};

// Delete tax
export const deleteTax = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await taxService.getTaxById(id);
    if (!existing) {
      sendError(res, 'Tax not found', 404);
      return;
    }

    await taxService.deleteTax(id);
    sendSuccess(res, null, 'Tax deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete tax', 500);
    }
  }
};

// Get taxes for dropdown
export const getTaxesDropdown = async (_req: Request, res: Response): Promise<void> => {
  try {
    const taxes = await taxService.getTaxesForDropdown();
    sendSuccess(res, taxes);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch taxes', 500);
    }
  }
};
