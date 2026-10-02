import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.js';
import { supabaseAnon, supabaseService } from '../utils/supabase.js';
import { AppUser } from '../types/domain.js';
export { requireRole } from './requireRole.js';

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const token = header.slice(7);
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !authData.user) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Session is invalid or expired.');
    }

    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new ApiError(403, 'PROFILE_NOT_FOUND', 'Profile not found.');
    }

    req.user = profile as AppUser;
    next();
  } catch (error) {
    next(error);
  }
};
