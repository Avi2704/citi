import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.js';
import { UserRole } from '../types/domain.js';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission for this action.'));
    }
    return next();
  };
};
