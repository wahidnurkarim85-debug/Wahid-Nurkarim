import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gift, 
  Plus, 
  Search, 
  Check, 
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
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
  Package,
  FileText
} from 'lucide-react';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, limit, addDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ProductPromotion, Product, MemberRecord, GiftActivity } from '../types';
import { useInbox } from '../context/InboxContext';

interface AdminGiftBonusManagerProps {
  promotions: ProductPromotion[];
  products: Product[];
  members: MemberRecord[];
  initialTab?: 'programs' | 'history';
  onRefresh?: () => void;
}

export const AdminGiftBonusManager: React.FC<AdminGiftBonusManagerProps> = ({
  promotions,
  products,
  members,
  initialTab = 'programs',
  onRefresh,
}) => {
  const { createInboxMessage } = useInbox();

  const [activeTab, setActiveTab] = useState<'programs' | 'history'>(initialTab);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states matching user prompt
  const [name, setName] = useState('');
  const [giftTitle, setGiftTitle] = useState('🎁 Program Gift Bonus Spesial Anggota');
  const [description, setDescription] = useState('');
  
  // Produk Pemicu
  const [buyProductId, setBuyProductId] = useState('');
  const [buyProductName, setBuyProductName] = useState('');
  const [buyVariation, setBuyVariation] = useState('Semua Variasi');
  const [minQty, setMinQty] = useState<number>(2);

  // Produk Bonus (Gratis Rp0)
  const [rewardProductId, setRewardProductId] = useState('');
  const [rewardProductName, setRewardProductName] = useState('');
  const [rewardVariation, setRewardVariation] = useState('Standar');
  const [rewardQty, setRewardQty] = useState<number>(1);
  const [rewardEmoji, setRewardEmoji] = useState('🎁');

  // Rules & Caps
  const [isTiered, setIsTiered] = useState(true); // Kelipatan pembelian
  const [maxBonusPerTransaction, setMaxBonusPerTransaction] = useState<number>(1);
  const [bonusStock, setBonusStock] = useState<number>(100);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [targetAudience, setTargetAudience] = useState<'all_members' | 'specific_members'>('all_members');
  const [targetMemberIds, setTargetMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Quick Restock & Delete state
  const [restockingPromo, setRestockingPromo] = useState<ProductPromotion | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(50);
  const [deletingPromo, setDeletingPromo] = useState<ProductPromotion | null>(null);

  // Riwayat Gift & Activities state
  const [activities, setActivities] = useState<GiftActivity[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'voucher' | 'bonus'>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'Tersedia' | 'Digunakan' | 'Selesai'>('all');

  // Real-time listener for Gift Activities (Audit Trail)
  useEffect(() => {
    const q = query(collection(db, 'gift_activities'), orderBy('givenAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: GiftActivity[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<GiftActivity, 'id'>) });
        });
        setActivities(list);
      },
      (err) => {
        console.warn('Gagal membaca riwayat gift_activities dari Firestore:', err);
      }
    );
    return () => unsubscribe();
  }, []);

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

  // Handle auto fill product trigger & reward
  const handleSelectBuyProduct = (prodId: string) => {
    setBuyProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setBuyProductName(prod.name);
      setBuyVariation(prod.variations && prod.variations.length > 0 ? prod.variations[0] : 'Semua Variasi');
    }
  };

  const handleSelectRewardProduct = (prodId: string) => {
    setRewardProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setRewardProductName(prod.name);
      setRewardVariation(prod.variations && prod.variations.length > 0 ? prod.variations[0] : 'Standar');
      setRewardEmoji(prod.emoji || '🎁');
    }
  };

  const handleOpenCreateForm = () => {
    setEditingPromoId(null);
    setName('');
    setGiftTitle('🎁 Program Gift Bonus Spesial Anggota');
    setDescription('');
    if (products.length > 0) {
      handleSelectBuyProduct(products[0].id);
      handleSelectRewardProduct(products.length > 1 ? products[1].id : products[0].id);
    }
    setMinQty(2);
    setRewardQty(1);
    setIsTiered(false);
    setMaxBonusPerTransaction(1);
    setBonusStock(100);
    setTargetAudience('all_members');
    setTargetMemberIds([]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: ProductPromotion) => {
    setEditingPromoId(p.id);
    setName(p.name);
    setGiftTitle(p.giftTitle || `🎁 Program Gift Bonus: ${p.name}`);
    setDescription(p.description || '');
    setBuyProductId(p.buyProductId);
    setBuyProductName(p.buyProductName);
    setBuyVariation(p.buyVariation || 'Semua Variasi');
    setMinQty(p.minQty);
    setRewardProductId(p.rewardProductId);
    setRewardProductName(p.rewardProductName);
    setRewardVariation(p.rewardVariation || 'Standar');
    setRewardQty(p.rewardQty);
    setRewardEmoji(p.rewardProductEmoji || '🎁');
    setIsTiered(Boolean(p.isTiered));
    setMaxBonusPerTransaction(p.maxBonusPerTransaction || p.maxBonus || 1);
    setBonusStock(p.bonusStock !== undefined ? p.bonusStock : 100);
    setStartDate(p.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(p.endDate || '');
    setTargetAudience(p.targetAudience === 'specific_members' ? 'specific_members' : 'all_members');
    setTargetMemberIds(p.targetMemberIds || []);
    setIsFormOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyProductId || !rewardProductId) {
      setActionNotice({ type: 'error', message: 'Silakan pilih Produk Pemicu dan Produk Bonus!' });
      return;
    }

    setIsSubmitting(true);
    setActionNotice(null);

    const promoId = editingPromoId || `promo_gift_${Date.now()}`;
    const cleanProgramName = name.trim() || `Beli ${minQty} ${buyProductName} Gratis ${rewardQty} ${rewardProductName}`;

    const promoData: ProductPromotion = {
      id: promoId,
      name: cleanProgramName,
      buyProductId,
      buyProductName,
      buyProductEmoji: products.find((p) => p.id === buyProductId)?.emoji || '🛒',
      buyVariation,
      minQty: Number(minQty || 1),
      rewardProductId,
      rewardProductName,
      rewardProductEmoji: rewardEmoji,
      rewardVariation,
      rewardQty: Number(rewardQty || 1),
      isTiered,
      maxBonus: Number(maxBonusPerTransaction || 1),
      maxBonusPerTransaction: Number(maxBonusPerTransaction || 1),
      bonusStock: Number(bonusStock || 0),
      initialBonusStock: Number(bonusStock || 0),
      isStockExhausted: Number(bonusStock || 0) <= 0,
      targetAudience: targetAudience === 'specific_members' ? 'specific_members' : 'member',
      targetMemberIds: targetAudience === 'specific_members' ? targetMemberIds : undefined,
      startDate,
      endDate,
      isActive: true,
      giftTitle: giftTitle.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Simpan program promo ke Firestore
      await setDoc(doc(db, 'promotions', promoId), sanitizeFirestoreData(promoData));

      // 2. Kirim Notifikasi Otomatis ke Kotak Pesan Anggota (Retensi 7 Hari)
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const content =
        `Kabar gembira untuk Anggota Koperasi!\n\n` +
        `Dapatkan bonus gratis ${rewardQty}x ${rewardProductName} (${rewardVariation}) seharga Rp0 setiap pembelian ${minQty}x ${buyProductName} (${buyVariation}).\n\n` +
        `• Produk Pemicu: ${buyProductName} (${buyVariation}) min. ${minQty} pcs\n` +
        `• Produk Bonus: ${rewardProductName} (${rewardVariation}) ${rewardQty} pcs GRATIS Rp0\n` +
        `• Stok Bonus Tersedia: ${bonusStock} pcs\n` +
        `• Periode Berlaku: ${startDate} s/d ${endDate || 'Seterusnya'}\n\n` +
        `Bonus akan otomatis masuk ke keranjang belanja Anda dengan harga Rp0 saat syarat terpenuhi.`;

      if (targetAudience === 'specific_members' && targetMemberIds.length > 0) {
        for (const memId of targetMemberIds) {
          const mem = members.find((m) => m.id === memId);
          await createInboxMessage({
            title: giftTitle.trim() || `🎁 Program Gift Bonus: ${cleanProgramName}`,
            content,
            category: 'gift',
            targetAudience: 'specific',
            targetUserId: mem?.phone || mem?.accountId || mem?.id,
            sender: 'admin',
            isActive: true,
            actionType: 'gift',
            actionLabel: 'Buka Katalog Belanja',
            actionTab: 'catalog',
            createdAtTimestamp: now,
            expiresAtTimestamp: now + SEVEN_DAYS_MS,
            giftDetails: {
              giftType: 'bonus',
              bonusProductName: rewardProductName,
              bonusQty: rewardQty,
              expiresAt: endDate,
            },
            metadata: { giftName: cleanProgramName },
          });
        }
      } else {
        await createInboxMessage({
          title: giftTitle.trim() || `🎁 Program Gift Bonus: ${cleanProgramName}`,
          content,
          category: 'gift',
          targetAudience: 'member',
          sender: 'admin',
          isActive: true,
          actionType: 'gift',
          actionLabel: 'Buka Katalog Belanja',
          actionTab: 'catalog',
          createdAtTimestamp: now,
          expiresAtTimestamp: now + SEVEN_DAYS_MS,
          giftDetails: {
            giftType: 'bonus',
            bonusProductName: rewardProductName,
            bonusQty: rewardQty,
            expiresAt: endDate,
          },
          metadata: { giftName: cleanProgramName },
        });
      }

      // Catat ke log aktivitas riwayat gift
      await addDoc(collection(db, 'gift_activities'), sanitizeFirestoreData({
        type: 'bonus',
        giftName: cleanProgramName,
        triggerProductName: `${buyProductName} (${buyVariation})`,
        bonusProductName: `${rewardProductName} (${rewardVariation})`,
        bonusQty: rewardQty,
        memberName: targetAudience === 'specific_members' ? `${targetMemberIds.length} Anggota Spesifik` : 'Semua Akun Terdaftar',
        memberPhone: 'Broadcast Program',
        memberId: targetAudience === 'specific_members' ? 'specific' : 'all_members',
        givenAt: new Date().toISOString(),
        status: 'Tersedia',
        usedCount: 0,
        remainingBonusStock: Number(bonusStock || 0),
      }));

      setActionNotice({
        type: 'success',
        message: `Program Gift Bonus "${cleanProgramName}" berhasil disimpan dan dibagikan ke Kotak Pesan Anggota!`,
      });
      setIsFormOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Gagal menyimpan program gift bonus:', err);
      setActionNotice({
        type: 'error',
        message: `Gagal menyimpan: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePromoStatus = async (promo: ProductPromotion) => {
    try {
      await updateDoc(doc(db, 'promotions', promo.id), {
        isActive: !promo.isActive,
      });
      setActionNotice({
        type: 'success',
        message: `Program promo "${promo.name}" berhasil di-${!promo.isActive ? 'aktifkan' : 'nonaktifkan'}!`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Gagal update status promo:', err);
    }
  };

  const handleConfirmDeletePromo = async () => {
    if (!deletingPromo || !deletingPromo.id) return;
    const promo = deletingPromo;

    setIsSubmitting(true);
    setActionNotice(null);

    try {
      // Set marker initialization agar data yang dihapus tidak pernah muncul kembali saat refresh
      const initDocRef = doc(db, 'system_meta', 'promotions_initialized');
      await setDoc(initDocRef, { initializedAt: new Date().toISOString() }, { merge: true });

      // 1. Periksa apakah koleksi 'promotions' di Firestore masih kosong
      const promotionsRef = collection(db, 'promotions');
      const snap = await getDocs(promotionsRef);
      if (snap.empty && promotions.length > 0) {
        // Jika Firestore belum menyimpan dokumen sama sekali, simpan program selain yang dihapus
        const batch = writeBatch(db);
        for (const p of promotions) {
          if (p.id !== promo.id) {
            const pDoc = doc(db, 'promotions', p.id);
            batch.set(pDoc, sanitizeFirestoreData({
              ...p,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
          }
        }
        await batch.commit();
      } else {
        // 2. Hapus program yang dipilih berdasarkan ID unik di Firestore Database
        await deleteDoc(doc(db, 'promotions', promo.id));
      }

      setActionNotice({
        type: 'success',
        message: `Program Gift Bonus "${promo.name}" (ID: ${promo.id}) berhasil dihapus.`,
      });
      setDeletingPromo(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Gagal menghapus program gift bonus:', err);
      setActionNotice({
        type: 'error',
        message: `Program Gift Bonus gagal dihapus: ${err?.message || 'Terjadi kesalahan saat menghapus dari database'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteRestock = async () => {
    if (!restockingPromo) return;
    const current = restockingPromo.bonusStock !== undefined ? restockingPromo.bonusStock : 0;
    const newStock = current + Number(restockAmount || 0);

    try {
      await updateDoc(doc(db, 'promotions', restockingPromo.id), {
        bonusStock: newStock,
        isStockExhausted: newStock <= 0,
        updatedAt: new Date().toISOString(),
      });
      setActionNotice({
        type: 'success',
        message: `Stok bonus program "${restockingPromo.name}" berhasil ditambah sebanyak +${restockAmount} (Total: ${newStock} pcs)!`,
      });
      setRestockingPromo(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Gagal restock promo:', err);
    }
  };

  const handleExportHistoryCSV = () => {
    if (activities.length === 0) {
      alert('Belum ada riwayat aktivitas gift untuk diekspor.');
      return;
    }

    const headers = ['Tanggal', 'Jenis', 'Nama Gift / Voucher', 'Penerima', 'No. HP', 'Produk Pemicu', 'Produk Bonus', 'Status', 'Jumlah Pakai', 'Sisa Stok / Kuota'];
    const rows = activities.map((act) => [
      act.givenAt ? new Date(act.givenAt).toLocaleString('id-ID') : '-',
      act.type === 'voucher' ? 'Voucher Diskon' : 'Produk Bonus',
      `"${act.giftName || act.voucherCode || '-'}"`,
      `"${act.memberName || '-'}"`,
      act.memberPhone || '-',
      `"${act.triggerProductName || '-'}"`,
      `"${act.bonusProductName || '-'}"`,
      act.status || 'Tersedia',
      act.usedCount || 0,
      act.remainingBonusStock ?? act.remainingQuota ?? '-',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `riwayat_gift_koperasi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (historyTypeFilter !== 'all' && act.type !== historyTypeFilter) return false;
      if (historyStatusFilter !== 'all' && act.status !== historyStatusFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchName = act.memberName && act.memberName.toLowerCase().includes(q);
        const matchPhone = act.memberPhone && act.memberPhone.includes(q);
        const matchGift = act.giftName && act.giftName.toLowerCase().includes(q);
        const matchVoucher = act.voucherCode && act.voucherCode.toLowerCase().includes(q);
        const matchTrigger = act.triggerProductName && act.triggerProductName.toLowerCase().includes(q);
        const matchBonus = act.bonusProductName && act.bonusProductName.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchGift && !matchVoucher && !matchTrigger && !matchBonus) return false;
      }
      return true;
    });
  }, [activities, historyTypeFilter, historyStatusFilter, historySearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-purple-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 text-xs font-black px-3 py-1 rounded-full border border-purple-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Program Gift Gratis Rp0</span>
              </span>
              <span className="text-xs text-slate-300">Khusus Anggota Terdaftar</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>🎁 Program Gift Bonus & Riwayat Gift</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Atur program hadiah gratis saat pembelian produk pemicu tertentu, pantau stok produk bonus secara otomatis,
              serta audit seluruh riwayat pemberian Gift Voucher & Bonus Produk kepada Anggota.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('programs')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'programs'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              🎁 Program Gift Bonus ({promotions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              📊 Riwayat Gift ({activities.length})
            </button>
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

      {/* QUICK RESTOCK MODAL */}
      {restockingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Package className="w-5 h-5 text-purple-600" />
                <span>Tambah Stok Bonus</span>
              </div>
              <button
                onClick={() => setRestockingPromo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Program: <strong className="text-slate-900">{restockingPromo.name}</strong><br />
              Sisa stok saat ini: <strong className="text-purple-700">{restockingPromo.bonusStock ?? 0} pcs</strong>
            </p>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                Jumlah Tambahan Stok Bonus (pcs):
              </label>
              <input
                type="number"
                min="1"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockingPromo(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestock}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-600/30"
              >
                Tambah Stok Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PROMO CONFIRMATION MODAL */}
      {deletingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                <Trash2 className="w-5 h-5" />
                <span>Konfirmasi Hapus Program Gift Bonus</span>
              </div>
              <button
                onClick={() => setDeletingPromo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-700 font-medium">
                Apakah Anda yakin ingin menghapus program gift bonus ini dari database?
              </p>
              <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100 space-y-1 text-xs">
                <div className="font-black text-red-900">{deletingPromo.name}</div>
                <div className="text-slate-600 text-[11px]">
                  ID: <span className="font-mono">{deletingPromo.id}</span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Pemicu: <strong>{deletingPromo.triggerProductName || 'Belum diatur'}</strong>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Bonus: <strong>{deletingPromo.bonusProductName || 'Belum diatur'}</strong>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Catatan: Data program ini akan dihapus dari Database Firestore. Riwayat transaksi atau pesan hadiah yang telah dikirim tidak akan terpengaruh.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingPromo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePromo}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR PROGRAM GIFT BONUS PRODUK */}
      {/* ========================================================================= */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Daftar Program Gift Bonus ({promotions.length} Aktif)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Otomatis memasukkan produk bonus gratis (Rp0) ke keranjang anggota saat membeli produk pemicu
              </p>
            </div>

            <button
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-700/30 transition-all hover:scale-102 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Program Gift Bonus Baru</span>
            </button>
          </div>

          {/* FORM MODAL PROGRAM GIFT BONUS */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
                <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 text-lg">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        {editingPromoId ? '✏️ Edit Program Gift Bonus' : '🎁 Buat Program Gift Bonus Baru'}
                      </h3>
                      <p className="text-xs text-slate-300">
                        Atur produk pemicu, produk bonus gratis Rp0, stok bonus, dan notifikasi kotak pesan
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

                <form onSubmit={handleSaveProgram} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  {/* Section 1: Info Program */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>1. Identitas Program Gift</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          🎁 Nama Program Gift
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Contoh: Beli 2 Aqua 500ml Gratis 1 Aqua 150ml"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          📝 Judul Gift (Notifikasi)
                        </label>
                        <input
                          type="text"
                          required
                          value={giftTitle}
                          onChange={(e) => setGiftTitle(e.target.value)}
                          placeholder="Contoh: 🎁 Program Gift Bonus Baru Aktif!"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        📝 Deskripsi Program
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Deskripsi ketentuan promo untuk informasi anggota..."
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Section 2: Produk Pemicu */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-950 text-xs font-black uppercase tracking-wider">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                      <span>2. Produk Pemicu (Yang Harus Dibeli Anggota)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          Pilih Produk Pemicu
                        </label>
                        <select
                          value={buyProductId}
                          onChange={(e) => handleSelectBuyProduct(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        >
                          <option value="">-- Pilih Produk Pemicu --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.emoji} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          Variasi / Ukuran
                        </label>
                        <select
                          value={buyVariation}
                          onChange={(e) => setBuyVariation(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        >
                          <option value="Semua Variasi">Semua Variasi</option>
                          {products
                            .find((p) => p.id === buyProductId)
                            ?.variations?.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        🔢 Jumlah Pembelian Minimal
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={minQty}
                        onChange={(e) => setMinQty(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                      />
                      <span className="text-[10px] text-amber-800 mt-1 block">
                        Pelanggan harus membeli minimal jumlah ini untuk mendapatkan bonus.
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Produk Bonus (Gratis Rp0) */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2 text-purple-950 text-xs font-black uppercase tracking-wider">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span>3. Produk Bonus (Diberikan GRATIS Rp0)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          Pilih Produk Hadiah Gratis
                        </label>
                        <select
                          value={rewardProductId}
                          onChange={(e) => handleSelectRewardProduct(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        >
                          <option value="">-- Pilih Produk Bonus --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.emoji} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          Variasi Hadiah
                        </label>
                        <select
                          value={rewardVariation}
                          onChange={(e) => setRewardVariation(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        >
                          {products
                            .find((p) => p.id === rewardProductId)
                            ?.variations?.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            )) || <option value="Standar">Standar</option>}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          🔢 Jumlah Bonus Diberikan
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={rewardQty}
                          onChange={(e) => setRewardQty(Number(e.target.value))}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          🔢 Maksimal Bonus per Transaksi
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={maxBonusPerTransaction}
                          onChange={(e) => setMaxBonusPerTransaction(Number(e.target.value))}
                          placeholder="1"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Stok Bonus & Masa Berlaku */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>4. Stok Bonus, Periode & Targeting</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          📦 Stok Bonus (Pcs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={bonusStock}
                          onChange={(e) => setBonusStock(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Jika stok 0, program otomatis tidak memberikan bonus
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          📅 Tanggal Mulai
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
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-black text-slate-800">
                        👥 Anggota Penerima Program
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer ${
                          targetAudience === 'all_members' ? 'bg-purple-50 border-purple-600' : 'bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="targetAudienceBonus"
                            checked={targetAudience === 'all_members'}
                            onChange={() => setTargetAudience('all_members')}
                            className="w-4 h-4 text-purple-600 accent-purple-600"
                          />
                          <span className="text-xs font-black text-slate-900">Semua Akun Terdaftar</span>
                        </label>

                        <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer ${
                          targetAudience === 'specific_members' ? 'bg-purple-50 border-purple-600' : 'bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="targetAudienceBonus"
                            checked={targetAudience === 'specific_members'}
                            onChange={() => setTargetAudience('specific_members')}
                            className="w-4 h-4 text-purple-600 accent-purple-600"
                          />
                          <span className="text-xs font-black text-slate-900">
                            Anggota Tertentu ({targetMemberIds.length} dipilih)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Form Footer */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-black hover:bg-slate-100 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-700/30 transition-all hover:scale-102 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Memproses...' : 'Simpan & Aktifkan Program Bonus'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* List of Bonus Programs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => {
              const today = new Date().toISOString().split('T')[0];
              const isExpired = promo.endDate && promo.endDate < today;
              const isStockOut = promo.bonusStock !== undefined && promo.bonusStock <= 0;

              return (
                <div
                  key={promo.id}
                  className={`bg-white rounded-3xl border p-5 transition-all shadow-xs space-y-4 ${
                    promo.isActive && !isExpired && !isStockOut
                      ? 'border-purple-300 hover:border-purple-400 hover:shadow-md'
                      : 'border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black bg-purple-100 text-purple-900 px-3 py-1 rounded-xl flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-purple-700" />
                      <span>Bonus Rp0</span>
                    </span>

                    {isExpired ? (
                      <span className="text-[10px] font-black bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
                        Kedaluwarsa
                      </span>
                    ) : isStockOut ? (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        Stok Habis
                      </span>
                    ) : promo.isActive ? (
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

                  <div>
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      {promo.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {promo.description || `Beli ${promo.minQty} ${promo.buyProductName} dapatkan ${promo.rewardQty}x ${promo.rewardProductName} Gratis`}
                    </p>
                  </div>

                  {/* Program Details Card */}
                  <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-2 border border-slate-100 text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">🛒 Produk Pemicu:</span>
                      <span className="font-extrabold text-slate-900">
                        {promo.minQty}x {promo.buyProductName} ({promo.buyVariation || 'Semua'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">🎁 Hadiah Bonus:</span>
                      <span className="font-black text-emerald-700">
                        {promo.rewardQty}x {promo.rewardProductName} ({promo.rewardVariation || 'Standar'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">📦 Sisa Stok Bonus:</span>
                      <span className={`font-black ${
                        isStockOut ? 'text-red-600' : 'text-purple-800'
                      }`}>
                        {promo.bonusStock !== undefined ? `${promo.bonusStock} pcs` : '100 pcs'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">🔢 Maks. Bonus/Transaksi:</span>
                      <span className="font-extrabold text-slate-900">
                        {promo.maxBonusPerTransaction || promo.maxBonus || 1} bonus
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">⏰ Masa Berlaku:</span>
                      <span className="font-bold text-slate-600">
                        {promo.endDate || 'Seterusnya'}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePromoStatus(promo)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                          promo.isActive
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>

                      <button
                        onClick={() => {
                          setRestockingPromo(promo);
                          setRestockAmount(50);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                        title="Tambah stok bonus"
                      >
                        + Stok
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditForm(promo)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="Edit Program"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingPromo(promo)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Hapus Program"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT GIFT & BONUS (AUDIT TRAIL ADMIN) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'voucher', 'bonus'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setHistoryTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      historyTypeFilter === t
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? 'Semua Jenis' : t === 'voucher' ? '🎟️ Voucher' : '🎁 Bonus'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'Tersedia', 'Digunakan'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setHistoryStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      historyStatusFilter === s
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all' ? 'Semua Status' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari anggota, gift, atau produk..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={handleExportHistoryCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer shrink-0"
                title="Unduh laporan riwayat gift ke CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Waktu & Jenis</th>
                    <th className="py-3.5 px-4">Nama Anggota</th>
                    <th className="py-3.5 px-4">Nama Gift / Voucher</th>
                    <th className="py-3.5 px-4">Rincian Promo / Produk</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Penggunaan / Sisa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="text-2xl mb-1">📋</div>
                        <p className="font-bold text-slate-700">Belum ada riwayat pembagian Gift</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Setiap pembagian voucher diskon dan bonus produk gratis akan otomatis terekam di sini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 flex items-center gap-1.5">
                            {item.type === 'voucher' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                                🎟️ Voucher
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">
                                🎁 Bonus
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.givenAt ? new Date(item.givenAt).toLocaleString('id-ID') : '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">{item.memberName}</div>
                          <div className="text-[10px] text-slate-500">{item.memberPhone || '-'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {item.giftName || item.voucherCode}
                          </div>
                          {item.voucherCode && (
                            <div className="text-[10px] font-mono text-emerald-700 font-black">
                              Kode: {item.voucherCode}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.type === 'voucher' ? (
                            <span className="text-emerald-700 font-black">{item.discountSummary}</span>
                          ) : (
                            <div className="text-[11px]">
                              <div>Pemicu: <span className="font-bold text-slate-800">{item.triggerProductName || '-'}</span></div>
                              <div className="text-purple-700 font-bold">
                                Bonus: {item.bonusQty ? `${item.bonusQty}x ` : ''}{item.bonusProductName || '-'}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            item.status === 'Digunakan'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Tersedia'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status || 'Tersedia'}
                          </span>
                          {item.orderId && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              #{item.orderId}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-slate-900">
                            Dipakai: {item.usedCount || 0}x
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.remainingBonusStock !== undefined
                              ? `Sisa Stok: ${item.remainingBonusStock} pcs`
                              : item.remainingQuota !== undefined
                              ? `Sisa Kuota: ${item.remainingQuota}`
                              : ''}
                          </div>
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
    </div>
  );
};
