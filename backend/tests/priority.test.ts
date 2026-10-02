import { describe, expect, it } from 'vitest';
import { calculatePriority } from '../src/services/priority/calculatePriority.js';

describe('calculatePriority', () => {
  it('returns critical when hazards are detected', () => {
    const priority = calculatePriority({
      severity: 'medium',
      hazardsDetected: ['biohazard'],
      estimatedVolumeKg: 20,
      duplicateCount: 0,
    });

    expect(priority).toBe('critical');
  });

  it('returns high for large volume', () => {
    const priority = calculatePriority({
      severity: 'medium',
      hazardsDetected: [],
      estimatedVolumeKg: 350,
      duplicateCount: 0,
    });

    expect(priority).toBe('high');
  });

  it('returns low for small isolated issue', () => {
    const priority = calculatePriority({
      severity: 'low',
      hazardsDetected: [],
      estimatedVolumeKg: 10,
      duplicateCount: 0,
    });

    expect(priority).toBe('low');
  });
});
