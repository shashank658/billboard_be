import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from './errorHandler.js';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};
