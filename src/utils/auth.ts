import jwt from 'jsonwebtoken';
import type { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required. Set a strong secret in the deployment environment.');
  }
  return secret;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
}

/**
 * Signs a new JWT token for a given user session.
 */
export function signToken(session: AuthSession): string {
  return jwt.sign(session, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Verifies a JWT token. Returns decoded session or null if invalid.
 */
export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, getJwtSecret()) as unknown as AuthSession;
  } catch (e) {
    return null;
  }
}

/**
 * Extracts and verifies the user session from the cookies of a request.
 */
export function getSession(req: NextRequest): AuthSession | null {
  const tokenCookie = req.cookies.get('token');
  if (!tokenCookie) return null;
  return verifyToken(tokenCookie.value);
}

/**
 * Hashes a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a plain-text password with a hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
