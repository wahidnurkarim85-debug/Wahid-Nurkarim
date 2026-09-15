import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BundlingPromotion, MinimumPurchaseDiscount, Product } from '../types';
import { INITIAL_BUNDLING_PROMOTIONS, INITIAL_MIN_PURCHASE_DISCOUNTS } from '../data/initialBundlingPromotions';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  ToggleLeft, 
  ToggleRight, 
  ShoppingBag, 
  Award, 
  Tag, 
  Percent, 
  DollarSign,
  Users,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

interface AdminBundlingManagerProps {
  products: Product[];
  defaultAudience?: 'all' | 'member' | 'visitor';
}

export const AdminBundlingManager: React.FC<AdminBundlingManagerProps> = ({ products, defaultAudience = 'all' }) => {
  const [activeTab, setActiveTab] = useState<'bundling' | 'minPurchase'>('bundling');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'member' | 'visitor'>(defaultAudience);

  const [bundlingPromos, setBundlingPromos] = useState<BundlingPromotion[]>(INITIAL_BUNDLING_PROMOTIONS);
  const [minPurchaseRules, setMinPurchaseRules] = useState<MinimumPurchaseDiscount[]>(INITIAL_MIN_PURCHASE_DISCOUNTS);

  // Modal & Form States for Bundling
  const [bundlingModalOpen, setBundlingModalOpen] = useState(false);
  const [editingBundlingId, setEditingBundlingId] = useState<string | null>(null);
  const [bundlingForm, setBundlingForm] = useState<Omit<BundlingPromotion, 'id'>>({
    name: '',
    targetAudience: 'member',
    productId: products[0]?.id || '',
    productName: products[0]?.name || '',
    productEmoji: products[0]?.emoji || '📦',
    variation: 'Semua Variasi',
    minQty: 2,
    discountType: 'percentage',
    discountValue: 10,
    isMultiple: true,
    isActive: true,
  });

  // Modal & Form States for Min Purchase Discount
  const [minModalOpen, setMinModalOpen] = useState(false);
  const [editingMinId, setEditingMinId] = useState<string | null>(null);
  const [minForm, setMinForm] = useState<Omit<MinimumPurchaseDiscount, 'id'>>({
    name: '',
    targetAudience: 'member',
    minPurchase: 10000,
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 50000,
    isActive: true,
  });

  // Firestore listeners
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'bundling_promotions'), (snap) => {
        if (!snap.empty) {
          const list: BundlingPromotion[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BundlingPromotion, 'id'>) }));
          setBundlingPromos(list);
        } else {
          setBundlingPromos(INITIAL_BUNDLING_PROMOTIONS);
        }
      }, () => setBundlingPromos(INITIAL_BUNDLING_PROMOTIONS));
      return () => unsub();
    } catch {
      setBundlingPromos(INITIAL_BUNDLING_PROMOTIONS);
    }
  }, []);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'minimum_purchase_discounts'), (snap) => {
        if (!snap.empty) {
          const list: MinimumPurchaseDiscount[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<MinimumPurchaseDiscount, 'id'>) }));
          setMinPurchaseRules(list);
        } else {
          setMinPurchaseRules(INITIAL_MIN_PURCHASE_DISCOUNTS);
        }
      }, () => setMinPurchaseRules(INITIAL_MIN_PURCHASE_DISCOUNTS));
      return () => unsub();
    } catch {
      setMinPurchaseRules(INITIAL_MIN_PURCHASE_DISCOUNTS);
    }
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Handlers for Bundling
  const handleSaveBundling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundlingForm.name.trim()) {
      alert('Nama promo bundling wajib diisi.');
      return;
    }

    try {
      if (editingBundlingId) {
        await updateDoc(doc(db, 'bundling_promotions', editingBundlingId), {
          ...bundlingForm,
          updatedAt: new Date().toISOString(),
        });
        alert('Promo bundling berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'bundling_promotions'), {
          ...bundlingForm,
          createdAt: new Date().toISOString(),
        });
        alert('Promo bundling baru berhasil ditambahkan!');
      }
      setBundlingModalOpen(false);
      setEditingBundlingId(null);
    } catch (err) {
      console.error('Error saving bundling promotion:', err);
      alert('Gagal menyimpan promo bundling.');
    }
  };

  const handleToggleBundlingStatus = async (item: BundlingPromotion) => {
    try {
      await updateDoc(doc(db, 'bundling_promotions', item.id), {
        isActive: !item.isActive,
      });
    } catch (err) {
      console.error('Error toggling bundling status:', err);
    }
  };

  const handleDeleteBundling = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus promo bundling ini?')) {
      try {
        await deleteDoc(doc(db, 'bundling_promotions', id));
      } catch (err) {
        console.error('Error deleting bundling:', err);
      }
    }
  };

  // Handlers for Minimum Purchase
  const handleSaveMin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minForm.name.trim()) {
      alert('Nama aturan minimal belanja wajib diisi.');
      return;
    }

    try {
      if (editingMinId) {
        await updateDoc(doc(db, 'minimum_purchase_discounts', editingMinId), {
          ...minForm,
          updatedAt: new Date().toISOString(),
        });
        alert('Diskon minimal belanja berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'minimum_purchase_discounts'), {
          ...minForm,
          createdAt: new Date().toISOString(),
        });
        alert('Diskon minimal belanja baru berhasil ditambahkan!');
      }
      setMinModalOpen(false);
      setEditingMinId(null);
    } catch (err) {
      console.error('Error saving minimum purchase discount:', err);
      alert('Gagal menyimpan diskon minimal belanja.');
    }
  };

  const handleToggleMinStatus = async (item: MinimumPurchaseDiscount) => {
    try {
      await updateDoc(doc(db, 'minimum_purchase_discounts', item.id), {
        isActive: !item.isActive,
      });
    } catch (err) {
      console.error('Error toggling min purchase status:', err);
    }
  };

  const handleDeleteMin = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus aturan diskon minimal belanja ini?')) {
      try {
        await deleteDoc(doc(db, 'minimum_purchase_discounts', id));
      } catch (err) {
        console.error('Error deleting min purchase discount:', err);
      }
    }
  };

  const filteredBundling = bundlingPromos.filter(p => audienceFilter === 'all' || p.targetAudience === audienceFilter);
  const filteredMin = minPurchaseRules.filter(r => audienceFilter === 'all' || r.targetAudience === audienceFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-red-600" />
            <span>Manajemen Diskon Bundling & Minimal Pembelian</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur promo diskon bundling produk dan diskon minimal belanja otomatis untuk Anggota dan Basic secara terpisah. Sistem otomatis memilih diskon terbaik tanpa menumpuk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'bundling' ? (
            <button
              type="button"
              onClick={() => {
                setEditingBundlingId(null);
                setBundlingForm({
                  name: '',
                  targetAudience: audienceFilter === 'visitor' ? 'visitor' : 'member',
                  productId: products[0]?.id || '',
                  productName: products[0]?.name || '',
                  productEmoji: products[0]?.emoji || '📦',
                  variation: 'Semua Variasi',
                  minQty: 2,
                  discountType: 'percentage',
                  discountValue: 10,
                  isMultiple: true,
                  isActive: true,
                });
                setBundlingModalOpen(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bundling Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingMinId(null);
                setMinForm({
                  name: '',
                  targetAudience: audienceFilter === 'visitor' ? 'visitor' : 'member',
                  minPurchase: 10000,
                  discountType: 'percentage',
                  discountValue: 10,
                  maxDiscount: 50000,
                  isActive: true,
                });
                setMinModalOpen(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Diskon Minimal Belanja</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs & Audience Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bundling')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'bundling'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            🛍️ Diskon Bundling ({bundlingPromos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('minPurchase')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'minPurchase'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            💰 Diskon Minimal Pembelian ({minPurchaseRules.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500">Sasaran:</span>
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as any)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Semua Pelanggan</option>
            <option value="member">👥 Khusus Anggota</option>
            <option value="visitor">👤 Khusus Basic</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Bundling Promotions Table */}
      {activeTab === 'bundling' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Nama Promo Bundling</th>
                  <th className="py-3.5 px-4">Sasaran</th>
                  <th className="py-3.5 px-4">Produk / Variasi</th>
                  <th className="py-3.5 px-4">Syarat Qty</th>
                  <th className="py-3.5 px-4">Diskon</th>
                  <th className="py-3.5 px-4">Kelipatan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBundling.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada promo diskon bundling yang dibuat.
                    </td>
                  </tr>
                ) : (
                  filteredBundling.map((promo, idx) => (
                    <tr key={promo.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{promo.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          promo.targetAudience === 'member' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {promo.targetAudience === 'member' ? '👥 Anggota' : '👤 Basic'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {promo.productEmoji || '📦'} {promo.productName} <span className="text-[10px] text-slate-500">({promo.variation})</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">Beli {promo.minQty}</td>
                      <td className="py-3.5 px-4 font-black text-red-600">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatRupiah(promo.discountValue)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${promo.isMultiple ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                          {promo.isMultiple ? '🔄 Aktif (Kelipatan)' : '⛔ 1x Saja'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleBundlingStatus(promo)}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          {promo.isActive ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBundlingId(promo.id);
                              setBundlingForm({
                                name: promo.name,
                                targetAudience: promo.targetAudience,
                                productId: promo.productId,
                                productName: promo.productName,
                                productEmoji: promo.productEmoji || '📦',
                                variation: promo.variation,
                                minQty: promo.minQty,
                                discountType: promo.discountType,
                                discountValue: promo.discountValue,
                                isMultiple: promo.isMultiple,
                                isActive: promo.isActive,
                              });
                              setBundlingModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                            title="Edit Promo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBundling(promo.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer"
                            title="Hapus Promo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Minimum Purchase Discounts Table */}
      {activeTab === 'minPurchase' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Nama Aturan</th>
                  <th className="py-3.5 px-4">Sasaran</th>
                  <th className="py-3.5 px-4">Minimal Belanja</th>
                  <th className="py-3.5 px-4">Besaran Diskon</th>
                  <th className="py-3.5 px-4">Maksimal Diskon</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMin.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada aturan diskon minimal pembelian.
                    </td>
                  </tr>
                ) : (
                  filteredMin.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{rule.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          rule.targetAudience === 'member' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rule.targetAudience === 'member' ? '👥 Anggota' : '👤 Basic'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{formatRupiah(rule.minPurchase)}</td>
                      <td className="py-3.5 px-4 font-black text-red-600">
                        {rule.discountType === 'percentage' ? `${rule.discountValue}%` : formatRupiah(rule.discountValue)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {rule.maxDiscount ? formatRupiah(rule.maxDiscount) : 'Tanpa Batas'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleMinStatus(rule)}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          {rule.isActive ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMinId(rule.id);
                              setMinForm({
                                name: rule.name,
                                targetAudience: rule.targetAudience,
                                minPurchase: rule.minPurchase,
                                discountType: rule.discountType,
                                discountValue: rule.discountValue,
                                maxDiscount: rule.maxDiscount || 50000,
                                isActive: rule.isActive,
                              });
                              setMinModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                            title="Edit Aturan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMin(rule.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer"
                            title="Hapus Aturan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== BUNDLING MODAL ==================== */}
      {bundlingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                <span>{editingBundlingId ? 'Edit Promo Bundling' : 'Tambah Promo Bundling Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setBundlingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBundling} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Nama Promo Bundling</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli 2 Aqua 500 ml → Diskon 10%"
                  value={bundlingForm.name}
                  onChange={(e) => setBundlingForm({ ...bundlingForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Jenis Pelanggan (Sasaran)</label>
                  <select
                    value={bundlingForm.targetAudience}
                    onChange={(e) => setBundlingForm({ ...bundlingForm, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="member">👥 Anggota</option>
                    <option value="visitor">👤 Basic</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Produk Promo</label>
                  <select
                    value={bundlingForm.productId}
                    onChange={(e) => {
                      const selectedProd = products.find(p => p.id === e.target.value);
                      if (selectedProd) {
                        setBundlingForm({
                          ...bundlingForm,
                          productId: selectedProd.id,
                          productName: selectedProd.name,
                          productEmoji: selectedProd.emoji || '📦',
                          variation: selectedProd.variations?.[0] || 'Semua Variasi',
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji || '📦'} {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Variasi / Ukuran</label>
                  <input
                    type="text"
                    placeholder="Contoh: 500 ml atau Semua"
                    value={bundlingForm.variation}
                    onChange={(e) => setBundlingForm({ ...bundlingForm, variation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Jumlah Pemicu (Min. Qty)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={bundlingForm.minQty}
                    onChange={(e) => setBundlingForm({ ...bundlingForm, minQty: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Tipe Diskon</label>
                  <select
                    value={bundlingForm.discountType}
                    onChange={(e) => setBundlingForm({ ...bundlingForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Besaran Diskon</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={bundlingForm.discountValue}
                    onChange={(e) => setBundlingForm({ ...bundlingForm, discountValue: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-extrabold text-slate-900">🔘 Berlaku Kelipatan</p>
                  <p className="text-[10px] text-slate-500">Jika aktif, berlaku kelipatan otomatis (beli 4 jadi 2 bundling).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBundlingForm({ ...bundlingForm, isMultiple: !bundlingForm.isMultiple })}
                  className="cursor-pointer"
                >
                  {bundlingForm.isMultiple ? (
                    <span className="px-3 py-1 bg-purple-600 text-white font-bold rounded-xl text-xs">AKTIF</span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">NONAKTIF</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-extrabold text-slate-900">🟢 Status Promo</p>
                  <p className="text-[10px] text-slate-500">Aktifkan atau nonaktifkan promo ini secara instan.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBundlingForm({ ...bundlingForm, isActive: !bundlingForm.isActive })}
                  className="cursor-pointer"
                >
                  {bundlingForm.isActive ? (
                    <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-xl text-xs">AKTIF</span>
                  ) : (
                    <span className="px-3 py-1 bg-rose-600 text-white font-bold rounded-xl text-xs">NONAKTIF</span>
                  )}
                </button>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBundlingModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Simpan Promo Bundling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MIN PURCHASE MODAL ==================== */}
      {minModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span>{editingMinId ? 'Edit Diskon Minimal Belanja' : 'Tambah Diskon Minimal Belanja Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setMinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMin} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Nama Aturan Diskon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Diskon Minimal Belanja Rp 10.000 → 10%"
                  value={minForm.name}
                  onChange={(e) => setMinForm({ ...minForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Jenis Pelanggan (Sasaran)</label>
                <select
                  value={minForm.targetAudience}
                  onChange={(e) => setMinForm({ ...minForm, targetAudience: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  <option value="member">👥 Anggota</option>
                  <option value="visitor">👤 Basic</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Minimal Belanja (Rp)</label>
                <input
                  type="number"
                  min={1000}
                  required
                  value={minForm.minPurchase}
                  onChange={(e) => setMinForm({ ...minForm, minPurchase: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Tipe Diskon</label>
                  <select
                    value={minForm.discountType}
                    onChange={(e) => setMinForm({ ...minForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Besaran Diskon</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={minForm.discountValue}
                    onChange={(e) => setMinForm({ ...minForm, discountValue: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              {minForm.discountType === 'percentage' && (
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Maksimal Potongan Diskon (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={minForm.maxDiscount || 0}
                    onChange={(e) => setMinForm({ ...minForm, maxDiscount: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-extrabold text-slate-900">🟢 Status Aturan</p>
                  <p className="text-[10px] text-slate-500">Aktifkan atau nonaktifkan aturan diskon minimal belanja.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMinForm({ ...minForm, isActive: !minForm.isActive })}
                  className="cursor-pointer"
                >
                  {minForm.isActive ? (
                    <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-xl text-xs">AKTIF</span>
                  ) : (
                    <span className="px-3 py-1 bg-rose-600 text-white font-bold rounded-xl text-xs">NONAKTIF</span>
                  )}
                </button>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMinModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
