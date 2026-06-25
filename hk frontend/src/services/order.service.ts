import { prisma } from '@/lib/prisma';

export const OrderService = {
  /**
   * Fetch orders with their relations
   * @param limit Number of orders to fetch
   */
  async getOrders(limit: number = 100) {
    return prisma.order.findMany({
      include: {
        customer: true,
        items: true,
        trackingEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Create a new order, log activity, and update customer stats
   * @param data Order details
   */
  async createOrder(data: any) {
    const { 
      orderNo, customerDetails, handledBy, orderType, totalAmount, 
      advancePayment, paymentType, items, notes 
    } = data;

    let customerId = data.customerId;

    if (!customerId && customerDetails && customerDetails.phone) {
      const customer = await prisma.customer.upsert({
        where: { phone: customerDetails.phone },
        update: {
          name: customerDetails.name,
          city: customerDetails.city,
          address: customerDetails.address,
        },
        create: {
          phone: customerDetails.phone,
          name: customerDetails.name,
          city: customerDetails.city,
          address: customerDetails.address,
        }
      });
      customerId = customer.id;
    }

    // Create the order with its items
    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId,
        handledBy,
        orderType,
        totalAmount,
        advancePayment,
        paymentType,
        notes,
        items: {
          create: items.map((item: any) => ({
            productName: item.productName,
            qty: item.qty,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          }))
        }
      },
      include: {
        customer: true,
        items: true,
      }
    });

    // Create activity
    await prisma.activity.create({
      data: {
        orderId: order.id,
        action: "Order Created",
        performedBy: handledBy || "System",
        details: `Order ${orderNo} created`,
      }
    });

    // Update customer stats
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: totalAmount },
          lastOrderDate: new Date(),
        }
      });
    }

    return order;
  },

  /**
   * Update an existing order and its tracking, and log the activity
   * @param id Order ID
   * @param data Update details
   */
  async updateOrder(id: string, data: any) {
    const { status, codStatus, trackingNumber, courierName, voidReason, notes, actionName, performedBy, pin } = data;

    if (status === 'void' || status === 'VOID') {
      const settings = await prisma.setting.findFirst();
      if (settings && settings.ownerPin !== pin) {
        throw new Error('Invalid Owner PIN for VOID operation');
      }
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (codStatus) updateData.codStatus = codStatus;
    if (voidReason) updateData.voidReason = voidReason;
    if (notes) updateData.notes = notes;

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Handle tracking entry if provided
    if (trackingNumber && courierName) {
      await prisma.trackingEntry.create({
        data: {
          orderId: id,
          trackingNumber,
          courierName,
        }
      });
    }

    // Log Activity
    const actionLabel = actionName || `Updated Order ${updatedOrder.orderNo}`;
    await prisma.activity.create({
      data: {
        orderId: id,
        action: actionLabel,
        performedBy: performedBy || "System",
        details: `Order updated: ${JSON.stringify(updateData)}`
      }
    });

    return updatedOrder;
  }
};
