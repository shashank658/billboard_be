import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    sendSuccess(res, {
      user: result.user,
      tokens: result.tokens,
    }, 'Login successful');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      sendError(res, 'Login failed', 500);
    }
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    sendSuccess(res, { tokens }, 'Token refreshed successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      sendError(res, 'Token refresh failed', 500);
    }
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    // Log out even if there's an error with the token
    sendSuccess(res, null, 'Logout successful');
  }
};

export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    await authService.logoutAll(req.user.id);

    sendSuccess(res, null, 'Logged out from all devices');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Logout failed', 500);
    }
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    sendSuccess(res, { user: req.user });
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 500);
    } else {
      sendError(res, 'Failed to get user info', 500);
    }
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    sendSuccess(res, null, 'Password changed successfully. Please login again.');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendError(res, 'Password change failed', 500);
    }
  }
};
