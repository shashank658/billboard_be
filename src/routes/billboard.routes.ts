import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as billboardController from '../controllers/billboard.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DROPDOWN & STATS ====================

/**
 * @swagger
 * /api/billboards/dropdown:
 *   get:
 *     summary: Get billboards for dropdown
 *     tags: [Billboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *         description: Filter by zone ID
 *     responses:
 *       200:
 *         description: List of billboards for dropdown
 */
router.get(
  '/dropdown',
  requirePermission('billboards.view'),
  asyncHandler(billboardController.getBillboardsDropdown)
);

/**
 * @swagger
 * /api/billboards/stats:
 *   get:
 *     summary: Get billboard statistics
 *     tags: [Billboards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billboard statistics
 */
router.get(
  '/stats',
  requirePermission('billboards.view'),
  asyncHandler(billboardController.getBillboardStats)
);

// ==================== CRUD OPERATIONS ====================

/**
 * @swagger
 * /api/billboards:
 *   get:
 *     summary: Get all billboards
 *     tags: [Billboards]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, code, or address
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [static, digital]
 *         description: Filter by billboard type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Filter by status
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *         description: Filter by zone
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *         description: Filter by region
 *       - in: query
 *         name: landlordId
 *         schema:
 *           type: string
 *         description: Filter by landlord
 *     responses:
 *       200:
 *         description: List of billboards with pagination
 */
router.get(
  '/',
  requirePermission('billboards.view'),
  asyncHandler(billboardController.getBillboards)
);

/**
 * @swagger
 * /api/billboards/{id}:
 *   get:
 *     summary: Get billboard by ID
 *     tags: [Billboards]
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
 *         description: Billboard details
 *       404:
 *         description: Billboard not found
 */
router.get(
  '/:id',
  requirePermission('billboards.view'),
  validate([
    param('id').isUUID().withMessage('Invalid billboard ID'),
  ]),
  asyncHandler(billboardController.getBillboardById)
);

/**
 * @swagger
 * /api/billboards:
 *   post:
 *     summary: Create a new billboard
 *     tags: [Billboards]
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
 *               - code
 *               - type
 *               - width
 *               - height
 *               - zoneId
 *               - address
 *               - landlordId
 *               - ratePerDay
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [static, digital]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               orientation:
 *                 type: string
 *                 enum: [portrait, landscape]
 *               zoneId:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               illumination:
 *                 type: string
 *               installationDate:
 *                 type: string
 *                 format: date
 *               landlordId:
 *                 type: string
 *               ratePerDay:
 *                 type: number
 *               loopDuration:
 *                 type: integer
 *               slotCount:
 *                 type: integer
 *               slotDuration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Billboard created
 *       409:
 *         description: Code already exists
 */
router.post(
  '/',
  requirePermission('billboards.create'),
  validate([
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().isLength({ max: 50 }).withMessage('Code is required (max 50 chars)'),
    body('type').isIn(['static', 'digital']).withMessage('Type must be static or digital'),
    body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
    body('width').isFloat({ min: 0.1 }).withMessage('Width must be a positive number'),
    body('height').isFloat({ min: 0.1 }).withMessage('Height must be a positive number'),
    body('orientation').optional().isIn(['portrait', 'landscape']).withMessage('Invalid orientation'),
    body('zoneId').isUUID().withMessage('Valid zone ID is required'),
    body('address').notEmpty().trim().withMessage('Address is required'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('landlordId').isUUID().withMessage('Valid landlord ID is required'),
    body('ratePerDay').isFloat({ min: 0 }).withMessage('Rate per day must be a non-negative number'),
    body('loopDuration').optional().isInt({ min: 1 }).withMessage('Loop duration must be a positive integer'),
    body('slotCount').optional().isInt({ min: 1, max: 20 }).withMessage('Slot count must be between 1 and 20'),
    body('slotDuration').optional().isInt({ min: 1 }).withMessage('Slot duration must be a positive integer'),
  ]),
  asyncHandler(billboardController.createBillboard)
);

/**
 * @swagger
 * /api/billboards/{id}:
 *   put:
 *     summary: Update a billboard
 *     tags: [Billboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [static, digital]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               orientation:
 *                 type: string
 *                 enum: [portrait, landscape]
 *               zoneId:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               illumination:
 *                 type: string
 *               installationDate:
 *                 type: string
 *                 format: date
 *               landlordId:
 *                 type: string
 *               ratePerDay:
 *                 type: number
 *               loopDuration:
 *                 type: integer
 *               slotCount:
 *                 type: integer
 *               slotDuration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Billboard updated
 *       404:
 *         description: Billboard not found
 */
router.put(
  '/:id',
  requirePermission('billboards.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid billboard ID'),
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().trim().isLength({ max: 50 }).withMessage('Code max 50 chars'),
    body('type').optional().isIn(['static', 'digital']).withMessage('Type must be static or digital'),
    body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
    body('width').optional().isFloat({ min: 0.1 }).withMessage('Width must be a positive number'),
    body('height').optional().isFloat({ min: 0.1 }).withMessage('Height must be a positive number'),
    body('orientation').optional().isIn(['portrait', 'landscape']).withMessage('Invalid orientation'),
    body('zoneId').optional().isUUID().withMessage('Valid zone ID required'),
    body('address').optional().notEmpty().trim().withMessage('Address cannot be empty'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('landlordId').optional().isUUID().withMessage('Valid landlord ID required'),
    body('ratePerDay').optional().isFloat({ min: 0 }).withMessage('Rate per day must be a non-negative number'),
    body('loopDuration').optional().isInt({ min: 1 }).withMessage('Loop duration must be a positive integer'),
    body('slotCount').optional().isInt({ min: 1, max: 20 }).withMessage('Slot count must be between 1 and 20'),
    body('slotDuration').optional().isInt({ min: 1 }).withMessage('Slot duration must be a positive integer'),
  ]),
  asyncHandler(billboardController.updateBillboard)
);

/**
 * @swagger
 * /api/billboards/{id}:
 *   delete:
 *     summary: Delete a billboard
 *     tags: [Billboards]
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
 *         description: Billboard deleted
 *       400:
 *         description: Cannot delete billboard with bookings
 *       404:
 *         description: Billboard not found
 */
router.delete(
  '/:id',
  requirePermission('billboards.delete'),
  validate([
    param('id').isUUID().withMessage('Invalid billboard ID'),
  ]),
  asyncHandler(billboardController.deleteBillboard)
);

export default router;
