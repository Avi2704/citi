import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  completeRouteStop,
  getRouteById,
  getRoutes,
  optimizeRoute,
  startRouteStop,
} from '../controllers/routesController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const routeAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const routesRouter = Router();
routesRouter.use(requireAuth);
routesRouter.post('/optimize', requireRole('admin'), routeAiLimiter, optimizeRoute);
routesRouter.get('/', getRoutes);
routesRouter.get('/:id', getRouteById);
routesRouter.post('/:id/stops/:stopId/start', requireRole('collection_staff', 'admin'), startRouteStop);
routesRouter.post('/:id/stops/:stopId/complete', requireRole('collection_staff', 'admin'), completeRouteStop);
