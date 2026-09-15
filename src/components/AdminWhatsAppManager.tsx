import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Save, 
  MessageSquare, 
  Send, 
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Eye,
  Copy,
  Check,
  Mail,
  Globe,
  Tag,
  Gift,
  Ticket,
  Truck,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Percent,
  Download,
  Package
} from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Voucher } from '../types';
import { useProductAnalytics } from '../hooks/useProductAnalytics';
import { useCart } from '../context/CartContext';
import { 
  createBelanjaSekarangBannerSvg, 
  navigateToCatalogProduct, 
  generateSmartCopywriting, 
  CopywritingPayload,
  PopularProductCopyItem,
  formatRupiah 
} from '../utils/copywritingHelper';

interface AdminWhatsAppManagerProps {
  onApplyToInbox?: (copywritingText: string, payload?: CopywritingPayload) => void;
}

export const AdminWhatsAppManager: React.FC<AdminWhatsAppManagerProps> = ({ onApplyToInbox }) => {
  const [waNumber, setWaNumber] = useState('');
  const [isWaSaved, setIsWaSaved] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(() => {
    const saved = localStorage.getItem('kopdes_admin_website_url');
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return '';
  });
  const [copywriting, setCopywriting] = useState('');
  const [copywritingPayload, setCopywritingPayload] = useState<CopywritingPayload | null>(null);
  const [isCopySaved, setIsCopySaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSentToInbox, setIsSentToInbox] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'textPreview' | 'visualPreview'>('edit');
  const [products, setProducts] = useState<Product[]>([]);
  const [discountVouchers, setDiscountVouchers] = useState<Voucher[]>([]);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);
  const [copiedBannerUrl, setCopiedBannerUrl] = useState<string | null>(null);
  
  const { productStats } = useProductAnalytics();
  const { promotions, bundlingPromotions, shippingVouchers } = useCart();

  // Load saved data, products, and discount vouchers
  useEffect(() => {
    const savedNum = localStorage.getItem('kopdes_admin_wa');
    if (savedNum) {
      setWaNumber(savedNum);
      setIsWaSaved(true);
    }
    const savedCopy = localStorage.getItem('kopdes_admin_copywriting');
    if (savedCopy) {
      // Ensure any legacy banner placeholder text is removed automatically
      const sanitizedCopy = savedCopy.replace(/[ \t]*🖼️\s*\[GAMBAR:\s*BELANJA\s*SEKARANG\]\s*\n?/gi, '');
      setCopywriting(sanitizedCopy);
      setIsCopySaved(true);
    }
    const savedPayload = localStorage.getItem('kopdes_admin_copywriting_payload');
    if (savedPayload) {
      try {
        setCopywritingPayload(JSON.parse(savedPayload));
      } catch (e) {
        console.warn('Failed to parse saved copywriting payload', e);
      }
    }
    const savedDomain = localStorage.getItem('kopdes_admin_website_url');
    if (!savedDomain && typeof window !== 'undefined' && window.location.origin) {
      setWebsiteUrl(window.location.origin);
    }
    
    // Fetch products
    const qProducts = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    });

    // Fetch discount vouchers from Firestore
    const qVouchers = query(collection(db, 'vouchers'));
    const unsubscribeVouchers = onSnapshot(qVouchers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voucher));
      setDiscountVouchers(data);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeVouchers();
    };
  }, []);

  const handleSaveWa = () => {
    const cleanNum = waNumber.replace(/\D/g, '');
    if (cleanNum.length < 9) {
      alert('Format nomor WhatsApp tidak valid.');
      return;
    }
    let finalNum = cleanNum;
    if (finalNum.startsWith('0')) {
      finalNum = '62' + finalNum.substring(1);
    } else if (!finalNum.startsWith('62')) {
      finalNum = '62' + finalNum;
    }
    setWaNumber(finalNum);
    localStorage.setItem('kopdes_admin_wa', finalNum);
    setIsWaSaved(true);
    setTimeout(() => setIsWaSaved(false), 3000);
  };

  const handleGenerateCopywriting = () => {
    const payload = generateSmartCopywriting({
      products,
      productStats,
      discountVouchers,
      shippingVouchers,
      promotions,
      bundlingPromotions,
      websiteUrl,
    });

    setCopywriting(payload.text);
    setCopywritingPayload(payload);
    localStorage.setItem('kopdes_admin_copywriting', payload.text);
    localStorage.setItem('kopdes_admin_copywriting_payload', JSON.stringify(payload));
    setIsCopySaved(false);
    setPreviewMode('visualPreview');
  };

  const handleSaveCopywriting = () => {
    if (!copywriting.trim()) return;
    localStorage.setItem('kopdes_admin_copywriting', copywriting);
    if (copywritingPayload) {
      localStorage.setItem('kopdes_admin_copywriting_payload', JSON.stringify(copywritingPayload));
    }
    setIsCopySaved(true);
    setTimeout(() => setIsCopySaved(false), 3000);
  };

  const handleCopyClipboard = async () => {
    if (!copywriting.trim()) {
      alert('Belum ada teks copywriting. Silakan klik "Buat Copywriting Otomatis" atau ketik pesan terlebih dahulu.');
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copywriting);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = copywriting;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      alert('Gagal menyalin teks ke clipboard.');
    }
  };

  const handleTransferToInbox = () => {
    if (!copywriting.trim()) {
      alert('Belum ada teks copywriting. Silakan klik "Buat Copywriting Otomatis" atau ketik pesan terlebih dahulu.');
      return;
    }
    localStorage.setItem('kopdes_admin_copywriting', copywriting);
    if (copywritingPayload) {
      localStorage.setItem('kopdes_admin_copywriting_payload', JSON.stringify(copywritingPayload));
    }
    
    if (onApplyToInbox) {
      onApplyToInbox(copywriting, copywritingPayload || undefined);
    } else {
      window.dispatchEvent(
        new CustomEvent('kopdes_apply_copywriting_to_inbox', { 
          detail: { 
            text: copywriting,
            payload: copywritingPayload 
          } 
        })
      );
    }
    setIsSentToInbox(true);
    setTimeout(() => setIsSentToInbox(false), 3500);
  };

  const handleSendToWhatsApp = () => {
    if (!waNumber) {
      alert('Silakan simpan Nomor WhatsApp Admin terlebih dahulu.');
      return;
    }
    if (!copywriting) {
      alert('Silakan isi atau buat copywriting terlebih dahulu.');
      return;
    }
    
    const encodedText = encodeURIComponent(copywriting);
    const waUrl = `https://wa.me/${waNumber}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucherCode(code);
    setTimeout(() => setCopiedVoucherCode(null), 2500);
  };

  const handleCopyBannerSvg = (bannerUrl: string, productId: string) => {
    navigator.clipboard.writeText(bannerUrl);
    setCopiedBannerUrl(productId);
    setTimeout(() => setCopiedBannerUrl(null), 2500);
  };

  // Metrics summary
  const discountedProducts = products.filter(p => p.isAvailable && (p.hasMemberDiscount || p.hasVisitorDiscount));
  const activePromoCount = promotions.filter(p => p.isActive).length;
  const activeShippingVoucherCount = shippingVouchers.filter(v => v.isActive).length;
  const activeDiscountVoucherCount = discountVouchers.filter(v => v.isActive).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shadow-xs">
            <Phone className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📱 WhatsApp Admin &amp; Smart Copywriting</span>
              <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Terkoneksi Otomatis
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Copywriting otomatis terhubung ke statistik produk terpopuler, voucher belanja &amp; ongkir, serta diskon katalog, promo gift, dan paket bundling hemat yang otomatis mengikuti produk populer di analitik website.
            </p>
          </div>
        </div>

        {/* Sync Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold text-slate-600">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-600" /> Analitik Tren Populer
          </span>
          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Ticket className="w-3 h-3 text-blue-600" /> {activeDiscountVoucherCount} Voucher Belanja
          </span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Truck className="w-3 h-3 text-emerald-600" /> {activeShippingVoucherCount} Voucher Ongkir
          </span>
          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Tag className="w-3 h-3 text-rose-600" /> {copywritingPayload ? copywritingPayload.catalogDiscounts.length : 'Otomatis'} Diskon Populer
          </span>
          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Gift className="w-3 h-3 text-purple-600" /> {copywritingPayload ? copywritingPayload.giftPromos.length : 'Otomatis'} Gift Populer
          </span>
          <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-600" /> {copywritingPayload ? copywritingPayload.bundlingPromos.length : 'Otomatis'} Bundling Populer
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom 1: Konfigurasi & Generator Otomatis */}
        <div className="space-y-5">
          {/* WhatsApp Admin Phone */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
              Nomor WhatsApp Admin (Jalur Pesan)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                placeholder="Contoh: 081234567890" 
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 outline-none"
              />
              <button 
                type="button"
                onClick={handleSaveWa}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-xs shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Simpan
              </button>
            </div>
            {isWaSaved && (
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Nomor WhatsApp Admin tersimpan.
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Pesan WhatsApp dibuka melalui jalur terpisah dan aman tanpa mempengaruhi Kotak Pesan website.
            </p>
          </div>

          {/* Website Link */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Domain Website Kopdes
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Otomatis
              </span>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={websiteUrl}
                onChange={e => {
                  setWebsiteUrl(e.target.value);
                  localStorage.setItem('kopdes_admin_website_url', e.target.value);
                }}
                placeholder="Contoh: https://kopdes.web.app" 
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 outline-none"
              />
              <button 
                type="button"
                onClick={() => {
                  const detected = window.location.origin;
                  setWebsiteUrl(detected);
                  localStorage.setItem('kopdes_admin_website_url', detected);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Generator Otomatis Card */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50/40 to-red-50/40 p-4 sm:p-5 rounded-2xl border border-blue-200/80 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-blue-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                  Generator Cerdas Copywriting Otomatis
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sistem otomatis mengumpulkan <strong>produk terpopuler</strong> (tanpa tautan teks URL, diganti gambar bertuliskan <em>Belanja Sekarang</em>), menghubungkan <strong>voucher belanja</strong>, <strong>voucher ongkir</strong>, membaca <strong>diskon katalog</strong>, dan <strong>promo gift</strong> aktif.
                </p>
              </div>
            </div>

            {/* Checklist items showing real-time connections */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700 bg-white/70 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Analitik Tren Produk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Gambar &quot;Belanja Sekarang&quot;</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activeDiscountVoucherCount} Voucher Belanja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activeShippingVoucherCount} Voucher Ongkir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{discountedProducts.length} Diskon Katalog</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activePromoCount} Promo Hadiah/Gift</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGenerateCopywriting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw className="w-4 h-4" /> 🚀 Buat Copywriting Otomatis Sekarang
            </button>
          </div>
        </div>

        {/* Kolom 2: Copywriting Editor & Multi-mode Preview */}
        <div className="space-y-4 flex flex-col">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-slate-400" /> Content Copywriting
              </label>

              {/* Action buttons & mode toggles */}
              <div className="flex items-center gap-1.5">
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('edit')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      previewMode === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('textPreview')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      previewMode === 'textPreview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Teks WA
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('visualPreview')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      previewMode === 'visualPreview' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🖼️ Gambar &amp; Voucher</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    isCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Salin teks copywriting ke clipboard"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin'}</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Editor */}
            {previewMode === 'edit' && (
              <textarea 
                value={copywriting}
                onChange={e => setCopywriting(e.target.value)}
                placeholder="Ketik isi pesan WhatsApp di sini, atau gunakan Generator Otomatis di samping..."
                className="flex-1 p-4 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono leading-relaxed focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 outline-none resize-none min-h-[220px]"
              />
            )}

            {/* Mode 2: Teks WhatsApp Preview */}
            {previewMode === 'textPreview' && (
              <div className="flex-1 bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 whitespace-pre-wrap text-xs sm:text-sm text-slate-800 font-medium overflow-y-auto min-h-[220px] max-h-[350px]">
                {copywriting || <span className="text-slate-400 italic">Belum ada konten copywriting...</span>}
              </div>
            )}

            {/* Mode 3: Visual Preview (Gambar Belanja Sekarang & Voucher) */}
            {previewMode === 'visualPreview' && (
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 overflow-y-auto min-h-[220px] max-h-[350px] space-y-4">
                {/* Popular Products with Belanja Sekarang image banner */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>🛍️</span>
                      <span>Gambar &quot;Belanja Sekarang&quot; (Produk Terpopuler)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Link Otomatis ke Katalog
                    </span>
                  </div>

                  {copywritingPayload && copywritingPayload.popularProducts.length > 0 ? (
                    <div className="space-y-2.5">
                      {copywritingPayload.popularProducts.map((p) => (
                        <div 
                          key={p.id}
                          className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-red-300 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {p.imageUrl ? (
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200" 
                                />
                              ) : (
                                <span className="text-2xl">{p.emoji || '🛍️'}</span>
                              )}
                              <div>
                                <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-extrabold text-red-600">{p.formattedPrice}</span>
                                  {p.discountText && (
                                    <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.2 rounded-sm">
                                      {p.discountText}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full">
                              {p.trendText}
                            </span>
                          </div>

                          {/* Clickable Belanja Sekarang Image Banner */}
                          <div 
                            onClick={() => navigateToCatalogProduct(p.id)}
                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-red-400/40 shadow-xs hover:shadow-md transition-all hover:scale-[1.01]"
                            title="Klik gambar ini untuk langsung menuju ke produk di katalog!"
                          >
                            <img 
                              src={p.bannerSvgUrl} 
                              alt={`Belanja Sekarang - ${p.name}`} 
                              referrerPolicy="no-referrer"
                              className="w-full h-auto object-contain block"
                            />
                            <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-white/95 text-red-700 text-xs font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5" /> Klik untuk Buka di Katalog ➜
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                      Klik &quot;Buat Copywriting Otomatis&quot; untuk menampilkan banner gambar Belanja Sekarang.
                    </div>
                  )}
                </div>

                {/* Available Vouchers Preview */}
                {copywritingPayload && (copywritingPayload.discountVouchers.length > 0 || copywritingPayload.shippingVouchers.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>🎟️</span>
                      <span>Voucher Belanja &amp; Ongkir Terhubung</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {copywritingPayload.discountVouchers.map((v) => (
                        <div key={v.id} className="bg-white border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-blue-900 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-blue-600" />
                              <span>{v.code}</span>
                            </div>
                            <div className="text-[10px] text-slate-600">{v.discountText}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(v.code)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[10px] rounded-lg transition-colors"
                          >
                            {copiedVoucherCode === v.code ? 'Tersalin!' : 'Salin'}
                          </button>
                        </div>
                      ))}
                      {copywritingPayload.shippingVouchers.map((sv) => (
                        <div key={sv.id} className="bg-white border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-emerald-900 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-emerald-600" />
                              <span>{sv.code}</span>
                            </div>
                            <div className="text-[10px] text-slate-600">{sv.discountText}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(sv.code)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] rounded-lg transition-colors"
                          >
                            {copiedVoucherCode === sv.code ? 'Tersalin!' : 'Salin'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Catalog Discounts Preview */}
                {copywritingPayload && copywritingPayload.catalogDiscounts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>🏷️</span>
                        <span>Diskon Katalog Produk Populer (Terhubung Analitik)</span>
                      </span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                        {copywritingPayload.catalogDiscounts.length} Produk Populer
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {copywritingPayload.catalogDiscounts.map((cd) => (
                        <div key={cd.productId} className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {cd.imageUrl ? (
                              <img src={cd.imageUrl} alt={cd.productName} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <span>{cd.emoji || '🏷️'}</span>
                            )}
                            <div>
                              <div className="font-black text-slate-900">{cd.productName}</div>
                              <div className="text-[10px] text-slate-600 font-medium">
                                {formatRupiah(cd.discountedPrice)} <span className="line-through text-slate-400">{formatRupiah(cd.originalPrice)}</span> • {cd.discountSummary}
                              </div>
                            </div>
                          </div>
                          {cd.popularityTrend && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                              {cd.popularityTrend}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Gift Promos Preview */}
                {copywritingPayload && copywritingPayload.giftPromos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>🎁</span>
                        <span>Promo Gift &amp; Hadiah Gratis (Produk Terpopuler)</span>
                      </span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                        {copywritingPayload.giftPromos.length} Promo Populer
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {copywritingPayload.giftPromos.map((gp) => (
                        <div key={gp.id} className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-purple-950">{gp.title}</div>
                            <div className="text-[10px] text-slate-600">
                              {gp.conditionText} ➜ <span className="font-bold text-purple-700">{gp.rewardText}</span> ({gp.audienceText})
                            </div>
                          </div>
                          {gp.popularityTrend && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                              {gp.popularityTrend}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Bundling Promos Preview */}
                {copywritingPayload && copywritingPayload.bundlingPromos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>📦</span>
                        <span>Paket Bundling Hemat (Produk Terpopuler)</span>
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {copywritingPayload.bundlingPromos.length} Bundling Populer
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {copywritingPayload.bundlingPromos.map((bp) => (
                        <div key={bp.id} className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-indigo-950">{bp.name}</div>
                            <div className="text-[10px] text-slate-600">
                              {bp.ruleText} ➜ <span className="font-bold text-indigo-700">{bp.discountText}</span> ({bp.audienceText})
                            </div>
                          </div>
                          {bp.popularityTrend && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                              {bp.popularityTrend}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={handleSaveCopywriting}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Draft
              </button>
              
              <button 
                type="button"
                onClick={handleTransferToInbox}
                className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs shadow-2xs"
                title="Bawa teks dan kartu gambar Belanja Sekarang langsung ke Kotak Pesan Website"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Kirim ke Kotak Pesan Web</span>
              </button>
            </div>

            {isCopySaved && (
              <div className="text-[11px] font-bold text-emerald-600 text-center animate-fade-in flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Copywriting berhasil disimpan
              </div>
            )}

            {isSentToInbox && (
              <div className="text-[11px] font-bold text-blue-700 bg-blue-50 py-1.5 px-3 rounded-lg text-center animate-fade-in border border-blue-200 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Berhasil disalin ke Form Kotak Pesan Website bersama data gambar Belanja Sekarang!</span>
              </div>
            )}

            <button 
              type="button"
              onClick={handleSendToWhatsApp}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              <Send className="w-4 h-4" /> 📲 BUKA &amp; KIRIM KE WHATSAPP
            </button>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Grid Gambar "Belanja Sekarang" Interaktif & Data Terkoneksi */}
      {copywritingPayload && copywritingPayload.popularProducts.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>🖼️</span>
                <span>Gambar Banner &quot;Belanja Sekarang&quot; (Produk Terpopuler)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuai instruksi: Tautan link URL teks otomatis telah dihapus dan digantikan gambar banner &quot;Belanja Sekarang&quot;. Saat gambar diklik, sistem langsung meluncur ke produk tersebut di katalog website.
              </p>
            </div>
            <span className="text-[11px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full shrink-0">
              💡 Coba klik banner di bawah!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {copywritingPayload.popularProducts.map((p, idx) => (
              <div 
                key={p.id}
                className="bg-gradient-to-b from-white to-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Product Header Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full">
                      Peringkat #{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {p.trendText}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                    ) : (
                      <span className="text-3xl">{p.emoji || '📦'}</span>
                    )}
                    <div>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">{p.name}</h4>
                      <p className="text-xs font-extrabold text-red-600 mt-0.5">{p.formattedPrice}</p>
                    </div>
                  </div>
                </div>

                {/* Banner Graphic Image (Interactive Belanja Sekarang) */}
                <div className="p-3 bg-slate-100/70 border-t border-slate-200/80 space-y-2">
                  <div 
                    onClick={() => navigateToCatalogProduct(p.id)}
                    className="group cursor-pointer rounded-xl overflow-hidden border border-red-500/30 shadow-xs hover:shadow-md transition-all hover:scale-102 relative"
                    title="Klik gambar ini untuk langsung menuju produk di katalog!"
                  >
                    <img 
                      src={p.bannerSvgUrl} 
                      alt={`Belanja Sekarang - ${p.name}`} 
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain block"
                    />
                    <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Langsung ke Produk ➜
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => navigateToCatalogProduct(p.id)}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg flex items-center justify-center gap-1 transition-colors shadow-2xs"
                    >
                      <ShoppingBag className="w-3 h-3" /> Buka di Katalog
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyBannerSvg(p.bannerSvgUrl, p.id)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg transition-colors"
                      title="Salin Data URI Gambar Banner Belanja Sekarang"
                    >
                      {copiedBannerUrl === p.id ? 'Tersalin!' : 'Salin Banner'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
