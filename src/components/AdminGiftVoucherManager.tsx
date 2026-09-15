import React, { useState, useMemo } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Check, 
  Copy, 
  Trash2, 
  Edit3, 
  Users, 
  Calendar, 
  ShoppingBag, 
  Clock, 
  Send, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  X,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { Voucher, Product, MemberRecord } from '../types';
import { useInbox } from '../context/InboxContext';

interface AdminGiftVoucherManagerProps {
  vouchers: Voucher[];
  products: Product[];
  members: MemberRecord[];
  onRefresh?: () => void;
}

export const AdminGiftVoucherManager: React.FC<AdminGiftVoucherManagerProps> = ({
  vouchers,
  products,
  members,
  onRefresh,
}) => {
  const { createInboxMessage } = useInbox();

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'depleted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states matching user prompt
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxDiscount, setMaxDiscount] = useState<number>(25000);
  const [minPurchase, setMinPurchase] = useState<number>(50000);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [usageLimit, setUsageLimit] = useState<number>(1); // 1× atau 2×
  const [applicableScope, setApplicableScope] = useState<'all' | 'specific'>('all');
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<'all_members' | 'specific_members'>('all_members');
  const [targetMemberIds, setTargetMemberIds] = useState<string[]>([]);
  const [quota, setQuota] = useState<number>(100);
  const [giftTitle, setGiftTitle] = useState('🎁 Anda Mendapat Gift Voucher!');
  const [giftMessage, setGiftMessage] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Auto-generate gift message preview if empty
  const formattedDiscountValue = discountType === 'percentage' 
    ? `${discountValue}%` 
    : `Rp ${discountValue.toLocaleString('id-ID')}`;

  const defaultGeneratedMessage = useMemo(() => {
    return `Voucher ${code || 'KODE'} telah masuk ke akun Anda.\n` +
      `Diskon: ${formattedDiscountValue}${discountType === 'percentage' && maxDiscount > 0 ? ` (Maks. Rp ${maxDiscount.toLocaleString('id-ID')})` : ''}\n` +
      `Minimal pembelian: Rp ${minPurchase.toLocaleString('id-ID')}\n` +
      `Batas Penggunaan: Maksimal ${usageLimit}× per Anggota\n` +
      `Berlaku sampai: ${endDate}\n` +
      `Gunakan voucher ini di keranjang belanja saat checkout!`;
  }, [code, formattedDiscountValue, discountType, maxDiscount, minPurchase, usageLimit, endDate]);

  const activeMembersList = useMemo(() => {
    return members.filter((m) => m.status === 'active' || m.status === 'Nonaktif' || !m.status);
  }, [members]);

  const filteredTargetMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return activeMembersList;
    const q = memberSearchQuery.toLowerCase();
    return activeMembersList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.memberNumber && m.memberNumber.toLowerCase().includes(q))
    );
  }, [activeMembersList, memberSearchQuery]);

  const handleCopyCode = (voucherCode: string) => {
    navigator.clipboard.writeText(voucherCode);
    setCopiedCode(voucherCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleGenerateRandomCode = () => {
    const prefixes = ['ANGGOTA', 'KOPDES', 'BERKAH', 'HEMAT', 'SEMBAKO'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${num}`);
  };

  const handleOpenCreateForm = () => {
    setEditingVoucherId(null);
    setName('Gift Diskon Spesial Anggota');
    handleGenerateRandomCode();
    setDiscountType('percentage');
    setDiscountValue(10);
    setMaxDiscount(20000);
    setMinPurchase(50000);
    setUsageLimit(1);
    setApplicableScope('all');
    setApplicableProductIds([]);
    setTargetAudience('all_members');
    setTargetMemberIds([]);
    setQuota(100);
    setGiftTitle('🎁 Anda Mendapat Gift Voucher!');
    setGiftMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (v: Voucher) => {
    setEditingVoucherId(v.id);
    setName(v.name || `Voucher ${v.code}`);
    setCode(v.code);
    setDiscountType(v.discountType);
    setDiscountValue(v.discountValue);
    setMaxDiscount(v.maxDiscount || 0);
    setMinPurchase(v.minPurchase);
    setStartDate(v.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(v.endDate || '');
    setUsageLimit(v.usageLimit || 1);
    setApplicableScope(v.applicableProductIds && v.applicableProductIds.length > 0 ? 'specific' : 'all');
    setApplicableProductIds(v.applicableProductIds || []);
    setTargetAudience(v.targetAudience === 'specific_members' ? 'specific_members' : 'all_members');
    setTargetMemberIds(v.targetMemberIds || []);
    setQuota(v.quota || 100);
    setGiftTitle(v.giftTitle || '🎁 Anda Mendapat Gift Voucher!');
    setGiftMessage(v.giftMessage || '');
    setIsFormOpen(true);
  };

  const handleToggleProductSelection = (productId: string) => {
    setApplicableProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleToggleMemberSelection = (memberId: string) => {
    setTargetMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSelectAllMembers = () => {
    if (targetMemberIds.length === activeMembersList.length) {
      setTargetMemberIds([]);
    } else {
      setTargetMemberIds(activeMembersList.map((m) => m.id));
    }
  };

  const handleSaveAndBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setActionNotice({ type: 'error', message: 'Kode voucher tidak boleh kosong!' });
      return;
    }
    if (discountValue <= 0) {
      setActionNotice({ type: 'error', message: 'Besaran diskon harus lebih dari 0!' });
      return;
    }

    setIsSubmitting(true);
    setActionNotice(null);

    const voucherId = editingVoucherId || `vch_gift_${Date.now()}`;
    const cleanCode = code.trim().toUpperCase();
    const finalContent = giftMessage.trim() || defaultGeneratedMessage;

    const voucherData: Voucher = {
      id: voucherId,
      code: cleanCode,
      name: name.trim() || `Gift Voucher ${cleanCode}`,
      description: finalContent,
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: discountType === 'percentage' ? Number(maxDiscount || 0) : undefined,
      minPurchase: Number(minPurchase || 0),
      isActive: true,
      startDate,
      endDate,
      usageLimit: Number(usageLimit || 1),
      quota: Number(quota || 100),
      usedCount: 0,
      targetAudience: targetAudience === 'specific_members' ? 'specific_members' : 'all',
      targetMemberIds: targetAudience === 'specific_members' ? targetMemberIds : undefined,
      applicableScope,
      applicableProductIds: applicableScope === 'specific' ? applicableProductIds : undefined,
      giftTitle: giftTitle.trim(),
      giftMessage: finalContent,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Simpan ke Firestore vouchers
      await setDoc(doc(db, 'vouchers', voucherId), sanitizeFirestoreData(voucherData));

      // 2. Kirim Pesan ke Kotak Pesan Anggota (Retensi 7 Hari otomatis)
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      if (targetAudience === 'specific_members' && targetMemberIds.length > 0) {
        // Kirim ke anggota spesifik terpilih
        for (const memId of targetMemberIds) {
          const mem = members.find((m) => m.id === memId);
          await createInboxMessage({
            title: giftTitle.trim() || '🎁 Anda Mendapat Gift Voucher!',
            content: finalContent,
            category: 'voucher',
            targetAudience: 'specific',
            targetUserId: mem?.phone || mem?.accountId || mem?.id,
            sender: 'admin',
            isActive: true,
            actionType: 'voucher',
            actionLabel: 'Gunakan Voucher',
            actionTab: 'cart',
            createdAtTimestamp: now,
            expiresAtTimestamp: now + SEVEN_DAYS_MS,
            giftDetails: {
              voucherCode: cleanCode,
              discountText: formattedDiscountValue,
              minPurchase: Number(minPurchase || 0),
              usageLimit: Number(usageLimit || 1),
              expiresAt: endDate,
              giftType: 'voucher',
            },
            metadata: { voucherCode: cleanCode },
          });

          // Catat ke log aktivitas riwayat gift
          await addDoc(collection(db, 'gift_activities'), sanitizeFirestoreData({
            type: 'voucher',
            giftName: name.trim() || `Voucher ${cleanCode}`,
            voucherCode: cleanCode,
            memberName: mem?.name || 'Anggota',
            memberPhone: mem?.phone || '-',
            memberId: mem?.id || '',
            discountSummary: formattedDiscountValue,
            givenAt: new Date().toISOString(),
            status: 'Tersedia',
            usedCount: 0,
            remainingQuota: quota,
          }));
        }
      } else {
        // Broadcast ke semua anggota (targetAudience: 'member')
        await createInboxMessage({
          title: giftTitle.trim() || '🎁 Anda Mendapat Gift Voucher!',
          content: finalContent,
          category: 'voucher',
          targetAudience: 'member',
          sender: 'admin',
          isActive: true,
          actionType: 'voucher',
          actionLabel: 'Gunakan Voucher',
          actionTab: 'cart',
          createdAtTimestamp: now,
          expiresAtTimestamp: now + SEVEN_DAYS_MS,
          giftDetails: {
            voucherCode: cleanCode,
            discountText: formattedDiscountValue,
            minPurchase: Number(minPurchase || 0),
            usageLimit: Number(usageLimit || 1),
            expiresAt: endDate,
            giftType: 'voucher',
          },
          metadata: { voucherCode: cleanCode },
        });

        // Catat ke gift_activities
        await addDoc(collection(db, 'gift_activities'), sanitizeFirestoreData({
          type: 'voucher',
          giftName: name.trim() || `Voucher ${cleanCode}`,
          voucherCode: cleanCode,
          memberName: 'Semua Akun Terdaftar',
          memberPhone: 'Broadcast',
          memberId: 'all_members',
          discountSummary: formattedDiscountValue,
          givenAt: new Date().toISOString(),
          status: 'Tersedia',
          usedCount: 0,
          remainingQuota: quota,
        }));
      }

      setActionNotice({
        type: 'success',
        message: `Voucher ${cleanCode} berhasil dibuat! Voucher telah otomatis tersinkron ke keranjang belanja dan dibagikan ke Kotak Pesan akun terdaftar.`,
      });
      setIsFormOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Gagal menyimpan gift voucher:', err);
      setActionNotice({
        type: 'error',
        message: `Terjadi kesalahan saat menyimpan voucher: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoucherStatus = async (v: Voucher) => {
    try {
      await updateDoc(doc(db, 'vouchers', v.id), {
        isActive: !v.isActive,
      });
      setActionNotice({
        type: 'success',
        message: `Voucher ${v.code} berhasil di-${!v.isActive ? 'aktifkan' : 'nonaktifkan'}!`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Gagal update status voucher:', err);
    }
  };

  const handleDeleteVoucher = async (v: Voucher) => {
    if (!window.confirm(`Yakin ingin menghapus voucher "${v.code}"? Tindakan ini permanen.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'vouchers', v.id));
      setActionNotice({
        type: 'success',
        message: `Voucher ${v.code} berhasil dihapus.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Gagal menghapus voucher:', err);
    }
  };

  // Filter vouchers list
  const filteredVouchers = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return vouchers.filter((v) => {
      const matchSearch =
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.name && v.name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      const isExpired = v.endDate && v.endDate < today;
      const isDepleted = v.quota !== undefined && (v.usedCount || 0) >= v.quota;

      if (filterStatus === 'active') return v.isActive && !isExpired && !isDepleted;
      if (filterStatus === 'expired') return isExpired;
      if (filterStatus === 'depleted') return isDepleted;
      return true;
    });
  }, [vouchers, searchTerm, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Khusus Anggota Koperasi</span>
              </span>
              <span className="text-xs text-slate-300">Retensi Pesan 7 Hari</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>🎁 Gift Voucher Diskon Anggota</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Buat voucher belanja diskon persentase atau nominal tunai, atur kuota, batas penggunaan (1×/2×),
              serta bagikan langsung ke Kotak Pesan Anggota secara otomatis.
            </p>
          </div>

          <button
            onClick={handleOpenCreateForm}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black shadow-lg shadow-emerald-900/40 transition-all hover:scale-102 active:scale-98 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Buat Gift Voucher Baru</span>
          </button>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-slate-300 font-bold">Total Voucher</div>
            <div className="text-xl font-black text-white mt-0.5">{vouchers.length}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-emerald-300 font-bold">Voucher Aktif</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {vouchers.filter((v) => v.isActive).length}
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-amber-300 font-bold">Total Penggunaan</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0)}x
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-blue-300 font-bold">Penerima Anggota</div>
            <div className="text-xl font-black text-blue-300 mt-0.5">
              {activeMembersList.length} Anggota
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL FORM BUAT / EDIT VOUCHER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-lg">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {editingVoucherId ? '✏️ Edit Gift Voucher' : '🎁 Buat & Bagikan Gift Voucher'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Atur ketentuan voucher diskon dan kirimkan ke Kotak Pesan Anggota
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSaveAndBroadcast} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Section 1: Data Pokok Voucher */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>1. Informasi Utama Voucher</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      🎟️ Nama Voucher
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Voucher Sembako Lebaran 10%"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-slate-800">
                        🏷️ Kode Voucher
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        Acak Kode
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: HEMAT10"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black tracking-wider text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Jenis & Besaran Diskon */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                  <span className="text-xs font-black text-emerald-950 block">
                    💰 Jenis & Besaran Diskon
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      discountType === 'percentage'
                        ? 'bg-white border-emerald-600 shadow-xs'
                        : 'bg-white/60 border-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="discountType"
                        checked={discountType === 'percentage'}
                        onChange={() => setDiscountType('percentage')}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900">Persentase (%)</div>
                        <div className="text-[11px] text-slate-500">Potongan berdasarkan % belanja</div>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      discountType === 'fixed'
                        ? 'bg-white border-emerald-600 shadow-xs'
                        : 'bg-white/60 border-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="discountType"
                        checked={discountType === 'fixed'}
                        onChange={() => setDiscountType('fixed')}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900">Nominal Tetap (Rp)</div>
                        <div className="text-[11px] text-slate-500">Potongan langsung nilai rupiah</div>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        {discountType === 'percentage' ? 'Besaran Diskon (%)' : 'Potongan Tunai (Rp)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                      />
                    </div>

                    {discountType === 'percentage' ? (
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          Maksimal Potongan (Rp) <span className="text-slate-400 font-normal">(0 = tanpa batas)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={maxDiscount}
                          onChange={(e) => setMaxDiscount(Number(e.target.value))}
                          placeholder="25000"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          📦 Minimal Belanja (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={minPurchase}
                          onChange={(e) => setMinPurchase(Number(e.target.value))}
                          placeholder="50000"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {discountType === 'percentage' && (
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        📦 Minimal Pembelian untuk Menggunakan Voucher (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={minPurchase}
                        onChange={(e) => setMinPurchase(Number(e.target.value))}
                        placeholder="50000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Masa Berlaku & Batas Penggunaan */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>2. Masa Berlaku, Kuota & Batas Penggunaan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      📅 Tanggal Mulai Berlaku
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      ⏰ Tanggal Berakhir
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      🔢 Batas Penggunaan per Anggota
                    </label>
                    <select
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                    >
                      <option value={1}>1× Penggunaan per Anggota</option>
                      <option value={2}>2× Penggunaan per Anggota</option>
                      <option value={3}>3× Penggunaan per Anggota</option>
                      <option value={5}>5× Penggunaan per Anggota</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      🔢 Kuota Total Voucher
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quota}
                      onChange={(e) => setQuota(Number(e.target.value))}
                      placeholder="100"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Jumlah voucher yang dapat diklaim seluruh anggota secara total
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      🛒 Produk yang Mendapatkan Voucher
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setApplicableScope('all')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                          applicableScope === 'all'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Semua Produk
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplicableScope('specific')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                          applicableScope === 'specific'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Produk Tertentu ({applicableProductIds.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Produk Tertentu Picker */}
                {applicableScope === 'specific' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-black text-slate-800 block">
                      Pilih Produk yang Mendapatkan Diskon Voucher:
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-1">
                      {products.map((p) => {
                        const isSelected = applicableProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProductSelection(p.id)}
                              className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
                            />
                            <span>{p.emoji}</span>
                            <span className="truncate">{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Anggota Penerima Voucher */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>3. Anggota Penerima Voucher (Targeting)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    targetAudience === 'all_members'
                      ? 'bg-emerald-50/70 border-emerald-600'
                      : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === 'all_members'}
                      onChange={() => setTargetAudience('all_members')}
                      className="w-4 h-4 text-emerald-600 accent-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">👥 Semua Akun Terdaftar</div>
                      <div className="text-[11px] text-slate-500">
                        Otomatis masuk ke kotak pesan seluruh {activeMembersList.length} akun aktif
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    targetAudience === 'specific_members'
                      ? 'bg-emerald-50/70 border-emerald-600'
                      : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === 'specific_members'}
                      onChange={() => setTargetAudience('specific_members')}
                      className="w-4 h-4 text-emerald-600 accent-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">🎯 Anggota Tertentu Saja</div>
                      <div className="text-[11px] text-slate-500">
                        Pilih anggota terpilih ({targetMemberIds.length} dipilih)
                      </div>
                    </div>
                  </label>
                </div>

                {targetAudience === 'specific_members' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-800">
                        Pilih Anggota ({targetMemberIds.length} dari {activeMembersList.length} dipilih):
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllMembers}
                        className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        {targetMemberIds.length === activeMembersList.length ? 'Batalkan Semua' : 'Pilih Semua Anggota'}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Cari nama anggota atau nomor HP..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                    />

                    <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 divide-y divide-slate-100">
                      {filteredTargetMembers.map((m) => {
                        const isSelected = targetMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-100/70 text-emerald-950 font-black'
                                : 'bg-white hover:bg-slate-100 text-slate-700 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleMemberSelection(m.id)}
                                className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded shrink-0"
                              />
                              <div className="truncate">
                                <span>{m.name}</span>
                                <span className="text-[10px] text-slate-500 font-normal ml-1.5">
                                  ({m.phone || m.memberNumber || 'Anggota'})
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Judul & Isi Pesan Gift (Notifikasi Kotak Pesan) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>4. Notifikasi Kotak Pesan Anggota (Retensi 7 Hari)</span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    📝 Judul Gift
                  </label>
                  <input
                    type="text"
                    required
                    value={giftTitle}
                    onChange={(e) => setGiftTitle(e.target.value)}
                    placeholder="Contoh: 🎁 Anda Mendapat Gift Voucher!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-800">
                      📝 Isi Pesan Gift
                    </label>
                    <button
                      type="button"
                      onClick={() => setGiftMessage(defaultGeneratedMessage)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Gunakan Template Otomatis
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={giftMessage || defaultGeneratedMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 font-mono leading-relaxed"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sistem otomatis menghapus pesan dari Kotak Pesan Anggota setelah 7 hari.</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-black hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-700/30 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memproses...' : '🎁 Simpan & Bagikan Gift atau Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `Semua (${vouchers.length})` },
            { id: 'active', label: `Aktif (${vouchers.filter((v) => v.isActive).length})` },
            { id: 'expired', label: 'Kedaluwarsa' },
            { id: 'depleted', label: 'Kuota Habis' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kode atau nama voucher..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Vouchers Grid */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto text-slate-400">
            🎟️
          </div>
          <h4 className="text-base font-black text-slate-800">Tidak ada voucher ditemukan</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Belum ada voucher yang sesuai dengan kriteria filter saat ini. Buat voucher baru untuk membagikan gift ke anggota koperasi.
          </p>
          <button
            onClick={handleOpenCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Gift Voucher Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((v) => {
            const today = new Date().toISOString().split('T')[0];
            const isExpired = v.endDate && v.endDate < today;
            const isDepleted = v.quota !== undefined && (v.usedCount || 0) >= v.quota;

            return (
              <div
                key={v.id}
                className={`bg-white rounded-3xl border p-5 transition-all shadow-xs space-y-4 relative ${
                  v.isActive && !isExpired && !isDepleted
                    ? 'border-emerald-300 hover:border-emerald-400 hover:shadow-md'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header Card: Code & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-slate-900 text-amber-300 px-3 py-1 rounded-xl tracking-wider uppercase font-mono shadow-2xs">
                      {v.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(v.code)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Salin Kode Voucher"
                    >
                      {copiedCode === v.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Status Badge */}
                  {isExpired ? (
                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
                      Kedaluwarsa
                    </span>
                  ) : isDepleted ? (
                    <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                      Kuota Habis
                    </span>
                  ) : v.isActive ? (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                      Nonaktif
                    </span>
                  )}
                </div>

                {/* Name & Discount Value */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {v.name || `Voucher ${v.code}`}
                  </h4>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {v.discountType === 'percentage'
                      ? `Diskon ${v.discountValue}%`
                      : `Potongan Rp ${v.discountValue.toLocaleString('id-ID')}`}
                    {v.discountType === 'percentage' && v.maxDiscount && v.maxDiscount > 0 ? (
                      <span className="text-[11px] font-normal text-slate-500 ml-1">
                        (Maks Rp {v.maxDiscount.toLocaleString('id-ID')})
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Voucher Specs */}
                <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-100 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Min. Belanja:</span>
                    <span className="font-extrabold text-slate-900">
                      {v.minPurchase > 0 ? `Rp ${v.minPurchase.toLocaleString('id-ID')}` : 'Tanpa Minimal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Batas Penggunaan:</span>
                    <span className="font-extrabold text-slate-900">
                      {v.usageLimit ? `${v.usageLimit}× per Anggota` : '1× per Anggota'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kuota Terpakai:</span>
                    <span className="font-extrabold text-slate-900">
                      {v.usedCount || 0} / {v.quota || '∞'} voucher
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Berlaku Sampai:</span>
                    <span className="font-extrabold text-slate-900">
                      {v.endDate || 'Seterusnya'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Target Penerima:</span>
                    <span className="font-extrabold text-emerald-800">
                      {v.targetAudience === 'specific_members'
                        ? `${v.targetMemberIds?.length || 0} Anggota Spesifik`
                        : 'Semua Anggota'}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleVoucherStatus(v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                      v.isActive
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {v.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditForm(v)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Voucher"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVoucher(v)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus Voucher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
