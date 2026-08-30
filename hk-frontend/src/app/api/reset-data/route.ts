import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOwnerPin, getAuthenticatedUser } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. Server Authentication Check
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limiting (max 3 reset requests per 15 mins per IP)
    const clientIp = getClientIp(request);
    const limiter = rateLimit(`reset-data:${clientIp}`, 3, 15 * 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const pin = body.pin;

    // 3. Server-Side Owner PIN Verification
    const isValidPin = await verifyOwnerPin(pin);
    if (!isValidPin) {
      return NextResponse.json({ error: 'Invalid Owner PIN' }, { status: 403 });
    }

    // 4. Log Audit Activity Before Reset
    await prisma.activity.create({
      data: {
        action: 'System Reset',
        performedBy: authUser.username || 'Owner',
        details: `System data reset executed by ${authUser.username} (IP ${clientIp})`
      }
    });

    // 5. Perform Transactional Data Reset
    await prisma.$transaction([
      prisma.orderItem.deleteMany({}),
      prisma.trackingEntry.deleteMany({}),
      prisma.parcelLabel.deleteMany({}),
      prisma.codPayment.deleteMany({}),
      prisma.settlementItem.deleteMany({}),
      prisma.settlement.deleteMany({}),
      prisma.order.deleteMany({}),
      prisma.customer.deleteMany({}),
    ]);

    return NextResponse.json({ success: true, message: 'All database entries have been reset to 0.' });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
