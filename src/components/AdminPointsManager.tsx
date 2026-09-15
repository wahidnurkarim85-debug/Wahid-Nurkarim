import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Award,
  Gift,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Search,
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Calendar,
  Save,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ShoppingBag,
  Sliders,
  DollarSign
} from 'lucide-react';
import { usePoints } from '../context/PointContext';
import { PointProgram, PointReward, PointAudience, Product, MemberRecord } from '../types';

interface AdminPointsManagerProps {
  products: Product[];
  members: MemberRecord[];
}

export const AdminPointsManager: React.FC<AdminPointsManagerProps> = ({ products, members }) => {
  const {
    pointPrograms,
    pointRewards,
    pointAccounts,
    pointTransactions,
    updateProgram,
    addProgram,
    deleteProgram,
    addReward,
    updateReward,
    deleteReward,
    manualAdjustPoints,
  } = usePoints();

  const [activeTab, setActiveTab] = useState<'rules' | 'rewards' | 'history'>('rules');
  const [selectedAudience, setSelectedAudience] = useState<PointAudience>('member');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Rewards Form State
  const [isRewardFormOpen, setIsRewardFormOpen] = useState<boolean>(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState<Partial<PointReward>>({
    name: '',
    pointsCost: 50,
    rewardType: 'discount_nominal',
    discountValue: 5000,
    maxDiscount: 25000,
    freeShippingCap: 10000,
    rewardProductId: '',
    rewardProductName: '',
    rewardVariation: '',
    quota: 50,
    targetAudience: 'all',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  // Manual Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [adjustForm, setAdjustForm] = useState<{
    phone: string;
    name: string;
    role: PointAudience;
    delta: number;
    notes: string;
  }>({
    phone: '',
    name: '',
    role: 'member',
    delta: 10,
    notes: 'Penyesuaian manual oleh Admin Kopdes',
  });

  // Search & Filter in History
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyRoleFilter, setHistoryRoleFilter] = useState<'all' | 'member' | 'basic'>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'earn' | 'redeem' | 'deduct' | 'adjust'>('all');

  // Find active program for current audience
  const currentProgram = useMemo(() => {
    return pointPrograms.find((p) => p.targetAudience === selectedAudience) || pointPrograms[0];
  }, [pointPrograms, selectedAudience]);

  // Local editable program state
  const [programForm, setProgramForm] = useState<PointProgram>(() => currentProgram);

  // Sync programForm when selectedAudience changes
  React.useEffect(() => {
    if (currentProgram) {
      setProgramForm(currentProgram);
    }
  }, [currentProgram, selectedAudience]);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Save Program Settings
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProgram(programForm);
      showFeedback(`Pengaturan Program Point ${selectedAudience === 'member' ? 'Anggota' : 'Basic'} berhasil disimpan!`);
    } catch (err) {
      showFeedback('Gagal menyimpan aturan program point.', 'error');
    }
  };

  // Save Reward Form
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.name || !rewardForm.pointsCost) {
      showFeedback('Nama hadiah dan biaya point wajib diisi.', 'error');
      return;
    }

    try {
      if (editingRewardId) {
        await updateReward({
          ...(rewardForm as PointReward),
          id: editingRewardId,
        });
        showFeedback('Hadiah penukaran point berhasil diperbarui.');
      } else {
        await addReward(rewardForm as Omit<PointReward, 'id'>);
        showFeedback('Hadiah penukaran point baru berhasil ditambahkan.');
      }
      setIsRewardFormOpen(false);
      setEditingRewardId(null);
    } catch (err) {
      showFeedback('Gagal menyimpan hadiah point.', 'error');
    }
  };

  // Manual Adjust Point Handler
  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.phone.trim() || adjustForm.delta === 0) {
      showFeedback('Nomor HP dan jumlah point penyesuaian wajib valid.', 'error');
      return;
    }

    try {
      await manualAdjustPoints({
        customerPhone: adjustForm.phone.trim(),
        customerName: adjustForm.name.trim() || 'Pelanggan',
        customerRole: adjustForm.role,
        pointsDelta: Number(adjustForm.delta),
        notes: adjustForm.notes.trim() || 'Penyesuaian manual Admin',
      });
      showFeedback(`Berhasil memperbarui point untuk pelanggan ${adjustForm.phone} (${adjustForm.delta > 0 ? `+${adjustForm.delta}` : adjustForm.delta} Point).`);
      setIsAdjustModalOpen(false);
    } catch (err) {
      showFeedback('Gagal melakukan penyesuaian point.', 'error');
    }
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return pointTransactions.filter((tx) => {
      if (historyRoleFilter !== 'all' && tx.customerRole !== historyRoleFilter) return false;
      if (historyTypeFilter !== 'all' && tx.type !== historyTypeFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchName = tx.customerName?.toLowerCase().includes(q);
        const matchPhone = tx.customerPhone?.includes(q);
        const matchOrder = tx.orderNumber?.toLowerCase().includes(q);
        const matchNotes = tx.notes?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchOrder && !matchNotes) return false;
      }
      return true;
    });
  }, [pointTransactions, historyRoleFilter, historyTypeFilter, historySearch]);

  // Total summary stats
  const stats = useMemo(() => {
    let totalEarned = 0;
    let totalRedeemed = 0;
    let totalDeducted = 0;
    let totalBalance = 0;

    pointAccounts.forEach((acc) => {
      totalEarned += acc.totalEarned || 0;
      totalRedeemed += acc.totalRedeemed || 0;
      totalDeducted += acc.totalDeducted || 0;
      totalBalance += acc.balance || 0;
    });

    return { totalEarned, totalRedeemed, totalDeducted, totalBalance };
  }, [pointAccounts]);

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Title */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Program Loyalitas Pelanggan
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            ⭐ Point Pembelian Marketplace
          </h2>
          <p className="mt-1 text-sm sm:text-base text-amber-100 max-w-2xl">
            Atur program reward point terpisah untuk <strong>👥 Anggota</strong> dan <strong>👤 Basic</strong>, kelola katalog hadiah voucher/produk, serta pantau laporan transaksi point secara real-time.
          </p>
        </div>
        <div className="absolute right-4 bottom-2 text-white/10 select-none pointer-events-none text-9xl font-black">
          ★
        </div>
      </div>

      {/* 3 Main Tabs Nav */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'rules'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>⚙️ Aturan Point (Anggota & Basic)</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'rewards'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>🎁 Hadiah Penukaran Point ({pointRewards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>📊 Laporan & Riwayat Point ({pointTransactions.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ATURAN PROGRAM POINT (ANGGOTA & BASIC)             */}
      {/* ========================================================= */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Segment Selector: Anggota vs Basic */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Kelompok Program Point
              </div>
              <div className="text-sm font-black text-slate-900">
                Pilih segmen pelanggan yang ingin diatur peraturannya:
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAudience('member')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                  selectedAudience === 'member'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👥 Program Point Anggota</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAudience('basic')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                  selectedAudience === 'basic'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👤 Program Point Basic</span>
              </button>
            </div>
          </div>

          {/* Strict Separation Notice */}
          <div
            className={`p-4 rounded-2xl border text-sm flex items-start gap-3 ${
              selectedAudience === 'member'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {selectedAudience === 'member'
                  ? '👥 Aturan Khusus Anggota Koperasi Terdaftar (Login)'
                  : '👤 Aturan Khusus Pengunjung Basic (Belum Login / Tamu)'}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {selectedAudience === 'member'
                  ? 'Aturan ini HANYA berlaku untuk akun Anggota yang telah login. Point otomatis terhubung ke akun anggota Anda.'
                  : 'Aturan ini HANYA berlaku untuk pelanggan pengunjung tanpa login. Point otomatis dicatat berdasarkan Nomor WhatsApp/HP aktif yang diisi saat checkout.'}
              </p>
            </div>
          </div>

          {/* Form Pengaturan Program */}
          <form onSubmit={handleSaveProgram} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                Parameter Aturan Program Point
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Status Program:</label>
                <button
                  type="button"
                  onClick={() => setProgramForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                    programForm.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {programForm.isActive ? '🟢 Aktif' : '🔴 Nonaktif'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nama Program */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Nama Program Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={programForm.name || ''}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  placeholder="Contoh: Program Loyalitas Point Anggota Kopdes"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Tipe Perhitungan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Metode Perhitungan Point
                </label>
                <select
                  value={programForm.calculationType || 'spend'}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      calculationType: e.target.value as 'spend' | 'quantity',
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  <option value="spend">Berdasarkan Nilai Belanja (Rupiah per Point)</option>
                  <option value="quantity">Berdasarkan Jumlah Produk (Pcs / Unit)</option>
                </select>
              </div>

              {/* Nilai Belanja untuk 1 Point */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Nilai Pembelian untuk Mendapatkan 1 Point (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={programForm.spendPerPoint || 10000}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, spendPerPoint: Number(e.target.value) })
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Contoh: Setiap belanja kelipatan Rp 10.000 berhak mendapatkan 1 point.
                </p>
              </div>

              {/* Jumlah Point yang Didapat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Jumlah Point Per Satuan / Kelipatan
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={programForm.pointsPerUnit || 1}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, pointsPerUnit: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default 1 point. Anda bisa menaikkan menjadi 2 atau lebih.
                </p>
              </div>

              {/* Nilai Minimal Pembelian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Nilai Minimal Pembelian (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={programForm.minPurchase || 0}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, minPurchase: Number(e.target.value) })
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Isi 0 jika tanpa batas minimal belanja.
                </p>
              </div>

              {/* Pembulatan Point */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6. Sistem Pembulatan Point
                </label>
                <select
                  value={programForm.rounding || 'floor'}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      rounding: e.target.value as 'floor' | 'round' | 'ceil',
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  <option value="floor">Kebawah (Floor: misal Rp25.000 / Rp10.000 = 2 Point)</option>
                  <option value="round">Standar (Round: pembulatan terdekat)</option>
                  <option value="ceil">Keatas (Ceil: misal Rp21.000 / Rp10.000 = 3 Point)</option>
                </select>
              </div>

              {/* Batas Maksimal Point per Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  7. Batas Maksimal Point per Transaksi
                </label>
                <input
                  type="number"
                  min="0"
                  value={programForm.maxPointsPerTransaction || 0}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      maxPointsPerTransaction: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Isi 0 untuk tanpa batas maksimal point per transaksi.
                </p>
              </div>

              {/* Cakupan Produk */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  8. Produk yang Mendapatkan Point
                </label>
                <select
                  value={programForm.productScope || 'all'}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      productScope: e.target.value as 'all' | 'specific',
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  <option value="all">Semua Produk Sembako di Marketplace</option>
                  <option value="specific">Produk Tertentu Saja</option>
                </select>
              </div>
            </div>

            {/* Jika Produk Tertentu */}
            {programForm.productScope === 'specific' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  Pilih Produk yang Berhak Mendapatkan Point:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {products.map((p) => {
                    const isChecked = programForm.applicableProductIds?.includes(p.id) || false;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = programForm.applicableProductIds || [];
                            if (e.target.checked) {
                              setProgramForm({ ...programForm, applicableProductIds: [...cur, p.id] });
                            } else {
                              setProgramForm({ ...programForm, applicableProductIds: cur.filter((id) => id !== p.id) });
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="truncate">{p.emoji || '🛍️'} {p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Promo Double Point Section */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    9. Event Promo Point Spesial (Misal: Double Point)
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Aktifkan event penggandaan point pada periode belanja tertentu.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProgramForm((prev) => ({ ...prev, isPromoActive: !prev.isPromoActive }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                    programForm.isPromoActive ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {programForm.isPromoActive ? '🟢 Event Aktif' : '🔴 Nonaktif'}
                </button>
              </div>

              {programForm.isPromoActive && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Pengali Point (Multiplier)
                    </label>
                    <select
                      value={programForm.promoMultiplier || 2}
                      onChange={(e) =>
                        setProgramForm({
                          ...programForm,
                          promoMultiplier: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                    >
                      <option value="2">2x (Double Point)</option>
                      <option value="3">3x (Triple Point)</option>
                      <option value="4">4x Point</option>
                      <option value="5">5x Point</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Tanggal Mulai Event
                    </label>
                    <input
                      type="date"
                      value={programForm.startDate || ''}
                      onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Tanggal Selesai Event
                    </label>
                    <input
                      type="date"
                      value={programForm.endDate || ''}
                      onChange={(e) => setProgramForm({ ...programForm, endDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ketentuan Penggunaan Point */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                10. Syarat & Ketentuan Penggunaan Point
              </label>
              <textarea
                rows={3}
                value={programForm.terms || ''}
                onChange={(e) => setProgramForm({ ...programForm, terms: e.target.value })}
                placeholder="Tuliskan syarat dan ketentuan pemberian point untuk pelanggan..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Tombol Simpan */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Program {selectedAudience === 'member' ? 'Anggota' : 'Basic'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KATALOG HADIAH PENUKARAN POINT (REWARDS)          */}
      {/* ========================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                Katalog Hadiah Penukaran Point Pelanggan
              </h3>
              <p className="text-xs text-slate-500">
                Pelanggan dapat menukarkan point yang telah dikumpulkan dengan voucher diskon belanja, potongan ongkir, atau produk gratis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingRewardId(null);
                setRewardForm({
                  name: '',
                  pointsCost: 50,
                  rewardType: 'discount_nominal',
                  discountValue: 5000,
                  quota: 50,
                  targetAudience: 'all',
                  isActive: true,
                });
                setIsRewardFormOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Hadiah Baru</span>
            </button>
          </div>

          {/* Form Modal / Collapse untuk Hadiah */}
          {isRewardFormOpen && (
            <form onSubmit={handleSaveReward} className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  {editingRewardId ? 'Edit Hadiah Penukaran Point' : 'Buat Hadiah Penukaran Point Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRewardFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Hadiah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rewardForm.name || ''}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="Contoh: Voucher Diskon Belanja Rp10.000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Point yang Dibutuhkan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardForm.pointsCost || 50}
                    onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Hadiah
                  </label>
                  <select
                    value={rewardForm.rewardType || 'discount_nominal'}
                    onChange={(e) =>
                      setRewardForm({
                        ...rewardForm,
                        rewardType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="discount_nominal">Diskon Belanja Nominal (Rp)</option>
                    <option value="discount_percentage">Diskon Belanja Persentase (%)</option>
                    <option value="free_shipping">Potongan / Gratis Ongkos Kirim</option>
                    <option value="product_gift">Hadiah Produk Fisik Gratis</option>
                  </select>
                </div>

                {/* Nilai Diskon jika Nominal/Persen */}
                {rewardForm.rewardType === 'discount_nominal' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nominal Potongan Belanja (Rp)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={rewardForm.discountValue || 5000}
                      onChange={(e) => setRewardForm({ ...rewardForm, discountValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}

                {rewardForm.rewardType === 'discount_percentage' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Persen Diskon (%) & Maksimal Diskon (Rp)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="%"
                        value={rewardForm.discountValue || 10}
                        onChange={(e) => setRewardForm({ ...rewardForm, discountValue: Number(e.target.value) })}
                        className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="Maksimal Potongan Rp"
                        value={rewardForm.maxDiscount || 25000}
                        onChange={(e) => setRewardForm({ ...rewardForm, maxDiscount: Number(e.target.value) })}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {rewardForm.rewardType === 'free_shipping' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maksimal Potongan Ongkos Kirim (Rp)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={rewardForm.freeShippingCap || 10000}
                      onChange={(e) => setRewardForm({ ...rewardForm, freeShippingCap: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}

                {rewardForm.rewardType === 'product_gift' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Produk Hadiah Fisik
                    </label>
                    <select
                      value={rewardForm.rewardProductId || ''}
                      onChange={(e) => {
                        const sel = products.find((p) => p.id === e.target.value);
                        setRewardForm({
                          ...rewardForm,
                          rewardProductId: sel?.id || '',
                          rewardProductName: sel?.name || '',
                          rewardProductEmoji: sel?.emoji || '🎁',
                          rewardVariation: sel?.variations?.[0] || '',
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="">-- Pilih Produk Hadiah --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.emoji || '🛍️'} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kuota Hadiah Tersedia
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rewardForm.quota || 50}
                    onChange={(e) => setRewardForm({ ...rewardForm, quota: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sasaran Pelanggan
                  </label>
                  <select
                    value={rewardForm.targetAudience || 'all'}
                    onChange={(e) => setRewardForm({ ...rewardForm, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="all">Semua Pelanggan (Anggota & Basic)</option>
                    <option value="member">Khusus Anggota Terdaftar Saja</option>
                    <option value="basic">Khusus Pengunjung Basic Saja</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRewardFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Hadiah</span>
                </button>
              </div>
            </form>
          )}

          {/* List Hadiah Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pointRewards.map((rew) => {
              const remainingQuota = (rew.quota || 0) - (rew.usedCount || 0);
              return (
                <div
                  key={rew.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black flex items-center gap-1">
                        ⭐ {rew.pointsCost} Point
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rew.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {rew.isActive ? '🟢 Aktif' : '🔴 Nonaktif'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{rew.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {rew.rewardType === 'discount_nominal' && `Potongan belanja sebesar Rp ${(rew.discountValue || 0).toLocaleString('id-ID')}`}
                      {rew.rewardType === 'discount_percentage' && `Diskon ${rew.discountValue}% (Maks. Rp ${(rew.maxDiscount || 0).toLocaleString('id-ID')})`}
                      {rew.rewardType === 'free_shipping' && `Potongan ongkir hingga Rp ${(rew.freeShippingCap || 10000).toLocaleString('id-ID')}`}
                      {rew.rewardType === 'product_gift' && `Produk gratis: ${rew.rewardProductEmoji || '🎁'} ${rew.rewardProductName || 'Produk'}`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Kuota Tersedia:</span>
                      <span className="font-bold text-slate-900">
                        {remainingQuota} / {rew.quota || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Target:</span>
                      <span className="font-bold text-slate-800">
                        {rew.targetAudience === 'member' ? '👥 Anggota Saja' : rew.targetAudience === 'basic' ? '👤 Basic Saja' : 'Semua'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEditingRewardId(rew.id);
                          setRewardForm(rew);
                          setIsRewardFormOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Hapus hadiah "${rew.name}"?`)) {
                            await deleteReward(rew.id);
                            showFeedback('Hadiah berhasil dihapus.');
                          }
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LAPORAN & RIWAYAT POINT PELANGGAN                  */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Point Diberikan</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-5 h-5" />
                +{stats.totalEarned.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Dari transaksi selesai</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Point Ditukar</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1 flex items-center gap-1">
                <Gift className="w-5 h-5" />
                -{stats.totalRedeemed.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Untuk voucher / hadiah</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Point Dipotong</div>
              <div className="text-xl sm:text-2xl font-black text-red-600 mt-1 flex items-center gap-1">
                <ArrowDownLeft className="w-5 h-5" />
                -{stats.totalDeducted.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Akibat retur / batal</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Point Beredar</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
                ⭐ {stats.totalBalance.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Milik seluruh pelanggan</div>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari nama pelanggan, nomor HP, atau nomor pesanan..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyRoleFilter}
                onChange={(e) => setHistoryRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="all">Semua Status (Anggota & Basic)</option>
                <option value="member">👥 Anggota Saja</option>
                <option value="basic">👤 Basic Saja</option>
              </select>

              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="all">Semua Tipe Transaksi</option>
                <option value="earn">Point Masuk (+)</option>
                <option value="redeem">Point Ditukar (-)</option>
                <option value="deduct">Point Dipotong (-)</option>
                <option value="adjust">Penyesuaian Manual</option>
              </select>

              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>✏️ Koreksi Point Manual</span>
              </button>
            </div>
          </div>

          {/* Tabel Riwayat Transaksi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">No. Pesanan</th>
                    <th className="py-3 px-4">Tipe & Perubahan</th>
                    <th className="py-3 px-4">Saldo Akhir</th>
                    <th className="py-3 px-4">Catatan Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                        Belum ada riwayat transaksi point yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{tx.customerName || 'Pelanggan'}</div>
                          <div className="text-[11px] text-slate-500">{tx.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.customerRole === 'member'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.customerRole === 'member' ? '👥 Anggota' : '👤 Basic'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700">
                          {tx.orderNumber ? `#${tx.orderNumber}` : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              tx.points > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {tx.points > 0 ? `+${tx.points}` : tx.points} Point
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-black text-slate-900">
                          ⭐ {tx.balanceAfter}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.notes}>
                          {tx.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KOREKSI / PENYESUAIAN POINT MANUAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                Koreksi / Penyesuaian Point Manual
              </h4>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdjust} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp Pelanggan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adjustForm.phone}
                  onChange={(e) => setAdjustForm({ ...adjustForm, phone: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={adjustForm.name}
                  onChange={(e) => setAdjustForm({ ...adjustForm, name: e.target.value })}
                  placeholder="Contoh: Bpk. Wahid"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Pelanggan
                </label>
                <select
                  value={adjustForm.role}
                  onChange={(e) => setAdjustForm({ ...adjustForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="member">👥 Anggota</option>
                  <option value="basic">👤 Basic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Penyesuaian Point (+ Tambah / - Kurang) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.delta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, delta: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Gunakan angka positif (misal: 10) untuk menambah point, atau angka negatif (misal: -5) untuk memotong point.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan / Catatan Penyesuaian (Audit Log) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Tuliskan alasan penyesuaian point..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Terapkan Penyesuaian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
