'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShoppingCart, BarChart3, TrendingUp, Bell,
  CheckCircle2, ArrowRight, Sparkles, Layers, Users,
  ChevronRight, Box, Truck, Tag, ClipboardList,
  Megaphone, Building2, LayoutDashboard, Upload,
  Star, AlertCircle, Clock,
} from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────── */
const SUPPLIER_STATS = {
  totalProducts: '1,248',
  pendingOrders: '34',
  deliveredThisMonth: '312',
  revenue: '₱2.4M',
  avgRating: '4.8',
  activeCategories: '12',
};

const RECENT_ORDERS = [
  { id: '#ORD-8821', product: 'L-Shape Sofa Set', qty: 2, amount: '₱37,000', status: 'Processing', color: '#f59e0b' },
  { id: '#ORD-8820', product: 'Kolin Aircon 1.5HP', qty: 1, amount: '₱29,995', status: 'Shipped', color: '#3b82f6' },
  { id: '#ORD-8819', product: 'Dining Set 6-Seater', qty: 1, amount: '₱14,999', status: 'Delivered', color: '#10b981' },
  { id: '#ORD-8818', product: 'Nordic Wall Art', qty: 3, amount: '₱7,497', status: 'Delivered', color: '#10b981' },
  { id: '#ORD-8817', product: 'Velvet Accent Chair', qty: 2, amount: '₱17,598', status: 'Processing', color: '#f59e0b' },
];

const PRODUCTS_LIST = [
  { name: 'L-Shape Sofa Set', sku: 'SOF-001', stock: 12, price: '₱18,500', cat: 'Furniture', status: 'Active' },
  { name: 'Kolin Aircon 1.5HP', sku: 'APP-031', stock: 8, price: '₱29,995', cat: 'Appliances', status: 'Active' },
  { name: 'Dining Set 6-Seater', sku: 'FUR-042', stock: 5, price: '₱14,999', cat: 'Furniture', status: 'Low Stock' },
  { name: 'Nordic Wall Art', sku: 'DEC-017', stock: 24, price: '₱2,499', cat: 'Home Decor', status: 'Active' },
  { name: 'Stand Fan 16"', sku: 'APP-018', stock: 0, price: '₱1,499', cat: 'Appliances', status: 'Out of Stock' },
];

const MONTHLY_REVENUE = [
  { month: 'Jan', value: 820 },
  { month: 'Feb', value: 1100 },
  { month: 'Mar', value: 960 },
  { month: 'Apr', value: 1380 },
  { month: 'May', value: 1650 },
  { month: 'Jun', value: 1420 },
  { month: 'Jul', value: 1890 },
  { month: 'Aug', value: 2140 },
  { month: 'Sep', value: 1980 },
  { month: 'Oct', value: 2380 },
  { month: 'Nov', value: 2100 },
  { month: 'Dec', value: 2400 },
];

const FEATURES = [
  { icon: LayoutDashboard, label: 'Live Dashboard', desc: 'Real-time stats for orders, revenue, and products' },
  { icon: Package, label: 'Product Management', desc: 'Add, edit, and manage your entire catalog' },
  { icon: ShoppingCart, label: 'Order Processing', desc: 'View and fulfill orders as they come in' },
  { icon: BarChart3, label: 'Analytics & Reports', desc: 'Track revenue, deliveries, and performance' },
  { icon: Megaphone, label: 'Mobile Ads', desc: 'Promote products across the AF Home mobile app' },
  { icon: Upload, label: 'CSV Import', desc: 'Bulk-upload hundreds of products in seconds' },
];

const HOW_IT_WORKS = [
  { n: '01', label: 'Register as Supplier', desc: 'Apply and get approved as an AF Home supplier partner.' },
  { n: '02', label: 'Upload Your Products', desc: 'Add products manually or bulk-import via CSV.' },
  { n: '03', label: 'Receive Orders', desc: 'Get notified instantly when customers place orders.' },
  { n: '04', label: 'Ship & Fulfill', desc: 'Process, pack, and mark orders as shipped.' },
  { n: '05', label: 'Get Paid', desc: 'Revenue credited to your account after delivery confirmation.' },
];

