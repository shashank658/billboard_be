import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as taxController from '../controllers/tax.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DROPDOWN ====================

/**
 * @swagger
 * /api/taxes/dropdown:
 *   get:
 *     summary: Get taxes for dropdown
 *     tags: [Taxes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active taxes for dropdown
 */
router.get(
  '/dropdown',
  requirePermission('taxes.view'),
  asyncHandler(taxController.getTaxesDropdown)
);

// ==================== CRUD OPERATIONS ====================

/**
 * @swagger
 * /api/taxes:
 *   get:
 *     summary: Get all taxes
 *     tags: [Taxes]
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
 *         description: Search by name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of taxes with pagination
 */
router.get(
  '/',
  requirePermission('taxes.view'),
  asyncHandler(taxController.getTaxes)
);

/**
 * @swagger
 * /api/taxes/{id}:
 *   get:
 *     summary: Get tax by ID
 *     tags: [Taxes]
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
 *         description: Tax details
 *       404:
 *         description: Tax not found
 */
router.get(
  '/:id',
  requirePermission('taxes.view'),
  validate([
    param('id').isUUID().withMessage('Invalid tax ID'),
  ]),
  asyncHandler(taxController.getTaxById)
);

/**
 * @swagger
 * /api/taxes:
 *   post:
 *     summary: Create a new tax
 *     tags: [Taxes]
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
 *               - percentage
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tax name (e.g., "GST 18%", "IGST 18%")
 *               percentage:
 *                 type: number
 *                 description: Tax percentage (0-100)
 *               hsnSacCode:
 *                 type: string
 *                 description: HSN/SAC code for the tax
 *               description:
 *                 type: string
 *                 description: Additional description
 *     responses:
 *       201:
 *         description: Tax created
 */
router.post(
  '/',
  requirePermission('taxes.create'),
  validate([
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('hsnSacCode').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('HSN/SAC code too long'),
    body('description').optional({ values: 'falsy' }).trim(),
  ]),
  asyncHandler(taxController.createTax)
);

/**
 * @swagger
 * /api/taxes/{id}:
 *   put:
 *     summary: Update a tax
 *     tags: [Taxes]
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
 *               percentage:
 *                 type: number
 *               hsnSacCode:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tax updated
 *       404:
 *         description: Tax not found
 */
router.put(
  '/:id',
  requirePermission('taxes.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid tax ID'),
    body('name').optional({ values: 'falsy' }).notEmpty().trim().withMessage('Name cannot be empty'),
    body('percentage').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('hsnSacCode').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('HSN/SAC code too long'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  asyncHandler(taxController.updateTax)
);

/**
 * @swagger
 * /api/taxes/{id}:
 *   delete:
 *     summary: Delete a tax
 *     tags: [Taxes]
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
 *         description: Tax deleted
 *       404:
 *         description: Tax not found
 */
router.delete(
  '/:id',
  requirePermission('taxes.delete'),
  validate([
    param('id').isUUID().withMessage('Invalid tax ID'),
  ]),
  asyncHandler(taxController.deleteTax)
);

export default router;
