import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as locationController from '../controllers/location.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DROPDOWN OPTIONS ====================

/**
 * @swagger
 * /api/locations/regions/dropdown:
 *   get:
 *     summary: Get regions for dropdown
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of regions for dropdown
 */
router.get(
  '/regions/dropdown',
  requirePermission('locations.view'),
  asyncHandler(locationController.getRegionsDropdown)
);

/**
 * @swagger
 * /api/locations/cities/dropdown:
 *   get:
 *     summary: Get cities for dropdown
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *         description: Filter by region ID
 *     responses:
 *       200:
 *         description: List of cities for dropdown
 */
router.get(
  '/cities/dropdown',
  requirePermission('locations.view'),
  asyncHandler(locationController.getCitiesDropdown)
);

/**
 * @swagger
 * /api/locations/zones/dropdown:
 *   get:
 *     summary: Get zones for dropdown
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: string
 *         description: Filter by city ID
 *     responses:
 *       200:
 *         description: List of zones for dropdown
 */
router.get(
  '/zones/dropdown',
  requirePermission('locations.view'),
  asyncHandler(locationController.getZonesDropdown)
);

// ==================== REGIONS ====================

/**
 * @swagger
 * /api/locations/regions:
 *   get:
 *     summary: Get all regions
 *     tags: [Locations]
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
 *     responses:
 *       200:
 *         description: List of regions with pagination
 */
router.get(
  '/regions',
  requirePermission('locations.view'),
  asyncHandler(locationController.getRegions)
);

/**
 * @swagger
 * /api/locations/regions/{id}:
 *   get:
 *     summary: Get region by ID
 *     tags: [Locations]
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
 *         description: Region details
 *       404:
 *         description: Region not found
 */
router.get(
  '/regions/:id',
  requirePermission('locations.view'),
  param('id').isUUID().withMessage('Invalid region ID'),
  validate([]),
  asyncHandler(locationController.getRegionById)
);

/**
 * @swagger
 * /api/locations/regions:
 *   post:
 *     summary: Create a new region
 *     tags: [Locations]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Region created
 *       409:
 *         description: Code already exists
 */
router.post(
  '/regions',
  requirePermission('locations.create'),
  validate([
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().isLength({ max: 20 }).withMessage('Code is required (max 20 chars)'),
  ]),
  asyncHandler(locationController.createRegion)
);

/**
 * @swagger
 * /api/locations/regions/{id}:
 *   put:
 *     summary: Update a region
 *     tags: [Locations]
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
 *     responses:
 *       200:
 *         description: Region updated
 *       404:
 *         description: Region not found
 */
router.put(
  '/regions/:id',
  requirePermission('locations.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid region ID'),
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().trim().isLength({ max: 20 }).withMessage('Code max 20 chars'),
  ]),
  asyncHandler(locationController.updateRegion)
);

/**
 * @swagger
 * /api/locations/regions/{id}:
 *   delete:
 *     summary: Delete a region
 *     tags: [Locations]
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
 *         description: Region deleted
 *       400:
 *         description: Cannot delete region with cities
 *       404:
 *         description: Region not found
 */
router.delete(
  '/regions/:id',
  requirePermission('locations.delete'),
  param('id').isUUID().withMessage('Invalid region ID'),
  validate([]),
  asyncHandler(locationController.deleteRegion)
);

// ==================== CITIES ====================

/**
 * @swagger
 * /api/locations/cities:
 *   get:
 *     summary: Get all cities
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *         description: Filter by region ID
 *     responses:
 *       200:
 *         description: List of cities with pagination
 */
router.get(
  '/cities',
  requirePermission('locations.view'),
  asyncHandler(locationController.getCities)
);

router.get(
  '/cities/:id',
  requirePermission('locations.view'),
  param('id').isUUID().withMessage('Invalid city ID'),
  validate([]),
  asyncHandler(locationController.getCityById)
);

router.post(
  '/cities',
  requirePermission('locations.create'),
  validate([
    body('regionId').isUUID().withMessage('Valid region ID is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().isLength({ max: 20 }).withMessage('Code is required (max 20 chars)'),
  ]),
  asyncHandler(locationController.createCity)
);

router.put(
  '/cities/:id',
  requirePermission('locations.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid city ID'),
    body('regionId').optional().isUUID().withMessage('Valid region ID required'),
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().trim().isLength({ max: 20 }).withMessage('Code max 20 chars'),
  ]),
  asyncHandler(locationController.updateCity)
);

router.delete(
  '/cities/:id',
  requirePermission('locations.delete'),
  param('id').isUUID().withMessage('Invalid city ID'),
  validate([]),
  asyncHandler(locationController.deleteCity)
);

// ==================== ZONES ====================

/**
 * @swagger
 * /api/locations/zones:
 *   get:
 *     summary: Get all zones
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: string
 *         description: Filter by city ID
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *         description: Filter by region ID
 *     responses:
 *       200:
 *         description: List of zones with pagination
 */
router.get(
  '/zones',
  requirePermission('locations.view'),
  asyncHandler(locationController.getZones)
);

router.get(
  '/zones/:id',
  requirePermission('locations.view'),
  param('id').isUUID().withMessage('Invalid zone ID'),
  validate([]),
  asyncHandler(locationController.getZoneById)
);

router.post(
  '/zones',
  requirePermission('locations.create'),
  validate([
    body('cityId').isUUID().withMessage('Valid city ID is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().isLength({ max: 20 }).withMessage('Code is required (max 20 chars)'),
  ]),
  asyncHandler(locationController.createZone)
);

router.put(
  '/zones/:id',
  requirePermission('locations.edit'),
  validate([
    param('id').isUUID().withMessage('Invalid zone ID'),
    body('cityId').optional().isUUID().withMessage('Valid city ID required'),
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().trim().isLength({ max: 20 }).withMessage('Code max 20 chars'),
  ]),
  asyncHandler(locationController.updateZone)
);

router.delete(
  '/zones/:id',
  requirePermission('locations.delete'),
  param('id').isUUID().withMessage('Invalid zone ID'),
  validate([]),
  asyncHandler(locationController.deleteZone)
);

export default router;
