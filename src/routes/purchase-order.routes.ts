import { Router } from 'express';
import { body } from 'express-validator';
import { purchaseOrderController } from '../controllers/purchase-order.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         poNumber:
 *           type: string
 *           example: "PO-2024-0001"
 *         bookingId:
 *           type: string
 *           format: uuid
 *         actualStartDate:
 *           type: string
 *           format: date
 *         actualEndDate:
 *           type: string
 *           format: date
 *         actualValue:
 *           type: string
 *           example: "45000.00"
 *         adjustmentNotes:
 *           type: string
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by PO number or booking reference
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date from
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date to
 *     responses:
 *       200:
 *         description: List of purchase orders
 */
router.get('/', purchaseOrderController.getAllPurchaseOrders);

/**
 * @swagger
 * /api/purchase-orders/eligible-bookings:
 *   get:
 *     summary: Get bookings eligible for PO generation
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: List of bookings that can have PO generated
 */
router.get('/eligible-bookings', purchaseOrderController.getEligibleBookings);

/**
 * @swagger
 * /api/purchase-orders/calculate-pro-rata:
 *   get:
 *     summary: Calculate pro-rata value for a booking
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *       - in: query
 *         name: actualStartDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Actual display start date
 *       - in: query
 *         name: actualEndDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Actual display end date
 *     responses:
 *       200:
 *         description: Pro-rata calculation details
 */
router.get('/calculate-pro-rata', purchaseOrderController.calculateProRata);

/**
 * @swagger
 * /api/purchase-orders/{id}/download:
 *   get:
 *     summary: Download purchase order as PDF
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Purchase order not found
 */
router.get('/:id/download', purchaseOrderController.downloadPDF);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order details
 *       404:
 *         description: Purchase order not found
 */
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Create a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - actualStartDate
 *               - actualEndDate
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               actualStartDate:
 *                 type: string
 *                 format: date
 *               actualEndDate:
 *                 type: string
 *                 format: date
 *               actualValue:
 *                 type: string
 *                 description: Override calculated value (optional)
 *               adjustmentNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase order created
 *       400:
 *         description: Invalid booking status
 *       404:
 *         description: Booking not found
 *       409:
 *         description: PO already exists for booking
 */
router.post(
  '/',
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required').isUUID(),
    body('actualStartDate').notEmpty().withMessage('Actual start date is required').isString(),
    body('actualEndDate').notEmpty().withMessage('Actual end date is required').isString(),
    body('actualValue').optional().isString(),
    body('adjustmentNotes').optional().isString(),
  ],
  purchaseOrderController.createPurchaseOrder
);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Update a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualStartDate:
 *                 type: string
 *                 format: date
 *               actualEndDate:
 *                 type: string
 *                 format: date
 *               actualValue:
 *                 type: string
 *               adjustmentNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Purchase order updated
 *       404:
 *         description: Purchase order not found
 */
router.put(
  '/:id',
  [
    body('actualStartDate').optional().isString(),
    body('actualEndDate').optional().isString(),
    body('actualValue').optional().isString(),
    body('adjustmentNotes').optional().isString(),
  ],
  purchaseOrderController.updatePurchaseOrder
);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order deleted
 *       404:
 *         description: Purchase order not found
 */
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

export default router;
