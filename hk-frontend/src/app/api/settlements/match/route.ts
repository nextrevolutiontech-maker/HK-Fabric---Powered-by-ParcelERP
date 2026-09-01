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
    const limiter = rateLimit(`settlement-match:${clientIp}`, 20, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json({ error: 'Rate limit exceeded for settlement matching.' }, { status: 429 });
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const trackingNumbers = body.trackingNumbers;

    if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
      return NextResponse.json({ error: 'trackingNumbers array is required' }, { status: 400 });
    }

    if (trackingNumbers.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 tracking numbers allowed per scan.' }, { status: 400 });
    }

    const cleanedNumbers = trackingNumbers.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim().toUpperCase());

    const allEntries = await prisma.trackingEntry.findMany({
      include: {
        order: true
      }
    });

    function getEditDistance(a: string, b: string) {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }

    const assignedIds = new Set<string>();
    
    const firstPass = cleanedNumbers.map(tracking => {
      let match = allEntries.find(e => e.trackingNumber.toUpperCase() === tracking && !assignedIds.has(e.id));
      
      if (!match && tracking.length >= 8) {
        match = allEntries.find(e => {
          if (assignedIds.has(e.id)) return false;
          const dbTrack = e.trackingNumber.toUpperCase();
          const cleanDb = dbTrack.replace(/-/g, '');
          const cleanScan = tracking.replace(/-/g, '');
          return dbTrack.endsWith(tracking) || cleanDb.endsWith(cleanScan);
        });
      }

      if (match) assignedIds.add(match.id);
      return { tracking, match, pass: 1 };
    });

    const result = firstPass.map(item => {
      let { tracking, match } = item;

      if (!match && tracking.length >= 10) {
        let bestDistance = Infinity;
        let bestMatch = null;
        for (const entry of allEntries) {
          if (assignedIds.has(entry.id)) continue;
          const dist = getEditDistance(entry.trackingNumber.toUpperCase(), tracking);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestMatch = entry;
          }
        }
        if (bestDistance <= 2 && bestMatch) {
          match = bestMatch;
          assignedIds.add(match.id);
        }
      }

      if (match) {
        return {
          tracking,
          matched: match.order.orderNo,
          orderId: match.orderId,
          amount: Math.max(0, match.order.totalAmount - match.order.advancePayment),
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

    return NextResponse.json({ preview: result });
  } catch (error) {
    console.error('Error matching settlement tracking numbers:', error);
    return NextResponse.json({ error: 'Failed to process settlement matching' }, { status: 500 });
  }
}
