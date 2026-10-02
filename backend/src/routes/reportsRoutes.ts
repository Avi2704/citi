import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  assignReport,
  createReport,
  getReportById,
  getReports,
  rejectReport,
  resolveReport,
  uploadResolutionProof,
  verifyReport,
} from '../controllers/reportsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many report submissions. Please try again later.',
    },
  },
});

const upload = multer({ storage: multer.memoryStorage() });

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.get('/', getReports);
reportsRouter.get('/:id', getReportById);
reportsRouter.post('/', requireRole('citizen'), reportLimiter, upload.single('image'), createReport);
reportsRouter.post('/:id/verify', requireRole('admin'), verifyReport);
reportsRouter.post('/:id/reject', requireRole('admin'), rejectReport);
reportsRouter.post('/:id/assign', requireRole('admin'), assignReport);
reportsRouter.post('/:id/resolve', requireRole('admin'), resolveReport);
reportsRouter.post(
  '/:id/resolution-proof',
  requireRole('collection_staff', 'admin'),
  upload.single('image'),
  uploadResolutionProof,
);
