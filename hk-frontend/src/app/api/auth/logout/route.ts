import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getSessionTokenFromRequest, 
  hashSessionToken, 
  createClearSessionCookieHeader 
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (token) {
      const tokenHash = hashSessionToken(token);
      const session = await prisma.session.findUnique({
        where: { sessionTokenHash: tokenHash },
        include: { user: true }
      });

      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        
        await prisma.activity.create({
          data: {
            action: 'Logout',
            performedBy: session.user?.username || 'User',
            details: `User logged out`
          }
        }).catch(() => {});
      }
    }

    const clearCookieHeader = createClearSessionCookieHeader();

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookieHeader,
        }
      }
    );
  } catch (error: any) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Failed to process logout' }, { status: 500 });
  }
}
