import { Router } from 'express';
import { body } from 'express-validator';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         referenceCode:
 *           type: string
 *           example: "BK-2024-0001"
 *         customerId:
 *           type: string
 *           format: uuid
 *         billboardId:
 *           type: string
 *           format: uuid
 *         campaignId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         slotNumber:
 *           type: integer
 *           nullable: true
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         notionalValue:
 *           type: string
 *         status:
 *           type: string
 *           enum: [created, confirmed, active, completed, po_generated, invoiced]
 *         creativeRef:
 *           type: string
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
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
 *         name: billboardId
 *         schema:
 *           type: string
 *         description: Filter by billboard ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/', bookingController.getAllBookings);

/**
 * @swagger
 * /api/bookings/availability:
 *   get:
 *     summary: Check billboard availability
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: billboardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: slotNumber
 *         schema:
 *           type: integer
 *       - in: query
 *         name: excludeBookingId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability status
 */
router.get('/availability', bookingController.checkAvailability);

/**
 * @swagger
 * /api/bookings/date-range:
 *   get:
 *     summary: Get bookings for a date range
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: billboardIds
 *         schema:
 *           type: string
 *         description: Comma-separated billboard IDs
 *     responses:
 *       200:
 *         description: List of bookings in date range
 */
router.get('/date-range', bookingController.getBookingsForDateRange);

/**
 * @swagger
 * /api/bookings/calendar/{billboardId}:
 *   get:
 *     summary: Get calendar bookings for a billboard
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: billboardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Calendar bookings for the month
 */
router.get('/calendar/:billboardId', bookingController.getCalendarBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
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
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:id', bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - billboardId
 *               - startDate
 *               - endDate
 *             properties:
 *               customerId:
 *                 type: string
 *               billboardId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               slotNumber:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               notionalValue:
 *                 type: string
 *               creativeRef:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created
 *       409:
 *         description: Billboard not available
 */
router.post(
  '/',
  [
    body('customerId').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('billboardId').notEmpty().withMessage('Billboard ID is required').isUUID(),
    body('startDate').notEmpty().withMessage('Start date is required').isDate(),
    body('endDate').notEmpty().withMessage('End date is required').isDate(),
    body('campaignId').optional({ nullable: true }).isUUID(),
    body('slotNumber').optional({ nullable: true }).isInt({ min: 1 }),
    body('notionalValue').optional().isString(),
    body('creativeRef').optional().isString(),
    body('notes').optional().isString(),
  ],
  bookingController.createBooking
);

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Update a booking
 *     tags: [Bookings]
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
 *               customerId:
 *                 type: string
 *               billboardId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               slotNumber:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               notionalValue:
 *                 type: string
 *               status:
 *                 type: string
 *               creativeRef:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Billboard not available
 */
router.put(
  '/:id',
  [
    body('customerId').optional().isUUID(),
    body('billboardId').optional().isUUID(),
    body('campaignId').optional({ nullable: true }).isUUID(),
    body('slotNumber').optional({ nullable: true }).isInt({ min: 1 }),
    body('startDate').optional().isDate(),
    body('endDate').optional().isDate(),
    body('notionalValue').optional().isString(),
    body('status').optional().isString(),
    body('creativeRef').optional().isString(),
    body('notes').optional().isString(),
  ],
  bookingController.updateBooking
);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [created, confirmed, active, completed, po_generated, invoiced]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', bookingController.updateBookingStatus);

/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Booking deleted
 *       400:
 *         description: Cannot delete booking
 *       404:
 *         description: Booking not found
 */
router.delete('/:id', bookingController.deleteBooking);

export default router;
