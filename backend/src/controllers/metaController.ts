import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { supabaseService } from '../utils/supabase.js';

export const upsertProfile = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');

  const schema = z.object({
    full_name: z.string().min(1),
    phone: z.string().optional(),
  });

  const parsed = schema.parse(req.body);

  const { data, error } = await supabaseService
    .from('profiles')
    .update({ full_name: parsed.full_name, phone: parsed.phone })
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'PROFILE_UPDATE_FAILED', 'Unable to update profile.');
  res.json({ success: true, data });
};

export const getTeams = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseService.from('collection_teams').select('*').order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'TEAMS_FETCH_FAILED', 'Unable to fetch teams.');
  res.json({ success: true, data });
};

export const createTeam = async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(2),
    staff_user_id: z.string().uuid().optional(),
    phone: z.string().optional(),
    vehicle_id: z.string().uuid().optional(),
    capacity_kg: z.number().positive().optional(),
  });

  const parsed = schema.parse(req.body);
  const { data, error } = await supabaseService.from('collection_teams').insert(parsed).select('*').single();
  if (error) throw new ApiError(500, 'TEAM_CREATE_FAILED', 'Unable to create team.');
  res.status(201).json({ success: true, data });
};

export const getVehicles = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseService.from('vehicles').select('*').order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'VEHICLE_FETCH_FAILED', 'Unable to fetch vehicles.');
  res.json({ success: true, data });
};

export const createVehicle = async (req: Request, res: Response) => {
  const schema = z.object({
    vehicle_number: z.string().min(3),
    capacity_kg: z.number().positive(),
    type: z.string().optional(),
  });

  const parsed = schema.parse(req.body);
  const { data, error } = await supabaseService.from('vehicles').insert(parsed).select('*').single();
  if (error) throw new ApiError(500, 'VEHICLE_CREATE_FAILED', 'Unable to create vehicle.');
  res.status(201).json({ success: true, data });
};

export const getAnalyticsOverview = async (_req: Request, res: Response) => {
  const [reportsResponse, groupedStatus, groupedCategory] = await Promise.all([
    supabaseService.from('waste_reports').select('id, category, status, estimated_volume, created_at, updated_at'),
    supabaseService.from('waste_reports').select('status').then(({ data }) => data ?? []),
    supabaseService.from('waste_reports').select('category').then(({ data }) => data ?? []),
  ]);

  const { data: reports, error: reportsError } = reportsResponse;
  if (reportsError) throw new ApiError(500, 'ANALYTICS_FETCH_FAILED', 'Unable to fetch analytics.');

  const statusCounts = (groupedStatus ?? []).reduce<Record<string, number>>((acc, item: { status: string | null }) => {
    const key = item.status ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const categoryCounts = (groupedCategory ?? []).reduce<Record<string, number>>((acc, item: { category: string | null }) => {
    const key = item.category ?? 'uncategorized';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const totalVolume = (reports ?? []).reduce((sum, item) => sum + (item.estimated_volume ?? 0), 0);

  res.json({
    success: true,
    data: {
      totalReports: reports?.length ?? 0,
      statusCounts,
      categoryCounts,
      totalEstimatedVolumeKg: totalVolume,
    },
  });
};

export const getNotifications = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');

  const { data, error } = await supabaseService
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, 'NOTIFICATIONS_FETCH_FAILED', 'Unable to fetch notifications.');

  const unreadCount = (data ?? []).filter((item) => !item.is_read).length;
  res.json({ success: true, data, unreadCount });
};

export const markNotificationRead = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');

  const id = z.string().uuid().parse(req.params.id);
  const { data, error } = await supabaseService
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'NOTIFICATION_UPDATE_FAILED', 'Unable to update notification.');
  res.json({ success: true, data });
};
