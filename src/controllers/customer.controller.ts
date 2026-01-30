import type { Request, Response } from 'express';
import { customerService } from '../services/customer.service.js';
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

// Get all customers
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = getPaginationParams(req);
    const { sortBy, sortOrder } = getSortParams(req, ['name', 'contactPerson', 'email', 'createdAt'], 'name');
    const search = getString(req.query.search);
    const isActive = getBoolean(req.query.isActive);

    const result = await customerService.getAllCustomers({
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
      sendError(res, 'Failed to fetch customers', 500);
    }
  }
};

// Get customer by ID
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    sendSuccess(res, customer);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch customer', 500);
    }
  }
};

// Create customer
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      billingAddress,
      gstNumber,
      panNumber,
      bankName,
      bankAccount,
      ifscCode,
    } = req.body;

    const customer = await customerService.createCustomer({
      name,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      billingAddress: billingAddress || undefined,
      gstNumber: gstNumber || undefined,
      panNumber: panNumber || undefined,
      bankName: bankName || undefined,
      bankAccount: bankAccount || undefined,
      ifscCode: ifscCode || undefined,
      createdBy: req.user?.id,
    });

    sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to create customer', 500);
    }
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      billingAddress,
      gstNumber,
      panNumber,
      bankName,
      bankAccount,
      ifscCode,
      isActive,
    } = req.body;

    const existing = await customerService.getCustomerById(id);
    if (!existing) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    const customer = await customerService.updateCustomer(id, {
      name: name || undefined,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      billingAddress: billingAddress || undefined,
      gstNumber: gstNumber || undefined,
      panNumber: panNumber || undefined,
      bankName: bankName || undefined,
      bankAccount: bankAccount || undefined,
      ifscCode: ifscCode || undefined,
      isActive,
      updatedBy: req.user?.id,
    });

    sendSuccess(res, customer, 'Customer updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to update customer', 500);
    }
  }
};

// Delete customer
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParamId(req.params);

    const existing = await customerService.getCustomerById(id);
    if (!existing) {
      sendError(res, 'Customer not found', 404);
      return;
    }

    await customerService.deleteCustomer(id);
    sendSuccess(res, null, 'Customer deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Failed to delete customer', 500);
    }
  }
};

// Get customers for dropdown
export const getCustomersDropdown = async (_req: Request, res: Response): Promise<void> => {
  try {
    const customers = await customerService.getCustomersForDropdown();
    sendSuccess(res, customers);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to fetch customers', 500);
    }
  }
};
