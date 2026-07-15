import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data...");
  await prisma.activity.deleteMany({});
  await prisma.settlementItem.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.codPayment.deleteMany({});
  await prisma.parcelLabel.deleteMany({});
  await prisma.trackingEntry.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log("Creating PostEx dummy orders with tracking numbers from slip...");

  const customer = await prisma.customer.create({
    data: {
      name: "HK FABRICS",
      phone: "03000000000",
      city: "Lahore",
      address: "Test Address",
    }
  });

  const trackingNumbers = [
    "09895-01-030125219",
    "09895-01-030125221",
    "09895-01-030125222",
    "09895-01-030125787",
    "09895-01-030125789",
    "09895-01-030125939",
    "09895-01-030126460",
    "09895-01-030126464",
    "09895-01-030126466",
    "09895-01-030126471",
    "09895-01-030126475",
    "09895-01-030126480",
    "09895-01-030126481",
    "09895-01-030128482",
  ];

  for (let i = 0; i < trackingNumbers.length; i++) {
    const orderNo = `HKF-POSTEX-${String(i+1).padStart(4, '0')}`;
    const trackingNo = trackingNumbers[i];
    
    await prisma.order.create({
      data: {
        orderNo,
        customerId: customer.id,
        handledBy: "Sami",
        orderType: "COD",
        totalAmount: 1500, // Dummy amount
        status: "shipped",
        codStatus: "pending",
        paymentType: "Courier",
        trackingEntries: {
          create: {
            courierName: "PostEx",
            trackingNumber: trackingNo
          }
        },
        items: {
          create: [{
            productName: "Fabric Item",
            qty: 1,
            unitPrice: 1500,
            lineTotal: 1500,
          }]
        }
      }
    });

    console.log(`Created order ${orderNo} with tracking ${trackingNo}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
