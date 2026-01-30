import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as customerController from '../controllers/customer.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DROPDOWN ====================

/**
 * @swagger
 * /api/customers/dropdown:
 *   get:
 *     summary: Get customers for dropdown
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active customers for dropdown
 */
router.get(
  '/dropdown',
  requirePermission('customers.view'),
  asyncHandler(customerController.getCustomersDropdown)
);

// ==================== CRUD OPERATIONS ====================

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
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
 *         description: List of customers with pagination
 */
router.get(
  '/',
  requirePermission('customers.view'),
  asyncHandler(customerController.getCustomers)
);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
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
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get(
  '/:id',
  requirePermission('customers.view'),
  validate([
    param('id').isUUID().withMessage('Invalid customer ID'),
  ]),
  asyncHandler(customerController.getCustomerById)
);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
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
 *               billingAddress:
 *                 type: string
 *               gstNumber:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post(
  '/',
  requirePermission('customers.create'),
  validate([
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('contactPerson').optional({ values: 'falsy' }).trim(),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
    body('address').optional({ values: 'falsy' }).trim(),
    body('billingAddress').optional({ values: 'falsy' }).trim(),
    body('gstNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('GST number too long'),
    body('panNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('PAN number too long'),
    body('bankName').optional({ values: 'falsy' }).trim(),
    body('bankAccount').optional({ values: 'falsy' }).trim(),
    body('ifscCode').optional({ values: 'falsy' }).trim(),
  ]),
  asyncHandler(customerController.createCustomer)
);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
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
 *               billingAddress:
 *                 type: string
 *               gstNumber:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Customer updated
 *       404:
 *         description: Customer not found
 */
router.put(
  '/:id',
  requirePermission('customers.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid customer ID'),
    body('name').optional({ values: 'falsy' }).notEmpty().trim().withMessage('Name cannot be empty'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
    body('gstNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('GST number too long'),
    body('panNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('PAN number too long'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ]),
  asyncHandler(customerController.updateCustomer)
);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
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
 *         description: Customer deleted
 *       400:
 *         description: Cannot delete customer with bookings
 *       404:
 *         description: Customer not found
 */
router.delete(
  '/:id',
  requirePermission('customers.delete'),
  validate([
    param('id').isUUID().withMessage('Invalid customer ID'),
  ]),
  asyncHandler(customerController.deleteCustomer)
);

export default router;
