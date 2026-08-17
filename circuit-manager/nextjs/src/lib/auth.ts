import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'circuit_jwt_secret_key_minimum_32_chars_long!';

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('circuit_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function makeHasuraToken(userId: string, email: string, isAdmin: boolean): string {
  const hasuraClaims = {
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': isAdmin ? ['admin', 'user'] : ['user'],
      'x-hasura-default-role': isAdmin ? 'admin' : 'user',
      'x-hasura-user-id': userId,
    },
  };
  return jwt.sign({ ...hasuraClaims, userId, email, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
}
