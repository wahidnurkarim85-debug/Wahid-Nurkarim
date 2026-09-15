import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  CreditCard, 
  Eye, 
  Phone, 
  MapPin, 
  User, 
  Calendar, 
  AlertCircle, 
  Check, 
  X, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Send,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { CustomerOrder, OrderStatus, PaymentStatus } from '../types';

export const AdminOrderHistoryManager: React.FC = () => {
  const { orders, updateOrderStatus, updatePaymentStatus, cancelOrder } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  
  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [cancelReasonModalOpen, setCancelReasonModalOpen] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState('');
  
  // Bank Settings Modal State
  const [bankSettingsOpen, setBankSettingsOpen] = useState(false);
  const [bankName, setBankName] = useState('Bank Rakyat Indonesia (BRI)');
  const [bankAccountNo, setBankAccountNo] = useState('1234-01-005678-50-9');
  const [bankHolderName, setBankHolderName] = useState('Koperasi Desa Merah Putih');

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ord) =>
          ord.orderNumber.toLowerCase().includes(q) ||
          ord.customerName.toLowerCase().includes(q) ||
          ord.customerPhone.toLowerCase().includes(q) ||
          (ord.userAccountId && ord.userAccountId.toLowerCase().includes(q)) ||
          ord.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((ord) => {
        const st = ord.orderStatus as any;
        if (statusFilter === 'verifikasi') return st === 'Verifikasi Pesanan';
        if (statusFilter === 'pembayaran') return st === 'Menunggu Pembayaran' || st === 'Pembayaran Pesanan';
        if (statusFilter === 'verifikasi_pembayaran') return st === 'Verifikasi Pembayaran' || ord.paymentStatus === 'Menunggu Pembayaran';
        if (statusFilter === 'dikemas') return st === 'Dikemas';
        if (statusFilter === 'dikirim') return st === 'Dikirim';
        if (statusFilter === 'selesai') return st === 'Selesai' || st === 'Pesanan Selesai';
        if (statusFilter === 'pengembalian') return st === 'Pengembalian Barang';
        if (statusFilter === 'dibatalkan') return st === 'Dibatalkan';
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'highest') return b.grandTotal - a.grandTotal;
      if (sortBy === 'lowest') return a.grandTotal - b.grandTotal;
      return 0;
    });

    return result;
  }, [orders, searchQuery, statusFilter, sortBy]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verifikasi Pesanan':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: '🟡 Verifikasi Pesanan' };
      case 'Menunggu Pembayaran':
      case 'Pembayaran Pesanan':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: '💳 Pembayaran Pesanan' };
      case 'Verifikasi Pembayaran':
        return { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: '🔎 Verifikasi Pembayaran' };
      case 'Dikemas':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: '📦 Dikemas' };
      case 'Dikirim':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: '🚚 Dikirim' };
      case 'Selesai':
      case 'Pesanan Selesai':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '✅ Selesai' };
      case 'Pengembalian Barang':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: '🔄 Pengembalian' };
      case 'Dibatalkan':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: '❌ Dibatalkan' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status };
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    if (status === 'Lunas') {
      return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">✅ Terverifikasi</span>;
    }
    if (status === 'Dibatalkan') {
      return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">❌ Dibatalkan</span>;
    }
    return <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">⏳ Menunggu</span>;
  };

  const handleActionClick = (order: CustomerOrder, nextStatus: OrderStatus) => {
    updateOrderStatus(order.id, nextStatus, `Status diperbarui oleh Admin menjadi ${nextStatus}`);
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...order, orderStatus: nextStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-red-600" />
            <span>📦 Riwayat Pesanan & Manajemen Fulfilment</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola status pesanan, verifikasi pembayaran, pengemasan staff, dan pengiriman kurir secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBankSettingsOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <CreditCard className="w-4 h-4 text-slate-600" />
            <span>Pengaturan Rekening Bank</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari No. Pesanan, Pelanggan, No HP, Produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Semua Status Pesanan</option>
            <option value="verifikasi">🟡 Verifikasi Pesanan</option>
            <option value="pembayaran">💳 Pembayaran Pesanan</option>
            <option value="verifikasi_pembayaran">🔎 Verifikasi Pembayaran</option>
            <option value="dikemas">📦 Dikemas</option>
            <option value="dikirim">🚚 Dikirim</option>
            <option value="selesai">✅ Selesai</option>
            <option value="pengembalian">🔄 Pengembalian Barang</option>
            <option value="dibatalkan">❌ Dibatalkan</option>
          </select>
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="newest">🕒 Terbaru</option>
            <option value="oldest">⏳ Terlama</option>
            <option value="highest">📈 Nominal Terbesar</option>
            <option value="lowest">📉 Nominal Terkecil</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">No. Pesanan</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Pembayaran</th>
                <th className="py-3.5 px-4">Status Pesanan</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Belum ada riwayat pesanan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord, idx) => {
                  const badge = getStatusBadge(ord.orderStatus);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{ord.orderNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{ord.customerName}</div>
                        <div className="text-[11px] text-slate-500">{ord.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-red-700">{formatRupiah(ord.grandTotal)}</td>
                      <td className="py-3.5 px-4">{getPaymentBadge(ord.paymentStatus)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-medium">{ord.formattedDate || ord.createdAt}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== DETAIL ORDER MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                  Detail Pesanan #{selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Manajemen Fulfilment & Riwayat Pesanan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Status Action Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-500">Status Saat Ini:</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{selectedOrder.orderStatus}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedOrder.orderStatus === 'Verifikasi Pesanan' && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedOrder, 'Menunggu Pembayaran')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verifikasi Pesanan (Lanjut Pembayaran)</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'Menunggu Pembayaran' && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedOrder, 'Pembayaran Berhasil')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Verifikasi Pembayaran Lunas</span>
                    </button>
                  )}

                  {(selectedOrder.orderStatus === 'Pembayaran Berhasil' || selectedOrder.orderStatus === 'Menunggu Pembayaran') && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedOrder, 'Dikemas')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Package className="w-4 h-4" />
                      <span>Mulai Dikemas (Staff)</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'Dikemas' && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedOrder, 'Dikirim')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Selesai Dikemas & Kirim (Kurir)</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'Dikirim' && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedOrder, 'Selesai')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tandai Selesai / Diterima</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus !== 'Dibatalkan' && selectedOrder.orderStatus !== 'Selesai' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Yakin ingin membatalkan pesanan ini?')) {
                          cancelOrder(selectedOrder.id, 'Dibatalkan oleh Admin Kopdes.');
                          setSelectedOrder({ ...selectedOrder, orderStatus: 'Dibatalkan' });
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Batalkan Pesanan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Info: Pelanggan & Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 👤 Data Pelanggan */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-red-600" />
                    <span>Data Pelanggan</span>
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <p><strong className="text-slate-900">Nama:</strong> {selectedOrder.customerName}</p>
                    <p><strong className="text-slate-900">Nomor HP:</strong> {selectedOrder.customerPhone}</p>
                    <p><strong className="text-slate-900">Peran Akun:</strong> {selectedOrder.customerRole}</p>
                    {selectedOrder.userAccountId && (
                      <p><strong className="text-slate-900">ID Akun:</strong> {selectedOrder.userAccountId}</p>
                    )}
                    <p><strong className="text-slate-900">Alamat Pengiriman:</strong> {selectedOrder.shippingAddress}</p>
                    {selectedOrder.customerNotes && (
                      <p><strong className="text-slate-900">Catatan:</strong> {selectedOrder.customerNotes}</p>
                    )}
                  </div>
                </div>

                {/* 💰 Ringkasan Pembayaran & Rekening */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-red-600" />
                    <span>Pembayaran & Rekening Kopdes</span>
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <p><strong className="text-slate-900">Metode:</strong> {selectedOrder.paymentMethod}</p>
                    <p><strong className="text-slate-900">Status Pembayaran:</strong> {selectedOrder.paymentStatus}</p>
                    <p><strong className="text-slate-900">Subtotal Produk:</strong> {formatRupiah(selectedOrder.subtotal)}</p>
                    {selectedOrder.discountAmount > 0 && (
                      <p><strong className="text-slate-900">Diskon:</strong> -{formatRupiah(selectedOrder.discountAmount)}</p>
                    )}
                    <p><strong className="text-slate-900">Ongkos Kirim ({selectedOrder.billedDistanceKm} km):</strong> {formatRupiah(selectedOrder.shippingFee)}</p>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-red-700">
                      <span>Total Tagihan:</span>
                      <span>{formatRupiah(selectedOrder.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🛒 Produk Dipesan */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-600" />
                  <span>Daftar Produk Pesanan ({selectedOrder.items.length} item)</span>
                </h4>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500">
                        <th className="py-3 px-4">Produk</th>
                        <th className="py-3 px-4">Variasi</th>
                        <th className="py-3 px-4">Harga</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 flex items-center gap-2 font-bold text-slate-800">
                            <span className="text-xl">{item.emoji || '📦'}</span>
                            <span>{item.productName}</span>
                            {item.isBonus && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">BONUS</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.variation || '-'}</td>
                          <td className="py-3 px-4 text-slate-600">{formatRupiah(item.price)}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-3 px-4 font-black text-slate-900">{formatRupiah(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🕒 Timeline Riwayat Status */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span>Timeline Perubahan Status Pesanan</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                    <div className="space-y-3 border-l-2 border-red-500 pl-4 ml-1">
                      {selectedOrder.statusHistory.map((hist, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs">{hist.status}</span>
                            <span className="text-[11px] text-slate-500 font-medium">{hist.updatedAt}</span>
                          </div>
                          {hist.note && <p className="text-slate-600 text-[11px]">{hist.note}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">Belum ada catatan riwayat status.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BANK SETTINGS MODAL ===================== */}
      {bankSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <span>Pengaturan Rekening Kopdes</span>
              </h3>
              <button
                type="button"
                onClick={() => setBankSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-extrabold text-slate-700">Nama Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700">Nomor Rekening</label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setBankSettingsOpen(false);
                  alert('Pengaturan rekening berhasil diperbarui!');
                }}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-md transition-all"
              >
                Simpan Rekening
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
