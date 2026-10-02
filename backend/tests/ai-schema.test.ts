import { describe, expect, it } from 'vitest';
import { AnalysisSchema } from '../src/services/ai/wasteAgent.js';

describe('AI schema validation', () => {
  it('accepts valid analysis payload', () => {
    const parsed = AnalysisSchema.parse({
      waste_type: 'mixed waste',
      estimated_volume_kg: 120,
      severity: 'high',
      confidence: 0.82,
      hazards_detected: [],
      visual_description: 'Large dump next to road',
      recommended_action: 'Dispatch municipal collection truck',
      reasoning_summary: 'Large pile with traffic exposure, moderate uncertainty.',
    });

    expect(parsed.severity).toBe('high');
  });

  it('rejects confidence above 1', () => {
    expect(() =>
      AnalysisSchema.parse({
        waste_type: 'mixed waste',
        estimated_volume_kg: 120,
        severity: 'high',
        confidence: 1.2,
        hazards_detected: [],
        visual_description: 'Large dump next to road',
        recommended_action: 'Dispatch municipal collection truck',
        reasoning_summary: 'Large pile with traffic exposure, moderate uncertainty.',
      }),
    ).toThrow();
  });
});
