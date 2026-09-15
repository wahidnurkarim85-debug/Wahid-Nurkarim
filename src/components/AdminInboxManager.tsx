import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Send, 
  Trash2, 
  Power, 
  CheckCircle2, 
  Search, 
  Clock, 
  Users, 
  User, 
  Ticket, 
  Gift, 
  ShoppingBag, 
  Tag, 
  Info, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Filter,
  Copy
} from 'lucide-react';
import { useInbox } from '../context/InboxContext';
import { InboxCategory, InboxMessage, InboxTargetAudience } from '../types';
import { CopywritingPayload } from '../utils/copywritingHelper';

import { AdminWhatsAppManager } from './AdminWhatsAppManager';

export const AdminInboxManager: React.FC = () => {
  const { 
    allAdminMessages, 
    createInboxMessage, 
    deleteMessageByAdmin, 
    toggleMessageActiveByAdmin 
  } = useInbox();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<InboxCategory | 'all'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  // Form State
  const [form, setForm] = useState<{
    title: string;
    content: string;
    category: InboxCategory;
    targetAudience: InboxTargetAudience;
    targetUserId: string;
    actionType: 'order' | 'voucher' | 'gift' | 'promo' | 'catalog' | 'profile' | 'none';
    actionLabel: string;
    actionTab: 'home' | 'catalog' | 'cart' | 'member' | 'profile' | 'admin';
    isActive: boolean;
    featuredProducts?: any[];
    availableVouchers?: any[];
    catalogDiscounts?: any[];
    giftPromos?: any[];
  }>({
    title: '',
    content: '',
    category: 'informasi',
    targetAudience: 'all',
    targetUserId: '',
    actionType: 'catalog',
    actionLabel: 'Lihat Selengkapnya',
    actionTab: 'catalog',
    isActive: true,
  });

  // Handler to apply copywriting text directly into inbox form
  const handleApplyCopywritingToInbox = (
    copywritingText: string,
    payload?: CopywritingPayload
  ) => {
    if (!copywritingText || !copywritingText.trim()) {
      alert('Teks copywriting masih kosong. Silakan buat copywriting terlebih dahulu.');
      return;
    }

    // Try reading structured payload if not passed directly
    let effectivePayload: CopywritingPayload | null = payload || null;
    if (!effectivePayload) {
      try {
        const savedPayload = localStorage.getItem('kopdes_admin_copywriting_payload');
        if (savedPayload) {
          effectivePayload = JSON.parse(savedPayload);
        }
      } catch (e) {
        console.warn('Failed to parse saved payload', e);
      }
    }

    const lines = copywritingText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    let derivedTitle = '🔥 Promo & Produk Pilihan Terpopuler Kopdes';
    if (lines.length > 0 && lines[0].length <= 65) {
      derivedTitle = lines[0].replace(/[*_~]/g, '');
    }

    setForm(prev => ({
      ...prev,
      title: derivedTitle,
      content: copywritingText,
      category: 'promo',
      actionType: 'catalog',
      actionLabel: 'Lihat Katalog & Belanja',
      actionTab: 'catalog',
      targetAudience: 'all',
      featuredProducts: effectivePayload?.popularProducts || prev.featuredProducts,
      availableVouchers: effectivePayload ? [
        ...effectivePayload.discountVouchers.map(v => ({ ...v, type: 'discount' as const })),
        ...effectivePayload.shippingVouchers.map(sv => ({ ...sv, type: 'shipping' as const }))
      ] : prev.availableVouchers,
      catalogDiscounts: effectivePayload?.catalogDiscounts || prev.catalogDiscounts,
      giftPromos: effectivePayload?.giftPromos || prev.giftPromos,
    }));

    setIsCreating(true);
    setFeedback('✅ Teks copywriting & kartu gambar "Belanja Sekarang" berhasil disalin ke Form Kotak Pesan! Silakan periksa dan kirim.');

    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleImportFromCopywriting = () => {
    const savedCopy = localStorage.getItem('kopdes_admin_copywriting');
    if (!savedCopy || !savedCopy.trim()) {
      alert('Belum ada copywriting yang disimpan atau dibuat. Silakan klik "Buat Copywriting Otomatis" pada panel WhatsApp di bawah terlebih dahulu.');
      return;
    }
    let payload: CopywritingPayload | undefined;
    try {
      const savedPayload = localStorage.getItem('kopdes_admin_copywriting_payload');
      if (savedPayload) {
        payload = JSON.parse(savedPayload);
      }
    } catch {}
    handleApplyCopywritingToInbox(savedCopy, payload);
  };

  useEffect(() => {
    const handleEvent = (e: any) => {
      if (e.detail) {
        if (typeof e.detail === 'string') {
          handleApplyCopywritingToInbox(e.detail);
        } else if (e.detail.text) {
          handleApplyCopywritingToInbox(e.detail.text, e.detail.payload);
        }
      }
    };
    window.addEventListener('kopdes_apply_copywriting_to_inbox', handleEvent);
    return () => window.removeEventListener('kopdes_apply_copywriting_to_inbox', handleEvent);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      alert('Judul dan Isi pesan wajib diisi!');
      return;
    }

    try {
      await createInboxMessage({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        targetAudience: form.targetAudience,
        targetUserId: form.targetAudience === 'specific' ? form.targetUserId.trim() : undefined,
        sender: 'admin',
        isActive: form.isActive,
        actionType: form.actionType,
        actionLabel: form.actionLabel.trim() || undefined,
        actionTab: form.actionTab,
        featuredProducts: form.featuredProducts,
        availableVouchers: form.availableVouchers,
        catalogDiscounts: form.catalogDiscounts,
        giftPromos: form.giftPromos,
      });

      setFeedback('Pemberitahuan berhasil dibuat dan disiarkan ke Kotak Pesan pelanggan!');
      setIsCreating(false);
      setForm({
        title: '',
        content: '',
        category: 'informasi',
        targetAudience: 'all',
        targetUserId: '',
        actionType: 'catalog',
        actionLabel: 'Lihat Selengkapnya',
        actionTab: 'catalog',
        isActive: true,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(`Gagal mengirim pesan: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const filteredList = allAdminMessages.filter((m) => {
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesSearch = 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <span>📩</span>
              <span>Pusat Notifikasi & Kotak Pesan</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Manajemen Kotak Pesan & Pemberitahuan
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Kirim dan kelola notifikasi pesanan, voucher belanja, bonus gift, info promo sembako, dan pengumuman resmi ke akun pelanggan Koperasi Desa Merah Putih.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={handleImportFromCopywriting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all hover:scale-102"
            title="Ambil dan salin teks copywriting yang sudah siap ke Kotak Pesan"
          >
            <Sparkles className="w-4 h-4" />
            <span>Salin dari Copywriting</span>
          </button>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all self-stretch sm:self-auto hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Tutup Form' : 'Tulis Pesan Manual'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Form Buat Pesan Baru */}
      {isCreating && (
        <form 
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-red-600" />
              <span>Tulis Pesan / Pemberitahuan Baru</span>
            </h3>
            <span className="text-xs text-slate-400">Otomatis masuk ke Kotak Pesan Pelanggan</span>
          </div>

          {/* Card Sinkronisasi Otomatis Copywriting */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-emerald-50 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>Hubungkan Otomatis ke Copywriting</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Tersambung</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Salin teks produk populer & promo yang sudah dianalisis dari statistik langsung ke kotak pesan ini.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleImportFromCopywriting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all shrink-0 self-end sm:self-auto"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Ambil Teks Copywriting</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Judul Pesan */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-extrabold text-slate-700">
                Judul Pesan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: 🎟️ Promo Spesial Beras Rojolele 5kg Hari Ini!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 font-bold"
              />
            </div>

            {/* Isi Pesan */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-extrabold text-slate-700">
                Isi Pesan / Informasi Lengkap <span className="text-red-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Tuliskan isi pemberitahuan yang ingin disampaikan kepada pelanggan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600"
              />
            </div>

            {/* Kategori Pesan */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Kategori Pesan</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as InboxCategory })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="informasi">📢 Informasi / Pengumuman</option>
                <option value="promo">💰 Promo & Diskon</option>
                <option value="voucher">🎟️ Notifikasi Voucher</option>
                <option value="gift">🎁 Hadiah & Bonus</option>
                <option value="pesanan">🛍️ Pesanan Sembako</option>
                <option value="sistem">⚠️ Pemberitahuan Sistem</option>
              </select>
            </div>

            {/* Target Penerima */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Target Penerima</label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as InboxTargetAudience })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="all">📢 Semua Pelanggan</option>
                <option value="member">⭐ Anggota Koperasi Saja</option>
                <option value="visitor">👤 Akun Basic Saja</option>
                <option value="specific">🎯 Pelanggan Tertentu (ID Akun / HP)</option>
              </select>
            </div>

            {/* Target Spesifik jika specific */}
            {form.targetAudience === 'specific' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-extrabold text-slate-700">
                  ID Akun / No HP Pelanggan Tertentu
                </label>
                <input
                  type="text"
                  required
                  value={form.targetUserId}
                  onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                  placeholder="Contoh: ACC-000001 atau 081299887766"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            )}

            {/* Label Tombol Tautan */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Teks Tombol Aksi (Opsional)</label>
              <input
                type="text"
                value={form.actionLabel}
                onChange={(e) => setForm({ ...form, actionLabel: e.target.value })}
                placeholder="Contoh: Lihat Voucher, Buka Katalog"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            {/* Tujuan Navigasi Tab */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700">Halaman Terkait</label>
              <select
                value={form.actionTab}
                onChange={(e) => setForm({ ...form, actionTab: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="catalog">Katalog Sembako</option>
                <option value="cart">Keranjang & Voucher</option>
                <option value="home">Beranda Toko</option>
                <option value="member">Menu Anggota / Profil</option>
              </select>
            </div>

            {/* Attached Popular Products Preview */}
            {form.featuredProducts && form.featuredProducts.length > 0 && (
              <div className="space-y-1.5 md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>🛍️</span>
                    <span>Gambar &quot;Belanja Sekarang&quot; Terpasang ({form.featuredProducts.length} Produk Populer)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Otomatis Menuju Produk Saat Diklik
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {form.featuredProducts.map((p: any) => (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center gap-2">
                      <span className="text-lg">{p.emoji || '🛍️'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[10px] text-red-600 font-extrabold">{p.formattedPrice}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Kotak Pesan</span>
            </button>
          </div>
        </form>
      )}

      {/* WhatsApp Admin Feature - Jalur 2 */}
      <AdminWhatsAppManager onApplyToInbox={handleApplyCopywritingToInbox} />

      {/* Filter & List Pesan yang Ada (Kotak Pesan Website - Jalur 1) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul atau isi pemberitahuan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600 focus:ring-2 focus:ring-red-100"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Kategori */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto text-xs pb-1 md:pb-0">
          {(['all', 'informasi', 'promo', 'voucher', 'gift', 'pesanan', 'sistem'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel / Daftar Pesan Admin */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Kategori & Sasaran</th>
                <th className="py-3.5 px-4">Judul & Isi Pesan</th>
                <th className="py-3.5 px-4">Waktu Pengiriman</th>
                <th className="py-3.5 px-4">Status Siar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Mail className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <span>Tidak ada pesan dalam kategori ini.</span>
                  </td>
                </tr>
              ) : (
                filteredList.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {msg.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>
                            {msg.targetAudience === 'all' ? 'Semua Pelanggan' :
                             msg.targetAudience === 'member' ? 'Khusus Anggota' :
                             msg.targetAudience === 'visitor' ? 'Khusus Basic' :
                             `Target: ${msg.targetUserId}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-extrabold text-slate-900 text-xs">{msg.title}</p>
                      <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{msg.content}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {msg.createdAt}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleMessageActiveByAdmin(msg.id, msg.isActive)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-colors ${
                          msg.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Klik untuk ubah status aktif/nonaktif"
                      >
                        <span className={`w-2 h-2 rounded-full ${msg.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{msg.isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menghapus pesan "${msg.title}" dari sistem?`)) {
                            deleteMessageByAdmin(msg.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus pesan permanen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
