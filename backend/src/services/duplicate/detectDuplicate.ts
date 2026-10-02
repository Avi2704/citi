import { supabaseService } from '../../utils/supabase.js';
import { env } from '../../utils/env.js';

export interface DuplicateCheckInput {
  latitude: number;
  longitude: number;
  category?: string | null;
  createdAt?: string;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  groupId: string | null;
  matchingReportIds: string[];
}

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const detectDuplicateReports = async (input: DuplicateCheckInput): Promise<DuplicateResult> => {
  const lookbackIso = new Date(Date.now() - env.DUPLICATE_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseService
    .from('waste_reports')
    .select('id, latitude, longitude, category, duplicate_group_id')
    .gte('created_at', lookbackIso)
    .neq('status', 'rejected');

  if (error) {
    throw error;
  }

  const matched = (data ?? []).filter((report) => {
    const distance = haversineMeters(input.latitude, input.longitude, report.latitude, report.longitude);
    const categoryMatches = !input.category || !report.category || report.category === input.category;
    return distance <= env.DUPLICATE_RADIUS_METERS && categoryMatches;
  });

  if (matched.length === 0) {
    return { isDuplicate: false, groupId: null, matchingReportIds: [] };
  }

  const existingGroupId = matched.find((item) => item.duplicate_group_id)?.duplicate_group_id ?? null;

  return {
    isDuplicate: true,
    groupId: existingGroupId,
    matchingReportIds: matched.map((item) => item.id),
  };
};
