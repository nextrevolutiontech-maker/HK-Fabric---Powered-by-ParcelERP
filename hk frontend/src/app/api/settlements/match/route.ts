import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { trackingNumbers } = await request.json();

    if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
      return NextResponse.json({ error: 'trackingNumbers array is required' }, { status: 400 });
    }

    // Clean tracking numbers (trim, uppercase)
    const cleanedNumbers = trackingNumbers.map(t => t.trim().toUpperCase());

    // Query database for matched tracking entries
    const matchedEntries = await prisma.trackingEntry.findMany({
      where: {
        trackingNumber: {
          in: cleanedNumbers
        }
      },
      include: {
        order: true
      }
    });

    const matchedMap = new Map(matchedEntries.map(entry => [entry.trackingNumber.toUpperCase(), entry]));

    // Construct response matching what frontend preview needs
    const result = cleanedNumbers.map(tracking => {
      const match = matchedMap.get(tracking);
      if (match) {
        return {
          tracking,
          matched: match.order.orderNo,
          orderId: match.orderId,
          amount: match.order.totalAmount,
          status: match.order.codStatus === 'RECEIVED' ? 'already_received' : 'matched'
        };
      } else {
        return {
          tracking,
          matched: null,
          orderId: null,
          amount: 0,
          status: 'unmatched'
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error matching settlements:', error);
    return NextResponse.json({ error: 'Failed to match tracking numbers' }, { status: 500 });
  }
}
