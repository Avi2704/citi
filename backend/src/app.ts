import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './utils/env.js';
import { reportsRouter } from './routes/reportsRoutes.js';
import { routesRouter } from './routes/routesRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metaRouter } from './routes/metaRoutes.js';

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/reports', reportsRouter);
app.use('/api/routes', routesRouter);
app.use('/api', metaRouter);

app.use(errorHandler);
