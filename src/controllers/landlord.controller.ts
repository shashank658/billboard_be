import type { Request, Response } from 'express';
import { landlordService, type PaymentFrequency } from '../services/landlord.service.js';
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

// Get all landlords
export const getLandlords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'contactPerson', 'rentAmount', 'createdAt'], 'name');
    const search = getString(req.query.search);
    const isActive = getBoolean(req.query.isActive);

    const result = await landlordService.getAllLandlords({
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
      sendError(res, 'Failed to fetch landlords', 500);
    }
  }
};

// Get landlord by ID
export const getLandlordById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const landlord = await landlordService.getLandlordById(id);

    if (!landlord) {
      sendError(res, 'Landlord not found', 404);
      return;
    }

    sendSuccess(res, landlord);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch landlord', 500);
    }
  }
};

// Create landlord
export const createLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      bankName,
      bankAccount,
      ifscCode,
      agreementDetails,
      rentAmount,
      paymentFrequency,
    } = req.body;

    const landlord = await landlordService.createLandlord({
      name,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      bankName: bankName || undefined,
      bankAccount: bankAccount || undefined,
      ifscCode: ifscCode || undefined,
      agreementDetails: agreementDetails || undefined,
      rentAmount: typeof rentAmount === 'number' ? rentAmount : parseFloat(rentAmount),
      paymentFrequency: paymentFrequency as PaymentFrequency,
      createdBy: req.user?.id,
    });

    sendSuccess(res, landlord, 'Landlord created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create landlord', 500);
    }
  }
};

// Update landlord
export const updateLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      bankName,
      bankAccount,
      ifscCode,
      agreementDetails,
      rentAmount,
      paymentFrequency,
      isActive,
    } = req.body;

    const existing = await landlordService.getLandlordById(id);
    if (!existing) {
      sendError(res, 'Landlord not found', 404);
      return;
    }

    const landlord = await landlordService.updateLandlord(id, {
      name: name || undefined,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      bankName: bankName || undefined,
      bankAccount: bankAccount || undefined,
      ifscCode: ifscCode || undefined,
      agreementDetails: agreementDetails || undefined,
      rentAmount: rentAmount !== undefined ? (typeof rentAmount === 'number' ? rentAmount : parseFloat(rentAmount)) : undefined,
      paymentFrequency: paymentFrequency as PaymentFrequency | undefined,
      isActive,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, landlord, 'Landlord updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update landlord', 500);
    }
  }
};

// Delete landlord
export const deleteLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await landlordService.getLandlordById(id);
    if (!existing) {
      sendError(res, 'Landlord not found', 404);
      return;
    }

    await landlordService.deleteLandlord(id);
    sendSuccess(res, null, 'Landlord deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete landlord', 500);
    }
  }
};

// Get landlords for dropdown
export const getLandlordsDropdown = async (_req: Request, res: Response): Promise<void> => {
  try {
    const landlords = await landlordService.getLandlordsForDropdown();
    sendSuccess(res, landlords);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch landlords', 500);
    }
  }
};
