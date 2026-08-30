import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  verifyPassword, 
  generateSessionToken, 
  hashSessionToken, 
  createSessionCookieHeader, 
  ensureInitialUser 
} from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limiter = rateLimit(`login:${clientIp}`, 10, 15 * 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { username, password } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Ensure initial single user setup exists
    await ensureInitialUser();

    const cleanUsername = username.trim();
    const user = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      // Log login failure
      await prisma.activity.create({
        data: {
          action: 'Login Failure',
          performedBy: cleanUsername,
          details: `Failed login attempt from IP ${clientIp}`
        }
      }).catch(() => {});

      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    // Generate session token and store hash in database
    const token = generateSessionToken();
    const sessionTokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        sessionTokenHash,
        userId: user.id,
        expiresAt,
      }
    });

    // Log login success activity
    await prisma.activity.create({
      data: {
        action: 'Login Success',
        performedBy: user.username,
        details: `User ${user.username} logged in from IP ${clientIp}`
      }
    }).catch(() => {});

    const cookieHeader = await createSessionCookieHeader(token);

    return new NextResponse(
      JSON.stringify({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        }
      }
    );
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Failed to process login' }, { status: 500 });
  }
}
