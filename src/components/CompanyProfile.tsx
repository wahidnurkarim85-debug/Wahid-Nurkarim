import React from 'react';
import { 
  Building2, 
  Target, 
  Users, 
  HeartHandshake, 
  PhoneCall, 
  Store, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';

export const CompanyProfile: React.FC = () => {
  return (
    <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* SECTION: PROFIL */}
      <section id="profil" className="scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full">
            Profil Resmi
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Koperasi Merah Putih
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Koperasi Desa/Kelurahan Merah Putih – Gerai Sembako Cengkareng Timur
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-black">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Tentang Koperasi</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Koperasi Desa/Kelurahan Merah Putih Gerai Sembako Cengkareng Timur hadir sebagai gerai penyedia kebutuhan pokok masyarakat dan UMKM yang mudah, terjangkau, dan berlandaskan asas gotong royong ekonomi kerakyatan.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Identitas Gerai</h3>
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-600">
              <p><strong>Unit Usaha:</strong> Gerai Sembako Cengkareng Timur</p>
              <p><strong>Bidang:</strong> Perdagangan Bahan Pokok & Sembako Murah</p>
              <p><strong>Layanan:</strong> Anggota Koperasi, Masyarakat Umum, dan Pelaku UMKM</p>
              <p><strong>Wilayah:</strong> Cengkareng Timur, Jakarta Barat</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: VISI & MISI */}
      <section id="visi-misi" className="scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full">
            Komitmen Kami
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Visi & Misi Koperasi
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Visi</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menjadi koperasi terpercaya dalam memenuhi kebutuhan pokok masyarakat serta mendukung pertumbuhan UMKM lokal.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Misi 1</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menyediakan kebutuhan pokok dengan pelayanan yang mudah, praktis, transparan, dan ramah bagi warga.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Misi 2</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mengembangkan layanan digital penjualan sembako baik secara gerai fisik maupun online WhatsApp & Shopee.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Misi 3</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mendorong stabilitas harga pangan serta mendorong pertumbuhan ekonomi warga Cengkareng Timur.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: TENTANG KAMI / NILAI UTAMA */}
      <section id="tentang" className="scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full">
            Nilai Luhur
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Nilai Utama Koperasi
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-red-50/50 border border-slate-200 space-y-2">
            <span className="text-2xl">🤝</span>
            <h4 className="font-black text-slate-900 text-sm">Gotong Royong</h4>
            <p className="text-xs text-slate-600">Semangat kebersamaan anggota dalam memajukan perekonomian desa.</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 border border-slate-200 space-y-2">
            <span className="text-2xl">🛒</span>
            <h4 className="font-black text-slate-900 text-sm">Praktis & Terjangkau</h4>
            <p className="text-xs text-slate-600">Sembako dapat dipesan online dengan variasi ukuran sesuai kebutuhan kantong.</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-blue-50/50 border border-slate-200 space-y-2">
            <span className="text-2xl">🏪</span>
            <h4 className="font-black text-slate-900 text-sm">Gerai Lokal</h4>
            <p className="text-xs text-slate-600">Melayani langsung pengantaran warga Cengkareng Timur dan sekitarnya.</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-amber-50/50 border border-slate-200 space-y-2">
            <span className="text-2xl">🇮🇩</span>
            <h4 className="font-black text-slate-900 text-sm">Merah Putih</h4>
            <p className="text-xs text-slate-600">Komitmen kebangsaan untuk kemandirian pangan masyarakat.</p>
          </div>
        </div>
      </section>

      {/* SECTION: KONTAK */}
      <section id="kontak" className="scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full">
            Hubungi Kami
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kontak & Lokasi Gerai
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
              📱
            </div>
            <h3 className="text-lg font-black text-slate-900">WhatsApp Resmi Gerai</h3>
            <p className="text-2xl font-black text-red-700 font-mono">0858-8168-8927</p>
            <p className="text-xs text-slate-500">
              Layanan cepat konfirmasi pesanan, info stok barang, dan kerjasama usaha.
            </p>
            <a
              href="https://wa.me/6285881688927"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Chat WhatsApp Langsung</span>
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto text-2xl">
              🛍️
            </div>
            <h3 className="text-lg font-black text-slate-900">Toko Online Shopee</h3>
            <p className="text-xs text-slate-600">
              Kunjungi gerai online resmi kami di Shopee untuk pesanan dengan kurir ekspedisi.
            </p>
            <div className="pt-2">
              <a
                href="https://id.shp.ee/idi33p4c?smtt=0.0.9"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Buka Toko di Shopee</span>
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
