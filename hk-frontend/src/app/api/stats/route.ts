import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate') || undefined;
    const endDateStr = searchParams.get('endDate') || undefined;

    const stats = await OrderService.getSystemStats({ startDateStr, endDateStr });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching system stats:', error);
    return NextResponse.json({ error: 'Failed to fetch system stats' }, { status: 500 });
  }
}
