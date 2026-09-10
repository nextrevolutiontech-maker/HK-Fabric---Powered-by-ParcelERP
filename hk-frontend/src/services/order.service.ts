import { prisma } from '@/lib/prisma';
import { normalizePhone, normalizeText, normalizeTracking, areItemsIdentical, getProvinceFromCity } from '@/lib/normalization';
import { verifyOwnerPin, sanitizeOrderUpdateDto } from '@/lib/auth';

export class DuplicateParcelError extends Error {
  public duplicate: boolean = true;
  public existingOrder: any;

  constructor(message: string, existingOrder: any) {
    super(message);
    this.name = 'DuplicateParcelError';
    this.existingOrder = existingOrder;
  }
}

export class DuplicateTrackingError extends Error {
  public duplicateTracking: boolean = true;
  public existingOrder: any;

  constructor(message: string, existingOrder: any) {
    super(message);
    this.name = 'DuplicateTrackingError';
    this.existingOrder = existingOrder;
  }
}

export interface OrderQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  orderType?: 'COD' | 'NON-COD' | string;
  status?: string;
  codStatus?: string;
  startDateStr?: string;
  endDateStr?: string;
}

export function validateTrackingFormat(trackingNumber: string | null | undefined): boolean {
  if (!trackingNumber) return false;
  const trimmed = trackingNumber.trim();
  if (trimmed.length < 4 || trimmed.length > 50) return false;
  // Allow alphanumeric, hyphens, slashes, spaces
  const trackingRegex = /^[A-Za-z0-9\s\-_/]+$/;
  return trackingRegex.test(trimmed);
}

/**
 * Calculates Pakistan Time (PKT, UTC+5) start and end Date boundaries safely
 */
export function getPKTDateBounds(startDateStr?: string, endDateStr?: string) {
  let startPKT: Date | undefined;
  let endPKT: Date | undefined;

  if (startDateStr && startDateStr.trim()) {
    const sDate = new Date(`${startDateStr.trim()}T00:00:00.000+05:00`);
    if (!isNaN(sDate.getTime())) {
      startPKT = sDate;
    }
  }

  if (endDateStr && endDateStr.trim()) {
    const eDate = new Date(`${endDateStr.trim()}T23:59:59.999+05:00`);
    if (!isNaN(eDate.getTime())) {
      endPKT = eDate;
    }
  }

  // Safety check: if start date is after end date, swap them cleanly
  if (startPKT && endPKT && startPKT > endPKT) {
    startPKT = new Date(`${endDateStr?.trim()}T00:00:00.000+05:00`);
    endPKT = new Date(`${startDateStr?.trim()}T23:59:59.999+05:00`);
  }

  return { startPKT, endPKT };
}

