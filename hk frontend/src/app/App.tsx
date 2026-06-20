import { useState, useEffect } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ElementType } from "react";
import {
  LayoutDashboard, Plus, Package, Truck, Banknote, Receipt,
  BarChart2, ClipboardList, Settings, Search, Bell, Menu, X,
  Eye, Edit2, Printer, Ban, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Upload, Download, User, Save, ArrowLeft, Check,
  AlertCircle, ChevronRight, Layers,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "dashboard" | "create-order" | "orders" | "order-detail"
  | "tracking" | "cod" | "settlements" | "reports"
  | "activity-log" | "settings" | "daily-closing";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "returned" | "void";
type CODStatus = "pending" | "received";

interface Product { name: string; qty: number; price: number }
interface Order {
  id: string; customer: string; whatsapp: string; city: string;
  address: string; amount: number; handledBy: "Sami" | "Abid";
  status: OrderStatus; codStatus: CODStatus; date: string;
  courier?: string; trackingNo?: string; products: Product[];
  notes?: string; type: "COD" | "NON-COD";
  receivedDate?: string;
  receiptUrl?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: "HKF-2026-000147", customer: "Ali Raza", whatsapp: "03001234567",
    city: "Lahore", address: "House 45, Block C, Gulberg III, Lahore",
    amount: 6200, handledBy: "Sami", status: "shipped", codStatus: "pending",
    date: "2026-06-20", courier: "TCS", trackingNo: "TCS123456789",
    products: [{ name: "King Size Bedsheet Set", qty: 1, price: 4500 }, { name: "Pillow Covers (2pc)", qty: 1, price: 1700 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000146", customer: "Ayesha Khan", whatsapp: "03211234567",
    city: "Karachi", address: "Flat 12, Block 4, Clifton, Karachi",
    amount: 3800, handledBy: "Abid", status: "delivered", codStatus: "received",
    date: "2026-06-20", courier: "PostEx", trackingNo: "PEX789012345",
    products: [{ name: "Double Bedsheet", qty: 2, price: 1900 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000145", customer: "Muhammad Usman", whatsapp: "03451234567",
    city: "Islamabad", address: "Street 3, F-7/2, Islamabad",
    amount: 9400, handledBy: "Sami", status: "processing", codStatus: "pending",
    date: "2026-06-20",
    products: [{ name: "Luxury Comforter Set", qty: 1, price: 7800 }, { name: "Mattress Protector", qty: 1, price: 1600 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000144", customer: "Sara Malik", whatsapp: "03121234567",
    city: "Faisalabad", address: "Mohallah Gulshan, D-Ground, Faisalabad",
    amount: 4200, handledBy: "Abid", status: "shipped", codStatus: "pending",
    date: "2026-06-19", courier: "Leopard", trackingNo: "LEP345678901",
    products: [{ name: "Single Bedsheet Set", qty: 2, price: 2100 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000143", customer: "Bilal Ahmed", whatsapp: "03331234567",
    city: "Rawalpindi", address: "Sector G-9/2, Rawalpindi",
    amount: 5600, handledBy: "Sami", status: "delivered", codStatus: "pending",
    date: "2026-06-19", courier: "M&P", trackingNo: "MNP901234567",
    products: [{ name: "Embroidered Bedsheet Set", qty: 1, price: 5600 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000142", customer: "Fatima Noor", whatsapp: "03051234567",
    city: "Multan", address: "Hussain Agahi Road, Multan",
    amount: 7100, handledBy: "Abid", status: "delivered", codStatus: "received",
    date: "2026-06-18", courier: "TCS", trackingNo: "TCS567890123",
    products: [{ name: "Queen Bedsheet Set", qty: 1, price: 5200 }, { name: "Towel Set (4pc)", qty: 1, price: 1900 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000141", customer: "Hassan Ali", whatsapp: "03701234567",
    city: "Peshawar", address: "Hayatabad Phase 4, Sector E3, Peshawar",
    amount: 3200, handledBy: "Sami", status: "void", codStatus: "pending",
    date: "2026-06-18",
    products: [{ name: "Single Bedsheet", qty: 2, price: 1600 }],
    type: "COD",
  },
  {
    id: "HKF-2026-000140", customer: "Zainab Shah", whatsapp: "03061234567",
    city: "Lahore", address: "DHA Phase 5, Block L, Lahore",
    amount: 12500, handledBy: "Abid", status: "delivered", codStatus: "received",
    date: "2026-06-17", courier: "PostEx", trackingNo: "PEX234567890",
    products: [{ name: "Luxury Bedsheet Set (King)", qty: 2, price: 6250 }],
    type: "COD",
  },
];

const ACTIVITY_DATA = [
  { id: 1, date: "2026-06-20", time: "11:47 AM", action: "Print Label", order: "HKF-2026-000147", by: "Sami" },
  { id: 2, date: "2026-06-20", time: "11:45 AM", action: "Create Order", order: "HKF-2026-000147", by: "Sami" },
  { id: 3, date: "2026-06-20", time: "10:30 AM", action: "Create Order", order: "HKF-2026-000146", by: "Abid" },
  { id: 4, date: "2026-06-20", time: "09:15 AM", action: "COD Received", order: "HKF-2026-000142", by: "Sami" },
  { id: 5, date: "2026-06-19", time: "04:20 PM", action: "Tracking Added", order: "HKF-2026-000144", by: "Abid" },
  { id: 6, date: "2026-06-19", time: "03:10 PM", action: "Create Order", order: "HKF-2026-000143", by: "Sami" },
  { id: 7, date: "2026-06-19", time: "02:45 PM", action: "Void Order", order: "HKF-2026-000141", by: "Sami" },
  { id: 8, date: "2026-06-18", time: "05:00 PM", action: "COD Received", order: "HKF-2026-000140", by: "Abid" },
  { id: 9, date: "2026-06-18", time: "01:30 PM", action: "Tracking Added", order: "HKF-2026-000143", by: "Abid" },
  { id: 10, date: "2026-06-17", time: "11:00 AM", action: "Create Order", order: "HKF-2026-000140", by: "Abid" },
];

const WEEKLY_DATA = [
  { day: "Mon", orders: 12, revenue: 68400, cod: 45000 },
  { day: "Tue", orders: 18, revenue: 94200, cod: 72000 },
  { day: "Wed", orders: 9, revenue: 51300, cod: 38500 },
  { day: "Thu", orders: 22, revenue: 118600, cod: 89000 },
  { day: "Fri", orders: 31, revenue: 161800, cod: 124000 },
  { day: "Sat", orders: 28, revenue: 147200, cod: 108000 },
  { day: "Sun", orders: 15, revenue: 79500, cod: 58000 },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

function formatPKR(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

// ─── Shared Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus | CODStatus }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    processing: "bg-blue-50 text-blue-700 border border-blue-200",
    shipped: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    delivered: "bg-green-50 text-green-700 border border-green-200",
    returned: "bg-orange-50 text-orange-700 border border-orange-200",
    void: "bg-red-50 text-red-600 border border-red-200",
    received: "bg-green-50 text-green-700 border border-green-200",
  };
  const labels: Record<string, string> = {
    pending: "Pending", processing: "Processing", shipped: "Shipped",
    delivered: "Delivered", returned: "Returned", void: "Void", received: "Received",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono tracking-wide", map[status])}>
      {labels[status]}
    </span>
  );
}

function Btn({
  children, variant = "primary", size = "md", onClick, className, disabled, type = "button",
}: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; onClick?: () => void; className?: string;
  disabled?: boolean; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-[#0F172A] text-white hover:bg-[#1E293B] focus:ring-[#0F172A]",
    secondary: "bg-white text-[#0F172A] border border-slate-200 hover:bg-slate-50 focus:ring-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
  };
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, v[variant], s[size], className)}>
      {children}
    </button>
  );
}

function FieldInput({ label, required, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        {...props}
        className={cn(
          "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md",
          "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors",
          props.className
        )}
      />
    </div>
  );
}

function FieldSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        {...props}
        className={cn(
          "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md",
          "focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors",
          props.className
        )}
      >
        {children}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[#0F172A] font-mono leading-none">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-1.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create-order", label: "Create Order", icon: Plus },
  { id: "orders", label: "Orders", icon: Package },
  { id: "tracking", label: "Tracking", icon: Truck },
  { id: "cod", label: "COD", icon: Banknote },
  { id: "settlements", label: "Settlements", icon: Receipt },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "daily-closing", label: "Daily Closing", icon: Clock },
  { id: "activity-log", label: "Activity Log", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

function Sidebar({ screen, setScreen, open, onClose }: {
  screen: Screen; setScreen: (s: Screen) => void; open: boolean; onClose: () => void;
}) {
  const go = (id: Screen) => { setScreen(id); onClose(); };

  const inner = (
    <div className="flex flex-col h-full bg-[#0F172A]">
      <div className="flex items-center gap-3 p-5 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 bg-[#D4AF37] rounded-lg flex items-center justify-center flex-shrink-0">
          <Layers size={18} className="text-[#0F172A]" />
        </div>
        <div>
          <div className="font-bold text-white text-[15px] leading-tight">HK Fabric</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Courier & COD System</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = screen === id || (screen === "order-detail" && id === "orders");
          return (
            <button
              key={id}
              onClick={() => go(id as Screen)}
              className={cn(
                "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {active && <span className="absolute left-0 inset-y-2 w-0.5 bg-[#D4AF37] rounded-r-full" />}
              <Icon size={16} />
              <span>{label}</span>
              {id === "create-order" && (
                <span className="ml-auto w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus size={10} className="text-[#0F172A]" />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-slate-300" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white">Sami / Abid</div>
            <div className="text-xs text-slate-500">Staff Account</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex lg:flex-col w-60 flex-shrink-0">{inner}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-60 shadow-2xl">{inner}</div>
        </div>
      )}
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onMenuClick, onSearchClick }: { onMenuClick: () => void; onSearchClick: () => void }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeStr = time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0 z-30">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <Menu size={19} className="text-slate-500" />
      </button>

      <div className="flex items-center gap-2 flex-shrink-0 lg:hidden mr-1">
        <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
          <Layers size={15} className="text-[#D4AF37]" />
        </div>
        <span className="font-bold text-[#0F172A] text-sm hidden sm:inline">HK Fabric</span>
      </div>

      <button
        onClick={onSearchClick}
        className="flex-1 max-w-sm flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 hover:border-slate-300 transition-all"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search orders, customers...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="hidden lg:inline-flex ml-auto text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[11px] text-slate-400 leading-none">{dateStr}</span>
          <span className="text-sm font-mono font-semibold text-[#0F172A] mt-0.5 leading-none">{timeStr}</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

// ─── Global Search ─────────────────────────────────────────────────────────────

function GlobalSearch({ open, onClose, setScreen, setSelectedOrderId, orders }: {
  open: boolean; onClose: () => void;
  setScreen: (s: Screen) => void; setSelectedOrderId: (id: string) => void;
  orders: Order[];
}) {
  const [q, setQ] = useState("");
  
  const matchingCustomers = q.length > 1
    ? orders.filter(o => o.customer.toLowerCase().includes(q.toLowerCase()) || o.whatsapp.includes(q))
    : [];
  const matchingOrders = q.length > 1
    ? orders.filter(o => o.id.toLowerCase().includes(q.toLowerCase()))
    : [];
  const matchingTracking = q.length > 1
    ? orders.filter(o => o.trackingNo?.toLowerCase().includes(q.toLowerCase()))
    : [];
  const matchingCOD = q.length > 1
    ? orders.filter(o => o.type === "COD" && (o.id.toLowerCase().includes(q.toLowerCase()) || o.customer.toLowerCase().includes(q.toLowerCase())))
    : [];

  const hasResults = matchingCustomers.length > 0 || matchingOrders.length > 0 || matchingTracking.length > 0 || matchingCOD.length > 0;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { onClose(); setQ(""); }} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Search size={17} className="text-slate-400 flex-shrink-0" />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Order no, customer, WhatsApp, tracking..."
            className="flex-1 text-sm outline-none placeholder:text-slate-400 font-mono"
          />
          <button onClick={() => { onClose(); setQ(""); }} className="p-1 rounded hover:bg-slate-100">
            <X size={15} className="text-slate-400" />
          </button>
        </div>
        {hasResults ? (
          <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
            {matchingCustomers.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={12} /> Customers</h4>
                <div className="space-y-1">
                  {Array.from(new Set(matchingCustomers.map(o => o.whatsapp))).map(w => {
                    const o = matchingCustomers.find(item => item.whatsapp === w)!;
                    return (
                      <div key={w} className="p-2 rounded-lg hover:bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{o.customer}</div>
                          <div className="text-slate-400 font-mono">{o.whatsapp}</div>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">{o.city}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {matchingOrders.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Package size={12} /> Orders</h4>
                <div className="space-y-1">
                  {matchingOrders.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-left text-xs"
                    >
                      <div className="font-mono font-semibold text-[#0F172A]">{o.id}</div>
                      <div className="text-slate-500">{o.customer}</div>
                      <StatusBadge status={o.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingTracking.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Truck size={12} /> Tracking</h4>
                <div className="space-y-1">
                  {matchingTracking.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex flex-col p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-left text-xs"
                    >
                      <div className="flex justify-between font-mono text-[10px] text-slate-400">
                        <span>Order: {o.id}</span>
                        <span>{o.courier}</span>
                      </div>
                      <div className="font-mono text-slate-700 mt-0.5">{o.trackingNo}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingCOD.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Banknote size={12} /> COD History</h4>
                <div className="space-y-1">
                  {matchingCOD.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-left text-xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-[#0F172A]">{o.id}</span>
                        <span className="text-slate-400 ml-2 font-mono">{formatPKR(o.amount)}</span>
                      </div>
                      <StatusBadge status={o.codStatus} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : q.length > 1 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No results found</div>
        ) : (
          <div className="p-5 text-center text-xs text-slate-400">
            Search by order number, customer name, WhatsApp, or tracking number
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({ setScreen, onViewOrder, orders }: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  orders: Order[];
}) {
  const todayOrders = orders.filter(o => o.date === "2026-06-20");
  const pendingTracking = orders.filter(o => !o.trackingNo && o.status !== "void").length;
  const pendingCOD = orders.filter(o => o.codStatus === "pending" && o.status === "delivered").length;
  const receivedCOD = orders.filter(o => o.codStatus === "received").reduce((a, b) => a + b.amount, 0);
  const todayRevenue = todayOrders.reduce((a, b) => a + b.amount, 0);
  const voidOrders = orders.filter(o => o.status === "void").length;
  const hasPendingSettlements = true; // Alerts for settlements waiting for approval

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Friday, 20 June 2026</p>
      </div>

      {/* Alert banners */}
      {(pendingTracking > 0 || pendingCOD > 0 || hasPendingSettlements) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {pendingTracking > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-1">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700 flex-1">
                <strong>{pendingTracking} orders</strong> awaiting tracking
              </span>
              <button onClick={() => setScreen("tracking")} className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap">
                Add now →
              </button>
            </div>
          )}
          {pendingCOD > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-1">
              <Clock size={15} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-700 flex-1">
                <strong>{pendingCOD} orders</strong> COD not received
              </span>
              <button onClick={() => setScreen("cod")} className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap">
                View →
              </button>
            </div>
          )}
          {hasPendingSettlements && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg flex-1">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700 flex-1">
                <strong>Settlement Waiting</strong> for approval
              </span>
              <button onClick={() => setScreen("settlements")} className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap">
                Review →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Today's Orders" value={todayOrders.length} sub="As of now" color="bg-blue-50 text-blue-600" icon={Package} />
        <StatCard label="Pending Tracking" value={pendingTracking} sub="Without tracking" color="bg-amber-50 text-amber-600" icon={Clock} />
        <StatCard label="Pending COD" value={pendingCOD} sub="Delivered, unpaid" color="bg-orange-50 text-orange-600" icon={AlertCircle} />
        <StatCard label="Received COD" value={formatPKR(receivedCOD)} sub="This week" color="bg-green-50 text-green-600" icon={CheckCircle2} />
        <StatCard label="Today's Revenue" value={formatPKR(todayRevenue)} sub={`${todayOrders.length} orders`} color="bg-indigo-50 text-indigo-600" icon={TrendingUp} />
        <StatCard label="Void Orders" value={voidOrders} sub="All time" color="bg-red-50 text-red-500" icon={Ban} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setScreen("create-order")}><Plus size={14} /> New Order</Btn>
        <Btn variant="secondary" onClick={() => setScreen("tracking")}><Truck size={14} /> Add Tracking</Btn>
        <Btn variant="secondary" onClick={() => setScreen("cod")}><Banknote size={14} /> Receive COD</Btn>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Orders</h2>
            <button onClick={() => setScreen("orders")} className="text-xs text-slate-400 hover:text-[#0F172A] font-medium transition-colors">View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5">Order</th>
                  <th className="text-left px-4 py-2.5">Customer</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-left px-4 py-2.5">By</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => onViewOrder(o.id)}>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs text-[#0F172A]">{o.customer}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#0F172A]">{formatPKR(o.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium",
                        o.handledBy === "Sami" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                      )}>{o.handledBy}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent COD */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent COD</h2>
            <button onClick={() => setScreen("cod")} className="text-xs text-slate-400 hover:text-[#0F172A] font-medium transition-colors">View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5">Order</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.filter(o => o.status === "delivered" || o.codStatus === "received").slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => onViewOrder(o.id)}>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#0F172A]">{formatPKR(o.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.codStatus} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.receivedDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Weekly Performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Jun 14 – Jun 20, 2026</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#0F172A] inline-block rounded" /> Orders</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#D4AF37] inline-block rounded" /> Revenue</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }} />
              <Bar dataKey="orders" fill="#0F172A" radius={[3, 3, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v: number) => [formatPKR(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#revG)" dot={false} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Create Order Screen ───────────────────────────────────────────────────────

function CreateOrderScreen({
  setScreen,
  orders,
  onSaveOrder,
  editOrderId,
  clearEditId,
}: {
  setScreen: (s: Screen) => void;
  orders: Order[];
  onSaveOrder: (order: Order) => void;
  editOrderId: string | null;
  clearEditId: () => void;
}) {
  const [handledBy, setHandledBy] = useState<"Sami" | "Abid">("Sami");
  const [whatsapp, setWhatsapp] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [orderType, setOrderType] = useState<"COD" | "NON-COD">("COD");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState([{ name: "", qty: 1, price: 0 }]);
  const [saved, setSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const existing = whatsapp.length >= 10 ? orders.find(o => o.whatsapp === whatsapp) : null;

  useEffect(() => {
    if (editOrderId) {
      const o = orders.find(item => item.id === editOrderId);
      if (o) {
        setHandledBy(o.handledBy);
        setWhatsapp(o.whatsapp);
        setCustomerName(o.customer);
        setAltPhone(o.whatsapp === o.whatsapp ? "" : ""); // Keep alternate placeholder
        setCity(o.city);
        setAddress(o.address);
        setOrderType(o.type);
        setNotes(o.notes || "");
        setProducts(o.products.map(p => ({ ...p })));
      }
    }
  }, [editOrderId, orders]);

  useEffect(() => {
    if (existing && !editOrderId) {
      setCustomerName(existing.customer);
      setCity(existing.city);
      setAddress(existing.address);
    }
  }, [existing?.whatsapp, editOrderId]);

  const subtotal = products.reduce((s, p) => s + p.qty * p.price, 0);
  const orderIdToSave = editOrderId || `HKF-2026-${String(orders.length + 148).padStart(6, "0")}`;

  const addProduct = () => setProducts(p => [...p, { name: "", qty: 1, price: 0 }]);
  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));
  const updateProduct = (i: number, field: string, val: string | number) =>
    setProducts(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleSave = () => {
    if (!whatsapp.trim()) {
      setErrorMsg("WhatsApp number is mandatory!");
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg("Customer Name is required!");
      return;
    }
    if (!city) {
      setErrorMsg("Please select a city!");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Address is required!");
      return;
    }
    if (products.some(p => !p.name.trim() || p.qty < 1 || p.price <= 0)) {
      setErrorMsg("Please specify valid product names, quantities, and prices!");
      return;
    }
    setErrorMsg("");

    const newOrder: Order = {
      id: orderIdToSave,
      customer: customerName,
      whatsapp: whatsapp,
      city: city,
      address: address,
      amount: subtotal,
      handledBy: handledBy,
      status: editOrderId ? (orders.find(item => item.id === editOrderId)?.status || "pending") : "pending",
      codStatus: editOrderId ? (orders.find(item => item.id === editOrderId)?.codStatus || "pending") : "pending",
      date: editOrderId ? (orders.find(item => item.id === editOrderId)?.date || "2026-06-20") : "2026-06-20",
      products: products,
      type: orderType,
      notes: notes,
      courier: editOrderId ? orders.find(item => item.id === editOrderId)?.courier : undefined,
      trackingNo: editOrderId ? orders.find(item => item.id === editOrderId)?.trackingNo : undefined,
      receivedDate: editOrderId ? orders.find(item => item.id === editOrderId)?.receivedDate : undefined,
    };

    onSaveOrder(newOrder);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (editOrderId) clearEditId();
      setScreen("orders");
    }, 1500);
  };

  return (
    <div className="space-y-5 max-w-3xl pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen("orders")} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft size={17} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">{editOrderId ? "Edit Order" : "Create Order"}</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Order ID: {orderIdToSave}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Handled By */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Handled By</h3>
        <div className="flex gap-3">
          {(["Sami", "Abid"] as const).map(name => (
            <button key={name} onClick={() => setHandledBy(name)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                handledBy === name
                  ? "bg-[#0F172A] text-white border-[#0F172A]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Customer Information</h3>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            WhatsApp Number <span className="text-red-500">*</span>
          </label>
          <input
            value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
            placeholder="03001234567" maxLength={11}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] font-mono transition-colors"
          />
        </div>

        {existing && (
          <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-green-800">Existing Customer Found!</div>
              <div className="text-xs text-green-700 mt-1 space-x-2">
                <span>{existing.customer}</span>
                <span>·</span>
                <span>{orders.filter(o => o.whatsapp === whatsapp).length} previous orders</span>
                <span>·</span>
                <span className="font-medium">
                  Total Spend: {formatPKR(orders.filter(o => o.whatsapp === whatsapp).reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1 font-medium bg-green-100/50 p-1.5 rounded border border-green-200/50 inline-block">
                Last Order: {existing.id} on {existing.date} ({formatPKR(existing.amount)})
              </div>
              <div className="text-xs text-green-600 mt-1">Details auto-filled below ↓</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldInput label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
          <FieldInput label="Alternate Number" value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="Optional" className="font-mono" />
          <FieldSelect label="City" value={city} onChange={e => setCity(e.target.value)}>
            <option value="">Select City</option>
            {["Lahore","Karachi","Islamabad","Faisalabad","Rawalpindi","Peshawar","Multan","Quetta","Hyderabad","Sialkot"].map(c => (
              <option key={c}>{c}</option>
            ))}
          </FieldSelect>
          <FieldInput label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Complete delivery address" />
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">Products</h3>
          <Btn size="sm" variant="secondary" onClick={addProduct}><Plus size={13} /> Add Row</Btn>
        </div>

        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 uppercase tracking-wide px-1 mb-2">
          <div className="col-span-5">Product Name</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-3 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div className="space-y-2">
          {products.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-5">
                <input value={p.name} onChange={e => updateProduct(i, "name", e.target.value)}
                  placeholder="Product name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors" />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input type="number" min={1} value={p.qty} onChange={e => updateProduct(i, "qty", parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 text-center font-mono transition-colors" />
              </div>
              <div className="col-span-5 sm:col-span-3">
                <input type="number" min={0} value={p.price || ""} onChange={e => updateProduct(i, "price", parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 text-right font-mono transition-colors" />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                <span className="font-mono text-xs font-semibold text-[#0F172A] flex-1 text-right">
                  {p.qty * p.price > 0 ? formatPKR(p.qty * p.price) : "—"}
                </span>
                {products.length > 1 && (
                  <button onClick={() => removeProduct(i)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Order Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-[#0F172A]">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5 font-semibold text-base">
                <span>Grand Total</span>
                <span className="font-mono text-[#D4AF37]">{formatPKR(subtotal)}</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Order Type</label>
              <div className="flex gap-4">
                {(["COD", "NON-COD"] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="orderType" value={t} checked={orderType === t}
                      onChange={() => setOrderType(t)} className="w-4 h-4 accent-[#0F172A]" />
                    <span className="text-sm font-medium text-slate-700">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Special instructions, fragile items, call before delivery..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] resize-none transition-colors" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Btn size="lg" className="sm:flex-1" onClick={handleSave}>
          {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Order</>}
        </Btn>
        <Btn size="lg" variant="secondary" className="sm:flex-1" onClick={() => setShowPrint(true)}>
          <Printer size={15} /> Save & Print Label
        </Btn>
        <Btn size="lg" variant="ghost" onClick={() => setScreen("orders")}>Cancel</Btn>
      </div>

      {/* Print Modal */}
      <Modal open={showPrint} onClose={() => setShowPrint(false)} title="Parcel Label Preview">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs">
          <div className="text-center mb-3 pb-3 border-b border-slate-200">
            <div className="text-base font-bold text-[#0F172A]">HK FABRIC</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bedsheets & Home Textiles</div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{orderIdToSave}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{handledBy}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{customerName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{whatsapp || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{city || "—"}</span></div>
            <div className="pt-1"><span className="text-slate-400">Address: </span><span>{address || "—"}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-sm">COD:</span>
              <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(subtotal)}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">QR Code</div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Btn className="flex-1" onClick={() => { handleSave(); setShowPrint(false); }}>
            <Printer size={14} /> Print Label
          </Btn>
          <Btn variant="secondary" onClick={() => setShowPrint(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Orders Screen ────────────────────────────────────────────────────────────

function OrdersScreen({
  setScreen,
  onViewOrder,
  onEditOrder,
  orders,
  onVoidOrder,
}: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  onEditOrder: (id: string) => void;
  orders: Order[];
  onVoidOrder: (id: string, performer: "Sami" | "Abid") => void;
}) {
  const [dateFilter, setDateFilter] = useState("today");
  const [handledFilter, setHandledFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courierFilter, setCourierFilter] = useState("all");
  const [codStatusFilter, setCODStatusFilter] = useState("all");

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [voidModal, setVoidModal] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [pinError, setPinError] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);

  const filtered = orders.filter(o => {
    // Handled By Staff
    if (handledFilter !== "all" && o.handledBy !== handledFilter) return false;
    
    // Status
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    
    // Courier
    if (courierFilter !== "all" && o.courier !== courierFilter) return false;
    
    // COD Status
    if (codStatusFilter !== "all" && o.codStatus !== codStatusFilter) return false;
    
    // Date
    const orderDate = new Date(o.date);
    const today = new Date("2026-06-20");
    if (dateFilter === "today") {
      if (o.date !== "2026-06-20") return false;
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      if (orderDate < oneWeekAgo || orderDate > today) return false;
    } else if (dateFilter === "month") {
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      if (orderDate < oneMonthAgo || orderDate > today) return false;
    } else if (dateFilter === "year") {
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      if (orderDate < oneYearAgo || orderDate > today) return false;
    } else if (dateFilter === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate);
        if (orderDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        if (orderDate > end) return false;
      }
    }
    return true;
  });

  const handleVoidConfirm = () => {
    if (pin !== "1234") { setPinError(true); return; }
    if (voidModal) {
      onVoidOrder(voidModal, "Sami"); // Default void performer
    }
    setVoidModal(null); setPin(""); setVoidReason(""); setPinError(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#0F172A]">Orders</h1>
        <Btn onClick={() => setScreen("create-order")}><Plus size={14} /> New Order</Btn>
      </div>

      {/* Date tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {["today", "week", "month", "year", "custom"].map(f => (
          <button key={f} onClick={() => setDateFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
              dateFilter === f ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {f === "custom" ? "Custom Date" : f}
          </button>
        ))}
      </div>

      {dateFilter === "custom" && (
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-lg w-fit">
          <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0F172A]" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0F172A]" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={handledFilter} onChange={e => setHandledFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]">
          <option value="all">All Staff</option>
          <option value="Sami">Sami</option>
          <option value="Abid">Abid</option>
        </select>
        
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="returned">Returned</option>
          <option value="void">Void</option>
        </select>

        <select value={courierFilter} onChange={e => setCourierFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]">
          <option value="all">All Couriers</option>
          {["TCS","PostEx","Leopard","M&P","Other"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={codStatusFilter} onChange={e => setCODStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]">
          <option value="all">All COD Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in">
          <span className="text-xs font-semibold text-slate-700">{selectedIds.size} orders selected</span>
          <Btn size="sm" onClick={() => setBulkPrintOpen(true)}><Printer size={12} /> Print Selected Labels</Btn>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
          <span className="text-xs text-slate-400 font-medium">{filtered.length} orders</span>
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors">
            <Download size={12} /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 w-10 text-left">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filtered.map(o => o.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-slate-300 accent-[#0F172A]" />
                </th>
                <th className="text-left px-4 py-3">Order No</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">WhatsApp</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">By</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(o => {
                const status = o.status;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3 w-10">
                      <input type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(o.id);
                          else next.delete(o.id);
                          setSelectedIds(next);
                        }}
                        className="rounded border-slate-300 accent-[#0F172A]" />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs text-[#0F172A]">{o.customer}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">{o.whatsapp}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#0F172A]">{formatPKR(o.amount)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium",
                        o.handledBy === "Sami" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                      )}>{o.handledBy}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">{o.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onViewOrder(o.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="View">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => onEditOrder(o.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setPrintOrderId(o.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Print">
                          <Printer size={13} />
                        </button>
                        {status !== "void" && (
                          <button onClick={() => setVoidModal(o.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="Void">
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Modal */}
      <Modal open={!!voidModal} onClose={() => { setVoidModal(null); setPin(""); setPinError(false); }} title="Void Order">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            This action requires Owner PIN and cannot be undone.
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Enter Owner PIN</label>
            <input
              type="password" maxLength={4} value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              placeholder="••••"
              className={cn(
                "w-full px-3 py-3 text-center text-2xl tracking-widest border rounded-lg font-mono focus:outline-none focus:ring-2 transition-colors",
                pinError
                  ? "border-red-300 focus:ring-red-200 bg-red-50"
                  : "border-slate-200 focus:ring-[#0F172A]/20 focus:border-[#0F172A]"
              )}
            />
            {pinError && <p className="text-xs text-red-500 mt-1">Incorrect PIN. Try again.</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Reason</label>
            <div className="space-y-2">
              {["Duplicate Entry", "Wrong Customer", "Customer Cancelled", "Test Entry", "Other"].map(r => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="voidReason" value={r} checked={voidReason === r}
                    onChange={() => setVoidReason(r)} className="w-4 h-4 accent-[#0F172A]" />
                  <span className="text-sm text-slate-600">{r}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Btn variant="danger" className="flex-1" onClick={handleVoidConfirm} disabled={pin.length < 4 || !voidReason}>
              <Ban size={13} /> Confirm Void
            </Btn>
            <Btn variant="secondary" onClick={() => { setVoidModal(null); setPin(""); setPinError(false); }}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      {/* Single Print Modal */}
      <Modal open={!!printOrderId} onClose={() => setPrintOrderId(null)} title="Parcel Label Preview">
        {(() => {
          const o = orders.find(item => item.id === printOrderId);
          if (!o) return null;
          return (
            <>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs">
                <div className="text-center mb-3 pb-3 border-b border-slate-200">
                  <div className="text-base font-bold text-[#0F172A]">HK FABRIC</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Bedsheets & Home Textiles</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
                  <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="font-bold text-sm">COD:</span>
                    <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(o.amount)}</span>
                  </div>
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">QR Code</div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Btn className="flex-1" onClick={() => setPrintOrderId(null)}>
                  <Printer size={14} /> Print Label
                </Btn>
                <Btn variant="secondary" onClick={() => setPrintOrderId(null)}>Cancel</Btn>
              </div>
            </>
          );
        })()}
      </Modal>

      {/* Bulk Print Modal */}
      <Modal open={bulkPrintOpen} onClose={() => setBulkPrintOpen(false)} title={`Bulk Print Labels (${selectedIds.size} orders)`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
          {Array.from(selectedIds).map(id => {
            const o = orders.find(item => item.id === id);
            if (!o) return null;
            return (
              <div key={o.id} className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs mb-4">
                <div className="text-center mb-3 pb-3 border-b border-slate-200">
                  <div className="text-base font-bold text-[#0F172A]">HK FABRIC</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Bedsheets & Home Textiles</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
                  <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="font-bold text-sm">COD:</span>
                    <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(o.amount)}</span>
                  </div>
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">QR Code</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-4">
          <Btn className="flex-1" onClick={() => {
            setBulkPrintOpen(false);
            setSelectedIds(new Set());
          }}>
            <Printer size={14} /> Print All
          </Btn>
          <Btn variant="secondary" onClick={() => setBulkPrintOpen(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Order Detail Screen ──────────────────────────────────────────────────────

function OrderDetailScreen({ orderId, setScreen, orders }: { orderId: string | null; setScreen: (s: Screen) => void; orders: Order[] }) {
  const o = orders.find(order => order.id === orderId);
  const [showPrint, setShowPrint] = useState(false);
  if (!o) return null;

  const timeline = [
    { label: "Order Created", date: o.date, done: true },
    { label: "Label Printed", date: o.date, done: true },
    { label: "Tracking Added", date: o.trackingNo ? o.date : null, done: !!o.trackingNo },
    { label: "Delivered", date: o.status === "delivered" ? o.date : null, done: o.status === "delivered" },
    { label: "COD Received", date: o.codStatus === "received" ? o.date : null, done: o.codStatus === "received" },
  ];

  return (
    <div className="space-y-5 max-w-4xl pb-8">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setScreen("orders")} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
          <ArrowLeft size={17} className="text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#0F172A] font-mono">{o.id}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{o.date} · Handled by {o.handledBy}</p>
        </div>
        <StatusBadge status={o.status} />
        <Btn size="sm" variant="secondary" onClick={() => setShowPrint(true)}><Printer size={13} /> Print Label</Btn>
      </div>

      {/* Label Print Modal */}
      <Modal open={showPrint} onClose={() => setShowPrint(false)} title="Parcel Label Preview">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs">
          <div className="text-center mb-3 pb-3 border-b border-slate-200">
            <div className="text-base font-bold text-[#0F172A]">HK FABRIC</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bedsheets & Home Textiles</div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
            <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-sm">COD:</span>
              <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(o.amount)}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">QR Code</div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Btn className="flex-1" onClick={() => setShowPrint(false)}>
            <Printer size={14} /> Print Label
          </Btn>
          <Btn variant="secondary" onClick={() => setShowPrint(false)}>Cancel</Btn>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <User size={14} /> Customer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Name", o.customer],
                ["WhatsApp", o.whatsapp],
                ["City", o.city],
                ["Address", o.address],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
                  <div className={cn("text-[#0F172A] text-sm", label === "WhatsApp" ? "font-mono" : "font-medium")}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Package size={14} /> Products</h3>
            <div className="space-y-1">
              {o.products.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-[#0F172A]">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Qty: {p.qty} × {formatPKR(p.price)}</div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[#0F172A]">{formatPKR(p.qty * p.price)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 font-semibold">
                <span className="text-sm text-slate-600">Grand Total</span>
                <span className="font-mono text-[#D4AF37] text-lg">{formatPKR(o.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Tracking */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2"><Truck size={14} /> Tracking</h3>
            {o.trackingNo ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Courier</div>
                  <div className="font-semibold text-[#0F172A]">{o.courier}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Tracking No</div>
                  <div className="font-mono text-[#0F172A] text-xs bg-slate-50 px-2 py-1.5 rounded">{o.trackingNo}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock size={24} className="mx-auto mb-2 text-slate-300" />
                <div className="text-xs text-slate-400">No tracking added yet</div>
              </div>
            )}
          </div>

          {/* COD */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2"><Banknote size={14} /> COD</h3>
            <div className="space-y-3 text-sm">
              <div><div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Type</div><div className="font-semibold text-[#0F172A]">{o.type}</div></div>
              <div><div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Amount</div><div className="font-mono font-bold text-[#D4AF37] text-base">{formatPKR(o.amount)}</div></div>
              <div><div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Status</div><StatusBadge status={o.codStatus} /></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Timeline</h3>
            <div className="space-y-3">
              {timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                    step.done ? "bg-green-100" : "bg-slate-100"
                  )}>
                    {step.done
                      ? <Check size={11} className="text-green-600" />
                      : <div className="w-2 h-2 rounded-full bg-slate-300" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className={cn("text-sm font-medium", step.done ? "text-[#0F172A]" : "text-slate-400")}>{step.label}</div>
                    {step.date && <div className="text-xs text-slate-400 mt-0.5">{step.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tracking Screen ──────────────────────────────────────────────────────────

function TrackingScreen({ orders, onSaveTracking }: { orders: Order[]; onSaveTracking: (id: string, courier: string, no: string) => void }) {
  const [tab, setTab] = useState<"awaiting" | "added">("awaiting");
  const [inputs, setInputs] = useState<Record<string, { courier: string; no: string }>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const awaiting = orders.filter(o => !o.trackingNo && o.status !== "void" && !saved.has(o.id));
  const added = [...orders.filter(o => !!o.trackingNo), ...orders.filter(o => saved.has(o.id))];

  const set = (id: string, field: string, val: string) =>
    setInputs(prev => ({ ...prev, [id]: { courier: prev[id]?.courier || "", no: prev[id]?.no || "", [field]: val } }));

  const handleSave = (id: string) => {
    const data = inputs[id];
    if (data?.courier && data?.no) {
      onSaveTracking(id, data.courier, data.no);
      setSaved(prev => new Set([...prev, id]));
      setInputs(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0F172A]">Tracking</h1>

      <div className="flex gap-1 border-b border-slate-100">
        {[
          { id: "awaiting", label: `Awaiting Tracking (${awaiting.length})` },
          { id: "added", label: `Tracking Added (${added.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-[#0F172A] text-[#0F172A]" : "border-transparent text-slate-500 hover:text-slate-700"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "awaiting" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {awaiting.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
              <div className="text-sm text-slate-400">All orders have tracking numbers ✓</div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Order No</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">Amount</th>
                      <th className="text-left px-4 py-3 w-36">Courier</th>
                      <th className="text-left px-4 py-3">Tracking No</th>
                      <th className="text-left px-4 py-3 w-40">Receipt Upload</th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {awaiting.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-xs text-[#0F172A]">{o.customer}</div>
                          <div className="text-[11px] text-slate-400">{o.city}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-right hidden md:table-cell">{formatPKR(o.amount)}</td>
                        <td className="px-4 py-3">
                          <select value={inputs[o.id]?.courier || ""}
                            onChange={e => set(o.id, "courier", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20">
                            <option value="">Select</option>
                            {["TCS","PostEx","Leopard","M&P","Other"].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input value={inputs[o.id]?.no || ""}
                            onChange={e => set(o.id, "no", e.target.value)}
                            placeholder="Enter tracking number"
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="file" accept="image/*"
                            onChange={() => set(o.id, "receiptUploaded", "true")}
                            className="w-full text-[11px] text-slate-500 file:mr-1 file:py-1 file:px-1.5 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700" />
                        </td>
                        <td className="px-4 py-3">
                          <Btn size="sm"
                            disabled={!inputs[o.id]?.courier || !inputs[o.id]?.no}
                            onClick={() => handleSave(o.id)}>
                            <Save size={12} /> Save
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4 bg-slate-50">
                {awaiting.map(o => (
                  <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-mono text-xs font-semibold text-[#0F172A]">{o.id}</span>
                      <span className="font-mono text-xs font-semibold text-[#D4AF37]">{formatPKR(o.amount)}</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div><span className="text-slate-400 font-medium">Customer:</span> <span className="text-slate-800 font-medium">{o.customer}</span></div>
                      <div><span className="text-slate-400 font-medium">Address:</span> <span className="text-slate-600">{o.city}, {o.address}</span></div>
                    </div>
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Courier</label>
                        <select value={inputs[o.id]?.courier || ""}
                          onChange={e => set(o.id, "courier", e.target.value)}
                          className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 bg-white">
                          <option value="">Select Courier</option>
                          {["TCS","PostEx","Leopard","M&P","Other"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Tracking Number</label>
                        <input value={inputs[o.id]?.no || ""}
                          onChange={e => set(o.id, "no", e.target.value)}
                          placeholder="Enter tracking number"
                          className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono bg-white" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Receipt Upload</label>
                        <input type="file" accept="image/*"
                          onChange={() => set(o.id, "receiptUploaded", "true")}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                      </div>
                      <Btn size="md" className="w-full justify-center mt-2"
                        disabled={!inputs[o.id]?.courier || !inputs[o.id]?.no}
                        onClick={() => handleSave(o.id)}>
                        <Save size={12} /> Save Tracking
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "added" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Order No</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Courier</th>
                  <th className="text-left px-4 py-3">Tracking No</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {added.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs text-[#0F172A]">{o.customer}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{o.courier || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.trackingNo || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-right hidden md:table-cell">{formatPKR(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COD Screen ────────────────────────────────────────────────────────────────

function CODScreen({ orders, onReceiveCOD }: { orders: Order[]; onReceiveCOD: (id: string, date: string) => void }) {
  const [receiveModal, setReceiveModal] = useState<string | null>(null);
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [recDate, setRecDate] = useState("2026-06-20");
  const [receivedIds, setReceivedIds] = useState<Set<string>>(new Set());

  const pending = orders.filter(o => o.codStatus === "pending" && o.status === "delivered" && !receivedIds.has(o.id));
  const receivedList = orders.filter(o => o.codStatus === "received" || receivedIds.has(o.id));
  const pendingAmt = pending.reduce((a, b) => a + b.amount, 0);
  const receivedAmt = receivedList.reduce((a, b) => a + b.amount, 0);
  const totalCOD = orders.filter(o => o.type === "COD").reduce((a, b) => a + b.amount, 0);
  const selectedOrder = orders.find(o => o.id === receiveModal);

  const handleReceive = () => {
    if (receiveModal) {
      onReceiveCOD(receiveModal, recDate);
      setReceivedIds(prev => new Set([...prev, receiveModal]));
    }
    setReceiveModal(null); setRefNo(""); setNotes("");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0F172A]">COD Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Pending COD</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{formatPKR(pendingAmt)}</div>
          <div className="text-xs text-slate-400 mt-1.5">{pending.length} orders waiting</div>
        </div>
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Received COD</div>
          <div className="text-2xl font-bold font-mono text-green-600">{formatPKR(receivedAmt)}</div>
          <div className="text-xs text-slate-400 mt-1.5">{receivedList.length} orders received</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Total COD</div>
          <div className="text-2xl font-bold font-mono text-[#0F172A]">{formatPKR(totalCOD)}</div>
          <div className="text-xs text-slate-400 mt-1.5">All COD orders</div>
        </div>
      </div>

      {/* Pending table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-[#0F172A]">Pending COD — Awaiting Receipt</h2>
        </div>
        {pending.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
            <div className="text-sm text-slate-400">All COD received!</div>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Order No</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Tracking</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Courier</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pending.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-[#0F172A]">{o.customer}</div>
                        <div className="text-[11px] text-slate-400">{o.city}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 hidden md:table-cell">{o.trackingNo || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0F172A]">{formatPKR(o.amount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{o.courier || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.codStatus} /></td>
                      <td className="px-5 py-3 text-right">
                        <Btn size="sm" onClick={() => setReceiveModal(o.id)}>
                          <Banknote size={12} /> Receive
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4 p-4 bg-slate-50">
              {pending.map(o => (
                <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-mono text-xs font-semibold text-[#0F172A]">{o.id}</span>
                    <StatusBadge status={o.codStatus} />
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div><span className="text-slate-400 font-medium">Customer:</span> {o.customer} ({o.city})</div>
                    {o.courier && <div><span className="text-slate-400 font-medium">Courier:</span> {o.courier}</div>}
                    {o.trackingNo && <div><span className="text-slate-400 font-medium">Tracking:</span> <span className="font-mono">{o.trackingNo}</span></div>}
                    <div className="pt-1"><span className="text-slate-400 font-medium">Amount:</span> <span className="font-mono font-bold text-[#D4AF37]">{formatPKR(o.amount)}</span></div>
                  </div>
                  <Btn size="sm" className="w-full justify-center mt-2.5" onClick={() => setReceiveModal(o.id)}>
                    <Banknote size={12} /> Receive COD
                  </Btn>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Received table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-[#0F172A]">Received COD</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Order No</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Courier</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {receivedList.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{o.id}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{o.customer}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#0F172A]">{formatPKR(o.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{o.courier || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status="received" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      <Modal open={!!receiveModal} onClose={() => setReceiveModal(null)} title="Receive COD">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-lg space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order</span>
                <span className="font-mono font-semibold text-[#0F172A] text-xs">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium">{selectedOrder.customer}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                <span className="font-semibold">COD Amount</span>
                <span className="font-mono font-bold text-[#D4AF37] text-base">{formatPKR(selectedOrder.amount)}</span>
              </div>
            </div>
            <FieldInput label="Reference Number" value={refNo} onChange={e => setRefNo(e.target.value)}
              placeholder="Bank transfer / slip reference" className="font-mono" />
            <FieldInput label="Received Date" type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 resize-none" />
            </div>
            <div className="flex gap-3">
              <Btn className="flex-1" onClick={handleReceive}>
                <Check size={14} /> Mark as Received
              </Btn>
              <Btn variant="secondary" onClick={() => setReceiveModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Settlements Screen ───────────────────────────────────────────────────────

function SettlementsScreen() {
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const preview = [
    { tracking: "TCS567890123", amount: 7100, matched: "HKF-2026-000142", status: "matched" },
    { tracking: "PEX234567890", amount: 12500, matched: "HKF-2026-000140", status: "matched" },
    { tracking: "MNP901234567", amount: 5600, matched: "HKF-2026-000143", status: "pending" },
    { tracking: "LEP999000111", amount: 3200, matched: null, status: "unmatched" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0F172A]">Settlements</h1>

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
          dragOver ? "border-[#0F172A] bg-slate-50" : "border-slate-200 hover:border-slate-300 bg-white"
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={() => { setDragOver(false); setUploaded(true); }}
        onClick={() => setUploaded(true)}
      >
        <Upload size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Upload Settlement File</p>
        <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) or CSV — drag & drop or click to browse</p>
        <div className="flex gap-2 justify-center mt-4">
          <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Excel</span>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">CSV</span>
        </div>
      </div>

      {uploaded && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A]">Settlement Preview</h2>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">3 matched</span>
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded">1 unmatched</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Tracking No</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Matched Order</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.map((row, i) => (
                    <tr key={i} className={cn("hover:bg-slate-50/50", row.status === "unmatched" && "bg-red-50/30")}>
                      <td className="px-5 py-3 font-mono text-xs text-[#0F172A]">{row.tracking}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{formatPKR(row.amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.matched || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
                          row.status === "matched" ? "bg-green-50 text-green-700" :
                          row.status === "pending" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        )}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-3">
            <Btn><Check size={13} /> Approve Settlement</Btn>
            <Btn variant="danger"><X size={13} /> Reject Settlement</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Reports Screen ────────────────────────────────────────────────────────────

function ReportsScreen({ orders }: { orders: Order[] }) {
  const [period, setPeriod] = useState("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredOrders = orders.filter(o => {
    if (period === "daily") {
      return o.date === "2026-06-20";
    } else if (period === "weekly") {
      const orderDate = new Date(o.date);
      const limit = new Date("2026-06-20");
      limit.setDate(limit.getDate() - 7);
      return orderDate >= limit;
    } else if (period === "monthly") {
      const orderDate = new Date(o.date);
      const limit = new Date("2026-06-20");
      limit.setMonth(limit.getMonth() - 1);
      return orderDate >= limit;
    } else if (period === "yearly") {
      const orderDate = new Date(o.date);
      const limit = new Date("2026-06-20");
      limit.setFullYear(limit.getFullYear() - 1);
      return orderDate >= limit;
    } else if (period === "custom") {
      const orderDate = new Date(o.date);
      if (startDate) {
        if (orderDate < new Date(startDate)) return false;
      }
      if (endDate) {
        if (orderDate > new Date(endDate)) return false;
      }
      return true;
    }
    return true;
  });

  const totalRevenue = filteredOrders.filter(o => o.status !== "void").reduce((a, b) => a + b.amount, 0);
  const codCollected = filteredOrders.filter(o => o.codStatus === "received").reduce((a, b) => a + b.amount, 0);
  const returnsCount = filteredOrders.filter(o => o.status === "returned").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#0F172A]">Reports</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
            {["daily","weekly","monthly","yearly","custom"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                  period === p ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}>
                {p === "custom" ? "Custom" : p}
              </button>
            ))}
          </div>
          <Btn size="sm" variant="secondary"><Download size={12} /> PDF</Btn>
          <Btn size="sm" variant="secondary"><Download size={12} /> Excel</Btn>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-lg w-fit animate-fade-in">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0F172A]" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0F172A]" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: filteredOrders.length, trend: "+12%", up: true },
          { label: "Revenue", value: formatPKR(totalRevenue), trend: "+8%", up: true },
          { label: "COD Collected", value: formatPKR(codCollected), trend: "+15%", up: true },
          { label: "Returns", value: returnsCount, trend: "-2 orders", up: false },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">{c.label}</div>
            <div className="text-xl font-bold font-mono text-[#0F172A]">{c.value}</div>
            <div className={cn("text-xs font-medium mt-1.5", c.up ? "text-green-600" : "text-red-500")}>
              {c.up ? "↑" : "↓"} {c.trend} vs last period
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 col-span-1">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Daily Orders</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="orders" fill="#0F172A" radius={[3, 3, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 col-span-1">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Revenue vs COD</h3>
          <div className="flex gap-4 mb-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#0F172A] inline-block rounded" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#D4AF37] inline-block rounded" /> COD</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rG2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cG2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v: number) => [formatPKR(v)]} />
              <Area type="monotone" dataKey="revenue" stroke="#0F172A" strokeWidth={2} fill="url(#rG2)" dot={false} name="Revenue" />
              <Area type="monotone" dataKey="cod" stroke="#D4AF37" strokeWidth={2} fill="url(#cG2)" dot={false} name="COD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 col-span-1">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Returns Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { day: "Mon", returns: 0 },
              { day: "Tue", returns: 1 },
              { day: "Wed", returns: 0 },
              { day: "Thu", returns: 2 },
              { day: "Fri", returns: 0 },
              { day: "Sat", returns: 1 },
              { day: "Sun", returns: 0 },
            ]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="returns" fill="#EF4444" radius={[3, 3, 0, 0]} name="Returns" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Log Screen ──────────────────────────────────────────────────────

function ActivityLogScreen({ activityLogs }: { activityLogs: typeof ACTIVITY_DATA }) {
  const actionColor: Record<string, string> = {
    "Create Order": "bg-blue-50 text-blue-700",
    "Update Order": "bg-orange-50 text-orange-700",
    "COD Received": "bg-green-50 text-green-700",
    "Void Order": "bg-red-50 text-red-600",
    "Print Label": "bg-purple-50 text-purple-700",
    "Tracking Added": "bg-indigo-50 text-indigo-700",
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0F172A]">Activity Log</h1>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-slate-50/70 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activityLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-500">{log.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.time}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", actionColor[log.action] || "bg-slate-100 text-slate-600")}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#0F172A]">{log.order}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                      log.by === "Sami" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                    )}>{log.by}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen() {
  const [shopName, setShopName] = useState("HK Fabric");
  const [pin, setPin] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5 max-w-lg pb-8">
      <h1 className="text-xl font-bold text-[#0F172A]">Settings</h1>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Shop Information</h3>
        <div className="space-y-4">
          <FieldInput label="Shop Name" value={shopName} onChange={e => setShopName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Shop Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#0F172A] rounded-xl flex items-center justify-center flex-shrink-0">
                <Layers size={20} className="text-[#D4AF37]" />
              </div>
              <Btn size="sm" variant="secondary"><Upload size={12} /> Upload Logo</Btn>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Owner PIN</h3>
        <div className="space-y-4">
          {[
            { label: "Current PIN", key: "current" as const },
            { label: "New PIN", key: "next" as const },
            { label: "Confirm New PIN", key: "confirm" as const },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{field.label}</label>
              <input
                type="password" maxLength={4} value={pin[field.key]}
                onChange={e => setPin(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="••••"
                className="w-full px-3 py-3 text-center text-2xl tracking-widest border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <Btn size="lg" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}>
        {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Settings</>}
      </Btn>
    </div>
  );
}

// ─── Daily Closing Screen ─────────────────────────────────────────────────────

function DailyClosingScreen({ orders }: { orders: Order[] }) {
  const today = "2026-06-20";
  const todayOrders = orders.filter(o => o.date === today);
  const salesToday = todayOrders.filter(o => o.status !== "void").reduce((a, b) => a + b.amount, 0);
  const deliveredToday = todayOrders.filter(o => o.status === "delivered").length;
  
  const pendingTracking = orders.filter(o => !o.trackingNo && o.status !== "void").length;
  const pendingCOD = orders.filter(o => o.codStatus === "pending" && o.status === "delivered").length;
  const receivedCOD = orders.filter(o => o.codStatus === "received").length;
  const voidOrders = orders.filter(o => o.status === "void").length;

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [closed, setClosed] = useState(false);

  const handleCloseDay = () => {
    if (pin !== "1234") {
      setPinError(true);
      return;
    }
    setPinError(false);
    setClosed(true);
  };

  return (
    <div className="space-y-5 max-w-xl animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Daily Closing</h1>
        <p className="text-xs text-slate-400 mt-0.5">Generate and review closing figures for today ({today})</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#0F172A] border-b border-slate-50 pb-3 flex items-center justify-between">
          <span>Closing Figures Summary</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono font-medium">{today}</span>
        </h2>

        <div className="space-y-3">
          {[
            { label: "Orders Today", value: todayOrders.length, color: "text-[#0F172A]" },
            { label: "Sales Today", value: formatPKR(salesToday), color: "text-[#D4AF37]" },
            { label: "Delivered Today", value: deliveredToday, color: "text-green-600" },
            { label: "Pending Tracking (All Time)", value: pendingTracking, color: "text-amber-600" },
            { label: "Pending COD (All Time)", value: pendingCOD, color: "text-orange-600" },
            { label: "Received COD (All Time)", value: receivedCOD, color: "text-green-700" },
            { label: "Void Orders (All Time)", value: voidOrders, color: "text-red-500" },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-slate-500 font-medium">{item.label}</span>
              <span className={cn("font-bold font-mono", item.color)}>{item.value}</span>
            </div>
          ))}
        </div>

        {closed ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center space-y-2">
            <CheckCircle2 size={24} className="text-green-600 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-green-800">Day Successfully Closed!</h3>
            <p className="text-xs text-green-700">Closing figures logged in system archives. Daily report sent to owners.</p>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Enter Owner PIN to Lock Closing</label>
              <input
                type="password" maxLength={4} value={pin}
                onChange={e => { setPin(e.target.value); setPinError(false); }}
                placeholder="••••"
                className={cn(
                  "w-full px-3 py-2 text-center text-xl tracking-widest border rounded-lg font-mono focus:outline-none focus:ring-2",
                  pinError
                    ? "border-red-300 focus:ring-red-200 bg-red-50"
                    : "border-slate-200 focus:ring-[#0F172A]/20 focus:border-[#0F172A]"
                )}
              />
              {pinError && <p className="text-[11px] text-red-500 mt-1">Incorrect Owner PIN</p>}
            </div>
            <Btn size="lg" className="w-full justify-center" onClick={handleCloseDay} disabled={pin.length < 4}>
              <Check size={14} /> Approve & Close Day
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [activityLogs, setActivityLogs] = useState<typeof ACTIVITY_DATA>(ACTIVITY_DATA);

  const handleViewOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("order-detail");
  };

  const handleEditOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("create-order");
  };

  const handleSaveOrder = (newOrder: Order) => {
    let action = "Create Order";
    setOrders(prev => {
      const idx = prev.findIndex(o => o.id === newOrder.id);
      if (idx > -1) {
        action = "Update Order";
        const updated = [...prev];
        updated[idx] = newOrder;
        return updated;
      }
      return [newOrder, ...prev];
    });

    const newLog = {
      id: Date.now(),
      date: "2026-06-20",
      time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      action,
      order: newOrder.id,
      by: newOrder.handledBy
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleVoidOrder = (orderId: string, performer: "Sami" | "Abid") => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "void" } : o));

    const newLog = {
      id: Date.now(),
      date: "2026-06-20",
      time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      action: "Void Order",
      order: orderId,
      by: performer
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleSaveTracking = (orderId: string, courier: string, trackingNo: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courier, trackingNo, status: "shipped" } : o));

    const newLog = {
      id: Date.now(),
      date: "2026-06-20",
      time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      action: "Tracking Added",
      order: orderId,
      by: "Sami"
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleReceiveCOD = (orderId: string, date: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, codStatus: "received", status: "delivered", receivedDate: date } : o));

    const newLog = {
      id: Date.now(),
      date: "2026-06-20",
      time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      action: "COD Received",
      order: orderId,
      by: "Sami"
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setSidebarOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar
        screen={screen}
        setScreen={s => { setScreen(s); setSidebarOpen(false); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {screen === "dashboard" && (
            <DashboardScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              orders={orders}
            />
          )}
          {screen === "create-order" && (
            <CreateOrderScreen
              setScreen={setScreen}
              orders={orders}
              onSaveOrder={handleSaveOrder}
              editOrderId={selectedOrderId}
              clearEditId={() => setSelectedOrderId(null)}
            />
          )}
          {screen === "orders" && (
            <OrdersScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
              orders={orders}
              onVoidOrder={handleVoidOrder}
            />
          )}
          {screen === "order-detail" && <OrderDetailScreen orderId={selectedOrderId} setScreen={setScreen} orders={orders} />}
          {screen === "tracking" && <TrackingScreen orders={orders} onSaveTracking={handleSaveTracking} />}
          {screen === "cod" && <CODScreen orders={orders} onReceiveCOD={handleReceiveCOD} />}
          {screen === "settlements" && <SettlementsScreen />}
          {screen === "reports" && <ReportsScreen orders={orders} />}
          {screen === "daily-closing" && <DailyClosingScreen orders={orders} />}
          {screen === "activity-log" && <ActivityLogScreen activityLogs={activityLogs} />}
          {screen === "settings" && <SettingsScreen />}
        </main>
      </div>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        setScreen={setScreen}
        setSelectedOrderId={setSelectedOrderId}
        orders={orders}
      />
    </div>
  );
}
