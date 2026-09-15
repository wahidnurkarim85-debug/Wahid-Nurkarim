import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsEvent, SavedProduct } from '../types';
import { 
  BarChart3, 
  Users, 
  Eye, 
  ShoppingCart, 
  MousePointerClick, 
  MessageCircle,
  Heart,
  TrendingUp,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';

export const AdminAnalyticsManager: React.FC = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [roleFilter, setRoleFilter] = useState<'all' | 'basic' | 'anggota'>('all');

  useEffect(() => {
    setLoading(true);
    const qEvents = query(collection(db, 'analyticsEvents'), orderBy('timestamp', 'desc'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalyticsEvent));
      setEvents(data);
      setLoading(false);
    });

    const qSaved = query(collection(db, 'savedProducts'), orderBy('createdAt', 'desc'));
    const unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedProduct));
      setSavedProducts(data);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeSaved();
    };
  }, []);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter(e => e.userRole === roleFilter);
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === 'today') {
      result = result.filter(e => new Date(e.timestamp).toDateString() === now.toDateString());
    } else if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter(e => new Date(e.timestamp) >= sevenDaysAgo);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter(e => new Date(e.timestamp) >= thirtyDaysAgo);
    }

    return result;
  }, [events, dateFilter, roleFilter]);

  // Kalkulasi Statistik Utama
  const stats = useMemo(() => {
    let totalPageViews = 0;
    let totalCatalogViews = 0;
    let totalCartViews = 0;
    let totalProductClicks = 0;
    let totalAddToCart = 0;
    let totalBuatPesanan = 0;

    const uniqueUsers = new Set<string>();

    filteredEvents.forEach(e => {
      uniqueUsers.add(e.sessionId);
      if (e.eventType === 'page_view') totalPageViews++;
      if (e.eventType === 'catalog_view') totalCatalogViews++;
      if (e.eventType === 'cart_view') totalCartViews++;
      if (e.eventType === 'product_click') totalProductClicks++;
      if (e.eventType === 'add_to_cart') totalAddToCart++;
      if (e.eventType === 'buat_pesanan') totalBuatPesanan++;
    });

    return {
      totalUsers: uniqueUsers.size,
      totalPageViews,
      totalCatalogViews,
      totalCartViews,
      totalProductClicks,
      totalAddToCart,
      totalBuatPesanan
    };
  }, [filteredEvents]);

  // Laporan Katalog -> Keranjang
  const catalogEffectiveness = useMemo(() => {
    const basicCatalogUsers = new Set<string>();
    const basicCartAddUsers = new Set<string>();
    const anggotaCatalogUsers = new Set<string>();
    const anggotaCartAddUsers = new Set<string>();

    filteredEvents.forEach(e => {
      if (e.userRole === 'basic') {
        if (e.eventType === 'catalog_view') basicCatalogUsers.add(e.sessionId);
        if (e.eventType === 'add_to_cart' && e.source === 'Katalog Produk') basicCartAddUsers.add(e.sessionId);
      } else {
        if (e.eventType === 'catalog_view') anggotaCatalogUsers.add(e.userId || e.sessionId);
        if (e.eventType === 'add_to_cart' && e.source === 'Katalog Produk') anggotaCartAddUsers.add(e.userId || e.sessionId);
      }
    });

    const basicCatalog = basicCatalogUsers.size;
    const basicCartAdd = basicCartAddUsers.size;
    const basicRatio = basicCatalog > 0 ? ((basicCartAdd / basicCatalog) * 100).toFixed(1) : 0;

    const anggotaCatalog = anggotaCatalogUsers.size;
    const anggotaCartAdd = anggotaCartAddUsers.size;
    const anggotaRatio = anggotaCatalog > 0 ? ((anggotaCartAdd / anggotaCatalog) * 100).toFixed(1) : 0;

    const totalCatalog = basicCatalog + anggotaCatalog;
    const totalCartAdd = basicCartAdd + anggotaCartAdd;
    const totalRatio = totalCatalog > 0 ? ((totalCartAdd / totalCatalog) * 100).toFixed(1) : 0;

    return {
      basic: { catalog: basicCatalog, cartAdd: basicCartAdd, ratio: basicRatio },
      anggota: { catalog: anggotaCatalog, cartAdd: anggotaCartAdd, ratio: anggotaRatio },
      total: { catalog: totalCatalog, cartAdd: totalCartAdd, ratio: totalRatio },
    };
  }, [filteredEvents]);

  // Statistik Aktivitas Pengguna (Anggota & Basic)
  const userStats = useMemo(() => {
    const uStats: Record<string, { role: string; catalog: number; views: number; vars: number; adds: number; cartViews: number; saves: number; orders: number }> = {};

    filteredEvents.forEach(e => {
      const uid = e.userRole === 'anggota' ? (e.userId || e.sessionId) : e.sessionId;
      if (!uStats[uid]) {
        uStats[uid] = { role: e.userRole, catalog: 0, views: 0, vars: 0, adds: 0, cartViews: 0, saves: 0, orders: 0 };
      }
      
      if (e.eventType === 'catalog_view') uStats[uid].catalog++;
      if (e.eventType === 'product_click') uStats[uid].views++;
      if (e.eventType === 'variation_select') uStats[uid].vars++;
      if (e.eventType === 'add_to_cart') uStats[uid].adds++;
      if (e.eventType === 'cart_view') uStats[uid].cartViews++;
      if (e.eventType === 'product_saved') uStats[uid].saves++;
      if (e.eventType === 'buat_pesanan') uStats[uid].orders++;
    });

    return Object.entries(uStats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.orders - a.orders || b.adds - a.adds);
  }, [filteredEvents]);
  const productStats = useMemo(() => {
    const pStats: Record<string, { name: string; category: string; variation: string; views: number; adds: number; saves: number; orders: number }> = {};

    filteredEvents.forEach(e => {
      if (e.productId) {
        const varKey = e.variation || 'Standar';
        const key = `${e.productId}_${varKey}`;
        if (!pStats[key]) pStats[key] = { 
          name: e.productName || 'Unknown', 
          category: e.productCategory || 'Lainnya',
          variation: varKey, 
          views: 0, 
          adds: 0, 
          saves: 0, 
          orders: 0 
        };
        
        if (e.eventType === 'product_click') pStats[key].views++;
        if (e.eventType === 'add_to_cart') pStats[key].adds++;
        if (e.eventType === 'product_saved') pStats[key].saves++;
        if (e.eventType === 'buat_pesanan') pStats[key].orders++; // assuming trackEvent('buat_pesanan') for individual product logic can be enhanced, or we track order level for now
      }
    });

    savedProducts.forEach(s => {
      const varKey = s.variation || 'Standar';
      const key = `${s.productId}_${varKey}`;
      if (!pStats[key]) pStats[key] = { 
        name: s.productName || 'Unknown', 
        category: s.productCategory || 'Lainnya',
        variation: varKey, 
        views: 0, 
        adds: 0, 
        saves: 0, 
        orders: 0 
      };
      pStats[key].saves++;
    });

    return Object.entries(pStats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.adds - a.adds); // Sort by adds to cart
  }, [filteredEvents, savedProducts]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-600" />
            Statistik & Analitik Website
          </h2>
          <p className="text-xs text-slate-500 mt-1">Pantau aktivitas pengunjung dan anggota secara real-time.</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 outline-none pr-2 cursor-pointer"
            >
              <option value="all">Semua Pengguna</option>
              <option value="basic">Pengguna Basic (Belum Login)</option>
              <option value="anggota">Anggota (Sudah Login)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 outline-none pr-2 cursor-pointer"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="all">Semua Waktu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          title="Pengguna Aktif" 
          value={stats.totalUsers} 
          bg="bg-indigo-50" border="border-indigo-200" text="text-indigo-900"
        />
        <StatCard 
          icon={<Eye className="w-5 h-5 text-blue-600" />}
          title="Lihat Halaman Utama" 
          value={stats.totalPageViews} 
          bg="bg-blue-50" border="border-blue-200" text="text-blue-900"
        />
        <StatCard 
          icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
          title="Buka Keranjang" 
          value={stats.totalCartViews} 
          bg="bg-emerald-50" border="border-emerald-200" text="text-emerald-900"
        />
        <StatCard 
          icon={<MessageCircle className="w-5 h-5 text-green-600" />}
          title="Buat Pesanan" 
          value={stats.totalBuatPesanan} 
          bg="bg-green-50" border="border-green-200" text="text-green-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laporan Konversi / Funnel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-red-600" /> Funnel Konversi
          </h3>
          <div className="space-y-3">
            <FunnelStep label="1. Buka Website (Page Views)" value={stats.totalPageViews} max={stats.totalPageViews} color="bg-slate-200" />
            <FunnelStep label="2. Buka Katalog Sembako" value={stats.totalCatalogViews} max={stats.totalPageViews} color="bg-blue-300" />
            <FunnelStep label="3. Klik / Lihat Produk" value={stats.totalProductClicks} max={stats.totalPageViews} color="bg-indigo-300" />
            <FunnelStep label="4. Tambah ke Keranjang" value={stats.totalAddToCart} max={stats.totalPageViews} color="bg-emerald-300" />
            <FunnelStep label="5. Klik Buat Pesanan" value={stats.totalBuatPesanan} max={stats.totalPageViews} color="bg-green-400" />
          </div>
        </div>

        {/* Laporan Efektivitas Katalog Produk */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Efektivitas Katalog Produk (Katalog → Keranjang)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 font-bold">Status Pengguna</th>
                  <th className="p-3 font-bold text-center">Buka Katalog (Unik)</th>
                  <th className="p-3 font-bold text-center">Tambah Keranjang (Unik)</th>
                  <th className="p-3 font-bold text-center">Rasio Konversi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">Basic (Pengunjung)</td>
                  <td className="p-3 text-center">{catalogEffectiveness.basic.catalog}</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">{catalogEffectiveness.basic.cartAdd}</td>
                  <td className="p-3 text-center font-black text-slate-900">{catalogEffectiveness.basic.ratio}%</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">Anggota Resmi</td>
                  <td className="p-3 text-center">{catalogEffectiveness.anggota.catalog}</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">{catalogEffectiveness.anggota.cartAdd}</td>
                  <td className="p-3 text-center font-black text-slate-900">{catalogEffectiveness.anggota.ratio}%</td>
                </tr>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="p-3 font-black text-slate-900">Total Keseluruhan</td>
                  <td className="p-3 text-center font-bold text-slate-900">{catalogEffectiveness.total.catalog}</td>
                  <td className="p-3 text-center font-black text-emerald-700">{catalogEffectiveness.total.cartAdd}</td>
                  <td className="p-3 text-center font-black text-emerald-700">{catalogEffectiveness.total.ratio}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistik Per Produk */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[400px] lg:col-span-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 shrink-0">
            <BarChart3 className="w-4 h-4 text-red-600" /> Aktivitas Per Produk & Variasi
          </h3>
          <div className="flex-1 overflow-y-auto mt-3 pr-2 space-y-2">
            {productStats.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada data aktivitas produk.</p>
            ) : (
              productStats.map(ps => (
                <div key={ps.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-slate-800 line-clamp-1">{ps.name}</span>
                    <span className="text-[10px] text-slate-500">{ps.category} • Variasi: <strong className="text-slate-700">{ps.variation}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-semibold text-slate-600 text-[10px]">
                    <span className="flex items-center gap-1" title="Dilihat"><Eye className="w-3 h-3" /> {ps.views}</span>
                    <span className="flex items-center gap-1" title="Ditambah ke Keranjang"><ShoppingCart className="w-3 h-3 text-emerald-600" /> {ps.adds}</span>
                    <span className="flex items-center gap-1" title="Disimpan Anggota"><Heart className="w-3 h-3 text-red-500" /> {ps.saves}</span>
                    <span className="flex items-center gap-1" title="Buat Pesanan"><MessageCircle className="w-3 h-3 text-green-600" /> {ps.orders}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Daftar Produk Disimpan (Wishlist Anggota) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Heart className="w-4 h-4 text-red-500" /> Produk Disimpan (Wishlist) Anggota
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {savedProducts.slice(0, 12).map(sp => (
            <div key={sp.id} className="bg-red-50/50 border border-red-100 p-3 rounded-xl flex flex-col justify-between h-full gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 line-clamp-2">{sp.productName}</span>
                <span className="text-[10px] text-slate-600">Var: {sp.variation || 'Standar'}</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between items-center mt-auto">
                <span>User: {sp.userId.substring(0,6)}...</span>
                <span>{new Date(sp.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {savedProducts.length === 0 && (
            <p className="text-xs text-slate-500 col-span-full">Belum ada produk yang disimpan oleh Anggota.</p>
          )}
        </div>
      </div>

      {/* Detail Aktivitas Pengguna (Anggota & Basic) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-4 h-4 text-indigo-600" /> Detail Aktivitas Basic & Anggota
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3 font-bold">ID / Status</th>
                <th className="p-3 font-bold text-center">Buka Katalog</th>
                <th className="p-3 font-bold text-center">Lihat Produk</th>
                <th className="p-3 font-bold text-center">Pilih Variasi</th>
                <th className="p-3 font-bold text-center">Tambah Keranjang</th>
                <th className="p-3 font-bold text-center">Buka Keranjang</th>
                <th className="p-3 font-bold text-center">Simpan Produk</th>
                <th className="p-3 font-bold text-center text-emerald-700">Buat Pesanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userStats.slice(0, 15).map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <span className="font-bold text-slate-800">{u.id.substring(0, 8)}...</span>
                    <span className={`block mt-1 w-fit text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                      u.role === 'anggota' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {u.role === 'anggota' ? '👤 Anggota' : '🌐 Basic Anonim'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-600">{u.catalog}</td>
                  <td className="p-3 text-center font-semibold text-slate-600">{u.views}</td>
                  <td className="p-3 text-center font-semibold text-slate-600">{u.vars}</td>
                  <td className="p-3 text-center font-bold text-indigo-600">{u.adds}</td>
                  <td className="p-3 text-center font-semibold text-slate-600">{u.cartViews}</td>
                  <td className="p-3 text-center font-semibold text-red-500">{u.saves}</td>
                  <td className="p-3 text-center font-black text-emerald-700">{u.orders}</td>
                </tr>
              ))}
              {userStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-5 text-center text-slate-500 font-medium">Belum ada aktivitas pengguna.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

const StatCard = ({ icon, title, value, bg, border, text }: any) => (
  <div className={`p-4 rounded-2xl border shadow-xs flex flex-col items-center justify-center text-center gap-2 ${bg} ${border}`}>
    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${text}`}>
      {icon}
    </div>
    <div>
      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{title}</h4>
      <div className={`text-2xl font-black ${text}`}>{value.toLocaleString('id-ID')}</div>
    </div>
  </div>
);

const FunnelStep = ({ label, value, max, color }: any) => {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span>{value.toLocaleString()} ({percent}%)</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};
