import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTracking } from '@/lib/normalization';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const limiter = rateLimit(`tracking-lookup:${clientIp}`, 60, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded for tracking lookup.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get('trackingNumber');
    const excludeOrderId = searchParams.get('excludeOrderId') || undefined;

    if (!trackingNumber) {
      return NextResponse.json({ exists: false });
    }

    const normalizedTrack = normalizeTracking(trackingNumber);
    if (!normalizedTrack) {
      return NextResponse.json({ exists: false });
    }

    const where: any = {
      trackingNumber: normalizedTrack
    };

    if (excludeOrderId) {
      where.orderId = { not: excludeOrderId };
    }

    const existingEntry = await prisma.trackingEntry.findFirst({
      where,
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    });

    if (existingEntry) {
      return NextResponse.json({
        exists: true,
        existingOrder: {
          id: existingEntry.order.id,
          orderNo: existingEntry.order.orderNo,
          customer: existingEntry.order.customer?.name || "Unknown",
          phone: existingEntry.order.customer?.phone || "",
          courier: existingEntry.courierName,
          status: existingEntry.order.status,
          createdAt: existingEntry.order.createdAt
        }
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error('Error looking up tracking number:', error);
    return NextResponse.json({ error: 'Failed to lookup tracking number' }, { status: 500 });
  }
}
