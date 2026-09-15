import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  MessageSquare, 
  Sparkles, 
  Ticket, 
  MapPin, 
  Sliders,
  ChevronLeft, 
  ChevronRight,
  Gift,
  PartyPopper,
  UserCheck,
  Users,
  X,
  Store,
  ShoppingBag,
  Truck,
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  ClipboardList,
  Receipt
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../context/InboxContext';
import { useOrders } from '../context/OrderContext';
import { usePoints } from '../context/PointContext';
import { useAnalytics } from '../context/AnalyticsContext';
import { db } from '../lib/firebase';
import { Voucher, CartItem, Product, PaymentMethod, OrderItem } from '../types';
import { INITIAL_VOUCHERS, INITIAL_PRODUCTS } from '../data/initialProducts';
import { validateCartStock, deductStockForCheckout, StockValidationError } from '../lib/stockUtils';
import { DeliveryAddressPicker } from './DeliveryAddressPicker';

interface CartViewProps {
  onBackToCatalog: () => void;
  onOpenAuth: () => void;
  onOpenOrderHistory?: () => void;
}

const WA_NUMBER = '6285881688927';

export const CartView: React.FC<CartViewProps> = ({ onBackToCatalog, onOpenAuth, onOpenOrderHistory }) => {
  const { 
    cart, 
    paidItems,
    bonusItems,
    activeAudiencePromotions,
    promoProgressHints,
    earnedPromos,
    bundlingDiscountAmount,
    bestDiscountInfo,
    bestAutomaticDiscountAmount,
    customerStatus,
    updateQty, 
    updateItemVariation,
    removeItem, 
    removeItems,
    clearCart, 
    appliedVoucher, 
    applyVoucher, 
    removeVoucher, 
    subtotal, 
    totalItems, 
    totalPaidItems,
    discountAmount, 
    grandTotal,
    // Fitur Pengiriman Kopdes
    kopdesOrigin,
    deliveryAddress,
    deliveryCoords,
    deliveryNotes,
    actualDistanceKm,
    billedDistanceKm,
    ratePerKm,
    shippingFee,
    rawShippingFee,
    shippingDiscount,
    shippingVouchers,
    appliedShippingVoucher,
    applyShippingVoucher,
    removeShippingVoucher,
    deductAppliedShippingVoucher,
    estimatedDurationMinutes,
  } = useCart();

  const { user } = useAuth();
  const { sendOrderNotification } = useInbox();
  const { createOrder, openOrderDetail, setIsOrderHistoryOpen } = useOrders();
  const { calculateCartPoints } = usePoints();
  const { trackEvent } = useAnalytics();
  const isMember = Boolean(user);

  const [vouchersList, setVouchersList] = useState<Voucher[]>([]);
  const [voucherInput, setVoucherInput] = useState<string>('');
  const [voucherStatus, setVoucherStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Shipping voucher state
  const [shippingVoucherInput, setShippingVoucherInput] = useState<string>('');
  const [shippingVoucherStatus, setShippingVoucherStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Customer form fields
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custNotes, setCustNotes] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Transfer Bank');

  // Stock & Order management state
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [stockErrorModal, setStockErrorModal] = useState<StockValidationError[] | null>(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState<{
    orderId: string;
    totalPaidItems: number;
    bonusCount: number;
    grandTotal: number;
    custName: string;
    remainingItemsCount: number;
    paymentMethod: string;
  } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // 🔘 Checkbox Pemilihan Produk yang Ingin Dipesan
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    return new Set(paidItems.map((it) => it.key));
  });

  // Sinkronisasi otomatis saat daftar produk berubah (misal produk baru masuk atau dihapus)
  useEffect(() => {
    setSelectedKeys((prev) => {
      const validKeys = new Set(paidItems.map((it) => it.key));
      const next = new Set<string>();
      prev.forEach((k) => {
        if (validKeys.has(k)) next.add(k);
      });
      // Jika sebelumnya kosong tetapi keranjang ada item (inisialisasi awal), centang semua
      if (prev.size === 0 && validKeys.size > 0) {
        return validKeys;
      }
      return next;
    });
  }, [paidItems]);

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isAllSelected = paidItems.length > 0 && paidItems.every((it) => selectedKeys.has(it.key));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(paidItems.map((it) => it.key)));
    }
  };

  // Filter produk berbayar yang ditandai untuk dipesan
  const selectedPaidItems = useMemo(() => {
    return paidItems.filter((item) => selectedKeys.has(item.key));
  }, [paidItems, selectedKeys]);

  // Kalkulasi bonus promo gratis (Rp0) yang didapatkan KHUSUS dari produk yang DITANDAI
  const selectedBonusItems = useMemo(() => {
    const bonuses: CartItem[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    (activeAudiencePromotions || []).forEach((promo) => {
      if (!promo.isActive) return;
      if (promo.startDate && todayStr < promo.startDate) return;
      if (promo.endDate && todayStr > promo.endDate) return;

      const matchingItems = selectedPaidItems.filter((item) => {
        const matchId = item.id === promo.buyProductId || 
          item.id.toLowerCase().includes(promo.buyProductId.toLowerCase()) ||
          promo.buyProductId.toLowerCase().includes(item.id.toLowerCase());
        
        const matchName = item.name.toLowerCase().includes(promo.buyProductName.toLowerCase()) ||
          promo.buyProductName.toLowerCase().includes(item.name.toLowerCase());

        if (!matchId && !matchName) return false;

        if (!promo.buyVariation || promo.buyVariation === 'Semua Variasi' || promo.buyVariation === 'Semua') {
          return true;
        }

        const vItem = item.variation.toLowerCase();
        const vPromo = promo.buyVariation.toLowerCase();
        return vItem.includes(vPromo) || vPromo.includes(vItem);
      });

      const totalPurchasedQty = matchingItems.reduce((acc, it) => acc + it.qty, 0);

      // Cek apakah stok bonus habis
      if (promo.bonusStock !== undefined && promo.bonusStock <= 0) {
        return;
      }

      if (totalPurchasedQty >= promo.minQty) {
        const multiplier = promo.isTiered ? Math.floor(totalPurchasedQty / promo.minQty) : 1;
        let totalBonusQty = multiplier * (promo.rewardQty || 1);

        const cap = promo.maxBonusPerTransaction || promo.maxBonus;
        if (cap && cap > 0) {
          totalBonusQty = Math.min(totalBonusQty, cap);
        }

        if (promo.bonusStock !== undefined && promo.bonusStock > 0) {
          totalBonusQty = Math.min(totalBonusQty, promo.bonusStock);
        }

        if (totalBonusQty > 0) {
          bonuses.push({
            key: `bonus_${promo.id}_${promo.rewardVariation || 'std'}`,
            id: promo.rewardProductId || `bonus_${promo.id}`,
            name: promo.rewardProductName,
            emoji: promo.rewardProductEmoji || '🎁',
            variation: promo.rewardVariation || 'Standar',
            availableVariations: [promo.rewardVariation || 'Standar'],
            price: 0,
            originalPrice: 0,
            qty: totalBonusQty,
            isBonus: true,
            bonusPromoId: promo.id,
            bonusPromoName: promo.name,
            bonusBuyProductName: `${promo.buyProductName} (${promo.buyVariation || 'Semua Ukuran'})`,
          });
        }
      }
    });

    return bonuses;
  }, [selectedPaidItems, activeAudiencePromotions]);

  // Kalkulasi Keuangan Produk yang Ditandai
  const selectedSubtotal = useMemo(() => {
    return selectedPaidItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [selectedPaidItems]);

  const selectedTotalPaidItems = useMemo(() => {
    return selectedPaidItems.reduce((sum, item) => sum + item.qty, 0);
  }, [selectedPaidItems]);

  const selectedTotalBonusItems = useMemo(() => {
    return selectedBonusItems.reduce((sum, item) => sum + item.qty, 0);
  }, [selectedBonusItems]);

  const selectedTotalItems = selectedTotalPaidItems + selectedTotalBonusItems;

  const isVoucherEligible = appliedVoucher ? selectedSubtotal >= appliedVoucher.minPurchase : false;

  const selectedDiscountAmount = useMemo(() => {
    let autoDisc = 0;
    if (bestAutomaticDiscountAmount > 0) {
      autoDisc = bestAutomaticDiscountAmount;
    }
    if (!appliedVoucher || !isVoucherEligible) return autoDisc;

    const remainingSubtotal = Math.max(0, selectedSubtotal - autoDisc);
    if (appliedVoucher.discountType === 'percentage') {
      const calculated = (remainingSubtotal * appliedVoucher.discountValue) / 100;
      return autoDisc + Math.round(appliedVoucher.maxDiscount ? Math.min(calculated, appliedVoucher.maxDiscount) : calculated);
    }
    return autoDisc + Math.min(appliedVoucher.discountValue, remainingSubtotal);
  }, [appliedVoucher, isVoucherEligible, selectedSubtotal, bestAutomaticDiscountAmount]);

  const selectedShippingFee = selectedPaidItems.length > 0 ? shippingFee : 0;
  const selectedGrandTotal = selectedPaidItems.length > 0 
    ? Math.max(0, selectedSubtotal - selectedDiscountAmount) + selectedShippingFee 
    : 0;

  const selectedPointsCalculation = useMemo(() => {
    return calculateCartPoints(
      selectedPaidItems,
      selectedSubtotal,
      customerStatus === 'ANGGOTA' ? 'ANGGOTA' : 'PENGUNJUNG'
    );
  }, [calculateCartPoints, selectedPaidItems, selectedSubtotal, customerStatus]);

  // Prefill with user data
  useEffect(() => {
    if (user) {
      if (user.displayName && !custName) setCustName(user.displayName);
      if (user.phone && !custPhone) setCustPhone(user.phone);
      if (user.address && !custAddress) setCustAddress(user.address);
    }
  }, [user]);

  // Generate unique Order ID
  useEffect(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCurrentOrderId(`ORD-${dateStr}-${randomCode}`);
  }, []);

  // Listen to live products from Firestore for accurate stock validation
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsRef,
      (snap) => {
        if (!snap.empty) {
          const list: Product[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
          });
          setLiveProducts(list);
        } else {
          setLiveProducts(INITIAL_PRODUCTS.map((p, idx) => ({ id: `prod_${idx + 1}`, ...p })));
        }
      },
      () => {
        setLiveProducts(INITIAL_PRODUCTS.map((p, idx) => ({ id: `prod_${idx + 1}`, ...p })));
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync active vouchers in real-time from Firestore
  useEffect(() => {
    const vouchersRef = collection(db, 'vouchers');
    const unsubscribe = onSnapshot(
      vouchersRef,
      (snap) => {
        if (!snap.empty) {
          const list: Voucher[] = [];
          snap.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Voucher, 'id'>),
            });
          });
          setVouchersList(list);
        } else {
          const fallback: Voucher[] = INITIAL_VOUCHERS.map((v) => ({
            id: `voucher_${v.code.toLowerCase()}`,
            ...v,
          }));
          setVouchersList(fallback);
        }
      },
      (err) => {
        console.warn('Vouchers real-time listener error:', err);
        const fallback: Voucher[] = INITIAL_VOUCHERS.map((v) => ({
          id: `voucher_${v.code.toLowerCase()}`,
          ...v,
        }));
        setVouchersList(fallback);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApplyVoucher = (codeToApply?: string) => {
    const targetCode = codeToApply || voucherInput;
    if (!targetCode) {
      setVoucherStatus({ success: false, message: 'Masukkan kode voucher terlebih dahulu.' });
      return;
    }

    const result = applyVoucher(targetCode, vouchersList);
    setVoucherStatus(result);
    if (result.success) {
      setVoucherInput('');
    }
  };

  const handleApplyShippingVoucher = (codeToApply?: string) => {
    const targetCode = codeToApply || shippingVoucherInput;
    if (!targetCode) {
      setShippingVoucherStatus({ success: false, message: 'Masukkan kode voucher ongkos kirim terlebih dahulu.' });
      return;
    }

    const result = applyShippingVoucher(targetCode);
    setShippingVoucherStatus(result);
    if (result.success) {
      setShippingVoucherInput('');
    }
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Helper untuk mendapatkan daftar variasi produk yang lengkap
  const getProductVariations = (item: CartItem): string[] => {
    if (item.availableVariations && item.availableVariations.length > 0) {
      return item.availableVariations;
    }
    const matched = INITIAL_PRODUCTS.find((p) => 
      p.name.toLowerCase() === item.name.toLowerCase()
    );
    if (matched && matched.variations && matched.variations.length > 0) {
      return matched.variations;
    }
    return [item.variation, 'Ukuran Standar', 'Kemasan Besar'];
  };

  // Navigasi ganti variasi/ukuran ke variasi berikutnya atau sebelumnya
  const handleCycleVariation = (item: CartItem, direction: 'next' | 'prev') => {
    const vars = getProductVariations(item);
    const currentIndex = vars.indexOf(item.variation);
    let nextIndex = 0;
    if (direction === 'next') {
      nextIndex = currentIndex >= 0 && currentIndex < vars.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : vars.length - 1;
    }
    updateItemVariation(item.key, vars[nextIndex]);
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0 || isProcessingCheckout) return;

    if (selectedPaidItems.length === 0) {
      alert('Silakan centang kotak pada minimal satu produk yang ingin Anda pesan.');
      return;
    }

    if (!custName.trim()) {
      alert('Silakan masukkan nama pemesan / penerima sembako.');
      return;
    }

    if (!custPhone.trim()) {
      alert('Silakan masukkan nomor WhatsApp / HP aktif untuk keperluan konfirmasi pesanan.');
      return;
    }

    const finalAddress = (deliveryAddress || custAddress || '').trim();
    if (!finalAddress || finalAddress.length < 5) {
      alert('Silakan pilih atau masukkan alamat tujuan pengantaran sembako.');
      return;
    }

    setIsProcessingCheckout(true);

    try {
      // 1. Validasi Stok Sebelum Checkout HANYA untuk produk yang ditandai
      const validation = validateCartStock(selectedPaidItems, liveProducts);
      if (!validation.isValid) {
        setStockErrorModal(validation.errors);
        setIsProcessingCheckout(false);
        return;
      }

      // 2. Susun data item pesanan lengkap termasuk bonus promo gratis (Rp0)
      const orderItems: OrderItem[] = [
        ...selectedPaidItems.map((it) => ({
          productId: it.id,
          productName: it.name,
          emoji: it.emoji,
          imageUrl: it.imageUrl,
          variation: it.variation,
          quantity: it.qty,
          price: it.price,
          originalPrice: it.originalPrice,
          subtotal: it.price * it.qty,
          isBonus: false,
        })),
        ...selectedBonusItems.map((bonus) => ({
          productId: bonus.id,
          productName: bonus.name,
          emoji: bonus.emoji,
          imageUrl: bonus.imageUrl,
          variation: bonus.variation,
          quantity: bonus.qty,
          price: 0,
          originalPrice: 0,
          subtotal: 0,
          isBonus: true,
          bonusPromoName: bonus.bonusPromoName,
        })),
      ];

      // 3. Simpan Pesanan Secara Otomatis ke Database Melalui OrderContext
      const createdOrder = await createOrder({
        customerName: custName.trim() || (user?.displayName || 'Pelanggan'),
        customerPhone: custPhone.trim(),
        customerRole: customerStatus === 'ANGGOTA' ? 'ANGGOTA' : 'PENGUNJUNG',
        items: orderItems,
        subtotal: selectedSubtotal,
        discountAmount: (appliedVoucher && isVoucherEligible) ? selectedDiscountAmount : 0,
        appliedVoucher: (appliedVoucher && isVoucherEligible) ? appliedVoucher : null,
        voucherDiscountAmount: (appliedVoucher && isVoucherEligible) ? selectedDiscountAmount : 0,
        shippingOrigin: kopdesOrigin.name,
        shippingDestination: finalAddress,
        deliveryDistanceKm: actualDistanceKm,
        billedDistanceKm: billedDistanceKm,
        shippingRatePerKm: ratePerKm || 5000,
        rawShippingFee: rawShippingFee,
        appliedShippingVoucherCode: appliedShippingVoucher?.code,
        shippingVoucherDiscount: shippingDiscount,
        shippingFee: selectedShippingFee,
        grandTotal: selectedGrandTotal,
        shippingAddress: finalAddress,
        landmarkNotes: deliveryNotes.trim() || undefined,
        customerNotes: custNotes.trim() || undefined,
        paymentMethod: selectedPaymentMethod,
        estimatedPoints: selectedPointsCalculation.points,
      });

      const keysToRemove = selectedPaidItems.map((it) => it.key);
      const remainingCount = paidItems.length - keysToRemove.length;

      // 4. Bersihkan HANYA produk yang ditandai dan dibeli dari keranjang
      if (keysToRemove.length >= paidItems.length) {
        clearCart();
      } else {
        removeItems(keysToRemove);
      }

      if (appliedVoucher && isVoucherEligible) {
        removeVoucher();
        setVoucherInput('');
        setVoucherStatus(null);
      }

      if (appliedShippingVoucher) {
        await deductAppliedShippingVoucher();
        removeShippingVoucher();
        setShippingVoucherInput('');
        setShippingVoucherStatus(null);
      }
      setCustNotes('');

      // Unselect keys that were removed
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        keysToRemove.forEach((k) => next.delete(k));
        return next;
      });

      // 5. Tampilkan Notifikasi Konfirmasi Sukses Pemesanan Langsung di Website
      trackEvent('buat_pesanan', {
        orderId: createdOrder.orderNumber,
        grandTotal: selectedGrandTotal,
        totalItems: selectedTotalPaidItems,
        customerRole: customerStatus,
      });

      setOrderSuccessModal({
        orderId: createdOrder.orderNumber,
        totalPaidItems: selectedTotalPaidItems,
        bonusCount: selectedTotalBonusItems,
        grandTotal: selectedGrandTotal,
        custName: custName.trim() || (user?.displayName || 'Pelanggan'),
        remainingItemsCount: remainingCount,
        paymentMethod: selectedPaymentMethod,
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Terjadi kendala saat memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* 🏬 Top Navigation Bar: Tombol Jelas 'Kembali ke Katalog' untuk Anggota & Pengunjung */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border-2 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToCatalog}
          id="btn-back-to-catalog-top"
          type="button"
          className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-700 text-white font-black text-sm shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95 border border-slate-800 hover:border-red-600"
          title="Kembali ke Katalog Produk Sembako"
        >
          <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-4 h-4 text-white" />
          </div>
          <Store className="w-4 h-4 text-amber-400" />
          <span className="tracking-wide">Kembali ke Katalog</span>
        </button>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Kosongkan semua item dalam keranjang belanja?')) {
                  clearCart();
                }
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Kosongkan Keranjang
            </button>
          )}
        </div>
      </div>

      {/* Cart Title & Overview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>🛍️ Keranjang Belanja</span>
            {cart.length > 0 && (
              <span className="text-xs font-extrabold bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
                {totalItems} item ({paidItems.length} beli{bonusItems.length > 0 ? ` + ${bonusItems.length} bonus` : ''})
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Periksa kembali pesanan sembako Anda sebelum checkout Buat Pesanan
          </p>
        </div>
      </div>

      {/* 🎁 PROMO CELEBRATION BANNER (EARNED BONUS) */}
      {earnedPromos.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md space-y-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-amber-300 animate-bounce" />
            <h3 className="text-sm font-black tracking-wide">
              🎉 Selamat! Anda Mendapatkan Promo Produk GRATIS
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {earnedPromos.map((ep, idx) => (
              <div key={idx} className="bg-white/15 backdrop-blur-xs p-2.5 rounded-xl flex items-center gap-2 border border-white/20">
                <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <span className="font-extrabold block truncate">
                    {ep.rewardQty}x {ep.rewardProductName} ({ep.rewardVariation}) GRATIS
                  </span>
                  <span className="text-[10px] text-emerald-100 block truncate">
                    Promo: {ep.promoName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎁 PROMO PROGRESS HINT (HAMPIR DAPAT BONUS) */}
      {promoProgressHints.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-900 font-black">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Kesempatan Mendapatkan Bonus Tambahan:</span>
          </div>
          <div className="space-y-1.5">
            {promoProgressHints.map((hint, hIdx) => (
              <div key={hIdx} className="bg-white p-2 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">
                    🎁 {hint.promoName}
                  </span>
                  <span className="text-[11px] text-amber-800 font-semibold block">
                    Tambah <strong className="text-red-600 font-black">{hint.neededQty} item</strong> {hint.buyProductName} ({hint.buyVariation || 'Ukuran ini'}) lagi untuk mendapatkan {hint.rewardQty}x {hint.rewardProductName} ({hint.rewardVariation}) GRATIS!
                  </span>
                </div>
                <button
                  onClick={onBackToCatalog}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl shrink-0 transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Buka Katalog</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cart.length === 0 ? (
        /* Empty Cart View */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center text-2xl font-black">
            🛒
          </div>
          <h3 className="text-lg font-black text-slate-900">Keranjang Belanja Masih Kosong</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Anda belum memilih sembako. Buka katalog untuk memilih beras, minyak goreng, telur, air mineral, dan promo berhadiah gratis lainnya.
          </p>
          <button
            onClick={onBackToCatalog}
            id="btn-back-to-catalog-empty"
            type="button"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-red-700 text-white text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 group border border-slate-800"
          >
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
            <Store className="w-4 h-4 text-amber-400" />
            <span className="tracking-wide">Kembali ke Katalog Produk Sembako</span>
          </button>
        </div>
      ) : (
        /* Active Cart Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Items List & Delivery Form */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* List of Cart Items */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs divide-y divide-slate-100">
              
              {/* Header Title & Info */}
              <div className="pb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Daftar Belanja ({paidItems.length} Produk Beli{selectedBonusItems.length > 0 ? ` + ${selectedBonusItems.length} Bonus Hadiah` : ''})
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Tandai kotak produk yang ingin Anda buat pesanan
                </span>
              </div>

              {/* 🔲 TOOLBAR PILIH SEMUA / TANDAI PRODUK */}
              <div className="py-3 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/80 -mx-4 sm:-mx-5 px-4 sm:px-5 border-y border-slate-200/80">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    id="checkbox-select-all"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-2 border-slate-300 group-hover:border-emerald-600 cursor-pointer accent-emerald-600 transition-colors shadow-2xs"
                  />
                  <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Pilih Semua ({selectedPaidItems.length}/{paidItems.length} Produk Ditandai)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {selectedPaidItems.length > 0 ? (
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{selectedPaidItems.length} produk siap dipesan</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Tandai produk untuk di-checkout</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 1. REGULAR PAID CART ITEMS WITH CHECKBOXES */}
              {paidItems.map((item) => {
                const isSelected = selectedKeys.has(item.key);
                const itemTotal = item.price * item.qty;
                const variations = getProductVariations(item);
                const hasDiscountApplied = item.originalPrice && item.originalPrice > item.price;

                return (
                  <div 
                    key={item.key} 
                    className={`py-3.5 my-2 px-3 sm:px-4 rounded-2xl border transition-all space-y-3 ${
                      isSelected 
                        ? 'bg-white border-emerald-300 shadow-xs' 
                        : 'bg-slate-50/70 border-dashed border-slate-200 opacity-60'
                    }`}
                  >
                    
                    {/* Row 1: Checkbox, Emoji, Info, Qty, & Price */}
                    <div className="flex items-center gap-3">
                      
                      {/* Checkbox Tandai Produk */}
                      <div className="shrink-0 flex items-center">
                        <label 
                          htmlFor={`checkbox-item-${item.key}`} 
                          className="cursor-pointer p-1 -m-1 rounded-md hover:bg-slate-100 transition-colors flex items-center"
                          title={isSelected ? "Hilangkan tanda centang (tidak dipesan)" : "Tandai produk ini untuk dipesan"}
                        >
                          <input
                            type="checkbox"
                            id={`checkbox-item-${item.key}`}
                            checked={isSelected}
                            onChange={() => handleToggleItem(item.key)}
                            className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md text-emerald-600 focus:ring-emerald-500 border-2 border-slate-300 hover:border-emerald-600 cursor-pointer accent-emerald-600 transition-all shadow-2xs"
                          />
                        </label>
                      </div>

                      {/* Emoji / Thumbnail */}
                      <div 
                        onClick={() => handleToggleItem(item.key)}
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl shrink-0 select-none cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-50 border-slate-200 hover:bg-emerald-50' : 'bg-slate-100 border-slate-200'
                        }`}
                        title="Klik untuk tandai / batalkan produk"
                      >
                        {item.emoji || '📦'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 
                            onClick={() => handleToggleItem(item.key)}
                            className={`text-sm font-extrabold truncate cursor-pointer transition-colors ${
                              isSelected ? 'text-slate-900 hover:text-emerald-700' : 'text-slate-500 line-through decoration-slate-400'
                            }`}
                            title="Klik untuk tandai / batalkan produk"
                          >
                            {item.name}
                          </h4>

                          {isSelected ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                              ✓ Dipesan
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded-md">
                              Disimpan
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="inline-block text-[11px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            {item.variation}
                          </span>

                          {/* Harga & Diskon Display */}
                          {hasDiscountApplied ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400 line-through">
                                {formatRupiah(item.originalPrice!)}
                              </span>
                              <span className={`font-black ${isMember ? 'text-emerald-700' : 'text-red-700'}`}>
                                {formatRupiah(item.price)}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isMember 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {isMember 
                                  ? (item.memberDiscountBadge || 'Diskon Anggota') 
                                  : (item.visitorDiscountBadge || 'Diskon Pengunjung')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">
                              @ {formatRupiah(item.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50">
                        <button
                          onClick={() => updateQty(item.key, -1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Kurangi jumlah"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-slate-900">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.key, 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Tambah jumlah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-black ${isSelected ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {formatRupiah(itemTotal)}
                        </div>
                        <button
                          onClick={() => removeItem(item.key)}
                          className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Navigasi Variasi & Ukuran Produk di Keranjang */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-red-600" />
                          <span>Navigasi Ukuran & Variasi:</span>
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCycleVariation(item, 'prev')}
                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-red-700 hover:border-red-300 transition-colors flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
                            title="Ganti ke variasi sebelumnya"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Sebelumnya</span>
                          </button>
                          <button
                            onClick={() => handleCycleVariation(item, 'next')}
                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-red-700 hover:border-red-300 transition-colors flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
                            title="Ganti ke variasi berikutnya"
                          >
                            <span>Berikutnya</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Chip Pilihan Variasi/Ukuran */}
                      <div className="flex flex-wrap gap-1.5">
                        {variations.map((v) => {
                          const isActive = v === item.variation;
                          return (
                            <button
                              key={v}
                              onClick={() => updateItemVariation(item.key, v)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? 'bg-red-600 text-white shadow-xs font-black ring-2 ring-red-300'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:text-red-700'
                              }`}
                            >
                              {isActive && <Check className="w-3 h-3 shrink-0" />}
                              <span>{v}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })}

              {/* 2. 🎁 AUTOMATIC PROMO BONUS ITEMS DISPLAY FOR MARKED ITEMS (PRICE Rp0) */}
              {selectedBonusItems.map((bonus) => {
                return (
                  <div 
                    key={bonus.key} 
                    className="py-3.5 my-2 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-amber-50/50 border-2 border-emerald-300 shadow-xs space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                        {bonus.emoji || '🎁'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                            <Gift className="w-3 h-3" /> BONUS PROMO DARI PRODUK DITANDAI
                          </span>
                          <span className="text-[11px] font-extrabold text-emerald-800 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {bonus.variation}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 truncate mt-1">
                          {bonus.name}
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          {bonus.bonusPromoName ? `Program: ${bonus.bonusPromoName}` : 'Hadiah gratis dari pembelian produk sembako yang ditandai'}
                        </p>
                      </div>

                      {/* Bonus Qty Pill */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-emerald-700">
                          GRATIS (Rp 0)
                        </div>
                        <span className="inline-block text-xs font-black bg-emerald-100 border border-emerald-300 text-emerald-900 px-2.5 py-0.5 rounded-full mt-0.5">
                          {bonus.qty} pcs
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-800/90 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200/60 flex items-center justify-between">
                      <span>✨ Otomatis ikut dibuat pesanan saat pemesanan</span>
                      <span className="font-semibold text-slate-500">Tidak menambah total bayar</span>
                    </div>
                  </div>
                );
              })}

              {/* Catatan jika ada produk tidak ditandai yang memiliki potensi bonus */}
              {bonusItems.length > selectedBonusItems.length && (
                <div className="py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Ada bonus promo gratis lainnya yang belum aktif karena produk terkait belum Anda tandai di atas.
                  </span>
                </div>
              )}

            </div>

            {/* INFORMASI PEMESAN & ALAMAT PENGANTARAN */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Informasi Pemesan & Alamat Pengantaran
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lengkapi alamat tujuan pengantaran sembako
                  </p>
                </div>
              </div>

              {/* 🚚 Pemilihan Alamat Pengantaran & Titik GPS Berbasis Peta */}
              <DeliveryAddressPicker onOpenAuth={onOpenAuth} />

              {/* Data Kontak Pemesan Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    👤 Nama Pemesan / Penerima
                  </label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Contoh: Ibu Rina / Bpk. Budi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    📱 Nomor WhatsApp / HP Aktif
                  </label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="Contoh: 0812-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tambahan untuk Pengantar (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  placeholder="Contoh: Tolong titipkan di pos satpam atau hubungi jika sudah sampai."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* 💳 METODE PEMBAYARAN DI CHECKOUT */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Pilih Metode Pembayaran
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Status awal pesanan: Menunggu Pembayaran
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  Langsung Website
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Transfer Bank */}
                <div
                  onClick={() => setSelectedPaymentMethod('Transfer Bank')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    selectedPaymentMethod === 'Transfer Bank'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedPaymentMethod === 'Transfer Bank' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Transfer Bank</span>
                      {selectedPaymentMethod === 'Transfer Bank' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      BCA, Mandiri, BRI, BNI (Rekening Resmi Koperasi)
                    </p>
                  </div>
                </div>

                {/* 2. QRIS */}
                <div
                  onClick={() => setSelectedPaymentMethod('QRIS')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    selectedPaymentMethod === 'QRIS'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedPaymentMethod === 'QRIS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">QRIS Instan</span>
                      {selectedPaymentMethod === 'QRIS' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      GoPay, OVO, Dana, ShopeePay, BCA Mobile
                    </p>
                  </div>
                </div>

                {/* 3. COD (Bayar di Tempat) */}
                <div
                  onClick={() => setSelectedPaymentMethod('COD (Bayar di Tempat)')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    selectedPaymentMethod === 'COD (Bayar di Tempat)'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedPaymentMethod === 'COD (Bayar di Tempat)' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">COD (Bayar di Tempat)</span>
                      {selectedPaymentMethod === 'COD (Bayar di Tempat)' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Bayar uang tunai ke kurir saat sembako tiba di rumah
                    </p>
                  </div>
                </div>

                {/* 4. Saldo Simpanan Koperasi */}
                <div
                  onClick={() => {
                    if (customerStatus === 'ANGGOTA') {
                      setSelectedPaymentMethod('Saldo Simpanan Koperasi');
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    selectedPaymentMethod === 'Saldo Simpanan Koperasi'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : customerStatus === 'ANGGOTA'
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50 opacity-80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedPaymentMethod === 'Saldo Simpanan Koperasi' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">Saldo Simpanan</span>
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                          Anggota
                        </span>
                      </div>
                      {selectedPaymentMethod === 'Saldo Simpanan Koperasi' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      {customerStatus === 'ANGGOTA'
                        ? 'Potong langsung dari Saldo Simpanan Sukarela Anda'
                        : 'Khusus Anggota Resmi (Klik untuk Masuk Akun)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right: Voucher Input & Summary Box */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* VOUCHER INPUT SECTION */}
            <div className="bg-gradient-to-br from-amber-500/10 via-red-500/5 to-white rounded-2xl border border-amber-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Input Voucher Diskon Belanja
                </h3>
              </div>
              <p className="text-[11px] text-slate-600">
                Punya kode potongan harga dari Koperasi? Masukkan kodenya di bawah untuk mengklaim diskon belanja.
              </p>

              {/* Input & Apply Button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode (e.g. MERAHPUTIH10)"
                  className="flex-1 px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
                />
                <button
                  onClick={() => handleApplyVoucher()}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Klaim
                </button>
              </div>

              {/* Voucher status alert */}
              {voucherStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    voucherStatus.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {voucherStatus.success ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <span>{voucherStatus.message}</span>
                </div>
              )}

              {/* Active Applied Voucher Badge */}
              {appliedVoucher && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isVoucherEligible 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800 tracking-wider">
                        🎟️ {appliedVoucher.code}
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        isVoucherEligible
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {isVoucherEligible
                          ? (appliedVoucher.discountType === 'percentage'
                              ? `Diskon ${appliedVoucher.discountValue}%`
                              : `Hemat ${formatRupiah(appliedVoucher.discountValue)}`)
                          : `Butuh Min. Belanja ${formatRupiah(appliedVoucher.minPurchase)}`}
                      </span>
                    </div>
                    {isVoucherEligible ? (
                      <p className="text-[11px] text-emerald-700">
                        Potongan diskon produk ditandai: <strong className="font-black">{formatRupiah(selectedDiscountAmount)}</strong>
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-700">
                        Subtotal produk ditandai ({formatRupiah(selectedSubtotal)}) belum mencapai min. belanja voucher.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={removeVoucher}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer ml-2"
                  >
                    Hapus
                  </button>
                </div>
              )}

              {/* Available Active Vouchers Quick List */}
              <div className="pt-2 border-t border-amber-200/60">
                <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Voucher Koperasi Tersedia:</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {vouchersList
                    .filter((v) => {
                      if (!v.isActive) return false;
                      const userKey = user?.uid || user?.accountId || user?.phone || 'visitor';
                      const userUsed = (v.userUsage && v.userUsage[userKey]) || 0;
                      const limit = v.usageLimit || 1;
                      return userUsed < limit;
                    })
                    .map((v) => {
                      const userKey = user?.uid || user?.accountId || user?.phone || 'visitor';
                      const userUsed = (v.userUsage && v.userUsage[userKey]) || 0;
                      const limit = v.usageLimit || 1;

                      return (
                        <div
                          key={v.id || v.code}
                          className="p-2 bg-white/90 rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 block truncate">
                                {v.code}
                              </span>
                              {limit > 1 && (
                                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                                  {userUsed}/{limit}x dipakai
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {v.description || (v.discountType === 'percentage' ? `Diskon ${v.discountValue}%` : `Diskon ${formatRupiah(v.discountValue)}`)}
                              {' • Min. ' + formatRupiah(v.minPurchase)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleApplyVoucher(v.code)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] rounded-md shrink-0 transition-colors cursor-pointer"
                          >
                            Gunakan
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* 🚚 VOUCHER ONGKOS KIRIM SECTION */}
            <div className="bg-gradient-to-br from-red-500/10 via-rose-500/5 to-white rounded-2xl border border-red-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Voucher Ongkos Kirim
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Target: {customerStatus === 'ANGGOTA' ? 'Khusus Anggota' : 'Pengunjung Umum'}
                    </p>
                  </div>
                </div>
                {appliedShippingVoucher && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    Terpasang
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600">
                Gunakan kode voucher potongan ongkir untuk pengiriman sembako ke lokasi Anda.
              </p>

              {/* Input & Apply Button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shippingVoucherInput}
                  onChange={(e) => setShippingVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Kode Ongkir (e.g. ONGKIRKOPDES)"
                  className="flex-1 px-3 py-2.5 bg-white border border-red-300 rounded-xl text-xs font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => handleApplyShippingVoucher()}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Klaim
                </button>
              </div>

              {/* Shipping Voucher status alert */}
              {shippingVoucherStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    shippingVoucherStatus.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {shippingVoucherStatus.success ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <span>{shippingVoucherStatus.message}</span>
                </div>
              )}

              {/* Active Applied Shipping Voucher Badge */}
              {appliedShippingVoucher && (
                <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-900 tracking-wider">
                        🛵 {appliedShippingVoucher.code}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        {appliedShippingVoucher.discountType === 'FREE'
                          ? 'Gratis Ongkir Sepenuhnya'
                          : `Hemat Rp ${appliedShippingVoucher.discountValue.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      {appliedShippingVoucher.description}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      Hemat: <strong className="font-black text-emerald-900">Rp {shippingDiscount.toLocaleString('id-ID')}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeShippingVoucher}
                    className="text-xs font-black text-red-600 hover:text-red-700 underline cursor-pointer ml-2"
                  >
                    Hapus
                  </button>
                </div>
              )}

              {/* Available Active Shipping Vouchers Quick List */}
              <div className="pt-2 border-t border-red-200/60">
                <div className="text-[10px] font-extrabold text-red-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-red-600" />
                  <span>Voucher Ongkir Tersedia:</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {shippingVouchers
                    .filter((v) => v.isActive && (v.targetAudience === 'ALL' || v.targetAudience === customerStatus))
                    .map((v) => (
                      <div
                        key={v.id}
                        className="p-2 bg-white/90 rounded-lg border border-red-200 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 truncate">
                              {v.code}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded">
                              {v.discountType === 'FREE' ? 'Gratis Ongkir' : `Potongan Rp ${v.discountValue.toLocaleString('id-ID')}`}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {v.description}
                            {v.minOrderAmount > 0 ? ` • Min. belanja Rp ${v.minOrderAmount.toLocaleString('id-ID')}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyShippingVoucher(v.code)}
                          className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-bold text-[10px] rounded-md shrink-0 transition-colors cursor-pointer"
                        >
                          Gunakan
                        </button>
                      </div>
                    ))}
                  {shippingVouchers.filter((v) => v.isActive && (v.targetAudience === 'ALL' || v.targetAudience === customerStatus)).length === 0 && (
                    <div className="text-center py-2 text-[11px] text-slate-400">
                      Tidak ada voucher ongkir aktif untuk saat ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Calculation Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
              <h3 className="text-sm font-black text-slate-900 flex items-center justify-between">
                <span>Ringkasan Pesanan</span>
                <span className="text-[11px] font-medium text-slate-400">Gerai Cengkareng Timur</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Produk Ditandai (Dipesan):</span>
                  <span className="font-black text-slate-900">
                    {selectedTotalPaidItems} item ({selectedPaidItems.length} jenis sembako)
                  </span>
                </div>

                {/* Status jika ada produk yang tidak ditandai */}
                {paidItems.length > selectedPaidItems.length && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span>Tetap disimpan di keranjang:</span>
                    <span className="font-bold text-slate-800">
                      {paidItems.length - selectedPaidItems.length} jenis barang
                    </span>
                  </div>
                )}

                {selectedTotalBonusItems > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Bonus Promo Ditandai:</span>
                    <span>+{selectedTotalBonusItems} item (Rp 0)</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>🛍️ Subtotal Produk Ditandai:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(selectedSubtotal)}</span>
                </div>

                {bestAutomaticDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-800 font-bold bg-amber-50/90 p-2 rounded-xl border border-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{bestDiscountInfo.label || '🛍️ Diskon Bundling Otomatis'}:</span>
                    </span>
                    <span>- {formatRupiah(bestAutomaticDiscountAmount)}</span>
                  </div>
                )}

                {appliedVoucher && isVoucherEligible && (selectedDiscountAmount - bestAutomaticDiscountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>🎟️ Diskon Voucher Belanja ({appliedVoucher.code}):</span>
                    <span>- {formatRupiah(selectedDiscountAmount - bestAutomaticDiscountAmount)}</span>
                  </div>
                )}

                {/* 🚚 Rincian Pengiriman & Ongkos Kirim Otomatis Berbasis Peta */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-red-600" />
                      <span>Rincian Pengiriman & Ongkir</span>
                    </span>
                    <span className="text-[10px] text-red-600 font-extrabold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      Rp {(ratePerKm || 5000).toLocaleString('id-ID')} / km
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-1.5">
                    <div className="truncate">
                      📍 <span className="font-semibold text-slate-800">Titik Asal Kopdes:</span> {kopdesOrigin.address}
                    </div>
                    <div className="truncate">
                      🏠 <span className="font-semibold text-slate-800">Alamat Tujuan:</span> {deliveryAddress}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">📏 Jarak Rute Jalan:</span>
                      <span className="font-black text-slate-900">{actualDistanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">🚚 Jarak Ditagihkan:</span>
                      <span className="font-black text-red-700">{billedDistanceKm} km (dibulatkan)</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Ongkos Kirim Standar:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(rawShippingFee)}</span>
                    </div>

                    {appliedShippingVoucher && shippingDiscount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-bold">
                        <span>Diskon Voucher ({appliedShippingVoucher.code}):</span>
                        <span>- {formatRupiah(shippingDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs font-black pt-1 border-t border-slate-200/60">
                      <span className="text-red-700">💰 Ongkos Kirim Dikenakan:</span>
                      <span className="text-red-700 font-black">
                        {formatRupiah(selectedShippingFee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-slate-900 block">💵 Total Pembayaran:</span>
                    <span className="text-[10px] text-slate-500">
                      {selectedTotalPaidItems > 0 
                        ? `Subtotal + Ongkir${(selectedDiscountAmount > 0 || shippingDiscount > 0) ? ' - Diskon' : ''}` 
                        : 'Belum ada produk ditandai'}
                    </span>
                  </div>
                  <span className="text-xl font-black text-emerald-700">
                    {formatRupiah(selectedGrandTotal)}
                  </span>
                </div>

                {/* ⭐ Estimasi Perolehan Point Pembelian */}
                {selectedPointsCalculation.points > 0 && (
                  <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-amber-900 font-black">
                      <span className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-black">⭐</span>
                        <span>Estimasi Point Diperoleh:</span>
                      </span>
                      <span className="text-amber-800 text-xs font-black bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        +{selectedPointsCalculation.points} Point
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-800 leading-snug">
                      Point akan otomatis masuk ke akun Anda setelah pesanan selesai ({selectedPointsCalculation.programName}).
                    </p>
                  </div>
                )}
              </div>

              {/* 🛍️ SISTEM BUAT PESANAN LANGSUNG MELALUI WEBSITE  */}
              {!user && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">👤 Pesan sebagai Pengunjung</span>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="text-[11px] font-black text-red-600 hover:underline cursor-pointer"
                    >
                      Masuk Akun Anggota →
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Masuk ke akun Anggota untuk menikmati harga subsidi khusus & potong simpanan koperasi.
                  </p>
                </div>
              )}

              {selectedPaidItems.length > 0 ? (
                <button
                  id="btn-buat-pesanan"
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={isProcessingCheckout}
                  className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/50"
                >
                  <ShoppingBag className="w-5 h-5 text-amber-300" />
                  <span>
                    {isProcessingCheckout 
                      ? 'Sedang Membuat Transaksi Pesanan...' 
                      : `🛍️ BUAT PESANAN (${formatRupiah(selectedGrandTotal)})`}
                  </span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-200 text-slate-400 font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                    <span>Tandai Produk yang Mau Dipesan</span>
                  </button>
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center font-bold">
                    ⚠️ Silakan centang kotak pada produk di samping yang ingin Anda masukkan ke pesanan ini.
                  </p>
                </div>
              )}

              {/* 🏬 Tombol Jelas 'Kembali ke Katalog' untuk Tambah Belanjaan */}
              <button
                id="btn-back-to-catalog-summary"
                type="button"
                onClick={onBackToCatalog}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 border border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98 group"
              >
                <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
                  <ArrowLeft className="w-3.5 h-3.5 text-white" />
                </div>
                <Store className="w-4 h-4 text-amber-400" />
                <span>+ Tambah Belanjaan Lain (Kembali ke Katalog)</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                Hanya produk bertanda centang, bonus gratis terkait, dan catatan yang akan disertakan dalam Buat Pesanan.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ⚠️ MODAL PERINGATAN STOK TIDAK MENCUKUPI */}
      {stockErrorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-red-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-2xl font-black shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Stok Tidak Mencukupi</h3>
                <p className="text-xs text-slate-500">
                  Beberapa item di keranjang melebihi jumlah stok yang tersedia saat ini.
                </p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-3.5 space-y-2.5 max-h-60 overflow-y-auto">
              {stockErrorModal.map((err, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-1 text-xs">
                  <div className="font-black text-slate-900">{err.productName} ({err.variation})</div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-red-700">Jumlah Dipilih: {err.requestedQty} item</span>
                    <span className="text-emerald-700">Stok Tersedia: {err.availableStock} item</span>
                  </div>
                  {err.availableStock === 0 ? (
                    <div className="text-[10px] text-red-600 font-extrabold italic">🔴 Stok Habis! Harap hapus atau pilih variasi lain.</div>
                  ) : (
                    <div className="text-[10px] text-amber-800 font-medium">⚠️ Silakan kurangi jumlah ke maksimal {err.availableStock} item.</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStockErrorModal(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Paham, Saya Akan Sesuaikan Jumlah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 MODAL SUKSES PEMESANAN & KERANJANG DIKOSONGKAN OTOMATIS */}
      {orderSuccessModal && (
        <div 
          onClick={() => setOrderSuccessModal(null)}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-emerald-200 animate-scaleUp space-y-5 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center font-black shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                Pesanan Berhasil Dibuat
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Transaksi Berhasil Dicatat!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {orderSuccessModal.remainingItemsCount > 0 ? (
                  <>
                    Pesanan Anda telah otomatis masuk ke <strong>Riwayat Pesanan</strong> dan notifikasi dikirimkan ke <strong>Kotak Pesan</strong>. Sebanyak <strong>{orderSuccessModal.totalPaidItems} produk</strong> telah dipesan. Sisa <strong>{orderSuccessModal.remainingItemsCount} produk lainnya</strong> tetap tersimpan aman di keranjang Anda.
                  </>
                ) : (
                  <>
                    Pesanan Anda telah otomatis masuk ke <strong>Riwayat Pesanan</strong> dan notifikasi dikirimkan ke <strong>Kotak Pesan</strong>. Seluruh produk yang dipesan telah dibersihkan dari keranjang.
                  </>
                )}
              </p>
            </div>

            {/* Kotak Rincian Ringkasan Pesanan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Nomor Pesanan:</span>
                <span className="font-mono font-black text-slate-900">{orderSuccessModal.orderId}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Nama Pemesan:</span>
                <span className="font-bold text-slate-900">{orderSuccessModal.custName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Metode Pembayaran:</span>
                <span className="font-bold text-emerald-700">{orderSuccessModal.paymentMethod || 'Transfer Bank'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Barang:</span>
                <span className="font-bold text-slate-900">
                  {orderSuccessModal.totalPaidItems} dibeli {orderSuccessModal.bonusCount > 0 ? `+ ${orderSuccessModal.bonusCount} hadiah promo` : ''}
                </span>
              </div>
              {orderSuccessModal.remainingItemsCount > 0 && (
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Sisa di Keranjang:</span>
                  <span className="font-bold text-slate-700">{orderSuccessModal.remainingItemsCount} barang disimpan</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-800">Total Tagihan:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatRupiah(orderSuccessModal.grandTotal)}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              {onOpenOrderHistory && (
                <button
                  type="button"
                  id="btn-view-order-history"
                  onClick={() => {
                    setOrderSuccessModal(null);
                    onOpenOrderHistory();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Lihat di Riwayat Pesanan</span>
                </button>
              )}

              <button
                type="button"
                id="btn-order-success-back-catalog"
                onClick={() => {
                  setOrderSuccessModal(null);
                  onBackToCatalog();
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Store className="w-4 h-4 text-amber-400" />
                <span>Belanja Sembako Lagi (Ke Katalog)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderSuccessModal(null)}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
