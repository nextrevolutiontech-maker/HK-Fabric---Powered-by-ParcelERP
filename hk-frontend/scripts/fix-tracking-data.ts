import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTrackingData() {
  const orders = await prisma.order.findMany({
    include: {
      trackingEntries: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  console.log(`Checking ${orders.length} orders for multi-tracking entries...`);

  for (const order of orders) {
    if (order.trackingEntries.length > 1) {
      console.log(`Fixing Order #${order.orderNo} (ID: ${order.id}) - currently has ${order.trackingEntries.length} entries.`);
      // Latest entry is index 0 because ordered by createdAt desc
      const keepEntry = order.trackingEntries[0];
      const removeEntries = order.trackingEntries.slice(1);

      console.log(`  Keeping: ${keepEntry.courierName} - ${keepEntry.trackingNumber} (${keepEntry.createdAt})`);
      for (const remove of removeEntries) {
        console.log(`  Deleting stale entry: ${remove.courierName} - ${remove.trackingNumber} (${remove.createdAt})`);
        await prisma.trackingEntry.delete({
          where: { id: remove.id }
        });
      }
    }
  }

  console.log('Cleanup completed successfully!');
}

fixTrackingData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
