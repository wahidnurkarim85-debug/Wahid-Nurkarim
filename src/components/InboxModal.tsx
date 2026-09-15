import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Search, 
  Ticket, 
  Gift, 
  ShoppingBag, 
  Tag, 
  Info, 
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Truck,
  Percent,
  Copy,
  Check,
  Lock,
  UserCheck,
  LogIn
} from 'lucide-react';
import { useInbox } from '../context/InboxContext';
import { useAuth } from '../context/AuthContext';
import { InboxCategory, InboxMessage } from '../types';
import { navigateToCatalogProduct, createBelanjaSekarangBannerSvg } from '../utils/copywritingHelper';

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onNavigateTab: (tab: 'home' | 'catalog' | 'cart' | 'admin' | 'member' | 'profile') => void;
}

export const InboxModal: React.FC<InboxModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const { 
    messages, 
    unreadCount, 
    isAuthenticatedUser,
    isBasicUser,
    isMemberUser,
    markAsRead, 
    markAllAsRead, 
    deleteMessageForUser 
  } = useInbox();

  const [activeCategory, setActiveCategory] = useState<InboxCategory | 'semua'>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [notificationNote, setNotificationNote] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter messages by category and search
  const filteredMessages = messages.filter((msg) => {
    const matchesCategory = activeCategory === 'semua' || msg.category === activeCategory;
    const matchesSearch = 
      msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: InboxCategory) => {
    switch (category) {
      case 'pesanan':
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Pesanan',
          bg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'voucher':
        return {
          icon: <Ticket className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Voucher',
          bg: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'gift':
        return {
          icon: <Gift className="w-3.5 h-3.5 text-purple-600" />,
          label: 'Gift / Bonus',
          bg: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'promo':
        return {
          icon: <Tag className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Promo',
          bg: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'informasi':
        return {
          icon: <Info className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Informasi',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'sistem':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />,
          label: 'Sistem',
          bg: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    }
  };

  const handleMessageClick = (msg: InboxMessage) => {
    if (!msg.isRead) {
      markAsRead(msg.id);
    }
    setSelectedMessage(msg);
  };

  const handleActionClick = (msg: InboxMessage) => {
    if (!msg.isRead) {
      markAsRead(msg.id);
    }
    onClose();
    if (msg.actionTab) {
      onNavigateTab(msg.actionTab);
    } else if (msg.category === 'pesanan' || msg.category === 'voucher') {
      onNavigateTab('cart');
    } else if (msg.category === 'promo' || msg.category === 'gift') {
      onNavigateTab('catalog');
    } else {
      onNavigateTab('home');
    }
  };

  const handleDeleteMessage = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    deleteMessageForUser(msgId);
    if (selectedMessage?.id === msgId) {
      setSelectedMessage(null);
    }
    setNotificationNote('Pesan dihapus dari kotak masuk Anda tanpa mengubah data transaksi asli.');
    setTimeout(() => setNotificationNote(null), 3500);
  };

  const categories: { id: InboxCategory | 'semua'; label: string; icon: string }[] = [
    { id: 'semua', label: 'Semua', icon: '📩' },
    { id: 'pesanan', label: 'Pesanan', icon: '🛍️' },
    { id: 'voucher', label: 'Voucher', icon: '🎟️' },
    { id: 'gift', label: 'Gift', icon: '🎁' },
    { id: 'promo', label: 'Promo', icon: '💰' },
    { id: 'informasi', label: 'Informasi', icon: '📢' },
    { id: 'sistem', label: 'Sistem', icon: '⚠️' },
  ];

  return (
    <div
      id="inbox-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="inbox-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] transition-all"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-rose-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
              📩
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Kotak Pesan Pelanggan
                </h2>
                {isAuthenticatedUser ? (
                  <>
                    {isMemberUser ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center gap-1 shadow-xs">
                        ⭐ Anggota Resmi
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center gap-1 shadow-xs">
                        🟢 Akun Basic
                      </span>
                    )}

                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-black animate-pulse flex items-center gap-1 shadow-xs">
                        🔴 {unreadCount} Belum Dibaca
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40">
                        ✓ Semua Terbaca
                      </span>
                    )}
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 text-[11px] font-bold border border-amber-400/30 flex items-center gap-1">
                    🔒 Belum Masuk Akun
                  </span>
                )}
              </div>
              <p className="text-[11px] text-red-100 font-medium mt-0.5">
                {isAuthenticatedUser 
                  ? 'Pusat notifikasi pesanan, voucher, bonus gift, promo sembako & info resmi'
                  : 'Kotak pesan otomatis tidak menerima pesan saat tidak login Akun Basic atau Anggota'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticatedUser && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all"
                title="Tandai semua pesan sebagai sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Tutup Kotak Pesan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Note */}
        {notificationNote && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationNote}</span>
            </div>
            <button onClick={() => setNotificationNote(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!isAuthenticatedUser ? (
          /* 🔒 TAMPILAN KHUSUS PENGUNJUNG YANG BELUM MASUK AKUN */
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center text-center my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-3xl shadow-xs mb-4">
              📭
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black mb-3">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Akses Kotak Pesan Dinonaktifkan</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-2">
              Kotak Pesan Otomatis Tidak Menerima Pesan
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
              Sesuai kebijakan privasi & keamanan Koperasi Desa Merah Putih, kotak pesan pelanggan secara otomatis tidak menerima atau menampilkan pesan saat Anda <strong>belum login ke Akun Basic atau Akun Anggota</strong>.
            </p>

            <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-6 space-y-2.5 text-xs text-slate-700">
              <div className="font-black text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Keuntungan yang Anda dapatkan setelah login:</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🛍️</span>
                <div>
                  <strong className="text-slate-900">Notifikasi Pesanan Real-Time:</strong> Status persiapan barang, pengiriman kurir, dan nomor resi sembako.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🎟️</span>
                <div>
                  <strong className="text-slate-900">Voucher Diskon Belanja:</strong> Potongan harga khusus sembako dan subsidi ongkos kirim.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">🎁</span>
                <div>
                  <strong className="text-slate-900">Promo Gift & Hadiah Bonus:</strong> Hadiah sembako gratis dari program loyalitas (khusus Anggota Resmi).
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-sm">📢</span>
                <div>
                  <strong className="text-slate-900">Pengumuman Resmi Gerai:</strong> Informasi ketersediaan beras, minyak goreng, gula, dan sembako murah.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) {
                    onOpenAuth();
                  } else {
                    onNavigateTab('member');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md shadow-red-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Daftar Akun Basic</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('member');
                }}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-red-600" />
                <span>Masuk Akun Anggota</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Category Filter Navigation */}
            <div className="p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200 space-y-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pesan sembako, promo, voucher..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => {
              const countForCat = cat.id === 'semua' 
                ? messages.length 
                : messages.filter((m) => m.category === cat.id).length;
              const unreadForCat = cat.id === 'semua'
                ? unreadCount
                : messages.filter((m) => m.category === cat.id && !m.isRead).length;

              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {unreadForCat > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                    }`}>
                      {unreadForCat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 divide-y divide-transparent">
          {filteredMessages.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl mx-auto text-slate-400">
                📭
              </div>
              <div>
                <p className="font-extrabold text-slate-700 text-sm">
                  Tidak ada pesan di kategori ini
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seluruh pesan atau pemberitahuan baru akan otomatis muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const catBadge = getCategoryBadge(msg.category);
              const isSelected = selectedMessage?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    !msg.isRead
                      ? 'bg-red-50/40 border-red-200 shadow-2xs hover:border-red-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Status Indicator & Category Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* Unread dot / checkmark */}
                      {!msg.isRead ? (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                          🔴 Belum Dibaca
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          ✓ Sudah Dibaca
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${catBadge.bg}`}>
                        {catBadge.icon}
                        <span>{catBadge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{msg.createdAt}</span>
                      </span>

                      {/* Delete notification button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMessage(e, msg.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100"
                        title="Hapus pemberitahuan ini dari kotak pesan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div className="space-y-1">
                    <h3 className={`text-sm tracking-tight ${
                      !msg.isRead ? 'font-black text-slate-900' : 'font-extrabold text-slate-800'
                    }`}>
                      {msg.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words">
                      {msg.content}
                    </p>
                  </div>

                  {/* Visual Section: Popular Products with Belanja Sekarang image banner */}
                  {msg.featuredProducts && msg.featuredProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>🛍️</span>
                          <span>Produk Terpopuler (Klik Gambar untuk Belanja)</span>
                        </span>
                        <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
                          Langsung ke Produk
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.featuredProducts.map((p) => {
                          const bannerSrc = p.bannerSvgUrl || createBelanjaSekarangBannerSvg(p.name, p.formattedPrice, p.trendText);
                          return (
                            <div 
                              key={p.id}
                              className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {p.imageUrl ? (
                                    <img 
                                      src={p.imageUrl} 
                                      alt={p.name} 
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-9 object-cover rounded-lg border border-slate-200" 
                                    />
                                  ) : (
                                    <span className="text-xl">{p.emoji || '🛍️'}</span>
                                  )}
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 leading-tight">{p.name}</h4>
                                    <span className="text-[11px] font-extrabold text-red-600">{p.formattedPrice}</span>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded-sm">
                                  {p.trendText}
                                </span>
                              </div>

                              {/* Interactive Belanja Sekarang Image Banner */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToCatalogProduct(p.id);
                                  onClose();
                                }}
                                className="group cursor-pointer rounded-lg overflow-hidden border border-red-400/40 shadow-2xs hover:shadow-md transition-all hover:scale-101 relative"
                                title="Klik gambar Belanja Sekarang untuk langsung membuka produk ini di katalog!"
                              >
                                <img 
                                  src={bannerSrc} 
                                  alt={`Belanja Sekarang - ${p.name}`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-auto object-contain block"
                                />
                                <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                    <ShoppingBag className="w-3 h-3" /> Langsung ke Produk ➜
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Connected Vouchers Section */}
                  {msg.availableVouchers && msg.availableVouchers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                        <Ticket className="w-3 h-3 text-blue-600" />
                        <span>Voucher Belanja &amp; Ongkir Tersedia:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.availableVouchers.map((v) => (
                          <div 
                            key={v.id} 
                            className="bg-blue-50/80 border border-blue-200 text-blue-900 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold"
                          >
                            <span>{v.code}</span>
                            <span className="text-blue-700">({v.discountText})</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(v.code);
                                setNotificationNote(`Kode voucher ${v.code} berhasil disalin!`);
                                setTimeout(() => setNotificationNote(null), 2500);
                              }}
                              className="px-1 py-0.5 bg-blue-200/70 hover:bg-blue-300 text-blue-900 rounded text-[9px] font-extrabold"
                            >
                              Salin
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connected Promo Gifts Section */}
                  {msg.giftPromos && msg.giftPromos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[11px] font-black text-purple-900 flex items-center gap-1">
                        <Gift className="w-3 h-3 text-purple-600" />
                        <span>Promo Gift / Hadiah Gratis:</span>
                      </span>
                      <div className="space-y-1 text-[10px]">
                        {msg.giftPromos.map((gp) => (
                          <div key={gp.id} className="bg-purple-50 text-purple-900 border border-purple-200 rounded-lg p-1.5 flex items-center justify-between">
                            <span>{gp.conditionText}</span>
                            <span className="font-black text-purple-700">{gp.rewardText}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button if connected to feature */}
                  {msg.actionLabel && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Terhubung ke fitur aplikasi
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(msg);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all hover:scale-102"
                      >
                        <span>{msg.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
          </>
        )}

        {/* Modal Footer Note */}
        {!isAuthenticatedUser ? (
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Masuk ke akun Basic atau Anggota untuk mengaktifkan kotak pesan otomatis.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuth) onOpenAuth();
                else onNavigateTab('member');
              }}
              className="text-red-700 hover:text-red-800 font-extrabold text-xs cursor-pointer whitespace-nowrap"
            >
              Masuk Akun →
            </button>
          </div>
        ) : (
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Membaca atau menghapus pesan tidak mengubah data pesanan, voucher aktif, atau akun Anda.</span>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-red-700 hover:text-red-800 font-extrabold text-xs disabled:opacity-40 disabled:hover:text-red-700 cursor-pointer"
            >
              ✓ Tandai Semua Dibaca
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
