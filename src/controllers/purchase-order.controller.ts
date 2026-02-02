import type { Request, Response, NextFunction } from 'express';
import { purchaseOrderService } from '../services/purchase-order.service.js';
import { pdfService } from '../services/pdf.service.js';
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

export class PurchaseOrderController {
  async getAllPurchaseOrders(req: Request, res: Response, _next: NextFunction) {
    try {
      const { page, pageSize } = getPaginationParams(req);
      const { sortBy, sortOrder } = getSortParams(
        req,
        ['poNumber', 'actualValue', 'actualStartDate', 'actualEndDate', 'createdAt'],
        'createdAt'
      );
      const customerId = getString(req.query.customerId);
      const search = getString(req.query.search);
      const dateFrom = getString(req.query.dateFrom);
      const dateTo = getString(req.query.dateTo);

      const result = await purchaseOrderService.getAllPurchaseOrders({
        page,
        pageSize,
        sortBy,
        sortOrder,
        customerId,
        search,
        dateFrom,
        dateTo,
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
        sendError(res, 'Failed to fetch purchase orders', 500);
      }
    }
  }

  async getPurchaseOrderById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id);

      if (!purchaseOrder) {
        sendError(res, 'Purchase order not found', 404);
        return;
      }

      sendSuccess(res, purchaseOrder);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch purchase order', 500);
      }
    }
  }

  async createPurchaseOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.id;
      const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
        ...req.body,
        createdBy: userId,
      });

      sendSuccess(res, purchaseOrder, 'Purchase order created successfully', 201);
    } catch (error) {
      console.error('Purchase order creation error:', error);
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          sendError(res, error.message, 409);
          return;
        }
        if (error.message.includes('not found')) {
          sendError(res, error.message, 404);
          return;
        }
        if (error.message.includes('Cannot generate')) {
          sendError(res, error.message, 400);
          return;
        }
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to create purchase order', 500);
      }
    }
  }

  async updatePurchaseOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = getParamId(req.params);
      const userId = req.user?.id;

      const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(id, {
        ...req.body,
        updatedBy: userId,
      });

      if (!purchaseOrder) {
        sendError(res, 'Purchase order not found', 404);
        return;
      }

      sendSuccess(res, purchaseOrder, 'Purchase order updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to update purchase order', 500);
      }
    }
  }

  async deletePurchaseOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const userId = req.user?.id;

      await purchaseOrderService.deletePurchaseOrder(id, userId);
      sendSuccess(res, null, 'Purchase order deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        sendError(res, error.message, 404);
        return;
      }
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to delete purchase order', 500);
      }
    }
  }

  async getEligibleBookings(req: Request, res: Response, _next: NextFunction) {
    try {
      const customerId = getString(req.query.customerId);
      const bookings = await purchaseOrderService.getBookingsEligibleForPO(customerId);
      sendSuccess(res, bookings);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to fetch eligible bookings', 500);
      }
    }
  }

  async calculateProRata(req: Request, res: Response, _next: NextFunction) {
    try {
      const bookingId = getString(req.query.bookingId);
      const actualStartDate = getString(req.query.actualStartDate);
      const actualEndDate = getString(req.query.actualEndDate);

      if (!bookingId || !actualStartDate || !actualEndDate) {
        sendError(res, 'bookingId, actualStartDate, and actualEndDate are required', 400);
        return;
      }

      const calculation = await purchaseOrderService.calculateProRataValue(
        bookingId,
        actualStartDate,
        actualEndDate
      );

      sendSuccess(res, calculation);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to calculate pro-rata value', 500);
      }
    }
  }

  async downloadPDF(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = getParamId(req.params);
      const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id);

      if (!purchaseOrder) {
        sendError(res, 'Purchase order not found', 404);
        return;
      }

      const pdfBuffer = await pdfService.generatePurchaseOrderPDF(purchaseOrder);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${purchaseOrder.poNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      if (error instanceof Error) {
        sendError(res, error.message, 500);
      } else {
        sendError(res, 'Failed to generate PDF', 500);
      }
    }
  }
}

export const purchaseOrderController = new PurchaseOrderController();
