import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { supabaseService } from '../utils/supabase.js';
import { analyzeWasteImage } from '../services/ai/wasteAgent.js';
import { detectDuplicateReports } from '../services/duplicate/detectDuplicate.js';
import { calculatePriority } from '../services/priority/calculatePriority.js';
import { validateWasteImage } from '../utils/fileValidation.js';

const createReportSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  address: z.string().optional(),
  category: z.string().optional(),
});

export const createReport = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid report request.');
  }

  const imageFile = req.file;
  validateWasteImage(imageFile);
  const safeImageFile = imageFile!;

  const { title, description, latitude, longitude, address, category } = parsed.data;

  const filePath = `${req.user.id}/${Date.now()}-${safeImageFile.originalname.replace(/\s+/g, '-')}`;
  const { error: uploadError } = await supabaseService.storage
    .from('waste-images')
    .upload(filePath, safeImageFile.buffer, {
      contentType: safeImageFile.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new ApiError(500, 'IMAGE_UPLOAD_FAILED', 'Unable to upload image.');
  }

  const {
    data: { publicUrl },
  } = supabaseService.storage.from('waste-images').getPublicUrl(filePath);

  const { data: report, error: reportInsertError } = await supabaseService
    .from('waste_reports')
    .insert({
      user_id: req.user.id,
      title,
      description,
      latitude,
      longitude,
      address,
      category,
      image_url: publicUrl,
      status: 'submitted',
      priority: 'low',
    })
    .select('*')
    .single();

  if (reportInsertError || !report) {
    throw new ApiError(500, 'REPORT_CREATE_FAILED', 'Unable to create waste report.');
  }

  await supabaseService.from('waste_images').insert({
    report_id: report.id,
    storage_path: filePath,
    public_url: publicUrl,
  });

  const aiResult = await analyzeWasteImage({
    imageUrl: publicUrl,
    description,
    latitude,
    longitude,
    address,
  });

  let status: string = 'pending_verification';
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let aiConfidence = 0;
  let estimatedVolume = 0;
  let aiSummary = 'AI analysis unavailable. Report submitted for manual review.';
  let recommendedAction = 'Manual review required';

  if (aiResult.analysis) {
    const duplicate = await detectDuplicateReports({ latitude, longitude, category });
    const duplicateCount = duplicate.matchingReportIds.length;

    priority = calculatePriority({
      severity: aiResult.analysis.severity,
      hazardsDetected: aiResult.analysis.hazards_detected,
      estimatedVolumeKg: aiResult.analysis.estimated_volume_kg,
      duplicateCount,
    });

    status = 'ai_analyzed';
    aiConfidence = aiResult.analysis.confidence;
    estimatedVolume = aiResult.analysis.estimated_volume_kg;
    aiSummary = aiResult.analysis.reasoning_summary;
    recommendedAction = aiResult.analysis.recommended_action;

    await supabaseService.from('ai_analysis').insert({
      report_id: report.id,
      waste_type: aiResult.analysis.waste_type,
      estimated_volume: aiResult.analysis.estimated_volume_kg,
      severity: aiResult.analysis.severity,
      confidence: aiResult.analysis.confidence,
      hazards_detected: aiResult.analysis.hazards_detected,
      visual_description: aiResult.analysis.visual_description,
      recommended_action: aiResult.analysis.recommended_action,
      reasoning_summary: aiResult.analysis.reasoning_summary,
    });

    if (duplicate.isDuplicate) {
      const duplicateGroupId = duplicate.groupId ?? crypto.randomUUID();

      if (!duplicate.groupId) {
        await supabaseService.from('duplicate_groups').insert({
          id: duplicateGroupId,
          latitude_center: latitude,
          longitude_center: longitude,
          report_count: duplicateCount + 1,
          category,
          status: 'active',
        });
      }

      await supabaseService
        .from('waste_reports')
        .update({ duplicate_group_id: duplicateGroupId })
        .in('id', [report.id, ...duplicate.matchingReportIds]);
    }
  } else {
    status = 'pending_manual_review';
  }

  const { data: updatedReport, error: reportUpdateError } = await supabaseService
    .from('waste_reports')
    .update({
      status,
      priority,
      ai_confidence: aiConfidence,
      estimated_volume: estimatedVolume,
      ai_summary: aiSummary,
      recommended_action: recommendedAction,
    })
    .eq('id', report.id)
    .select('*')
    .single();

  if (reportUpdateError || !updatedReport) {
    throw new ApiError(500, 'REPORT_UPDATE_FAILED', 'Unable to finalize report analysis.');
  }

  await supabaseService.from('report_status_history').insert({
    report_id: report.id,
    old_status: 'submitted',
    new_status: status,
    changed_by: req.user.id,
    note: aiResult.analysis ? 'AI analysis completed.' : aiResult.error,
  });

  await supabaseService.from('notifications').insert({
    user_id: req.user.id,
    report_id: report.id,
    type: 'report_submitted',
    title: 'Report submitted',
    message: aiResult.analysis
      ? 'Your report was submitted and analyzed.'
      : 'Your report was submitted for manual review.',
  });

  res.status(201).json({
    success: true,
    data: {
      report: updatedReport,
      aiStatus: aiResult.status,
      aiMessage: aiResult.error,
    },
  });
};

