import { Router } from 'express';
import {
  createTeam,
  createVehicle,
  getAnalyticsOverview,
  getNotifications,
  getTeams,
  getVehicles,
  markNotificationRead,
  upsertProfile,
} from '../controllers/metaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const metaRouter = Router();

metaRouter.post('/auth/profile', requireAuth, upsertProfile);
metaRouter.get('/teams', requireAuth, getTeams);
metaRouter.post('/teams', requireAuth, requireRole('admin'), createTeam);
metaRouter.get('/vehicles', requireAuth, getVehicles);
metaRouter.post('/vehicles', requireAuth, requireRole('admin'), createVehicle);
metaRouter.get('/analytics/overview', requireAuth, requireRole('admin'), getAnalyticsOverview);
metaRouter.get('/notifications', requireAuth, getNotifications);
metaRouter.patch('/notifications/:id/read', requireAuth, markNotificationRead);
