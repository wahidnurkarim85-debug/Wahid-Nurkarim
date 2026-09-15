import React from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Tag, 
  CheckCircle2,
  PhoneCall,
  Store,
  Mail
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface HeroSectionProps {
  onOpenCatalog: () => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenCatalog,
  onOpenCart,
  onOpenAuth,
  onOpenAdmin,
}) => {
  const { totalItems } = useCart();
  const { user, isStaff } = useAuth();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Decorative background blurs */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Heading and CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-red-200 text-xs font-bold">
              <span>🇮🇩 KOPERASI MERAH PUTIH</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white">Gerai Sembako Cengkareng Timur</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Kebutuhan Pokok Keluarga,{' '}
              <span className="text-amber-300 underline decoration-amber-400/40 decoration-4">
                Lebih Murah & Terjamin.
              </span>
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Selamat datang di sistem digital Gerai Sembako Koperasi Merah Putih. Dilengkapi sinkronisasi stok Firestore real-time, sistem voucher diskon belanja, serta layanan khusus anggota & karyawan.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-3">
              <button
                id="hero-btn-catalog"
                onClick={onOpenCatalog}
                className="px-5 py-3 rounded-xl bg-white text-red-800 hover:bg-red-50 font-black text-sm flex items-center gap-2 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-red-600" />
                <span>Buka Katalog Produk</span>
              </button>

              <button
                id="hero-btn-cart"
                onClick={onOpenCart}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Keranjang Belanja ({totalItems})</span>
              </button>

              {isStaff ? (
                <button
                  id="hero-btn-admin-panel"
                  onClick={onOpenAdmin}
                  className="px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Management Website</span>
                </button>
              ) : !user ? (
                <button
                  id="hero-btn-auth"
                  onClick={onOpenAuth}
                  className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Daftar / Masuk Akun</span>
                </button>
              ) : null}
            </div>

            {/* Tanda Akun Email yang Dipakai jika sudah login karyawan */}
            {isStaff && user && (
              <div 
                id="hero-staff-email-badge"
                className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-xs shadow-lg backdrop-blur-md"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Tanda Akun Email:</span>
                <span className="font-mono font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {user.email || 'WahidNurkarim85@gmail.com'}
                </span>
                <span className="text-slate-400 hidden sm:inline">({user.displayName})</span>
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-800/60 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  Aktif & Terverifikasi
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Contact & Quick Info Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-2xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-bl-full -z-0 opacity-60" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    Gerai Resmi Sembako
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Buka Setiap Hari
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Pusat Sembako Merah Putih
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Melayani kebutuhan dapur rumah tangga, warung kelontong, dan UMKM di wilayah Cengkareng Timur & sekitarnya.
                  </p>
                </div>

                {/* Order Contact Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Layanan Konfirmasi Pesanan</span>
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    0858-8168-8927
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sistem dapat mengirimkan daftar belanjaan langsung dari keranjang untuk diproses admin gerai.
                  </p>
                </div>

                {/* Direct Action Links */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href="https://wa.me/6285881688927?text=Halo%20Admin%20Koperasi%20Merah%20Putih,%20saya%20ingin%20bertanya%20mengenai%20produk%20sembako"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Hubungi CS</span>
                  </a>

                  <a
                    href="https://id.shp.ee/idi33p4c?smtt=0.0.9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Store className="w-4 h-4" />
                    <span>Toko Shopee</span>
                  </a>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
