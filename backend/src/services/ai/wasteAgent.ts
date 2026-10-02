import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../utils/env.js';

const AnalysisSchema = z.object({
  waste_type: z.string().min(1),
  estimated_volume_kg: z.number().min(0),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  hazards_detected: z.array(z.string()),
  visual_description: z.string().min(1),
  recommended_action: z.string().min(1),
  reasoning_summary: z.string().min(1),
});

export type WasteAnalysis = z.infer<typeof AnalysisSchema>;

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const systemPrompt = `You are Waste Operations Agent. Analyze waste reports conservatively.
Return strict JSON only with this exact schema:
{
  "waste_type": "string",
  "estimated_volume_kg": number,
  "severity": "low" | "medium" | "high" | "critical",
  "confidence": number from 0 to 1,
  "hazards_detected": ["string"],
  "visual_description": "string",
  "recommended_action": "string",
  "reasoning_summary": "string"
}
Acknowledge uncertainty in reasoning_summary when confidence is below 0.75.`;

const parseResponse = (content: string): WasteAnalysis => {
  const parsed = JSON.parse(content);
  return AnalysisSchema.parse(parsed);
};

export const analyzeWasteImage = async (params: {
  imageUrl: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}): Promise<{ analysis: WasteAnalysis | null; status: 'ok' | 'pending_manual_review'; error?: string }> => {
  if (!openai) {
    return {
      analysis: null,
      status: 'pending_manual_review',
      error: 'AI analysis unavailable. Report submitted for manual review.',
    };
  }

  const promptPayload = {
    citizen_description: params.description,
    latitude: params.latitude,
    longitude: params.longitude,
    address: params.address ?? null,
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await openai.responses.create({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: JSON.stringify(promptPayload) },
              { type: 'input_image', image_url: params.imageUrl, detail: 'auto' },
            ],
          },
        ],
      });

      const outputText = response.output_text?.trim();
      if (!outputText) {
        throw new Error('Empty AI response');
      }

      const analysis = parseResponse(outputText);
      return { analysis, status: 'ok' };
    } catch (error) {
      if (attempt === 2) {
        return {
          analysis: null,
          status: 'pending_manual_review',
          error: error instanceof Error ? error.message : 'AI request failed',
        };
      }
    }
  }

  return {
    analysis: null,
    status: 'pending_manual_review',
    error: 'AI analysis unavailable. Report submitted for manual review.',
  };
};

export { AnalysisSchema };
