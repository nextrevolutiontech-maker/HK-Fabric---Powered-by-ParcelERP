import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await request.json();

    // Call Service
    const updatedOrder = await OrderService.updateOrder(id, data);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);
    if (error.message && error.message.includes('PIN')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
