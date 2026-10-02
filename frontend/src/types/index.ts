export type UserRole = 'citizen' | 'admin' | 'collection_staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export interface WasteReport {
  id: string;
  title: string;
  description: string;
  category: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  image_url: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_volume: number | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
}
