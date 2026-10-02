import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { optimizeNearestNeighborRoute } from '../services/routing/optimizeRoute.js';
import { supabaseService } from '../utils/supabase.js';

const optimizeSchema = z.object({
  routeName: z.string().min(2),
  teamId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  startLatitude: z.number().gte(-90).lte(90),
  startLongitude: z.number().gte(-180).lte(180),
  reportIds: z.array(z.string().uuid()).min(1),
});

export const optimizeRoute = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const parsed = optimizeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid route request.');
  }

  const { routeName, teamId, vehicleId, startLatitude, startLongitude, reportIds } = parsed.data;

  const [{ data: vehicle, error: vehicleError }, { data: reports, error: reportsError }] = await Promise.all([
    supabaseService.from('vehicles').select('*').eq('id', vehicleId).single(),
    supabaseService
      .from('waste_reports')
      .select('id, latitude, longitude, estimated_volume, status')
      .in('id', reportIds),
  ]);

  if (vehicleError || !vehicle) {
    throw new ApiError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found.');
  }

  if (reportsError || !reports || reports.length !== reportIds.length) {
    throw new ApiError(404, 'REPORTS_NOT_FOUND', 'One or more reports were not found.');
  }

  const result = await optimizeNearestNeighborRoute({
    startLatitude,
    startLongitude,
    capacityKg: vehicle.capacity_kg,
    stops: reports.map((report) => ({
      reportId: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      estimatedWeightKg: report.estimated_volume ?? 0,
    })),
  });

  const { data: route, error: routeError } = await supabaseService
    .from('routes')
    .insert({
      route_name: routeName,
      team_id: teamId,
      vehicle_id: vehicleId,
      start_latitude: startLatitude,
      start_longitude: startLongitude,
      total_distance_km: result.totalDistanceKm,
      estimated_duration_minutes: result.estimatedDurationMinutes,
      total_estimated_weight: result.totalEstimatedWeightKg,
      status: 'scheduled',
      created_by: req.user.id,
    })
    .select('*')
    .single();

  if (routeError || !route) {
    throw new ApiError(500, 'ROUTE_CREATE_FAILED', 'Unable to create route.');
  }

  const stopsPayload = result.stops.map((stop) => ({
    route_id: route.id,
    report_id: stop.reportId,
    stop_order: stop.stopOrder,
    latitude: stop.latitude,
    longitude: stop.longitude,
    estimated_weight: stop.estimatedWeightKg,
    completed: false,
  }));

  await supabaseService.from('route_stops').insert(stopsPayload);

  await supabaseService.from('waste_reports').update({ status: 'scheduled' }).in('id', reportIds);

  res.status(201).json({
    success: true,
    data: {
      routeId: route.id,
      totalDistanceKm: result.totalDistanceKm,
      estimatedDurationMinutes: result.estimatedDurationMinutes,
      totalEstimatedWeightKg: result.totalEstimatedWeightKg,
      stops: result.stops,
    },
  });
};

export const startRouteStop = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  const routeId = z.string().uuid().parse(req.params.id);
  const stopId = z.string().uuid().parse(req.params.stopId);

  const { data: stop, error } = await supabaseService
    .from('route_stops')
    .select('*')
    .eq('id', stopId)
    .eq('route_id', routeId)
    .single();

  if (error || !stop) throw new ApiError(404, 'STOP_NOT_FOUND', 'Route stop not found.');

  await supabaseService.from('waste_reports').update({ status: 'in_progress' }).eq('id', stop.report_id);
  await supabaseService.from('report_status_history').insert({
    report_id: stop.report_id,
    old_status: 'scheduled',
    new_status: 'in_progress',
    changed_by: req.user.id,
    note: 'Collection started.',
  });

  res.json({ success: true, data: stop });
};

export const completeRouteStop = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  const routeId = z.string().uuid().parse(req.params.id);
  const stopId = z.string().uuid().parse(req.params.stopId);

  const { data: stop, error } = await supabaseService
    .from('route_stops')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', stopId)
    .eq('route_id', routeId)
    .select('*')
    .single();

  if (error || !stop) throw new ApiError(404, 'STOP_NOT_FOUND', 'Route stop not found.');

  await supabaseService.from('waste_reports').update({ status: 'collected' }).eq('id', stop.report_id);
  await supabaseService.from('report_status_history').insert({
    report_id: stop.report_id,
    old_status: 'in_progress',
    new_status: 'collected',
    changed_by: req.user.id,
    note: 'Collection completed by staff.',
  });

  res.json({ success: true, data: stop });
};

export const getRoutes = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseService.from('routes').select('*').order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'ROUTES_FETCH_FAILED', 'Unable to fetch routes.');
  res.json({ success: true, data });
};

export const getRouteById = async (req: Request, res: Response) => {
  const routeId = z.string().uuid().parse(req.params.id);
  const [{ data: route, error: routeError }, { data: stops, error: stopsError }] = await Promise.all([
    supabaseService.from('routes').select('*').eq('id', routeId).single(),
    supabaseService.from('route_stops').select('*').eq('route_id', routeId).order('stop_order', { ascending: true }),
  ]);

  if (routeError || !route) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  if (stopsError) throw new ApiError(500, 'ROUTE_FETCH_FAILED', 'Unable to fetch route stops.');

  res.json({ success: true, data: { route, stops } });
};
