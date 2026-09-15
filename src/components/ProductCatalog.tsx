import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { 
  Search, 
  ShoppingCart, 
  Check, 
  Edit3, 
  Filter, 
  Sparkles,
  RefreshCw,
  Maximize2,
  X,
  Lock,
  Tag,
  Gift,
  Zap,
  Info,
  Video,
  Image as ImageIcon,
  Film,
  Layers,
  Box,
  ArrowLeft,
  Home,
  Plus,
  Minus,
  Truck,
  MapPin,
  Heart,
  Star
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointContext';
import { useAnalytics } from '../context/AnalyticsContext';
import { useReviewLove } from '../context/ReviewLoveContext';
import { ReviewModal } from './ReviewModal';
import { getProductStock } from '../lib/stockUtils';
import { DeliveryAddressPicker } from './DeliveryAddressPicker';
import { useProductAnalytics } from '../hooks/useProductAnalytics';

interface ProductCatalogProps {
  onBackToHome?: () => void;
  onOpenCart: () => void;
  onEditProductInAdmin?: (product: Product) => void;
  onOpenAuth?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ 
  onBackToHome,
  onOpenCart,
  onEditProductInAdmin,
  onOpenAuth
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  
  // Advanced Filter & Sort states
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('Semua'); // Semua, Tersedia, Terbatas, Habis
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua'); // Semua, Baru, Unggulan, Diskon
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<string>('Rekomendasi');

  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});
  const [zoomedProduct, setZoomedProduct] = useState<Product | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [savedProducts, setSavedProducts] = useState<Record<string, string>>({}); // productId -> savedDocId

  // 🛒 Modal Pemilihan Jumlah Produk (Bisa dikurangin / ditambah saat klik +keranjang)
  const [quantityModalProduct, setQuantityModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalVariation, setModalVariation] = useState<string>('Standar');
  const [cartSuccessToast, setCartSuccessToast] = useState<{ show: boolean; message: string } | null>(null);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState<boolean>(false);

  const { 
    addToCart, 
    promotions, 
    activeAudiencePromotions, 
    customerStatus,
    kopdesOrigin,
    deliveryAddress,
    actualDistanceKm,
    billedDistanceKm,
    shippingFee,
    subtotal,
    grandTotal,
    totalPaidItems
  } = useCart();
  const { user, isStaff } = useAuth();
  const { calculateProductPoints, isPointSystemActive } = usePoints();
  const { trackEvent } = useAnalytics();
  const { 
    getProductRatingStats, 
    getProductLoveCount, 
    hasUserLovedProduct, 
    toggleProductLove, 
    getProductSoldCount 
  } = useReviewLove();
  const [reviewModalProduct, setReviewModalProduct] = useState<Product | null>(null);
  const isMember = Boolean(user);
  const { productStats } = useProductAnalytics();

  useEffect(() => {
    trackEvent('catalog_view');
  }, [trackEvent]);

  // Real-time listener for Firestore products collection
  useEffect(() => {
    setLoading(true);
    const productsRef = collection(db, 'products');
    const q = query(productsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Product, 'id'>),
            });
          });
          setProducts(list);
        } else {
          const fallbackList: Product[] = INITIAL_PRODUCTS.map((p, idx) => ({
            id: `prod_${idx + 1}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            ...p,
          }));
          setProducts(fallbackList);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore real-time subscription error, using local data:', error);
        const fallbackList: Product[] = INITIAL_PRODUCTS.map((p, idx) => ({
          id: `prod_${idx + 1}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          ...p,
        }));
        setProducts(fallbackList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Deep linking to product from copywriting link (?product=... or ?search=...)
  useEffect(() => {
    if (products.length === 0 || typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const prodParam = urlParams.get('product');
      const searchParam = urlParams.get('search');

      if (prodParam) {
        const decoded = decodeURIComponent(prodParam).trim().toLowerCase();
        const found = products.find(p => p.id === prodParam || p.id.toLowerCase() === decoded || p.name.toLowerCase().includes(decoded));
        if (found) {
          setZoomedProduct(found);
          setTimeout(() => {
            const cardEl = document.getElementById(`product-card-${found.id}`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cardEl.classList.add('ring-4', 'ring-red-500', 'ring-offset-2');
              setTimeout(() => cardEl.classList.remove('ring-4', 'ring-red-500', 'ring-offset-2'), 3000);
            }
          }, 350);
        }
      } else if (searchParam) {
        setSearchQuery(decodeURIComponent(searchParam));
      }
    } catch (err) {
      console.warn('Deep link product error:', err);
    }
  }, [products]);

  // Real-time custom event listener for "Belanja Sekarang" clicks
  useEffect(() => {
    const handleDirectNavigation = (e: any) => {
      const prodParam = e.detail?.productId;
      if (!prodParam || products.length === 0) return;
      const decoded = decodeURIComponent(prodParam).trim().toLowerCase();
      const found = products.find(p => p.id === prodParam || p.id.toLowerCase() === decoded || p.name.toLowerCase().includes(decoded));
      if (found) {
        setZoomedProduct(found);
        setTimeout(() => {
          const cardEl = document.getElementById(`product-card-${found.id}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardEl.classList.add('ring-4', 'ring-red-500', 'ring-offset-2');
            setTimeout(() => cardEl.classList.remove('ring-4', 'ring-red-500', 'ring-offset-2'), 3000);
          }
        }, 300);
      }
    };

    window.addEventListener('kopdes_navigate_to_product', handleDirectNavigation);
    return () => window.removeEventListener('kopdes_navigate_to_product', handleDirectNavigation);
  }, [products]);

  // Fetch saved products for Anggota
  useEffect(() => {
    if (isMember && user?.uid) {
      const savedRef = collection(db, 'savedProducts');
      const qSaved = query(savedRef, where('userId', '==', user.uid));
      const unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
        const savedMap: Record<string, string> = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          savedMap[data.productId] = doc.id;
        });
        setSavedProducts(savedMap);
      });
      return () => unsubscribeSaved();
    } else {
      setSavedProducts({});
    }
  }, [isMember, user?.uid]);

  const handleToggleSaveProduct = async (e: React.MouseEvent, product: Product, variation: string) => {
    e.stopPropagation();
    if (!isMember || !user?.uid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const savedDocId = savedProducts[product.id];
    if (savedDocId) {
      // Remove
      try {
        await deleteDoc(doc(db, 'savedProducts', savedDocId));
        setCartSuccessToast({ show: true, message: `Produk dihapus dari tersimpan.` });
      } catch (err) {
        console.error(err);
      }
    } else {
      // Add
      try {
        await addDoc(collection(db, 'savedProducts'), {
          userId: user.uid,
          productId: product.id,
          productName: product.name,
          productCategory: product.category || 'Lainnya',
          variation: variation,
          createdAt: new Date().toISOString()
        });
        setCartSuccessToast({ show: true, message: `Produk disimpan!` });
        
        trackEvent('product_saved', {
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          variation: variation,
          source: 'Simpan Produk'
        });

      } catch (err) {
        console.error(err);
      }
    }
    setTimeout(() => setCartSuccessToast(null), 2500);
  };

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('Semua');
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered and Sorted products
  const processedProducts = useMemo(() => {
    // 1. Filter
    let result = products.filter((p) => {
      // Category Filter
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      
      // Search Filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.unitDescription && p.unitDescription.toLowerCase().includes(q)) ||
        (p.variations && p.variations.some((v) => v.toLowerCase().includes(q)));
        
      // Stock Filter
      let matchStock = true;
      if (selectedStockFilter !== 'Semua') {
        const totalStock = p.variationsStock ? Object.values(p.variationsStock).reduce((a: number, b: number) => Number(a) + Number(b), 0) : p.stock;
        if (selectedStockFilter === 'Tersedia') matchStock = totalStock > 10;
        if (selectedStockFilter === 'Terbatas') matchStock = totalStock > 0 && totalStock <= 10;
        if (selectedStockFilter === 'Habis') matchStock = totalStock === 0;
      }
      
      // Status Filter
      let matchStatus = true;
      if (selectedStatusFilter !== 'Semua') {
        if (selectedStatusFilter === 'Baru') {
          // Assume new if added recently, or we can use a mock logic. Just checking if ID is recent or has 'prod' 
          matchStatus = p.id.includes('prod'); // Example fallback logic, better to have actual date
        }
        if (selectedStatusFilter === 'Aktif') matchStatus = p.isAvailable;
        if (selectedStatusFilter === 'Unggulan') matchStatus = p.isAvailable; // placeholder
        if (selectedStatusFilter === 'Diskon') matchStatus = p.hasMemberDiscount || p.hasVisitorDiscount;
      }

      return matchCategory && matchSearch && matchStock && matchStatus;
    });

    // 2. Sort
    result.sort((a, b) => {
      const statsA = productStats[a.id] || { views: 0, adds: 0, saves: 0, orders: 0, select: 0, score: 0 };
      const statsB = productStats[b.id] || { views: 0, adds: 0, saves: 0, orders: 0, select: 0, score: 0 };

      switch (sortBy) {
        case 'Paling Menarik':
          return statsB.score - statsA.score;
        case 'Paling Populer':
        case 'Paling Banyak Dilihat':
          return statsB.views - statsA.views;
        case 'Paling Banyak Dipilih':
          return statsB.select - statsA.select;
        case 'Paling Banyak Masuk Keranjang':
          return statsB.adds - statsA.adds;
        case 'Paling Banyak Disimpan':
          return statsB.saves - statsA.saves;
        case 'Paling Banyak Dibuat Pesanan':
          return statsB.orders - statsA.orders;
        case 'Terbaru':
          // Mock new sorting, in real app use createdAt
          return b.id.localeCompare(a.id);
        case 'Harga Terendah':
          return a.price - b.price;
        case 'Harga Tertinggi':
          return b.price - a.price;
        case 'Nama A-Z':
          return a.name.localeCompare(b.name);
        case 'Nama Z-A':
          return b.name.localeCompare(a.name);
        case 'Rekomendasi':
        default:
          // Default sorting: combines explicit manual sorting with performance score
          return statsB.score - statsA.score;
      }
    });

    return result;
  }, [products, selectedCategory, searchQuery, selectedStockFilter, selectedStatusFilter, sortBy, productStats]);

  const handleSelectVariation = (productId: string, variation: string) => {
    setSelectedVariations((prev) => ({
      ...prev,
      [productId]: variation,
    }));
    const product = products.find(p => p.id === productId);
    if (product) {
      trackEvent('variation_select', {
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        variation: variation,
        source: 'Katalog Produk'
      });
    }
  };

  const handleOpenQuantityModal = (product: Product, defaultVar?: string) => {
    const chosenVar = defaultVar || selectedVariations[product.id] || (product.variations && product.variations[0]) || 'Standar';
    const availableStock = getProductStock(product, chosenVar);
    if (availableStock <= 0 || !product.isAvailable) {
      return;
    }
    setQuantityModalProduct(product);
    setModalVariation(chosenVar);
    setModalQuantity(1);
  };

  const handleConfirmAddToCart = () => {
    if (!quantityModalProduct) return;
    
    const availableStock = getProductStock(quantityModalProduct, modalVariation);
    const validQty = Math.max(1, Math.min(modalQuantity, availableStock > 0 ? availableStock : 1));
    
    addToCart(quantityModalProduct, modalVariation, validQty);

    trackEvent('add_to_cart', {
      productId: quantityModalProduct.id,
      productName: quantityModalProduct.name,
      productCategory: quantityModalProduct.category,
      variation: modalVariation,
      quantity: validQty,
      price: modalPricing?.activeUnitPrice || quantityModalProduct.price,
      source: 'Katalog Produk'
    });

    // Visual animation feedback on product card
    setAddedAnimation((prev) => ({ ...prev, [quantityModalProduct.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [quantityModalProduct.id]: false }));
    }, 2000);

    // Toast notification
    setCartSuccessToast({
      show: true,
      message: `Berhasil menambahkan ${validQty} unit "${quantityModalProduct.name} (${modalVariation})" ke keranjang belanja!`,
    });
    setTimeout(() => {
      setCartSuccessToast(null);
    }, 3500);

    setQuantityModalProduct(null);
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Perhitungan Harga & Stok untuk Modal Opsi Pemilihan Jumlah Produk
  const modalPricing = useMemo(() => {
    if (!quantityModalProduct) return null;

    const currentStock = getProductStock(quantityModalProduct, modalVariation);

    // 1. Diskon Anggota
    let memberPrice: number | undefined = undefined;
    let hasMemberDiscount = false;
    let memberDiscountBadgeText = '';

    if (quantityModalProduct.hasMemberDiscount && quantityModalProduct.memberDiscountValue && quantityModalProduct.memberDiscountValue > 0) {
      hasMemberDiscount = true;
      if (quantityModalProduct.memberDiscountType === 'percentage') {
        const cut = Math.round((quantityModalProduct.price * quantityModalProduct.memberDiscountValue) / 100);
        memberPrice = Math.max(0, quantityModalProduct.price - cut);
        memberDiscountBadgeText = `Diskon Anggota ${quantityModalProduct.memberDiscountValue}%`;
      } else {
        memberPrice = Math.max(0, quantityModalProduct.price - quantityModalProduct.memberDiscountValue);
        memberDiscountBadgeText = `Diskon Anggota Rp ${quantityModalProduct.memberDiscountValue.toLocaleString('id-ID')}`;
      }
    }

    // 2. Diskon Pengunjung
    let visitorPrice: number | undefined = undefined;
    let hasVisitorDiscount = false;
    let visitorDiscountBadgeText = '';

    if (quantityModalProduct.hasVisitorDiscount && quantityModalProduct.visitorDiscountValue && quantityModalProduct.visitorDiscountValue > 0) {
      hasVisitorDiscount = true;
      if (quantityModalProduct.visitorDiscountType === 'percentage') {
        const cut = Math.round((quantityModalProduct.price * quantityModalProduct.visitorDiscountValue) / 100);
        visitorPrice = Math.max(0, quantityModalProduct.price - cut);
        visitorDiscountBadgeText = `Diskon Pengunjung ${quantityModalProduct.visitorDiscountValue}%`;
      } else {
        visitorPrice = Math.max(0, quantityModalProduct.price - quantityModalProduct.visitorDiscountValue);
        visitorDiscountBadgeText = `Diskon Pengunjung Rp ${quantityModalProduct.visitorDiscountValue.toLocaleString('id-ID')}`;
      }
    }

    let activeUnitPrice = quantityModalProduct.price;
    let activeBadge = '';
    let isDiscounted = false;

    if (isMember) {
      if (hasMemberDiscount && memberPrice !== undefined) {
        activeUnitPrice = memberPrice;
        activeBadge = memberDiscountBadgeText;
        isDiscounted = true;
      }
    } else {
      if (hasVisitorDiscount && visitorPrice !== undefined) {
        activeUnitPrice = visitorPrice;
        activeBadge = visitorDiscountBadgeText;
        isDiscounted = true;
      }
    }

    const subtotal = activeUnitPrice * modalQuantity;

    return {
      currentStock,
      isOutOfStock: currentStock <= 0 || !quantityModalProduct.isAvailable,
      normalPrice: quantityModalProduct.price,
      activeUnitPrice,
      subtotal,
      isDiscounted,
      activeBadge,
      hasMemberDiscount,
      memberPrice,
      hasVisitorDiscount,
      visitorPrice,
    };
  }, [quantityModalProduct, modalVariation, modalQuantity, isMember]);

  // Filter active promotions for banner strictly by current audience (Member vs Visitor)
  const activePromoList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeAudiencePromotions.filter((promo) => {
      if (!promo.isActive) return false;
      if (promo.startDate && today < promo.startDate) return false;
      if (promo.endDate && today > promo.endDate) return false;
      return true;
    });
  }, [activeAudiencePromotions]);

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* 🏠 TOP NAVIGATION: Tombol Jelas 'Kembali ke Beranda' untuk Anggota & Pengunjung */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border-2 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToHome}
          id="btn-back-to-home-top"
          type="button"
          className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-700 text-white font-black text-sm shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95 border border-slate-800 hover:border-red-600"
          title="Kembali ke Halaman Beranda Utama"
        >
          <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-4 h-4 text-white" />
          </div>
          <Home className="w-4 h-4 text-amber-400" />
          <span className="tracking-wide">Kembali ke Beranda</span>
        </button>

        {/* Cart Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCart}
            id="btn-catalog-top-cart"
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs cursor-pointer transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang</span>
          </button>
        </div>
      </div>

      {/* Top Banner & Title */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Katalog Sembako Lengkap & Promo Berhadiah</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Pilihan Sembako Berkualitas & Berhadiah
        </h2>
        <p className="text-sm text-slate-600">
          Tersedia Promo Hadiah Gratis Terpisah: <span className="font-bold text-emerald-700">Khusus Anggota</span> & <span className="font-bold text-red-700">Khusus Pengunjung</span>!
        </p>
      </div>

      {/* 🎁 PROMO TICKER / SHOWCASE BAR DENGAN STATUS PELANGGAN */}
      {activePromoList.length > 0 && (
        <div className={`p-4 rounded-2xl shadow-md text-white transition-colors ${
          isMember 
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700' 
            : 'bg-gradient-to-r from-amber-500 via-red-600 to-rose-600'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 pb-2 border-b border-white/20">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-200 animate-pulse" />
              <div>
                <h3 className="text-sm font-black tracking-wide flex items-center gap-1.5">
                  <span>{isMember ? '👤 🎁 PROMO BONUS KHUSUS ANGGOTA AKTIF' : '👥 🎁 PROMO BONUS KHUSUS AKUN BASIC'}</span>
                </h3>
                <p className="text-[11px] text-white/90">
                  {isMember 
                    ? 'Status Anda: 👤 ANGGOTA RESMI (Sudah Login) • Promo & bonus khusus anggota otomatis diterapkan' 
                    : 'Status Anda: 👥 AKUN BASIC (Belum Login Anggota) • Promo khusus akun Basic otomatis diterapkan'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
              {activePromoList.length} Program Promo {isMember ? 'Anggota' : 'Basic'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {activePromoList.slice(0, 6).map((p) => (
              <div 
                key={p.id}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-xs p-2.5 rounded-xl border border-white/15 transition-all flex items-center gap-2"
              >
                <div className="text-xl shrink-0">{p.rewardProductEmoji || '🎁'}</div>
                <div className="min-w-0">
                  <div className="font-extrabold truncate text-amber-100">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-white/90 truncate">
                    Beli min. {p.minQty} {p.buyProductName} ({p.buyVariation || 'Semua'}) → Gratis {p.rewardQty}x {p.rewardProductName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚚 STATUS PENGIRIMAN & ONGKOS KIRIM KOPDES BERBASIS PETA */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Pengantaran Sembako Berbasis Peta & Rute Jalan</span>
                <span className="text-[10px] font-extrabold bg-red-100 text-red-800 px-2 py-0.5 rounded-md">
                  Rp5.000 / km
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Dihitung otomatis dari gerai Kopdes Cengkareng Timur ke alamat tujuan Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeliveryPicker(!showDeliveryPicker)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>{showDeliveryPicker ? 'Tutup Peta' : 'Ubah Alamat Tujuan'}</span>
            </button>
            {totalPaidItems > 0 && (
              <button
                onClick={onOpenCart}
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Lihat Keranjang ({totalPaidItems})</span>
              </button>
            )}
          </div>
        </div>

        {showDeliveryPicker && (
          <div className="pt-2 pb-3 border-b border-slate-100">
            <DeliveryAddressPicker onOpenAuth={onOpenAuth} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
              📍 Alamat Kopdes (Titik Asal)
            </span>
            <span className="font-bold text-slate-800 block truncate" title={kopdesOrigin.address}>
              {kopdesOrigin.address}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
              🏠 Alamat Pelanggan (Tujuan)
            </span>
            <span className="font-bold text-slate-800 block truncate" title={deliveryAddress}>
              {deliveryAddress}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
              📏 Jarak Rute & Penagihan
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-900">{actualDistanceKm.toFixed(1)} km</span>
              <span className="text-[11px] text-slate-500 font-semibold">
                (ditagih: <strong className="text-red-700">{billedDistanceKm} km</strong>)
              </span>
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-xl border border-red-200">
            <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider block mb-0.5">
              💰 Ongkos Kirim Otomatis
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-black text-red-700 text-sm">{formatRupiah(shippingFee)}</span>
              <span className="text-[10px] text-red-600 font-semibold">Rp5.000 × {billedDistanceKm}km</span>
            </div>
          </div>
        </div>

        {totalPaidItems > 0 && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl">
            <div className="flex items-center gap-3 text-slate-600">
              <span>🛍️ Subtotal Belanja: <strong className="text-slate-900">{formatRupiah(subtotal)}</strong></span>
              <span>•</span>
              <span>🚚 Ongkir: <strong className="text-red-700">+{formatRupiah(shippingFee)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">💵 Total Pembayaran:</span>
              <span className="font-black text-emerald-700 text-sm bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        
        {/* Search Box */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="catalog-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari beras, minyak, aqua, le minerale, kopi, mie, gula, kemasan 1 kg, 500 ml..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Bersihkan
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Pill Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-[300px]">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 pl-1">
              <Filter className="w-3.5 h-3.5" /> Kategori:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Advanced Filter & Sort */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
              <span className="font-semibold text-slate-500">Stok:</span>
              <select
                value={selectedStockFilter}
                onChange={(e) => setSelectedStockFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="Semua">Semua</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Terbatas">Terbatas</option>
                <option value="Habis">Habis</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
              <span className="font-semibold text-slate-500">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="Semua">Semua</option>
                <option value="Baru">Terbaru</option>
                <option value="Aktif">Aktif</option>
                <option value="Diskon">Ada Diskon</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg ml-auto">
              <span className="font-semibold text-amber-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Sortir:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-amber-900 outline-none cursor-pointer"
              >
                <option value="Rekomendasi">Rekomendasi Terbaik</option>
                <option value="Paling Menarik">Paling Menarik (Skor)</option>
                <option value="Paling Populer">Paling Populer (Dilihat)</option>
                <option value="Paling Banyak Dipilih">Paling Banyak Dipilih</option>
                <option value="Paling Banyak Masuk Keranjang">Sering Masuk Keranjang</option>
                <option value="Paling Banyak Dibuat Pesanan">Paling Banyak Dipesan</option>
                <option value="Paling Banyak Disimpan">Paling Banyak Disimpan</option>
                <option value="Terbaru">Produk Baru Ditambahkan</option>
                <option value="Harga Terendah">Harga Terendah</option>
                <option value="Harga Tertinggi">Harga Tertinggi</option>
                <option value="Nama A-Z">Nama A-Z</option>
                <option value="Nama Z-A">Nama Z-A</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Menyinkronkan data produk dari Firestore...</p>
        </div>
      ) : processedProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="text-base font-extrabold text-slate-900">Produk Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tidak ada produk yang cocok dengan kata kunci "{searchQuery}". Coba gunakan kata kunci lain atau pilih kategori "Semua".
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Semua');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Reset Pencarian
            </button>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-red-700 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span>Kembali ke Beranda</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {processedProducts.map((product) => {
            const currentVar =
              selectedVariations[product.id] ||
              (product.variations && product.variations[0]) ||
              'Standar';
            const isJustAdded = addedAnimation[product.id];

            // 1. Periksa Promo Gratis untuk produk ini (HANYA DARI activePromoList KELOMPOK PELANGGAN AKTIF)
            const matchedPromos = activePromoList.filter((promo) => {
              const matchId = promo.buyProductId === product.id ||
                product.id.toLowerCase().includes(promo.buyProductId.toLowerCase()) ||
                promo.buyProductId.toLowerCase().includes(product.id.toLowerCase());
              const matchName = product.name.toLowerCase().includes(promo.buyProductName.toLowerCase()) ||
                promo.buyProductName.toLowerCase().includes(product.name.toLowerCase());
              return matchId || matchName;
            });

            // 2. Hitung Diskon Anggota
            const hasMemberDiscount = Boolean(
              product.hasMemberDiscount &&
              product.memberDiscountValue &&
              product.memberDiscountValue > 0
            );

            let memberPrice = product.price;
            let memberDiscountBadgeText = '';
            if (hasMemberDiscount) {
              if (product.memberDiscountType === 'percentage') {
                const cut = Math.round((product.price * (product.memberDiscountValue || 0)) / 100);
                memberPrice = Math.max(0, product.price - cut);
                memberDiscountBadgeText = `Diskon ${product.memberDiscountValue}% (Anggota)`;
              } else {
                memberPrice = Math.max(0, product.price - (product.memberDiscountValue || 0));
                memberDiscountBadgeText = `Diskon Rp ${(product.memberDiscountValue || 0).toLocaleString('id-ID')} (Anggota)`;
              }
            }

            // 3. Hitung Diskon Pengunjung (Terpisah dari Diskon Anggota)
            const hasVisitorDiscount = Boolean(
              product.hasVisitorDiscount &&
              product.visitorDiscountValue &&
              product.visitorDiscountValue > 0
            );

            let visitorPrice = product.price;
            let visitorDiscountBadgeText = '';
            if (hasVisitorDiscount) {
              if (product.visitorDiscountType === 'percentage') {
                const cut = Math.round((product.price * (product.visitorDiscountValue || 0)) / 100);
                visitorPrice = Math.max(0, product.price - cut);
                visitorDiscountBadgeText = `Diskon ${product.visitorDiscountValue}% (Pengunjung)`;
              } else {
                visitorPrice = Math.max(0, product.price - (product.visitorDiscountValue || 0));
                visitorDiscountBadgeText = `Diskon Rp ${(product.visitorDiscountValue || 0).toLocaleString('id-ID')} (Pengunjung)`;
              }
            }

            // 4. Prioritas Sistem Harga:
            // - Sudah login anggota -> Diskon Anggota jika aktif, else Harga Normal
            // - Belum login anggota -> Diskon Pengunjung jika aktif, else Harga Normal
            let activePrice = product.price;
            if (isMember) {
              activePrice = hasMemberDiscount ? memberPrice : product.price;
            } else {
              activePrice = hasVisitorDiscount ? visitorPrice : product.price;
            }

            return (
              <div
                key={product.id}
                id={`product-card-${product.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-red-200 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Product Image / Emoji Card Header */}
                <div 
                  onClick={() => {
                    setZoomedProduct(product);
                    trackEvent('product_click', {
                      productId: product.id,
                      productName: product.name,
                      productCategory: product.category,
                      variation: currentVar,
                      source: 'Katalog Produk'
                    });
                  }}
                  className="relative h-48 bg-gradient-to-br from-red-50/70 via-slate-50 to-amber-50/50 flex items-center justify-center p-4 border-b border-slate-100 select-none cursor-pointer group/img"
                  title="Klik untuk memperbesar foto produk"
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300 drop-shadow-sm"
                    />
                  ) : (
                    <span className="text-7xl group-hover/img:scale-110 transition-transform duration-300">
                      {product.emoji || '📦'}
                    </span>
                  )}

                  {/* Zoom Overlay Hint on Hover */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-slate-900/80 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                      Perbesar Foto
                    </span>
                  </div>

                  {/* Top Left Badges: Promo and Recommendations */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1">
                    {/* 🎁 Promo Badge */}
                    {matchedPromos.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                        <Gift className="w-3 h-3" />
                        <span>🎁 GRATIS BONUS</span>
                      </span>
                    )}
                    
                    {/* Recommendation / Stats Badges based on sort selection or stats */}
                    {(sortBy === 'Paling Menarik' || sortBy === 'Rekomendasi') && (productStats[product.id]?.score || 0) > 50 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black shadow-sm">
                        <span>🔥 Paling Menarik</span>
                      </span>
                    )}
                    {sortBy === 'Paling Populer' && (productStats[product.id]?.views || 0) > 10 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-sm">
                        <span>👀 {productStats[product.id].views} Dilihat</span>
                      </span>
                    )}
                    {sortBy === 'Paling Banyak Masuk Keranjang' && (productStats[product.id]?.adds || 0) > 5 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                        <span>🛒 {productStats[product.id].adds} di Keranjang</span>
                      </span>
                    )}
                    {sortBy === 'Paling Banyak Disimpan' && (productStats[product.id]?.saves || 0) > 2 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-600 text-white text-[10px] font-black shadow-sm">
                        <span>❤️ {productStats[product.id].saves} Disimpan</span>
                      </span>
                    )}
                    {sortBy === 'Paling Banyak Dibuat Pesanan' && (productStats[product.id]?.orders || 0) > 2 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600 text-white text-[10px] font-black shadow-sm">
                        <span>🛍️ {productStats[product.id].orders} Terjual</span>
                      </span>
                    )}
                    {sortBy === 'Terbaru' && product.id.includes('prod') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black shadow-sm">
                        <span>🆕 Baru</span>
                      </span>
                    )}
                  </div>

                  {/* Price Tag di Atas Gambar */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-10">
                    {/* Saved Product Button (Anggota Only) */}
                    {isMember && (
                      <button
                        onClick={(e) => handleToggleSaveProduct(e, product, currentVar)}
                        title={savedProducts[product.id] ? 'Hapus dari Tersimpan' : 'Simpan Produk'}
                        className={`p-1.5 rounded-full shadow-sm backdrop-blur-md transition-all cursor-pointer ${
                          savedProducts[product.id]
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-white/70 text-slate-400 hover:text-red-500 hover:bg-white border border-slate-200/50'
                        }`}
                      >
                        <Heart className="w-4 h-4" fill={savedProducts[product.id] ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    <div className={`text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 ${
                      isMember 
                        ? (hasMemberDiscount ? 'bg-emerald-600' : 'bg-slate-800')
                        : (hasVisitorDiscount ? 'bg-red-600' : 'bg-slate-800')
                    }`}>
                      <Tag className="w-3 h-3" />
                      <span>{formatRupiah(activePrice)}</span>
                    </div>
                  </div>

                  {/* Category Tag */}
                  <div className="absolute bottom-2 left-3 bg-white/90 backdrop-blur-xs text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                    {product.category || 'Sembako'}
                  </div>

                  {/* Staff Quick Edit Icon */}
                  {isStaff && onEditProductInAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProductInAdmin(product);
                      }}
                      title="Edit produk ini di Panel Karyawan"
                      className="absolute bottom-2 right-3 p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs text-xs font-bold flex items-center gap-1 opacity-90 hover:opacity-100 z-10 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Edit</span>
                    </button>
                  )}
                </div>

                {/* Product Details & Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-red-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {product.unitDescription || 'Produk kebutuhan pokok Koperasi Merah Putih.'}
                    </p>

                    {/* 🎁 BADGE PROMO SPESIFIK */}
                    {matchedPromos.length > 0 && (
                      <div className="mt-2.5 p-2 bg-gradient-to-r from-amber-50 to-red-50 border border-amber-300/80 rounded-xl space-y-1">
                        <div className="text-[11px] font-black text-amber-900 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">🎁 {matchedPromos[0].name}</span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                            isMember ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isMember ? 'Promo Anggota' : 'Promo Pengunjung'}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-800 font-semibold">
                          Beli min. {matchedPromos[0].minQty} pcs ({matchedPromos[0].buyVariation || 'Semua Variasi'}) otomatis dapat {matchedPromos[0].rewardQty}x <strong>{matchedPromos[0].rewardProductName} ({matchedPromos[0].rewardVariation}) GRATIS (Rp0)</strong> di keranjang.
                        </p>
                      </div>
                    )}

                    {/* BLOK HARGA RESMI & DISKON (PENGUNJUNG VS ANGGOTA) */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                      {!isMember ? (
                        /* ================= TAMPILAN PENGUNJUNG (BELUM LOGIN) ================= */
                        <div className="space-y-1">
                          {hasVisitorDiscount ? (
                            <div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">Harga Normal:</span>
                                <del className="text-slate-400 font-bold line-through">
                                  {formatRupiah(product.price)}
                                </del>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs font-black text-red-700">Harga Pengunjung:</span>
                                <span className="text-lg font-black text-red-600">
                                  {formatRupiah(visitorPrice)}
                                </span>
                              </div>
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-800 text-[10px] font-extrabold border border-red-200">
                                  <span>🎉 {visitorDiscountBadgeText}</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-slate-500 font-bold">Harga:</span>
                              <span className="text-base font-black text-slate-900">{formatRupiah(product.price)}</span>
                            </div>
                          )}

                          {/* Keterangan diskon anggota terkunci */}
                          {hasMemberDiscount && (
                            <div className="mt-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-semibold text-slate-600 flex items-start gap-1">
                              <Lock className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <span>Harga khusus Anggota: <strong className="text-emerald-700 font-extrabold">{formatRupiah(memberPrice)}</strong> (Login untuk nikmati).</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ================= TAMPILAN ANGGOTA (SUDAH LOGIN) ================= */
                        <div className="space-y-1">
                          {hasMemberDiscount ? (
                            <div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">Harga Normal:</span>
                                <del className="text-slate-400 font-bold line-through">
                                  {formatRupiah(product.price)}
                                </del>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs font-black text-emerald-800">Harga Anggota:</span>
                                <span className="text-lg font-black text-emerald-700">
                                  {formatRupiah(memberPrice)}
                                </span>
                              </div>
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                                  <span>🏷️ {memberDiscountBadgeText}</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-slate-500 font-bold">Harga Normal:</span>
                              <span className="text-base font-black text-slate-900">{formatRupiah(product.price)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ⭐ Label Point Pembelian di Katalog */}
                      {(() => {
                        const calculatedPoints = calculateProductPoints(
                          product.id,
                          currentVar,
                          activePrice,
                          1,
                          isMember ? 'member' : 'basic'
                        );
                        if (calculatedPoints <= 0) return null;
                        return (
                          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-900 text-xs font-black shadow-2xs">
                            <span className="text-amber-600">⭐</span>
                            <span>DAPAT {calculatedPoints} POINT</span>
                            <span className="text-[10px] text-amber-700 font-semibold ml-auto">
                              {isMember ? 'Anggota' : 'Basic'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ⭐ Rating, Love & Sold Count Bar */}
                  <div className="flex items-center justify-between text-xs py-1.5 border-y border-slate-100 my-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewModalProduct(product);
                      }}
                      className="flex items-center gap-1 hover:opacity-85 transition-opacity cursor-pointer"
                      title="Lihat ulasan & beri rating"
                    >
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <span className="font-extrabold text-slate-800">
                        {getProductRatingStats(product.id).averageRating > 0 ? getProductRatingStats(product.id).averageRating : '0.0'}
                      </span>
                      <span className="text-slate-400 font-medium">({getProductRatingStats(product.id).reviewCount})</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Terjual {getProductSoldCount(product.id, product.name)}
                      </span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user) {
                            if (onOpenAuth) onOpenAuth();
                            return;
                          }
                          await toggleProductLove(product.id);
                        }}
                        className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                          hasUserLovedProduct(product.id)
                            ? 'bg-pink-50 text-pink-600 border border-pink-200'
                            : 'bg-slate-100 text-slate-400 hover:text-pink-500 hover:bg-pink-50'
                        }`}
                        title={hasUserLovedProduct(product.id) ? 'Hapus dari Favorit' : 'Sukai Produk (Love)'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasUserLovedProduct(product.id) ? 'fill-current text-pink-500' : ''}`} />
                        <span className="text-[10px] font-black">{getProductLoveCount(product.id)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Ulas Produk Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewModalProduct(product);
                    }}
                    className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer mb-2"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                    <span>⭐ Ulas Produk</span>
                  </button>

                  <div className="space-y-2.5 pt-1">
                    {/* Variation Selector & Stock Display */}
                    {(() => {
                      const currentStock = getProductStock(product, currentVar);
                      const isOutOfStock = currentStock <= 0 || !product.isAvailable;

                      return (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                                Ukuran / Variasi:
                              </label>
                              {/* Stock status badge per variation */}
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                currentStock > 0 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                              }`}>
                                {currentStock > 0 ? `🟢 Stok: ${currentStock}` : '🔴 Stok Habis'}
                              </span>
                            </div>

                            <select
                              value={currentVar}
                              onChange={(e) => handleSelectVariation(product.id, e.target.value)}
                              className="w-full text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors cursor-pointer"
                            >
                              {product.variations && product.variations.length > 0 ? (
                                product.variations.map((v) => {
                                  const vStock = getProductStock(product, v);
                                  return (
                                    <option key={v} value={v}>
                                      {v} {vStock > 0 ? `(Stok: ${vStock})` : '(Stok Habis)'}
                                    </option>
                                  );
                                })
                              ) : (
                                <option value="Standar">Standar</option>
                              )}
                            </select>
                          </div>

                          {/* Add to Cart Button with Quantity Selection Option */}
                          <button
                            id={`btn-add-cart-${product.id}`}
                            onClick={() => handleOpenQuantityModal(product, currentVar)}
                            disabled={isOutOfStock}
                            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isOutOfStock
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                                : isJustAdded
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-xs'
                            }`}
                          >
                            {isOutOfStock ? (
                              <>
                                <span>🔴 Stok Habis / Tidak Tersedia</span>
                              </>
                            ) : isJustAdded ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Berhasil Ditambahkan!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4" />
                                <span>+ Keranjang ({formatRupiah(activePrice)})</span>
                              </>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🏠 BOTTOM NAVIGATION: Tombol Jelas 'Kembali ke Beranda' di Bagian Bawah Katalog */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black">
              <Home className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-black text-slate-900">
              Selesai Melihat Katalog Produk?
            </h4>
          </div>
          <p className="text-xs text-slate-600 max-w-xl">
            Anda dapat kembali ke beranda kapan saja untuk melihat profil koperasi, informasi layanan desa, slider pengumuman, atau promo lainnya.
          </p>
        </div>

        <button
          onClick={onBackToHome}
          id="btn-back-to-home-bottom"
          type="button"
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-red-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-95 shrink-0 border border-slate-800 hover:border-red-600"
        >
          <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-4 h-4 text-white" />
          </div>
          <Home className="w-4 h-4 text-amber-400" />
          <span className="tracking-wide">Kembali ke Beranda</span>
        </button>
      </div>

      {/* Zoomed Image & Media Modal (Read-Only Detail View for Members & Guests) */}
      {zoomedProduct && (
        <div 
          onClick={() => setZoomedProduct(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  {zoomedProduct.category || 'Produk'}
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm truncate max-w-[280px]">
                  {zoomedProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setZoomedProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Media Switcher Tabs (Photos vs Video) */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveMediaTab('photos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'photos'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Foto ({zoomedProduct.images?.length || (zoomedProduct.imageUrl ? 1 : 0)})</span>
                  </button>

                  {zoomedProduct.videoUrl && (
                    <button
                      onClick={() => setActiveMediaTab('video')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeMediaTab === 'video'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Video Preview</span>
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-400">
                  Akses Read-Only Pelanggan
                </span>
              </div>

              {/* Media Content Display */}
              {activeMediaTab === 'photos' ? (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-slate-50 via-white to-red-50/30 rounded-2xl p-4 flex items-center justify-center min-h-[260px] border border-slate-100">
                    {(() => {
                      const allPhotos = (zoomedProduct.images && zoomedProduct.images.length > 0)
                        ? zoomedProduct.images
                        : (zoomedProduct.imageUrl ? [zoomedProduct.imageUrl] : []);
                      
                      const currentPhoto = allPhotos[activePhotoIndex] || zoomedProduct.imageUrl;

                      return currentPhoto ? (
                        <img
                          src={currentPhoto}
                          alt={zoomedProduct.name}
                          className="max-h-[300px] w-auto object-contain rounded-xl shadow-md"
                        />
                      ) : (
                        <div className="text-8xl py-8">
                          {zoomedProduct.emoji || '📦'}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Thumbnails list if multi-photo */}
                  {zoomedProduct.images && zoomedProduct.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {zoomedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                            activePhotoIndex === idx
                              ? 'border-red-600 ring-2 ring-red-200'
                              : 'border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Video Player Preview */
                <div className="bg-black/90 rounded-2xl p-2 min-h-[260px] flex flex-col items-center justify-center text-white space-y-2">
                  {zoomedProduct.videoUrl ? (
                    <video
                      src={zoomedProduct.videoUrl}
                      controls
                      autoPlay
                      className="w-full max-h-[300px] rounded-xl object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <Film className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Tidak ada video preview untuk produk ini.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status Stok per Variasi (Read-Only Table) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-red-600" />
                  <span>Informasi Stok per Variasi Ukuran:</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {zoomedProduct.variations && zoomedProduct.variations.length > 0 ? (
                    zoomedProduct.variations.map((v) => {
                      const vStock = getProductStock(zoomedProduct, v);
                      return (
                        <div key={v} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="font-bold text-slate-800">{v}</span>
                          <span className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                            vStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {vStock > 0 ? `${vStock} item` : 'Stok Habis'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between col-span-2">
                      <span className="font-bold text-slate-800">Standar</span>
                      <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                        {getProductStock(zoomedProduct, 'Standar')} item
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs text-slate-500 font-medium">Harga Produk:</div>
                <div className="text-lg font-black text-red-600">
                  {formatRupiah(zoomedProduct.price)}
                </div>
              </div>
              <button
                onClick={() => {
                  handleOpenQuantityModal(zoomedProduct);
                  setZoomedProduct(null);
                }}
                disabled={!zoomedProduct.isAvailable}
                className="px-5 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ Pilih Jumlah & Masukkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛒 MODAL OPSI PEMILIHAN JUMLAH PRODUK (MUNCUL SETIAP KALI KLIK +KERANJANG) */}
      {quantityModalProduct && modalPricing && (
        <div 
          onClick={() => setQuantityModalProduct(null)}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp max-h-[92vh] flex flex-col"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    Pilih Jumlah ke Keranjang
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tentukan jumlah produk yang mau dimasukkan ke keranjang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuantityModalProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Modal: Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Ringkasan Produk Terpilih */}
              <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {quantityModalProduct.imageUrl || (quantityModalProduct.images && quantityModalProduct.images[0]) ? (
                    <img 
                      src={quantityModalProduct.imageUrl || quantityModalProduct.images?.[0]} 
                      alt={quantityModalProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-3xl">{quantityModalProduct.emoji || '📦'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700">
                      {quantityModalProduct.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {quantityModalProduct.unitDescription || 'Satuan Standar'}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                    {quantityModalProduct.name}
                  </h4>

                  {/* Harga Satuan Aktif */}
                  <div className="pt-0.5">
                    {modalPricing.isDiscounted ? (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-black text-emerald-700">
                          {formatRupiah(modalPricing.activeUnitPrice)}
                        </span>
                        <del className="text-xs text-slate-400 line-through">
                          {formatRupiah(modalPricing.normalPrice)}
                        </del>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-slate-900">
                        {formatRupiah(modalPricing.normalPrice)}
                      </span>
                    )}
                    {modalPricing.activeBadge && (
                      <span className="inline-block mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🏷️ {modalPricing.activeBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pilihan Variasi / Ukuran Produk (Jika Tersedia) */}
              {quantityModalProduct.variations && quantityModalProduct.variations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-red-600" />
                      <span>Variasi / Ukuran:</span>
                    </label>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      modalPricing.currentStock > 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {modalPricing.currentStock > 0 ? `🟢 Stok: ${modalPricing.currentStock} unit` : '🔴 Stok Habis'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {quantityModalProduct.variations.map((v) => {
                      const vStock = getProductStock(quantityModalProduct, v);
                      const isSelected = modalVariation === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setModalVariation(v);
                            const maxSt = Math.max(1, vStock);
                            if (modalQuantity > maxSt) {
                              setModalQuantity(maxSt);
                            }
                          }}
                          className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{v}</span>
                          <span className={`text-[10px] font-black ${vStock > 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                            {vStock > 0 ? `${vStock} unit` : 'Habis'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kontrol Pemilihan Jumlah (Bisa Dikurangi / Ditambah) */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border-2 border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-900">
                      Jumlah yang Mau Dimasukkan:
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Gunakan tombol (-) atau (+) untuk mengatur jumlah
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Maks: <b className="text-emerald-700">{modalPricing.currentStock} unit</b>
                  </span>
                </div>

                {/* Tombol Kurangi (-) dan Tombol Tambah (+) Jelas */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={modalQuantity <= 1}
                    onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 hover:border-red-500 hover:bg-red-50 text-slate-800 hover:text-red-600 font-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-90"
                    title="Kurangi jumlah (-)"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      min={1}
                      max={modalPricing.currentStock}
                      value={modalQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) {
                          setModalQuantity(1);
                        } else {
                          setModalQuantity(Math.min(modalPricing.currentStock, Math.max(1, val)));
                        }
                      }}
                      className="w-24 text-center font-black text-2xl py-2 px-2 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-slate-900 shadow-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                      {quantityModalProduct.unitDescription || 'Unit'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={modalQuantity >= modalPricing.currentStock}
                    onClick={() => setModalQuantity((prev) => Math.min(modalPricing.currentStock, prev + 1))}
                    className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 hover:text-emerald-600 font-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-90"
                    title="Tambah jumlah (+)"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Tombol Pilihan Tambah Cepat (+1, +2, +5, +10, Maksimal) */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Tambah Cepat:</span>
                  {[1, 2, 5, 10].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        setModalQuantity((prev) => Math.min(modalPricing.currentStock, Math.max(1, prev + inc)));
                      }}
                      disabled={modalQuantity + inc > modalPricing.currentStock}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 text-[11px] font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs active:scale-95"
                    >
                      +{inc}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalPricing.currentStock)}
                    disabled={modalQuantity === modalPricing.currentStock || modalPricing.currentStock <= 0}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-[11px] font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                  >
                    Semua ({modalPricing.currentStock})
                  </button>
                </div>

                {modalQuantity >= modalPricing.currentStock && (
                  <div className="text-[11px] font-extrabold text-amber-800 bg-amber-100/90 px-3 py-1.5 rounded-xl text-center border border-amber-300">
                    ⚠️ Anda telah memilih jumlah maksimal stok yang tersedia ({modalPricing.currentStock} unit).
                  </div>
                )}
              </div>

              {/* Rincian Subtotal Belanja */}
              <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <span>Harga per unit:</span>
                  <span>{formatRupiah(modalPricing.activeUnitPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <span>Jumlah yang dipilih:</span>
                  <span className="font-black text-slate-900">{modalQuantity} unit</span>
                </div>
                <div className="border-t border-emerald-200/80 pt-2 flex items-baseline justify-between">
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Total Subtotal:
                  </span>
                  <span className="text-xl font-black text-emerald-800">
                    {formatRupiah(modalPricing.subtotal)}
                  </span>
                </div>
              </div>

              {/* ⭐ Estimasi Point Perolehan untuk Produk Ini */}
              {(() => {
                const totalEstimatedPts = calculateProductPoints(
                  quantityModalProduct.id,
                  modalVariation,
                  modalPricing.activeUnitPrice,
                  modalQuantity,
                  isMember ? 'member' : 'basic'
                );
                if (totalEstimatedPts <= 0) return null;
                return (
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <span className="text-base">⭐</span>
                      <span>
                        Beli produk ini dan dapatkan <strong>+{totalEstimatedPts} Point</strong> setelah pesanan selesai.
                      </span>
                    </div>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                      {isMember ? 'Point Anggota' : 'Point Basic'}
                    </span>
                  </div>
                );
              })()}

            </div>

            {/* Footer Modal Aksi */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setQuantityModalProduct(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                id="btn-confirm-add-to-cart"
                onClick={handleConfirmAddToCart}
                disabled={modalPricing.isOutOfStock || modalQuantity < 1}
                className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Masukkan ke Keranjang ({modalQuantity} unit)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Feedback */}
      {cartSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-bounceIn px-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-black">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-extrabold text-xs text-emerald-400">Keranjang Belanja Diperbarui</h5>
              <p className="text-xs text-slate-200 font-medium mt-0.5 leading-snug">
                {cartSuccessToast.message}
              </p>
            </div>
            <button
              onClick={() => setCartSuccessToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalProduct && (
        <ReviewModal
          product={reviewModalProduct}
          onClose={() => setReviewModalProduct(null)}
          onOpenAuth={() => {
            if (onOpenAuth) onOpenAuth();
          }}
        />
      )}

    </section>
  );
};
