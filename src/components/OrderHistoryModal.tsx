import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  CreditCard, 
  MapPin, 
  ChevronRight, 
  ArrowLeft, 
  FileText, 
  AlertCircle, 
  Ticket, 
  Gift, 
  Phone, 
  User, 
  ExternalLink,
  Receipt,
  Search,
  Check,
  Printer
} from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { CustomerOrder, OrderStatus } from '../types';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateCatalog?: () => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onNavigateCatalog,
}) => {
  const { 
    userOrders, 
    selectedOrderForDetail, 
    setSelectedOrderForDetail, 
    updatePaymentStatus,
    cancelOrder 
  } = useOrders();

  const [activeFilter, setActiveFilter] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  if (!isOpen && !selectedOrderForDetail) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pesanan Dibuat':
      case 'Menunggu Pembayaran':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Menunggu Pembayaran',
        };
      case 'Pembayaran Berhasil':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Pembayaran Berhasil',
        };
      case 'Verifikasi Pesanan':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Verifikasi Pesanan',
        };
      case 'Dikemas':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: <Package className="w-3.5 h-3.5 text-indigo-600" />,
          label: 'Dikemas Admin',
        };
      case 'Dikirim':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          icon: <Truck className="w-3.5 h-3.5 text-purple-600" />,
          label: 'Sedang Dikirim',
        };
      case 'Selesai':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-600',
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Selesai',
        };
      case 'Dibatalkan':
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Dibatalkan',
        };
    }
  };

  // Filter orders
  const filteredOrders = userOrders.filter((ord) => {
    const matchesFilter = 
      activeFilter === 'semua' ? true :
      activeFilter === 'menunggu' ? (ord.orderStatus === 'Menunggu Pembayaran' || ord.orderStatus === 'Pesanan Dibuat') :
      activeFilter === 'dikemas' ? (ord.orderStatus === 'Dikemas' || ord.orderStatus === 'Verifikasi Pesanan' || ord.orderStatus === 'Pembayaran Berhasil') :
      activeFilter === 'dikirim' ? ord.orderStatus === 'Dikirim' :
      activeFilter === 'selesai' ? ord.orderStatus === 'Selesai' :
      activeFilter === 'dibatalkan' ? ord.orderStatus === 'Dibatalkan' : true;

    const matchesSearch = 
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Stepper milestones
  const steps: { key: OrderStatus; label: string; icon: any }[] = [
    { key: 'Pesanan Dibuat', label: 'Pesanan Dibuat', icon: ShoppingBag },
    { key: 'Menunggu Pembayaran', label: 'Menunggu Pembayaran', icon: CreditCard },
    { key: 'Dikemas', label: 'Dikemas Admin', icon: Package },
    { key: 'Dikirim', label: 'Dikirim Kurir', icon: Truck },
    { key: 'Selesai', label: 'Selesai Diterima', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'Pesanan Dibuat': return 0;
      case 'Menunggu Pembayaran': return 1;
      case 'Pembayaran Berhasil':
      case 'Verifikasi Pesanan': return 1;
      case 'Dikemas': return 2;
      case 'Dikirim': return 3;
      case 'Selesai': return 4;
      case 'Dibatalkan': return -1;
      default: return 0;
    }
  };

  return (
    <div
      id="order-history-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={() => {
        if (selectedOrderForDetail) {
          setSelectedOrderForDetail(null);
        } else {
          onClose();
        }
      }}
    >
      <div
        id="order-history-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-rose-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedOrderForDetail ? (
              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Kembali ke Daftar Riwayat"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
                📋
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{selectedOrderForDetail ? `Rincian Pesanan #${selectedOrderForDetail.orderNumber}` : 'Riwayat Pesanan Belanja'}</span>
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {selectedOrderForDetail
                  ? `${selectedOrderForDetail.formattedDate} • ${selectedOrderForDetail.customerRole}`
                  : `Daftar transaksi pesanan Anda melalui website Koperasi Merah Putih (${userOrders.length} Pesanan)`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedOrderForDetail(null);
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* 1. DETAIL VIEW FOR A SINGLE ORDER */}
          {selectedOrderForDetail ? (
            <div className="space-y-6">
              {/* Order Status Card & Stepper */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Transaksi</span>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const badge = getStatusBadge(selectedOrderForDetail.orderStatus);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badge.bg}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        );
                      })()}
                      <span className="text-xs font-bold text-slate-500">
                        Pembayaran: <span className="font-extrabold text-slate-800">{selectedOrderForDetail.paymentStatus}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyOrderId(selectedOrderForDetail.orderNumber)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>{copiedOrderId === selectedOrderForDetail.orderNumber ? 'Tersalin!' : selectedOrderForDetail.orderNumber}</span>
                    </button>
                    <button
                      onClick={handlePrintReceipt}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Cetak Nota"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tracking Stepper */}
                {selectedOrderForDetail.orderStatus !== 'Dibatalkan' && (
                  <div className="pt-2 pb-1">
                    <div className="relative flex justify-between items-center max-w-xl mx-auto">
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                      <div 
                        className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" 
                        style={{ width: `${Math.max(0, Math.min(100, (getStepIndex(selectedOrderForDetail.orderStatus) / (steps.length - 1)) * 100))}%` }}
                      />
                      {steps.map((step, idx) => {
                        const activeIdx = getStepIndex(selectedOrderForDetail.orderStatus);
                        const isDone = idx <= activeIdx;
                        const isCurrent = idx === activeIdx;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.key} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                              } ${isCurrent ? 'scale-110 ring-4 ring-emerald-100' : ''}`}
                            >
                              <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <span className={`text-[10px] sm:text-[11px] font-bold mt-1 text-center max-w-[65px] leading-tight ${
                              isCurrent ? 'text-emerald-700 font-black' : isDone ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 🛍️ Daftar Produk yang Dipesan */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-red-600" />
                  <span>Daftar Produk yang Dipesan ({selectedOrderForDetail.totalItemsCount} item)</span>
                </h3>
                <div className="divide-y divide-slate-100">
                  {selectedOrderForDetail.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{item.emoji || '📦'}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{item.productName}</span>
                            {item.isBonus && (
                              <span className="bg-amber-100 text-amber-800 font-black text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Gift className="w-2.5 h-2.5 text-amber-700" /> Bonus Promo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Variasi: <span className="font-bold text-slate-700">{item.variation}</span> • {item.quantity} × {item.isBonus ? 'GRATIS' : formatRupiah(item.price)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900">
                          {item.isBonus ? (
                            <span className="text-emerald-600 font-black">Rp 0 (Hadiah)</span>
                          ) : (
                            formatRupiah(item.subtotal)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 💰 Rincian Finansial & Kalkulasi (Sesuai Poin 8 Spesifikasi) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Rincian Pembayaran & Diskon</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Produk</span>
                    <span className="font-bold text-slate-900">{formatRupiah(selectedOrderForDetail.subtotal)}</span>
                  </div>

                  {selectedOrderForDetail.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Diskon {selectedOrderForDetail.customerRole === 'ANGGOTA' ? 'Khusus Anggota' : 'Spesial'}</span>
                      <span className="font-bold">- {formatRupiah(selectedOrderForDetail.discountAmount)}</span>
                    </div>
                  )}

                  {selectedOrderForDetail.voucherDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-amber-600" />
                        Voucher Belanja ({selectedOrderForDetail.appliedVoucherCode})
                      </span>
                      <span className="font-bold">- {formatRupiah(selectedOrderForDetail.voucherDiscountAmount)}</span>
                    </div>
                  )}

                  {selectedOrderForDetail.shippingVoucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-blue-600" />
                        Potongan Voucher Ongkir ({selectedOrderForDetail.appliedShippingVoucherCode})
                      </span>
                      <span className="font-bold">- {formatRupiah(selectedOrderForDetail.shippingVoucherDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>
                      Ongkos Kirim ({selectedOrderForDetail.deliveryDistanceKm} km)
                    </span>
                    <span className="font-bold text-slate-900">{formatRupiah(selectedOrderForDetail.shippingFee)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-900">Total Pembayaran</span>
                    <span className="text-base sm:text-lg font-black text-red-600">
                      {formatRupiah(selectedOrderForDetail.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 📍 Informasi Pengiriman & Penerima */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    Alamat Pengiriman
                  </h4>
                  <div className="font-bold text-slate-900">{selectedOrderForDetail.customerName}</div>
                  <div className="text-slate-600 leading-relaxed">{selectedOrderForDetail.shippingAddress}</div>
                  {selectedOrderForDetail.landmarkNotes && (
                    <div className="text-slate-500 bg-slate-50 p-2 rounded-xl text-[11px] border border-slate-100">
                      <span className="font-bold">Patokan:</span> {selectedOrderForDetail.landmarkNotes}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-slate-500">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    Metode & Kontak
                  </h4>
                  <div className="text-slate-600">
                    Metode: <span className="font-extrabold text-slate-900">{selectedOrderForDetail.paymentMethod}</span>
                  </div>
                  <div className="text-slate-600">
                    Kontak: <span className="font-extrabold text-slate-900 font-mono">{selectedOrderForDetail.customerPhone}</span>
                  </div>
                  {selectedOrderForDetail.customerNotes && (
                    <div className="text-slate-500 bg-slate-50 p-2 rounded-xl text-[11px] border border-slate-100">
                      <span className="font-bold">Catatan Pemesan:</span> {selectedOrderForDetail.customerNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setSelectedOrderForDetail(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 font-black text-slate-800 text-xs transition-colors"
                >
                  ← Kembali ke Daftar Riwayat
                </button>
                {selectedOrderForDetail.orderStatus === 'Menunggu Pembayaran' && (
                  <button
                    onClick={() => {
                      updatePaymentStatus(selectedOrderForDetail.id, 'Lunas', 'Konfirmasi mandiri via riwayat pesanan');
                    }}
                    className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white text-xs shadow-xs transition-colors"
                  >
                    💳 Konfirmasi Sudah Bayar
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* 2. LIST VIEW OF ORDERS */
            <div className="space-y-4">
              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {[
                    { id: 'semua', label: 'Semua' },
                    { id: 'menunggu', label: 'Menunggu Bayar' },
                    { id: 'dikemas', label: 'Dikemas' },
                    { id: 'dikirim', label: 'Dikirim' },
                    { id: 'selesai', label: 'Selesai' },
                    { id: 'dibatalkan', label: 'Dibatalkan' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                        activeFilter === tab.id
                          ? 'bg-red-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor pesanan / produk..."
                    className="w-full sm:w-60 pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Order Cards List */}
              {filteredOrders.length === 0 ? (
                <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
                    🛍️
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Belum Ada Pesanan yang Dibuat</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `Tidak ditemukan pesanan dengan kata kunci "${searchQuery}".`
                      : 'Semua pesanan yang Anda buat melalui website akan otomatis tersimpan di sini.'}
                  </p>
                  {onNavigateCatalog && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateCatalog();
                      }}
                      className="mt-2 py-2 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-xs"
                    >
                      Mulai Belanja Sembako
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((ord) => {
                    const badge = getStatusBadge(ord.orderStatus);
                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrderForDetail(ord)}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
                      >
                        {/* Header Item */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-xs">
                              #{ord.orderNumber}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • {ord.formattedDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-1.5 mb-3">
                          {ord.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-600">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm">{item.emoji || '📦'}</span>
                                <span className="font-bold text-slate-800 truncate">{item.productName}</span>
                                <span className="text-[11px] text-slate-400">({item.variation})</span>
                                <span className="font-bold text-slate-700">×{item.quantity}</span>
                              </div>
                              <span className="font-extrabold text-slate-900 shrink-0">
                                {item.isBonus ? 'Gratis' : formatRupiah(item.subtotal)}
                              </span>
                            </div>
                          ))}
                          {ord.items.length > 2 && (
                            <p className="text-[11px] text-slate-400 font-semibold italic">
                              +{ord.items.length - 2} produk lainnya...
                            </p>
                          )}
                        </div>

                        {/* Footer Card */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Belanja</span>
                            <div className="font-black text-red-600 text-sm">
                              {formatRupiah(ord.grandTotal)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 font-extrabold text-red-600 text-[11px] group-hover:translate-x-0.5 transition-transform">
                            <span>Lihat Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
