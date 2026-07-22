"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ElementType } from "react";
import {
  LayoutDashboard, Plus, Package, Truck, Banknote, Receipt,
  BarChart2, ClipboardList, Settings, Search, Bell, Menu, X,
  Eye, Edit2, Printer, Ban, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Upload, Download, User, Save, ArrowLeft, Check,
  AlertCircle, ChevronRight, Layers, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import Tesseract from "tesseract.js";

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
  courier?: string; trackingNo?: string; trackingNo2?: string; products: Product[];
  notes?: string; type: "COD" | "NON-COD";
  province?: string;
  deliveryCharges?: number;
  receivedDate?: string;
  receiptUrl?: string;
  advancePayment?: number;
  paymentType?: "Online" | "Courier";
}

// ─── Mock Data & Constants ──────────────────────────────────────────────────────
const PROVINCE_CITIES: Record<string, string[]> = {
  "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sargodha", "Bahawalpur", "Sialkot", "Sheikhupura", "Rahim Yar Khan", "Jhang", "Dera Ghazi Khan", "Gujrat", "Sahiwal", "Kasur", "Okara", "Chiniot", "Kamoke", "Hafizabad", "Sadiqabad", "Burewala", "Muzaffargarh", "Khanpur", "Gojra", "Bahawalnagar", "Muridke", "Pakpattan", "Jaranwala", "Chishtian", "Daska", "Mandi Bahauddin", "Ahmadpur East", "Kamalia", "Vehari", "Wazirabad", "Khushab", "Chakwal", "Mianwali", "Kot Adu"].sort(),
  "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas", "Jacobabad", "Shikarpur", "Tando Adam", "Khairpur", "Dadu", "Tando Allahyar", "Kotri", "Thatta", "Badin", "Ghotki", "Kashmore", "Umerkot", "Matiari"].sort(),
  "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Mingora", "Kohat", "Abbottabad", "Dera Ismail Khan", "Nowshera", "Charsadda", "Swabi", "Mansehra", "Bannu", "Timargara", "Haripur", "Swat", "Chitral"].sort(),
  "Balochistan": ["Quetta", "Turbat", "Khuzdar", "Hub", "Chaman", "Gwadar", "Dera Murad Jamali", "Sibi", "Zhob", "Loralai"].sort(),
  "Azad Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber", "Bagh", "Sudhanoti"].sort(),
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza", "Chilas", "Gahkuch", "Aliabad", "Shigar", "Khaplu"].sort(),
  "Islamabad Capital Territory": ["Islamabad"]
};
const PROVINCES = Object.keys(PROVINCE_CITIES);

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
    pending: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    processing: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    shipped: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    returned: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
    void: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-500/20",
    received: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  };
  const labels: Record<string, string> = {
    pending: "Pending", processing: "Processing", shipped: "Shipped",
    delivered: "Delivered", returned: "Returned", void: "Void", received: "Received",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-[2px] rounded-md text-[11px] font-medium tracking-wide", map[status])}>
      {labels[status]}
    </span>
  );
}

function Btn({
  children, variant = "primary", size = "md", onClick, className, disabled, type = "button", title,
}: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; onClick?: () => void; className?: string;
  disabled?: boolean; type?: "button" | "submit"; title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-[#0F172A] text-white shadow-sm hover:bg-[#1E293B] focus-visible:outline-[#0F172A]",
    secondary: "bg-white text-[#0F172A] shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
  };
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-2.5 text-sm" };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cn(base, v[variant], s[size], className)}>
      {children}
    </button>
  );
}

function FieldInput({ label, required, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        {...props}
        className={cn(
          "block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0F172A] sm:text-sm sm:leading-6 transition-all duration-200",
          props.className
        )}
      />
    </div>
  );
}

function FieldSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        {...props}
        className={cn(
          "block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-[#0F172A] sm:text-sm sm:leading-6 transition-all duration-200 bg-white",
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md mx-auto max-h-[90vh] flex flex-col transform transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-[#0F172A] tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon, priority = "secondary" }: {
  label: string; value: string | number; sub?: string; color?: string; icon: ElementType;
  priority?: "primary" | "secondary" | "tertiary";
}) {
  const pStyles = {
    primary: "p-6",
    secondary: "p-4 sm:p-5",
    tertiary: "p-4 sm:p-5 opacity-80 bg-slate-50 border-transparent",
  };
  const valStyles = {
    primary: "text-3xl font-semibold tracking-tight text-[#0F172A]",
    secondary: "text-2xl font-semibold tracking-tight text-[#0F172A]",
    tertiary: "text-xl font-medium tracking-tight text-slate-500",
  };
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 sm:gap-4 transition-all duration-200 hover:border-slate-300", pStyles[priority])}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium tracking-wider uppercase", priority === "tertiary" ? "text-slate-400" : "text-slate-500")}>{label}</span>
        {priority !== "tertiary" && color && (
          <div className={cn("p-1.5 rounded-md shadow-sm ring-1 ring-inset ring-black/5", color)}>
            <Icon size={14} />
          </div>
        )}
      </div>
      <div>
        <div className={cn("font-mono leading-none", valStyles[priority])}>{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-2 font-medium">{sub}</div>}
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
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center gap-3 p-6 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
          <Layers size={16} className="text-black" />
        </div>
        <div>
          <div className="font-semibold text-white text-[15px] tracking-tight leading-tight">HK Fabric</div>
          <div className="text-[11px] text-white/60 mt-0.5 font-medium tracking-wide">COURIER SYSTEM</div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = screen === id || (screen === "order-detail" && id === "orders");
          return (
            <button
              key={id}
              onClick={() => go(id as Screen)}
              className={cn(
                "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                active 
                  ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/[0.05]" 
                  : "text-white/70 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              {active && <span className="absolute left-0 inset-y-2 w-[3px] bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
              <Icon size={16} strokeWidth={active ? 2.5 : 2} className={cn(
                "transition-colors",
                active ? "text-white" : "text-white/50 group-hover:text-white/80"
              )} />
              <span className={cn("tracking-wide", active && "font-semibold")}>{label}</span>
              {id === "create-order" && (
                <span className="ml-auto w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus size={10} className="text-black" />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
            <User size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">Sami / Abid</div>
            <div className="text-[11px] text-white/60 font-medium">Staff Account</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex lg:flex-col w-60 flex-shrink-0 print:hidden">{inner}</div>
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
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time ? time.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  const timeStr = time ? time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0 z-30 sticky top-0 print:hidden">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2 flex-shrink-0 lg:hidden mr-1">
        <div className="w-8 h-8 bg-[#0F172A] rounded-md flex items-center justify-center shadow-sm">
          <Layers size={14} className="text-[#D4AF37]" />
        </div>
        <span className="font-semibold text-[#0F172A] text-sm hidden sm:inline tracking-tight">HK Fabric</span>
      </div>

      <button
        onClick={onSearchClick}
        className="flex-1 max-w-md flex items-center gap-2 px-3 py-2 bg-slate-50/50 hover:bg-slate-100 border-0 rounded-md text-sm text-slate-500 transition-colors shadow-sm ring-1 ring-inset ring-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
      >
        <Search size={16} className="text-slate-400" />
        <span className="hidden sm:inline">Search orders, customers...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="hidden lg:inline-flex ml-auto text-[10px] font-medium font-mono bg-white border border-slate-200 text-slate-400 rounded-sm px-1.5 py-0.5 leading-none shadow-sm">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 mr-2">
          <a 
            href="https://postextracking.com.pk/" 
            target="_blank" 
            rel="noreferrer" 
            className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition-colors border border-indigo-100 shadow-sm"
          >
            PostEx Tracking
          </a>
          <a 
            href="https://ep.gov.pk/track.asp" 
            target="_blank" 
            rel="noreferrer" 
            className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md transition-colors border border-emerald-100 shadow-sm"
          >
            Pak Post Tracking
          </a>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 sm:pt-24">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => { onClose(); setQ(""); }} />
      <div className="relative bg-white rounded-xl shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-slate-200/50 w-full max-w-2xl transform transition-all flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by order no, customer, WhatsApp, or tracking..."
            className="flex-1 text-base outline-none placeholder:text-slate-400 font-medium bg-transparent"
          />
          <button onClick={() => { onClose(); setQ(""); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        {hasResults ? (
          <div className="overflow-y-auto p-2 space-y-4">
            {matchingCustomers.length > 0 && (
              <div className="px-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><User size={12} /> Customers</h4>
                <div className="space-y-0.5">
                  {Array.from(new Set(matchingCustomers.map(o => o.whatsapp))).map(w => {
                    const o = matchingCustomers.find(item => item.whatsapp === w)!;
                    return (
                      <div key={w} className="px-3 py-2.5 rounded-md hover:bg-slate-50 flex justify-between items-center text-sm cursor-pointer transition-colors group">
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-[#0F172A]">{o.customer}</div>
                          <div className="text-slate-500 font-mono text-xs">{o.whatsapp}</div>
                        </div>
                        <span className="text-slate-400 text-xs">{o.city}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {matchingOrders.length > 0 && (
              <div className="px-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Package size={12} /> Orders</h4>
                <div className="space-y-0.5">
                  {matchingOrders.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 text-left text-sm transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-medium text-slate-900 group-hover:text-[#0F172A]">{o.id}</div>
                        <div className="text-slate-500 hidden sm:block">{o.customer}</div>
                      </div>
                      <StatusBadge status={o.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingTracking.length > 0 && (
              <div className="px-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Truck size={12} /> Tracking</h4>
                <div className="space-y-0.5">
                  {matchingTracking.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex flex-col px-3 py-2.5 rounded-md hover:bg-slate-50 text-left transition-colors group"
                    >
                      <div className="flex justify-between font-mono text-xs text-slate-500 w-full mb-1">
                        <span>{o.id}</span>
                        <span className="text-slate-400">{o.courier}</span>
                      </div>
                      <div className="font-mono font-medium text-slate-900 group-hover:text-[#0F172A]">{o.trackingNo}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingCOD.length > 0 && (
              <div className="px-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Banknote size={12} /> COD History</h4>
                <div className="space-y-0.5">
                  {matchingCOD.map(o => (
                    <button key={o.id}
                      onClick={() => { setSelectedOrderId(o.id); setScreen("order-detail"); setQ(""); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 text-left text-sm transition-colors group"
                    >
                      <div>
                        <span className="font-mono font-medium text-slate-900 group-hover:text-[#0F172A]">{o.id}</span>
                        <span className="text-slate-500 ml-3 font-mono">{formatPKR(o.amount)}</span>
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
  const hasPendingSettlements = false; // Set to false since settlements are handled synchronously

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

      {/* Stat cards - Visual Hierarchy Implemented */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-6 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Today's Revenue" value={formatPKR(todayRevenue)} sub={`From ${todayOrders.length} orders today`} color="bg-white text-indigo-600" icon={TrendingUp} priority="primary" />
          <StatCard label="Received COD" value={formatPKR(receivedCOD)} sub="Successfully collected this week" color="bg-white text-emerald-600" icon={CheckCircle2} priority="primary" />
        </div>
        <div className="col-span-1 md:col-span-6 lg:col-span-4 grid grid-cols-2 gap-4">
          <StatCard label="Today's Orders" value={todayOrders.length} sub="As of now" color="bg-white text-blue-600" icon={Package} />
          <StatCard label="Pending Tracking" value={pendingTracking} sub="Without tracking" color="bg-white text-amber-600" icon={Clock} />
          <StatCard label="Pending COD" value={pendingCOD} sub="Delivered, unpaid" color="bg-white text-orange-600" icon={AlertCircle} />
          <StatCard label="Void Orders" value={voidOrders} sub="All time" icon={Ban} priority="tertiary" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setScreen("create-order")}><Plus size={14} /> New Order</Btn>
        <Btn variant="secondary" onClick={() => setScreen("tracking")}><Truck size={14} /> Add Tracking</Btn>
        <Btn variant="secondary" className="hover:bg-slate-800 hover:text-white" onClick={() => setScreen("cod")}><Banknote size={14} /> Receive COD</Btn>
      </div>

      <div className="flex flex-col gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Orders</h2>
            <button onClick={() => setScreen("orders")} className="text-sm text-slate-500 hover:text-[#0F172A] font-medium transition-colors">View all →</button>
          </div>
          <div className="overflow-x-auto flex-1 scrollbar-hide">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3 whitespace-nowrap">Order ID</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Agent</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onViewOrder(o.id)}>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900 group-hover:text-[#0F172A]">{o.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-900">{o.customer}</div>
                      <div className="text-xs text-slate-500">{o.city}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(o.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide",
                        o.handledBy === "Sami" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                      )}>{o.handledBy}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent COD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent COD</h2>
            <button onClick={() => setScreen("cod")} className="text-sm text-slate-500 hover:text-[#0F172A] font-medium transition-colors">View all →</button>
          </div>
          <div className="overflow-x-auto flex-1 scrollbar-hide">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3 whitespace-nowrap">Order ID</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.filter(o => o.status === "delivered" || o.codStatus === "received").slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onViewOrder(o.id)}>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900 group-hover:text-[#0F172A]">{o.id}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(o.amount)}</td>
                    <td className="px-6 py-4"><StatusBadge status={o.codStatus} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{o.receivedDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Weekly Performance</h2>
            <p className="text-sm text-slate-500 mt-1">Jun 14 – Jun 20, 2026</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2 font-medium"><span className="w-3 h-3 bg-[#0F172A] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" /> Orders</span>
            <span className="flex items-center gap-2 font-medium"><span className="w-3 h-3 bg-[#D4AF37] rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" /> Revenue</span>
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
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [orderType, setOrderType] = useState<"COD" | "NON-COD">("COD");
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"Online" | "Courier">("Courier");
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
        setProvince(o.province || "");
        setCity(o.city);
        setAddress(o.address);
        setOrderType(o.type);
        setDeliveryCharges(o.deliveryCharges || 0);
        setAdvancePayment(o.advancePayment || 0);
        setPaymentType(o.paymentType || "Courier");
        setNotes(o.notes || "");
        setProducts(o.products.map(p => ({ ...p })));
      }
    }
  }, [editOrderId, orders]);

  useEffect(() => {
    if (existing && !editOrderId) {
      setCustomerName(existing.customer);
      setProvince(existing.province || "");
      setCity(existing.city);
      setAddress(existing.address);
    }
  }, [existing?.whatsapp, editOrderId]);

  const subtotal = products.reduce((s, p) => s + p.qty * p.price, 0);
  const grandTotal = subtotal + deliveryCharges;
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
      province: province,
      city: city,
      address: address,
      amount: grandTotal,
      handledBy: handledBy,
      status: editOrderId ? (orders.find(item => item.id === editOrderId)?.status || "pending") : "pending",
      codStatus: editOrderId ? (orders.find(item => item.id === editOrderId)?.codStatus || "pending") : "pending",
      date: editOrderId ? (orders.find(item => item.id === editOrderId)?.date || "2026-06-20") : "2026-06-20",
      products: products,
      type: orderType,
      deliveryCharges: deliveryCharges,
      advancePayment: advancePayment,
      paymentType: paymentType,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT';
    const isSelect = target.tagName === 'SELECT';
    const isButton = target.tagName === 'BUTTON';

    let shouldIntercept = false;
    let goForward = false;
    let goBackward = false;
    
    if (e.key === 'Enter') {
      if (isInput || isSelect) { shouldIntercept = true; goForward = true; }
    } else if (e.key === 'ArrowDown') {
      if (isInput || isSelect || isButton) { shouldIntercept = true; goForward = true; }
    } else if (e.key === 'ArrowUp') {
      if (isInput || isSelect || isButton) { shouldIntercept = true; goBackward = true; }
    } else if (e.key === 'ArrowRight') {
      if (isButton || isSelect) { shouldIntercept = true; goForward = true; }
      else if (isInput) {
        try {
          const el = target as HTMLInputElement;
          if (el.type === 'number' || el.selectionStart === el.value?.length) {
            shouldIntercept = true; goForward = true;
          }
        } catch (err) { shouldIntercept = true; goForward = true; }
      }
    } else if (e.key === 'ArrowLeft') {
      if (isButton || isSelect) { shouldIntercept = true; goBackward = true; }
      else if (isInput) {
        try {
          const el = target as HTMLInputElement;
          if (el.type === 'number' || el.selectionEnd === 0) {
            shouldIntercept = true; goBackward = true;
          }
        } catch (err) { shouldIntercept = true; goBackward = true; }
      }
    }

    if (shouldIntercept) {
      e.preventDefault();
      const container = e.currentTarget as HTMLElement;
      const focusable = Array.from(
        container.querySelectorAll('input, select, textarea, button')
      ).filter(el => {
         const htmlEl = el as HTMLElement;
         return htmlEl.tabIndex >= 0 && !(htmlEl as HTMLInputElement).disabled && htmlEl.offsetParent !== null; 
      }) as HTMLElement[];
      
      const index = focusable.indexOf(target);
      if (goForward && index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      } else if (goBackward && index > 0) {
        focusable[index - 1].focus();
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 max-w-5xl pb-8" onKeyDown={handleKeyDown}>
      {/* Left Column: Form */}
      <div className="flex-1 space-y-4">
        {/* Header & Agent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen("orders")} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors bg-slate-100">
              <ArrowLeft size={16} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] leading-tight">{editOrderId ? "Edit Order" : "New Order"}</h1>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{orderIdToSave}</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner">
            {(["Sami", "Abid"] as const).map(name => (
              <button key={name} onClick={() => setHandledBy(name)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  handledBy === name
                    ? "bg-white text-[#0F172A] shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}>
                {name}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium shadow-sm flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Unified Customer Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden focus-within:border-slate-300 transition-colors">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 font-semibold text-[#0F172A] text-sm flex items-center gap-2">
            <User size={14} className="text-slate-400" /> Customer Details
          </div>
          
          {existing && (
            <div className="mx-4 mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-emerald-800">Existing Customer</div>
                <div className="text-[11px] text-emerald-700 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                  <span className="font-medium">{existing.customer}</span>
                  <span>•</span>
                  <span>{orders.filter(o => o.whatsapp === whatsapp).length} orders</span>
                  <span>•</span>
                  <span className="font-semibold">Spent: {formatPKR(orders.filter(o => o.whatsapp === whatsapp).reduce((a, b) => a + b.amount, 0))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-3">
            <div className="sm:col-span-4">
              <FieldInput label="WhatsApp" autoFocus value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="03001234567" maxLength={11} required className="font-mono text-sm py-1.5" />
            </div>
            <div className="sm:col-span-4">
              <FieldInput label="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name" required className="text-sm py-1.5" />
            </div>
            <div className="sm:col-span-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-sm font-medium text-slate-700">City <span className="text-red-500">*</span></label>
                <input
                  list="pakistan-cities"
                  value={city}
                  onChange={e => {
                    const val = e.target.value;
                    setCity(val);
                    const foundProv = Object.entries(PROVINCE_CITIES).find(([_, cities]) => cities.some(c => c.toLowerCase() === val.toLowerCase()));
                    if (foundProv) setProvince(foundProv[0]);
                  }}
                  placeholder="Select city"
                  required
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0F172A] sm:text-sm sm:leading-6 transition-all bg-white"
                />
                <datalist id="pakistan-cities">
                  {(province ? PROVINCE_CITIES[province] : Object.values(PROVINCE_CITIES).flat().sort()).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="sm:col-span-12">
              <FieldInput label="Complete Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="House, Street, Area..." required className="text-sm py-1.5" />
            </div>
            <div className="sm:col-span-6">
              <FieldSelect label="Province (Optional)" value={province} onChange={e => { 
                setProvince(e.target.value); 
              }} className="text-sm py-1.5">
                <option value="">Select Province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </FieldSelect>
            </div>
            <div className="sm:col-span-6">
              <FieldInput label="Alternate Phone (Optional)" value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="03xxxxxxxxx" className="font-mono text-sm py-1.5" />
            </div>
          </div>
        </div>

        {/* Compact Products Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden focus-within:border-slate-300 transition-colors">
          <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
            <div className="font-semibold text-[#0F172A] text-sm flex items-center gap-2">
              <Package size={14} className="text-slate-400" /> Products
            </div>
            <button type="button" onClick={addProduct} className="text-[11px] font-bold text-[#0F172A] bg-white px-2.5 py-1 rounded shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1">
              <Plus size={12} /> Add Row
            </button>
          </div>
          <div className="p-3">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5">
              <div className="col-span-6">Item Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            <div className="space-y-1.5">
              {products.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50">
                  <div className="col-span-12 sm:col-span-6">
                    <input value={p.name} onChange={e => updateProduct(i, "name", e.target.value)}
                      placeholder="e.g. King Size Bedsheet" required
                      className="w-full px-2.5 py-1.5 text-[13px] border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 bg-white" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input type="number" min={1} value={p.qty} onChange={e => updateProduct(i, "qty", e.target.value === "" ? "" : parseInt(e.target.value))} required
                      className="w-full px-2 py-1.5 text-[13px] border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 text-center font-mono bg-white" />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <input type="number" min={0} value={p.price === 0 ? "" : p.price} onChange={e => updateProduct(i, "price", e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="0" required
                      className="w-full px-2 py-1.5 text-[13px] border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 text-right font-mono bg-white" />
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2 pr-1">
                    <span className="font-mono text-[13px] font-bold text-[#0F172A]">
                      {(Number(p.qty) || 0) * (Number(p.price) || 0) > 0 ? ((Number(p.qty) || 0) * (Number(p.price) || 0)).toLocaleString() : "—"}
                    </span>
                    {products.length > 1 && (
                      <button type="button" onClick={() => removeProduct(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary & Actions */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-20 flex flex-col">
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 font-semibold text-[#0F172A] text-sm flex items-center gap-2">
            <Receipt size={14} className="text-slate-400" /> Summary
          </div>
          
          <div className="p-4 space-y-4 flex-1">
            {/* Totals */}
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-medium">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Delivery (DC)</span>
                <input type="number" min={0} value={deliveryCharges} onChange={e => setDeliveryCharges(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 text-right font-mono" />
              </div>
              {advancePayment > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-medium">
                  <span>Advance</span>
                  <span className="font-mono">- {formatPKR(advancePayment)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 mt-2 font-bold text-base text-[#0F172A]">
                <span>{orderType === "COD" ? "Net COD" : "Total"}</span>
                <span className="font-mono text-[#D4AF37]">{formatPKR(Math.max(0, grandTotal - advancePayment))}</span>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            {/* Quick Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(["COD", "NON-COD"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setOrderType(t)}
                      className={cn(
                        "flex-1 py-1 text-[11px] font-bold rounded transition-colors",
                        orderType === t ? "bg-white text-[#0F172A] shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:bg-slate-800 hover:text-white"
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Advance via</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(["Online", "Courier"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setPaymentType(t)}
                      className={cn(
                        "flex-1 py-1 text-[11px] font-bold rounded transition-colors",
                        paymentType === t ? "bg-white text-[#0F172A] shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Advance Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">Rs</span>
                <input type="number" min={0} value={advancePayment} onChange={e => setAdvancePayment(parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Special instructions..."
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 resize-none" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 rounded-b-xl">
            <button onClick={handleSave} className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors">
              {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Order</>}
            </button>
            <button onClick={() => setShowPrint(true)} className="w-full py-2 bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors">
              <Printer size={16} /> Save & Print
            </button>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <Modal open={showPrint} onClose={() => setShowPrint(false)} title="Parcel Label Preview">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs">
          <div className="text-center mb-3 pb-3 border-b border-slate-200">
            <div className="text-base font-bold text-[#0F172A]">HK FABRIC</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bedsheets & Home Textiles</div>
            <div className="text-[10px] text-slate-400 mt-1">
              Branch 1: Shop No 55, Muhammadi Market, Haidry Block G, Karachi<br/>
              Branch 2: Shop No 39, Saima Shopping Centre, Opp. Al Madni Mall
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{orderIdToSave}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{handledBy}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{customerName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{whatsapp || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Province:</span><span>{province || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{city || "—"}</span></div>
            <div className="pt-1"><span className="text-slate-400">Address: </span><span>{address || "—"}</span></div>
            {deliveryCharges > 0 && (
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-400">Delivery Charges:</span>
                <span className="font-mono font-medium">{formatPKR(deliveryCharges)}</span>
              </div>
            )}
            {advancePayment > 0 && (
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-400">Advance:</span>
                <span className="font-mono font-medium">{formatPKR(advancePayment)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-sm">{orderType === "COD" ? "COD Amount:" : "Total Amount:"}</span>
              <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(Math.max(0, grandTotal - advancePayment))}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Btn className="flex-1" onClick={() => { handleSave(); setShowPrint(false); }}>
            <Printer size={14} /> Print Label
          </Btn>
          <Btn variant="secondary" className="flex-1" onClick={() => {
              const text = encodeURIComponent(`*Order Details*\nOrder No: ${orderIdToSave}\nCustomer: ${customerName}\nAddress: ${address}, ${city}\nCOD Amount: Rs ${Math.max(0, grandTotal - advancePayment)}`);
              window.open(`https://wa.me/${whatsapp.replace(/^0/, '92')}?text=${text}`, '_blank');
          }}>
            Share on WhatsApp
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
  const [dateFilter, setDateFilter] = useState("all");
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
    const today = new Date(); // Use actual current date
    if (dateFilter === "today") {
      if (orderDate.toDateString() !== today.toDateString()) return false;
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
      <div className="flex gap-1 bg-slate-100/50 rounded-lg p-1 w-fit flex-wrap border border-slate-200/50">
        {["all", "today", "week", "month", "year", "custom"].map(f => (
          <button key={f} onClick={() => setDateFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
              dateFilter === f ? "bg-white text-[#0F172A] shadow-sm ring-1 ring-slate-200/60" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}>
            {f === "all" ? "All Time" : f === "custom" ? "Custom Date" : f}
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
      <div className="flex flex-wrap gap-3">
        <select value={handledFilter} onChange={e => setHandledFilter(e.target.value)}
          className="px-3.5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors hover:border-slate-300">
          <option value="all">All Staff</option>
          <option value="Sami">Sami</option>
          <option value="Abid">Abid</option>
        </select>
        
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors hover:border-slate-300">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="returned">Returned</option>
          <option value="void">Void</option>
        </select>

        <select value={courierFilter} onChange={e => setCourierFilter(e.target.value)}
          className="px-3.5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors hover:border-slate-300">
          <option value="all">All Couriers</option>
          {["TCS","PostEx","Leopard","M&P","Pakistan Post","Other"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={codStatusFilter} onChange={e => setCODStatusFilter(e.target.value)}
          className="px-3.5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors hover:border-slate-300">
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <span className="text-sm text-slate-500 font-medium">{filtered.length} orders</span>
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A] font-medium transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
        <div className="overflow-x-auto flex-1 scrollbar-hide">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 w-14 text-left">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filtered.map(o => o.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-slate-300 accent-[#0F172A] w-3.5 h-3.5 cursor-pointer" />
                </th>
                <th className="text-left px-6 py-3">Order No</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3 hidden md:table-cell">WhatsApp</th>
                <th className="text-right px-6 py-3">Amount</th>
                <th className="text-left px-6 py-3 hidden sm:table-cell">Agent</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3 hidden lg:table-cell">Date</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => {
                const status = o.status;
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 w-14">
                      <input type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(o.id);
                          else next.delete(o.id);
                          setSelectedIds(next);
                        }}
                        className="rounded border-slate-300 accent-[#0F172A] w-3.5 h-3.5 cursor-pointer" />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-900 group-hover:text-[#0F172A] transition-colors cursor-pointer" onClick={() => onViewOrder(o.id)}>{o.customer}</div>
                      <div className="text-xs text-slate-500">{o.city}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 hidden md:table-cell">{o.whatsapp}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(o.amount)}</td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide",
                        o.handledBy === "Sami" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                      )}>{o.handledBy}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell whitespace-nowrap">{o.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onViewOrder(o.id)}
                          className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-400 hover:text-[#0F172A] transition-all" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => onEditOrder(o.id)}
                          className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setPrintOrderId(o.id)}
                          className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-400 hover:text-slate-700 transition-all" title="Print">
                          <Printer size={14} />
                        </button>
                        {status !== "void" && (
                          <button onClick={() => setVoidModal(o.id)}
                            className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-red-200 hover:shadow-sm text-slate-300 hover:text-red-600 transition-all" title="Void">
                            <Ban size={14} />
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
                  <div className="text-base font-bold text-[#0F172A] tracking-wide">HK FABRICS</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Imported Blankets & Fancy Bed Sheets</div>
                  <div className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                    Shop 55, Muhammadi Shopping Center, Block G<br/>
                    Haidery Market, North Nazimabad, Karachi<br/>
                    <span className="font-medium text-slate-500 mt-0.5 inline-block">0313-2224398 (Abid) &nbsp;|&nbsp; 0333-3045232 (Sami)</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
                  {o.province && <div className="flex justify-between"><span className="text-slate-400">Province:</span><span>{o.province}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
                  <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
                  {o.advancePayment && o.advancePayment > 0 ? (
                    <div className="flex justify-between pt-1 text-xs">
                      <span className="text-slate-400">Advance ({o.paymentType}):</span>
                      <span className="font-mono font-medium">{formatPKR(o.advancePayment)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="font-bold text-sm">COD:</span>
                    <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(Math.max(0, o.amount - (o.advancePayment || 0)))}</span>
                  </div>
                </div>

              </div>
              <div className="flex gap-3 mt-4">
                <Btn className="flex-1" onClick={() => setPrintOrderId(null)}>
                  <Printer size={14} /> Print Label
                </Btn>
                <Btn variant="secondary" className="flex-1" onClick={() => {
                  const text = encodeURIComponent(`*Order Details*\nOrder No: ${o.id}\nCustomer: ${o.customer}\nAddress: ${o.address}, ${o.city}\nCOD Amount: Rs ${Math.max(0, o.amount - (o.advancePayment || 0))}`);
                  window.open(`https://wa.me/${o.whatsapp.replace(/^0/, '92')}?text=${text}`, '_blank');
                }}>
                  Share on WhatsApp
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
                  <div className="text-base font-bold text-[#0F172A] tracking-wide">HK FABRICS</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Imported Blankets & Fancy Bed Sheets</div>
                  <div className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                    Shop 55, Muhammadi Shopping Center, Block G<br/>
                    Haidery Market, North Nazimabad, Karachi<br/>
                    <span className="font-medium text-slate-500 mt-0.5 inline-block">0313-2224398 (Abid) &nbsp;|&nbsp; 0333-3045232 (Sami)</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
                  {o.province && <div className="flex justify-between"><span className="text-slate-400">Province:</span><span>{o.province}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
                  <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
                  {o.advancePayment && o.advancePayment > 0 ? (
                    <div className="flex justify-between pt-1 text-xs">
                      <span className="text-slate-400">Advance ({o.paymentType}):</span>
                      <span className="font-mono font-medium">{formatPKR(o.advancePayment)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="font-bold text-sm">COD:</span>
                    <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(Math.max(0, o.amount - (o.advancePayment || 0)))}</span>
                  </div>
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
    <div className="space-y-6 max-w-4xl pb-8">
      <div className="flex items-center gap-4 flex-wrap pb-2 border-b border-slate-100">
        <button onClick={() => setScreen("orders")} className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 text-slate-500 hover:text-[#0F172A]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#0F172A] font-mono tracking-tight">{o.id}</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">{o.date} <span className="mx-1 text-slate-300">•</span> Handled by {o.handledBy}</p>
        </div>
        <StatusBadge status={o.status} />
        <Btn size="md" variant="secondary" onClick={() => setShowPrint(true)} className="ml-2"><Printer size={14} /> Print Label</Btn>
      </div>

      {/* Label Print Modal */}
      <Modal open={showPrint} onClose={() => setShowPrint(false)} title="Parcel Label Preview">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white font-mono text-xs">
          <div className="text-center mb-3 pb-3 border-b border-slate-200">
            <div className="text-base font-bold text-[#0F172A] tracking-wide">HK FABRICS</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Imported Blankets & Fancy Bed Sheets</div>
            <div className="text-[9px] text-slate-400 mt-1.5 leading-snug">
              Shop 55, Muhammadi Shopping Center, Block G<br/>
              Haidery Market, North Nazimabad, Karachi<br/>
              <span className="font-medium text-slate-500 mt-0.5 inline-block">0313-2224398 (Abid) &nbsp;|&nbsp; 0333-3045232 (Sami)</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Order No:</span><span className="font-bold">{o.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date:</span><span>{o.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Time:</span><span>11:45 AM</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Handled By:</span><span>{o.handledBy}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span>{o.customer}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">WhatsApp:</span><span>{o.whatsapp}</span></div>
            {o.province && <div className="flex justify-between"><span className="text-slate-400">Province:</span><span>{o.province}</span></div>}
            <div className="flex justify-between"><span className="text-slate-400">City:</span><span>{o.city}</span></div>
            <div className="pt-1"><span className="text-slate-400">Address: </span><span>{o.address}</span></div>
            {o.deliveryCharges && o.deliveryCharges > 0 ? (
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-400">Delivery Charges:</span>
                <span className="font-mono font-medium">{formatPKR(o.deliveryCharges)}</span>
              </div>
            ) : null}
            {o.advancePayment && o.advancePayment > 0 ? (
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-400">Advance ({o.paymentType}):</span>
                <span className="font-mono font-medium">{formatPKR(o.advancePayment)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-sm">{o.type === "COD" ? "COD Amount:" : "Total Amount:"}</span>
              <span className="font-bold text-sm text-[#D4AF37]">{formatPKR(Math.max(0, o.amount - (o.advancePayment || 0)))}</span>
            </div>
          </div>

        </div>
        <div className="flex gap-3 mt-4">
          <Btn className="flex-1" onClick={() => setShowPrint(false)}>
            <Printer size={14} /> Print Label
          </Btn>
          <Btn variant="secondary" className="flex-1" onClick={() => {
              const text = encodeURIComponent(`*Order Details*\nOrder No: ${o.id}\nCustomer: ${o.customer}\nAddress: ${o.address}, ${o.city}\nCOD Amount: Rs ${Math.max(0, o.amount - (o.advancePayment || 0))}`);
              window.open(`https://wa.me/${o.whatsapp.replace(/^0/, '92')}?text=${text}`, '_blank');
          }}>
            Share on WhatsApp
          </Btn>
          <Btn variant="secondary" onClick={() => setShowPrint(false)}>Cancel</Btn>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-5 flex items-center gap-2">
              <User size={15} className="text-slate-400" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 text-sm">
              {[
                ["Name", o.customer],
                ["WhatsApp", o.whatsapp],
                ["Province", o.province || "—"],
                ["City", o.city],
                ["Address", o.address],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                  <div className={cn("text-slate-900 text-sm font-medium", label === "WhatsApp" && "font-mono")}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Package size={15} className="text-slate-400" /> Order Items</h3>
            </div>
            <div className="p-6">
              <div className="space-y-1">
                {o.products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 -mx-6 px-6 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-1">Qty: {p.qty} × {formatPKR(p.price)}</div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[#0F172A]">{formatPKR(p.qty * p.price)}</span>
                  </div>
                ))}
                {o.deliveryCharges ? (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 -mx-6 px-6 transition-colors">
                    <div className="text-sm font-medium text-slate-900">Delivery Charges</div>
                    <span className="font-mono text-sm font-semibold text-[#0F172A]">{formatPKR(o.deliveryCharges)}</span>
                  </div>
                ) : null}
                {o.advancePayment && o.advancePayment > 0 ? (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 -mx-6 px-6 transition-colors">
                    <div className="text-sm font-medium text-slate-900">Advance Payment</div>
                    <span className="font-mono text-sm font-semibold text-emerald-600">-{formatPKR(o.advancePayment)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center pt-5 mt-2 font-semibold">
                  <span className="text-sm text-slate-600">{o.type === "COD" ? "Net COD Amount" : "Grand Total"}</span>
                  <span className="font-mono text-[#D4AF37] text-xl">{formatPKR(Math.max(0, o.amount - (o.advancePayment || 0)))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tracking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Truck size={15} className="text-slate-400" /> Tracking</h3>
            {o.trackingNo ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Courier</div>
                  <div className="font-medium text-slate-900">{o.courier}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tracking No</div>
                  <div className="font-mono text-[#0F172A] text-sm bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 inline-block">{o.trackingNo}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <Clock size={24} className="mx-auto mb-2 text-slate-300" />
                <div className="text-xs font-medium text-slate-500">No tracking added yet</div>
              </div>
            )}
          </div>

          {/* COD */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Banknote size={15} className="text-slate-400" /> COD Details</h3>
            <div className="space-y-4 text-sm">
              <div><div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Type</div><div className="font-medium text-slate-900">{o.type}</div></div>
              <div><div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Amount</div><div className="font-mono font-bold text-[#D4AF37] text-lg">{formatPKR(Math.max(0, o.amount - (o.advancePayment || 0)))}</div></div>
              <div><div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</div><div className="mt-1"><StatusBadge status={o.codStatus} /></div></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-5">Timeline</h3>
            <div className="space-y-4 relative">
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-100" />
              {timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative z-10">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ring-4 ring-white",
                    step.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 border border-slate-200"
                  )}>
                    {step.done
                      ? <Check size={12} strokeWidth={3} />
                      : <div className="w-2 h-2 rounded-full bg-slate-300" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className={cn("text-sm font-semibold", step.done ? "text-slate-900" : "text-slate-400")}>{step.label}</div>
                    {step.date && <div className="text-xs text-slate-500 mt-0.5">{step.date}</div>}
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

function TrackingScreen({ orders, onSaveTracking, onUpdateStatus }: { orders: Order[]; onSaveTracking: (id: string, courier: string, no: string, no2?: string) => void; onUpdateStatus: (id: string, status: OrderStatus) => void; }) {
  const [tab, setTab] = useState<"awaiting" | "added">("awaiting");
  const [inputs, setInputs] = useState<Record<string, { courier: string; no: string; no2?: string }>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const awaiting = orders.filter(o => !o.trackingNo && o.status !== "void" && !saved.has(o.id));
  const added = orders.filter(o => !!o.trackingNo || saved.has(o.id));

  const set = (id: string, field: string, val: string) =>
    setInputs(prev => ({ ...prev, [id]: { courier: prev[id]?.courier || "", no: prev[id]?.no || "", no2: prev[id]?.no2 || "", [field]: val } }));

  const handleSave = (id: string) => {
    const data = inputs[id];
    if (data?.courier && data?.no) {
      onSaveTracking(id, data.courier, data.no, data.no2);
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {awaiting.length === 0 ? (
            <div className="py-20 text-center">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
              <div className="text-sm font-medium text-slate-500">All orders have tracking numbers ✓</div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto flex-1">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3">Order No</th>
                      <th className="text-left px-6 py-3">Customer</th>
                      <th className="text-right px-6 py-3 hidden md:table-cell">Amount</th>
                      <th className="text-left px-6 py-3 w-40">Courier</th>
                      <th className="text-left px-6 py-3">Tracking No</th>
                      <th className="text-left px-6 py-3 w-44">Receipt Upload</th>
                      <th className="px-6 py-3 w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {awaiting.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{o.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-slate-900">{o.customer}</div>
                          <div className="text-xs text-slate-500">{o.city}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900 text-right hidden md:table-cell">{formatPKR(o.amount)}</td>
                        <td className="px-6 py-4">
                          <select value={inputs[o.id]?.courier || ""}
                            onChange={e => set(o.id, "courier", e.target.value)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 transition-colors">
                            <option value="">Select</option>
                            {["TCS","PostEx","Leopard","M&P","Pakistan Post","Other"].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input value={inputs[o.id]?.no || ""}
                            onChange={e => set(o.id, "no", e.target.value)}
                            placeholder="Tracking number"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono transition-colors" />
                          {inputs[o.id]?.courier && (
                            <input value={inputs[o.id]?.no2 || ""}
                              onChange={e => set(o.id, "no2", e.target.value)}
                              placeholder="Tracking number 2 (optional)"
                              className="w-full mt-2 px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono transition-colors" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input type="file" accept="image/*"
                            onChange={() => set(o.id, "receiptUploaded", "true")}
                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:font-medium hover:file:bg-slate-200 transition-colors cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          <Btn size="sm"
                            disabled={!inputs[o.id]?.courier || !inputs[o.id]?.no}
                            onClick={() => handleSave(o.id)}>
                            <Save size={14} /> Save
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
                          {["TCS","PostEx","Leopard","M&P","Pakistan Post","Other"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Tracking Number</label>
                        <input value={inputs[o.id]?.no || ""}
                          onChange={e => set(o.id, "no", e.target.value)}
                          placeholder="Enter tracking number"
                          className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono bg-white" />
                        {inputs[o.id]?.courier && (
                          <input value={inputs[o.id]?.no2 || ""}
                            onChange={e => set(o.id, "no2", e.target.value)}
                            placeholder="Tracking number 2 (optional)"
                            className="w-full mt-2 px-2.5 py-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 font-mono bg-white" />
                        )}
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Order No</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3">Courier</th>
                  <th className="text-left px-6 py-3">Tracking No</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3 hidden md:table-cell">Amount</th>
                  <th className="px-6 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {added.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-900">{o.customer}</div>
                      <div className="text-xs text-slate-500">{o.city}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{o.courier || "—"}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-700">{o.trackingNo || "—"}</td>
                    <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900 text-right hidden md:table-cell">{formatPKR(o.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      {o.status === "shipped" && (
                        <div className="flex items-center gap-2 justify-end">
                          <Btn size="sm" variant="secondary" className="px-2 py-1 bg-white hover:bg-emerald-50 border-emerald-200" onClick={() => onUpdateStatus(o.id, "delivered")} title="Mark Delivered"><CheckCircle2 size={14} className="text-emerald-600" /></Btn>
                          <Btn size="sm" variant="secondary" className="px-2 py-1 bg-white hover:bg-orange-50 border-orange-200" onClick={() => onUpdateStatus(o.id, "returned")} title="Mark Returned"><XCircle size={14} className="text-orange-600" /></Btn>
                        </div>
                      )}
                    </td>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-[#0F172A]">Pending COD — Awaiting Receipt</h2>
        </div>
        {pending.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
            <div className="text-sm font-medium text-slate-500">All COD received!</div>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Order No</th>
                    <th className="text-left px-6 py-3">Customer</th>
                    <th className="text-left px-6 py-3 hidden md:table-cell">Tracking</th>
                    <th className="text-right px-6 py-3">Amount</th>
                    <th className="text-left px-6 py-3 hidden sm:table-cell">Courier</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{o.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-slate-900">{o.customer}</div>
                        <div className="text-xs text-slate-500">{o.city}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 hidden md:table-cell">{o.trackingNo || "—"}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(o.amount)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 hidden sm:table-cell">{o.courier || "—"}</td>
                      <td className="px-6 py-4"><StatusBadge status={o.codStatus} /></td>
                      <td className="px-6 py-4 text-right">
                        <Btn size="sm" onClick={() => setReceiveModal(o.id)}>
                          <Banknote size={14} /> Receive
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-[#0F172A]">Received COD</h2>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Order No</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-right px-6 py-3">Amount</th>
                <th className="text-left px-6 py-3 hidden sm:table-cell">Courier</th>
                <th className="text-left px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receivedList.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{o.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{o.customer}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(o.amount)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 hidden sm:table-cell">{o.courier || "—"}</td>
                  <td className="px-6 py-4"><StatusBadge status="received" /></td>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if (e.target instanceof HTMLInputElement && e.target.files) {
      file = e.target.files[0];
    }

    if (!file) return;

    if (file.type.startsWith('image/')) {
      setUploaded(true);
      setIsProcessing(true);
      try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        setRawText(text);
        // Extract tracking numbers: length 8 to 25, alphanumeric with hyphens
        const trackingRegex = /\b[A-Z0-9-]{8,25}\b/gi;
        const rawMatches = text.match(trackingRegex) || [];
        
        // Filter: Must contain at least 4 digits (removes words like SETTLEMENT, DELIVERED)
        // Clean spaces from matches
        const cleanedMatches = rawMatches
          .filter(t => (t.match(/\d/g) || []).length >= 4)
          .map(t => t.replace(/\s/g, '').toUpperCase());
          
        const potentialTrackings = Array.from(new Set(cleanedMatches));

        // Send to backend API
        const response = await fetch('/api/settlements/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingNumbers: potentialTrackings })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter out obvious noise from unmatched items
          const cleanData = data.filter((row: any) => {
            if (row.status !== 'unmatched') return true;
            if (/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(row.tracking)) return false; // Dates
            if (/^\d{11}$/.test(row.tracking)) return false; // Phone / NTN
            if (/^\d{13}$/.test(row.tracking)) return false; // CNIC
            return true;
          });
          setPreview(cleanData);
        } else {
          alert('Failed to match tracking numbers with server.');
        }
      } catch (err) {
        console.error("OCR Error:", err);
        alert('Failed to read image.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert("Please upload an image for OCR processing.");
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const matchedOrderIds = preview.filter(p => p.status === 'matched').map(p => p.orderId);
      if (matchedOrderIds.length === 0) return;

      const res = await fetch('/api/settlements/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: matchedOrderIds })
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setUploaded(false);
      setPreview([]);
      alert("Settlement approved successfully!");
    }
  });

  const matchedCount = preview.filter(p => p.status === 'matched').length;
  const unmatchedCount = preview.filter(p => p.status === 'unmatched').length;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0F172A]">Settlements</h1>

      {!uploaded && (
        <label
          className={cn(
            "block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all relative overflow-hidden group",
            dragOver ? "border-[#0F172A] bg-slate-50" : "border-slate-200 hover:border-slate-300 bg-white"
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { setDragOver(false); handleFileUpload(e); }}
        >
          <input type="file" accept="image/*,.csv,.xlsx" className="hidden" onChange={handleFileUpload} />
          
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Upload size={28} className="text-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Upload Settlement Photo</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">Drop an image of the courier slip here to auto-scan tracking numbers</p>
            <div className="flex gap-2 justify-center mt-5">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold shadow-sm">Photo (OCR)</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Excel</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">CSV</span>
            </div>
          </div>
        </label>
      )}

      {uploaded && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                Settlement Preview
                {isProcessing && <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              </h2>
              {!isProcessing && preview.length > 0 && (
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold tracking-wide rounded-md ring-1 ring-inset ring-emerald-600/20">{matchedCount} matched</span>
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-semibold tracking-wide rounded-md ring-1 ring-inset ring-rose-600/20">{unmatchedCount} unmatched</span>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto flex-1 max-h-[400px]">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-sm font-medium animate-pulse text-slate-500">Scanning tracking numbers with AI...</p>
                </div>
              ) : preview.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center">
                  <p className="text-slate-500 text-sm font-medium mb-4">No tracking numbers found.</p>
                  <div className="w-full text-left bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-64 text-xs font-mono text-slate-600 whitespace-pre-wrap">
                    <span className="font-bold text-slate-800 block mb-2">Raw OCR Output Debug:</span>
                    {rawText || "No text extracted at all."}
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3">Tracking No</th>
                      <th className="text-right px-6 py-3">Order Amount</th>
                      <th className="text-left px-6 py-3">Matched Order</th>
                      <th className="text-left px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i} className={cn("hover:bg-slate-50 transition-colors", row.status === "unmatched" && "bg-rose-50/30")}>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-[#0F172A]">{row.tracking}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">{formatPKR(row.amount)}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-700">{row.matched || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide ring-1 ring-inset",
                          row.status === "matched" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                          row.status === "pending" ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                          "bg-rose-50 text-rose-700 ring-rose-600/20"
                        )}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
          <div className="flex gap-3 mt-6 pb-8">
            <Btn size="lg" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || matchedCount === 0}>
              {approveMutation.isPending ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</> : <><Check size={18} /> Approve Settlement</>}
            </Btn>
            <Btn size="lg" variant="danger" onClick={() => { setUploaded(false); setPreview([]); }} disabled={approveMutation.isPending}>
              <X size={18} /> Reject Settlement
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Reports Screen ────────────────────────────────────────────────────────────

function ReportsScreen({ orders }: { orders: Order[] }) {
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

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

  const handleExportPDF = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const imgData = await toPng(reportRef.current, {
        quality: 0.95,
        backgroundColor: '#F8FAFC',
        filter: (node) => {
          if (node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")) {
            return false;
          }
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HK_Fabric_Report_${period}.pdf`);
    } catch (e: any) {
      console.error(e);
      alert("Failed to export PDF: " + (e.message || "Unknown error. Try restarting the dev server."));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    const headers = ["Order No", "Date", "Customer", "City", "Amount", "Status", "COD Status", "Tracking No", "Courier"];
    const rows = filteredOrders.map(o => [
      o.id,
      o.date,
      `"${o.customer}"`,
      `"${o.city}"`,
      o.amount,
      o.status,
      o.codStatus,
      o.trackingNo || "",
      o.courier || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HK_Fabric_Report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 print:p-0 print:m-0" ref={reportRef}>
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden" data-html2canvas-ignore>
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
          <Btn size="sm" variant="secondary" onClick={handleExportPDF} disabled={isExporting}>
            <Download size={12} /> {isExporting ? "Exporting..." : "PDF"}
          </Btn>
          <Btn size="sm" variant="secondary" onClick={handleExportExcel}><Download size={12} /> Excel</Btn>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: filteredOrders.length, trend: "+12%", up: true, icon: Package, color: "text-blue-600" },
          { label: "Revenue", value: formatPKR(totalRevenue), trend: "+8%", up: true, icon: TrendingUp, color: "text-indigo-600" },
          { label: "COD Collected", value: formatPKR(codCollected), trend: "+15%", up: true, icon: Banknote, color: "text-emerald-600" },
          { label: "Returns", value: returnsCount, trend: "-2 orders", up: false, icon: AlertTriangle, color: "text-red-500" },
        ].map((c, i) => (
          <StatCard 
            key={i} 
            label={c.label} 
            value={c.value} 
            sub={`${c.up ? "↑" : "↓"} ${c.trend} vs last period`} 
            icon={c.icon} 
            color={`bg-white ${c.color}`} 
            priority="secondary" 
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-5">Daily Orders</h3>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-5">Returns Trend</h3>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Time</th>
                <th className="text-left px-6 py-3">Action</th>
                <th className="text-left px-6 py-3">Order</th>
                <th className="text-left px-6 py-3">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{log.date}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.time}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide ring-1 ring-inset",
                      actionColor[log.action] ? `${actionColor[log.action].replace('bg-', 'bg-').replace('50', '50').replace('text-', 'text-').replace('700', '700')} ring-${actionColor[log.action].split(' ')[1].split('-')[1]}-600/20` : "bg-slate-50 text-slate-700 ring-slate-600/20"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-[#0F172A]">{log.order}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide",
                      log.by === "Sami" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
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
  const queryClient = useQueryClient();
  const [screen, setScreenState] = useState<Screen>("dashboard");
  
  const setScreen = (s: Screen) => {
    setScreenState(s);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentScreen", s);
      window.history.pushState({ screen: s }, "", `#${s}`);
    }
  };
  
  const [mounted, setMounted] = useState(false);
  
  // Offline State
  const [isOffline, setIsOffline] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState<Order[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedScreen = (localStorage.getItem("currentScreen") as Screen) || "dashboard";
      setScreenState(savedScreen);
      // Replace initial state so the first back press doesn't exit the app immediately
      window.history.replaceState({ screen: savedScreen }, "", `#${savedScreen}`);
      
      const handlePopState = (e: PopStateEvent) => {
        if (e.state && e.state.screen) {
          setScreenState(e.state.screen);
          localStorage.setItem("currentScreen", e.state.screen);
        } else {
          const hash = window.location.hash.replace('#', '') as Screen;
          if (hash) {
            setScreenState(hash);
            localStorage.setItem("currentScreen", hash);
          }
        }
      };
      window.addEventListener("popstate", handlePopState);
      
      setIsOffline(!navigator.onLine);
      const savedOffline = localStorage.getItem("offline_orders");
      if (savedOffline) {
        try { setOfflineOrders(JSON.parse(savedOffline)); } catch(e) {}
      }

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);
  
  const saveOrderOffline = (order: Order) => {
    setOfflineOrders(prev => {
      const updated = [...prev, order];
      localStorage.setItem("offline_orders", JSON.stringify(updated));
      return updated;
    });
  };

  const syncOfflineOrders = async () => {
    if (offlineOrders.length === 0) return;
    setIsSyncing(true);
    let failed: Order[] = [];
    let syncedCount = 0;
    
    for (const order of offlineOrders) {
      const payload = {
        orderNo: order.id,
        customerDetails: {
          phone: order.whatsapp,
          name: order.customer,
          city: order.city,
          address: order.address,
        },
        handledBy: order.handledBy,
        orderType: order.type,
        totalAmount: order.amount,
        deliveryCharges: order.deliveryCharges || 0,
        advancePayment: order.advancePayment || 0,
        paymentType: order.paymentType || "Courier",
        items: order.products.map((p: any) => ({
          productName: p.name,
          qty: p.qty,
          unitPrice: p.price,
          lineTotal: p.qty * p.price
        })),
        notes: order.notes
      };

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed");
        syncedCount++;
      } catch (e) {
        failed.push(order);
      }
    }
    
    setOfflineOrders(failed);
    localStorage.setItem("offline_orders", JSON.stringify(failed));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setIsSyncing(false);
    
    if (failed.length === 0) {
      alert(`Successfully synced ${syncedCount} orders to the database!`);
    } else {
      alert(`Synced ${syncedCount} orders. ${failed.length} failed and remain in queue.`);
    }
  };

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
        province: Object.entries(PROVINCE_CITIES).find(([_, cities]) => cities.includes(o.customer?.city || ""))?.[0] || "",
        deliveryCharges: o.deliveryCharges || 0,
        advancePayment: o.advancePayment || 0,
        paymentType: o.paymentType || "Courier",
        receivedDate: o.codPayments?.[0]?.receivedDate ? new Date(o.codPayments[0].receivedDate).toISOString().split('T')[0] : undefined
      }));
    }
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const res = await fetch('/api/activities');
      if (!res.ok) throw new Error("Failed to fetch activities");
      return await res.json();
    }
  });

  const createOrderMut = useMutation({
    mutationFn: async (newOrder: Order) => {
      if (!navigator.onLine) {
        saveOrderOffline(newOrder);
        return "offline";
      }
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
        deliveryCharges: newOrder.deliveryCharges || 0,
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
      
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create order");
        return "online";
      } catch (err) {
        saveOrderOffline(newOrder);
        return "offline";
      }
    },
    onSuccess: (status) => {
      if (status === "online") queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const updateOrderMut = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const dbId = orders.find((o: any) => o.id === id)?._id;
      if (!dbId) throw new Error("Order not found");
      const res = await fetch(`/api/orders/${dbId}`, {
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

  const handleViewOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("order-detail");
  };

  const handleEditOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("create-order");
  };

  const handleSaveOrder = (newOrder: Order) => {
    const existing = orders.find((o: any) => o.id === newOrder.id);
    if (existing) {
      const payload = {
        customerDetails: {
          name: newOrder.customer,
          phone: newOrder.whatsapp,
          city: newOrder.city,
          address: newOrder.address,
        },
        handledBy: newOrder.handledBy,
        orderType: newOrder.type,
        totalAmount: newOrder.amount,
        deliveryCharges: newOrder.deliveryCharges || 0,
        advancePayment: newOrder.advancePayment || 0,
        paymentType: newOrder.paymentType || "Courier",
        items: newOrder.products.map((p: any) => ({
          productName: p.name,
          qty: p.qty,
          unitPrice: p.price,
          lineTotal: p.qty * p.price
        })),
        notes: newOrder.notes,
        actionName: "Full Order Edit",
        status: newOrder.status,
        codStatus: newOrder.codStatus,
      };
      updateOrderMut.mutate({ id: newOrder.id, data: payload });
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

  const handleSaveTracking = (orderId: string, courier: string, trackingNo: string, trackingNo2?: string) => {
    updateOrderMut.mutate({
      id: orderId,
      data: { status: 'shipped', courierName: courier, trackingNumber: trackingNo, trackingNumber2: trackingNo2, actionName: "Tracking Added" }
    });
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateOrderMut.mutate({
      id: orderId,
      data: { status, actionName: `Marked as ${status}` }
    });
  };

  const handleReceiveCOD = (orderId: string, date: string) => {
    updateOrderMut.mutate({
      id: orderId,
      data: { codStatus: 'received', status: 'delivered', actionName: "COD Received" }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setSidebarOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar
        screen={screen}
        setScreen={s => { setScreen(s); setSidebarOpen(false); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Offline Banner */}
        {(isOffline || offlineOrders.length > 0) && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between z-20 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <AlertCircle size={16} />
              {isOffline ? "You are offline. Orders will be saved locally." : `${offlineOrders.length} offline orders pending sync.`}
            </div>
            {offlineOrders.length > 0 && !isOffline && (
              <button 
                onClick={syncOfflineOrders}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50"
              >
                {isSyncing ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={12} />}
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>
        )}

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
          {screen === "tracking" && <TrackingScreen orders={orders} onSaveTracking={handleSaveTracking} onUpdateStatus={handleUpdateStatus} />}
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
