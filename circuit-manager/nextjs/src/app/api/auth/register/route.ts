import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/graphql-client';
import { hashPassword, makeHasuraToken } from '@/lib/auth';
import { INSERT_USER, COUNT_USERS, GET_USER_BY_EMAIL, INSERT_SERVICE, INSERT_PANEL } from '@/lib/queries';
import { z } from 'zod';

const registerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().max(100).optional().default(''),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { first_name, last_name, email, password, display_name } = parsed.data;

    // Check if email exists
    const existingData = await adminClient.request<{ users: { id: string }[] }>(
      GET_USER_BY_EMAIL, { email }
    );
    if (existingData.users.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Check if this is the first user
    const countData = await adminClient.request<{ users_aggregate: { aggregate: { count: number } } }>(
      COUNT_USERS
    );
    const isFirstUser = countData.users_aggregate.aggregate.count === 0;

    const password_hash = await hashPassword(password);

    const userData = await adminClient.request<{ insert_users_one: { id: string; email: string; first_name: string; last_name: string; display_name: string; is_admin: boolean } }>(
      INSERT_USER,
      { first_name, last_name, email, password_hash, display_name: display_name || '', is_admin: isFirstUser }
    );

    const user = userData.insert_users_one;
    const token = makeHasuraToken(user.id, user.email, user.is_admin);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, display_name: user.display_name, is_admin: user.is_admin },
    }, { status: 201 });

    response.cookies.set('circuit_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
