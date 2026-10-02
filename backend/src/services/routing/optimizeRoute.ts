import { env } from '../../utils/env.js';
import { haversineMeters } from '../duplicate/detectDuplicate.js';

export interface RouteStopInput {
  reportId: string;
  latitude: number;
  longitude: number;
  estimatedWeightKg: number;
}

export interface OptimizeRouteInput {
  startLatitude: number;
  startLongitude: number;
  capacityKg: number;
  stops: RouteStopInput[];
}

export interface OptimizedStop extends RouteStopInput {
  stopOrder: number;
  distanceFromPreviousKm: number;
  estimatedDurationMinutes: number;
  distanceMode: 'osrm' | 'estimated';
}

export interface OptimizeRouteResult {
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  totalEstimatedWeightKg: number;
  stops: OptimizedStop[];
}

const osrmDistanceKm = async (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<number | null> => {
  const url = `${env.OSRM_BASE_URL}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { routes?: Array<{ distance: number }> };
    const distanceMeters = payload.routes?.[0]?.distance;
    return typeof distanceMeters === 'number' ? distanceMeters / 1000 : null;
  } catch {
    return null;
  }
};

export const validateVehicleCapacity = (capacityKg: number, totalWeightKg: number): string | null => {
  if (totalWeightKg <= capacityKg) {
    return null;
  }

  const excess = Number((totalWeightKg - capacityKg).toFixed(2));
  return `Selected waste exceeds vehicle capacity by ${excess} kg.`;
};

export const optimizeNearestNeighborRoute = async (
  input: OptimizeRouteInput,
): Promise<OptimizeRouteResult> => {
  const totalEstimatedWeightKg = input.stops.reduce((sum, stop) => sum + stop.estimatedWeightKg, 0);
  const capacityError = validateVehicleCapacity(input.capacityKg, totalEstimatedWeightKg);
  if (capacityError) {
    throw new Error(capacityError);
  }

  const unvisited = [...input.stops];
  const ordered: OptimizedStop[] = [];

  let currentLat = input.startLatitude;
  let currentLon = input.startLongitude;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    unvisited.forEach((stop, index) => {
      const distance = haversineMeters(currentLat, currentLon, stop.latitude, stop.longitude);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nextStop = unvisited.splice(nearestIndex, 1)[0];

    const roadDistanceKm = await osrmDistanceKm(currentLat, currentLon, nextStop.latitude, nextStop.longitude);
    const fallbackDistanceKm = nearestDistance / 1000;
    const distanceFromPreviousKm = Number((roadDistanceKm ?? fallbackDistanceKm).toFixed(3));
    const distanceMode = roadDistanceKm ? 'osrm' : 'estimated';

    ordered.push({
      ...nextStop,
      stopOrder: ordered.length + 1,
      distanceFromPreviousKm,
      estimatedDurationMinutes: Math.max(2, Math.round((distanceFromPreviousKm / 25) * 60)),
      distanceMode,
    });

    currentLat = nextStop.latitude;
    currentLon = nextStop.longitude;
  }

  const totalDistanceKm = Number(ordered.reduce((sum, stop) => sum + stop.distanceFromPreviousKm, 0).toFixed(3));
  const estimatedDurationMinutes = ordered.reduce((sum, stop) => sum + stop.estimatedDurationMinutes, 0);

  return {
    totalDistanceKm,
    estimatedDurationMinutes,
    totalEstimatedWeightKg,
    stops: ordered,
  };
};
