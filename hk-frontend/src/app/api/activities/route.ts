import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = activities.map(act => {
      const d = new Date(act.createdAt);
      return {
        id: act.id,
        createdAt: act.createdAt,
        date: d.toISOString().split('T')[0],
        time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        action: act.action,
        order: act.orderId || "-",
        performedBy: act.performedBy,
        details: act.details || null,
        isReverted: Boolean(act.isReverted),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