export const getReports = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  let query = supabaseService.from('waste_reports').select('*').order('created_at', { ascending: false });

  if (req.user.role === 'citizen') {
    query = query.eq('user_id', req.user.id);
  }

  if (req.user.role === 'collection_staff') {
    const { data: assignments, error: assignmentError } = await supabaseService
      .from('collection_teams')
      .select('id')
      .eq('staff_user_id', req.user.id)
      .maybeSingle();

    if (assignmentError) {
      throw new ApiError(500, 'ASSIGNMENT_FETCH_FAILED', 'Unable to fetch staff assignments.');
    }

    if (!assignments) {
      return res.json({ success: true, data: [] });
    }

    const { data: reportAssignments, error: reportAssignmentError } = await supabaseService
      .from('assignments')
      .select('report_id')
      .eq('team_id', assignments.id);

    if (reportAssignmentError) {
      throw new ApiError(500, 'ASSIGNMENT_FETCH_FAILED', 'Unable to fetch staff assignments.');
    }

    const reportIds = (reportAssignments ?? []).map((item) => item.report_id);
    if (reportIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    query = query.in('id', reportIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(500, 'REPORT_FETCH_FAILED', 'Unable to fetch reports.');
  }

  res.json({ success: true, data });
};

export const getReportById = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const reportId = z.string().uuid().parse(req.params.id);

  const { data: report, error } = await supabaseService.from('waste_reports').select('*').eq('id', reportId).single();

  if (error || !report) {
    throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  }

  if (req.user.role === 'citizen' && report.user_id !== req.user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only view your own report.');
  }

  const [{ data: analysis }, { data: statusHistory }, { data: proofs }] = await Promise.all([
    supabaseService.from('ai_analysis').select('*').eq('report_id', reportId).maybeSingle(),
    supabaseService.from('report_status_history').select('*').eq('report_id', reportId).order('created_at', { ascending: false }),
    supabaseService.from('resolution_proofs').select('*').eq('report_id', reportId).order('created_at', { ascending: false }),
  ]);

  res.json({ success: true, data: { report, analysis, statusHistory, proofs } });
};

export const updateReportStatus = async (
  req: Request,
  nextStatus: 'verified' | 'rejected' | 'assigned' | 'resolved',
  note: string,
) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const reportId = z.string().uuid().parse(req.params.id);
  const { data: report, error: reportError } = await supabaseService
    .from('waste_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  }

  if (nextStatus === 'resolved' && req.user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admin can resolve reports.');
  }

  const { data, error } = await supabaseService
    .from('waste_reports')
    .update({
      status: nextStatus,
      verified_by: nextStatus === 'verified' ? req.user.id : report.verified_by,
      verified_at: nextStatus === 'verified' ? new Date().toISOString() : report.verified_at,
    })
    .eq('id', reportId)
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiError(500, 'REPORT_UPDATE_FAILED', 'Unable to update report status.');
  }

  await supabaseService.from('report_status_history').insert({
    report_id: reportId,
    old_status: report.status,
    new_status: nextStatus,
    changed_by: req.user.id,
    note,
  });

  await supabaseService.from('notifications').insert({
    user_id: report.user_id,
    report_id: reportId,
    type: `report_${nextStatus}`,
    title: `Report ${nextStatus}`,
    message: `Your report has been moved to ${nextStatus} status.`,
  });

  return data;
};

export const verifyReport = async (req: Request, res: Response) => {
  const data = await updateReportStatus(req, 'verified', 'Report verified by admin.');
  res.json({ success: true, data });
};

export const rejectReport = async (req: Request, res: Response) => {
  const data = await updateReportStatus(req, 'rejected', 'Report rejected by admin.');
  res.json({ success: true, data });
};

export const resolveReport = async (req: Request, res: Response) => {
  const data = await updateReportStatus(req, 'resolved', 'Resolution approved by admin.');
  res.json({ success: true, data });
};

export const assignReport = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  const reportId = z.string().uuid().parse(req.params.id);
  const parsed = z
    .object({
      teamId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      scheduledFor: z.string().datetime().optional(),
    })
    .parse(req.body);

  const { data: assignment, error: assignmentError } = await supabaseService
    .from('assignments')
    .insert({
      report_id: reportId,
      team_id: parsed.teamId,
      vehicle_id: parsed.vehicleId,
      assigned_by: req.user.id,
      scheduled_for: parsed.scheduledFor,
      status: 'assigned',
    })
    .select('*')
    .single();

  if (assignmentError || !assignment) {
    throw new ApiError(500, 'ASSIGNMENT_CREATE_FAILED', 'Unable to assign report.');
  }

  await supabaseService.from('waste_reports').update({ status: 'assigned' }).eq('id', reportId);
  await supabaseService.from('report_status_history').insert({
    report_id: reportId,
    old_status: 'verified',
    new_status: 'assigned',
    changed_by: req.user.id,
    note: 'Report assigned to collection team.',
  });

  res.status(201).json({ success: true, data: assignment });
};

export const uploadResolutionProof = async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  const reportId = z.string().uuid().parse(req.params.id);
  const note = z.string().optional().parse(req.body.notes);
  const imageFile = req.file;
  validateWasteImage(imageFile);
  const safeImageFile = imageFile!;

  const filePath = `resolution/${req.user.id}/${Date.now()}-${safeImageFile.originalname.replace(/\s+/g, '-')}`;
  const upload = await supabaseService.storage.from('waste-images').upload(filePath, safeImageFile.buffer, {
    contentType: safeImageFile.mimetype,
    upsert: false,
  });

  if (upload.error) {
    throw new ApiError(500, 'IMAGE_UPLOAD_FAILED', 'Unable to upload resolution proof.');
  }

  const { data: publicUrlData } = supabaseService.storage.from('waste-images').getPublicUrl(filePath);
  const { data, error } = await supabaseService
    .from('resolution_proofs')
    .insert({
      report_id: reportId,
      image_url: publicUrlData.publicUrl,
      notes: note,
      uploaded_by: req.user.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiError(500, 'PROOF_CREATE_FAILED', 'Unable to save resolution proof.');
  }

  await supabaseService.from('waste_reports').update({ status: 'collected' }).eq('id', reportId);

  res.status(201).json({ success: true, data });
};
