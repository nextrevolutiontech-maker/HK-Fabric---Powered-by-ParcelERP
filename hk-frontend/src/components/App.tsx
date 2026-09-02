"use client";
import { memo, useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ElementType } from "react";
import {
  LayoutDashboard, Plus, Package, Truck, Banknote, Receipt,
  BarChart2, ClipboardList, Settings, Search, Bell, Menu, X,
  Eye, Edit2, Printer, Ban, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Upload, Download, User, Save, ArrowLeft, Check,
  AlertCircle, ChevronRight, Layers, XCircle, Calendar, LogOut,
  Box, DollarSign, BarChart3, Activity
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import Tesseract from "tesseract.js";
import { getProvinceFromCity, PROVINCE_CITIES_MAP } from "@/lib/normalization";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "dashboard" | "create-order" | "orders" | "order-detail"
  | "cod-parcels" | "non-cod-parcels" | "daily-history"
  | "tracking" | "cod" | "settlements" | "reports"
  | "activity-log" | "settings" | "daily-closing";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "returned" | "void";
type CODStatus = "pending" | "received";

interface Product { name: string; qty: number; price: number }
interface Order {
  _id?: string;
  id: string; customer: string; whatsapp: string; city: string;
  address: string; amount: number; handledBy: "Sami" | "Abid";
  status: OrderStatus; codStatus: CODStatus; date: string;
  courier?: string; trackingNo?: string; trackingNo2?: string; products: Product[];
  notes?: string; type: "COD" | "NON-COD";
  province?: string;
  altPhone?: string;
  deliveryCharges?: number;
  receivedDate?: string;
  receiptUrl?: string;
  advancePayment?: number;
  paymentType?: "Online" | "Courier";
}

// ─── Debounce Custom Hook ──────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ─── Mock Data & Constants ──────────────────────────────────────────────────────
const PROVINCE_CITIES: Record<string, string[]> = PROVINCE_CITIES_MAP;
const PROVINCES = Object.keys(PROVINCE_CITIES);

const MOCK_ORDERS: Order[] = [];
const ACTIVITY_DATA: any[] = [];

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

async function safeResponseJson(res: Response) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
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
  { id: "create-order", label: "Create Parcel", icon: Plus },
  { id: "cod-parcels", label: "COD Parcels", icon: Banknote },
  { id: "non-cod-parcels", label: "Non-COD Parcels", icon: Package },
  { id: "orders", label: "All Parcels", icon: Layers },
  { id: "tracking", label: "Tracking", icon: Truck },
  { id: "cod", label: "COD Receiving", icon: Receipt },
  { id: "settlements", label: "Settlements", icon: BarChart2 },
  { id: "reports", label: "Reports", icon: ClipboardList },
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
const SidebarMemo = memo(Sidebar);

// ─── Top Navbar Header ─────────────────────────────────────────────────────────

function Header({ 
  screen, 
  setScreen, 
  onSearchClick, 
  onLogout, 
  user,
  offlineOrdersCount = 0,
  isOffline = false,
  onSyncClick
}: { 
  screen: Screen;
  setScreen: (s: Screen) => void;
  onSearchClick: () => void; 
  onLogout: () => void;
  user: any;
  offlineOrdersCount?: number;
  isOffline?: boolean;
  onSyncClick?: () => void;
}) {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time ? time.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  const timeStr = time ? time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm print:hidden">
      {/* Upper Brand & Utility Bar */}
      <div className="px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 border-b border-slate-100">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setScreen("dashboard")}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-9 h-9 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Layers size={18} className="text-[#D4AF37]" />
          </div>
          <div>
            <div className="font-extrabold text-[#0F172A] text-base tracking-tight leading-none flex items-center gap-2">
              <span>HK FABRIC</span>
              <span className="text-[10px] font-mono font-bold bg-[#D4AF37]/15 text-[#0F172A] px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                COURIER ERP
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bedsheets & Home Textiles Logistics</span>
          </div>
        </div>

        {/* Global Search Quick Trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex flex-1 max-w-sm items-center gap-2 px-3 py-1.5 bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-500 transition-colors shadow-inner"
        >
          <Search size={14} className="text-slate-400" />
          <span>Search orders, customer phone, tracking...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white border border-slate-200 text-slate-400 rounded px-1.5 py-0.5 shadow-xs">⌘K</kbd>
        </button>

        {/* Right Utility Stack */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Offline Indicator / Sync Now Pill */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-300/80 px-3 py-1.5 rounded-xl animate-pulse">
              <AlertCircle size={14} className="text-amber-600" />
              <span>Offline Mode</span>
            </div>
          ) : offlineOrdersCount > 0 && onSyncClick && (
            <button
              onClick={onSyncClick}
              className="flex items-center gap-1.5 text-xs font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-400 px-3 py-1.5 rounded-xl shadow-md transition-all animate-bounce"
              title="Click to push offline orders to PostgreSQL database"
            >
              <Upload size={14} />
              <span>Sync Now ({offlineOrdersCount})</span>
            </button>
          )}

          {installPrompt && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] px-3 py-1.5 rounded-xl transition-all shadow-sm"
              title="Install HK Fabric PWA Desktop App"
            >
              <Download size={13} className="text-[#D4AF37]" />
              <span className="hidden lg:inline">Install PWA</span>
            </button>
          )}

          <div className="hidden xl:flex items-center gap-2">
            <a 
              href="https://postextracking.com.pk/" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors border border-indigo-100"
            >
              PostEx
            </a>
            <a 
              href="https://ep.gov.pk/track.asp" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors border border-emerald-100"
            >
              Pak Post
            </a>
          </div>

          <div className="hidden sm:flex flex-col items-end border-l border-slate-200 pl-3">
            <span className="text-[10px] text-slate-400 leading-none">{dateStr}</span>
            <span className="text-xs font-mono font-bold text-[#0F172A] mt-0.5 leading-none">{timeStr}</span>
          </div>

          {user && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#0F172A]">{user.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">Staff Admin</div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 sm:px-2.5 sm:py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors border border-red-200 flex items-center gap-1"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Top Navigation Category Bar */}
      <div className="px-4 lg:px-8 py-2 bg-slate-50/80 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = screen === id || (screen === "order-detail" && id === "orders");
          return (
            <button
              key={id}
              onClick={() => setScreen(id as Screen)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0",
                active 
                  ? "bg-[#0F172A] text-white shadow-sm ring-1 ring-black/10" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              <Icon size={14} className={cn(active ? "text-[#D4AF37]" : "text-slate-400")} />
              <span>{label}</span>
              {id === "create-order" && (
                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-[#D4AF37] text-[#0F172A] text-[10px] font-extrabold">
                  +
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
const HeaderMemo = memo(Header);

// ─── Global Search ─────────────────────────────────────────────────────────────

function GlobalSearch({ open, onClose, setScreen, setSelectedOrderId, orders }: {
  open: boolean; onClose: () => void;
  setScreen: (s: Screen) => void; setSelectedOrderId: (id: string) => void;
  orders: Order[];
}) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  
  const matchingCustomers = debouncedQ.length > 1
    ? orders.filter(o => o.customer.toLowerCase().includes(debouncedQ.toLowerCase()) || o.whatsapp.includes(debouncedQ) || o.address?.toLowerCase().includes(debouncedQ.toLowerCase()) || o.city?.toLowerCase().includes(debouncedQ.toLowerCase()))
    : [];
  const matchingOrders = debouncedQ.length > 1
    ? orders.filter(o => o.id.toLowerCase().includes(debouncedQ.toLowerCase()))
    : [];
  const matchingTracking = debouncedQ.length > 1
    ? orders.filter(o => o.trackingNo?.toLowerCase().includes(debouncedQ.toLowerCase()))
    : [];
  const matchingCOD = debouncedQ.length > 1
    ? orders.filter(o => o.type === "COD" && (o.id.toLowerCase().includes(debouncedQ.toLowerCase()) || o.customer.toLowerCase().includes(debouncedQ.toLowerCase()) || o.whatsapp.includes(debouncedQ)))
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

// ─── Offline Orders Reconnection Sync Modal ─────────────────────────────────────

function OfflineSyncModal({
  open,
  offlineOrders,
  isSyncing,
  onSync,
  onClose,
}: {
  open: boolean;
  offlineOrders: Order[];
  isSyncing: boolean;
  onSync: () => void;
  onClose: () => void;
}) {
  if (!open || offlineOrders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-md w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-[#0F172A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#D4AF37] flex items-center justify-center font-bold">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Internet Connection Restored!</h3>
              <p className="text-xs text-slate-300">Sync offline orders to PostgreSQL database</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
            Internet is back online! You created <strong>{offlineOrders.length} {offlineOrders.length === 1 ? 'order' : 'orders'}</strong> locally during internet outage / load-shedding. Click below to push them directly to the database.
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Pending Offline Queue ({offlineOrders.length})</div>
            {offlineOrders.map((o, i) => (
              <div key={o.id || i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="font-bold text-[#0F172A]">{o.id}</span>
                <span className="text-slate-600 font-sans truncate max-w-[120px]">{o.customer}</span>
                <span className="font-bold text-emerald-700">{formatPKR(o.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Sync Later
          </button>
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? (
              <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Syncing Database...</>
            ) : (
              <><Upload size={15} className="text-[#D4AF37]" /> Sync {offlineOrders.length} Orders Now</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Duplicate Order Warning Modal ─────────────────────────────────────────────

function DuplicateWarningModal({
  open,
  data,
  onClose,
  onViewExisting,
}: {
  open: boolean;
  data: { existingOrder: any; message: string } | null;
  onClose: () => void;
  onViewExisting: (id: string) => void;
}) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-300 animate-bounce flex-shrink-0" />
            <div>
              <h3 className="font-bold text-base">Duplicate Entry Warning</h3>
              <p className="text-xs text-rose-100">Same customer & amount within 15 mins</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-rose-700 text-rose-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{data.message}</span>
          </div>

          {data.existingOrder && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Order Details</div>
              <div className="flex justify-between font-mono font-bold text-slate-800">
                <span className="text-slate-500">Order No:</span>
                <span className="text-indigo-600 font-bold">{data.existingOrder.orderNo || data.existingOrder.id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{data.existingOrder.customerName || data.existingOrder.customer?.name || "Customer"}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-500">WhatsApp:</span>
                <span className="font-mono">{data.existingOrder.phone || data.existingOrder.customer?.phone}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-mono font-bold text-emerald-700">{formatPKR(data.existingOrder.totalAmount || data.existingOrder.amount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-500">Status:</span>
                <span className="capitalize font-semibold text-slate-800">{data.existingOrder.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel / Close
          </button>
          {data.existingOrder && (
            <button
              onClick={() => {
                onClose();
                onViewExisting(data.existingOrder.orderNo || data.existingOrder.id);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Eye size={14} /> View Existing Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ setScreen, onViewOrder, orders }: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  orders: Order[];
}) {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) return null;
      return safeResponseJson(res);
    }
  });

  const { data: activityLogs = [] } = useQuery<any[]>({
    queryKey: ['activities'],
    queryFn: async () => {
      const res = await fetch('/api/activities');
      if (!res.ok) return [];
      return (await safeResponseJson(res)) || [];
    }
  });

  const codCount = stats?.cod?.count ?? orders.filter(o => o.type === "COD" && o.status !== "void").length;
  const codSales = stats?.cod?.sales ?? orders.filter(o => o.type === "COD" && o.status !== "void").reduce((a, b) => a + b.amount, 0);
  const pendingCOD = stats?.cod?.pendingAmount ?? orders.filter(o => o.type === "COD" && o.codStatus === "pending" && o.status !== "void").reduce((a, b) => a + b.amount, 0);
  const receivedCOD = stats?.cod?.receivedAmount ?? orders.filter(o => o.type === "COD" && o.codStatus === "received").reduce((a, b) => a + b.amount, 0);

  const nonCodCount = stats?.nonCod?.count ?? orders.filter(o => o.type === "NON-COD" && o.status !== "void").length;
  const nonCodSales = stats?.nonCod?.sales ?? orders.filter(o => o.type === "NON-COD" && o.status !== "void").reduce((a, b) => a + b.amount, 0);

  const totalCount = stats?.overall?.totalCount ?? (codCount + nonCodCount);
  const totalSales = stats?.overall?.totalSales ?? (codSales + nonCodSales);

  const pendingTracking = orders.filter(o => !o.trackingNo && o.status !== "void").length;
  const pendingCODOrdersCount = orders.filter(o => o.type === "COD" && o.codStatus === "pending" && o.status !== "void").length;

  const chartData = useMemo(() => {
    const map: Record<string, { date: string; cod: number; nonCod: number; total: number }> = {};
    orders.forEach(o => {
      if (o.status === "void") return;
      const dateKey = o.date || "Today";
      if (!map[dateKey]) map[dateKey] = { date: dateKey, cod: 0, nonCod: 0, total: 0 };
      if (o.type === "COD") map[dateKey].cod += 1;
      else map[dateKey].nonCod += 1;
      map[dateKey].total += 1;
    });
    return Object.values(map).slice(-7);
  }, [orders]);

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-PK", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* ─── 1. Header & Greeting Banner ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">{greetingTime}, Admin</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Here's what's happening with your courier business today.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span>{todayFormatted}</span>
          </div>
          <button 
            onClick={() => setScreen("create-order")}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={15} /> New Parcel
          </button>
        </div>
      </div>

      {/* ─── 2. Operational Attention & Quick Actions Bar ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Actionable Alerts (8 Cols) */}
        <div className="md:col-span-8 flex flex-col sm:flex-row gap-3">
          <div 
            onClick={() => setScreen("tracking")}
            className={cn(
              "flex-1 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group",
              pendingTracking > 0
                ? "bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/80"
                : "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100/50"
            )}
          >
            <div className={cn(
              "p-2.5 rounded-lg flex-shrink-0",
              pendingTracking > 0 ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"
            )}>
              <Truck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Awaiting Courier Tracking</span>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {pendingTracking > 0 ? (
                  <span className="font-bold text-amber-800">{pendingTracking} parcels require tracking numbers</span>
                ) : (
                  <span className="text-emerald-700">All active parcels have tracking numbers</span>
                )}
              </div>
            </div>
          </div>

          <div 
            onClick={() => setScreen("cod-parcels")}
            className={cn(
              "flex-1 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group",
              pendingCODOrdersCount > 0
                ? "bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100/80"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
            )}
          >
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-700 flex-shrink-0">
              <Banknote size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pending COD Collection</span>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                <span className="font-bold text-indigo-900">{formatPKR(pendingCOD)}</span>
                <span className="text-slate-500 ml-1">({pendingCODOrdersCount} parcels)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Quick Actions Pill Container (4 Cols) */}
        <div className="md:col-span-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-around gap-1">
          <button onClick={() => setScreen("cod-parcels")} title="COD Parcels" className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg text-center font-medium transition-colors flex flex-col items-center gap-1">
            <Banknote size={16} className="text-emerald-600" />
            <span className="text-[10px] font-bold">COD</span>
          </button>
          <button onClick={() => setScreen("non-cod-parcels")} title="Non-COD Parcels" className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg text-center font-medium transition-colors flex flex-col items-center gap-1">
            <Package size={16} className="text-indigo-600" />
            <span className="text-[10px] font-bold">Non-COD</span>
          </button>
          <button onClick={() => setScreen("tracking")} title="Add Tracking" className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg text-center font-medium transition-colors flex flex-col items-center gap-1">
            <Truck size={16} className="text-amber-600" />
            <span className="text-[10px] font-bold">Tracking</span>
          </button>
          <button onClick={() => setScreen("settlements")} title="Settlements" className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg text-center font-medium transition-colors flex flex-col items-center gap-1">
            <Receipt size={16} className="text-purple-600" />
            <span className="text-[10px] font-bold">Settlement</span>
          </button>
          <button onClick={() => setScreen("daily-closing")} title="Daily Closing" className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg text-center font-medium transition-colors flex flex-col items-center gap-1">
            <Clock size={16} className="text-slate-600" />
            <span className="text-[10px] font-bold">Closing</span>
          </button>
        </div>
      </div>

      {/* ─── 3. Dedicated Sales Revenue Breakdown Row (COD Sales, Non-COD Sales, Grand Total Sales) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COD Sales Card */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between bg-gradient-to-b from-emerald-50/30 to-white group hover:border-emerald-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span>COD Sales Revenue</span>
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Banknote size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mt-3">
              {formatPKR(codSales)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 font-mono mt-3 border-t border-emerald-100 pt-2 flex items-center justify-between">
            <span>{codCount} COD Parcels</span>
            <button onClick={() => setScreen("cod-parcels")} className="font-bold text-emerald-700 hover:underline">View COD →</button>
          </div>
        </div>

        {/* Non-COD Sales Card */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 to-white group hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-indigo-800 text-xs font-bold uppercase tracking-wider">
              <span>Non-COD Sales Revenue</span>
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                <Package size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-700 mt-3">
              {formatPKR(nonCodSales)}
            </div>
          </div>
          <div className="text-[11px] text-indigo-800 font-mono mt-3 border-t border-indigo-100 pt-2 flex items-center justify-between">
            <span>{nonCodCount} Prepaid Parcels</span>
            <button onClick={() => setScreen("non-cod-parcels")} className="font-bold text-indigo-700 hover:underline">View Non-COD →</button>
          </div>
        </div>

        {/* Grand Total Sales Revenue - Financial Highlight */}
        <div className="bg-[#0F172A] text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-3 -bottom-3 text-slate-800/40 opacity-30 group-hover:scale-110 transition-transform">
            <DollarSign size={90} />
          </div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Grand Total Sales</span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-[#D4AF37]">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#D4AF37] mt-3">
              {formatPKR(totalSales)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-3 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>{totalCount} Total Parcels</span>
            <span className="text-[#D4AF37] font-bold">100% Reconciled</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Secondary Operational Metrics (Pending COD, Received COD, Total Volume) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Parcels Volume */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Parcels Volume</span>
            <span className="text-xl font-extrabold font-mono text-[#0F172A]">{totalCount.toLocaleString()}</span>
          </div>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Box size={18} />
          </div>
        </div>

        {/* Pending COD Cash */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between bg-amber-50/20">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Pending COD Cash</span>
            <span className="text-xl font-extrabold font-mono text-amber-700">{formatPKR(pendingCOD)}</span>
          </div>
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
            <Clock size={18} />
          </div>
        </div>

        {/* Received COD Cash */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between bg-emerald-50/20">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Received COD Cash</span>
            <span className="text-xl font-extrabold font-mono text-emerald-700">{formatPKR(receivedCOD)}</span>
          </div>
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* ─── 4. Split Financial Breakdown + Analytics Chart Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COD & Non-COD Detailed Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* COD Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Banknote size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">COD Operations</h3>
                  <span className="text-[10px] text-slate-400">Cash collection on delivery</span>
                </div>
              </div>
              <button onClick={() => setScreen("cod-parcels")} className="text-[11px] font-bold text-emerald-700 hover:underline">
                Manage COD →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-sans block">COD Parcels</span>
                <span className="text-lg font-extrabold text-slate-900">{codCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-sans block">COD Sales</span>
                <span className="text-lg font-extrabold text-emerald-700">{formatPKR(codSales)}</span>
              </div>
            </div>
          </div>

          {/* Non-COD Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Non-COD Operations</h3>
                  <span className="text-[10px] text-slate-400">Prepaid & Direct payment</span>
                </div>
              </div>
              <button onClick={() => setScreen("non-cod-parcels")} className="text-[11px] font-bold text-indigo-700 hover:underline">
                Manage Non-COD →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-sans block">Non-COD Parcels</span>
                <span className="text-lg font-extrabold text-slate-900">{nonCodCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-sans block">Non-COD Sales</span>
                <span className="text-lg font-extrabold text-indigo-700">{formatPKR(nonCodSales)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Chart Panel (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-2">
                <BarChart3 size={15} className="text-slate-500" /> Daily Parcel Trends
              </h3>
              <span className="text-[11px] text-slate-400">Volume breakdown by date (COD vs Non-COD)</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 text-[11px]">COD</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-600 text-[11px]">Non-COD</span>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <BarChart3 size={32} className="text-slate-300 mb-2" />
              <span className="text-xs font-medium text-slate-500">No parcel activity recorded yet</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Create your first parcel to view daily trends</span>
            </div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="cod" name="COD Parcels" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="nonCod" name="Non-COD Parcels" fill="#6366F1" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. Recent Parcels Table & Recent Activity Log Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Parcels Table (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Recent Parcels</h2>
              <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {orders.length} Total
              </span>
            </div>
            <button onClick={() => setScreen("orders")} className="text-xs text-slate-500 hover:text-[#0F172A] font-semibold transition-colors flex items-center gap-1">
              View all <ChevronRight size={13} />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                <Box size={28} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No parcels yet</h4>
                <p className="text-xs text-slate-500 mt-0.5">Create your first parcel to get started with tracking.</p>
              </div>
              <button 
                onClick={() => setScreen("create-order")}
                className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Create Parcel
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">Order ID</th>
                    <th className="px-4 py-2.5 font-bold">Customer</th>
                    <th className="px-4 py-2.5 font-bold">Type</th>
                    <th className="px-4 py-2.5 font-bold text-right">Amount</th>
                    <th className="px-4 py-2.5 font-bold">Agent</th>
                    <th className="px-4 py-2.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {orders.slice(0, 6).map(o => (
                    <tr key={o.id} onClick={() => onViewOrder(o.id)} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 group-hover:text-blue-600">{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{o.customer}</div>
                        <div className="text-[10px] text-slate-400">{o.city}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={cn(
                          "px-2 py-0.5 rounded font-extrabold text-[10px]",
                          o.type === "COD" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                        )}>
                          {o.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatPKR(o.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          o.handledBy === "Sami" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                        )}>
                          {o.handledBy}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity Audit Trail (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Activity size={15} className="text-slate-500" /> Recent Activity
            </h3>
            <button onClick={() => setScreen("activity-log")} className="text-[10px] font-bold text-slate-500 hover:text-slate-800">
              Log →
            </button>
          </div>

          {activityLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Activity size={24} className="text-slate-300 mb-1.5" />
              <span className="text-xs font-medium text-slate-500">No recent activity</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Staff audit actions will appear here</span>
            </div>
          ) : (
            <div className="space-y-3 font-sans overflow-y-auto max-h-[260px] pr-1 scrollbar-hide">
              {activityLogs.slice(0, 5).map((log: any, idx: number) => (
                <div key={log.id || idx} className="flex items-start gap-2.5 text-xs">
                  <div className="p-1.5 rounded-full bg-slate-100 text-slate-600 mt-0.5 flex-shrink-0">
                    <User size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{log.action || "Activity"}</span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{log.details || log.performedBy || "Staff Action"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COD Parcels Screen ────────────────────────────────────────────────────────

function CODParcelsScreen({ setScreen, onViewOrder, onEditOrder, onVoidOrder, onUpdateStatus, onReceiveCOD }: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  onEditOrder: (id: string) => void;
  onVoidOrder: (id: string, performer: "Sami" | "Abid") => void;
  onUpdateStatus?: (id: string, status: OrderStatus, hasTracking?: boolean) => void;
  onReceiveCOD?: (id: string, date: string, hasTracking?: boolean) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [codStatusFilter, setCodStatusFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [trackingStateFilter, setTrackingStateFilter] = useState<"all" | "awaiting" | "tracked">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: codOrders = [], isLoading } = useQuery({
    queryKey: ['orders', 'COD', statusFilter, codStatusFilter],
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const params = new URLSearchParams({ orderType: 'COD' });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (codStatusFilter !== 'all') params.append('codStatus', codStatusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const raw = (await safeResponseJson(res));
      const data = Array.isArray(raw) ? raw : (raw?.orders || []);
      return data.map((o: any) => ({
        _id: o.id,
        id: o.orderNo,
        customer: o.customer?.name || "Unknown",
        whatsapp: o.customer?.phone || "",
        altPhone: o.customer?.alternatePhone || "",
        province: o.customer?.province || getProvinceFromCity(o.customer?.city),
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
        paymentType: o.paymentType || "Courier",
        deliveryCharges: o.deliveryCharges || 0,
        advancePayment: o.advancePayment || 0,
      }));
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) return null;
      return safeResponseJson(res);
    }
  });

  const awaitingCount = codOrders.filter((o: any) => !o.trackingNo).length;
  const trackedCount = codOrders.filter((o: any) => !!o.trackingNo).length;

  const filtered = codOrders.filter((o: any) => {
    if (trackingStateFilter === 'awaiting' && o.trackingNo) return false;
    if (trackingStateFilter === 'tracked' && !o.trackingNo) return false;
    if (courierFilter !== 'all' && o.courier?.toLowerCase() !== courierFilter.toLowerCase()) return false;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      const matchNo = o.id.toLowerCase().includes(q);
      const matchCust = o.customer.toLowerCase().includes(q);
      const matchPhone = o.whatsapp.includes(q);
      const matchTrack = o.trackingNo?.toLowerCase().includes(q);
      const matchCity = o.city?.toLowerCase().includes(q);
      const matchAddress = o.address?.toLowerCase().includes(q);
      if (!matchNo && !matchCust && !matchPhone && !matchTrack && !matchCity && !matchAddress) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Banknote className="text-emerald-600" size={22} />
            COD Parcels
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Dedicated Cash-on-Delivery operations & tracking</p>
        </div>
        <button
          onClick={() => setScreen("create-order")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
        >
          <Plus size={14} /> New COD Parcel
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="COD Parcels"
          value={stats?.cod?.count ?? filtered.length}
          sub="Total Cash-on-Delivery"
          icon={Package}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="COD Sales"
          value={formatPKR(stats?.cod?.sales ?? 0)}
          sub="Total COD Order Value"
          icon={TrendingUp}
          color="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Pending COD"
          value={formatPKR(stats?.cod?.pendingAmount ?? 0)}
          sub="Awaiting Settlement"
          icon={Clock}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Received COD"
          value={formatPKR(stats?.cod?.receivedAmount ?? 0)}
          sub="Settled & Received"
          icon={CheckCircle2}
          color="bg-teal-50 text-teal-700"
        />
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200/60 flex-wrap">
        <button
          onClick={() => setTrackingStateFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            trackingStateFilter === "all" ? "bg-white text-[#0F172A] font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          All COD ({codOrders.length})
        </button>
        <button
          onClick={() => setTrackingStateFilter("awaiting")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            trackingStateFilter === "awaiting" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 bg-amber-50/70 hover:bg-amber-100"
          )}
        >
          <Clock size={13} /> Awaiting Tracking ({awaitingCount})
        </button>
        <button
          onClick={() => setTrackingStateFilter("tracked")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            trackingStateFilter === "tracked" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Truck size={13} /> Tracked / Shipped ({trackedCount})
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search COD order, customer, phone, tracking..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>

          <FieldSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 w-auto"
          >
            <option value="all">All Parcel Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="void">Void</option>
          </FieldSelect>

          <FieldSelect
            value={codStatusFilter}
            onChange={e => setCodStatusFilter(e.target.value)}
            className="text-xs py-1.5 w-auto font-bold text-amber-700"
          >
            <option value="all">All COD Statuses</option>
            <option value="pending">COD Pending</option>
            <option value="received">COD Received</option>
          </FieldSelect>

          <FieldSelect
            value={courierFilter}
            onChange={e => setCourierFilter(e.target.value)}
            className="text-xs py-1.5 w-auto"
          >
            <option value="all">All Couriers</option>
            <option value="PostEx">PostEx</option>
            <option value="TCS">TCS</option>
            <option value="Leopard">Leopard</option>
            <option value="PakPost">PakPost</option>
            <option value="Other">Other</option>
          </FieldSelect>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="font-bold text-slate-700">{filtered.length}</span> COD parcels
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Loading COD parcels...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No COD parcels found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Address / City</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Parcel Date</th>
                  <th className="py-3 px-4 text-right">COD Amount</th>
                  <th className="py-3 px-4">Tracking / Courier</th>
                  <th className="py-3 px-4">Parcel Status</th>
                  <th className="py-3 px-4">COD Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                      <button onClick={() => onViewOrder(o.id)} className="hover:underline text-indigo-600">
                        {o.id}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{o.customer}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{o.whatsapp}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px]">
                      <div className="truncate text-slate-700">{o.address}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 max-w-[160px] truncate">
                        {o.products.map((p: any) => `${p.name} (${p.qty})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{o.date}</td>
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <div className="text-slate-900 font-bold text-xs">{formatPKR(o.amount)}</div>
                      {o.advancePayment > 0 ? (
                        <div className="text-[10px] font-sans">
                          <span className="text-emerald-700 font-medium">Adv: -{formatPKR(o.advancePayment)}</span>
                          <div className="font-mono font-bold text-[#D4AF37]">{formatPKR(Math.max(0, o.amount - o.advancePayment))} COD</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-sans">Full COD</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {o.trackingNo ? (
                        <div>
                          <div className="font-semibold text-slate-800">{o.trackingNo}</div>
                          <div className="text-[10px] text-indigo-600 font-bold uppercase">{o.courier}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-md border border-amber-200 shadow-sm whitespace-nowrap">
                          <Clock size={12} className="text-amber-600" /> Awaiting Tracking Number
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 px-4"><StatusBadge status={o.codStatus} /></td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button onClick={() => onViewOrder(o.id)} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200" title="View Order">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onEditOrder(o.id)} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200" title="Edit Order">
                        <Edit2 size={14} />
                      </button>
                      {o.status !== "delivered" && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(o._id || o.id, "delivered", Boolean(o.trackingNo))}
                          className={cn(
                            "p-1 rounded border inline-flex transition-all",
                            o.trackingNo 
                              ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200" 
                              : "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                          )}
                          title={o.trackingNo ? "Mark as Delivered" : "Tracking Number required before marking Delivered"}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {o.status !== "returned" && o.status !== "delivered" && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(o._id || o.id, "returned", Boolean(o.trackingNo))}
                          className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 border border-rose-200 inline-flex"
                          title="Mark as Returned"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      {o.codStatus === "pending" && onReceiveCOD && (
                        <button
                          onClick={() => onReceiveCOD(o._id || o.id, new Date().toISOString().split('T')[0], Boolean(o.trackingNo))}
                          className={cn(
                            "px-1.5 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 shadow-sm transition-all",
                            o.trackingNo
                              ? "text-amber-700 hover:text-amber-900 hover:bg-amber-100 bg-amber-50 border border-amber-300"
                              : "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                          )}
                          title={o.trackingNo ? "Mark COD Cash Received" : "Tracking Number required before receiving COD"}
                        >
                          <Banknote size={12} />
                          <span>Receive</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Non-COD Parcels Screen ────────────────────────────────────────────────────

function NonCODParcelsScreen({ setScreen, onViewOrder, onEditOrder, onVoidOrder, onUpdateStatus }: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  onEditOrder: (id: string) => void;
  onVoidOrder: (id: string, performer: "Sami" | "Abid") => void;
  onUpdateStatus?: (id: string, status: OrderStatus, hasTracking?: boolean) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [trackingStateFilter, setTrackingStateFilter] = useState<"all" | "awaiting" | "tracked">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: nonCodOrders = [], isLoading } = useQuery({
    queryKey: ['orders', 'NON-COD', statusFilter],
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const params = new URLSearchParams({ orderType: 'NON-COD' });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const raw = (await safeResponseJson(res));
      const data = Array.isArray(raw) ? raw : (raw?.orders || []);
      return data.map((o: any) => ({
        _id: o.id,
        id: o.orderNo,
        customer: o.customer?.name || "Unknown",
        whatsapp: o.customer?.phone || "",
        altPhone: o.customer?.alternatePhone || "",
        province: o.customer?.province || getProvinceFromCity(o.customer?.city),
        city: o.customer?.city || "",
        address: o.customer?.address || "",
        amount: o.totalAmount,
        handledBy: o.handledBy,
        status: o.status.toLowerCase(),
        date: new Date(o.createdAt).toISOString().split('T')[0],
        courier: o.trackingEntries?.[0]?.courierName,
        trackingNo: o.trackingEntries?.[0]?.trackingNumber,
        products: o.items?.map((i: any) => ({ name: i.productName, qty: i.qty, price: i.unitPrice })) || [],
        type: o.orderType,
        notes: o.notes,
        paymentType: o.paymentType || "Online",
        deliveryCharges: o.deliveryCharges || 0,
        advancePayment: o.advancePayment || 0,
      }));
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) return null;
      return safeResponseJson(res);
    }
  });

  const awaitingCount = nonCodOrders.filter((o: any) => !o.trackingNo).length;
  const trackedCount = nonCodOrders.filter((o: any) => !!o.trackingNo).length;

  const filtered = nonCodOrders.filter((o: any) => {
    if (trackingStateFilter === 'awaiting' && o.trackingNo) return false;
    if (trackingStateFilter === 'tracked' && !o.trackingNo) return false;
    if (courierFilter !== 'all' && o.courier?.toLowerCase() !== courierFilter.toLowerCase()) return false;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      const matchNo = o.id.toLowerCase().includes(q);
      const matchCust = o.customer.toLowerCase().includes(q);
      const matchPhone = o.whatsapp.includes(q);
      const matchTrack = o.trackingNo?.toLowerCase().includes(q);
      const matchCity = o.city?.toLowerCase().includes(q);
      const matchAddress = o.address?.toLowerCase().includes(q);
      if (!matchNo && !matchCust && !matchPhone && !matchTrack && !matchCity && !matchAddress) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Package className="text-indigo-600" size={22} />
            Non-COD Parcels
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Prepaid & Online paid customer order management</p>
        </div>
        <button
          onClick={() => setScreen("create-order")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
        >
          <Plus size={14} /> New Non-COD Parcel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Non-COD Parcels"
          value={stats?.nonCod?.count ?? filtered.length}
          sub="Prepaid / Online Paid Orders"
          icon={Package}
          color="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Non-COD Sales"
          value={formatPKR(stats?.nonCod?.sales ?? 0)}
          sub="Total Non-COD Revenue"
          icon={TrendingUp}
          color="bg-blue-50 text-blue-700"
        />
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200/60 flex-wrap">
        <button
          onClick={() => setTrackingStateFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            trackingStateFilter === "all" ? "bg-white text-[#0F172A] font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          All Non-COD ({nonCodOrders.length})
        </button>
        <button
          onClick={() => setTrackingStateFilter("awaiting")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            trackingStateFilter === "awaiting" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 bg-amber-50/70 hover:bg-amber-100"
          )}
        >
          <Clock size={13} /> Awaiting Tracking ({awaitingCount})
        </button>
        <button
          onClick={() => setTrackingStateFilter("tracked")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            trackingStateFilter === "tracked" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Truck size={13} /> Tracked / Shipped ({trackedCount})
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Non-COD order, customer, phone, tracking..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>

          <FieldSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 w-auto"
          >
            <option value="all">All Parcel Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="void">Void</option>
          </FieldSelect>

          <FieldSelect
            value={courierFilter}
            onChange={e => setCourierFilter(e.target.value)}
            className="text-xs py-1.5 w-auto"
          >
            <option value="all">All Couriers</option>
            <option value="PostEx">PostEx</option>
            <option value="TCS">TCS</option>
            <option value="Leopard">Leopard</option>
            <option value="PakPost">PakPost</option>
            <option value="Other">Other</option>
          </FieldSelect>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="font-bold text-slate-700">{filtered.length}</span> Non-COD parcels
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Loading Non-COD parcels...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No Non-COD parcels found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Address / City</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Parcel Date</th>
                  <th className="py-3 px-4 text-right">Order Total</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Tracking / Courier</th>
                  <th className="py-3 px-4">Parcel Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                      <button onClick={() => onViewOrder(o.id)} className="hover:underline text-indigo-600">
                        {o.id}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{o.customer}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{o.whatsapp}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px]">
                      <div className="truncate text-slate-700">{o.address}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 max-w-[160px] truncate">
                        {o.products.map((p: any) => `${p.name} (${p.qty})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{o.date}</td>
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <div className="text-indigo-700 font-bold text-xs">{formatPKR(o.amount)}</div>
                      <div className="text-[10px] text-emerald-600 font-sans font-semibold">100% Prepaid</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold">
                        {o.paymentType || "Online"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {o.trackingNo ? (
                        <div>
                          <div className="font-semibold text-slate-800">{o.trackingNo}</div>
                          <div className="text-[10px] text-indigo-600 font-bold uppercase">{o.courier}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-md border border-amber-200 shadow-sm whitespace-nowrap">
                          <Clock size={12} className="text-amber-600" /> Awaiting Tracking Number
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button onClick={() => onViewOrder(o.id)} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200" title="View Order">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onEditOrder(o.id)} className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200" title="Edit Order">
                        <Edit2 size={14} />
                      </button>
                      {o.status !== "delivered" && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(o._id || o.id, "delivered", Boolean(o.trackingNo))}
                          className={cn(
                            "p-1 rounded border inline-flex transition-all",
                            o.trackingNo 
                              ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200" 
                              : "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                          )}
                          title={o.trackingNo ? "Mark as Delivered" : "Tracking Number required before marking Delivered"}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {o.status !== "returned" && o.status !== "delivered" && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(o._id || o.id, "returned", Boolean(o.trackingNo))}
                          className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 border border-rose-200 inline-flex"
                          title="Mark as Returned"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  onSaveOrder: (order: Order) => Promise<any> | void;
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
  const [paymentType, setPaymentType] = useState<"Online" | "Courier">("Online");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState([{ name: "", qty: 1, price: 0 }]);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const subtotal = products.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const grandTotal = subtotal + deliveryCharges;
  const remainingAmount = Math.max(0, grandTotal - advancePayment);
  const orderIdToSave = editOrderId || `HKF-2026-${String(orders.length + 1).padStart(6, "0")}`;

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Automatically enforce NON-COD business rule: NON-COD requires advance == grandTotal.
  // If user sets NON-COD but advance < grandTotal, automatically convert to COD and show a toast notification.
  useEffect(() => {
    if (orderType === "NON-COD" && advancePayment < grandTotal && grandTotal > 0) {
      setOrderType("COD");
      triggerToast(`Balance remaining (Rs ${Math.max(0, grandTotal - advancePayment).toLocaleString()}). Order type set to COD.`);
      setErrorMsg("");
    }
  }, [orderType, advancePayment, grandTotal]);

  const handleOrderTypeChange = (newType: "COD" | "NON-COD") => {
    setErrorMsg("");
    if (newType === "NON-COD") {
      if (advancePayment < grandTotal) {
        const rem = Math.max(0, grandTotal - advancePayment);
        triggerToast(`Cannot select NON-COD: Remaining balance of Rs ${rem.toLocaleString()} must be collected via COD.`);
        return;
      }
    }
    setOrderType(newType);
  };

  const addProduct = () => setProducts(p => [...p, { name: "", qty: 1, price: 0 }]);
  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));
  const updateProduct = (i: number, field: string, val: string | number) =>
    setProducts(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleSave = async (shouldPrintAfter: boolean = false) => {
    if (isSubmitting || saved) return;

    if (!whatsapp.trim()) {
      setErrorMsg("WhatsApp number is mandatory!");
      return;
    }
    const cleanDigits = whatsapp.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setErrorMsg("WhatsApp number must be a valid 10-11 digit phone number (e.g. 03001234567)!");
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
    if (advancePayment > grandTotal) {
      setErrorMsg("Advance payment cannot exceed Grand Total.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    const remBalance = Math.max(0, grandTotal - advancePayment);
    const finalType = remBalance === 0 ? "NON-COD" : "COD";

    const newOrder: Order = {
      id: orderIdToSave,
      customer: customerName,
      whatsapp: whatsapp,
      altPhone: altPhone,
      province: province,
      city: city,
      address: address,
      amount: grandTotal,
      handledBy: handledBy,
      status: editOrderId ? (orders.find(item => item.id === editOrderId)?.status || "pending") : "pending",
      codStatus: editOrderId ? (orders.find(item => item.id === editOrderId)?.codStatus || "pending") : "pending",
      date: editOrderId ? (orders.find(item => item.id === editOrderId)?.date || "2026-06-20") : "2026-06-20",
      products: products,
      type: finalType,
      deliveryCharges: deliveryCharges,
      advancePayment: advancePayment,
      paymentType: paymentType,
      notes: notes,
      courier: editOrderId ? orders.find(item => item.id === editOrderId)?.courier : undefined,
      trackingNo: editOrderId ? orders.find(item => item.id === editOrderId)?.trackingNo : undefined,
      receivedDate: editOrderId ? orders.find(item => item.id === editOrderId)?.receivedDate : undefined,
    };

    try {
      await onSaveOrder(newOrder);
      setSaved(true);
      if (shouldPrintAfter) {
        setShowPrint(true);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      setErrorMsg(e.message || "Failed to create order. Please check inputs.");
      return;
    }

    setTimeout(() => {
      setSaved(false);
      setIsSubmitting(false);
      if (!shouldPrintAfter) {
        if (editOrderId) clearEditId();
        setScreen("orders");
      }
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
    <div className="max-w-7xl w-full mx-auto pb-12 relative" onKeyDown={handleKeyDown}>
      {/* Floating Auto-dismissing Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#0F172A] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-bounce">
          <AlertCircle size={18} className="text-[#D4AF37] flex-shrink-0" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setScreen("orders")} 
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors bg-slate-100 text-slate-700"
            title="Back to Orders"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {editOrderId ? "Edit Parcel Details" : "Create New Parcel"}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                {orderIdToSave}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Enter customer details, payment setup, and item breakdown.</p>
          </div>
        </div>
        
        {/* Agent Toggle Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Handled By:</span>
          {(["Sami", "Abid"] as const).map(name => (
            <button 
              key={name} 
              type="button"
              onClick={() => setHandledBy(name)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                handledBy === name
                  ? "bg-[#0F172A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-semibold shadow-sm flex items-center gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" /> 
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout (72% Left Form / 28% Right Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields (8.5 / 12 Cols = ~71%) */}
        <div className="lg:col-span-8 space-y-6">

          {/* ─── SECTION 01 — CUSTOMER DETAILS ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold font-mono">
                  01
                </span>
                <h2 className="font-extrabold text-[#0F172A] text-base tracking-tight flex items-center gap-2">
                  <User size={18} className="text-slate-500" /> Customer Details
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">* Required fields</span>
            </div>

            {existing && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-3 shadow-sm">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-900">Existing Returning Customer Found!</div>
                  <div className="text-xs text-emerald-700 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="font-semibold">{existing.customer}</span>
                    <span>•</span>
                    <span>{orders.filter(o => o.whatsapp === whatsapp).length} total orders</span>
                    <span>•</span>
                    <span className="font-bold">Total Spent: {formatPKR(orders.filter(o => o.whatsapp === whatsapp).reduce((a, b) => a + b.amount, 0))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Layout: Row 1 (WhatsApp, Name, City) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4">
                <FieldInput 
                  label="WhatsApp / Phone Number" 
                  autoFocus 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="03001234567" 
                  maxLength={11} 
                  required 
                  className="font-mono text-sm py-2 px-3 rounded-xl" 
                />
              </div>
              <div className="sm:col-span-4">
                <FieldInput 
                  label="Customer Full Name" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="e.g. Muhammad Ali" 
                  required 
                  className="text-sm py-2 px-3 rounded-xl" 
                />
              </div>
              <div className="sm:col-span-4">
                <div className="flex flex-col gap-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    list="pakistan-cities"
                    value={city}
                    onChange={e => {
                      const val = e.target.value;
                      setCity(val);
                      const foundProv = Object.entries(PROVINCE_CITIES).find(([_, cities]) => cities.some(c => c.toLowerCase() === val.toLowerCase()));
                      if (foundProv) setProvince(foundProv[0]);
                    }}
                    placeholder="Search or select city"
                    required
                    className="block w-full rounded-xl border border-slate-200 py-2 px-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0F172A] focus:border-transparent text-sm transition-all bg-white font-medium"
                  />
                  <datalist id="pakistan-cities">
                    {(province ? PROVINCE_CITIES[province] : Object.values(PROVINCE_CITIES).flat().sort()).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Row 2: Complete Address (Full Width) */}
              <div className="sm:col-span-12">
                <FieldInput 
                  label="Complete Delivery Address" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="House / Flat No., Street, Sector, Landmark, Area..." 
                  required 
                  className="text-sm py-2.5 px-3 rounded-xl" 
                />
              </div>

              {/* Row 3: Province & Alternate Phone */}
              <div className="sm:col-span-6">
                <FieldSelect 
                  label="Province / Region (Optional)" 
                  value={province} 
                  onChange={e => setProvince(e.target.value)} 
                  className="text-sm py-2 px-3 rounded-xl"
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </FieldSelect>
              </div>
              <div className="sm:col-span-6">
                <FieldInput 
                  label="Alternate Phone Number (Optional)" 
                  value={altPhone} 
                  onChange={e => setAltPhone(e.target.value)} 
                  placeholder="03xxxxxxxxx" 
                  className="font-mono text-sm py-2 px-3 rounded-xl" 
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 02 — PARCEL & PAYMENT CONFIGURATION ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold font-mono">
                  02
                </span>
                <h2 className="font-extrabold text-[#0F172A] text-base tracking-tight flex items-center gap-2">
                  <Banknote size={18} className="text-slate-500" /> Parcel & Payment Setup
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Order Type Toggle Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Order Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  {(["COD", "NON-COD"] as const).map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => handleOrderTypeChange(t)}
                      className={cn(
                        "py-2 text-xs font-bold rounded-lg transition-all",
                        orderType === t 
                          ? (t === "COD" ? "bg-emerald-600 text-white shadow-sm" : "bg-indigo-600 text-white shadow-sm")
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/60"
                      )}
                    >
                      {t === "COD" ? "Cash on Delivery" : "Non-COD (Prepaid)"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {orderType === "COD" ? "Courier will collect remaining balance upon parcel delivery." : "Order is 100% advance paid online or via bank transfer."}
                </p>
              </div>

              {/* Advance Payment Method Badge */}
              <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-2">
                <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">Advance Payment Method</label>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between font-bold text-xs text-emerald-950">
                  <span className="flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-600" /> Online Transfer (Bank / EasyPaisa / JazzCash)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] uppercase">Online</span>
                </div>
                <p className="text-[11px] text-emerald-700/80 mt-1">
                  Advance payments before dispatch are received online. Courier collects remaining balance on COD.
                </p>
              </div>

              {/* Financial Inputs: Advance Amount & Delivery Charges */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Advance Payment Received</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">Rs</span>
                  <input 
                    type="number" 
                    min={0} 
                    value={advancePayment === 0 ? "" : advancePayment} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => setAdvancePayment(e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F172A] focus:border-transparent bg-white" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Charges (DC)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">Rs</span>
                  <input 
                    type="number" 
                    min={0} 
                    value={deliveryCharges === 0 ? "" : deliveryCharges} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => setDeliveryCharges(e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F172A] focus:border-transparent bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* Special Instructions / Notes */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Special Instructions / Notes</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={2}
                placeholder="Special instructions for this parcel (e.g. Call before delivery, urgent packing)..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F172A] focus:border-transparent bg-white resize-none" 
              />
            </div>
          </div>

          {/* ─── SECTION 03 — PRODUCTS & ITEMS ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold font-mono">
                  03
                </span>
                <h2 className="font-extrabold text-[#0F172A] text-base tracking-tight flex items-center gap-2">
                  <Package size={18} className="text-slate-500" /> Products & Parcel Items
                </h2>
              </div>
              <button 
                type="button" 
                onClick={addProduct} 
                className="text-xs font-bold text-[#0F172A] bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Product Row
              </button>
            </div>

            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                <div className="col-span-6">Item Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price (Rs)</div>
                <div className="col-span-2 text-right">Line Total (Rs)</div>
              </div>

              {products.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 sm:gap-3 items-center bg-slate-50/70 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 group">
                  <div className="col-span-12 sm:col-span-6">
                    <input 
                      value={p.name} 
                      onChange={e => updateProduct(i, "name", e.target.value)}
                      placeholder="e.g. King Size Bedsheet Set (3 Pcs)" 
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] bg-white font-medium" 
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input 
                      type="number" 
                      min={1} 
                      value={p.qty} 
                      onFocus={e => e.target.select()}
                      onChange={e => updateProduct(i, "qty", e.target.value === "" ? "" : parseInt(e.target.value))} 
                      required
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] text-center font-mono font-bold bg-white" 
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <input 
                      type="number" 
                      min={0} 
                      value={p.price === 0 ? "" : p.price} 
                      onFocus={e => e.target.select()}
                      onChange={e => updateProduct(i, "price", e.target.value === "" ? "" : parseInt(e.target.value))} 
                      placeholder="0" 
                      required
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] text-right font-mono font-bold bg-white" 
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2 pr-1">
                    <span className="font-mono text-xs font-extrabold text-[#0F172A]">
                      {(Number(p.qty) || 0) * (Number(p.price) || 0) > 0 ? ((Number(p.qty) || 0) * (Number(p.price) || 0)).toLocaleString() : "—"}
                    </span>
                    {products.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeProduct(i)} 
                        className="text-slate-300 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                        title="Delete Product Row"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary Panel & Save Actions (3.5 / 12 Cols = ~29%) */}
        <div className="lg:col-span-4 space-y-5 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 font-bold text-[#0F172A] text-xs uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt size={16} className="text-slate-500" /> Financial Summary
              </span>
              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {products.length} {products.length === 1 ? "Item" : "Items"}
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Financial Calculation Stack */}
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Subtotal ({products.reduce((a, b) => a + (Number(b.qty) || 0), 0)} pcs)</span>
                  <span className="font-bold text-slate-900">{formatPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Delivery Charges (DC)</span>
                  <span className="font-bold text-slate-900">{formatPKR(deliveryCharges)}</span>
                </div>
                
                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span className="font-sans">Grand Total</span>
                  <span className="text-[#0F172A] font-extrabold">{formatPKR(grandTotal)}</span>
                </div>

                {advancePayment > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span className="font-sans">Advance Received</span>
                    <span>- {formatPKR(advancePayment)}</span>
                  </div>
                )}

                {/* Final COD Amount Highlight */}
                <div className="border-t-2 border-slate-800 pt-3 mt-3">
                  <div className="text-[10px] uppercase font-sans font-bold text-slate-400 tracking-wider">
                    {orderType === "COD" ? "Cash To Collect On Delivery (COD)" : "Payment Status"}
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-[#D4AF37] mt-1">
                    {orderType === "COD" 
                      ? formatPKR(remainingAmount) 
                      : (remainingAmount === 0 ? "Fully Paid (Rs 0 COD)" : formatPKR(remainingAmount))}
                  </div>
                </div>
              </div>

              {/* Compact Quick Summary Pill Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] font-mono text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Type:</span>
                  <span className={cn("font-bold", orderType === "COD" ? "text-emerald-700" : "text-indigo-700")}>{orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Advance:</span>
                  <span className="font-bold text-emerald-700">Online Transfer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Agent:</span>
                  <span className="font-bold text-slate-800">{handledBy}</span>
                </div>
              </div>
            </div>

            {/* Primary Actions Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
              <button 
                onClick={() => handleSave(false)} 
                disabled={isSubmitting || saved}
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving Parcel...</>
                ) : saved ? (
                  <><Check size={16} /> Order Saved!</>
                ) : (
                  <><Save size={16} /> SAVE PARCEL</>
                )}
              </button>

              <button 
                onClick={() => handleSave(true)} 
                disabled={isSubmitting || saved}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-[#0F172A] border border-slate-300 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={15} /> Save & Print Label
              </button>
            </div>
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
  onUpdateStatus,
}: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  onEditOrder: (id: string) => void;
  orders: Order[];
  onVoidOrder: (id: string, performer: "Sami" | "Abid") => void;
  onUpdateStatus?: (id: string, status: OrderStatus, hasTracking?: boolean) => void;
}) {
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "COD" | "NON-COD">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
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

  const codCount = orders.filter(o => o.type === "COD").length;
  const nonCodCount = orders.filter(o => o.type === "NON-COD").length;

  const filtered = orders.filter(o => {
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      const matchNo = o.id.toLowerCase().includes(q);
      const matchCust = o.customer.toLowerCase().includes(q);
      const matchPhone = o.whatsapp.includes(q);
      const matchTrack = o.trackingNo?.toLowerCase().includes(q);
      const matchCity = o.city?.toLowerCase().includes(q);
      const matchAddress = o.address?.toLowerCase().includes(q);
      if (!matchNo && !matchCust && !matchPhone && !matchTrack && !matchCity && !matchAddress) return false;
    }

    // Order Type Filter (COD vs NON-COD)
    if (orderTypeFilter !== "all" && o.type !== orderTypeFilter) return false;

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

      {/* Order Type Sub-Tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-lg w-fit border border-slate-200/60 flex-wrap">
        <button
          onClick={() => setOrderTypeFilter("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all",
            orderTypeFilter === "all" ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          All Parcels ({orders.length})
        </button>
        <button
          onClick={() => setOrderTypeFilter("COD")}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            orderTypeFilter === "COD" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/50"
          )}
        >
          <Banknote size={14} /> COD Parcels ({codCount})
        </button>
        <button
          onClick={() => setOrderTypeFilter("NON-COD")}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            orderTypeFilter === "NON-COD" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/50"
          )}
        >
          <Package size={14} /> Non-COD Parcels ({nonCodCount})
        </button>
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
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no, customer, phone, address, tracking..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F172A] shadow-sm"
          />
        </div>

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
                <th className="text-left px-6 py-3">Type</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border shadow-sm whitespace-nowrap inline-block",
                        o.type === "COD" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      )}>
                        {o.type}
                      </span>
                    </td>
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
                        {status !== "delivered" && onUpdateStatus && (
                          <button onClick={() => onUpdateStatus(o._id || o.id, "delivered", Boolean(o.trackingNo))}
                            className={cn(
                              "p-1.5 rounded-md border transition-all",
                              o.trackingNo
                                ? "hover:bg-emerald-50 border-transparent hover:border-emerald-200 text-emerald-600"
                                : "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                            )}
                            title={o.trackingNo ? "Mark as Delivered" : "Tracking Number required before marking Delivered"}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {status !== "returned" && status !== "delivered" && onUpdateStatus && (
                          <button onClick={() => onUpdateStatus(o._id || o.id, "returned", Boolean(o.trackingNo))}
                            className="p-1.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 text-rose-600 transition-all" title="Mark as Returned">
                            <XCircle size={14} />
                          </button>
                        )}
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
                ["Province", o.province || getProvinceFromCity(o.city) || "—"],
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
  const [awaitingSubTab, setAwaitingSubTab] = useState<"COD" | "NON-COD" | "all">("COD");
  const [inputs, setInputs] = useState<Record<string, { courier: string; no: string; no2?: string }>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const codAwaiting = orders.filter(o => o.type === "COD" && !o.trackingNo && o.status !== "void" && !saved.has(o.id));
  const nonCodAwaiting = orders.filter(o => o.type === "NON-COD" && !o.trackingNo && o.status !== "void" && !saved.has(o.id));
  const allAwaiting = orders.filter(o => !o.trackingNo && o.status !== "void" && !saved.has(o.id));
  const awaiting = awaitingSubTab === "COD" ? codAwaiting : awaitingSubTab === "NON-COD" ? nonCodAwaiting : allAwaiting;

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#0F172A]">Tracking Management</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-100 flex-wrap">
        {[
          { id: "awaiting", label: `Awaiting Tracking (${allAwaiting.length})` },
          { id: "added", label: `Tracking Added / Shipped (${added.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-[#0F172A] text-[#0F172A] font-bold" : "border-transparent text-slate-500 hover:text-slate-700"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "awaiting" && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/70 rounded-lg w-fit border border-slate-200/60">
          <button
            onClick={() => setAwaitingSubTab("COD")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              awaitingSubTab === "COD" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Banknote size={14} /> COD Awaiting ({codAwaiting.length})
          </button>
          <button
            onClick={() => setAwaitingSubTab("NON-COD")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              awaitingSubTab === "NON-COD" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Package size={14} /> NON-COD Awaiting ({nonCodAwaiting.length})
          </button>
          <button
            onClick={() => setAwaitingSubTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-medium transition-all",
              awaitingSubTab === "all" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            All Awaiting ({allAwaiting.length})
          </button>
        </div>
      )}

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

  const pending = orders.filter(o => o.type !== "NON-COD" && o.amount > 0 && o.codStatus === "pending" && o.status === "delivered" && !receivedIds.has(o.id));
  const receivedList = orders.filter(o => o.type !== "NON-COD" && o.amount > 0 && (o.codStatus === "received" || receivedIds.has(o.id)));
  const pendingAmt = pending.reduce((a, b) => a + b.amount, 0);
  const receivedAmt = receivedList.reduce((a, b) => a + b.amount, 0);
  const totalCOD = orders.filter(o => o.type !== "NON-COD" && o.amount > 0).reduce((a, b) => a + b.amount, 0);
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
        const rawMatches: string[] = text.match(trackingRegex) || [];
        
        // Filter: Must contain at least 4 digits (removes words like SETTLEMENT, DELIVERED)
        // Clean spaces from matches
        const cleanedMatches = rawMatches
          .filter((t: string) => (t.match(/\d/g) || []).length >= 4)
          .map((t: string) => t.replace(/\s/g, '').toUpperCase());
          
        const potentialTrackings = Array.from(new Set(cleanedMatches));

        // Send to backend API
        const response = await fetch('/api/settlements/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingNumbers: potentialTrackings })
        });
        
        if (response.ok) {
          const data = (await safeResponseJson(response)) || [];
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
      return await safeResponseJson(res);
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
  const codRevenue = filteredOrders.filter(o => o.status !== "void" && o.type === "COD").reduce((a, b) => a + b.amount, 0);
  const nonCodRevenue = filteredOrders.filter(o => o.status !== "void" && o.type === "NON-COD").reduce((a, b) => a + b.amount, 0);
  const totalAdvance = filteredOrders.filter(o => o.status !== "void").reduce((a, b) => a + (b.advancePayment || 0), 0);

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
    const headers = ["Order No", "Date", "Customer", "City", "Gross Amount", "Advance Payment", "Net COD", "Status", "COD Status", "Tracking No", "Courier"];
    const rows = filteredOrders.map(o => [
      o.id,
      o.date,
      `"${o.customer}"`,
      `"${o.city}"`,
      o.amount,
      o.advancePayment || 0,
      Math.max(0, o.amount - (o.advancePayment || 0)),
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
          { label: "Grand Total Sales", value: formatPKR(totalRevenue), sub: `${filteredOrders.length} Total Parcels (COD + Non-COD)`, icon: DollarSign, color: "text-[#D4AF37]" },
          { label: "COD Sales Revenue", value: formatPKR(codRevenue), sub: `${filteredOrders.filter(o => o.type === "COD").length} COD Parcels`, icon: Banknote, color: "text-emerald-600" },
          { label: "Non-COD Sales Revenue", value: formatPKR(nonCodRevenue), sub: `${filteredOrders.filter(o => o.type === "NON-COD").length} Prepaid Parcels`, icon: Package, color: "text-indigo-600" },
          { label: "Advance Payments", value: formatPKR(totalAdvance), sub: "Total Advance Cash Collected", icon: TrendingUp, color: "text-amber-600" },
        ].map((c, i) => (
          <StatCard 
            key={i} 
            label={c.label} 
            value={c.value} 
            sub={c.sub} 
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
                      (log.performedBy || log.by) === "Sami" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                    )}>{log.performedBy || log.by}</span>
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
  const queryClient = useQueryClient();
  const [shopName, setShopName] = useState("HK Fabric");
  const [pin, setPin] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleResetDatabase = async () => {
    if (!resetPin) {
      setResetMsg({ text: "Please enter Owner PIN", error: true });
      return;
    }
    if (!confirm("CRITICAL WARNING: This will PERMANENTLY ERASE all orders, customers, and activity logs. Are you sure you want to reset everything to 0 for 1st September?")) {
      return;
    }
    setIsResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPin }),
      });
      const data = await safeResponseJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to reset database");

      localStorage.removeItem("offline_orders");
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setResetMsg({ text: "Database successfully reset to 0! New orders will start from 1 (HKF-2026-000001)." });
      setResetPin("");
    } catch (err: any) {
      setResetMsg({ text: err.message || "Error resetting database", error: true });
    } finally {
      setIsResetting(false);
    }
  };

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

      {/* 1st September System Reset */}
      <div className="bg-red-50/50 rounded-xl border border-red-200 shadow-sm p-5 space-y-4 mt-8">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
          <AlertTriangle size={18} className="text-red-600" />
          <span>System Reset (1st September Fresh Start)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Wipe all test/existing orders, customers, and activity logs to start fresh with order number 1 (<code className="font-mono text-slate-800">HKF-2026-000001</code>).
        </p>

        {resetMsg && (
          <div className={cn("p-3 rounded-lg text-xs font-medium border", resetMsg.error ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-800 border-emerald-200")}>
            {resetMsg.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">Enter Owner PIN to Confirm Reset</label>
          <input
            type="password"
            maxLength={4}
            value={resetPin}
            onChange={e => setResetPin(e.target.value)}
            placeholder="••••"
            className="w-full px-3 py-2 text-center text-xl tracking-widest border border-red-200 bg-white rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <button
          onClick={handleResetDatabase}
          disabled={isResetting || !resetPin}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isResetting ? "Resetting Database..." : "Reset All System Data to 0"}
        </button>
      </div>
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

// ─── Daily Parcel History & Calendar View Screen ─────────────────────────────

function DailyParcelHistoryScreen({ setScreen, onViewOrder, orders }: {
  setScreen: (s: Screen) => void;
  onViewOrder: (id: string) => void;
  orders: Order[];
}) {
  const todayPKT = new Date(Date.now() + 5 * 3600 * 1000).toISOString().split('T')[0];
  const fourteenDaysAgoPKT = new Date(Date.now() - 13 * 24 * 3600 * 1000 + 5 * 3600 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fourteenDaysAgoPKT);
  const [endDate, setEndDate] = useState(todayPKT);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "COD" | "NON-COD">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: dailyCounts = [], isLoading: loadingCounts } = useQuery({
    queryKey: ['daily-counts', startDate, endDate, typeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/orders/daily-counts?startDate=${startDate}&endDate=${endDate}&orderType=${typeFilter}`);
      if (!res.ok) return [];
      return (await safeResponseJson(res)) || [];
    }
  });

  const filteredOrders = orders.filter(o => {
    if (typeFilter !== "ALL" && o.type !== typeFilter) return false;
    if (statusFilter !== "ALL" && o.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (selectedDate && o.date !== selectedDate) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = o.customer.toLowerCase().includes(q);
      const matchPhone = o.whatsapp.toLowerCase().includes(q) || (o.altPhone && o.altPhone.toLowerCase().includes(q));
      const matchAddress = o.address.toLowerCase().includes(q) || o.city.toLowerCase().includes(q);
      const matchTrack = o.trackingNo && o.trackingNo.toLowerCase().includes(q);
      return matchId || matchCust || matchPhone || matchAddress || matchTrack;
    }
    return true;
  });

  const totalRangeCount = dailyCounts.reduce((acc: number, item: any) => acc + (item.count || 0), 0);
  const totalRangeSales = dailyCounts.reduce((acc: number, item: any) => acc + (item.sales || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" /> Daily Parcel History & Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-1">Authoritative day-by-day parcel volume and date-filtered search</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setStartDate(todayPKT); setEndDate(todayPKT); setSelectedDate(todayPKT); }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
            Today
          </button>
          <button onClick={() => {
            const yest = new Date(Date.now() - 24 * 3600 * 1000 + 5 * 3600 * 1000).toISOString().split('T')[0];
            setStartDate(yest); setEndDate(yest); setSelectedDate(yest);
          }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
            Yesterday
          </button>
          <button onClick={() => { setStartDate(fourteenDaysAgoPKT); setEndDate(todayPKT); setSelectedDate(null); }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
            Last 14 Days
          </button>
        </div>
      </div>

      {/* Date Range & Filters Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Date Range:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <span>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Type:</span>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 bg-white">
            <option value="ALL">All Order Types</option>
            <option value="COD">COD Only</option>
            <option value="NON-COD">Non-COD Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Status:</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 bg-white capitalize">
            <option value="ALL">All Statuses</option>
            {["pending","processing","shipped","delivered","returned","void"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {selectedDate && (
          <button onClick={() => setSelectedDate(null)}
            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ml-auto">
            <span>Filter: {selectedDate}</span>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Daily Counts Calendar Bar / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
          <span>Day-by-Day Activity Breakdown ({dailyCounts.length} days)</span>
          <span>Range Total: <strong>{totalRangeCount} Parcels</strong> ({formatPKR(totalRangeSales)})</span>
        </div>

        {loadingCounts ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading daily parcel history...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {dailyCounts.map((item: any) => {
              const isSelected = selectedDate === item.date;
              const hasParcels = item.count > 0;
              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(isSelected ? null : item.date)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all relative overflow-hidden group",
                    isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/30" :
                    hasParcels ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900" :
                    "bg-slate-50/50 border-slate-100 text-slate-400 opacity-65 hover:opacity-100"
                  )}
                >
                  <div className="text-[11px] font-mono font-medium opacity-80">{item.date}</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold font-mono">{item.count}</span>
                    <span className="text-[10px] font-semibold opacity-75">{hasParcels ? "parcels" : "zero"}</span>
                  </div>
                  {hasParcels && (
                    <div className="text-[10px] font-mono font-medium mt-0.5 opacity-90 truncate">
                      {formatPKR(item.sales)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Parcel List for Selected Date or Range */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              {selectedDate ? `Parcels for Date: ${selectedDate}` : `Parcels (${filteredOrders.length} records)`}
            </h3>
          </div>

          <div className="w-full sm:w-64">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Order #, Phone, Name, City..."
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-[#94a3b8] text-sm">No parcels found for the selected date or search filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/60">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Order No</th>
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Tracking / Courier</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-[#0F172A]">{o.id}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{o.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 text-xs">{o.customer}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{o.whatsapp} • {o.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border",
                        o.type === "COD" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200"
                      )}>
                        {o.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-[#0F172A] text-right">{formatPKR(o.amount)}</td>
                    <td className="px-6 py-4">
                      {o.trackingNo ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-indigo-600 block">{o.trackingNo}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{o.courier}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No Tracking</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onViewOrder(o.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-xs transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login Screen Component ───────────────────────────────────────────────────

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await safeResponseJson(res);

      if (res.ok && data?.authenticated) {
        onLoginSuccess(data.user);
      } else {
        setError(data?.error || "Invalid username or password.");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#0F172A] text-[#D4AF37] font-serif font-black text-xl flex items-center justify-center rounded-xl mx-auto shadow-md">
            HK
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">HK Fabric — ParcelERP</h1>
          <p className="text-xs text-slate-500">Sign in to access parcel management system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="text-center border-t border-slate-100 pt-4 text-[11px] text-slate-400 space-y-1">
          <div>Single-User Secure Authentication • Powered by ParcelERP</div>
          <div className="text-[10px] text-slate-400 pt-1 font-sans">
            Developed by <span className="font-bold text-slate-800">Next Revolution Tech</span> | Lead Architect: <span className="font-bold text-[#0F172A]">Muhammad Ahsan Khan</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const queryClient = useQueryClient();
  const [screen, setScreenState] = useState<Screen>("dashboard");
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? safeResponseJson(res) : null)
      .then(data => {
        if (data && data.authenticated) {
          setAuthUser(data.user);
        } else {
          setAuthUser(null);
        }
      })
      .catch(() => setAuthUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {}
    setAuthUser(null);
    queryClient.clear();
  };
  
  const setScreen = (s: Screen) => {
    setScreenState(s);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentScreen", s);
      window.history.pushState({ screen: s }, "", `#${s}`);
    }
  };
  
  const [mounted, setMounted] = useState(false);
  
  // Offline State & Reconnection Modal
  const [isOffline, setIsOffline] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState<Order[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

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
        try { 
          const parsed = JSON.parse(savedOffline);
          setOfflineOrders(parsed); 
          if (Array.isArray(parsed) && parsed.length > 0 && navigator.onLine) {
            setShowSyncModal(true);
          }
        } catch(e) {}
      }

      const handleOnline = () => {
        setIsOffline(false);
        const currentSaved = localStorage.getItem("offline_orders");
        if (currentSaved) {
          try {
            const parsed = JSON.parse(currentSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setShowSyncModal(true);
              showGlobalToast(`🌐 Internet restored! ${parsed.length} offline orders ready to sync.`, "info");
            }
          } catch(e) {}
        }
      };
      const handleOffline = () => {
        setIsOffline(true);
        showGlobalToast("⚡ Offline Mode: Internet disconnected. Orders will be saved locally.", "error");
      };
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
      const isAlreadyInDb = orders.some((o: any) => 
        (o.id === order.id || o.orderNo === order.id) ||
        (o.whatsapp === order.whatsapp && Math.abs(o.amount - order.amount) < 0.01)
      );

      if (isAlreadyInDb) {
        syncedCount++;
        continue;
      }

      const payload = {
        orderNo: order.id && order.id.startsWith("HKF-") && !orders.some(o => o.id === order.id) ? order.id : undefined,
        customerDetails: {
          phone: order.whatsapp,
          name: order.customer,
          alternatePhone: order.altPhone,
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
        notes: order.notes,
      };

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const responseData = await safeResponseJson(res);
        if (!res.ok) {
          throw new Error(responseData?.error || `HTTP ${res.status}`);
        }
        syncedCount++;
      } catch (e: any) {
        failed.push(order);
        showGlobalToast(`Order #${order.id} sync error: ${e.message || "Bad Request"}`, "error");
      }
    }
    
    setOfflineOrders(failed);
    localStorage.setItem("offline_orders", JSON.stringify(failed));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    setIsSyncing(false);
    setShowSyncModal(false);
    
    if (failed.length === 0) {
      showGlobalToast(`🎉 Successfully synced ${syncedCount} offline orders to PostgreSQL database!`, "success");
    } else {
      showGlobalToast(`Synced ${syncedCount} orders. ${failed.length} remaining in offline queue.`, "error");
    }
  };

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      const raw = (await safeResponseJson(res));
      const data = Array.isArray(raw) ? raw : (raw?.orders || []);
      return data.map((o: any) => ({
        _id: o.id,
        id: o.orderNo,
        customer: o.customer?.name || "Unknown",
        whatsapp: o.customer?.phone || "",
        altPhone: o.customer?.alternatePhone || "",
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
        province: o.customer?.province || getProvinceFromCity(o.customer?.city),
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
      return (await safeResponseJson(res)) || [];
    }
  });

  const [globalToast, setGlobalToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showGlobalToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setGlobalToast({ message, type });
    setTimeout(() => {
      setGlobalToast(null);
    }, 3500);
  };

  const createOrderMut = useMutation({
    mutationFn: async (params: Order | { newOrder: Order; overrideDuplicate?: boolean }) => {
      const newOrder = 'newOrder' in params ? params.newOrder : params;
      const overrideDuplicate = 'overrideDuplicate' in params ? Boolean(params.overrideDuplicate) : false;

      if (!navigator.onLine) {
        saveOrderOffline(newOrder);
        return "offline";
      }
      const payload = {
        orderNo: newOrder.id && newOrder.id.startsWith("HKF-") && orders.some(o => o.id === newOrder.id) ? newOrder.id : undefined,
        customerDetails: {
          phone: newOrder.whatsapp,
          name: newOrder.customer,
          alternatePhone: newOrder.altPhone,
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
        overrideDuplicate,
      };

      const idempotencyKey = `order-${newOrder.id}-${newOrder.whatsapp}-${newOrder.amount}`;
      
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 409) {
          const data = await safeResponseJson(res);
          if (data?.duplicate) {
            setDuplicateWarning({
              ...data.existingOrder,
              newOrderPayload: newOrder
            });
            showGlobalToast(`⚠️ Duplicate Parcel Alert: ${data.error || "An identical order exists for this customer!"}`, "error");
            throw new Error(data.error || "Possible duplicate parcel detected");
          }
        }

        if (!res.ok) {
          const errData = await safeResponseJson(res);
          throw new Error(errData?.error || "Failed to create order");
        }

        return "online";
      } catch (err: any) {
        if (err.message && err.message.includes("duplicate")) {
          throw err;
        }
        saveOrderOffline(newOrder);
        return "offline";
      }
    },
    onSuccess: (status) => {
      if (status === "online") {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
        showGlobalToast("Order created successfully!", "success");
      } else {
        showGlobalToast("Order saved offline!", "info");
      }
    },
    onError: (err: any) => {
      if (!err.message?.includes("duplicate")) {
        showGlobalToast(err.message || "Error creating order", "error");
      }
    }
  });

  const [duplicateTrackingWarning, setDuplicateTrackingWarning] = useState<any>(null);

  const updateOrderMut = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const dbId = orders.find((o: any) => o.id === id || o._id === id)?._id || id;
      const res = await fetch(`/api/orders/${dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.status === 409) {
        const errorData = await safeResponseJson(res);
        if (errorData?.duplicateTracking) {
          setDuplicateTrackingWarning({
            trackingNo: data.trackingNumber || data.trackingNumber2,
            ...errorData.existingOrder
          });
          throw new Error(errorData.error || "Tracking number already assigned");
        }
      }

      if (!res.ok) {
        const errorData = await safeResponseJson(res);
        throw new Error(errorData?.error || "Failed to update order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      showGlobalToast("Order updated successfully!", "success");
    },
    onError: (err: any) => {
      if (!err.message?.includes("already assigned")) {
        showGlobalToast(err.message || "Failed to update order", "error");
      }
    }
  });

  const handleViewOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("order-detail");
  };

  const handleEditOrder = (id: string) => {
    setSelectedOrderId(id);
    setScreen("create-order");
  };

  const handleSaveOrder = async (newOrder: Order) => {
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
      return await updateOrderMut.mutateAsync({ id: newOrder.id, data: payload });
    } else {
      return await createOrderMut.mutateAsync(newOrder);
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
    const targetOrder = orders.find((o: any) => o.id === orderId || o._id === orderId);
    if ((status === 'delivered' || status === 'shipped') && (!targetOrder || !targetOrder.trackingNo)) {
      showGlobalToast("⚠️ Tracking Required: Please assign a Tracking Number & Courier first in Tracking section!", "error");
      return;
    }
    updateOrderMut.mutate({
      id: orderId,
      data: { status, actionName: `Marked as ${status}` }
    });
  };

  const handleReceiveCOD = (orderId: string, date: string) => {
    const targetOrder = orders.find((o: any) => o.id === orderId || o._id === orderId);
    if (!targetOrder || !targetOrder.trackingNo) {
      showGlobalToast("⚠️ Tracking Required: Please assign a Tracking Number & Courier first in Tracking section!", "error");
      return;
    }
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

  if (!mounted || authChecking) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-white text-sm font-medium flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Verifying authentication...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen onLoginSuccess={(u) => setAuthUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col overflow-x-hidden relative">
      {/* Global Toast Notification Overlay */}
      {globalToast && (
        <div className={cn(
          "fixed top-4 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-bounce transition-all",
          globalToast.type === "success" && "bg-emerald-950 text-emerald-100 border-emerald-700",
          globalToast.type === "error" && "bg-rose-950 text-rose-100 border-rose-700",
          globalToast.type === "info" && "bg-[#0F172A] text-white border-slate-700"
        )}>
          {globalToast.type === "success" && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
          {globalToast.type === "error" && <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />}
          {globalToast.type === "info" && <AlertCircle size={18} className="text-[#D4AF37] flex-shrink-0" />}
          <span>{globalToast.message}</span>
          <button onClick={() => setGlobalToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      <HeaderMemo
        screen={screen}
        setScreen={setScreen}
        onSearchClick={() => setSearchOpen(true)}
        onLogout={handleLogout}
        user={authUser}
        offlineOrdersCount={offlineOrders.length}
        isOffline={isOffline}
        onSyncClick={() => setShowSyncModal(true)}
      />

      <OfflineSyncModal
        open={showSyncModal}
        offlineOrders={offlineOrders}
        isSyncing={isSyncing}
        onSync={() => syncOfflineOrders()}
        onClose={() => setShowSyncModal(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
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

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
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
          {screen === "cod-parcels" && (
            <CODParcelsScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
              onVoidOrder={handleVoidOrder}
              onUpdateStatus={handleUpdateStatus}
              onReceiveCOD={handleReceiveCOD}
            />
          )}
          {screen === "non-cod-parcels" && (
            <NonCODParcelsScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
              onVoidOrder={handleVoidOrder}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          {screen === "orders" && (
            <OrdersScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
              orders={orders}
              onVoidOrder={handleVoidOrder}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          {screen === "order-detail" && <OrderDetailScreen orderId={selectedOrderId} setScreen={setScreen} orders={orders} />}
          {screen === "tracking" && <TrackingScreen orders={orders} onSaveTracking={handleSaveTracking} onUpdateStatus={handleUpdateStatus} />}
          {screen === "cod" && <CODScreen orders={orders} onReceiveCOD={handleReceiveCOD} />}
          {screen === "settlements" && <SettlementsScreen />}
          {screen === "daily-history" && (
            <DailyParcelHistoryScreen
              setScreen={setScreen}
              onViewOrder={handleViewOrder}
              orders={orders}
            />
          )}
          {screen === "daily-closing" && <DailyClosingScreen orders={orders} />}
          {screen === "activity-log" && <ActivityLogScreen activityLogs={activityLogs} />}
          {screen === "settings" && <SettingsScreen />}
        </main>

        {/* Sleek Enterprise Developer Footer Signature */}
        <footer className="mt-auto py-3.5 px-6 border-t border-slate-200/80 bg-white/90 backdrop-blur-sm print:hidden">
          <div className="max-w-[1600px] w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#0F172A] rounded-md flex items-center justify-center font-extrabold text-[10px] text-[#D4AF37] shadow-xs">
                NR
              </div>
              <span className="font-semibold text-slate-700">
                Developed by <span className="font-extrabold text-[#0F172A]">Next Revolution Tech</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-[11px] flex-wrap justify-center">
              <span className="text-slate-500 font-medium">
                Lead Architect: <strong className="text-slate-900 font-extrabold">Muhammad Ahsan Khan</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="font-mono text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                v2026.1.0 Production
              </span>
            </div>
          </div>
        </footer>
      </div>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        setScreen={setScreen}
        setSelectedOrderId={setSelectedOrderId}
        orders={orders}
      />

      {duplicateWarning && (
        <Modal open={Boolean(duplicateWarning)} onClose={() => setDuplicateWarning(null)} title="⚠️ Order Already Saved / Duplicate Alert">
          <div className="space-y-4 font-sans">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Order #{duplicateWarning.orderNo} was ALREADY SAVED in database!</span>
                If you just pressed Save, your order was already created successfully. Click <span className="font-bold text-emerald-700 font-mono">View Saved Order</span> below to inspect it.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between"><span className="text-slate-400">Order #:</span><span className="font-bold text-[#0F172A]">{duplicateWarning.orderNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span className="font-medium text-slate-800">{duplicateWarning.customer}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span>{duplicateWarning.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Address:</span><span className="text-right max-w-[200px] truncate">{duplicateWarning.address}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount:</span><span className="font-bold text-[#D4AF37]">{formatPKR(duplicateWarning.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Created At:</span><span>{new Date(duplicateWarning.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const orderId = duplicateWarning.orderNo;
                  setDuplicateWarning(null);
                  handleViewOrder(orderId);
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Eye size={16} /> View Saved Order #{duplicateWarning.orderNo}
              </button>
              
              <button
                onClick={async () => {
                  if (!duplicateWarning.newOrderPayload) return;
                  const confirmForce = confirm("Are you sure you want to create a SECOND separate parcel for the same customer?");
                  if (!confirmForce) return;
                  const payloadToForce = duplicateWarning.newOrderPayload;
                  setDuplicateWarning(null);
                  try {
                    await createOrderMut.mutateAsync({ newOrder: payloadToForce, overrideDuplicate: true });
                    setScreen("orders");
                  } catch (err: any) {
                    alert(err.message || "Failed to create order");
                  }
                }}
                className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 font-medium rounded-lg text-xs transition-colors"
                title="Only use if customer placed two separate distinct orders"
              >
                Force Create 2nd Order
              </button>

              <button
                onClick={() => setDuplicateWarning(null)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {duplicateTrackingWarning && (
        <Modal open={Boolean(duplicateTrackingWarning)} onClose={() => setDuplicateTrackingWarning(null)} title="⚠ Duplicate Tracking Number Warning">
          <div className="space-y-4 font-sans">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Tracking Number Already Exists!</span>
                This tracking number is already assigned to another parcel and cannot be assigned again.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between"><span className="text-slate-400">Tracking No:</span><span className="font-bold text-[#0F172A]">{duplicateTrackingWarning.trackingNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Assigned Order #:</span><span className="font-bold text-indigo-600">{duplicateTrackingWarning.orderNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Customer:</span><span className="font-medium text-slate-800">{duplicateTrackingWarning.customer}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span>{duplicateTrackingWarning.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Courier:</span><span className="font-bold">{duplicateTrackingWarning.courier}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Current Status:</span><StatusBadge status={duplicateTrackingWarning.status} /></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const orderId = duplicateTrackingWarning.orderNo;
                  setDuplicateTrackingWarning(null);
                  handleViewOrder(orderId);
                }}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
              >
                View Existing Order
              </button>

              <button
                onClick={() => setDuplicateTrackingWarning(null)}
                className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-lg text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
