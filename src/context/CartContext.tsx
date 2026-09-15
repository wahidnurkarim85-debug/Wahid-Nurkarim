import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CartItem, 
  Product, 
  Voucher, 
  ProductPromotion, 
  ShippingLocation, 
  ShippingConfig, 
  ShippingVoucher, 
  BundlingPromotion, 
  MinimumPurchaseDiscount,
  PromoToast,
  BundlingProgressHint,
} from '../types';
import { INITIAL_PROMOTIONS } from '../data/initialPromotions';
import { INITIAL_BUNDLING_PROMOTIONS, INITIAL_MIN_PURCHASE_DISCOUNTS } from '../data/initialBundlingPromotions';
import { useAuth } from './AuthContext';
import { 
  KOPDES_ORIGIN, 
  RATE_PER_KM, 
  calculateShippingFee, 
  calculateRoadRouteDistance,
  getStoredShippingConfig,
  saveShippingConfig,
  getStoredShippingVouchers,
  saveShippingVouchers,
  deductShippingVoucherUsage
} from '../services/shippingService';

export interface PromoProgressHint {
  promoId: string;
  promoName: string;
  buyProductName: string;
  buyVariation: string;
  currentQty: number;
  minQty: number;
  neededQty: number;
  rewardProductName: string;
  rewardVariation: string;
  rewardQty: number;
  message: string;
}

export interface EarnedPromoInfo {
  promoId: string;
  promoName: string;
  buyProductName: string;
  rewardProductName: string;
  rewardVariation: string;
  rewardQty: number;
  message: string;
}

interface CartContextType {
  cart: CartItem[]; // All items including free bonus items
  paidItems: CartItem[]; // Only items paid by customer
  bonusItems: CartItem[]; // Only free promo bonus items (price: 0)
  promotions: ProductPromotion[]; // All promotions in database
  activeAudiencePromotions: ProductPromotion[]; // STRICTLY filtered promotions for current status (ANGGOTA vs PENGUNJUNG)
  bundlingPromotions: BundlingPromotion[];
  minPurchaseDiscounts: MinimumPurchaseDiscount[];
  activeAudienceBundlingPromos: BundlingPromotion[];
  bundlingDiscountAmount: number;
  minPurchaseDiscountAmount: number;
  bestDiscountInfo: { type: 'bundling' | 'minimum' | 'none'; amount: number; label: string };
  bestAutomaticDiscountAmount: number;
  customerStatus: 'ANGGOTA' | 'PENGUNJUNG'; // Status pelanggan
  promoProgressHints: PromoProgressHint[]; // Promos partially qualified
  earnedPromos: EarnedPromoInfo[]; // Promos unlocked with free bonus
  bundlingProgressHints: BundlingProgressHint[]; // Active and qualified bundling promos
  promoToasts: PromoToast[]; // Active promo & bonus confirmation toasts
  addPromoToast: (toast: Omit<PromoToast, 'id' | 'timestamp'>) => void;
  dismissPromoToast: (id: string) => void;
  addToCart: (product: Product, variation: string, qty?: number) => void;
  updateQty: (key: string, delta: number) => void;
  updateItemVariation: (key: string, newVariation: string) => void;
  removeItem: (key: string) => void;
  removeItems: (keys: string[]) => void;
  clearCart: () => void;
  appliedVoucher: Voucher | null;
  applyVoucher: (code: string, vouchersList: Voucher[]) => { success: boolean; message: string };
  removeVoucher: () => void;
  subtotal: number;
  totalItems: number;
  totalPaidItems: number;
  discountAmount: number;
  deliveryDistance: number;
  setDeliveryDistance: (dist: number) => void;
  roundedDistance: number;
  rawShippingFee: number;
  shippingDiscount: number;
  shippingFee: number;
  grandTotal: number;
  voucherMessage: string;
  // Fitur Pengiriman & Ongkos Kirim Berbasis Peta & Rute Jalan
  shippingConfig: ShippingConfig;
  kopdesOrigin: ShippingLocation;
  deliveryAddress: string;
  deliveryCoords: { lat: number; lng: number } | null;
  deliveryNotes: string;
  actualDistanceKm: number;
  billedDistanceKm: number;
  ratePerKm: number;
  estimatedDurationMinutes: number;
  routeGeometry: [number, number][];
  isCalculatingRoute: boolean;
  isRoadRoute: boolean;
  vehicleType: 'motorcycle' | 'car';
  avoidTolls: boolean;
  setDestination: (address: string, coords: { lat: number; lng: number }, notes?: string) => Promise<void>;
  setDeliveryNotes: (notes: string) => void;
  recalculateShipping: () => Promise<void>;
  // Kelola Voucher Ongkos Kirim
  shippingVouchers: ShippingVoucher[];
  appliedShippingVoucher: ShippingVoucher | null;
  applyShippingVoucher: (code: string) => { success: boolean; message: string };
  removeShippingVoucher: () => void;
  updateShippingConfig: (newConfig: ShippingConfig) => Promise<void>;
  updateShippingVouchers: (newVouchers: ShippingVoucher[]) => Promise<void>;
  deductAppliedShippingVoucher: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'koperasi_cart_items_v3';
const VOUCHER_STORAGE_KEY = 'koperasi_applied_voucher_v3';
const DISTANCE_STORAGE_KEY = 'koperasi_delivery_distance_v1';
const ADDRESS_STORAGE_KEY = 'koperasi_delivery_address_v1';
const COORDS_STORAGE_KEY = 'koperasi_delivery_coords_v1';
const NOTES_STORAGE_KEY = 'koperasi_delivery_notes_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Anggota Resmi: hanya jika login dan berstatus ANGGOTA (atau role member dengan nomor anggota)
  const isMember = Boolean(user && (user.accountStatus === 'ANGGOTA' || (user.role === 'member' && user.memberNumber)));

