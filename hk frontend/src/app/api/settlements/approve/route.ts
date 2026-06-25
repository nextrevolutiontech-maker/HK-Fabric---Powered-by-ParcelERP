import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds)) {
      return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
    }

    // Bulk update orders
    await prisma.order.updateMany({
      where: {
        id: {
          in: orderIds
        }
      },
      data: {
        codStatus: 'RECEIVED'
      }
    });

    // Create CodPayment records
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } }
    });

    const payments = orders.map(order => ({
      orderId: order.id,
      amount: order.totalAmount,
      notes: 'Auto-approved via Settlement OCR'
    }));

    await prisma.codPayment.createMany({
      data: payments
    });

    return NextResponse.json({ success: true, count: orderIds.length });
  } catch (error) {
    console.error('Error approving settlements:', error);
    return NextResponse.json({ error: 'Failed to approve settlements' }, { status: 500 });
  }
}
