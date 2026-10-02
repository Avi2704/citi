import { Priority } from '../../types/domain.js';

export interface PrioritySignals {
  severity: 'low' | 'medium' | 'high' | 'critical';
  hazardsDetected: string[];
  estimatedVolumeKg: number;
  duplicateCount: number;
  nearSensitiveZone?: boolean;
  obstructionRisk?: boolean;
}

export const calculatePriority = (signals: PrioritySignals): Priority => {
  if (
    signals.severity === 'critical' ||
    signals.hazardsDetected.length > 0 ||
    signals.obstructionRisk ||
    signals.estimatedVolumeKg >= 1000
  ) {
    return 'critical';
  }

  if (
    signals.severity === 'high' ||
    signals.estimatedVolumeKg >= 300 ||
    signals.duplicateCount >= 3 ||
    signals.nearSensitiveZone
  ) {
    return 'high';
  }

  if (signals.severity === 'medium' || signals.estimatedVolumeKg >= 80 || signals.duplicateCount >= 1) {
    return 'medium';
  }

  return 'low';
};
