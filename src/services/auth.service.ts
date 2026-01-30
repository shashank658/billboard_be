import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens, userRoles, roles, rolePermissions, permissions } from '../db/schema/index.js';
import config from '../config/index.js';
import type { UserWithPermissions } from '../types/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type { UserWithPermissions };

class AuthService {
  private generateAccessToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      type: 'access',
    };
    const options: SignOptions = {
      expiresIn: config.jwt.accessExpiresIn,
    };
    return jwt.sign(payload, config.jwt.accessSecret, options);
  }

  private generateRefreshToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      type: 'refresh',
    };
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn,
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  async login(email: string, password: string): Promise<{ tokens: AuthTokens; user: UserWithPermissions }> {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id, user.email);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Get user with roles and permissions
    const userWithPermissions = await this.getUserWithPermissions(user.id);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.accessExpiresIn, // Use config value
      },
      user: userWithPermissions,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token exists in database and is not expired
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!storedToken) {
      throw new Error('Refresh token not found or expired');
    }

    // Check if user still exists and is active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new Error('User not found or deactivated');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = this.generateRefreshToken(user.id, user.email);

    // Delete old refresh token and store new one
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: config.jwt.accessExpiresIn,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }

  async logoutAll(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  verifyAccessToken(token: string): TokenPayload {
    const payload = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return payload;
  }

  async getUserWithPermissions(userId: string): Promise<UserWithPermissions> {
    // Get user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        isCustomer: users.isCustomer,
        customerId: users.customerId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Get user roles
    const userRolesList = await db
      .select({
        roleName: roles.name,
        roleId: roles.id,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));

    const roleNames = userRolesList.map(r => r.roleName);

    // Get all permissions for user's roles
    let permissionNames: string[] = [];
    if (userRolesList.length > 0) {
      const allPermissions = await db
        .selectDistinct({
          name: permissions.name,
        })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
        .where(eq(userRoles.userId, userId));

      permissionNames = allPermissions.map(p => p.name);
    }

    return {
      ...user,
      roles: roleNames,
      permissions: permissionNames,
    };
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isCustomer?: boolean;
    customerId?: string;
    roleIds?: string[];
    createdBy?: string;
  }): Promise<UserWithPermissions> {
    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      isCustomer: data.isCustomer ?? false,
      customerId: data.customerId,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    }).returning();

    // Assign roles if provided
    if (data.roleIds && data.roleIds.length > 0) {
      await db.insert(userRoles).values(
        data.roleIds.map(roleId => ({
          userId: newUser.id,
          roleId,
          assignedBy: data.createdBy,
        }))
      );
    }

    return this.getUserWithPermissions(newUser.id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Invalidate all refresh tokens for security
    await this.logoutAll(userId);
  }
}

export const authService = new AuthService();
