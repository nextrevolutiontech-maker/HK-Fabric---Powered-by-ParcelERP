import { prisma } from '@/lib/prisma';

export const CustomerService = {
  /**
   * Fetch all customers
   */
  async getCustomers() {
    return prisma.customer.findMany({
      orderBy: { lastOrderDate: 'desc' }
    });
  },

  /**
   * Create or update a customer based on phone number
   * @param data Customer details
   */
  async upsertCustomer(data: any) {
    const { phone, name, alternatePhone, city, address, notes } = data;

    if (!phone) {
      throw new Error('WhatsApp number (phone) is required');
    }

    return prisma.customer.upsert({
      where: { phone },
      update: { name, alternatePhone, city, address, notes },
      create: { phone, name, alternatePhone, city, address, notes }
    });
  }
};