  // Raw user-added items (paid items)
  const [paidCart, setPaidCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclude any bonus items from persistence so they are dynamically computed
        return Array.isArray(parsed) ? parsed.filter((it: CartItem) => !it.isBonus) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Promotions collection from Firestore
  const [promotions, setPromotions] = useState<ProductPromotion[]>(INITIAL_PROMOTIONS);
  const [bundlingPromotions, setBundlingPromotions] = useState<BundlingPromotion[]>(INITIAL_BUNDLING_PROMOTIONS);
  const [minPurchaseDiscounts, setMinPurchaseDiscounts] = useState<MinimumPurchaseDiscount[]>(INITIAL_MIN_PURCHASE_DISCOUNTS);

  useEffect(() => {
    try {
      let hasLoadedPromos = false;
      const q = query(collection(db, 'promotions'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            hasLoadedPromos = true;
            const list: ProductPromotion[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...(d.data() as Omit<ProductPromotion, 'id'>) });
            });
            setPromotions(list);
          } else if (hasLoadedPromos) {
            setPromotions([]);
          } else {
            setPromotions(INITIAL_PROMOTIONS);
          }
        },
        (err) => {
          console.warn('Firestore promotions subscription error, using initial data:', err);
          setPromotions(INITIAL_PROMOTIONS);
        }
      );
      return () => unsub();
    } catch {
      setPromotions(INITIAL_PROMOTIONS);
    }
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'bundling_promotions'));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list: BundlingPromotion[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BundlingPromotion, 'id'>) }));
          setBundlingPromotions(list);
        } else {
          setBundlingPromotions(INITIAL_BUNDLING_PROMOTIONS);
        }
      }, () => setBundlingPromotions(INITIAL_BUNDLING_PROMOTIONS));
      return () => unsub();
    } catch {
      setBundlingPromotions(INITIAL_BUNDLING_PROMOTIONS);
    }
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'minimum_purchase_discounts'));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list: MinimumPurchaseDiscount[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<MinimumPurchaseDiscount, 'id'>) }));
          setMinPurchaseDiscounts(list);
        } else {
          setMinPurchaseDiscounts(INITIAL_MIN_PURCHASE_DISCOUNTS);
        }
      }, () => setMinPurchaseDiscounts(INITIAL_MIN_PURCHASE_DISCOUNTS));
      return () => unsub();
    } catch {
      setMinPurchaseDiscounts(INITIAL_MIN_PURCHASE_DISCOUNTS);
    }
  }, []);

  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(() => {
    try {
      const saved = localStorage.getItem(VOUCHER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [deliveryAddress, setDeliveryAddressState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ADDRESS_STORAGE_KEY);
      return saved || 'Jl. Utama Raya No. 25, Cengkareng Timur, Jakarta Barat';
    } catch {
      return 'Jl. Utama Raya No. 25, Cengkareng Timur, Jakarta Barat';
    }
  });

  const [deliveryCoords, setDeliveryCoordsState] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem(COORDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed;
        }
      }
      return { lat: -6.1482, lng: 106.7365 };
    } catch {
      return { lat: -6.1482, lng: 106.7365 };
    }
  });

  const [deliveryNotes, setDeliveryNotesState] = useState<string>(() => {
    try {
      return localStorage.getItem(NOTES_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const SHIPPING_VOUCHER_STORAGE_KEY = 'koperasi_applied_shipping_voucher_v1';

  // State Pengaturan Pengiriman (Titik Asal Kopdes, Tarif per km, Tarif min, dll)
  const [shippingConfig, setShippingConfigState] = useState<ShippingConfig>(() => {
    return getStoredShippingConfig();
  });

  // State Daftar Voucher Ongkos Kirim
  const [shippingVouchers, setShippingVouchersState] = useState<ShippingVoucher[]>(() => {
    return getStoredShippingVouchers();
  });

  // State Voucher Ongkir yang Sedang Dipasang
  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState<ShippingVoucher | null>(() => {
    try {
      const saved = localStorage.getItem(SHIPPING_VOUCHER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Real-time listener pengaturan pengiriman dari Firestore
  useEffect(() => {
    try {
      const confRef = doc(db, 'settings', 'shipping');
      const unsub = onSnapshot(confRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<ShippingConfig>;
          if (data && data.origin && typeof data.ratePerKm === 'number') {
            const merged: ShippingConfig = {
              ...getStoredShippingConfig(),
              ...data,
              origin: {
                ...getStoredShippingConfig().origin,
                ...data.origin,
              },
            };
            setShippingConfigState(merged);
            try {
              localStorage.setItem('koperasi_shipping_config_v2', JSON.stringify(merged));
            } catch {}
          }
        }
      }, (err) => {
        console.warn('Firestore shipping config subscription error:', err);
      });
      return () => unsub();
    } catch (err) {
      console.warn('Firestore shipping config listen error:', err);
    }
  }, []);

  // Real-time listener daftar voucher ongkos kirim dari Firestore
  useEffect(() => {
    try {
      const vCol = collection(db, 'shipping_vouchers');
      const unsub = onSnapshot(vCol, (snapshot) => {
        if (!snapshot.empty) {
          const list: ShippingVoucher[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as Omit<ShippingVoucher, 'id'>) });
          });
          setShippingVouchersState(list);
          try {
            localStorage.setItem('koperasi_shipping_vouchers_v2', JSON.stringify(list));
          } catch {}
        }
      }, (err) => {
        console.warn('Firestore shipping vouchers subscription error:', err);
      });
      return () => unsub();
    } catch (err) {
      console.warn('Firestore shipping vouchers listen error:', err);
    }
  }, []);

  useEffect(() => {
    if (appliedShippingVoucher) {
      try {
        localStorage.setItem(SHIPPING_VOUCHER_STORAGE_KEY, JSON.stringify(appliedShippingVoucher));
      } catch {}
    } else {
      localStorage.removeItem(SHIPPING_VOUCHER_STORAGE_KEY);
    }
  }, [appliedShippingVoucher]);

  const [actualDistanceKm, setActualDistanceKm] = useState<number>(2.6);
  const [billedDistanceKm, setBilledDistanceKm] = useState<number>(3);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(8);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [isRoadRoute, setIsRoadRoute] = useState<boolean>(true);

  const [deliveryDistance, setDeliveryDistanceState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(DISTANCE_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
      return 2.6;
    } catch {
      return 2.6;
    }
  });

  // Fungsi kalkulasi rute jalan & ongkir otomatis dengan titik asal dinamis (Mode Sepeda Motor Non-Tol)
  const calculateRouteAndShipping = async (
    coords: { lat: number; lng: number },
    customConfig: ShippingConfig = shippingConfig
  ) => {
    setIsCalculatingRoute(true);
    try {
      const result = await calculateRoadRouteDistance(
        coords.lat,
        coords.lng,
        customConfig.origin,
        customConfig.ratePerKm,
        customConfig.minShippingFee,
        customConfig.vehicleType || 'motorcycle',
        customConfig.avoidTolls !== false
      );
      setActualDistanceKm(result.actualDistanceKm);
      setBilledDistanceKm(result.billedDistanceKm);
      setEstimatedDurationMinutes(result.estimatedDurationMinutes);
      setRouteGeometry(result.routeGeometry);
      setIsRoadRoute(result.isRoadRoute);
      setDeliveryDistanceState(result.actualDistanceKm);
      try {
        localStorage.setItem(DISTANCE_STORAGE_KEY, result.actualDistanceKm.toString());
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn('Error calculating route and shipping:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Jalankan kalkulasi rute saat inisialisasi aplikasi atau pengaturan pengiriman berubah
  useEffect(() => {
    calculateRouteAndShipping(deliveryCoords, shippingConfig);
  }, [
    shippingConfig.origin.lat,
    shippingConfig.origin.lng,
    shippingConfig.ratePerKm,
    shippingConfig.vehicleType,
    shippingConfig.avoidTolls,
  ]);

  const setDestination = async (
    address: string,
    coords: { lat: number; lng: number },
    notes?: string
  ) => {
    setDeliveryAddressState(address);
    setDeliveryCoordsState(coords);
    if (notes !== undefined) {
      setDeliveryNotesState(notes);
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, notes);
      } catch {}
    }
    try {
      localStorage.setItem(ADDRESS_STORAGE_KEY, address);
      localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coords));
    } catch {}

    await calculateRouteAndShipping(coords);
  };

  const setDeliveryNotes = (notes: string) => {
    setDeliveryNotesState(notes);
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, notes);
    } catch {}
  };

  const recalculateShipping = async () => {
    if (deliveryCoords) {
      await calculateRouteAndShipping(deliveryCoords);
    }
  };

  const setDeliveryDistance = (dist: number) => {
    const valid = Math.max(0.1, Math.round(dist * 10) / 10);
    setDeliveryDistanceState(valid);
    setActualDistanceKm(valid);
    const feeCalc = calculateShippingFee(valid, shippingConfig.ratePerKm, shippingConfig.minShippingFee);
    setBilledDistanceKm(feeCalc.billedDistanceKm);
    try {
      localStorage.setItem(DISTANCE_STORAGE_KEY, valid.toString());
    } catch {
      // ignore
    }
  };

  const [voucherMessage, setVoucherMessage] = useState<string>('');

  // Persist paid cart items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(paidCart));
    } catch {
      // ignore
    }
  }, [paidCart]);

  useEffect(() => {
    if (appliedVoucher) {
      localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(appliedVoucher));
    } else {
      localStorage.removeItem(VOUCHER_STORAGE_KEY);
    }
  }, [appliedVoucher]);

  // 🔐 PRIORITAS SISTEM HARGA OTOMATIS:
  // - Belum login anggota (Pengunjung) -> Diskon Pengunjung jika aktif, jika tidak Harga Normal
  // - Sudah login anggota -> Diskon Anggota jika aktif, jika tidak Harga Normal
  // - Diskon Pengunjung dan Diskon Anggota terpisah dan tidak pernah digabungkan
  useEffect(() => {
    setPaidCart((prev) =>
      prev.map((item) => {
        const baseNormal = item.originalPrice ?? item.price;
        let targetPrice = baseNormal;

        if (isMember) {
          // Anggota: prioritaskan Diskon Anggota
          if (item.hasMemberDiscount && item.memberPrice !== undefined) {
            targetPrice = item.memberPrice;
          }
        } else {
          // Pengunjung: prioritaskan Diskon Pengunjung
          if (item.hasVisitorDiscount && item.visitorPrice !== undefined) {
            targetPrice = item.visitorPrice;
          }
        }

        if (item.price !== targetPrice) {
          return { ...item, price: targetPrice };
        }
        return item;
      })
    );
  }, [isMember]);

  // 🔐 LOGIKA STATUS PELANGGAN & ISOLASI PROMO KETAT:
  // - Belum Login: Status = PENGUNJUNG -> Sistem HANYA membaca database Promo Pengunjung
  // - Sudah Login: Status = ANGGOTA -> Sistem HANYA membaca database Promo Anggota
  // - Anggota TIDAK BISA mendapatkan promo pengunjung
  // - Pengunjung TIDAK BISA mendapatkan promo anggota
  const customerStatus: 'ANGGOTA' | 'PENGUNJUNG' = isMember ? 'ANGGOTA' : 'PENGUNJUNG';

  const activeAudiencePromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (isMember) {
        if (p.targetAudience === 'member') return true;
        if (p.targetAudience === 'specific_members') {
          if (!p.targetMemberIds || p.targetMemberIds.length === 0) return true;
          const uid = user?.id || user?.accountId;
          const uphone = user?.phone;
          return p.targetMemberIds.some((id) => id === uid || (uphone && id === uphone));
        }
        return false;
      } else {
        return p.targetAudience === 'visitor';
      }
    });
  }, [promotions, isMember, user]);

  const activeAudienceBundlingPromos = useMemo(() => {
    const target = isMember ? 'member' : 'visitor';
    return bundlingPromotions.filter((p) => p.isActive && p.targetAudience === target);
  }, [bundlingPromotions, isMember]);

  const activeAudienceMinPurchaseDiscounts = useMemo(() => {
    const target = isMember ? 'member' : 'visitor';
    return minPurchaseDiscounts.filter((d) => d.isActive && d.targetAudience === target);
  }, [minPurchaseDiscounts, isMember]);

  const { bundlingDiscountAmount, bundlingProgressHints: bundlingHints } = useMemo(() => {
    let totalBundlingDiscount = 0;
    const hints: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    activeAudienceBundlingPromos.forEach((promo) => {
      if (!promo.isActive) return;
      if (promo.startDate && todayStr < promo.startDate) return;
      if (promo.endDate && todayStr > promo.endDate) return;

      const matchingItems = paidCart.filter((item) => {
        const matchId = item.id === promo.productId || item.id.toLowerCase().includes(promo.productId.toLowerCase()) || promo.productId.toLowerCase().includes(item.id.toLowerCase());
        const matchName = item.name.toLowerCase().includes(promo.productName.toLowerCase()) || promo.productName.toLowerCase().includes(item.name.toLowerCase());
        if (!matchId && !matchName) return false;

        if (!promo.variation || promo.variation === 'Semua Variasi' || promo.variation === 'Semua') return true;
        return item.variation.toLowerCase().includes(promo.variation.toLowerCase()) || promo.variation.toLowerCase().includes(item.variation.toLowerCase());
      });

      const totalQty = matchingItems.reduce((acc, it) => acc + it.qty, 0);

      if (totalQty >= promo.minQty) {
        const numBundles = promo.isMultiple ? Math.floor(totalQty / promo.minQty) : 1;
        const itemsInBundleCount = numBundles * promo.minQty;

        let bundleDiscountForThisPromo = 0;
        let counted = 0;
        for (const item of matchingItems) {
          const itemPrice = item.originalPrice ?? item.price;
          const qtyToApply = Math.min(item.qty - Math.max(0, counted - (totalQty - itemsInBundleCount)), itemsInBundleCount - counted);
          if (qtyToApply > 0) {
            if (promo.discountType === 'percentage') {
              bundleDiscountForThisPromo += Math.round(itemPrice * qtyToApply * (promo.discountValue / 100));
            } else {
              bundleDiscountForThisPromo += promo.discountValue * qtyToApply;
            }
            counted += qtyToApply;
          }
        }
        totalBundlingDiscount += bundleDiscountForThisPromo;

        hints.push({
          promoId: promo.id,
          promoName: promo.name,
          productName: promo.productName,
          message: numBundles > 1 ? `🎉 ${numBundles} Bundling aktif!` : `🎉 Promo Bundling Aktif!`,
          currentQty: totalQty,
          minQty: promo.minQty,
          neededQty: 0,
          numBundles,
          discountAmount: bundleDiscountForThisPromo,
        });
      } else if (totalQty > 0 && totalQty < promo.minQty) {
        const needed = promo.minQty - totalQty;
        hints.push({
          promoId: promo.id,
          promoName: promo.name,
          productName: promo.productName,
          message: `💰 Tambahkan ${needed} ${promo.productName} lagi untuk mendapatkan Diskon Bundling ${promo.discountType === 'percentage' ? `${promo.discountValue}%` : `Rp ${promo.discountValue.toLocaleString('id-ID')}`}.`,
          currentQty: totalQty,
          minQty: promo.minQty,
          neededQty: needed,
          numBundles: 0,
          discountAmount: 0,
        });
      }
    });

    return {
      bundlingDiscountAmount: totalBundlingDiscount,
      bundlingProgressHints: hints,
    };
  }, [paidCart, activeAudienceBundlingPromos]);

  const minPurchaseDiscountAmount = useMemo(() => {
    // Note: subtotal will be available below or we can compute subtotal here
    const currentSubtotal = paidCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let maxMinDiscount = 0;
    activeAudienceMinPurchaseDiscounts.forEach((rule) => {
      if (currentSubtotal >= rule.minPurchase) {
        let calc = 0;
        if (rule.discountType === 'percentage') {
          calc = (currentSubtotal * rule.discountValue) / 100;
          if (rule.maxDiscount && rule.maxDiscount > 0) {
            calc = Math.min(calc, rule.maxDiscount);
          }
          calc = Math.min(calc, currentSubtotal);
        } else {
          calc = Math.min(rule.discountValue, currentSubtotal);
        }
        if (calc > maxMinDiscount) {
          maxMinDiscount = calc;
        }
      }
    });
    return Math.round(maxMinDiscount);
  }, [paidCart, activeAudienceMinPurchaseDiscounts]);

  // 🏆 Pemilihan Diskon Terbaik (Terbesar) Antara Bundling vs Minimal Pembelian Tanpa Menumpuk
  const bestDiscountInfo = useMemo(() => {
    const bundling = bundlingDiscountAmount;
    const minimum = minPurchaseDiscountAmount;

    if (bundling === 0 && minimum === 0) {
      return { type: 'none' as const, amount: 0, label: '' };
    }
    if (minimum > bundling) {
      return { type: 'minimum' as const, amount: minimum, label: '🏆 Diskon Minimal Pembelian (Terbaik)' };
    } else if (bundling > 0) {
      return { type: 'bundling' as const, amount: bundling, label: '🛍️ Diskon Pembelian Bundling (Terbaik)' };
    }
    return { type: 'none' as const, amount: 0, label: '' };
  }, [bundlingDiscountAmount, minPurchaseDiscountAmount]);

  const bestAutomaticDiscountAmount = bestDiscountInfo.amount;

  // 🎁 AUTO-PROMO BONUS CALCULATION ENGINE
  // Menghitung bonus produk gratis (Rp0) secara otomatis HANYA dari activeAudiencePromotions
  const { generatedBonusItems, promoProgressHints, earnedPromos } = useMemo(() => {
    const bonuses: CartItem[] = [];
    const hints: PromoProgressHint[] = [];
    const earned: EarnedPromoInfo[] = [];

    // Helper tanggal hari ini YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    activeAudiencePromotions.forEach((promo) => {
      if (!promo.isActive) return;

      // Cek periode promo jika ditentukan (otomatis tidak aktif jika di luar periode)
      if (promo.startDate && todayStr < promo.startDate) return;
      if (promo.endDate && todayStr > promo.endDate) return;

      // Cari item di keranjang yang cocok dengan kriteria promo pembelian
      const matchingItems = paidCart.filter((item) => {
        // Cek ID atau kecocokan nama produk utama
        const matchId = item.id === promo.buyProductId || 
          item.id.toLowerCase().includes(promo.buyProductId.toLowerCase()) ||
          promo.buyProductId.toLowerCase().includes(item.id.toLowerCase());
        
        const matchName = item.name.toLowerCase().includes(promo.buyProductName.toLowerCase()) ||
          promo.buyProductName.toLowerCase().includes(item.name.toLowerCase());

        const isSameProduct = matchId || matchName;
        if (!isSameProduct) return false;

        // Cek variasi / ukuran
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
        if (totalPurchasedQty > 0) {
          hints.push({
            promoId: promo.id,
            promoName: promo.name,
            buyProductName: promo.buyProductName,
            buyVariation: promo.buyVariation || '',
            currentQty: totalPurchasedQty,
            minQty: promo.minQty,
            neededQty: 0,
            rewardProductName: promo.rewardProductName,
            rewardVariation: promo.rewardVariation || '',
            rewardQty: 0,
            message: `⚠️ Bonus promo ${promo.name} saat ini sedang habis (Stok: 0 pcs).`,
          });
        }
        return;
      }

      if (totalPurchasedQty >= promo.minQty) {
        // Syarat terpenuhi! Hitung bonus bertingkat (kelipatan) atau flat
        const multiplier = promo.isTiered ? Math.floor(totalPurchasedQty / promo.minQty) : 1;
        let totalBonusQty = multiplier * (promo.rewardQty || 1);

        // Batasi batas maksimal bonus jika ditentukan admin (> 0)
        const cap = promo.maxBonusPerTransaction || promo.maxBonus;
        if (cap && cap > 0) {
          totalBonusQty = Math.min(totalBonusQty, cap);
        }

        // Batasi dengan sisa stok produk bonus yang tersedia
        if (promo.bonusStock !== undefined && promo.bonusStock > 0) {
          totalBonusQty = Math.min(totalBonusQty, promo.bonusStock);
        }

        if (totalBonusQty > 0) {
          const bonusKey = `bonus_${promo.id}_${promo.rewardVariation || 'std'}`;
          bonuses.push({
            key: bonusKey,
            id: promo.rewardProductId || `bonus_${promo.id}`,
            name: promo.rewardProductName,
            emoji: promo.rewardProductEmoji || '🎁',
            variation: promo.rewardVariation || 'Standar',
            availableVariations: [promo.rewardVariation || 'Standar'],
            price: 0, // GRATIS Rp0! Tidak pernah menambah atau mengurangi total bayar
            originalPrice: 0,
            qty: totalBonusQty,
            isBonus: true,
            bonusPromoId: promo.id,
            bonusPromoName: promo.name,
            bonusBuyProductName: `${promo.buyProductName} (${promo.buyVariation || 'Semua Ukuran'})`,
          });

          earned.push({
            promoId: promo.id,
            promoName: promo.name,
            buyProductName: promo.buyProductName,
            rewardProductName: promo.rewardProductName,
            rewardVariation: promo.rewardVariation || '',
            rewardQty: totalBonusQty,
            message: `🎉 Selamat! Anda mendapatkan bonus gratis ${totalBonusQty}x ${promo.rewardProductName} ${promo.rewardVariation}.`,
          });
        }
      } else if (totalPurchasedQty > 0 && totalPurchasedQty < promo.minQty) {
        // Pembelian ada tapi belum mencapai kuota minimal: Tampilkan informasi otomatis
        const needed = promo.minQty - totalPurchasedQty;
        hints.push({
          promoId: promo.id,
          promoName: promo.name,
          buyProductName: promo.buyProductName,
          buyVariation: promo.buyVariation || '',
          currentQty: totalPurchasedQty,
          minQty: promo.minQty,
          neededQty: needed,
          rewardProductName: promo.rewardProductName,
          rewardVariation: promo.rewardVariation || '',
          rewardQty: promo.rewardQty || 1,
          message: `🎁 Tambahkan ${needed} ${promo.buyProductName} ${promo.buyVariation ? `(${promo.buyVariation})` : ''} lagi untuk mendapatkan ${promo.rewardProductName} ${promo.rewardVariation ? `(${promo.rewardVariation})` : ''} GRATIS.`,
        });
      }
    });

    return {
      generatedBonusItems: bonuses,
      promoProgressHints: hints,
      earnedPromos: earned,
    };
  }, [paidCart, activeAudiencePromotions]);

  // Gabungan keranjang lengkap: item bayar + bonus gratis Rp0
  const cart = useMemo(() => {
    return [...paidCart, ...generatedBonusItems];
  }, [paidCart, generatedBonusItems]);

  // 🔔 SISTEM TOAST NOTIFIKASI PROMO BUNDLING & BONUS GRATIS
  const [promoToasts, setPromoToasts] = useState<PromoToast[]>([]);

  const dismissPromoToast = useCallback((id: string) => {
    setPromoToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addPromoToast = useCallback((toastData: Omit<PromoToast, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newToast: PromoToast = {
      ...toastData,
      id,
      timestamp: Date.now(),
    };
    setPromoToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Maksimal 4 toast aktif bersamaan
  }, []);

  // Tracking refs untuk mendeteksi perubahan peningkatan promo / bonus baru
  const prevEarnedMapRef = useRef<Map<string, number>>(new Map());
  const prevBundlesMapRef = useRef<Map<string, { numBundles: number; discountAmount: number }>>(new Map());
  const isInitialToastMountRef = useRef<boolean>(true);

  useEffect(() => {
    // Pada saat pertama kali komponen mount (loading dari cache / localStorage), jangan trigger notifikasi beruntun
    if (isInitialToastMountRef.current) {
      isInitialToastMountRef.current = false;
      const initialEarned = new Map<string, number>();
      earnedPromos.forEach((p) => initialEarned.set(p.promoId, p.rewardQty));
      prevEarnedMapRef.current = initialEarned;

      const initialBundles = new Map<string, { numBundles: number; discountAmount: number }>();
      bundlingHints
        .filter((h) => h.neededQty === 0 && (h.discountAmount || 0) > 0)
        .forEach((b) => {
          initialBundles.set(b.promoId, {
            numBundles: b.numBundles || 1,
            discountAmount: b.discountAmount || 0,
          });
        });
      prevBundlesMapRef.current = initialBundles;
      return;
    }

    // 1. Pantau Promo Hadiah Bonus Gratis (Beli X Gratis Y)
    const currentEarnedMap = new Map<string, number>();
    earnedPromos.forEach((p) => {
      currentEarnedMap.set(p.promoId, p.rewardQty);
      const prevQty = prevEarnedMapRef.current.get(p.promoId) || 0;
      if (p.rewardQty > prevQty) {
        const isNew = prevQty === 0;
        addPromoToast({
          type: 'bonus',
          title: isNew ? '🎉 Hadiah Bonus Gratis Didapatkan!' : '🎁 Bonus Gratis Bertambah!',
          message: isNew
            ? `Selamat! Anda berhak mendapatkan ${p.rewardQty}x ${p.rewardProductName}${p.rewardVariation ? ` (${p.rewardVariation})` : ''} GRATIS (Rp0) otomatis di keranjang.`
            : `Jumlah bonus gratis Anda bertambah menjadi ${p.rewardQty}x ${p.rewardProductName}${p.rewardVariation ? ` (${p.rewardVariation})` : ''} (Rp0).`,
          badgeText: 'BONUS GRATIS Rp0',
          productName: p.buyProductName,
          rewardProductName: p.rewardProductName,
          rewardVariation: p.rewardVariation,
          rewardQty: p.rewardQty,
        });
      }
    });
    prevEarnedMapRef.current = currentEarnedMap;

    // 2. Pantau Promo Bundling Diskon (Beli X Hemat Y)
    const currentBundlesMap = new Map<string, { numBundles: number; discountAmount: number }>();
    const qualifiedBundles = bundlingHints.filter((h) => h.neededQty === 0 && (h.discountAmount || 0) > 0);
    qualifiedBundles.forEach((b) => {
      const bundleInfo = {
        numBundles: b.numBundles || 1,
        discountAmount: b.discountAmount || 0,
      };
      currentBundlesMap.set(b.promoId, bundleInfo);
      const prev = prevBundlesMapRef.current.get(b.promoId);

      if (!prev || bundleInfo.numBundles > prev.numBundles || bundleInfo.discountAmount > prev.discountAmount) {
        const isNew = !prev;
        addPromoToast({
          type: 'bundling',
          title: isNew ? '🛍️ Diskon Bundling Otomatis Aktif!' : '✨ Diskon Bundling Bertambah!',
          message: `Hemat Rp ${(bundleInfo.discountAmount).toLocaleString('id-ID')} otomatis dipotong untuk pembelian ${b.productName || b.promoName}!`,
          badgeText: 'HEMAT BUNDLING',
          productName: b.productName || b.promoName,
          discountAmount: bundleInfo.discountAmount,
        });
      }
    });
    prevBundlesMapRef.current = currentBundlesMap;
  }, [earnedPromos, bundlingHints, addPromoToast]);

  const addToCart = (product: Product, variation: string, qty: number = 1) => {
    const key = `${product.id}_${variation}`;

    // 1. Hitung Diskon Anggota
    let memberPrice: number | undefined = undefined;
    let hasMemberDiscount = false;
    let memberDiscountBadge: string | undefined = undefined;

    if (product.hasMemberDiscount && product.memberDiscountValue && product.memberDiscountValue > 0) {
      hasMemberDiscount = true;
      if (product.memberDiscountType === 'percentage') {
        const cut = Math.round((product.price * product.memberDiscountValue) / 100);
        memberPrice = Math.max(0, product.price - cut);
        memberDiscountBadge = `Diskon Anggota ${product.memberDiscountValue}%`;
      } else {
        memberPrice = Math.max(0, product.price - product.memberDiscountValue);
        memberDiscountBadge = `Diskon Anggota Rp ${product.memberDiscountValue.toLocaleString('id-ID')}`;
      }
    }

    // 2. Hitung Diskon Pengunjung (Terpisah dari Diskon Anggota)
    let visitorPrice: number | undefined = undefined;
    let hasVisitorDiscount = false;
    let visitorDiscountBadge: string | undefined = undefined;

    if (product.hasVisitorDiscount && product.visitorDiscountValue && product.visitorDiscountValue > 0) {
      hasVisitorDiscount = true;
      if (product.visitorDiscountType === 'percentage') {
        const cut = Math.round((product.price * product.visitorDiscountValue) / 100);
        visitorPrice = Math.max(0, product.price - cut);
        visitorDiscountBadge = `Diskon Basic ${product.visitorDiscountValue}%`;
      } else {
        visitorPrice = Math.max(0, product.price - product.visitorDiscountValue);
        visitorDiscountBadge = `Diskon Basic Rp ${product.visitorDiscountValue.toLocaleString('id-ID')}`;
      }
    }

    // 3. Tentukan Harga Efektif Berdasarkan Status Pengguna Saat Ini:
    // - Anggota login -> Diskon Anggota jika aktif, else Harga Normal
    // - Pengunjung non-login -> Diskon Pengunjung jika aktif, else Harga Normal
    let effectivePrice = product.price;
    if (isMember) {
      if (hasMemberDiscount && memberPrice !== undefined) {
        effectivePrice = memberPrice;
      }
    } else {
      if (hasVisitorDiscount && visitorPrice !== undefined) {
        effectivePrice = visitorPrice;
      }
    }

    setPaidCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? {
                ...item,
                qty: item.qty + qty,
                availableVariations: product.variations || item.availableVariations,
                price: effectivePrice,
                originalPrice: product.price,
                memberPrice,
                hasMemberDiscount,
                memberDiscountBadge,
                visitorPrice,
                hasVisitorDiscount,
                visitorDiscountBadge,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          emoji: product.emoji,
          imageUrl: product.imageUrl,
          variation,
          availableVariations: product.variations || [variation],
          price: effectivePrice,
          originalPrice: product.price,
          memberPrice,
          hasMemberDiscount,
          memberDiscountBadge,
          visitorPrice,
          hasVisitorDiscount,
          visitorDiscountBadge,
          qty,
          isBonus: false,
        },
      ];
    });
  };

  const updateItemVariation = (currentKey: string, newVariation: string) => {
    setPaidCart((prev) => {
      const targetItem = prev.find((item) => item.key === currentKey);
      if (!targetItem || targetItem.variation === newVariation) return prev;

      const newKey = `${targetItem.id}_${newVariation}`;
      const existingNewItem = prev.find((item) => item.key === newKey && item.key !== currentKey);

      if (existingNewItem) {
        return prev
          .filter((item) => item.key !== currentKey)
          .map((item) =>
            item.key === newKey
              ? { ...item, qty: item.qty + targetItem.qty }
              : item
          );
      }

      return prev.map((item) =>
        item.key === currentKey
          ? { ...item, key: newKey, variation: newVariation }
          : item
      );
    });
  };

  const updateQty = (key: string, delta: number) => {
    // Pengguna hanya dapat memodifikasi jumlah item bayar (bukan bonus yang dihitung otomatis)
    setPaidCart((prev) => {
      return prev
        .map((item) => {
          if (item.key === key) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (key: string) => {
    setPaidCart((prev) => prev.filter((item) => item.key !== key));
  };

  const removeItems = (keys: string[]) => {
    const keysSet = new Set(keys);
    setPaidCart((prev) => prev.filter((item) => !keysSet.has(item.key)));
  };

  const clearCart = () => {
    setPaidCart([]);
    setAppliedVoucher(null);
    setVoucherMessage('');
  };

  // Subtotal dihitung murni dari produk berbayar (Produk bonus Rp0 tidak memengaruhi subtotal)
  const subtotal = useMemo(() => {
    return paidCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [paidCart]);

  const totalPaidItems = useMemo(() => {
    return paidCart.reduce((sum, item) => sum + item.qty, 0);
  }, [paidCart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  // Kalkulasi diskon voucher
  const subtotalAfterBestDiscount = Math.max(0, subtotal - bestAutomaticDiscountAmount);

  const discountAmount = useMemo(() => {
    let vDisc = 0;
    if (appliedVoucher && subtotalAfterBestDiscount > 0 && subtotal >= appliedVoucher.minPurchase) {
      if (appliedVoucher.discountType === 'percentage') {
        const raw = (subtotalAfterBestDiscount * appliedVoucher.discountValue) / 100;
        vDisc = Math.min(raw, appliedVoucher.maxDiscount || subtotalAfterBestDiscount);
      } else {
        vDisc = Math.min(appliedVoucher.discountValue, subtotalAfterBestDiscount);
      }
    }
    return bestAutomaticDiscountAmount + vDisc;
  }, [appliedVoucher, subtotal, subtotalAfterBestDiscount, bestAutomaticDiscountAmount]);

  useEffect(() => {
    if (appliedVoucher && subtotal > 0 && subtotal < appliedVoucher.minPurchase) {
      setVoucherMessage(`Voucher ${appliedVoucher.code} butuh min. belanja Rp ${appliedVoucher.minPurchase.toLocaleString('id-ID')}`);
    } else if (appliedVoucher && subtotal >= appliedVoucher.minPurchase) {
      setVoucherMessage(`Voucher ${appliedVoucher.code} aktif: Hemat Rp ${discountAmount.toLocaleString('id-ID')}`);
    }
  }, [appliedVoucher, subtotal, discountAmount]);

  const applyVoucher = (code: string, vouchersList: Voucher[]) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Silakan masukkan kode voucher' };
    }

    const found = vouchersList.find(
      (v) => v.code.toUpperCase() === cleanCode && v.isActive
    );

    if (!found) {
      return { 
        success: false, 
        message: 'Kode voucher tidak valid atau sudah tidak aktif.' 
      };
    }

    if (subtotal < found.minPurchase) {
      return {
        success: false,
        message: `Minimal belanja untuk voucher ini adalah Rp ${found.minPurchase.toLocaleString('id-ID')}. Tambahkan barang ke keranjang.`
      };
    }

    const userKey = user?.uid || user?.accountId || user?.phone || 'visitor';
    const userUsedCount = (found.userUsage && found.userUsage[userKey]) || 0;
    const limit = found.usageLimit || 1;
    if (userUsedCount >= limit) {
      return {
        success: false,
        message: `Voucher ${found.code} sudah mencapai batas penggunaan (${limit}×) untuk akun Anda.`
      };
    }

    if (found.usageLimit && found.usedCount >= (found.usageLimit * 100)) {
      return {
        success: false,
        message: 'Kuota penggunaan voucher ini sudah habis.'
      };
    }

    setAppliedVoucher(found);
    const calculated = found.discountType === 'percentage'
      ? Math.min((subtotal * found.discountValue) / 100, found.maxDiscount || Infinity)
      : found.discountValue;

    const msg = `Voucher ${found.code} berhasil dipasang! Anda hemat Rp ${calculated.toLocaleString('id-ID')}`;
    setVoucherMessage(msg);
    return { success: true, message: msg };
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherMessage('');
  };

  const roundedDistance = billedDistanceKm;

  // 🚚 Kalkulasi Biaya Ongkir Kotor (Sesuai Tarif per km dari Pengaturan)
  const rawShippingFee = useMemo(() => {
    const rate = shippingConfig.ratePerKm || 5000;
    const minFee = shippingConfig.minShippingFee || 5000;
    const calculated = billedDistanceKm * rate;
    return Math.max(calculated, minFee);
  }, [billedDistanceKm, shippingConfig.ratePerKm, shippingConfig.minShippingFee]);

  // 🎟️ Kalkulasi Potongan Nominal Voucher Ongkos Kirim
  const shippingDiscount = useMemo(() => {
    if (!appliedShippingVoucher) return 0;

    // 1. Cek status keaktifan
    if (!appliedShippingVoucher.isActive) return 0;

    // 2. Cek kuota tersisa
    if (appliedShippingVoucher.totalQuota && (appliedShippingVoucher.usedCount || 0) >= appliedShippingVoucher.totalQuota) {
      return 0;
    }

    // 3. Cek masa berlaku / kadaluarsa
    if (appliedShippingVoucher.expiryDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr > appliedShippingVoucher.expiryDate) return 0;
    }

    // 4. Cek sasaran penggunaan (Anggota vs Pengunjung)
    if (appliedShippingVoucher.targetAudience === 'member' && !isMember) {
      return 0;
    }
    if (appliedShippingVoucher.targetAudience === 'visitor' && isMember) {
      return 0;
    }

    // 5. Cek syarat minimal jarak pengiriman
    if (actualDistanceKm < appliedShippingVoucher.minDistanceKm) {
      return 0;
    }

    // 6. Nominal potongan dibatasi maksimal sebesar rawShippingFee agar ongkir tidak minus
    return Math.min(appliedShippingVoucher.discountAmount, rawShippingFee);
  }, [appliedShippingVoucher, isMember, actualDistanceKm, rawShippingFee]);

  // Biaya Ongkir Bersih yang Ditagihkan (Tidak Pernah Minus)
  const shippingFee = useMemo(() => {
    if (!shippingConfig.isDeliveryActive) return 0;
    return Math.max(0, rawShippingFee - shippingDiscount);
  }, [shippingConfig.isDeliveryActive, rawShippingFee, shippingDiscount]);

  const grandTotal = Math.max(0, subtotal - discountAmount) + (subtotal > 0 ? shippingFee : 0);

  // Fungsi Pasang Voucher Ongkir
  const applyShippingVoucher = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Silakan masukkan kode voucher ongkir.' };
    }

    const found = shippingVouchers.find(
      (v) => v.code.toUpperCase() === cleanCode
    );

    if (!found) {
      return { success: false, message: `Kode voucher ongkir "${cleanCode}" tidak ditemukan.` };
    }

    if (!found.isActive) {
      return { success: false, message: `Voucher "${found.code}" sedang dinonaktifkan.` };
    }

    const used = found.usedCount || 0;
    if (found.totalQuota && used >= found.totalQuota) {
      return { success: false, message: `❌ Kuota voucher "${found.code}" sudah habis (${used}/${found.totalQuota} terpakai).` };
    }

    if (found.expiryDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr > found.expiryDate) {
        return { success: false, message: `Voucher "${found.code}" sudah kadaluarsa sejak ${found.expiryDate}.` };
      }
    }

    if (found.targetAudience === 'member' && !isMember) {
      return { success: false, message: `Voucher "${found.code}" khusus untuk Anggota Koperasi. Silakan masuk dengan akun anggota.` };
    }
    if (found.targetAudience === 'visitor' && isMember) {
      return { success: false, message: `Voucher "${found.code}" khusus untuk Akun Basic Baru.` };
    }

    if (actualDistanceKm < found.minDistanceKm) {
      return {
        success: false,
        message: `Minimal jarak pengiriman untuk voucher "${found.code}" adalah ${found.minDistanceKm} km. (Jarak Anda: ${actualDistanceKm.toFixed(1)} km).`
      };
    }

    setAppliedShippingVoucher(found);
    const nominal = Math.min(found.discountAmount, rawShippingFee);
    return {
      success: true,
      message: `✅ Voucher ongkir "${found.code}" berhasil dipasang! Potongan ongkos kirim Rp ${nominal.toLocaleString('id-ID')}.`
    };
  };

  const removeShippingVoucher = () => {
    setAppliedShippingVoucher(null);
  };

  const updateShippingConfig = async (newConfig: ShippingConfig) => {
    setShippingConfigState(newConfig);
    await saveShippingConfig(newConfig);
    if (deliveryCoords) {
      await calculateRouteAndShipping(deliveryCoords, newConfig);
    }
  };

  const updateShippingVouchers = async (newVouchers: ShippingVoucher[]) => {
    setShippingVouchersState(newVouchers);
    await saveShippingVouchers(newVouchers);
  };

  const deductAppliedShippingVoucher = async (): Promise<boolean> => {
    if (!appliedShippingVoucher) return false;
    const success = await deductShippingVoucherUsage(appliedShippingVoucher.id);
    if (success) {
      setShippingVouchersState((prev) =>
        prev.map((v) =>
          v.id === appliedShippingVoucher.id
            ? {
                ...v,
                usedCount: (v.usedCount || 0) + 1,
                isActive: (v.usedCount || 0) + 1 >= v.totalQuota ? false : v.isActive,
              }
            : v
        )
      );
    }
    return success;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        paidItems: paidCart,
        bonusItems: generatedBonusItems,
        promotions,
        activeAudiencePromotions,
        bundlingPromotions,
        minPurchaseDiscounts,
        activeAudienceBundlingPromos,
        bundlingDiscountAmount,
        minPurchaseDiscountAmount,
        bestDiscountInfo,
        bestAutomaticDiscountAmount,
        customerStatus,
        promoProgressHints,
        earnedPromos,
        bundlingProgressHints: bundlingHints,
        promoToasts,
        addPromoToast,
        dismissPromoToast,
        addToCart,
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
        deliveryDistance,
        setDeliveryDistance,
        roundedDistance,
        rawShippingFee,
        shippingDiscount,
        shippingFee,
        grandTotal,
        voucherMessage,
        // Fitur Pengiriman & Ongkos Kirim Berbasis Peta & Rute Jalan
        shippingConfig,
        kopdesOrigin: shippingConfig.origin,
        deliveryAddress,
        deliveryCoords,
        deliveryNotes,
        actualDistanceKm,
        billedDistanceKm,
        ratePerKm: shippingConfig.ratePerKm || RATE_PER_KM,
        estimatedDurationMinutes,
        routeGeometry,
        isCalculatingRoute,
        isRoadRoute,
        vehicleType: shippingConfig.vehicleType || 'motorcycle',
        avoidTolls: shippingConfig.avoidTolls !== false,
        setDestination,
        setDeliveryNotes,
        recalculateShipping,
        // Kelola Voucher Ongkos Kirim
        shippingVouchers,
        appliedShippingVoucher,
        applyShippingVoucher,
        removeShippingVoucher,
        updateShippingConfig,
        updateShippingVouchers,
        deductAppliedShippingVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
