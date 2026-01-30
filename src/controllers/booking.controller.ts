import type { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import { validationResult } from 'express-validator';
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

const getParamBillboardId = (params: Record<string, unknown>): string => {
  const billboardId = params.billboardId;
  if (typeof billboardId !== 'string') {
    throw new Error('Invalid billboard ID parameter');
  }
  return billboardId;
};

export class BookingController {
  async getAllBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const { page, pageSize } = getPaginationParams(req);
      const { sortBy, sortOrder } = getSortParams(
        req,
        ['startDate', 'endDate', 'referenceCode', 'status', 'createdAt'],
        'createdAt'
      );
      const customerId = getString(req.query.customerId);
      const billboardId = getString(req.query.billboardId);
      const status = getString(req.query.status);
      const startDateFrom = getString(req.query.startDateFrom);
      const startDateTo = getString(req.query.startDateTo);

      const result = await bookingService.getAllBookings({
        page,
        pageSize,
        sortBy,
        sortOrder,
        customerId,
        billboardId,
        status,
        startDateFrom,
        startDateTo,
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
        sendError(res, 'Failed to fetch bookings', 500);
      }
    }
  }

  async getBookingById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const booking = await bookingService.getBookingById(id);

      if (!booking) {
        sendError(res, 'Booking not found', 404);
        return;
      }

      sendSuccess(res, booking);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch booking', 500);
      }
    }
  }

  async createBooking(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const booking = await bookingService.createBooking({
        ...req.body,
        createdBy: userId,
      });

      sendSuccess(res, booking, 'Booking created successfully', 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        sendError(res, error.message, 409);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to create booking', 500);
      }
    }
  }

  async updateBooking(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = getParamId(req.params);
      const userId = req.user?.id;

      const booking = await bookingService.updateBooking(id, {
        ...req.body,
        updatedBy: userId,
      });

      if (!booking) {
        sendError(res, 'Booking not found', 404);
        return;
      }

      sendSuccess(res, booking, 'Booking updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        sendError(res, error.message, 409);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to update booking', 500);
      }
    }
  }

  async deleteBooking(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      await bookingService.deleteBooking(id);
      sendSuccess(res, null, 'Booking deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error && error.message.includes('Only bookings')) {
        sendError(res, error.message, 400);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to delete booking', 500);
      }
    }
  }

  async checkAvailability(req: Request, res: Response, _next: NextFunction) {
    try {
      const billboardId = getString(req.query.billboardId);
      const startDate = getString(req.query.startDate);
      const endDate = getString(req.query.endDate);
      const slotNumber = getString(req.query.slotNumber);
      const excludeBookingId = getString(req.query.excludeBookingId);

      if (!billboardId || !startDate || !endDate) {
        sendError(res, 'billboardId, startDate, and endDate are required', 400);
        return;
      }

      const result = await bookingService.checkAvailability({
        billboardId,
        startDate,
        endDate,
        slotNumber: slotNumber ? parseInt(slotNumber) : undefined,
        excludeBookingId,
      });

      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to check availability', 500);
      }
    }
  }

  async getCalendarBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const billboardId = getParamBillboardId(req.params);
      const year = getString(req.query.year);
      const month = getString(req.query.month);

      if (!year || !month) {
        sendError(res, 'year and month are required', 400);
        return;
      }

      const result = await bookingService.getCalendarBookings(
        billboardId,
        parseInt(year),
        parseInt(month)
      );

      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch calendar bookings', 500);
      }
    }
  }

  async getBookingsForDateRange(req: Request, res: Response, _next: NextFunction) {
    try {
      const startDate = getString(req.query.startDate);
      const endDate = getString(req.query.endDate);
      const billboardIds = getString(req.query.billboardIds);

      if (!startDate || !endDate) {
        sendError(res, 'startDate and endDate are required', 400);
        return;
      }

      const billboardIdArray = billboardIds ? billboardIds.split(',') : undefined;

      const result = await bookingService.getBookingsForDateRange(
        startDate,
        endDate,
        billboardIdArray
      );

      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch bookings for date range', 500);
      }
    }
  }

  async updateBookingStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const { status } = req.body;
      const userId = req.user?.id;

      if (!status) {
        sendError(res, 'status is required', 400);
        return;
      }

      const booking = await bookingService.updateBookingStatus(id, status, userId);
      sendSuccess(res, booking, 'Booking status updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid status')) {
        sendError(res, error.message, 400);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to update booking status', 500);
      }
    }
  }
}

export const bookingController = new BookingController();
