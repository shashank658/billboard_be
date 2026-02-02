import type { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service.js';
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

export class CampaignController {
  async getAllCampaigns(req: Request, res: Response, _next: NextFunction) {
    try {
      const { page, pageSize } = getPaginationParams(req);
      const { sortBy, sortOrder } = getSortParams(
        req,
        ['name', 'referenceCode', 'startDate', 'endDate', 'totalValue', 'createdAt'],
        'createdAt'
      );
      const customerId = getString(req.query.customerId);
      const search = getString(req.query.search);
      const startDateFrom = getString(req.query.startDateFrom);
      const startDateTo = getString(req.query.startDateTo);

      const result = await campaignService.getAllCampaigns({
        page,
        pageSize,
        sortBy,
        sortOrder,
        customerId,
        search,
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
        sendError(res, 'Failed to fetch campaigns', 500);
      }
    }
  }

  async getCampaignById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const campaign = await campaignService.getCampaignById(id);

      if (!campaign) {
        sendError(res, 'Campaign not found', 404);
        return;
      }

      sendSuccess(res, campaign);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch campaign', 500);
      }
    }
  }

  async createCampaign(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const campaign = await campaignService.createCampaign({
        ...req.body,
        createdBy: userId,
      });

      sendSuccess(res, campaign, 'Campaign created successfully', 201);
    } catch (error) {
      console.error('Campaign creation error:', error);
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to create campaign', 500);
      }
    }
  }

  async updateCampaign(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = getParamId(req.params);
      const userId = req.user?.id;

      const campaign = await campaignService.updateCampaign(id, {
        ...req.body,
        updatedBy: userId,
      });

      if (!campaign) {
        sendError(res, 'Campaign not found', 404);
        return;
      }

      sendSuccess(res, campaign, 'Campaign updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to update campaign', 500);
      }
    }
  }

  async deleteCampaign(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      await campaignService.deleteCampaign(id);
      sendSuccess(res, null, 'Campaign deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error && error.message.includes('Cannot delete')) {
        sendError(res, error.message, 400);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to delete campaign', 500);
      }
    }
  }

  async addBookingToCampaign(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = getParamId(req.params);
      const { bookingId } = req.body;
      const userId = req.user?.id;

      const campaign = await campaignService.addBookingToCampaign(id, bookingId, userId);
      sendSuccess(res, campaign, 'Booking added to campaign successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error && error.message.includes('must belong')) {
        sendError(res, error.message, 400);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to add booking to campaign', 500);
      }
    }
  }

  async removeBookingFromCampaign(req: Request, res: Response, _next: NextFunction) {
    try {
      const campaignId = getParamId(req.params);
      const bookingId = req.params.bookingId;

      if (typeof bookingId !== 'string') {
        sendError(res, 'Invalid booking ID parameter', 400);
        return;
      }

      const userId = req.user?.id;
      const campaign = await campaignService.removeBookingFromCampaign(campaignId, bookingId, userId);
      sendSuccess(res, campaign, 'Booking removed from campaign successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to remove booking from campaign', 500);
      }
    }
  }

  async getAvailableBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const customerId = getString(req.query.customerId);
      const excludeCampaignId = getString(req.query.excludeCampaignId);

      if (!customerId) {
        sendError(res, 'customerId is required', 400);
        return;
      }

      const bookings = await campaignService.getBookingsNotInCampaign(customerId, excludeCampaignId);
      sendSuccess(res, bookings);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch available bookings', 500);
      }
    }
  }

  async getAvailableBillboards(req: Request, res: Response, _next: NextFunction) {
    try {
      const startDate = getString(req.query.startDate);
      const endDate = getString(req.query.endDate);

      if (!startDate || !endDate) {
        sendError(res, 'startDate and endDate are required', 400);
        return;
      }

      const billboards = await campaignService.getAvailableBillboards(startDate, endDate);
      sendSuccess(res, billboards);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch available billboards', 500);
      }
    }
  }
}

export const campaignController = new CampaignController();
