import { NextResponse } from 'next/server';
import { getAuthenticatedUser, ensureInitialUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureInitialUser();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
      }
    });
  } catch (error: any) {
    console.error('Error verifying auth state:', error);
    return NextResponse.json({ authenticated: false, error: 'Failed to verify session' }, { status: 500 });
  }
}
