import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

export class DashboardController {
  async getStats(_req: Request, res: Response, _next: NextFunction) {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch dashboard stats', 500);
      }
    }
  }

  async getRecentBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const limit = getNumber(req.query.limit) || 5;
      const bookings = await dashboardService.getRecentBookings(limit);
      sendSuccess(res, bookings);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch recent bookings', 500);
      }
    }
  }

  async getOccupancyRates(req: Request, res: Response, _next: NextFunction) {
    try {
      const startDate = getString(req.query.startDate);
      const endDate = getString(req.query.endDate);

      if (!startDate || !endDate) {
        sendError(res, 'startDate and endDate are required', 400);
        return;
      }

      const occupancy = await dashboardService.getOccupancyRates(startDate, endDate);
      sendSuccess(res, occupancy);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch occupancy rates', 500);
      }
    }
  }

  async getRevenueByMonth(req: Request, res: Response, _next: NextFunction) {
    try {
      const months = getNumber(req.query.months) || 6;
      const revenue = await dashboardService.getRevenueByMonth(months);
      sendSuccess(res, revenue);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch revenue data', 500);
      }
    }
  }

  async getUpcomingBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const days = getNumber(req.query.days) || 7;
      const bookings = await dashboardService.getUpcomingBookings(days);
      sendSuccess(res, bookings);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch upcoming bookings', 500);
      }
    }
  }
}

export const dashboardController = new DashboardController();
