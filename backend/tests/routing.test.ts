import { describe, expect, it } from 'vitest';
import { optimizeNearestNeighborRoute, validateVehicleCapacity } from '../src/services/routing/optimizeRoute.js';

describe('route optimization', () => {
  it('rejects over-capacity payload', () => {
    const error = validateVehicleCapacity(1000, 1270);
    expect(error).toContain('270');
  });

  it('builds nearest-neighbor route order', async () => {
    const result = await optimizeNearestNeighborRoute({
      startLatitude: 19.076,
      startLongitude: 72.8777,
      capacityKg: 1000,
      stops: [
        { reportId: 'r1', latitude: 19.08, longitude: 72.88, estimatedWeightKg: 100 },
        { reportId: 'r2', latitude: 19.081, longitude: 72.881, estimatedWeightKg: 120 },
      ],
    });

    expect(result.totalEstimatedWeightKg).toBe(220);
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].stopOrder).toBe(1);
  });
});
