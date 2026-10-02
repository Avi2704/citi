export type UserRole = 'citizen' | 'admin' | 'collection_staff';

export type ReportStatus =
  | 'submitted'
  | 'ai_analyzed'
  | 'pending_verification'
  | 'verified'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'collected'
  | 'resolved'
  | 'rejected'
  | 'pending_manual_review';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
