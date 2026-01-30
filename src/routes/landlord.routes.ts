import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as landlordController from '../controllers/landlord.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DROPDOWN ====================

/**
 * @swagger
 * /api/landlords/dropdown:
 *   get:
 *     summary: Get landlords for dropdown
 *     tags: [Landlords]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active landlords for dropdown
 */
router.get(
  '/dropdown',
  requirePermission('landlords.view'),
  asyncHandler(landlordController.getLandlordsDropdown)
);

// ==================== CRUD OPERATIONS ====================

/**
 * @swagger
 * /api/landlords:
 *   get:
 *     summary: Get all landlords
 *     tags: [Landlords]
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
 *         description: List of landlords with pagination
 */
router.get(
  '/',
  requirePermission('landlords.view'),
  asyncHandler(landlordController.getLandlords)
);

/**
 * @swagger
 * /api/landlords/{id}:
 *   get:
 *     summary: Get landlord by ID
 *     tags: [Landlords]
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
 *         description: Landlord details
 *       404:
 *         description: Landlord not found
 */
router.get(
  '/:id',
  requirePermission('landlords.view'),
  validate([
    param('id').isUUID().withMessage('Invalid landlord ID'),
  ]),
  asyncHandler(landlordController.getLandlordById)
);

/**
 * @swagger
 * /api/landlords:
 *   post:
 *     summary: Create a new landlord
 *     tags: [Landlords]
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
 *               - rentAmount
 *               - paymentFrequency
 *             properties:
 *               name:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *               agreementDetails:
 *                 type: string
 *               rentAmount:
 *                 type: number
 *               paymentFrequency:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *     responses:
 *       201:
 *         description: Landlord created
 */
router.post(
  '/',
  requirePermission('landlords.create'),
  validate([
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('contactPerson').optional({ values: 'falsy' }).trim(),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
    body('rentAmount').isFloat({ min: 0 }).withMessage('Rent amount must be a non-negative number'),
    body('paymentFrequency').isIn(['monthly', 'quarterly', 'yearly']).withMessage('Invalid payment frequency'),
  ]),
  asyncHandler(landlordController.createLandlord)
);

/**
 * @swagger
 * /api/landlords/{id}:
 *   put:
 *     summary: Update a landlord
 *     tags: [Landlords]
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
 *               contactPerson:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *               agreementDetails:
 *                 type: string
 *               rentAmount:
 *                 type: number
 *               paymentFrequency:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Landlord updated
 *       404:
 *         description: Landlord not found
 */
router.put(
  '/:id',
  requirePermission('landlords.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid landlord ID'),
    body('name').optional({ values: 'falsy' }).notEmpty().trim().withMessage('Name cannot be empty'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
    body('rentAmount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Rent amount must be a non-negative number'),
    body('paymentFrequency').optional({ values: 'falsy' }).isIn(['monthly', 'quarterly', 'yearly']).withMessage('Invalid payment frequency'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  asyncHandler(landlordController.updateLandlord)
);

/**
 * @swagger
 * /api/landlords/{id}:
 *   delete:
 *     summary: Delete a landlord
 *     tags: [Landlords]
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
 *         description: Landlord deleted
 *       400:
 *         description: Cannot delete landlord with billboards
 *       404:
 *         description: Landlord not found
 */
router.delete(
  '/:id',
  requirePermission('landlords.delete'),
  validate([
    param('id').isUUID().withMessage('Invalid landlord ID'),
  ]),
  asyncHandler(landlordController.deleteLandlord)
);

export default router;
