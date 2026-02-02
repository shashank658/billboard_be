import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         totalBillboards:
 *           type: number
 *         activeBillboards:
 *           type: number
 *         totalBookings:
 *           type: number
 *         activeBookings:
 *           type: number
 *         totalCustomers:
 *           type: number
 *         activeCustomers:
 *           type: number
 *         totalCampaigns:
 *           type: number
 *         activeCampaigns:
 *           type: number
 *         revenueThisMonth:
 *           type: number
 *         revenueLastMonth:
 *           type: number
 *         bookingsThisMonth:
 *           type: number
 *         bookingsLastMonth:
 *           type: number
 *     RecentBooking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         referenceCode:
 *           type: string
 *         customerName:
 *           type: string
 *         billboardName:
 *           type: string
 *         billboardCode:
 *           type: string
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
 *     OccupancyData:
 *       type: object
 *       properties:
 *         billboardId:
 *           type: string
 *         billboardName:
 *           type: string
 *         billboardCode:
 *           type: string
 *         billboardType:
 *           type: string
 *         totalDays:
 *           type: number
 *         bookedDays:
 *           type: number
 *         occupancyRate:
 *           type: number
 *     RevenueByMonth:
 *       type: object
 *       properties:
 *         month:
 *           type: string
 *         year:
 *           type: number
 *         revenue:
 *           type: number
 *         bookingCount:
 *           type: number
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 */
router.get('/stats', dashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/recent-bookings:
 *   get:
 *     summary: Get recent bookings
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of bookings to return
 *     responses:
 *       200:
 *         description: List of recent bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecentBooking'
 */
router.get('/recent-bookings', dashboardController.getRecentBookings);

/**
 * @swagger
 * /api/dashboard/occupancy:
 *   get:
 *     summary: Get billboard occupancy rates
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for occupancy calculation
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for occupancy calculation
 *     responses:
 *       200:
 *         description: Billboard occupancy data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OccupancyData'
 *       400:
 *         description: Missing required date parameters
 */
router.get('/occupancy', dashboardController.getOccupancyRates);

/**
 * @swagger
 * /api/dashboard/revenue-by-month:
 *   get:
 *     summary: Get revenue by month
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of months to include
 *     responses:
 *       200:
 *         description: Revenue data by month
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RevenueByMonth'
 */
router.get('/revenue-by-month', dashboardController.getRevenueByMonth);

/**
 * @swagger
 * /api/dashboard/upcoming-bookings:
 *   get:
 *     summary: Get upcoming bookings
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: List of upcoming bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecentBooking'
 */
router.get('/upcoming-bookings', dashboardController.getUpcomingBookings);

export default router;
