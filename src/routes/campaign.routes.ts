import { Router } from 'express';
import { body } from 'express-validator';
import { campaignController } from '../controllers/campaign.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         referenceCode:
 *           type: string
 *           example: "CP-2024-0001"
 *         name:
 *           type: string
 *         customerId:
 *           type: string
 *           format: uuid
 *         description:
 *           type: string
 *         totalValue:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
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
 *         description: Search by name or reference code
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get('/', campaignController.getAllCampaigns);

/**
 * @swagger
 * /api/campaigns/available-bookings:
 *   get:
 *     summary: Get bookings available to add to a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID to get bookings for
 *       - in: query
 *         name: excludeCampaignId
 *         schema:
 *           type: string
 *         description: Exclude bookings already in this campaign
 *     responses:
 *       200:
 *         description: List of available bookings
 */
router.get('/available-bookings', campaignController.getAvailableBookings);

/**
 * @swagger
 * /api/campaigns/available-billboards:
 *   get:
 *     summary: Get billboards available for a campaign date range
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Campaign start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Campaign end date
 *     responses:
 *       200:
 *         description: List of billboards with availability info
 */
router.get('/available-billboards', campaignController.getAvailableBillboards);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
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
 *         description: Campaign details with bookings
 *       404:
 *         description: Campaign not found
 */
router.get('/:id', campaignController.getCampaignById);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - customerId
 *             properties:
 *               name:
 *                 type: string
 *               customerId:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Campaign created
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').isString().trim(),
    body('customerId').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('description').optional().isString(),
    body('startDate').notEmpty().withMessage('Start date is required').isString(),
    body('endDate').notEmpty().withMessage('End date is required').isString(),
    body('billboards').isArray({ min: 1 }).withMessage('At least one billboard is required'),
    body('billboards.*.billboardId').notEmpty().withMessage('Billboard ID is required').isUUID(),
    body('billboards.*.slotNumber').optional().isInt({ min: 1 }),
  ],
  campaignController.createCampaign
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Campaigns]
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
 *               name:
 *                 type: string
 *               customerId:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Campaign updated
 *       404:
 *         description: Campaign not found
 */
router.put(
  '/:id',
  [
    body('name').optional().isString().trim(),
    body('customerId').optional().isUUID(),
    body('description').optional().isString(),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
  ],
  campaignController.updateCampaign
);

/**
 * @swagger
 * /api/campaigns/{id}/bookings:
 *   post:
 *     summary: Add a booking to a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Booking added to campaign
 *       400:
 *         description: Booking must belong to the same customer
 *       404:
 *         description: Campaign or booking not found
 */
router.post(
  '/:id/bookings',
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required').isUUID(),
  ],
  campaignController.addBookingToCampaign
);

/**
 * @swagger
 * /api/campaigns/{id}/bookings/{bookingId}:
 *   delete:
 *     summary: Remove a booking from a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID to remove
 *     responses:
 *       200:
 *         description: Booking removed from campaign
 *       404:
 *         description: Booking not found in this campaign
 */
router.delete('/:id/bookings/:bookingId', campaignController.removeBookingFromCampaign);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags: [Campaigns]
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
 *         description: Campaign deleted
 *       400:
 *         description: Cannot delete campaign with bookings
 *       404:
 *         description: Campaign not found
 */
router.delete('/:id', campaignController.deleteCampaign);

export default router;
