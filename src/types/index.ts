import type { Request } from 'express';

// User with permissions (from auth service)
export interface UserWithPermissions {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  isCustomer: boolean;
  customerId: string | null;
  roles: string[];
  permissions: string[];
}

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: UserWithPermissions;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Common entity types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Filter types
export interface FilterParams {
  search?: string;
  [key: string]: unknown;
}

// Query params
export interface QueryParams extends PaginationParams, Partial<SortParams>, FilterParams {}
