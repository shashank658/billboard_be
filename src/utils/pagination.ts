import { Request } from 'express';
import { config } from '../config/index.js';
import { PaginationParams, SortParams, QueryParams } from '../types/index.js';

export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    config.pagination.maxPageSize,
    Math.max(1, parseInt(req.query.pageSize as string) || config.pagination.defaultPageSize)
  );

  return { page, pageSize };
};

export const getSortParams = (
  req: Request,
  allowedFields: string[] = ['createdAt'],
  defaultField: string = 'createdAt'
): SortParams => {
  const sortBy = allowedFields.includes(req.query.sortBy as string)
    ? (req.query.sortBy as string)
    : defaultField;
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  return { sortBy, sortOrder };
};

export const getOffset = (page: number, pageSize: number): number => {
  return (page - 1) * pageSize;
};

export const getQueryParams = (
  req: Request,
  allowedSortFields?: string[],
  defaultSortField?: string
): QueryParams => {
  const { page, pageSize } = getPaginationParams(req);
  const { sortBy, sortOrder } = getSortParams(req, allowedSortFields, defaultSortField);
  const search = (req.query.search as string) || undefined;

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
  };
};