const HIGHLIGHT_CARDS = [
  {
    rotate: -7, x: -300, y: -90, delay: 0.3,
    content: (
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 w-48 shadow-2xl">
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">New Order</p>
        <p className="text-white font-bold text-sm">L-Shape Sofa Set</p>
        <p className="text-sky-400 font-black text-xl mt-1">₱18,500</p>
        <p className="text-white/25 text-[10px] mt-1">AF Home · Just now</p>
      </div>
    ),
  },
  {
    rotate: 5, x: 295, y: -95, delay: 0.5,
    content: (
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 w-44 shadow-2xl">
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">This Month</p>
        <p className="text-sky-400 font-black text-2xl">₱2.4M</p>
        <p className="text-white/25 text-[10px] mt-1">Total revenue</p>
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-4/5 bg-sky-400 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    rotate: -4, x: -275, y: 105, delay: 0.7,
    content: (
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 w-44 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
            <Package size={13} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">Catalog</p>
            <p className="text-white/30 text-[9px]">1,248 products</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {['Furniture', 'Appliances', 'Decor'].map(c => (
            <div key={c} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-white/50 text-[10px]">{c}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    rotate: 6, x: 285, y: 95, delay: 0.9,
    content: (
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 w-44 shadow-2xl">
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Orders Today</p>
        <div className="space-y-2">
          {['Processing', 'Shipped', 'Delivered'].map((s, i) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-white/50 text-[10px]">{s}</span>
              <span className="text-white font-bold text-xs">{[8, 14, 21][i]}</span>
            </div>
          ))}
        </div>
        <p className="text-white/25 text-[10px] mt-2">43 total orders</p>
      </div>
    ),
  },
];

/* ─── Scene types ───────────────────────────────────────────── */
const SCENES = ['intro', 'challenge', 'highlight', 'dashboard', 'products', 'orders', 'analytics', 'features', 'howItWorks', 'cta'] as const;
type Scene = typeof SCENES[number];
const DURATIONS: Record<Scene, number> = {
  intro: 3500,
  challenge: 4500,
  highlight: 6000,
  dashboard: 8000,
  products: 9000,
  orders: 8000,
  analytics: 8500,
  features: 9000,
  howItWorks: 11000,
  cta: 99999,
};

/* ─── Orbs ──────────────────────────────────────────────────── */
function Orbs({ color }: { color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20"
        style={{ backgroundColor: color }}
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-15"
        style={{ backgroundColor: color }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#030609_100%)]" />
    </div>
  );
}

/* ─── Scene Nav ─────────────────────────────────────────────── */
function SceneNav({ scene, goTo }: { scene: Scene; goTo: (s: Scene) => void }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
      {SCENES.map(s => (
        <button key={s} onClick={() => goTo(s)}
          className={`rounded-full transition-all duration-300 ${scene === s ? 'w-5 h-2 bg-sky-400' : 'w-2 h-2 bg-white/20 hover:bg-white/50'}`}
        />
      ))}
    </div>
  );
}

/* ─── Highlight Scene ───────────────────────────────────────── */
function HighlightScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.7 }}
      className="relative flex items-center justify-center w-full max-w-4xl min-h-[500px]"
    >
      {HIGHLIGHT_CARDS.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8, x: card.x * 0.5, y: card.y * 0.5 }}
          animate={{ opacity: 1, scale: 1, x: card.x, y: card.y, rotate: card.rotate }}
          transition={{ delay: card.delay, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >
            {card.content}
          </motion.div>
        </motion.div>
      ))}
      <div className="relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-sky-400 text-xs font-semibold tracking-[0.2em] uppercase mb-5"
        >
          Supplier Dashboard
        </motion.p>
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-6xl font-black leading-none bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
          >
            One dashboard.
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-6xl font-black leading-none bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
          >
            Everything visible.
          </motion.h1>
        </div>
        <div className="overflow-hidden mt-1">
          <motion.h1
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-6xl font-black leading-none text-sky-400"
          >
            Always in control.
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-white/30 text-base mt-5 max-w-xs mx-auto leading-relaxed"
        >
          Manage products, orders, and revenue from a single powerful supplier hub.
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ─── Dashboard Scene ───────────────────────────────────────── */
function DashboardScene() {
  const stats = [
    { icon: Package, label: 'Total Products', value: SUPPLIER_STATS.totalProducts, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
    { icon: Clock, label: 'Pending Orders', value: SUPPLIER_STATS.pendingOrders, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { icon: Truck, label: 'Delivered This Month', value: SUPPLIER_STATS.deliveredThisMonth, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { icon: TrendingUp, label: 'Monthly Revenue', value: SUPPLIER_STATS.revenue, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
    { icon: Star, label: 'Avg Rating', value: SUPPLIER_STATS.avgRating, color: '#fb7185', bg: 'rgba(251,113,133,0.08)' },
    { icon: Tag, label: 'Active Categories', value: SUPPLIER_STATS.activeCategories, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-10">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Dashboard Overview</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Your Business at a Glance
        </h2>
        <p className="text-white/35 text-sm mt-3">
          Real-time metrics across your entire supplier operation — all in one place.
        </p>
      </div>

      {/* Mock dashboard chrome */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="rounded-2xl border border-white/10 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        style={{ background: 'rgba(13,17,23,0.9)' }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 bg-white/5 rounded-md px-3 py-1.5 text-xs text-white/25 font-mono flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400/60" />
            afhome.ph/supplier/dashboard
          </div>
          <div className="flex items-center gap-1.5 bg-sky-400/10 border border-sky-400/20 rounded-lg px-2.5 py-1">
            <Bell size={10} className="text-sky-400" />
            <span className="text-[10px] text-sky-400 font-semibold">3 alerts</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="p-5 grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="rounded-xl p-4 border border-white/5"
              style={{ backgroundColor: s.bg }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 200 }}
                  className="flex items-center gap-1"
                >
                  <TrendingUp size={9} style={{ color: s.color }} />
                  <span className="text-[9px] font-semibold" style={{ color: s.color }}>+12%</span>
                </motion.div>
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/35 text-[10px] mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Notification bar */}
        <div className="px-5 pb-4 flex gap-2">
          {[
            { text: '5 orders awaiting fulfillment', color: '#f59e0b', icon: Clock },
            { text: 'Kolin Aircon low stock: 2 left', color: '#fb7185', icon: AlertCircle },
          ].map(n => (
            <motion.div
              key={n.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.4 }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 border"
              style={{ backgroundColor: `${n.color}08`, borderColor: `${n.color}25` }}
            >
              <n.icon size={11} style={{ color: n.color }} />
              <span className="text-[10px] text-white/50">{n.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Products Scene ────────────────────────────────────────── */
function ProductsScene() {
  const [activeRow, setActiveRow] = useState<number | null>(null);

  useEffect(() => {
    const seq = [0, 1, 2, 3, 4, null, 2];
    let i = 0;
    const t = setInterval(() => {
      setActiveRow(seq[i] ?? null);
      i++;
      if (i >= seq.length) clearInterval(t);
    }, 1100);
    return () => clearInterval(t);
  }, []);

  const statusColors: Record<string, string> = {
    Active: '#10b981',
    'Low Stock': '#f59e0b',
    'Out of Stock': '#fb7185',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-10">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Product Management</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Your Full Catalog
        </h2>
        <p className="text-white/35 text-sm mt-3">Add, update, and track every product in your inventory — with real-time stock visibility.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(13,17,23,0.9)' }}
      >
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
              <Package size={15} className="text-sky-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Products</p>
              <p className="text-white/30 text-[10px]">1,248 total items</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white/30 flex items-center gap-1.5">
              <Upload size={10} /> Import CSV
            </div>
            <div className="bg-sky-400/10 border border-sky-400/20 rounded-lg px-3 py-1.5 text-[10px] text-sky-400 font-semibold flex items-center gap-1.5">
              + Add Product
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid px-5 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25 border-b border-white/5"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr' }}>
          <span>Product</span><span>SKU</span><span>Stock</span><span>Price</span><span>Category</span><span>Status</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {PRODUCTS_LIST.map((p, i) => (
            <motion.div
              key={p.sku}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, backgroundColor: activeRow === i ? 'rgba(56,189,248,0.06)' : 'transparent' }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
              className="grid items-center px-5 py-3 cursor-pointer"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                  <Box size={13} className="text-white/30" />
                </div>
                <span className="text-white text-xs font-medium">{p.name}</span>
              </div>
              <span className="text-white/30 text-[11px] font-mono">{p.sku}</span>
              <span className={`text-xs font-semibold ${p.stock === 0 ? 'text-rose-400' : p.stock < 6 ? 'text-amber-400' : 'text-white/70'}`}>
                {p.stock === 0 ? '—' : p.stock}
              </span>
              <span className="text-white/70 text-xs">{p.price}</span>
              <span className="text-white/40 text-[11px]">{p.cat}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ color: statusColors[p.status], backgroundColor: `${statusColors[p.status]}15` }}>
                {p.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Orders Scene ──────────────────────────────────────────── */
function OrdersScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-10">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Order Management</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Every Order, Every Status
        </h2>
        <p className="text-white/35 text-sm mt-3">Track from placement to delivery — in real time.</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Order list */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(13,17,23,0.9)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
                <ClipboardList size={15} className="text-sky-400" />
              </div>
              <p className="text-white font-semibold text-sm">Recent Orders</p>
            </div>
            <span className="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-full">34 pending</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {RECENT_ORDERS.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.4 }}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${o.color}15` }}>
                  <ShoppingCart size={13} style={{ color: o.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{o.product}</p>
                  <p className="text-white/30 text-[10px]">{o.id} · Qty {o.qty}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-xs font-bold">{o.amount}</p>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: o.color, backgroundColor: `${o.color}15` }}>
                    {o.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Status summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="min-w-[175px] flex flex-col gap-3"
        >
          <p className="text-white/25 text-[10px] uppercase tracking-widest font-medium">Order Breakdown</p>
          {[
            { label: 'Processing', count: 8, color: '#f59e0b', pct: 19 },
            { label: 'Shipped', count: 14, color: '#38bdf8', pct: 33 },
            { label: 'Delivered', count: 21, color: '#10b981', pct: 49 },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              className="rounded-xl p-4 border border-white/5"
              style={{ backgroundColor: `${s.color}08` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-semibold">{s.label}</span>
                <span className="text-white font-black text-lg">{s.count}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
                  transition={{ delay: 0.8 + i * 0.12, duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="rounded-xl p-4 border border-sky-400/20 bg-sky-400/5"
          >
            <p className="text-white/40 text-[10px] mb-1">Fulfillment Rate</p>
            <p className="text-sky-400 font-black text-2xl">97.4%</p>
            <p className="text-white/25 text-[10px] mt-0.5">Last 30 days</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Analytics Scene ───────────────────────────────────────── */
function AnalyticsScene() {
  const max = Math.max(...MONTHLY_REVENUE.map(r => r.value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-10">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Analytics & Reports</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Data-Driven Selling
        </h2>
        <p className="text-white/35 text-sm mt-3">Track revenue trends, top products, and delivery performance — all in one view.</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-white/10 p-5"
          style={{ background: 'rgba(13,17,23,0.9)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white font-semibold text-sm">Monthly Revenue</p>
              <p className="text-white/30 text-[10px] mt-0.5">Jan – Dec 2024 · in thousands ₱</p>
            </div>
            <div className="bg-sky-400/10 border border-sky-400/20 rounded-lg px-3 py-1 text-[10px] text-sky-400 font-semibold">
              ₱2.4M total
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-36">
            {MONTHLY_REVENUE.map((r, i) => (
              <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${(r.value / max) * 100}%`, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-md"
                  style={{ background: r.month === 'Dec' ? 'linear-gradient(180deg, #38bdf8, #0ea5e9)' : 'rgba(56,189,248,0.25)' }}
                />
                <span className="text-white/20 text-[8px]">{r.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top products + stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="min-w-[185px] flex flex-col gap-3"
        >
          <p className="text-white/25 text-[10px] uppercase tracking-widest font-medium">Top Performers</p>
          {[
            { name: 'L-Shape Sofa', revenue: '₱342K', bar: 88 },
            { name: 'Kolin Aircon', revenue: '₱298K', bar: 76 },
            { name: 'Dining Set', revenue: '₱187K', bar: 48 },
          ].map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              className="rounded-xl p-3 border border-white/5 bg-white/[0.03]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-[11px] font-medium">{p.name}</span>
                <span className="text-sky-400 text-[11px] font-bold">{p.revenue}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${p.bar}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full bg-sky-400"
                />
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="grid grid-cols-2 gap-2 mt-1"
          >
            {[
              { label: 'Avg. Order', value: '₱7,680' },
              { label: 'Return Rate', value: '1.2%' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 border border-white/5 bg-white/[0.03]">
                <p className="text-white/30 text-[9px] mb-1">{s.label}</p>
                <p className="text-white font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Features Scene ────────────────────────────────────────── */
function FeaturesScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl"
    >
      <div className="text-center mb-12">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Platform Features</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Built for Suppliers
        </h2>
        <p className="text-white/30 text-sm mt-3">Everything you need to run your business through AF Home.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div key={f.label}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-sky-400/20 rounded-2xl p-5 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(ellipse at top left,rgba(56,189,248,0.06) 0%,transparent 60%)' }} />
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mb-4">
              <f.icon size={18} className="text-sky-400" />
            </div>
            <p className="font-semibold text-sm text-white mb-1">{f.label}</p>
            <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── How It Works Scene ────────────────────────────────────── */
function HowItWorksScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl"
    >
      <div className="text-center mb-12">
        <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-3">Supplier Onboarding</p>
        <h2 className="text-5xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Getting Started
        </h2>
      </div>
      <div className="relative">
        <div className="absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-sky-400/50 via-sky-400/20 to-transparent" />
        <div className="flex flex-col gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.18, duration: 0.5 }}
              className="flex gap-5 items-start"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0 z-10 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}>
                {s.n}
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-white">{s.label}</p>
                  {i < HOW_IT_WORKS.length - 1
                    ? <ChevronRight size={12} className="text-white/20" />
                    : <CheckCircle2 size={12} className="text-sky-400" />}
                </div>
                <p className="text-white/35 text-xs leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function SupplierDemo() {
  const [scene, setScene] = useState<Scene>('intro');
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneIdx = SCENES.indexOf(scene);

  const goTo = (s: Scene) => {
    if (timer.current) clearTimeout(timer.current);
    setScene(s);
    setPlaying(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => {
      const next = SCENES[sceneIdx + 1];
      if (next) setScene(next);
    }, DURATIONS[scene]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [scene, playing, sceneIdx]);

  return (
    <div className="relative min-h-screen bg-[#030609] text-white overflow-hidden">
      <Orbs color="#0ea5e955" />

      {/* Subtle grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{ backgroundImage: 'linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <SceneNav scene={scene} goTo={goTo} />

      {!playing && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed top-6 right-6 z-50 text-[11px] text-white/40 bg-white/5 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Paused — press Space
        </motion.div>
      )}

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
        <AnimatePresence mode="wait">

          {/* Intro */}
          {scene === 'intro' && (
            <motion.div key="intro"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.7 }} className="text-center max-w-2xl"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_0_60px_rgba(56,189,248,0.35)]"
              >
                <LayoutDashboard size={38} className="text-white" />
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-400/80">
                AF Home
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="text-6xl font-black mt-3 mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-tight"
              >
                Supplier Dashboard
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="text-white/40 text-xl">
                Manage. Sell. Grow. Powered by AF Home.
              </motion.p>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.6 }}
                className="mt-8 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
            </motion.div>
          )}

          {/* Challenge */}
          {scene === 'challenge' && (
            <motion.div key="challenge"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7 }} className="text-center max-w-3xl"
            >
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-6">The Problem</motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="text-5xl font-black leading-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
              >
                Managing a product<br />catalog shouldn&apos;t be chaos.
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-white/40 text-lg mb-8">
                Scattered spreadsheets, missed orders, no visibility on inventory.<br />There&apos;s a better way.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}
                className="inline-flex items-center gap-2 bg-sky-400/10 border border-sky-400/20 rounded-full px-5 py-2.5 text-sky-300 text-sm font-medium"
              >
                <Sparkles size={14} /> AF Home Supplier Dashboard solves this
              </motion.div>
            </motion.div>
          )}

          {/* Highlight */}
          {scene === 'highlight' && <HighlightScene key="highlight" />}

          {/* Dashboard */}
          {scene === 'dashboard' && <DashboardScene key="dashboard" />}

          {/* Products */}
          {scene === 'products' && <ProductsScene key="products" />}

          {/* Orders */}
          {scene === 'orders' && <OrdersScene key="orders" />}

          {/* Analytics */}
          {scene === 'analytics' && <AnalyticsScene key="analytics" />}

          {/* Features */}
          {scene === 'features' && <FeaturesScene key="features" />}

          {/* How It Works */}
          {scene === 'howItWorks' && <HowItWorksScene key="howItWorks" />}

          {/* CTA */}
          {scene === 'cta' && (
            <motion.div key="cta"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }} className="text-center max-w-2xl"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-sky-400/20 to-blue-600/10 border border-sky-400/20 flex items-center justify-center shadow-[0_0_80px_rgba(56,189,248,0.2)]"
              >
                <Building2 size={40} className="text-sky-400" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-6xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-4 leading-tight"
              >
                Start Selling<br />on AF Home
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-white/40 text-lg mb-10">
                Join hundreds of suppliers already managing their business through the AF Home platform.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-4 flex-wrap"
              >
                <button className="group px-8 py-4 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-white font-bold rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_40px_rgba(56,189,248,0.3)] hover:shadow-[0_0_60px_rgba(56,189,248,0.5)]">
                  Register as Supplier <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => goTo('intro')}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-2xl transition-all">
                  Watch Again
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                className="mt-10 flex items-center justify-center gap-6 text-white/25 text-xs"
              >
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-sky-400/60" /> Full inventory control</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-sky-400/60" /> Real-time order tracking</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-sky-400/60" /> Built-in analytics</span>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="h-px bg-white/5">
          <motion.div key={scene} className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
            initial={{ width: '0%' }} animate={{ width: '100%' }}
            transition={{ duration: DURATIONS[scene] / 1000, ease: 'linear' }}
          />
        </div>
        <div className="pb-3 pt-2 flex justify-center">
          <span className="text-white/15 text-[10px] tracking-[0.2em] uppercase">
            {scene === 'intro' && 'Introduction'}
            {scene === 'challenge' && 'The Problem'}
            {scene === 'highlight' && 'One Dashboard. Everything.'}
            {scene === 'dashboard' && 'Dashboard Overview'}
            {scene === 'products' && 'Product Management'}
            {scene === 'orders' && 'Order Management'}
            {scene === 'analytics' && 'Analytics & Reports'}
            {scene === 'features' && 'Platform Features'}
            {scene === 'howItWorks' && 'Getting Started'}
            {scene === 'cta' && 'Join as Supplier'}
          </span>
        </div>
      </div>
    </div>
  );
}
