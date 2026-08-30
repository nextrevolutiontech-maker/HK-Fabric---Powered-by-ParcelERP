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

    const formatted = activities.map(act => ({
      id: act.id,
      date: new Date(act.createdAt).toISOString().split('T')[0],
      time: new Date(act.createdAt).toTimeString().split(' ')[0],
      action: act.action,
      order: act.orderId || "-",
      performedBy: act.performedBy,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
