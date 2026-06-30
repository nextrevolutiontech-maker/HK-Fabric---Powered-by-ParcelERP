import { NextResponse } from 'next/server';
import { CustomerService } from '@/services/customer.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Call Service
    const customers = await CustomerService.getCustomers();
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Call Service
    const customer = await CustomerService.upsertCustomer(data);

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating/updating customer:', error);
    
    if (error.message === 'WhatsApp number (phone) is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create/update customer' }, { status: 500 });
  }
}
