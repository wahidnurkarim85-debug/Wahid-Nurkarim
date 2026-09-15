import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  User, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Ticket,
  Users,
  CreditCard,
  Lock,
  Mail,
  CheckCircle2,
  ArrowUpRight,
  Receipt,
  Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useInbox } from '../context/InboxContext';
import { usePoints } from '../context/PointContext';

interface HeaderProps {
  activeTab: 'home' | 'catalog' | 'cart' | 'admin' | 'member' | 'profile';
  setActiveTab: (tab: 'home' | 'catalog' | 'cart' | 'admin' | 'member' | 'profile') => void;
  openAuthModal: () => void;
  onOpenStaffAuth?: () => void;
  onSelectAdminSubTab?: (subTab: 'products' | 'vouchers' | 'employees' | 'members' | 'visitors' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'shipping') => void;
  onOpenFinancialReport: () => void;
  onOpenProfile?: () => void;
  onOpenUpgrade?: () => void;
  onOpenInbox: () => void;
  onOpenOrderHistory?: () => void;
  onOpenPointModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  openAuthModal,
  onOpenStaffAuth,
  onSelectAdminSubTab,
  onOpenFinancialReport,
  onOpenProfile,
  onOpenUpgrade,
  onOpenInbox,
  onOpenOrderHistory,
  onOpenPointModal
}) => {
  const { user, isStaff, isManager, logout, loginDemo, loginWithGoogle } = useAuth();
  const { totalItems } = useCart();
  const { unreadCount } = useInbox();
  const { getCurrentUserPointAccount } = usePoints();
  const userPointAccount = getCurrentUserPointAccount(user?.phone || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (tab: 'home' | 'catalog' | 'cart' | 'admin' | 'member' | 'profile', sectionId?: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (sectionId && tab === 'home') {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenAdminWithSubTab = (subTab: 'products' | 'vouchers' | 'employees' | 'members' | 'visitors' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'shipping') => {
    if (onSelectAdminSubTab) {
      onSelectAdminSubTab(subTab);
    }
    setActiveTab('admin');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Brand & Kotak Pesan (Sebelah Kanan Koperasi Desa Merah Putih) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div 
              id="header-brand-logo"
              onClick={() => {
                navigateTo('home');
                if (onOpenStaffAuth) {
                  onOpenStaffAuth();
                }
              }}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
              title="Klik logo untuk Masuk Akun Karyawan"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-900/20 group-hover:scale-105 transition-transform shrink-0">
                MP
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                    KOPERASI DESA MERAH PUTIH
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    DESA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Gerai Sembako Cengkareng Timur
                </p>
              </div>
            </div>

            {/* 📩 FITUR KOTAK PESAN (Di Header, Sebelah Kanan Koperasi Desa Merah Putih) */}
            <button
              id="header-inbox-btn"
              type="button"
              onClick={onOpenInbox}
              className="relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 hover:from-red-100 hover:to-amber-100 border border-red-200/90 text-red-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer group select-none shrink-0"
              title={
                !user 
                  ? 'Kotak Pesan: Masuk Akun Basic atau Anggota untuk menerima pesan' 
                  : unreadCount > 0 
                    ? `Kotak Pesan: ${unreadCount} pesan belum dibaca` 
                    : 'Kotak Pesan: Semua pesan sudah dibaca'
              }
            >
              <div className="relative flex items-center justify-center">
                <span className="text-base sm:text-lg group-hover:scale-110 transition-transform">📩</span>
                {/* Mobile Floating Badge Indicator (Hanya saat login) */}
                {user && unreadCount > 0 && (
                  <span 
                    id="header-inbox-badge-mobile"
                    className="absolute -top-1.5 -right-2 md:hidden flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black shadow-xs ring-2 ring-white animate-pulse"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-red-950 hidden md:inline whitespace-nowrap">
                  Kotak Pesan
                </span>
                {user ? (
                  unreadCount > 0 ? (
                    <span 
                      id="header-inbox-unread-badge"
                      className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-xs animate-pulse tracking-wide"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
                      <span className="text-[9px] font-bold opacity-90">Baru</span>
                    </span>
                  ) : (
                    <span 
                      id="header-inbox-read-indicator"
                      className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:inline" 
                      title="Semua pesan sudah dibaca" 
                    />
                  )
                ) : (
                  <span 
                    id="header-inbox-guest-indicator"
                    className="hidden sm:inline-flex items-center text-[10px] text-slate-400 font-medium" 
                    title="Masuk Akun Basic atau Anggota untuk menerima pesan"
                  >
                    (Nonaktif)
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              id="nav-btn-home"
              onClick={() => navigateTo('home')}
              className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-colors ${
                activeTab === 'home' 
                  ? 'bg-red-50 text-red-700' 
                  : 'text-slate-600 hover:text-red-700 hover:bg-slate-100'
              }`}
            >
              Beranda
            </button>

            <button
              id="nav-btn-catalog"
              onClick={() => navigateTo('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'catalog' 
                  ? 'bg-red-50 text-red-700' 
                  : 'text-slate-600 hover:text-red-700 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-red-600" />
              Katalog Sembako
            </button>

            {/* AKUN KARYAWAN MENU: Menu Karyawan & Menu Anggota (Dapat Diedit) */}
            {isStaff && (
              <>
                <button
                  id="nav-btn-menu-karyawan"
                  onClick={() => handleOpenAdminWithSubTab('employees')}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-black'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
                  }`}
                  title="Kelola Nama dan NIK KTP Karyawan (Dapat Diedit)"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Menu Karyawan</span>
                </button>

                <button
                  id="nav-btn-menu-anggota-staff"
                  onClick={() => handleOpenAdminWithSubTab('members')}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-black'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
                  }`}
                  title="Kelola Nama dan Nomor Anggota Koperasi (Dapat Diedit)"
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Menu Anggota (Edit)</span>
                </button>

                <button
                  id="nav-btn-delivery-center-header"
                  onClick={() => handleOpenAdminWithSubTab('shipping')}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-300 font-black'
                      : 'text-slate-600 hover:text-red-800 hover:bg-red-50'
                  }`}
                  title="Pusat Pengiriman Pintar Berbasis GPS & Rute Karyawan"
                >
                  <Truck className="w-4 h-4 text-red-600" />
                  <span>Pusat Pengiriman</span>
                </button>

                <button
                  id="nav-btn-admin-panel"
                  onClick={() => handleOpenAdminWithSubTab('products')}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Panel Karyawan
                </button>
              </>
            )}

            {/* AKUN ANGGOTA / UMUM: Menu Anggota (Nama & Nomor Anggota - Terhubung & Tidak Dapat Diedit) */}
            {!isStaff && (
              <button
                id="nav-btn-member-view"
                onClick={() => navigateTo('member')}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'member'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                }`}
                title="Kartu & Data Anggota Koperasi (Terhubung dari Karyawan, Hanya-Baca)"
              >
                <CreditCard className="w-4 h-4" />
                <span>Menu Anggota</span>
                <Lock className="w-3 h-3 text-red-300" />
              </button>
            )}
          </nav>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* ⭐ Point Pembelian / Point Saya Button */}
            {onOpenPointModal && (
              <button
                id="header-points-btn"
                onClick={onOpenPointModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all shadow-2xs cursor-pointer group"
                title="Buka Point Pembelian, Saldo, Riwayat, dan Tukar Reward Hadiah"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">⭐</span>
                <span className="hidden sm:inline font-black">Point</span>
                {userPointAccount && userPointAccount.balance > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                    {userPointAccount.balance}
                  </span>
                )}
              </button>
            )}

            {/* Riwayat Pesanan Button */}
            {onOpenOrderHistory && (
              <button
                id="header-order-history-btn"
                onClick={onOpenOrderHistory}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer"
                title="Buka Riwayat Pesanan Website Anda"
              >
                <Receipt className="w-4 h-4 text-red-600" />
                <span className="hidden md:inline">Pesanan</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => navigateTo('cart')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'cart'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Keranjang</span>
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center">
                {totalItems}
              </span>
            </button>

            {/* Auth/Profile Section */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Tanda Akun Email yang Dipakai Badge */}
                {user.email && (
                  <div 
                    id="header-active-email-badge"
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs shadow-2xs"
                    title={`Akun email aktif: ${user.email}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-500 hidden xl:inline">Email:</span>
                    <span className="font-mono font-bold text-[11px] max-w-[150px] truncate">
                      {user.email}
                    </span>
                  </div>
                )}

                {/* Visitor Upgrade Quick Button */}
                {!isStaff && user.accountStatus === 'PENGUNJUNG' && onOpenUpgrade && (
                  <button
                    id="header-upgrade-btn"
                    onClick={onOpenUpgrade}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-all hover:scale-105"
                    title="Upgrade Akun Basic ke Anggota Resmi"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Upgrade</span>
                  </button>
                )}

                {/* Header User Profile Button */}
                <button
                  id="header-user-btn"
                  onClick={() => {
                    if (isStaff) {
                      navigateTo('admin');
                    } else if (onOpenProfile) {
                      onOpenProfile();
                    } else {
                      navigateTo('member');
                    }
                  }}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors text-left cursor-pointer"
                  title="Klik untuk membuka profil akun"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black ${
                    isStaff ? 'bg-emerald-600' : user.accountStatus === 'PENGUNJUNG' ? 'bg-blue-600' : 'bg-red-600'
                  }`}>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden lg:block max-w-[150px]">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span>
                        {isManager 
                          ? 'Manager' 
                          : isStaff 
                          ? 'Karyawan' 
                          : user.accountStatus === 'PENGUNJUNG' 
                          ? 'Basic' 
                          : 'Anggota'}
                      </span>
                      {user.accountId && (
                        <span className="font-mono text-[9px] bg-slate-200 px-1 py-0.2 rounded text-slate-700">
                          {user.accountId}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  id="header-logout-btn"
                  onClick={logout}
                  title="Keluar"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  id="header-google-staff-login-btn"
                  onClick={() => loginWithGoogle('WahidNurkarim85@gmail.com', 'staff')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                  title="Masuk langsung akun Karyawan dengan Google Gmail WahidNurkarim85@gmail.com"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Masuk Karyawan</span>
                </button>
                <button
                  id="header-login-btn"
                  onClick={openAuthModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Masuk / Daftar</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              id="header-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 border-t border-slate-100 bg-white space-y-1">
            {/* Tanda Akun Email yang Dipakai (Mobile) */}
            {user && (
              <div className="p-3 mb-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Tanda Akun Email Aktif
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">
                    {isManager ? 'Manager' : isStaff ? 'Karyawan' : 'Anggota'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-xs truncate">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{user.email || 'WahidNurkarim85@gmail.com'}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {user.displayName} {isStaff ? `• ${user.position || 'Karyawan'}` : ''}
                </p>
              </div>
            )}

            <button
              onClick={() => navigateTo('home')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold ${
                activeTab === 'home' ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Beranda
            </button>
            <button
              onClick={() => navigateTo('catalog')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${
                activeTab === 'catalog' ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🛒 Katalog Sembako</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Lengkap</span>
            </button>
            
            {/* Mobile: Karyawan vs Anggota */}
            {isStaff ? (
              <>
                <button
                  onClick={() => handleOpenAdminWithSubTab('employees')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Menu Karyawan (Nama & NIK KTP - Dapat Diedit)</span>
                </button>

                <button
                  onClick={() => handleOpenAdminWithSubTab('members')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Menu Anggota (Nama & No. Anggota - Dapat Diedit)</span>
                </button>

                <button
                  onClick={() => handleOpenAdminWithSubTab('shipping')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-red-800 bg-red-50/80 hover:bg-red-100 flex items-center gap-2 border border-red-200"
                >
                  <Truck className="w-4 h-4 text-red-600" />
                  <span>🚚 Pusat Pengiriman & Rute GPS</span>
                </button>

                <button
                  onClick={() => handleOpenAdminWithSubTab('products')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    activeTab === 'admin' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Panel Pengelolaan Karyawan</span>
                </button>
              </>
            ) : user ? (
              <button
                onClick={() => navigateTo('member')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${
                  activeTab === 'member' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Menu Anggota (Kartu Digital)</span>
                </div>
                <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded font-bold">
                  Hanya-Baca
                </span>
              </button>
            ) : null}

            <button
              onClick={() => navigateTo('cart')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${
                activeTab === 'cart' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🛍️ Keranjang Belanja</span>
              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">{totalItems}</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInbox();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between text-red-800 bg-red-50 hover:bg-red-100 border border-red-200"
            >
              <div className="flex items-center gap-2">
                <span>📩</span>
                <span>Kotak Pesan</span>
              </div>
              {unreadCount > 0 ? (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                  🔴 {unreadCount} Baru
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                  ✓ Terbaca
                </span>
              )}
            </button>

            {onOpenPointModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPointModal();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⭐</span>
                  <span className="font-black">Point Pembelian Marketplace</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black">
                  {userPointAccount ? `${userPointAccount.balance} Point` : 'Cek Saldo'}
                </span>
              </button>
            )}

            {onOpenOrderHistory && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenOrderHistory();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-red-600" />
                  <span>Riwayat Pesanan Website</span>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  Buka
                </span>
              </button>
            )}

            <button
              onClick={() => navigateTo('home', 'profil')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Profil Koperasi
            </button>

            {!isStaff && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenFinancialReport();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
              >
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Grafik Pendapatan & Laporan Keuangan</span>
                </div>
                <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded font-bold">
                  Transparan
                </span>
              </button>
            )}

            {!user && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-sm text-center shadow-xs"
                >
                  Masuk / Daftar Akun
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      loginDemo('member');
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-2 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700"
                  >
                    Demo Anggota
                  </button>
                  <button
                    onClick={() => {
                      loginDemo('staff');
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-2 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-bold"
                  >
                    Demo Karyawan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
