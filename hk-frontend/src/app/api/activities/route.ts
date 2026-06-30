import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Format for frontend
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
