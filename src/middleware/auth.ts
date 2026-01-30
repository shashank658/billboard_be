import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendError } from '../utils/response.js';
import type { UserWithPermissions } from '../types/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserWithPermissions;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Get user with permissions
    const user = await authService.getUserWithPermissions(payload.userId);

    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 401);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        sendError(res, 'Access token expired', 401);
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        sendError(res, 'Invalid access token', 401);
        return;
      }
    }
    sendError(res, 'Authentication failed', 401);
  }
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const hasPermission = requiredPermissions.some(
      permission => req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

export const requireAllPermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const hasAllPermissions = requiredPermissions.every(
      permission => req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

export const requireRole = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const hasRole = requiredRoles.some(role => req.user!.roles.includes(role));

    if (!hasRole) {
      sendError(res, 'Insufficient role privileges', 403);
      return;
    }

    next();
  };
};

// Optional authentication - attaches user if token provided, continues otherwise
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = authService.verifyAccessToken(token);
      req.user = await authService.getUserWithPermissions(payload.userId);
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
};
