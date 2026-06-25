const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'HK Fabric - Powered by ParcelERP', 'hk frontend', 'src', 'components', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes('@tanstack/react-query')) {
  content = content.replace(
    'import { useState, useEffect, useRef } from "react";',
    'import { useState, useEffect, useRef } from "react";\nimport { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";'
  );
}

// 2. Find function App() start
const appStartRegex = /export default function App\(\) \{[\s\S]*?(?=const handleViewOrder)/;
const newAppState = `export default function App() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("currentScreen") as Screen) || "dashboard";
    return "dashboard";
  });
  useEffect(() => {
    localStorage.setItem("currentScreen", screen);
  }, [screen]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      return data.map((o: any) => ({
        _id: o.id,
        id: o.orderNo,
        customer: o.customer?.name || "Unknown",
        whatsapp: o.customer?.phone || "",
        city: o.customer?.city || "",
        address: o.customer?.address || "",
        amount: o.totalAmount,
        handledBy: o.handledBy,
        status: o.status.toLowerCase(),
        codStatus: o.codStatus.toLowerCase(),
        date: new Date(o.createdAt).toISOString().split('T')[0],
        courier: o.trackingEntries?.[0]?.courierName,
        trackingNo: o.trackingEntries?.[0]?.trackingNumber,
        products: o.items?.map((i: any) => ({ name: i.productName, qty: i.qty, price: i.unitPrice })) || [],
        type: o.orderType,
        notes: o.notes,
        province: "",
        deliveryCharges: 0,
        advancePayment: o.advancePayment || 0,
        paymentType: o.paymentType || "Courier",
        receivedDate: o.codPayments?.[0]?.receivedDate ? new Date(o.codPayments[0].receivedDate).toISOString().split('T')[0] : undefined
      }));
    }
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      return ACTIVITY_DATA; // Mock fallback until API is ready
    }
  });

  const createOrderMut = useMutation({
    mutationFn: async (newOrder: Order) => {
      const payload = {
        orderNo: newOrder.id,
        customerDetails: {
          phone: newOrder.whatsapp,
          name: newOrder.customer,
          city: newOrder.city,
          address: newOrder.address,
        },
        handledBy: newOrder.handledBy,
        orderType: newOrder.type,
        totalAmount: newOrder.amount,
        advancePayment: newOrder.advancePayment || 0,
        paymentType: newOrder.paymentType || "Courier",
        items: newOrder.products.map((p: any) => ({
          productName: p.name,
          qty: p.qty,
          unitPrice: p.price,
          lineTotal: p.qty * p.price
        })),
        notes: newOrder.notes
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const updateOrderMut = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const dbId = orders.find((o: any) => o.id === id)?._id;
      if (!dbId) throw new Error("Order not found");
      const res = await fetch(\`/api/orders/\${dbId}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update order");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: any) => alert(err.message)
  });

  `;

content = content.replace(appStartRegex, newAppState);

// 3. Replace handle functions
const handlersRegex = /const handleSaveOrder[\s\S]*?(?=useEffect\(\(\) => \{[\s\S]*?const onKey)/;
const newHandlers = `const handleSaveOrder = (newOrder: Order) => {
    const existing = orders.find((o: any) => o.id === newOrder.id);
    if (existing) {
      // Currently not handling deep item updates via PATCH.
      alert("Editing existing orders fully requires expanded API support.");
    } else {
      createOrderMut.mutate(newOrder);
    }
  };

  const handleVoidOrder = (orderId: string, performer: "Sami" | "Abid") => {
    const pin = prompt("Enter Owner PIN to Void this order:");
    if (!pin) return;
    updateOrderMut.mutate({
      id: orderId,
      data: { status: 'void', performedBy: performer, pin }
    });
  };

  const handleSaveTracking = (orderId: string, courier: string, trackingNo: string) => {
    updateOrderMut.mutate({
      id: orderId,
      data: { status: 'shipped', courierName: courier, trackingNumber: trackingNo, actionName: "Tracking Added" }
    });
  };

  const handleReceiveCOD = (orderId: string, date: string) => {
    updateOrderMut.mutate({
      id: orderId,
      data: { codStatus: 'received', status: 'delivered', actionName: "COD Received" }
    });
  };

  `;

content = content.replace(handlersRegex, newHandlers);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx refactored successfully.');
