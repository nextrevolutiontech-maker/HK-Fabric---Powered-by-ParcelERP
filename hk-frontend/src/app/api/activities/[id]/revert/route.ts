import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const activityId = resolvedParams.id;
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const performedBy = body.performedBy || authUser.username || 'Staff Admin';

    const result = await OrderService.revertActivity(activityId, performedBy);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error reverting activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revert activity action' },
      { status: 400 }
    );
  }
}
