import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/index.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  },
  message?: string
): Response => {
  const response: PaginatedResponse<T> = {
    success: true,
    ...(message && { message }),
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.totalItems / pagination.pageSize),
    },
  };
  return res.status(200).json(response);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: unknown[]
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(response);
};
