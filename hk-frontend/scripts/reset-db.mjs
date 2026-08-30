import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting full database reset for production launch...");
  
  await prisma.$transaction([
    prisma.orderItem.deleteMany({}),
    prisma.trackingEntry.deleteMany({}),
    prisma.parcelLabel.deleteMany({}),
    prisma.codPayment.deleteMany({}),
    prisma.settlementItem.deleteMany({}),
    prisma.settlement.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.customer.deleteMany({}),
    prisma.activity.deleteMany({}),
    prisma.idempotencyRecord.deleteMany({}),
  ]);

  console.log("✅ Database reset complete! All testing orders, tracking, settlements, activities, and customer records cleared.");
  
  const orderCount = await prisma.order.count();
  const customerCount = await prisma.customer.count();
  console.log(`Current Database Counts: Orders = ${orderCount}, Customers = ${customerCount}`);
}

main()
  .catch((e) => {
    console.error("Error resetting database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
