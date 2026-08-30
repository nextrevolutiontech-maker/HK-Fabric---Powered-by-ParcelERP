import { NextResponse } from 'next/server';
import { OrderService, DuplicateParcelError } from '@/services/order.service';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Server Authentication Check
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const limiter = rateLimit(`orders-get:${clientIp}`, 100, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const orderType = searchParams.get('orderType') || undefined;
    const status = searchParams.get('status') || undefined;
    const codStatus = searchParams.get('codStatus') || undefined;
    const startDateStr = searchParams.get('startDate') || undefined;
    const endDateStr = searchParams.get('endDate') || undefined;

    // Security bounds capping
    const safeLimit = Math.min(500, Math.max(1, limit));
    const safePage = Math.max(1, page);

    const result = await OrderService.getOrders({
      page: safePage,
      limit: safeLimit,
      search,
      orderType,
      status,
      codStatus,
      startDateStr,
      endDateStr,
    });

    const isPaginated = searchParams.get('paginated') === 'true';
    if (isPaginated) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result.orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Server Authentication Check
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const limiter = rateLimit(`orders-post:${clientIp}`, 30, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded for order creation.' }, { status: 429 });
    }

    const rawBody = await request.text();
    const data = rawBody ? JSON.parse(rawBody) : {};

    const idempotencyKey = request.headers.get('x-idempotency-key') || request.headers.get('idempotency-key') || data.idempotencyKey;
    const overrideDuplicate = Boolean(data.overrideDuplicate);

    const order = await OrderService.createOrder(data, { idempotencyKey, overrideDuplicate });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);

    if (error instanceof DuplicateParcelError || error?.duplicate) {
      return NextResponse.json({
        error: error.message,
        duplicate: true,
        existingOrder: error.existingOrder,
      }, { status: 409 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Order number already exists." }, { status: 400 });
    }

    if (error.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
