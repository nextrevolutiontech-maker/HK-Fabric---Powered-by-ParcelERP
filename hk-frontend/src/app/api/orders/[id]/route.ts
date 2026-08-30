import { NextResponse } from 'next/server';
import { OrderService, DuplicateTrackingError } from '@/services/order.service';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const order = await OrderService.getOrderById(id);

    return NextResponse.json(order);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch order' }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const rawBody = await request.text();
    const data = rawBody ? JSON.parse(rawBody) : {};

    const updatedOrder = await OrderService.updateOrder(id, data);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);

    if (error instanceof DuplicateTrackingError || error?.duplicateTracking) {
      return NextResponse.json({
        error: error.message,
        duplicateTracking: true,
        existingOrder: error.existingOrder,
      }, { status: 409 });
    }

    if (error.message && error.message.includes('PIN')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (
      error.message?.includes('Tracking number') ||
      error.message?.includes('already exists') ||
      error.message?.includes('required') ||
      error.message?.includes('invalid') ||
      error.message?.includes('Cannot')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Tracking number already exists on another order." }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin') || undefined;

    const result = await OrderService.deleteOrder(id, pin);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting order:', error);

    if (error.message && error.message.includes('PIN')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 });
  }
}
