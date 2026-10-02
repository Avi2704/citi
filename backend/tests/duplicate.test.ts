import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../src/services/duplicate/detectDuplicate.js';

describe('haversineMeters', () => {
  it('returns 0 for same coordinates', () => {
    expect(haversineMeters(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
  });

  it('returns short distance for nearby coordinates', () => {
    const distance = haversineMeters(19.076, 72.8777, 19.0765, 72.8781);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(200);
  });
});
