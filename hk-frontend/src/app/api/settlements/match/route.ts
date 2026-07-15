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

    // Fetch all tracking entries since we need to do fuzzy/suffix matching
    const allEntries = await prisma.trackingEntry.findMany({
      include: {
        order: true
      }
    });

    // Helper for Levenshtein distance
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

    // Construct response matching what frontend preview needs
    const assignedIds = new Set<string>();
    
    // First Pass: Exact and Suffix Matches
    const firstPass = cleanedNumbers.map(tracking => {
      // 1. Exact Match
      let match = allEntries.find(e => e.trackingNumber.toUpperCase() === tracking && !assignedIds.has(e.id));
      
      // 2. Suffix Match or Missing hyphen Match
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

    // Second Pass: Fuzzy Match for unmatched
    const result = firstPass.map(item => {
      let { tracking, match } = item;

      // 3. Fuzzy Match
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