export const OrderService = {
  /**
   * Fetch orders with multi-field server-side search, database date filtering (PKT), and pagination
   */
  async getOrders(options: OrderQueryOptions = {}) {
    const { 
      page = 1, 
      limit = 100, 
      search, 
      orderType, 
      status, 
      codStatus, 
      startDateStr, 
      endDateStr 
    } = options;

    // Database Self-Correction: Automatically normalize any legacy zero-balance COD orders to NON-COD
    await prisma.order.updateMany({
      where: { totalAmount: 0, orderType: 'COD' },
      data: { orderType: 'NON-COD' }
    });

    const where: any = {};

    if (orderType && orderType !== 'all' && orderType !== 'ALL') {
      where.orderType = orderType.toUpperCase();
      if (orderType.toUpperCase() === 'COD') {
        where.totalAmount = { gt: 0 };
      }
    }

    if (status && status !== 'all' && status !== 'ALL') {
      where.status = status.toLowerCase();
    }

    if (codStatus && codStatus !== 'all' && codStatus !== 'ALL') {
      where.codStatus = codStatus.toUpperCase();
    }

    const { startPKT, endPKT } = getPKTDateBounds(startDateStr, endDateStr);
    if (startPKT || endPKT) {
      where.createdAt = {};
      if (startPKT) where.createdAt.gte = startPKT;
      if (endPKT) where.createdAt.lte = endPKT;
    }

    // Multi-field server-side search (Order #, Customer Name, Phone, Address, City, Tracking No, Courier)
    if (search && search.trim()) {
      const query = search.trim();
      const cleanDigits = query.replace(/\D/g, '');
      const normalizedTrack = normalizeTracking(query);

      const searchConditions: any[] = [
        { orderNo: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { customer: { phone: { contains: query, mode: 'insensitive' } } },
        { customer: { alternatePhone: { contains: query, mode: 'insensitive' } } },
        { customer: { address: { contains: query, mode: 'insensitive' } } },
        { customer: { city: { contains: query, mode: 'insensitive' } } },
        { trackingEntries: { some: { trackingNumber: { contains: query, mode: 'insensitive' } } } },
        { trackingEntries: { some: { courierName: { contains: query, mode: 'insensitive' } } } },
      ];

      if (cleanDigits.length >= 4) {
        searchConditions.push({ customer: { phone: { contains: cleanDigits } } });
        searchConditions.push({ customer: { alternatePhone: { contains: cleanDigits } } });
      }

      if (normalizedTrack.length >= 3) {
        searchConditions.push({ trackingEntries: { some: { trackingNumber: { contains: normalizedTrack } } } });
      }

      where.OR = searchConditions;
    }

    const totalCount = await prisma.order.count({ where });

    const safePage = Math.max(1, Number(page));
    const safeLimit = Math.max(1, Math.min(500, Number(limit)));
    const skip = (safePage - 1) * safeLimit;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: true,
        trackingEntries: { orderBy: { createdAt: 'desc' } },
        codPayments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    });

    return {
      orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit) || 1,
      }
    };
  },

  /**
   * Fetch single order by database ID or orderNo
   */
  async getOrderById(id: string) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderNo: id }
        ]
      },
      include: {
        customer: true,
        items: true,
        trackingEntries: { orderBy: { createdAt: 'desc' } },
        codPayments: true,
      }
    });

    if (!order) {
      throw new Error(`Order not found with id or orderNo: ${id}`);
    }

    return order;
  },

  /**
   * Authoritative daily parcel history count aggregator with zero-day filling across PKT business dates
   */
  async getDailyParcelCounts(options: { startDateStr?: string; endDateStr?: string; orderType?: string } = {}) {
    const { startDateStr, endDateStr, orderType } = options;

    const todayPKTStr = new Date(Date.now() + 5 * 3600 * 1000).toISOString().split('T')[0];
    const defaultStart = new Date(Date.now() - 13 * 24 * 3600 * 1000 + 5 * 3600 * 1000).toISOString().split('T')[0];

    const startStr = startDateStr || defaultStart;
    const endStr = endDateStr || todayPKTStr;

    const { startPKT, endPKT } = getPKTDateBounds(startStr, endStr);

    const where: any = {
      status: { notIn: ['void', 'VOID'] },
      createdAt: {
        gte: startPKT,
        lte: endPKT
      }
    };

    if (orderType && orderType !== 'all' && orderType !== 'ALL') {
      where.orderType = orderType.toUpperCase();
    }

    const ordersInRange = await prisma.order.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        orderType: true,
        createdAt: true
      }
    });

    // Group by PKT Date (YYYY-MM-DD)
    const countsByDate: Record<string, { date: string; count: number; sales: number }> = {};

    ordersInRange.forEach(o => {
      const pktDate = new Date(o.createdAt.getTime() + 5 * 3600 * 1000).toISOString().split('T')[0];
      if (!countsByDate[pktDate]) {
        countsByDate[pktDate] = { date: pktDate, count: 0, sales: 0 };
      }
      countsByDate[pktDate].count += 1;
      countsByDate[pktDate].sales += o.totalAmount;
    });

    // Zero-Day Filling across entire calendar range
    const dailyHistory: { date: string; count: number; sales: number }[] = [];
    const curDate = new Date(`${startStr}T00:00:00.000+05:00`);
    const stopDate = new Date(`${endStr}T00:00:00.000+05:00`);

    while (curDate <= stopDate) {
      const dStr = curDate.toISOString().split('T')[0];
      if (countsByDate[dStr]) {
        dailyHistory.push(countsByDate[dStr]);
      } else {
        dailyHistory.push({ date: dStr, count: 0, sales: 0 });
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    return dailyHistory;
  },

  /**
   * Authoritative database-level stats aggregation for COD, Non-COD, and Overall metrics
   */
  async getSystemStats(options: { startDateStr?: string; endDateStr?: string } = {}) {
    const { startDateStr, endDateStr } = options;
    const { startPKT, endPKT } = getPKTDateBounds(startDateStr, endDateStr);
    
    const dateFilter: any = {};
    if (startPKT || endPKT) {
      dateFilter.createdAt = {};
      if (startPKT) dateFilter.createdAt.gte = startPKT;
      if (endPKT) dateFilter.createdAt.lte = endPKT;
    }

    const baseWhere = {
      status: { notIn: ['void', 'VOID'] },
      ...dateFilter
    };

    // COD Aggregations
    const codCount = await prisma.order.count({
      where: { ...baseWhere, orderType: 'COD' }
    });

    const codSalesAgg = await prisma.order.aggregate({
      where: { ...baseWhere, orderType: 'COD' },
      _sum: { totalAmount: true }
    });

    const pendingCodOrders = await prisma.order.findMany({
      where: { ...baseWhere, orderType: 'COD', codStatus: { in: ['PENDING', 'pending', 'Pending'] } },
      select: { totalAmount: true, advancePayment: true }
    });
    const codPendingAmount = pendingCodOrders.reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.advancePayment), 0);

    const receivedCodOrders = await prisma.order.findMany({
      where: { ...baseWhere, orderType: 'COD', codStatus: { in: ['RECEIVED', 'received', 'Received'] } },
      select: { totalAmount: true, advancePayment: true }
    });
    const codReceivedAmount = receivedCodOrders.reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.advancePayment), 0);

    // Non-COD Aggregations
    const nonCodCount = await prisma.order.count({
      where: { ...baseWhere, orderType: 'NON-COD' }
    });

    const nonCodSalesAgg = await prisma.order.aggregate({
      where: { ...baseWhere, orderType: 'NON-COD' },
      _sum: { totalAmount: true }
    });

    const advanceAgg = await prisma.order.aggregate({
      where: baseWhere,
      _sum: { advancePayment: true }
    });

    const codSales = codSalesAgg._sum.totalAmount || 0;
    const nonCodSales = nonCodSalesAgg._sum.totalAmount || 0;
    const totalAdvance = advanceAgg._sum.advancePayment || 0;

    return {
      cod: {
        count: codCount,
        sales: codSales,
        pendingAmount: codPendingAmount,
        receivedAmount: codReceivedAmount,
      },
      nonCod: {
        count: nonCodCount,
        sales: nonCodSales,
      },
      overall: {
        totalCount: codCount + nonCodCount,
        totalSales: codSales + nonCodSales,
        totalAdvance,
      }
    };
  },

  /**
   * Create a new order with complete data integrity, duplicate protection, financial recalculation, and transaction safety.
   */
  async createOrder(data: any, options: { idempotencyKey?: string; overrideDuplicate?: boolean } = {}) {
    const { idempotencyKey, overrideDuplicate = false } = options;

    if (idempotencyKey) {
      const existingIdempotency = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey }
      });
      if (existingIdempotency) {
        try {
          return JSON.parse(existingIdempotency.response);
        } catch (e) {
          // Fallback if parse fails
        }
      }
    }

    const { 
      orderNo, customerDetails, handledBy, orderType, 
      advancePayment = 0, paymentType = "Courier", items, notes, deliveryCharges = 0 
    } = data;

    if (!customerDetails || !customerDetails.phone) {
      throw new Error("Customer phone number is required");
    }
    const normalizedPhone = normalizePhone(customerDetails.phone);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new Error("A valid customer phone number is required");
    }

    if (!customerDetails.name || !customerDetails.name.trim()) {
      throw new Error("Customer name is required");
    }
    if (!customerDetails.city || !customerDetails.city.trim()) {
      throw new Error("City is required");
    }
    if (!customerDetails.address || !customerDetails.address.trim()) {
      throw new Error("Complete address is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one product item is required");
    }

    // Financial Data Integrity Recalculation
    let itemsSum = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName || !item.productName.trim()) {
        throw new Error(`Item ${i + 1} has invalid product name`);
      }
      const qty = Math.max(1, Number(item.qty || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice || 0));
      if (isNaN(qty) || isNaN(unitPrice)) {
        throw new Error(`Item "${item.productName}" has invalid quantity or price`);
      }
      itemsSum += (qty * unitPrice);
    }

    const safeDelivery = Math.max(0, Number(deliveryCharges || 0));
    const safeAdvance = Math.max(0, Number(advancePayment || 0));
    const grandTotal = itemsSum + safeDelivery;

    // Overpayment Protection: Advance payment cannot exceed Grand Total
    if (safeAdvance > grandTotal) {
      throw new Error("Advance payment cannot exceed Grand Total.");
    }

    const calculatedTotalAmount = grandTotal;
    const netCodAmount = Math.max(0, grandTotal - safeAdvance);
    
    // Strict Financial Classification Rule:
    // Net COD Amount == 0 -> NON-COD (100% advance / prepaid)
    // Net COD Amount > 0 -> COD (courier collects remaining balance)
    const cleanOrderType = netCodAmount === 0 ? "NON-COD" : "COD";

    if (paymentType !== "Online" && paymentType !== "Courier") {
      throw new Error("Payment type must be 'Online' or 'Courier'");
    }

    if (!overrideDuplicate) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const recentCustomerOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: fifteenMinsAgo },
          customer: {
            phone: normalizedPhone
          },
          status: { notIn: ["void", "VOID"] }
        },
        include: {
          customer: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const existing of recentCustomerOrders) {
        const sameAmount = Math.abs(existing.totalAmount - calculatedTotalAmount) < 0.01;
        const sameItems = areItemsIdentical(items, existing.items);
        
        // Prevent duplicate orders for the same customer within 15 minutes (if same amount OR same items)
        if (sameAmount || sameItems) {
          throw new DuplicateParcelError(
            `A duplicate order (#${existing.orderNo}) was recently created for ${existing.customer?.name || 'this customer'}.`,
            {
              orderNo: existing.orderNo,
              customer: existing.customer?.name,
              phone: existing.customer?.phone,
              address: existing.customer?.address,
              totalAmount: existing.totalAmount,
              items: existing.items,
              createdAt: existing.createdAt,
            }
          );
        }
      }
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      const targetProvince = (customerDetails.province && customerDetails.province.trim()) 
        ? customerDetails.province.trim() 
        : getProvinceFromCity(customerDetails.city);

      const customer = await tx.customer.upsert({
        where: { phone: normalizedPhone },
        update: {
          name: customerDetails.name.trim(),
          alternatePhone: customerDetails.alternatePhone ? normalizePhone(customerDetails.alternatePhone) : undefined,
          province: targetProvince || undefined,
          city: customerDetails.city.trim(),
          address: customerDetails.address.trim(),
        },
        create: {
          phone: normalizedPhone,
          name: customerDetails.name.trim(),
          alternatePhone: customerDetails.alternatePhone ? normalizePhone(customerDetails.alternatePhone) : null,
          province: targetProvince || null,
          city: customerDetails.city.trim(),
          address: customerDetails.address.trim(),
        }
      });

      let finalOrderNo: string;

      if (orderNo) {
        const exists = await tx.order.findUnique({ where: { orderNo } });
        if (!exists) {
          finalOrderNo = orderNo;
        } else {
          const lastOrder = await tx.order.findFirst({
            where: { orderNo: { startsWith: 'HKF-2026-' } },
            orderBy: { createdAt: 'desc' },
            select: { orderNo: true }
          });
          let nextNum = (await tx.order.count()) + 1;
          if (lastOrder && lastOrder.orderNo) {
            const match = lastOrder.orderNo.match(/\d+$/);
            if (match) {
              const parsed = parseInt(match[0], 10);
              if (!isNaN(parsed) && parsed >= nextNum) {
                nextNum = parsed + 1;
              }
            }
          }
          finalOrderNo = `HKF-2026-${String(nextNum).padStart(6, '0')}`;
        }
      } else {
        const lastOrder = await tx.order.findFirst({
          where: { orderNo: { startsWith: 'HKF-2026-' } },
          orderBy: { createdAt: 'desc' },
          select: { orderNo: true }
        });
        let nextNum = (await tx.order.count()) + 1;
        if (lastOrder && lastOrder.orderNo) {
          const match = lastOrder.orderNo.match(/\d+$/);
          if (match) {
            const parsed = parseInt(match[0], 10);
            if (!isNaN(parsed) && parsed >= nextNum) {
              nextNum = parsed + 1;
            }
          }
        }
        finalOrderNo = `HKF-2026-${String(nextNum).padStart(6, '0')}`;
      }

      const order = await tx.order.create({
        data: {
          orderNo: finalOrderNo,
          customerId: customer.id,
          handledBy: handledBy || "System",
          orderType: cleanOrderType,
          totalAmount: calculatedTotalAmount,
          deliveryCharges: safeDelivery,
          advancePayment: safeAdvance,
          paymentType,
          notes: notes ? notes.trim() : null,
          items: {
            create: items.map((item: any) => ({
              productName: item.productName.trim(),
              qty: Math.max(1, Number(item.qty)),
              unitPrice: Math.max(0, Number(item.unitPrice)),
              lineTotal: Math.max(1, Number(item.qty)) * Math.max(0, Number(item.unitPrice)),
            }))
          }
        },
        include: {
          customer: true,
          items: true,
        }
      });

      await tx.activity.create({
        data: {
          orderId: order.id,
          action: "Order Created",
          performedBy: handledBy || "System",
          details: `Order ${finalOrderNo} created for ${customer.name} (Amount: Rs ${calculatedTotalAmount})`,
        }
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: calculatedTotalAmount },
          lastOrderDate: new Date(),
        }
      });

      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            response: JSON.stringify(order),
            statusCode: 201,
          }
        });
      }

      return order;
    });

    return createdOrder;
  },

  /**
   * Update an existing order with mass-assignment protection and secure Owner PIN verification
   */
  async updateOrder(id: string, rawData: any) {
    const data = sanitizeOrderUpdateDto(rawData);
    const { 
      status, codStatus, trackingNumber, trackingNumber2, courierName, voidReason, notes, actionName, performedBy, pin,
      customerDetails, handledBy, orderType, totalAmount, advancePayment, paymentType, items, deliveryCharges
    } = data;

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderNo: id }
        ]
      },
      include: { customer: true, trackingEntries: { orderBy: { createdAt: 'desc' } } }
    });

    if (!existingOrder) {
      throw new Error('Order not found');
    }

    const targetId = existingOrder.id;

    if (status === 'void' || status === 'VOID') {
      const isPinValid = await verifyOwnerPin(pin);
      if (!isPinValid) {
        throw new Error('Invalid Owner PIN for VOID operation');
      }
    }

    if (orderType && orderType.toUpperCase() !== existingOrder.orderType) {
      if (existingOrder.codStatus === 'RECEIVED' || existingOrder.status === 'delivered' || existingOrder.status === 'void') {
        throw new Error(`Cannot change Order Type for Order #${existingOrder.orderNo} because it is already ${existingOrder.status.toUpperCase()} or COD RECEIVED.`);
      }
    }

    // Enforce Business Rule: Cannot mark order as Delivered/Shipped or COD Received without a Tracking Number
    const targetStatus = status ? status.toLowerCase() : existingOrder.status.toLowerCase();
    const targetCodStatus = codStatus ? codStatus.toLowerCase() : existingOrder.codStatus.toLowerCase();
    const hasTrackingNumber = Boolean(existingOrder.trackingEntries && existingOrder.trackingEntries.length > 0 && existingOrder.trackingEntries[0]?.trackingNumber);
    const isAddingTrackingNow = Boolean(trackingNumber && trackingNumber.trim());

    if ((targetStatus === 'delivered' || targetStatus === 'shipped' || targetCodStatus === 'received') && !hasTrackingNumber && !isAddingTrackingNow) {
      throw new Error(`Cannot set Order #${existingOrder.orderNo} to ${targetStatus.toUpperCase()} because no Tracking Number or Courier has been assigned yet. Please assign tracking first.`);
    }

    const isTrackingBeingModified = trackingNumber !== undefined || trackingNumber2 !== undefined || courierName !== undefined;
    if (isTrackingBeingModified) {
      if (existingOrder.status === 'void' || existingOrder.status === 'VOID') {
        throw new Error(`Cannot assign or edit tracking number on VOID Order #${existingOrder.orderNo}.`);
      }

      // Require PIN ONLY IF the order ALREADY has a tracking number assigned AND is marked delivered/received
      if (hasTrackingNumber && (existingOrder.status === 'delivered' || existingOrder.codStatus === 'RECEIVED')) {
        const isPinValid = await verifyOwnerPin(pin);
        if (!isPinValid) {
          throw new Error(`Owner PIN is required to edit tracking for Order #${existingOrder.orderNo} (Status: ${existingOrder.status.toUpperCase()}).`);
        }
      }
    }

    if (trackingNumber && trackingNumber.trim() && !validateTrackingFormat(trackingNumber)) {
      throw new Error(`Invalid tracking number format: "${trackingNumber}". Tracking numbers must be 4-50 alphanumeric characters.`);
    }
    if (trackingNumber2 && trackingNumber2.trim() && !validateTrackingFormat(trackingNumber2)) {
      throw new Error(`Invalid secondary tracking number format: "${trackingNumber2}".`);
    }

    if (trackingNumber && trackingNumber.trim()) {
      const normalizedTrack = normalizeTracking(trackingNumber);
      const existingEntry = await prisma.trackingEntry.findFirst({
        where: { 
          trackingNumber: normalizedTrack,
          orderId: { not: targetId }
        },
        include: { order: { include: { customer: true } } }
      });
      if (existingEntry) {
        throw new DuplicateTrackingError(
          `Tracking number "${trackingNumber}" is already assigned to Order #${existingEntry.order.orderNo}.`,
          {
            orderNo: existingEntry.order.orderNo,
            customer: existingEntry.order.customer?.name || "Unknown",
            phone: existingEntry.order.customer?.phone || "",
            courier: existingEntry.courierName,
            status: existingEntry.order.status,
            createdAt: existingEntry.order.createdAt
          }
        );
      }
    }

    if (trackingNumber2 && trackingNumber2.trim()) {
      const normalizedTrack2 = normalizeTracking(trackingNumber2);
      const existingEntry2 = await prisma.trackingEntry.findFirst({
        where: { 
          trackingNumber: normalizedTrack2,
          orderId: { not: targetId }
        },
        include: { order: { include: { customer: true } } }
      });
      if (existingEntry2) {
        throw new DuplicateTrackingError(
          `Secondary tracking number "${trackingNumber2}" is already assigned to Order #${existingEntry2.order.orderNo}.`,
          {
            orderNo: existingEntry2.order.orderNo,
            customer: existingEntry2.order.customer?.name || "Unknown",
            phone: existingEntry2.order.customer?.phone || "",
            courier: existingEntry2.courierName,
            status: existingEntry2.order.status,
            createdAt: existingEntry2.order.createdAt
          }
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      let customerId = data.customerId;

      if (!customerId && customerDetails && customerDetails.phone) {
        const normalizedPhone = normalizePhone(customerDetails.phone);
        const targetProvince = (customerDetails.province && customerDetails.province.trim()) 
          ? customerDetails.province.trim() 
          : getProvinceFromCity(customerDetails.city);

        const customer = await tx.customer.upsert({
          where: { phone: normalizedPhone },
          update: {
            name: customerDetails.name,
            alternatePhone: customerDetails.alternatePhone ? normalizePhone(customerDetails.alternatePhone) : undefined,
            province: targetProvince || undefined,
            city: customerDetails.city,
            address: customerDetails.address,
          },
          create: {
            phone: normalizedPhone,
            name: customerDetails.name,
            alternatePhone: customerDetails.alternatePhone ? normalizePhone(customerDetails.alternatePhone) : null,
            province: targetProvince || null,
            city: customerDetails.city,
            address: customerDetails.address,
          }
        });
        customerId = customer.id;
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (codStatus !== undefined) updateData.codStatus = codStatus;
      if (voidReason !== undefined) updateData.voidReason = voidReason;
      if (notes !== undefined) updateData.notes = notes;
      if (handledBy !== undefined) updateData.handledBy = handledBy;
      if (orderType !== undefined) updateData.orderType = orderType.toUpperCase();
      if (deliveryCharges !== undefined) updateData.deliveryCharges = Math.max(0, Number(deliveryCharges));
      if (advancePayment !== undefined) updateData.advancePayment = Math.max(0, Number(advancePayment));
      if (paymentType !== undefined) updateData.paymentType = paymentType;
      if (customerId !== undefined) updateData.customerId = customerId;

      const safeDelivery = updateData.deliveryCharges !== undefined ? updateData.deliveryCharges : existingOrder.deliveryCharges;
      const safeAdvance = updateData.advancePayment !== undefined ? updateData.advancePayment : existingOrder.advancePayment;

      if (items && Array.isArray(items)) {
        let itemsSum = 0;
        const newItemsData = items.map((item: any) => {
          const qty = Math.max(1, Number(item.qty));
          const unitPrice = Math.max(0, Number(item.unitPrice));
          const lineTotal = qty * unitPrice;
          itemsSum += lineTotal;
          return {
            productName: item.productName,
            qty,
            unitPrice,
            lineTotal,
          };
        });

        updateData.items = {
          deleteMany: {},
          create: newItemsData
        };

        const grandTotal = itemsSum + safeDelivery;
        if (safeAdvance > grandTotal) {
          throw new Error("Advance payment cannot exceed Grand Total.");
        }
        const remAmount = Math.max(0, grandTotal - safeAdvance);
        updateData.orderType = remAmount === 0 ? "NON-COD" : "COD";
        updateData.totalAmount = grandTotal;
      } else if (updateData.deliveryCharges !== undefined || updateData.advancePayment !== undefined || updateData.orderType !== undefined) {
        const dbItems = await tx.orderItem.findMany({ where: { orderId: targetId } });
        const itemsSum = dbItems.reduce((sum, i) => sum + i.lineTotal, 0);
        const grandTotal = itemsSum + safeDelivery;
        if (safeAdvance > grandTotal) {
          throw new Error("Advance payment cannot exceed Grand Total.");
        }
        const remAmount = Math.max(0, grandTotal - safeAdvance);
        updateData.orderType = remAmount === 0 ? "NON-COD" : "COD";
        updateData.totalAmount = grandTotal;
      }

      const updatedOrder = await tx.order.update({
        where: { id: targetId },
        data: updateData,
        include: { customer: true, items: true, trackingEntries: { orderBy: { createdAt: 'desc' } } }
      });

      const previousTrack = existingOrder.trackingEntries?.[0]?.trackingNumber || null;
      const targetCourier = courierName || existingOrder.trackingEntries?.[0]?.courierName || 'Other';

      if (trackingNumber !== undefined) {
        // Clear all previous tracking entries for this order so stale/wrong tracking numbers don't persist
        await tx.trackingEntry.deleteMany({ where: { orderId: targetId } });

        if (trackingNumber && trackingNumber.trim()) {
          const normalizedTrack = normalizeTracking(trackingNumber);
          await tx.trackingEntry.create({
            data: {
              orderId: targetId,
              courierName: targetCourier,
              trackingNumber: normalizedTrack
            }
          });

          if (updatedOrder.status === 'pending' || updatedOrder.status === 'CONFIRMED' || updatedOrder.status === 'processing' || updatedOrder.status === 'confirmed') {
            await tx.order.update({
              where: { id: targetId },
              data: { status: 'shipped' }
            });
          }
        }

        if (trackingNumber2 && trackingNumber2.trim()) {
          const normalizedTrack2 = normalizeTracking(trackingNumber2);
          await tx.trackingEntry.create({
            data: {
              orderId: targetId,
              courierName: targetCourier,
              trackingNumber: normalizedTrack2
            }
          });
        }
      } else if (courierName && existingOrder.trackingEntries?.length > 0) {
        await tx.trackingEntry.updateMany({
          where: { orderId: targetId },
          data: { courierName }
        });
      }

      const actionLabel = actionName || (trackingNumber ? "Tracking Assigned" : `Updated Order #${updatedOrder.orderNo}`);
      await tx.activity.create({
        data: {
          orderId: targetId,
          action: actionLabel,
          performedBy: performedBy || "System",
          oldValue: previousTrack ? `Tracking: ${previousTrack}` : `Status: ${existingOrder.status}`,
          newValue: trackingNumber ? `Tracking: ${normalizeTracking(trackingNumber)} (${targetCourier})` : `Status: ${status || updatedOrder.status}`,
          details: `Order #${updatedOrder.orderNo} updated: ${actionLabel}`
        }
      });

      return tx.order.findUnique({
        where: { id: targetId },
        include: { customer: true, items: true, trackingEntries: { orderBy: { createdAt: 'desc' } } }
      });
    });
  },

  /**
   * 1-Click Action Revert / Undo logic
   */
  async revertActivity(activityId: string, performedBy: string = "Staff Admin") {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new Error("Activity log not found");
    }

    if (activity.isReverted) {
      throw new Error("This activity has already been reverted");
    }

    if (!activity.orderId) {
      throw new Error("Cannot revert an activity that is not associated with an order");
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: activity.orderId },
          { orderNo: activity.orderId }
        ]
      },
      include: { trackingEntries: { orderBy: { createdAt: 'desc' } } }
    });

    if (!order) {
      throw new Error("Associated order not found");
    }

    const targetId = order.id;

    // Determine target state from oldValue or previous state
    let targetStatus = order.status;
    let targetCodStatus = order.codStatus;
    let revertActionSummary = `Reverted "${activity.action}" for Order #${order.orderNo}`;

    // Extract status from oldValue if present e.g. "Status: shipped"
    if (activity.oldValue && activity.oldValue.includes("Status: ")) {
      const match = activity.oldValue.match(/Status:\s*([a-zA-Z]+)/);
      if (match && match[1]) {
        targetStatus = match[1].toLowerCase();
      }
    } else {
      // Fallback: Find the previous activity record for this order
      const previousActivity = await prisma.activity.findFirst({
        where: {
          orderId: targetId,
          id: { not: activityId },
          createdAt: { lt: activity.createdAt }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (previousActivity && previousActivity.newValue && previousActivity.newValue.includes("Status: ")) {
        const match = previousActivity.newValue.match(/Status:\s*([a-zA-Z]+)/);
        if (match && match[1]) {
          targetStatus = match[1].toLowerCase();
        }
      } else {
        // Default revert fallback
        if (activity.action.includes("delivered") || activity.action.includes("COD Received")) {
          targetStatus = "shipped";
          targetCodStatus = "PENDING";
        } else if (activity.action.includes("shipped")) {
          targetStatus = "confirmed";
        }
      }
    }

    // Specific action handlers
    if (activity.action === "COD Received" || activity.action.includes("COD Received")) {
      targetStatus = "shipped";
      targetCodStatus = "PENDING";
    }

    if (activity.action === "Void Order" || activity.action.includes("VOID") || activity.action.includes("void")) {
      if (targetStatus === "void" || targetStatus === "VOID") {
        targetStatus = "shipped";
      }
    }

    return await prisma.$transaction(async (tx) => {
      // If reverting COD Received, delete CodPayment records created for this order
      if (activity.action === "COD Received" || activity.action.includes("COD Received")) {
        await tx.codPayment.deleteMany({ where: { orderId: targetId } });
      }

      // Update Order to reverted state
      const updatedOrder = await tx.order.update({
        where: { id: targetId },
        data: {
          status: targetStatus,
          codStatus: targetCodStatus,
          voidReason: targetStatus === "void" ? order.voidReason : null,
        },
        include: { customer: true, items: true, trackingEntries: { orderBy: { createdAt: 'desc' } } }
      });

      // Mark activity as reverted
      await tx.activity.update({
        where: { id: activityId },
        data: { isReverted: true }
      });

      // Create new audit activity entry
      await tx.activity.create({
        data: {
          orderId: targetId,
          action: "Action Reverted",
          performedBy,
          oldValue: `Action: ${activity.action} (${activity.newValue || ''})`,
          newValue: `Restored Status: ${targetStatus.toUpperCase()}`,
          details: revertActionSummary,
          isReverted: false
        }
      });

      return {
        message: revertActionSummary,
        order: updatedOrder
      };
    });
  },

  async deleteOrder(id: string, pin?: string) {
    if (pin !== undefined) {
      if (!verifyOwnerPin(pin)) {
        throw new Error("Invalid Owner PIN");
      }
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderNo: id }
        ]
      },
      include: { customer: true }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const targetId = order.id;

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: targetId } });
      await tx.trackingEntry.deleteMany({ where: { orderId: targetId } });
      await tx.activity.deleteMany({ where: { orderId: targetId } });
      await tx.codPayment.deleteMany({ where: { orderId: targetId } });
      await tx.order.delete({ where: { id: targetId } });
    });

    return { message: `Order #${order.orderNo} deleted successfully` };
  },

  /**
   * Authoritative Product-Wise Itemized Sales & Logistics Ledger aggregator
   */
  async getProductSalesLedger(options: {
    startDateStr?: string;
    endDateStr?: string;
    search?: string;
    orderType?: string;
  } = {}) {
    const { startDateStr, endDateStr, search, orderType } = options;
    const { startPKT, endPKT } = getPKTDateBounds(startDateStr, endDateStr);

    const whereOrder: any = {
      status: { notIn: ['void', 'VOID'] }
    };

    if (orderType && orderType !== 'all' && orderType !== 'ALL') {
      whereOrder.orderType = orderType.toUpperCase();
    }

    if (startPKT || endPKT) {
      whereOrder.createdAt = {};
      if (startPKT) whereOrder.createdAt.gte = startPKT;
      if (endPKT) whereOrder.createdAt.lte = endPKT;
    }

    const orders = await prisma.order.findMany({
      where: whereOrder,
      include: {
        customer: true,
        items: true,
        trackingEntries: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' }
    });

    const itemizedList: any[] = [];
    const productSummaryMap: Record<string, { productName: string; totalQty: number; totalSales: number; orderIds: Set<string> }> = {};

    let totalUnitsSold = 0;
    let totalRevenue = 0;
    const uniqueOrderIds = new Set<string>();

    for (const o of orders) {
      const netCodAmount = Math.max(0, o.totalAmount - o.advancePayment);
      const trackingNo = o.trackingEntries?.[0]?.trackingNumber || null;
      const courierName = o.trackingEntries?.[0]?.courierName || null;

      for (const item of o.items) {
        // Search filtering by product name, orderNo, customer name, phone, city
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const matchProd = item.productName.toLowerCase().includes(q);
          const matchOrder = o.orderNo.toLowerCase().includes(q);
          const matchCust = (o.customer?.name || '').toLowerCase().includes(q);
          const matchPhone = (o.customer?.phone || '').includes(q);
          const matchCity = (o.customer?.city || '').toLowerCase().includes(q);
          if (!matchProd && !matchOrder && !matchCust && !matchPhone && !matchCity) {
            continue;
          }
        }

        uniqueOrderIds.add(o.id);
        totalUnitsSold += item.qty;
        totalRevenue += item.lineTotal;

        itemizedList.push({
          id: item.id,
          orderId: o.id,
          orderNo: o.orderNo,
          orderDate: o.createdAt,
          orderType: o.orderType,
          handledBy: o.handledBy || 'System',
          status: o.status,
          codStatus: o.codStatus,
          customerName: o.customer?.name || 'Unknown',
          customerPhone: o.customer?.phone || '',
          customerCity: o.customer?.city || '',
          customerProvince: o.customer?.province || '',
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          orderTotal: o.totalAmount,
          deliveryCharges: o.deliveryCharges,
          advancePayment: o.advancePayment,
          netCodAmount,
          trackingNo,
          courierName,
        });

        const pName = item.productName.trim();
        if (!productSummaryMap[pName]) {
          productSummaryMap[pName] = {
            productName: pName,
            totalQty: 0,
            totalSales: 0,
            orderIds: new Set<string>()
          };
        }
        productSummaryMap[pName].totalQty += item.qty;
        productSummaryMap[pName].totalSales += item.lineTotal;
        productSummaryMap[pName].orderIds.add(o.id);
      }
    }

    const productSummary = Object.values(productSummaryMap).map(p => ({
      productName: p.productName,
      totalQty: p.totalQty,
      totalSales: p.totalSales,
      orderCount: p.orderIds.size,
      avgPrice: p.totalQty > 0 ? Math.round(p.totalSales / p.totalQty) : 0
    })).sort((a, b) => b.totalSales - a.totalSales);

    return {
      items: itemizedList,
      productSummary,
      stats: {
        totalUnitsSold,
        totalRevenue,
        uniqueProductsCount: productSummary.length,
        totalOrdersCount: uniqueOrderIds.size
      }
    };
  }
};
