import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const limiter = rateLimit(`settlement-approve:${clientIp}`, 15, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded for settlement approvals.' }, { status: 429 });
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const orderIds = body.orderIds;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds non-empty array is required' }, { status: 400 });
    }

    if (orderIds.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 order approvals per batch.' }, { status: 400 });
    }

    const count = await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: {
          id: { in: orderIds }
        },
        data: {
          codStatus: 'RECEIVED'
        }
      });

      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } }
      });

      const payments = orders.map(order => ({
        orderId: order.id,
        amount: order.totalAmount,
        notes: 'Auto-approved via Settlement OCR'
      }));

      if (payments.length > 0) {
        await tx.codPayment.createMany({
          data: payments
        });
      }

      await tx.activity.create({
        data: {
          action: 'Settlement Approved',
          performedBy: authUser.username || 'Staff',
          details: `Approved COD settlement for ${orders.length} orders`
        }
      });

      return orders.length;
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error approving settlements:', error);
    return NextResponse.json({ error: 'Failed to approve settlements' }, { status: 500 });
  }
}
