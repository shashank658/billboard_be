import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import healthRoutes from './routes/health.routes.js';
import locationRoutes from './routes/location.routes.js';
import billboardRoutes from './routes/billboard.routes.js';
import landlordRoutes from './routes/landlord.routes.js';
import customerRoutes from './routes/customer.routes.js';
import taxRoutes from './routes/tax.routes.js';
import bookingRoutes from './routes/booking.routes.js';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Billboard API Docs',
}));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/billboards', billboardRoutes);
app.use('/api/landlords', landlordRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/bookings', bookingRoutes);

// TODO: Add more routes as they are implemented
// app.use('/api/regions', regionRoutes);
// app.use('/api/cities', cityRoutes);
// app.use('/api/zones', zoneRoutes);
// app.use('/api/billboards', billboardRoutes);
// app.use('/api/landlords', landlordRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/taxes', taxRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/campaigns', campaignRoutes);
// app.use('/api/purchase-orders', purchaseOrderRoutes);
// app.use('/api/invoices', invoiceRoutes);
// app.use('/api/audit-media', auditMediaRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/import', importRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
