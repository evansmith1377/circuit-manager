import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/graphql-client';
import { comparePassword, makeHasuraToken } from '@/lib/auth';
import { GET_USER_BY_EMAIL } from '@/lib/queries';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const data = await adminClient.request<{ users: Array<{ id: string; email: string; first_name: string; last_name: string; display_name: string; is_admin: boolean; password_hash: string }> }>(
      GET_USER_BY_EMAIL, { email }
    );

    if (data.users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = data.users[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = makeHasuraToken(user.id, user.email, user.is_admin);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, display_name: user.display_name, is_admin: user.is_admin },
    });

    response.cookies.set('circuit_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
