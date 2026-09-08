import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
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
    const limiter = rateLimit(`product-sales-get:${clientIp}`, 100, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const orderType = searchParams.get('orderType') || undefined;
    const startDateStr = searchParams.get('startDate') || undefined;
    const endDateStr = searchParams.get('endDate') || undefined;

    const ledgerData = await OrderService.getProductSalesLedger({
      startDateStr,
      endDateStr,
      search,
      orderType,
    });

    return NextResponse.json(ledgerData);
  } catch (error) {
    console.error('Error fetching product sales ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch product sales ledger' }, { status: 500 });
  }
}
