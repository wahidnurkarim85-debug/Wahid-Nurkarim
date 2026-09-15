import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc 
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Ticket, 
  ShoppingBag, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  Key, 
  Copy, 
  Save, 
  AlertCircle,
  Eye,
  Sliders,
  DollarSign,
  Users,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  FileText,
  BadgeCheck,
  Lock,
  TrendingUp,
  Gift,
  Package,
  Video,
  Loader2,
  Truck,
  BarChart3
} from 'lucide-react';
import { db, sanitizeFirestoreData, seedInitialFirestoreData, STAFF_SECRET_KEY } from '../lib/firebase';
import { Product, Voucher, DiscountType, EmployeeRecord, MemberRecord, ProductPromotion, StockLog, EmployeePermission } from '../types';
import { useAuth, getDefaultPermissionsForRole } from '../context/AuthContext';
import { INITIAL_PRODUCTS, INITIAL_VOUCHERS } from '../data/initialProducts';
import { INITIAL_PROMOTIONS } from '../data/initialPromotions';
import { INITIAL_EMPLOYEES, INITIAL_MEMBERS } from '../data/initialStaffMemberData';
import { useSiteConfig } from '../context/SiteConfigContext';
import { updateProductStockManual, getProductStock } from '../lib/stockUtils';
import { AdminShippingManager } from './AdminShippingManager';
import { AdminVisitorManager } from './AdminVisitorManager';
import { AdminInboxManager } from './AdminInboxManager';
import { AdminOrderHistoryManager } from './AdminOrderHistoryManager';
import { AdminBundlingManager } from './AdminBundlingManager';
import { AdminGiftVoucherManager } from './AdminGiftVoucherManager';
import { AdminGiftBonusManager } from './AdminGiftBonusManager';
import { AdminPointsManager } from './AdminPointsManager';
import { AdminAnalyticsManager } from './AdminAnalyticsManager';
import { AdminReviewsManager } from './AdminReviewsManager';

interface AdminPanelProps {
  initialEditProduct?: Product | null;
  initialSubTab?: 'products' | 'vouchers' | 'promotions' | 'bundlingMember' | 'bundlingVisitor' | 'employees' | 'members' | 'visitors' | 'inbox' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'stockLogs' | 'shipping' | 'orders' | 'giftHistory' | 'points' | 'analytics' | 'reviews';
  onClearInitialEdit?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  initialEditProduct, 
  initialSubTab = 'products',
  onClearInitialEdit 
}) => {
  const { user, isStaff, isManager, loginAsManager, loginDemo, loginWithGoogle } = useAuth();
  const { 
    banners, addBanner, deleteBanner, 
    appearance, updateAppearance, 
    revenueRecords, addRevenueRecord, updateRevenueRecord, deleteRevenueRecord, 
    financialDocs, addFinancialDoc, updateFinancialDoc, deleteFinancialDoc 
  } = useSiteConfig();

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'vouchers' | 'promotions' | 'bundlingMember' | 'bundlingVisitor' | 'employees' | 'members' | 'visitors' | 'inbox' | 'staffInfo' | 'slider' | 'appearance' | 'revenue' | 'stockLogs' | 'shipping' | 'orders' | 'giftHistory' | 'points' | 'analytics' | 'reviews'>(initialSubTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [promotions, setPromotions] = useState<ProductPromotion[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [stockLogFilter, setStockLogFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // STOCK EDIT MODAL STATE
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockModalMap, setStockModalMap] = useState<Record<string, number>>({});
  const [stockModalNotes, setStockModalNotes] = useState<string>('Penyesuaian stok manual oleh Admin/Staff');

  // PRODUCT FORM STATE
  const [isEditingProduct, setIsEditingProduct] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);
  const [newPhotoInputUrl, setNewPhotoInputUrl] = useState<string>('');

  const [productForm, setProductForm] = useState<{
    name: string;
    emoji: string;
    imageUrl: string;
    images: string[];
    videoUrl: string;
    category: string;
    variationsStr: string;
    price: number;
    unitDescription: string;
    isAvailable: boolean;
    hasMemberDiscount: boolean;
    memberDiscountType: 'percentage' | 'fixed';
    memberDiscountValue: number;
    hasVisitorDiscount: boolean;
    visitorDiscountType: 'percentage' | 'fixed';
    visitorDiscountValue: number;
    stock: number;
    variationStocks: Record<string, number>;
  }>({
    name: '',
    emoji: '🍚',
    imageUrl: '',
    images: [],
    videoUrl: '',
    category: 'Beras & Biji-bijian',
    variationsStr: '5 kg, 10 kg, 25 kg',
    price: 50000,
    unitDescription: 'per kemasan',
    isAvailable: true,
    hasMemberDiscount: false,
    memberDiscountType: 'percentage',
    memberDiscountValue: 10,
    hasVisitorDiscount: false,
    visitorDiscountType: 'percentage',
    visitorDiscountValue: 5,
    stock: 100,
    variationStocks: { '5 kg': 50, '10 kg': 30, '25 kg': 20 },
  });

  // PROMOTIONS (PROMO BONUS PRODUK GRATIS) FORM STATE
  const [isEditingPromo, setIsEditingPromo] = useState<boolean>(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<{
    name: string;
    buyProductId: string;
    buyProductName: string;
    buyVariation: string;
    minQty: number;
    rewardProductId: string;
    rewardProductName: string;
    rewardVariation: string;
    rewardProductEmoji: string;
    rewardQty: number;
    isTiered: boolean;
    maxBonus: number;
    targetAudience: 'all' | 'member' | 'visitor';
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    name: '',
    buyProductId: '',
    buyProductName: '',
    buyVariation: '',
    minQty: 2,
    rewardProductId: '',
    rewardProductName: '',
    rewardVariation: '150 ml',
    rewardProductEmoji: '🎁',
    rewardQty: 1,
    isTiered: true,
    maxBonus: 5,
    targetAudience: 'all',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  // VOUCHER FORM STATE
  const [voucherForm, setVoucherForm] = useState<{
    code: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    minPurchase: number;
    maxDiscount: number;
    usageLimit: number;
    isActive: boolean;
  }>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 50000,
    maxDiscount: 20000,
    usageLimit: 100,
    isActive: true,
  });

  // EMPLOYEE (KARYAWAN) FORM STATE - RBAC & Google OAuth Login Allowed
  const [isEditingEmployee, setIsEditingEmployee] = useState<boolean>(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<{
    employeeId: string;
    name: string;
    nik: string;
    position: string;
    phone: string;
    email: string;
    employeeRole: 'SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'PENGIRIMAN';
    isLoginAllowed: boolean;
    permissions: EmployeePermission[];
    status: 'active' | 'inactive';
    joinedDate: string;
    notes: string;
  }>({
    employeeId: '',
    name: '',
    nik: '',
    position: 'Kasir Sembako POS',
    phone: '',
    email: '',
    employeeRole: 'KASIR',
    isLoginAllowed: true,
    permissions: ['kasir_pos', 'kelola_produk', 'riwayat_penjualan'],
    status: 'active',
    joinedDate: 'Januari 2024',
    notes: '',
  });

  // MEMBER (ANGGOTA) FORM STATE - Nama & Nomor Anggota Dapat Diedit oleh Karyawan
  const [isEditingMember, setIsEditingMember] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<{
    name: string;
    memberNumber: string;
    nik: string;
    phone: string;
    email: string;
    address: string;
    status: 'active' | 'inactive';
    joinedDate: string;
  }>({
    name: '',
    memberNumber: '',
    nik: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
    joinedDate: 'Januari 2024',
  });

  // Validation Error States for visual failure signs
  const [employeeFormErrors, setEmployeeFormErrors] = useState<{ [key: string]: string }>({});
  const [memberFormErrors, setMemberFormErrors] = useState<{ [key: string]: string }>({});

  // Filter Search
  const [searchProductFilter, setSearchProductFilter] = useState<string>('');
  const [searchEmployeeFilter, setSearchEmployeeFilter] = useState<string>('');
  const [searchMemberFilter, setSearchMemberFilter] = useState<string>('');
  const [promoAudienceFilter, setPromoAudienceFilter] = useState<'all' | 'member' | 'visitor'>('all');

  // Slider Banner Form State
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', imageUrl: '', badgeText: 'INFO' });

  // Revenue Form State
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [isEditingRevenue, setIsEditingRevenue] = useState<boolean>(false);
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [revForm, setRevForm] = useState({ year: 2026, month: 'Januari', date: new Date().toISOString().split('T')[0], amount: 50000000, description: '' });

  // Financial Doc Form State
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ title: '', fileType: 'excel' as 'excel' | 'word' | 'powerpoint', fileSize: '2.0 MB', fileUrl: '#' });

  // IN-APP DELETE / ACTION CONFIRMATION MODAL STATE
  interface DeleteTarget {
    type: 'employee' | 'member' | 'product' | 'voucher' | 'promotion' | 'seed' | 'financialDoc';
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
    itemData?: any;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Handle passed initial product to edit or initial subtab
  useEffect(() => {
    if (initialEditProduct) {
      setActiveSubTab('products');
      handleStartEditProduct(initialEditProduct);
      if (onClearInitialEdit) onClearInitialEdit();
    }
  }, [initialEditProduct]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Real-time Firestore listeners
  useEffect(() => {
    // 1. Products
    const productsRef = collection(db, 'products');
    const unsubProducts = onSnapshot(
      productsRef,
      (snap) => {
        if (!snap.empty) {
          const list: Product[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
          });
          setProducts(list);
        } else {
          setProducts(
            INITIAL_PRODUCTS.map((p, i) => ({
              id: `prod_${i + 1}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              ...p,
            }))
          );
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Products listener error in admin:', err);
        setProducts(
          INITIAL_PRODUCTS.map((p, i) => ({
            id: `prod_${i + 1}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            ...p,
          }))
        );
        setLoading(false);
      }
    );

    // 2. Vouchers
    const vouchersRef = collection(db, 'vouchers');
    const unsubVouchers = onSnapshot(
      vouchersRef,
      (snap) => {
        if (!snap.empty) {
          const vList: Voucher[] = [];
          snap.forEach((docSnap) => {
            vList.push({ id: docSnap.id, ...(docSnap.data() as Omit<Voucher, 'id'>) });
          });
          setVouchers(vList);
        } else {
          setVouchers(INITIAL_VOUCHERS.map((v) => ({ id: `voucher_${v.code.toLowerCase()}`, ...v })));
        }
      },
      (err) => {
        console.warn('Vouchers listener error in admin:', err);
        setVouchers(INITIAL_VOUCHERS.map((v) => ({ id: `voucher_${v.code.toLowerCase()}`, ...v })));
      }
    );

    // 3. Promotions (Promo Bonus Produk)
    let hasLoadedPromos = false;
    const promotionsRef = collection(db, 'promotions');
    const unsubPromos = onSnapshot(
      promotionsRef,
      (snap) => {
        if (!snap.empty) {
          hasLoadedPromos = true;
          const pList: ProductPromotion[] = [];
          snap.forEach((docSnap) => {
            pList.push({ id: docSnap.id, ...(docSnap.data() as Omit<ProductPromotion, 'id'>) });
          });
          setPromotions(pList);
        } else if (hasLoadedPromos) {
          setPromotions([]);
        } else {
          setPromotions(INITIAL_PROMOTIONS);
        }
      },
      (err) => {
        console.warn('Promotions listener error in admin:', err);
        setPromotions(INITIAL_PROMOTIONS);
      }
    );

    // 4. Employees (Karyawan)
    const employeesRef = collection(db, 'employees');
    const unsubEmployees = onSnapshot(
      employeesRef,
      (snap) => {
        if (!snap.empty) {
          const empList: EmployeeRecord[] = [];
          snap.forEach((docSnap) => {
            empList.push({ id: docSnap.id, ...(docSnap.data() as Omit<EmployeeRecord, 'id'>) });
          });
          setEmployees(empList);
        } else {
          setEmployees(INITIAL_EMPLOYEES);
        }
      },
      (err) => {
        console.warn('Employees listener error:', err);
        setEmployees(INITIAL_EMPLOYEES);
      }
    );

    // 5. Members (Anggota)
    const membersRef = collection(db, 'members');
    const unsubMembers = onSnapshot(
      membersRef,
      (snap) => {
        if (!snap.empty) {
          const memList: MemberRecord[] = [];
          snap.forEach((docSnap) => {
            memList.push({ id: docSnap.id, ...(docSnap.data() as Omit<MemberRecord, 'id'>) });
          });
          setMembers(memList);
        } else {
          setMembers(INITIAL_MEMBERS);
        }
      },
      (err) => {
        console.warn('Members listener error:', err);
        setMembers(INITIAL_MEMBERS);
      }
    );

    // 6. Stock Logs Listener
    const stockLogsRef = collection(db, 'stockLogs');
    const unsubStockLogs = onSnapshot(
      stockLogsRef,
      (snap) => {
        if (!snap.empty) {
          const list: StockLog[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<StockLog, 'id'>) });
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStockLogs(list);
        }
      },
      (err) => console.warn('Stock logs listener error:', err)
    );

    return () => {
      unsubProducts();
      unsubVouchers();
      unsubPromos();
      unsubEmployees();
      unsubMembers();
      unsubStockLogs();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // ===================== STOCK MODAL & LOG HANDLERS =====================
  const handleOpenStockModal = (prod: Product) => {
    setStockModalProduct(prod);
    const initialMap: Record<string, number> = {};
    const vars = prod.variations && prod.variations.length > 0 ? prod.variations : ['Standar'];
    vars.forEach((v) => {
      initialMap[v] = getProductStock(prod, v);
    });
    setStockModalMap(initialMap);
    setStockModalNotes('Penyesuaian stok manual oleh Admin/Staff');
  };

  const handleSaveStockModal = async () => {
    if (!stockModalProduct) return;

    try {
      const actorName = user?.displayName || 'Admin / Staff Pengurus';
      const promises = Object.entries(stockModalMap).map(([variation, newStockVal]) => {
        return updateProductStockManual(
          stockModalProduct,
          variation,
          Number(newStockVal) || 0,
          actorName,
          stockModalNotes
        );
      });

      await Promise.all(promises);
      showNotification(`Stok produk "${stockModalProduct.name}" berhasil diperbarui & dicatat ke Audit Log!`);
      setStockModalProduct(null);
    } catch (err: any) {
      console.error('Save stock modal error:', err);
      showNotification(`Gagal memperbarui stok: ${err.message}`, 'error');
    }
  };

  // ===================== PRODUCT ACTIONS =====================
  const handleAddPhotoUrl = () => {
    if (!newPhotoInputUrl.trim()) return;
    if (productForm.images.length >= 5) {
      showNotification('Maksimal 5 foto per produk!', 'error');
      return;
    }
    const updated = [...productForm.images, newPhotoInputUrl.trim()];
    setProductForm({
      ...productForm,
      images: updated,
      imageUrl: updated[0] || '',
    });
    setNewPhotoInputUrl('');
    showNotification('Foto berhasil ditambahkan!');
  };

  const handleRemovePhoto = (index: number) => {
    const updated = productForm.images.filter((_, idx) => idx !== index);
    setProductForm({
      ...productForm,
      images: updated,
      imageUrl: updated[0] || '',
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showNotification('Ukuran gambar maksimal 3MB!', 'error');
      return;
    }
    if (productForm.images.length >= 5) {
      showNotification('Maksimal 5 foto per produk!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        const updated = [...productForm.images, result];
        setProductForm({ 
          ...productForm, 
          images: updated,
          imageUrl: updated[0] || '',
        });
        showNotification('Foto produk berhasil diunggah & dipratinjau!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showNotification('Ukuran file video maksimal 20MB!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setProductForm({ ...productForm, videoUrl: result });
        showNotification('Video produk berhasil diunggah!');
      }
    };
    reader.readAsDataURL(file);
  };

  const calcMemberPrice = (price: number, discountType?: 'percentage' | 'fixed', discountValue?: number) => {
    if (!discountValue || discountValue <= 0) return price;
    if (discountType === 'percentage') {
      const cut = Math.round((price * discountValue) / 100);
      return Math.max(0, price - cut);
    }
    return Math.max(0, price - discountValue);
  };

  const calcVisitorPrice = (price: number, discountType?: 'percentage' | 'fixed', discountValue?: number) => {
    if (!discountValue || discountValue <= 0) return price;
    if (discountType === 'percentage') {
      const cut = Math.round((price * discountValue) / 100);
      return Math.max(0, price - cut);
    }
    return Math.max(0, price - discountValue);
  };

  const handleStartAddProduct = () => {
    setIsEditingProduct(true);
    setEditingProductId(null);
    setProductForm({
      name: '',
      emoji: '🍚',
      imageUrl: '',
      images: [],
      videoUrl: '',
      category: 'Beras & Biji-bijian',
      variationsStr: '5 kg, 10 kg, 25 kg',
      price: 50000,
      unitDescription: 'per kemasan',
      isAvailable: true,
      hasMemberDiscount: false,
      memberDiscountType: 'percentage',
      memberDiscountValue: 10,
      hasVisitorDiscount: false,
      visitorDiscountType: 'percentage',
      visitorDiscountValue: 5,
      stock: 100,
      variationStocks: { '5 kg': 50, '10 kg': 30, '25 kg': 20 },
    });
  };

  const handleStartEditProduct = (prod: Product) => {
    setIsEditingProduct(true);
    setEditingProductId(prod.id);
    const existingImages = prod.images && prod.images.length > 0
      ? prod.images
      : (prod.imageUrl ? [prod.imageUrl] : []);

    const existingVarStocks = prod.variationStocks || {};
    const parsedVariations = prod.variations && prod.variations.length > 0 ? prod.variations : ['Standar'];
    const initialStocksMap: Record<string, number> = { ...existingVarStocks };
    parsedVariations.forEach((v) => {
      if (initialStocksMap[v] === undefined) {
        initialStocksMap[v] = Math.max(0, Math.floor((prod.stock ?? 100) / parsedVariations.length));
      }
    });

    const computedTotal = parsedVariations.reduce((sum, v) => sum + (Number(initialStocksMap[v]) || 0), 0);

    setProductForm({
      name: prod.name,
      emoji: prod.emoji || '📦',
      imageUrl: prod.imageUrl || '',
      images: existingImages,
      videoUrl: prod.videoUrl || '',
      category: prod.category || 'Beras & Biji-bijian',
      variationsStr: prod.variations ? prod.variations.join(', ') : 'Standar',
      price: prod.price || 50000,
      unitDescription: prod.unitDescription || '',
      isAvailable: prod.isAvailable ?? true,
      hasMemberDiscount: prod.hasMemberDiscount ?? false,
      memberDiscountType: prod.memberDiscountType || 'percentage',
      memberDiscountValue: prod.memberDiscountValue ?? 10,
      hasVisitorDiscount: prod.hasVisitorDiscount ?? false,
      visitorDiscountType: prod.visitorDiscountType || 'percentage',
      visitorDiscountValue: prod.visitorDiscountValue ?? 5,
      stock: computedTotal > 0 ? computedTotal : (prod.stock ?? 100),
      variationStocks: initialStocksMap,
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = productForm.name.trim();
    if (!cleanName) {
      showNotification('Nama produk tidak boleh kosong!', 'error');
      return;
    }

    setIsSavingProduct(true);

    try {
      const variations = productForm.variationsStr
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const activeVariations = variations.length > 0 ? variations : ['Standar'];

      // Construct variationStocks cleanly
      const cleanVarStocks: Record<string, number> = {};
      let totalStock = 0;

      activeVariations.forEach((v) => {
        const val = productForm.variationStocks[v] !== undefined
          ? Number(productForm.variationStocks[v])
          : (Number(productForm.stock) || 100);
        cleanVarStocks[v] = Math.max(0, isNaN(val) ? 0 : val);
        totalStock += cleanVarStocks[v];
      });

      if (totalStock === 0 && Number(productForm.stock) > 0) {
        totalStock = Number(productForm.stock);
        cleanVarStocks[activeVariations[0]] = totalStock;
      }

      const cleanImages = Array.isArray(productForm.images)
        ? productForm.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
        : [];
      const mainImageUrl = cleanImages[0] || productForm.imageUrl.trim() || '';

      const cleanPayload: Record<string, any> = {
        name: cleanName,
        emoji: productForm.emoji.trim() || '📦',
        imageUrl: mainImageUrl,
        images: cleanImages,
        videoUrl: productForm.videoUrl.trim() || '',
        category: productForm.category || 'Beras & Biji-bijian',
        variations: activeVariations,
        price: Math.max(0, Number(productForm.price) || 0),
        unitDescription: productForm.unitDescription.trim() || '',
        isAvailable: Boolean(productForm.isAvailable),
        hasMemberDiscount: Boolean(productForm.hasMemberDiscount),
        memberDiscountType: productForm.memberDiscountType || 'percentage',
        memberDiscountValue: Math.max(0, Number(productForm.memberDiscountValue) || 0),
        hasVisitorDiscount: Boolean(productForm.hasVisitorDiscount),
        visitorDiscountType: productForm.visitorDiscountType || 'percentage',
        visitorDiscountValue: Math.max(0, Number(productForm.visitorDiscountValue) || 0),
        variationStocks: cleanVarStocks,
        stock: totalStock,
        updatedAt: new Date().toISOString(),
      };

      const actorName = user?.displayName || 'Admin / Karyawan';

      if (editingProductId) {
        const targetId = editingProductId;
        // 1. Simpan ke Firestore via setDoc dengan merge (aman untuk dokumen baru maupun yang sudah ada)
        await setDoc(doc(db, 'products', targetId), cleanPayload, { merge: true });

        // 2. Update state lokal segera agar perubahan terlihat seketika
        setProducts((prev) =>
          prev.map((p) => (p.id === targetId ? { ...p, ...cleanPayload, id: targetId } : p))
        );

        // 3. Catat Riwayat Audit Log Stok
        try {
          await addDoc(collection(db, 'stockLogs'), {
            productId: targetId,
            productName: cleanPayload.name,
            variation: activeVariations.join(', '),
            newStock: totalStock,
            changeAmount: 0,
            type: 'admin_update',
            notes: `Admin memperbarui data produk "${cleanPayload.name}"`,
            actor: actorName,
            updatedBy: actorName,
            createdAt: new Date().toISOString(),
          });
        } catch (logErr) {
          console.warn('Stock log write warning:', logErr);
        }

        showNotification(`✅ Perubahan produk "${cleanPayload.name}" berhasil disimpan & otomatis diperbarui di sistem!`);
      } else {
        const newDocId = `prod_${Date.now()}_${cleanPayload.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const newProductDoc: Product = {
          id: newDocId,
          ...cleanPayload,
          createdAt: new Date().toISOString(),
        } as unknown as Product;

        // 1. Simpan ke Firestore
        await setDoc(doc(db, 'products', newDocId), newProductDoc);

        // 2. Update state lokal
        setProducts((prev) => [newProductDoc, ...prev.filter((p) => p.id !== newDocId)]);

        // 3. Catat Riwayat Audit Log Stok
        try {
          await addDoc(collection(db, 'stockLogs'), {
            productId: newDocId,
            productName: cleanPayload.name,
            variation: activeVariations.join(', '),
            newStock: totalStock,
            changeAmount: totalStock,
            type: 'admin_add',
            notes: `Admin menambahkan produk baru "${cleanPayload.name}" dengan total stok ${totalStock} unit`,
            actor: actorName,
            updatedBy: actorName,
            createdAt: new Date().toISOString(),
          });
        } catch (logErr) {
          console.warn('Stock log write warning:', logErr);
        }

        showNotification(`✅ Produk baru "${cleanPayload.name}" berhasil ditambahkan & otomatis tersimpan ke katalog!`);
      }

      setIsEditingProduct(false);
      setEditingProductId(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      showNotification(`Gagal menyimpan produk: ${err.message}`, 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleMemberDiscount = async (prod: Product) => {
    try {
      const nextStatus = !prod.hasMemberDiscount;
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, hasMemberDiscount: nextStatus } : p))
      );
      await setDoc(
        doc(db, 'products', prod.id),
        {
          hasMemberDiscount: nextStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showNotification(`Diskon anggota "${prod.name}" berhasil di-${nextStatus ? 'aktifkan' : 'nonaktifkan'}!`);
    } catch (err: any) {
      showNotification(`Gagal mengubah status diskon: ${err.message}`, 'error');
    }
  };

  const handleToggleVisitorDiscount = async (prod: Product) => {
    try {
      const nextStatus = !prod.hasVisitorDiscount;
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, hasVisitorDiscount: nextStatus } : p))
      );
      await setDoc(
        doc(db, 'products', prod.id),
        {
          hasVisitorDiscount: nextStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showNotification(`Diskon pengunjung "${prod.name}" berhasil di-${nextStatus ? 'aktifkan' : 'nonaktifkan'}!`);
    } catch (err: any) {
      showNotification(`Gagal mengubah status diskon pengunjung: ${err.message}`, 'error');
    }
  };

  // ===================== PROMOTION (PROMO BONUS PRODUK) ACTIONS =====================
  const handleStartAddPromo = () => {
    setIsEditingPromo(true);
    setEditingPromoId(null);
    const defaultAudience: 'member' | 'visitor' = promoAudienceFilter === 'visitor' ? 'visitor' : 'member';
    setPromoForm({
      name: '',
      buyProductId: products[0]?.id || '',
      buyProductName: products[0]?.name || '',
      buyVariation: products[0]?.variations?.[0] || 'Standar',
      minQty: 2,
      rewardProductId: products[0]?.id || '',
      rewardProductName: products[0]?.name || '',
      rewardVariation: products[0]?.variations?.[0] || 'Standar',
      rewardProductEmoji: products[0]?.emoji || '🎁',
      rewardQty: 1,
      isTiered: true,
      maxBonus: 5,
      targetAudience: defaultAudience,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true,
    });
  };

  const handleStartEditPromo = (promo: ProductPromotion) => {
    setIsEditingPromo(true);
    setEditingPromoId(promo.id);
    setPromoForm({
      name: promo.name,
      buyProductId: promo.buyProductId,
      buyProductName: promo.buyProductName,
      buyVariation: promo.buyVariation || '',
      minQty: promo.minQty,
      rewardProductId: promo.rewardProductId,
      rewardProductName: promo.rewardProductName,
      rewardVariation: promo.rewardVariation,
      rewardProductEmoji: promo.rewardProductEmoji || '🎁',
      rewardQty: promo.rewardQty,
      isTiered: promo.isTiered ?? true,
      maxBonus: promo.maxBonus || 5,
      targetAudience: (promo.targetAudience === 'visitor' ? 'visitor' : 'member'),
      startDate: promo.startDate || '',
      endDate: promo.endDate || '',
      isActive: promo.isActive ?? true,
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.name.trim()) {
      showNotification('Nama program promo tidak boleh kosong!', 'error');
      return;
    }
    if (!promoForm.buyProductId) {
      showNotification('Pilih produk syarat pembelian!', 'error');
      return;
    }
    if (!promoForm.rewardProductId) {
      showNotification('Pilih produk hadiah bonus!', 'error');
      return;
    }

    const payload: Omit<ProductPromotion, 'id'> = {
      name: promoForm.name.trim(),
      buyProductId: promoForm.buyProductId,
      buyProductName: promoForm.buyProductName,
      buyVariation: promoForm.buyVariation.trim(),
      minQty: Number(promoForm.minQty) || 1,
      rewardProductId: promoForm.rewardProductId,
      rewardProductName: promoForm.rewardProductName,
      rewardVariation: promoForm.rewardVariation.trim(),
      rewardProductEmoji: promoForm.rewardProductEmoji.trim() || '🎁',
      rewardQty: Number(promoForm.rewardQty) || 1,
      isTiered: promoForm.isTiered,
      maxBonus: Number(promoForm.maxBonus) || 10,
      targetAudience: promoForm.targetAudience,
      startDate: promoForm.startDate,
      endDate: promoForm.endDate,
      isActive: promoForm.isActive,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingPromoId) {
        await updateDoc(doc(db, 'promotions', editingPromoId), payload);
        showNotification(`Program promo "${payload.name}" berhasil diperbarui!`);
      } else {
        const newDocId = `promo_${Date.now()}`;
        await setDoc(doc(db, 'promotions', newDocId), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        showNotification(`Program promo "${payload.name}" berhasil dibuat!`);
      }
      setIsEditingPromo(false);
      setEditingPromoId(null);
    } catch (err: any) {
      console.error('Error saving promo:', err);
      showNotification(`Gagal menyimpan program promo: ${err.message}`, 'error');
    }
  };

  const handleTogglePromoStatus = async (promo: ProductPromotion) => {
    try {
      const next = !promo.isActive;
      await updateDoc(doc(db, 'promotions', promo.id), {
        isActive: next,
        updatedAt: new Date().toISOString(),
      });
      showNotification(`Status promo "${promo.name}" diubah menjadi ${next ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      showNotification(`Gagal mengubah status promo: ${err.message}`, 'error');
    }
  };

  const promptDeletePromo = (promo: ProductPromotion) => {
    setDeleteTarget({
      type: 'promotion',
      id: promo.id,
      title: promo.name,
      subtitle: `Beli min. ${promo.minQty} ${promo.buyProductName} → Gratis ${promo.rewardQty}x ${promo.rewardProductName}`,
      badge: 'Promo Bonus',
      itemData: promo,
    });
  };

  // Prompt functions for in-app deletion confirmation (prevents iframe window.confirm blocking)
  const promptDeleteProduct = (prod: Product) => {
    setDeleteTarget({
      type: 'product',
      id: prod.id,
      title: prod.name,
      subtitle: `Kategori: ${prod.category} • Harga: ${formatRupiah(prod.price || 0)}`,
      badge: 'Produk Sembako',
      itemData: prod,
    });
  };

  const handleToggleProductAvailability = async (prod: Product) => {
    try {
      const nextStatus = !prod.isAvailable;
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isAvailable: nextStatus } : p))
      );
      await setDoc(
        doc(db, 'products', prod.id),
        {
          isAvailable: nextStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showNotification(`Status stok "${prod.name}" diubah menjadi ${nextStatus ? 'Tersedia' : 'Kosong'}.`);
    } catch (err: any) {
      showNotification(`Gagal mengubah status: ${err.message}`, 'error');
    }
  };

  // ===================== VOUCHER ACTIONS =====================
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherForm.code.trim().toUpperCase();
    if (!cleanCode) {
      showNotification('Kode voucher harus diisi!', 'error');
      return;
    }

    const payload: Omit<Voucher, 'id'> = {
      code: cleanCode,
      description: voucherForm.description.trim() || `Diskon ${voucherForm.discountValue}${voucherForm.discountType === 'percentage' ? '%' : ' Rupiah'}`,
      discountType: voucherForm.discountType,
      discountValue: Number(voucherForm.discountValue) || 0,
      minPurchase: Number(voucherForm.minPurchase) || 0,
      maxDiscount: voucherForm.discountType === 'percentage' ? Number(voucherForm.maxDiscount) || 0 : undefined,
      usageLimit: Number(voucherForm.usageLimit) || 100,
      usedCount: 0,
      isActive: voucherForm.isActive,
      createdBy: user?.displayName || 'Admin Gerai',
      createdAt: new Date().toISOString(),
    };

    try {
      const docId = `voucher_${cleanCode.toLowerCase()}`;
      await setDoc(doc(db, 'vouchers', docId), sanitizeFirestoreData(payload));
      showNotification(`Voucher "${cleanCode}" berhasil diterbitkan!`);
      setVoucherForm({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 50000,
        maxDiscount: 20000,
        usageLimit: 100,
        isActive: true,
      });
    } catch (err: any) {
      showNotification(`Gagal menerbitkan voucher: ${err.message}`, 'error');
    }
  };

  const promptDeleteVoucher = (voucher: Voucher) => {
    setDeleteTarget({
      type: 'voucher',
      id: voucher.id,
      title: voucher.code,
      subtitle: `Diskon: ${voucher.discountType === 'percentage' ? `${voucher.discountValue}%` : formatRupiah(voucher.discountValue)} • Min. Belanja: ${formatRupiah(voucher.minPurchase)}`,
      badge: 'Voucher Promo',
      itemData: voucher,
    });
  };

  const handleToggleVoucherStatus = async (voucher: Voucher) => {
    try {
      await updateDoc(doc(db, 'vouchers', voucher.id), {
        isActive: !voucher.isActive,
      });
      showNotification(`Voucher "${voucher.code}" ${!voucher.isActive ? 'Diaktifkan' : 'Dinonaktifkan'}.`);
    } catch (err: any) {
      showNotification(`Gagal update status: ${err.message}`, 'error');
    }
  };

  // ===================== EMPLOYEE (KARYAWAN) ACTIONS =====================
  // Khusus hak wewenang: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang dapat merubah, mengedit, atau menghapus
  const handleStartAddEmployee = () => {
    if (!isManager) {
      showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menambah data karyawan.', 'error');
      return;
    }
    const nextEmpCode = `KMP-EMP-${String(employees.length + 1).padStart(3, '0')}`;
    setIsEditingEmployee(true);
    setEditingEmployeeId(null);
    setEmployeeFormErrors({});
    setEmployeeForm({
      employeeId: nextEmpCode,
      name: '',
      nik: '',
      position: 'Staff Kasir & Pelayanan POS',
      phone: '',
      email: '',
      employeeRole: 'KASIR',
      isLoginAllowed: true,
      permissions: getDefaultPermissionsForRole('KASIR'),
      status: 'active',
      joinedDate: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      notes: '',
    });
  };

  const handleStartEditEmployee = (emp: EmployeeRecord) => {
    if (!isManager) {
      showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang mengedit atau merubah data karyawan.', 'error');
      return;
    }
    setIsEditingEmployee(true);
    setEditingEmployeeId(emp.id);
    setEmployeeFormErrors({});
    const empRole = emp.employeeRole || 'KASIR';
    setEmployeeForm({
      employeeId: emp.employeeId || emp.id,
      name: emp.name,
      nik: emp.nik || '',
      position: emp.position || 'Staff Koperasi',
      phone: emp.phone || '',
      email: emp.email || '',
      employeeRole: empRole,
      isLoginAllowed: emp.isLoginAllowed ?? true,
      permissions: emp.permissions && emp.permissions.length > 0 ? emp.permissions : getDefaultPermissionsForRole(empRole),
      status: emp.status || 'active',
      joinedDate: emp.joinedDate || 'Januari 2024',
      notes: emp.notes || '',
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) {
      showNotification('Aksi Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menyimpan perubahan data karyawan.', 'error');
      return;
    }

    const errors: { [key: string]: string } = {};

    if (!employeeForm.name.trim()) {
      errors.name = 'Nama karyawan wajib diisi (tidak boleh kosong).';
    } else if (employeeForm.name.trim().length < 3) {
      errors.name = 'Nama karyawan minimal 3 karakter.';
    }

    const cleanNik = employeeForm.nik.replace(/[^0-9]/g, '');
    if (!cleanNik) {
      errors.nik = 'NIK KTP wajib diisi!';
    } else if (cleanNik.length !== 16) {
      errors.nik = `NIK KTP harus tepat 16 digit angka KTP (saat ini ${cleanNik.length} digit).`;
    }

    if (employeeForm.email && !employeeForm.email.includes('@')) {
      errors.email = 'Format email Google/Gmail tidak valid.';
    }

    if (employeeForm.phone && employeeForm.phone.replace(/[^0-9]/g, '').length < 10) {
      errors.phone = 'Nomor telepon/WA minimal 10 digit angka.';
    }

    if (Object.keys(errors).length > 0) {
      setEmployeeFormErrors(errors);
      showNotification('Pengisian data gagal! Periksa tanda merah pada formulir.', 'error');
      return;
    }

    setEmployeeFormErrors({});

    const payload: Omit<EmployeeRecord, 'id'> = {
      employeeId: employeeForm.employeeId || `emp_${Date.now()}`,
      name: employeeForm.name.trim(),
      nik: cleanNik,
      position: employeeForm.position.trim(),
      phone: employeeForm.phone.trim(),
      email: employeeForm.email.trim().toLowerCase(),
      employeeRole: employeeForm.employeeRole,
      isLoginAllowed: employeeForm.isLoginAllowed,
      permissions: employeeForm.permissions,
      status: employeeForm.status,
      joinedDate: employeeForm.joinedDate.trim(),
      notes: employeeForm.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingEmployeeId) {
        const updatedRecord: EmployeeRecord = { id: editingEmployeeId, ...payload };
        setEmployees(prev => prev.map(e => e.id === editingEmployeeId ? updatedRecord : e));
        await setDoc(doc(db, 'employees', editingEmployeeId), payload, { merge: true });
        showNotification(`Data karyawan "${payload.name}" (${payload.employeeRole}) berhasil diperbarui oleh Manager!`);
      } else {
        const newId = `emp_${Date.now()}`;
        const newRecord: EmployeeRecord = { id: newId, ...payload };
        setEmployees(prev => [newRecord, ...prev]);
        await setDoc(doc(db, 'employees', newId), {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showNotification(`Karyawan baru "${payload.name}" (${payload.employeeRole}) berhasil ditambahkan oleh Manager!`);
      }
      setIsEditingEmployee(false);
      setEditingEmployeeId(null);
    } catch (err: any) {
      console.error('Save employee error:', err);
      showNotification(`Gagal menyimpan data karyawan ke Firestore: ${err.message}`, 'error');
    }
  };

  const promptDeleteEmployee = (emp: EmployeeRecord) => {
    if (!isManager) {
      showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menghapus data karyawan.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'employee',
      id: emp.id,
      title: emp.name,
      subtitle: `NIK KTP: ${emp.nik || '-'} • Jabatan: ${emp.position || 'Staff Koperasi'}`,
      badge: 'Karyawan',
      itemData: emp,
    });
  };

  const handleToggleEmployeeStatus = async (emp: EmployeeRecord) => {
    if (!isManager) {
      showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang mengubah status keaktifan karyawan.', 'error');
      return;
    }
    try {
      const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'employees', emp.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      showNotification(`Status karyawan "${emp.name}" diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      showNotification(`Gagal mengubah status: ${err.message}`, 'error');
    }
  };

  // ===================== MEMBER (ANGGOTA) ACTIONS =====================
  // Menu Anggota yang berisi Nama dan Nomor Anggota yang DAPAT DI-EDIT oleh Karyawan
  const handleStartAddMember = () => {
    setIsEditingMember(true);
    setEditingMemberId(null);
    setMemberFormErrors({});
    const nextNumber = `KMP-ANG-${String(members.length + 1).padStart(3, '0')}`;
    setMemberForm({
      name: '',
      memberNumber: nextNumber,
      nik: '',
      phone: '',
      email: '',
      address: 'Cengkareng Timur, Jakarta Barat',
      status: 'active',
      joinedDate: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    });
  };

  const handleStartEditMember = (mem: MemberRecord) => {
    setIsEditingMember(true);
    setEditingMemberId(mem.id);
    setMemberFormErrors({});
    setMemberForm({
      name: mem.name,
      memberNumber: mem.memberNumber || 'KMP-ANG-001',
      nik: mem.nik || '',
      phone: mem.phone || '',
      email: mem.email || '',
      address: mem.address || '',
      status: mem.status || 'active',
      joinedDate: mem.joinedDate || 'Januari 2024',
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!memberForm.name.trim()) {
      errors.name = 'Nama anggota wajib diisi (tidak boleh kosong).';
    } else if (memberForm.name.trim().length < 3) {
      errors.name = 'Nama anggota minimal 3 karakter.';
    }

    if (!memberForm.memberNumber.trim()) {
      errors.memberNumber = 'Nomor Anggota Koperasi wajib diisi!';
    } else if (memberForm.memberNumber.trim().length < 4) {
      errors.memberNumber = 'Format nomor anggota terlalu pendek (contoh: KMP-ANG-001).';
    }

    if (memberForm.nik && memberForm.nik.replace(/[^0-9]/g, '').length !== 16) {
      errors.nik = `Jika NIK diisi, harus 16 digit (saat ini ${memberForm.nik.replace(/[^0-9]/g, '').length} digit).`;
    }

    if (Object.keys(errors).length > 0) {
      setMemberFormErrors(errors);
      showNotification('Penyimpanan anggota gagal! Periksa tanda merah pada formulir.', 'error');
      return;
    }

    setMemberFormErrors({});

    const payload: Omit<MemberRecord, 'id'> = {
      name: memberForm.name.trim(),
      memberNumber: memberForm.memberNumber.trim().toUpperCase(),
      nik: memberForm.nik.trim(),
      phone: memberForm.phone.trim(),
      email: memberForm.email.trim(),
      address: memberForm.address.trim(),
      status: memberForm.status,
      joinedDate: memberForm.joinedDate.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingMemberId) {
        const updatedRecord: MemberRecord = { id: editingMemberId, ...payload };
        setMembers(prev => prev.map(m => m.id === editingMemberId ? updatedRecord : m));
        await setDoc(doc(db, 'members', editingMemberId), payload, { merge: true });
        showNotification(`Data Anggota "${payload.name}" (${payload.memberNumber}) berhasil diperbarui!`);
      } else {
        const newId = `mem_${Date.now()}`;
        const newRecord: MemberRecord = { id: newId, ...payload };
        setMembers(prev => [newRecord, ...prev]);
        await setDoc(doc(db, 'members', newId), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        showNotification(`Anggota baru "${payload.name}" (${payload.memberNumber}) berhasil didaftarkan!`);
      }
      setIsEditingMember(false);
      setEditingMemberId(null);
    } catch (err: any) {
      console.error('Save member error:', err);
      showNotification(`Gagal menyimpan data anggota: ${err.message}`, 'error');
    }
  };

  const promptDeleteMember = (mem: MemberRecord) => {
    setDeleteTarget({
      type: 'member',
      id: mem.id,
      title: mem.name,
      subtitle: `Nomor Anggota: ${mem.memberNumber} • Kontak: ${mem.phone || '-'}`,
      badge: 'Anggota Koperasi',
      itemData: mem,
    });
  };

  const handleToggleMemberStatus = async (mem: MemberRecord) => {
    try {
      let nextStatus: 'active' | 'inactive' | 'blocked' = 'active';
      if (mem.status === 'active') nextStatus = 'inactive';
      else if (mem.status === 'inactive') nextStatus = 'blocked';
      else nextStatus = 'active';

      setMembers(prev => prev.map(m => m.id === mem.id ? { ...m, status: nextStatus } : m));
      await setDoc(doc(db, 'members', mem.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const statusLabel = nextStatus === 'active' ? 'Aktif' : nextStatus === 'inactive' ? 'Nonaktif' : 'Terblokir';
      showNotification(`Status anggota "${mem.name}" diubah menjadi ${statusLabel}.`);
    } catch (err: any) {
      showNotification(`Gagal update status: ${err.message}`, 'error');
    }
  };

  const handleToggleMemberLoginAllowed = async (mem: MemberRecord) => {
    try {
      const nextAllowed = mem.isLoginAllowed === false ? true : false;
      const updatedMem = { ...mem, isLoginAllowed: nextAllowed };
      setMembers(prev => prev.map(m => m.id === mem.id ? updatedMem : m));
      await setDoc(doc(db, 'members', mem.id), {
        isLoginAllowed: nextAllowed,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (nextAllowed) {
        showNotification(`🟢 Akses login anggota "${mem.name}" (${mem.memberNumber}) di-IZINKAN.`);
      } else {
        showNotification(`🔴 Akses login anggota "${mem.name}" (${mem.memberNumber}) di-NONAKTIFKAN.`, 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal mengubah akses login: ${err.message}`, 'error');
    }
  };

  const promptSyncData = () => {
    setDeleteTarget({
      type: 'seed',
      id: 'seed_50',
      title: 'Sinkronisasi 50 Data Sembako & Karyawan',
      subtitle: 'Tindakan ini akan memuat ulang data standar produk, staf karyawan, dan anggota koperasi ke Firestore.',
      badge: 'Sinkronisasi',
    });
  };

  // Centralized In-App Delete / Action Executor
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'employee') {
        if (!isManager) {
          showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menghapus data karyawan.', 'error');
          setIsDeleting(false);
          setDeleteTarget(null);
          return;
        }
        const empId = deleteTarget.id;
        const empName = deleteTarget.title;
        // Optimistic local state update
        setEmployees((prev) => prev.filter((e) => e.id !== empId));
        try {
          await deleteDoc(doc(db, 'employees', empId));
        } catch (err: any) {
          console.warn('Firestore employee delete warning:', err);
        }
        showNotification(`Data karyawan "${empName}" berhasil dihapus dari sistem.`);
      } else if (deleteTarget.type === 'member') {
        const memId = deleteTarget.id;
        const memName = deleteTarget.title;
        // Optimistic local state update
        setMembers((prev) => prev.filter((m) => m.id !== memId));
        try {
          await deleteDoc(doc(db, 'members', memId));
        } catch (err: any) {
          console.warn('Firestore member delete warning:', err);
        }
        showNotification(`Data anggota "${memName}" (${deleteTarget.subtitle.split('•')[0].trim()}) berhasil dihapus.`);
      } else if (deleteTarget.type === 'product') {
        const prodId = deleteTarget.id;
        const prodName = deleteTarget.title;
        setProducts((prev) => prev.filter((p) => p.id !== prodId));
        try {
          await deleteDoc(doc(db, 'products', prodId));
        } catch (err: any) {
          console.warn('Firestore product delete warning:', err);
        }
        showNotification(`Produk "${prodName}" berhasil dihapus.`);
      } else if (deleteTarget.type === 'voucher') {
        const vId = deleteTarget.id;
        const vCode = deleteTarget.title;
        setVouchers((prev) => prev.filter((v) => v.id !== vId && v.code !== vCode));
        try {
          await deleteDoc(doc(db, 'vouchers', vId));
        } catch (err: any) {
          console.warn('Firestore voucher delete warning:', err);
        }
        showNotification(`Voucher "${vCode}" berhasil dihapus.`);
      } else if (deleteTarget.type === 'promotion') {
        const promoId = deleteTarget.id;
        const promoTitle = deleteTarget.title;
        setPromotions((prev) => prev.filter((p) => p.id !== promoId));
        try {
          await deleteDoc(doc(db, 'promotions', promoId));
        } catch (err: any) {
          console.warn('Firestore promo delete warning:', err);
        }
        showNotification(`Program promo bonus "${promoTitle}" berhasil dihapus.`);
      } else if (deleteTarget.type === 'financialDoc') {
        const docId = deleteTarget.id;
        const docTitle = deleteTarget.title;

        if (editingDocId === docId) {
          setIsEditingDoc(false);
          setEditingDocId(null);
          setDocForm({ title: '', fileType: 'excel', fileSize: '2.0 MB', fileUrl: '#' });
          setIsDocModalOpen(false);
        }

        try {
          await deleteFinancialDoc(docId);
          showNotification(`Dokumen laporan keuangan "${docTitle}" berhasil dihapus.`);
        } catch (err: any) {
          console.error('Gagal menghapus dokumen laporan keuangan:', err);
          showNotification('Dokumen gagal dihapus. Silakan coba kembali.', 'error');
        }
      } else if (deleteTarget.type === 'revenueRecord') {
        const revId = deleteTarget.id;
        const revDesc = deleteTarget.title;

        if (editingRevenueId === revId) {
          setIsEditingRevenue(false);
          setEditingRevenueId(null);
          setRevForm({ year: new Date().getFullYear(), month: 'Januari', date: '01 Januari 2026', amount: 0, description: '' });
          setIsRevenueModalOpen(false);
        }

        try {
          await deleteRevenueRecord(revId);
          showNotification(`Data rekapitulasi pendapatan "${revDesc}" berhasil dihapus.`);
        } catch (err: any) {
          console.error('Gagal menghapus data pendapatan:', err);
          showNotification('Data pendapatan gagal dihapus. Silakan coba kembali.', 'error');
        }
      } else if (deleteTarget.type === 'seed') {
        await seedInitialFirestoreData(true);
        showNotification('50 Produk Sembako, Karyawan, dan Anggota berhasil disinkronkan ke Firestore!');
      }
    } catch (err: any) {
      showNotification(`Gagal memproses aksi: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filtered lists
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchProductFilter.toLowerCase()) ||
    p.category.toLowerCase().includes(searchProductFilter.toLowerCase())
  );

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchEmployeeFilter.toLowerCase()) ||
    e.nik.toLowerCase().includes(searchEmployeeFilter.toLowerCase()) ||
    (e.position && e.position.toLowerCase().includes(searchEmployeeFilter.toLowerCase()))
  );

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchMemberFilter.toLowerCase()) ||
    m.memberNumber.toLowerCase().includes(searchMemberFilter.toLowerCase()) ||
    (m.phone && m.phone.includes(searchMemberFilter))
  );

  if (!isStaff) {
    return (
      <div className="py-16 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-700 flex items-center justify-center mx-auto text-2xl font-black shadow-inner border border-red-200">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black">
            Khusus Akun Karyawan Resmi
          </span>
          <h3 className="text-xl font-black text-slate-900">
            Akses Ditolak: Hanya Akun WahidNurkarim85@gmail.com
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Sesuai kebijakan keamanan Koperasi, saat login email yang boleh mengakses atau masuk ke akun karyawan <strong>hanya boleh akun email WahidNurkarim85@gmail.com</strong>. Selain akun tersebut tidak boleh mengakses atau masuk pada akun karyawan.
          </p>
          {user && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-md mx-auto">
              Akun yang saat ini terhubung: <strong className="font-mono">{user.email || user.displayName}</strong> (Peran: {user.role === 'member' ? 'Anggota' : user.role})
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-4 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Akun Google Karyawan yang Berwenang:</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl font-mono text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span>WahidNurkarim85@gmail.com</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">
              AUTHORIZED
            </span>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => loginWithGoogle('WahidNurkarim85@gmail.com', 'staff')}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
              title="Masuk langsung dengan Google Gmail WahidNurkarim85@gmail.com"
            >
              <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Masuk Akun Karyawan: WahidNurkarim85@gmail.com</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* Admin Title & Role Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Panel Admin Karyawan Gerai Sembako</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pusat Pengelolaan Koperasi Real-Time
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100">
            Karyawan: <strong>{user?.displayName}</strong> ({user?.email}) • ID: {user?.employeeId || 'KARYAWAN-01'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={promptSyncData}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-300" />
            <span>Muat Ulang Data Standar</span>
          </button>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
        
        {/* Subtab 1: Kelola Produk */}
        <button
          onClick={() => {
            setActiveSubTab('products');
            setIsEditingProduct(false);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'products'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Kelola Produk ({products.length})</span>
        </button>

        {/* Subtab: Pemberitahuan & WhatsApp */}
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'inbox'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
          }`}
          title="Kirim dan Kelola Pemberitahuan Pelanggan & WA Admin"
        >
          <Mail className="w-4 h-4 text-blue-600" />
          <span>📱 Pemberitahuan & WA</span>
        </button>

        {/* Subtab: 🎁 Gift Voucher */}
        <button
          onClick={() => setActiveSubTab('vouchers')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'vouchers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>🎁 Gift Voucher ({vouchers.length})</span>
        </button>

        {/* Subtab: 🎁 Program Gift Bonus */}
        <button
          onClick={() => {
            setActiveSubTab('promotions');
            setIsEditingPromo(false);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'promotions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>🎁 Program Gift Bonus ({promotions.length})</span>
        </button>

        {/* Subtab: 📊 Riwayat Gift & Bonus */}
        <button
          onClick={() => setActiveSubTab('giftHistory')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'giftHistory'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>📊 Riwayat Gift</span>
        </button>

        {/* Subtab: ⭐ Point Pembelian Marketplace */}
        <button
          onClick={() => setActiveSubTab('points')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'points'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-200 scale-105'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <span className="text-amber-500 font-black">⭐</span>
          <span className="font-black">Point Pembelian</span>
        </button>

        {/* Subtab: Kelola Pengiriman & Ongkos Kirim */}
        <button
          onClick={() => setActiveSubTab('shipping')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'shipping'
              ? 'bg-red-600 text-white shadow-md shadow-red-200 scale-105'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-4 h-4 text-red-500 group-hover:text-red-600" />
          <span className="font-black">🚚 Kelola Pengiriman & Ongkir</span>
        </button>

        {/* Subtab: Riwayat Pesanan */}
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'orders'
              ? 'bg-red-600 text-white shadow-md shadow-red-200 scale-105'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Package className="w-4 h-4 text-red-500 group-hover:text-red-600" />
          <span className="font-black">📦 Riwayat Pesanan</span>
        </button>

        {/* Subtab: ⭐ Ulasan & Rating Produk */}
        <button
          onClick={() => setActiveSubTab('reviews')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'reviews'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-200 scale-105'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <span className="text-amber-500 font-black">⭐</span>
          <span className="font-black">Ulasan & Rating Produk</span>
        </button>

        {/* Subtab: Diskon Bundling Anggota */}
        <button
          onClick={() => setActiveSubTab('bundlingMember')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'bundlingMember'
              ? 'bg-red-600 text-white shadow-md shadow-red-200 scale-105'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="font-black">💰 Bundling Anggota</span>
        </button>

        {/* Subtab: Diskon Bundling Basic */}
        <button
          onClick={() => setActiveSubTab('bundlingVisitor')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'bundlingVisitor'
              ? 'bg-red-600 text-white shadow-md shadow-red-200 scale-105'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-black">💰 Bundling Basic</span>
        </button>

        {/* Subtab 3: Menu Karyawan (Nama & NIK KTP - Dapat Diedit) */}
        <button
          onClick={() => {
            setActiveSubTab('employees');
            setIsEditingEmployee(false);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'employees'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Menu Karyawan ({employees.length})</span>
        </button>

        {/* Subtab 4: Menu Anggota (Nama & Nomor Anggota - Dapat Diedit oleh Karyawan) */}
        <button
          onClick={() => {
            setActiveSubTab('members');
            setIsEditingMember(false);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'members'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Menu Anggota ({members.length})</span>
        </button>

        {/* Subtab: Kelola Akun Basic & Anggota Website */}
        <button
          onClick={() => setActiveSubTab('visitors')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'visitors'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
          }`}
          title="Kelola Akun Basic & Upgrade ke Anggota"
        >
          <Users className="w-4 h-4 text-red-500" />
          <span>👤 Akun Basic</span>
        </button>

        {/* Subtab 5: Kunci Rahasia */}
        <button
          onClick={() => setActiveSubTab('staffInfo')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'staffInfo'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Kunci Rahasia</span>
        </button>

        {/* Subtab 6: Kelola Slider Banner */}
        <button
          onClick={() => setActiveSubTab('slider')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'slider'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Kelola Slider ({banners.length})</span>
        </button>

        {/* Subtab 7: Tampilan & Logo */}
        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'appearance'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Tampilan & Logo</span>
        </button>

        {/* Subtab: Audit Log & Riwayat Stok */}
        <button
          onClick={() => setActiveSubTab('stockLogs')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'stockLogs'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Stok ({stockLogs.length})</span>
        </button>

        {/* Subtab 8: Grafik & Laporan Keuangan */}
        <button
          onClick={() => setActiveSubTab('revenue')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'revenue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Grafik & Laporan Keuangan</span>
        </button>

        {/* Subtab 9: Statistik & Analitik Website */}
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistik & Analitik Website</span>
        </button>
      </div>

      {/* ===================== SUBTAB 1: PRODUCT MANAGEMENT ===================== */}
      {activeSubTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchProductFilter}
                onChange={(e) => setSearchProductFilter(e.target.value)}
                placeholder="Cari produk yang ingin diedit..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              onClick={handleStartAddProduct}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Produk Baru
            </button>
          </div>

          {isEditingProduct && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>{editingProductId ? 'Edit Data Produk Real-Time' : 'Tambah Produk Baru ke Firestore'}</span>
                </h3>
                <button
                  onClick={() => setIsEditingProduct(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold text-slate-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={productForm.emoji}
                    onChange={(e) => setProductForm({ ...productForm, emoji: e.target.value })}
                    className="w-full px-3 py-2 text-center text-xl bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block font-extrabold text-slate-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Harga Normal Satuan (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="Beras & Biji-bijian">Beras & Biji-bijian</option>
                    <option value="Minyak & Lemak">Minyak & Lemak</option>
                    <option value="Bumbu & Pemanis">Bumbu & Pemanis</option>
                    <option value="Mie & Pasta">Mie & Pasta</option>
                    <option value="Minuman & Susu">Minuman & Susu</option>
                    <option value="Lauk & Telur">Lauk & Telur</option>
                    <option value="Kebersihan & Rumah Tangga">Kebersihan & Rumah Tangga</option>
                    <option value="Gas & Galon">Gas & Galon</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Satuan / Keterangan Ukuran</label>
                  <input
                    type="text"
                    value={productForm.unitDescription}
                    onChange={(e) => setProductForm({ ...productForm, unitDescription: e.target.value })}
                    placeholder="Contoh: per karung 5 kg, per botol"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Status Ketersediaan</label>
                  <select
                    value={productForm.isAvailable ? 'true' : 'false'}
                    onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="true">🟢 Tersedia (Ready Stock)</option>
                    <option value="false">🔴 Stok Habis / Nonaktif</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Total Stok Produk (Unit)</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stock}
                    onChange={(e) => {
                      const newStock = Math.max(0, Number(e.target.value));
                      setProductForm({ ...productForm, stock: newStock });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900"
                  />
                </div>

                <div className="sm:col-span-12">
                  <label className="block font-extrabold text-slate-700 mb-1">Pilihan Variasi Ukuran (Pisahkan dengan tanda koma)</label>
                  <input
                    type="text"
                    value={productForm.variationsStr}
                    onChange={(e) => {
                      const str = e.target.value;
                      const parsed = str.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
                      const active = parsed.length > 0 ? parsed : ['Standar'];
                      const updatedStocks = { ...productForm.variationStocks };
                      active.forEach((v) => {
                        if (updatedStocks[v] === undefined) {
                          updatedStocks[v] = Math.max(0, Math.floor((productForm.stock || 100) / active.length));
                        }
                      });
                      setProductForm({
                        ...productForm,
                        variationsStr: str,
                        variationStocks: updatedStocks,
                      });
                    }}
                    placeholder="Contoh: 500 gram, 1 kg, 2 kg, 5 kg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                {/* Alokasi Stok per Variasi Produk */}
                <div className="sm:col-span-12 p-3.5 bg-amber-50/70 border-2 border-amber-200 rounded-2xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-700" />
                        <span>Alokasi Stok per Variasi Produk</span>
                      </h4>
                      <p className="text-[10px] text-amber-800 font-medium">
                        Tentukan jumlah stok untuk tiap variasi ukuran. Jumlah total akan terakumulasi otomatis ke database saat Anda klik simpan.
                      </p>
                    </div>
                    <span className="text-[11px] font-black bg-amber-200 text-amber-950 px-2.5 py-1 rounded-lg">
                      Total: {
                        productForm.variationsStr.split(',').map(v => v.trim()).filter(v => v.length > 0).reduce((sum, v) => sum + (Number(productForm.variationStocks[v]) || 0), 0) || productForm.stock
                      } Unit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {(productForm.variationsStr.split(',').map(v => v.trim()).filter(v => v.length > 0).length > 0
                      ? productForm.variationsStr.split(',').map(v => v.trim()).filter(v => v.length > 0)
                      : ['Standar']
                    ).map((varName) => {
                      const curVal = productForm.variationStocks[varName] !== undefined ? productForm.variationStocks[varName] : (Number(productForm.stock) || 100);
                      return (
                        <div key={varName} className="bg-white p-2 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                          <span className="font-extrabold text-slate-800 truncate text-[11px]">{varName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = Math.max(0, curVal - 10);
                                const newStocks = { ...productForm.variationStocks, [varName]: newVal };
                                const newTotal = Object.values(newStocks).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                setProductForm({ ...productForm, variationStocks: newStocks, stock: newTotal });
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                              title="Kurang 10"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={curVal}
                              onChange={(e) => {
                                const newVal = Math.max(0, Number(e.target.value));
                                const newStocks = { ...productForm.variationStocks, [varName]: newVal };
                                const newTotal = Object.values(newStocks).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                setProductForm({ ...productForm, variationStocks: newStocks, stock: newTotal });
                              }}
                              className="w-14 px-1.5 py-0.5 text-center font-black bg-slate-50 border border-slate-200 rounded text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = curVal + 10;
                                const newStocks = { ...productForm.variationStocks, [varName]: newVal };
                                const newTotal = Object.values(newStocks).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                                setProductForm({ ...productForm, variationStocks: newStocks, stock: newTotal });
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                              title="Tambah 10"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ================= PENGATURAN DISKON ANGGOTA (PER PRODUK) ================= */}
                <div className="sm:col-span-12 p-4 bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                        <span>🏷️ Fitur Diskon Khusus Anggota (Per Produk)</span>
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                        Tentukan diskon khusus anggota. Harga diskon otomatis dihitung dan hanya berlaku untuk akun yang login anggota.
                      </p>
                    </div>

                    {/* Tombol Aktif / Nonaktif Diskon */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950">Status Diskon:</span>
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, hasMemberDiscount: !productForm.hasMemberDiscount })}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          productForm.hasMemberDiscount
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <span>{productForm.hasMemberDiscount ? '✅ Aktif' : '⚪ Nonaktif'}</span>
                      </button>
                    </div>
                  </div>

                  {productForm.hasMemberDiscount ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-4">
                        <label className="block font-extrabold text-emerald-950 mb-1">
                          Tipe Diskon Anggota
                        </label>
                        <select
                          value={productForm.memberDiscountType}
                          onChange={(e) => setProductForm({ ...productForm, memberDiscountType: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="percentage">% (Persentase Diskon)</option>
                          <option value="fixed">Rp (Potongan Nominal Tetap)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block font-extrabold text-emerald-950 mb-1">
                          Besaran Diskon Anggota ({productForm.memberDiscountType === 'percentage' ? '%' : 'Rp'})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={productForm.memberDiscountValue}
                          onChange={(e) => setProductForm({ ...productForm, memberDiscountValue: Number(e.target.value) })}
                          placeholder={productForm.memberDiscountType === 'percentage' ? '10' : '5000'}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Harga Khusus Anggota Otomatis */}
                      <div className="sm:col-span-4 bg-white p-3 rounded-xl border-2 border-emerald-400 shadow-xs flex flex-col justify-center">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Harga Anggota (Otomatis):
                        </div>
                        <div className="text-xl font-black text-emerald-700">
                          {formatRupiah(calcMemberPrice(productForm.price, productForm.memberDiscountType, productForm.memberDiscountValue))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Normal {formatRupiah(productForm.price)} - {productForm.memberDiscountType === 'percentage' ? `${productForm.memberDiscountValue}%` : formatRupiah(productForm.memberDiscountValue)}
                        </div>
                      </div>

                      {/* Contoh Penerapan Koperasi */}
                      <div className="sm:col-span-12 bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">
                          <span className="font-black text-emerald-950">💡 Contoh:</span>
                          <span className="ml-1.5">Beras: Rp50.000 (10%) = Rp45.000 • Minyak Goreng: Rp50.000 (Rp5.000) = Rp45.000</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                          Kalkulasi Real-Time
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 bg-white/60 p-3 rounded-xl border border-dashed border-slate-200">
                      Diskon anggota saat ini <strong>Nonaktif</strong>. Produk ini akan dijual dengan harga normal {formatRupiah(productForm.price)} kepada semua pelanggan.
                    </div>
                  )}
                </div>

                 {/* ================= PENGATURAN DISKON BASIC (PER PRODUK) ================= */}
                <div className="sm:col-span-12 p-4 bg-sky-50/70 border-2 border-sky-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-sky-950 flex items-center gap-2">
                        <span>👥 Fitur Diskon Basic / Umum (Per Produk)</span>
                      </h4>
                      <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                        Diskon otomatis berlaku untuk akun Basic yang <strong>belum login sebagai anggota</strong>. Terpisah dari diskon anggota dan tidak dijumlahkan bersamaan.
                      </p>
                    </div>

                    {/* Tombol Aktif / Nonaktif Diskon Basic */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-sky-950">Status Diskon:</span>
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, hasVisitorDiscount: !productForm.hasVisitorDiscount })}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          productForm.hasVisitorDiscount
                            ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <span>{productForm.hasVisitorDiscount ? '✅ Aktif' : '⚪ Nonaktif'}</span>
                      </button>
                    </div>
                  </div>

                  {productForm.hasVisitorDiscount ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-4">
                        <label className="block font-extrabold text-sky-950 mb-1">
                          Tipe Diskon Basic
                        </label>
                        <select
                          value={productForm.visitorDiscountType}
                          onChange={(e) => setProductForm({ ...productForm, visitorDiscountType: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="percentage">% (Persentase Diskon)</option>
                          <option value="fixed">Rp (Potongan Nominal Tetap)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block font-extrabold text-sky-950 mb-1">
                          Besaran Diskon Basic ({productForm.visitorDiscountType === 'percentage' ? '%' : 'Rp'})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={productForm.visitorDiscountValue}
                          onChange={(e) => setProductForm({ ...productForm, visitorDiscountValue: Number(e.target.value) })}
                          placeholder={productForm.visitorDiscountType === 'percentage' ? '5' : '3000'}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Harga Khusus Basic Otomatis */}
                      <div className="sm:col-span-4 bg-white p-3 rounded-xl border-2 border-sky-400 shadow-xs flex flex-col justify-center">
                        <div className="text-[10px] font-black uppercase tracking-wider text-sky-800">
                          Harga Basic (Otomatis):
                        </div>
                        <div className="text-xl font-black text-sky-700">
                          {formatRupiah(calcVisitorPrice(productForm.price, productForm.visitorDiscountType, productForm.visitorDiscountValue))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Normal {formatRupiah(productForm.price)} - {productForm.visitorDiscountType === 'percentage' ? `${productForm.visitorDiscountValue}%` : formatRupiah(productForm.visitorDiscountValue)}
                        </div>
                      </div>

                      <div className="sm:col-span-12 bg-white/80 p-2.5 rounded-xl border border-sky-200 text-[11px] text-sky-900 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">
                          <span className="font-black text-sky-950">💡 Info Aturan:</span>
                          <span className="ml-1.5">Akun Basic yang belum login otomatis melihat harga ini di katalog & keranjang belanja. Saat login anggota, harga otomatis beralih ke diskon anggota/normal.</span>
                        </div>
                        <span className="text-[10px] bg-sky-100 text-sky-900 px-2 py-0.5 rounded-md font-bold">
                          Kalkulasi Real-Time
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 bg-white/60 p-3 rounded-xl border border-dashed border-slate-200">
                      Diskon Basic saat ini <strong>Nonaktif</strong>. Akun Basic tanpa login akan melihat harga normal {formatRupiah(productForm.price)}.
                    </div>
                  )}
                </div>

                {/* ================= GALERI FOTO (MAKS 5 FOTO) & VIDEO PRODUK ================= */}
                <div className="sm:col-span-12 bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>📸 Galeri Media Produk (Maks. 5 Foto & 1 Video)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Unggah foto berkualitas & video singkat produk untuk menarik minat belanja pelanggan.
                      </p>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Foto Terpasang: {productForm.images.length}/5
                    </span>
                  </div>

                  {/* List Foto Terpasang */}
                  <div className="space-y-2">
                    <label className="block font-extrabold text-slate-700">Daftar Foto Produk (Utama & Tambahan)</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {productForm.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs shrink-0 group">
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-black text-center py-0.5">
                              Foto Utama
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black hover:bg-red-700 cursor-pointer shadow-xs"
                            title="Hapus foto ini"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {productForm.images.length < 5 && (
                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/80 flex flex-col items-center justify-center text-slate-400 text-xs shrink-0">
                          <span className="text-lg font-black">+</span>
                          <span className="text-[9px] font-bold">Maks. 5</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input Foto Baru via Upload / URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200/80">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block font-bold text-slate-700 text-[11px]">Tambah Foto dari File (Upload Maks. 3MB)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={productForm.images.length >= 5}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block font-bold text-slate-700 text-[11px]">Atau Tambah Foto dari URL Web</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newPhotoInputUrl}
                          onChange={(e) => setNewPhotoInputUrl(e.target.value)}
                          placeholder="https://... (URL foto)"
                          disabled={productForm.images.length >= 5}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotoUrl}
                          disabled={productForm.images.length >= 5}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Input Video Produk (Max 1 Video) */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-2">
                    <label className="block font-extrabold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-red-600" />
                        <span>Video Short Preview Produk (Opsional - Maks. 1 Video MP4 / URL)</span>
                      </span>
                      {productForm.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, videoUrl: '' })}
                          className="text-red-600 hover:text-red-700 font-bold text-[11px] cursor-pointer"
                        >
                          Hapus Video
                        </button>
                      )}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-6 space-y-1">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileChange}
                          className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <input
                          type="url"
                          value={productForm.videoUrl}
                          onChange={(e) => setProductForm({ ...productForm, videoUrl: e.target.value })}
                          placeholder="Atau tempelkan URL Video (https://.../video.mp4)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                      </div>
                    </div>

                    {productForm.videoUrl && (
                      <div className="mt-2 bg-black/90 p-2 rounded-2xl max-w-sm">
                        <video src={productForm.videoUrl} controls className="w-full max-h-40 rounded-xl object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white shadow-md cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan ke Sistem...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-white" />
                        <span>Simpan / Update Produk</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Produk</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Harga Normal</th>
                    <th className="p-3.5">Diskon Basic</th>
                    <th className="p-3.5">Harga Basic</th>
                    <th className="p-3.5">Diskon Anggota</th>
                    <th className="p-3.5">Harga Anggota</th>
                    <th className="p-3.5 text-center">Status Stok</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod) => {
                    const visitorPrice = calcVisitorPrice(prod.price || 50000, prod.visitorDiscountType, prod.visitorDiscountValue);
                    const memberPrice = calcMemberPrice(prod.price || 50000, prod.memberDiscountType, prod.memberDiscountValue);
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 flex items-center gap-2.5 font-bold text-slate-900">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                          ) : (
                            <span className="text-xl w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg shrink-0">{prod.emoji || '📦'}</span>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900">{prod.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {prod.variations ? prod.variations.join(', ') : 'Standar'}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">{prod.category}</td>
                        <td className="p-3.5 font-black text-slate-900">{formatRupiah(prod.price || 50000)}</td>
                        
                        {/* Diskon Basic & Status */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            {prod.hasVisitorDiscount && prod.visitorDiscountValue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 text-[11px] font-black border border-sky-200">
                                {prod.visitorDiscountType === 'percentage' ? `${prod.visitorDiscountValue}%` : formatRupiah(prod.visitorDiscountValue)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            <div>
                              <button
                                onClick={() => handleToggleVisitorDiscount(prod)}
                                title="Klik untuk Mengaktifkan/Menonaktifkan Diskon Basic"
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                                  prod.hasVisitorDiscount
                                    ? 'bg-sky-100 text-sky-800 hover:bg-sky-200 ring-1 ring-sky-300'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {prod.hasVisitorDiscount ? '✅ Aktif' : '⚪ Nonaktif'}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-black text-sky-700">
                          {prod.hasVisitorDiscount && prod.visitorDiscountValue ? (
                            formatRupiah(visitorPrice)
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Diskon Anggota & Status */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            {prod.hasMemberDiscount && prod.memberDiscountValue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                                {prod.memberDiscountType === 'percentage' ? `${prod.memberDiscountValue}%` : formatRupiah(prod.memberDiscountValue)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            <div>
                              <button
                                onClick={() => handleToggleMemberDiscount(prod)}
                                title="Klik untuk Mengaktifkan/Menonaktifkan Diskon Anggota"
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                                  prod.hasMemberDiscount
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ring-1 ring-emerald-300'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {prod.hasMemberDiscount ? '✅ Aktif' : '⚪ Nonaktif'}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-black text-emerald-700">
                          {prod.hasMemberDiscount && prod.memberDiscountValue ? (
                            formatRupiah(memberPrice)
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs">
                              {prod.stock !== undefined ? prod.stock : 100} unit
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleProductAvailability(prod)}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                                  prod.isAvailable !== false
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                                title="Klik untuk mengubah status Tersedia / Kosong"
                              >
                                {prod.isAvailable !== false ? '🟢 Tersedia' : '🔴 Kosong'}
                              </button>
                              <button
                                onClick={() => handleOpenStockModal(prod)}
                                className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer border border-amber-300/80"
                                title="Kelola & Sesuaikan Stok per Variasi"
                              >
                                <Package className="w-2.5 h-2.5 text-amber-700" />
                                <span>Atur</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenStockModal(prod)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold cursor-pointer"
                            title="Atur Stok Variasi"
                          >
                            <Package className="w-3 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartEditProduct(prod)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold cursor-pointer"
                            title="Edit / Update Diskon Produk"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeleteProduct(prod)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold transition-transform active:scale-95 cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: 🎁 GIFT VOUCHER ===================== */}
      {activeSubTab === 'vouchers' && (
        <AdminGiftVoucherManager
          vouchers={vouchers}
          products={products}
          members={members}
        />
      )}

      {/* ===================== SUBTAB 2B: 🎁 PROGRAM GIFT BONUS ===================== */}
      {activeSubTab === "promotions" && (
        <AdminGiftBonusManager
          promotions={promotions}
          products={products}
          members={members}
          initialTab="programs"
        />
      )}

      {/* ===================== SUBTAB: 📊 RIWAYAT GIFT & BONUS ===================== */}
      {activeSubTab === "giftHistory" && (
        <AdminGiftBonusManager
          promotions={promotions}
          products={products}
          members={members}
          initialTab="history"
        />
      )}

      {/* ===================== SUBTAB: ⭐ POINT PEMBELIAN ===================== */}
      {activeSubTab === "points" && (
        <AdminPointsManager
          products={products}
          members={members}
        />
      )}

      {/* ===================== SUBTAB: 📊 STATISTIK & ANALITIK WEBSITE ===================== */}
      {activeSubTab === "analytics" && (
        <AdminAnalyticsManager />
      )}

      {/* ===================== SUBTAB 3: MENU KARYAWAN ===================== */}
      {activeSubTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchEmployeeFilter}
                onChange={(e) => setSearchEmployeeFilter(e.target.value)}
                placeholder="Cari nama atau NIK KTP karyawan..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {isManager ? (
              <button
                onClick={handleStartAddEmployee}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Karyawan Baru
              </button>
            ) : (
              <button
                onClick={() => showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menambah data karyawan baru.', 'error')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-not-allowed"
                title="Terkunci: Khusus Manager Wakhid Nur Kharim"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Tambah Karyawan (Khusus Manager)
              </button>
            )}
          </div>

          {/* Employee Form (Add/Edit) */}
          {isEditingEmployee && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>{editingEmployeeId ? 'Edit Data Karyawan (Otoritas: Wakhid Nur Kharim)' : 'Tambah Karyawan Baru (Otoritas: Wakhid Nur Kharim)'}</span>
                </h3>
                <button
                  onClick={() => setIsEditingEmployee(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                {/* Visual Error Banner if any */}
                {Object.keys(employeeFormErrors).length > 0 && (
                  <div className="sm:col-span-12 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black">Penyebab Gagal Simpan Data Karyawan:</p>
                      <ul className="list-disc list-inside font-medium text-[11px] mt-1 space-y-0.5">
                        {Object.values(employeeFormErrors).map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">
                      Nama Lengkap Karyawan <span className="text-red-600">*</span>
                    </label>
                    {employeeFormErrors.name && (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {employeeFormErrors.name}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => {
                      setEmployeeForm({ ...employeeForm, name: e.target.value });
                      if (employeeFormErrors.name) setEmployeeFormErrors({ ...employeeFormErrors, name: '' });
                    }}
                    placeholder="Bpk. Hendra Wijaya"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 transition-colors ${
                      employeeFormErrors.name ? 'border-red-400 bg-red-50/50 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-600'
                    }`}
                  />
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">
                      NIK KTP (16 Digit Wajib) <span className="text-red-600">*</span>
                    </label>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      employeeForm.nik.length === 16 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : employeeForm.nik.length > 0 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {employeeForm.nik.length}/16 digit {employeeForm.nik.length === 16 ? '✓ Pas' : '(Harus 16)'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={employeeForm.nik}
                    onChange={(e) => {
                      setEmployeeForm({ ...employeeForm, nik: e.target.value.replace(/[^0-9]/g, '') });
                      if (employeeFormErrors.nik) setEmployeeFormErrors({ ...employeeFormErrors, nik: '' });
                    }}
                    placeholder="3174061208850003 (16 Digit)"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900 transition-colors ${
                      employeeFormErrors.nik ? 'border-red-400 bg-red-50/50 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-600'
                    }`}
                  />
                  {employeeFormErrors.nik && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {employeeFormErrors.nik}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">ID Karyawan</label>
                  <input
                    type="text"
                    value={employeeForm.employeeId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                    placeholder="KMP-EMP-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">
                      Email Google / Gmail Login <span className="text-red-600">*</span>
                    </label>
                    {employeeFormErrors.email && (
                      <span className="text-[10px] text-red-600 font-bold">{employeeFormErrors.email}</span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => {
                      setEmployeeForm({ ...employeeForm, email: e.target.value });
                      if (employeeFormErrors.email) setEmployeeFormErrors({ ...employeeFormErrors, email: '' });
                    }}
                    placeholder="nama.karyawan@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk verifikasi Google OAuth saat login staf.</p>
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Peran Akses (RBAC)</label>
                  <select
                    value={employeeForm.employeeRole}
                    onChange={(e) => {
                      const newRole = e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'PENGIRIMAN';
                      setEmployeeForm({
                        ...employeeForm,
                        employeeRole: newRole,
                        permissions: getDefaultPermissionsForRole(newRole),
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900"
                  >
                    <option value="KASIR">🛒 Kasir POS (Kasir & Transaksi Sembako)</option>
                    <option value="PENGIRIMAN">🚚 Kurir & Pengiriman (Pusat Pengiriman)</option>
                    <option value="ADMIN">🛡️ Admin Operasional (Kelola Stok & Anggota)</option>
                    <option value="SUPER_ADMIN">👑 Super Admin / Manager (Akses Penuh)</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    placeholder="Admin Kasir & Stok Sembako"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">No. WhatsApp / HP</label>
                    {employeeFormErrors.phone && (
                      <span className="text-[10px] text-red-600 font-bold">{employeeFormErrors.phone}</span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={employeeForm.phone}
                    onChange={(e) => {
                      setEmployeeForm({ ...employeeForm, phone: e.target.value });
                      if (employeeFormErrors.phone) setEmployeeFormErrors({ ...employeeFormErrors, phone: '' });
                    }}
                    placeholder="0858-8168-8927"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Status Karyawan</label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="active">Aktif Bekerja</option>
                    <option value="inactive">Nonaktif / Cuti</option>
                  </select>
                </div>

                {/* Login Authorization Switch */}
                <div className="sm:col-span-12 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-600" />
                      Izin Login dengan Google (OAuth)
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Jika diaktifkan, email Gmail yang tertera di atas diizinkan masuk ke Sistem Management Website Kopdes Merah Putih.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmployeeForm({ ...employeeForm, isLoginAllowed: !employeeForm.isLoginAllowed })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                      employeeForm.isLoginAllowed
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {employeeForm.isLoginAllowed ? '✅ Login Diizinkan' : '⛔ Login Ditolak'}
                  </button>
                </div>

                {/* Permissions Checklist */}
                <div className="sm:col-span-12 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-slate-800">Rincian Hak Akses & Fitur Karyawan:</label>
                    <span className="text-[10px] text-slate-500">Centang fitur yang dapat diakses oleh staf ini</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'kasir_pos', label: '🛒 Kasir POS' },
                      { key: 'kelola_produk', label: '📦 Kelola Produk & Stok' },
                      { key: 'riwayat_penjualan', label: '📋 Riwayat Penjualan' },
                      { key: 'pusat_pengiriman', label: '🚚 Pusat Pengiriman' },
                      { key: 'kelola_anggota', label: '👥 Kelola Data Anggota' },
                      { key: 'kelola_basic', label: '🏬 Kelola Pengunjung Basic' },
                      { key: 'kelola_karyawan', label: '👨‍💼 Kelola Karyawan' },
                      { key: 'promo', label: '🎁 Promo & Voucher' },
                      { key: 'pengaturan_website', label: '⚙️ Pengaturan Website' },
                    ].map((item) => {
                      const isChecked = employeeForm.permissions.includes(item.key as EmployeePermission);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition-all ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const key = item.key as EmployeePermission;
                              if (e.target.checked) {
                                setEmployeeForm({
                                  ...employeeForm,
                                  permissions: [...employeeForm.permissions, key],
                                });
                              } else {
                                setEmployeeForm({
                                  ...employeeForm,
                                  permissions: employeeForm.permissions.filter((p) => p !== key),
                                });
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Validation checklist hint */}
                <div className="sm:col-span-12 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-black text-slate-800">📋 Tanda & Ketentuan Data Karyawan:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={employeeForm.name.trim().length >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {employeeForm.name.trim().length >= 3 ? '✓' : '○'} Nama terisi (minimal 3 huruf)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={employeeForm.nik.length === 16 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {employeeForm.nik.length === 16 ? '✓' : '○'} NIK KTP tepat 16 digit angka
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmployee(false);
                      setEmployeeFormErrors({});
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    💾 Simpan Data Karyawan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Employees Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900">Daftar Karyawan Resmi Koperasi</h4>
                <p className="text-[11px] text-slate-500">Nama dan NIK KTP tersimpan di Firestore dan dapat diedit oleh pengurus.</p>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                Total: {filteredEmployees.length} Staf
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nama & ID Karyawan</th>
                    <th className="p-3.5">Email Gmail (Google OAuth)</th>
                    <th className="p-3.5">Peran (RBAC) & Posisi</th>
                    <th className="p-3.5">NIK KTP</th>
                    <th className="p-3.5 text-center">Akses Login</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const roleColorMap: Record<string, string> = {
                      SUPER_ADMIN: 'bg-purple-100 text-purple-900 border-purple-300',
                      ADMIN: 'bg-blue-100 text-blue-900 border-blue-300',
                      KASIR: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                      PENGIRIMAN: 'bg-amber-100 text-amber-900 border-amber-300',
                    };

                    const roleLabelMap: Record<string, string> = {
                      SUPER_ADMIN: '👑 Super Admin',
                      ADMIN: '🛡️ Admin Operasional',
                      KASIR: '🛒 Kasir POS',
                      PENGIRIMAN: '🚚 Kurir Pengiriman',
                    };

                    const roleKey = emp.employeeRole || 'KASIR';
                    const isOAuthAllowed = emp.isLoginAllowed !== false && emp.status === 'active';

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{emp.name}</div>
                            <div className="text-[10px] font-mono text-emerald-700 font-bold">{emp.employeeId || emp.id}</div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-800 font-bold">
                          {emp.email ? (
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {emp.email}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum ada Gmail -</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          <div className="space-y-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black ${roleColorMap[roleKey] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                              {roleLabelMap[roleKey] || roleKey}
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">{emp.position || 'Staff Koperasi'}</div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-[11px]">
                            {emp.nik || '-'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isOAuthAllowed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isOAuthAllowed ? '✅ Google OAuth' : '⛔ Terkunci'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {isManager ? (
                            <button
                              onClick={() => handleToggleEmployeeStatus(emp)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                                emp.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title="Klik untuk ubah status keaktifan"
                            >
                              {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </button>
                          ) : (
                            <button
                              onClick={() => showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang mengubah status keaktifan karyawan.', 'error')}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-not-allowed border border-slate-200 inline-flex items-center gap-1 ${
                                emp.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title="Terkunci: Khusus Manager Wakhid Nur Kharim"
                            >
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                              {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </button>
                          )}
                        </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {isManager ? (
                          <>
                            <button
                              onClick={() => handleStartEditEmployee(emp)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-transform active:scale-95 cursor-pointer"
                              title="Edit Data Karyawan (Wakhid Nur Kharim - Manager Koperasi)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => promptDeleteEmployee(emp)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold transition-transform active:scale-95 cursor-pointer"
                              title="Hapus Karyawan (Wakhid Nur Kharim - Manager Koperasi)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang mengedit atau merubah data karyawan.', 'error')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold cursor-not-allowed border border-slate-200 inline-flex items-center gap-1"
                              title="Terkunci: Hanya Wakhid Nur Kharim (Manager Koperasi) yang berwenang mengedit"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <Edit3 className="w-3.5 h-3.5 opacity-40" />
                            </button>
                            <button
                              onClick={() => showNotification('Akses Ditolak: Hanya Bpk. Wakhid Nur Kharim (Manager Koperasi) yang berwenang menghapus data karyawan.', 'error')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold cursor-not-allowed border border-slate-200 inline-flex items-center gap-1"
                              title="Terkunci: Hanya Wakhid Nur Kharim (Manager Koperasi) yang berwenang menghapus"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <Trash2 className="w-3.5 h-3.5 opacity-40" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 4: MENU ANGGOTA (NAMA & NOMOR ANGGOTA - DAPAT DI-EDIT OLEH KARYAWAN) ===================== */}
      {activeSubTab === 'members' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchMemberFilter}
                onChange={(e) => setSearchMemberFilter(e.target.value)}
                placeholder="Cari nama atau Nomor Anggota (misal KMP-ANG-001)..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              onClick={handleStartAddMember}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Daftarkan Anggota Baru
            </button>
          </div>

          {/* Member Form (Add/Edit) */}
          {isEditingMember && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>{editingMemberId ? 'Edit Data Anggota (Nama & Nomor Anggota)' : 'Daftarkan Anggota Baru Koperasi'}</span>
                </h3>
                <button
                  onClick={() => setIsEditingMember(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                {/* Visual Error Banner if any */}
                {Object.keys(memberFormErrors).length > 0 && (
                  <div className="sm:col-span-12 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black">Penyebab Gagal Simpan Data Anggota:</p>
                      <ul className="list-disc list-inside font-medium text-[11px] mt-1 space-y-0.5">
                        {Object.values(memberFormErrors).map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">
                      Nomor Anggota Koperasi <span className="text-red-600">*</span>
                    </label>
                    {memberFormErrors.memberNumber && (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {memberFormErrors.memberNumber}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={memberForm.memberNumber}
                    onChange={(e) => {
                      setMemberForm({ ...memberForm, memberNumber: e.target.value.toUpperCase() });
                      if (memberFormErrors.memberNumber) setMemberFormErrors({ ...memberFormErrors, memberNumber: '' });
                    }}
                    placeholder="KMP-ANG-001"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono font-black text-red-700 uppercase transition-colors ${
                      memberFormErrors.memberNumber ? 'border-red-400 bg-red-50/50 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-600'
                    }`}
                  />
                </div>

                <div className="sm:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">
                      Nama Lengkap Anggota <span className="text-red-600">*</span>
                    </label>
                    {memberFormErrors.name && (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {memberFormErrors.name}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={memberForm.name}
                    onChange={(e) => {
                      setMemberForm({ ...memberForm, name: e.target.value });
                      if (memberFormErrors.name) setMemberFormErrors({ ...memberFormErrors, name: '' });
                    }}
                    placeholder="Ibu Rina Kartika / Bpk. Hendra Gunawan"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 transition-colors ${
                      memberFormErrors.name ? 'border-red-400 bg-red-50/50 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-600'
                    }`}
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="tel"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="0812-3456-7890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-slate-700">NIK KTP (Opsional)</label>
                    {memberForm.nik && (
                      <span className={`text-[10px] font-mono ${memberForm.nik.length === 16 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {memberForm.nik.length}/16 digit
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={16}
                    value={memberForm.nik}
                    onChange={(e) => {
                      setMemberForm({ ...memberForm, nik: e.target.value.replace(/[^0-9]/g, '') });
                      if (memberFormErrors.nik) setMemberFormErrors({ ...memberFormErrors, nik: '' });
                    }}
                    placeholder="317406xxxxxx (16 Digit)"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono transition-colors ${
                      memberFormErrors.nik ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                    }`}
                  />
                  {memberFormErrors.nik && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {memberFormErrors.nik}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-extrabold text-slate-700 mb-1">Status Keanggotaan</label>
                  <select
                    value={memberForm.status}
                    onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as 'active' | 'inactive' | 'blocked' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="active">🟢 Anggota Aktif</option>
                    <option value="inactive">🔴 Nonaktif</option>
                    <option value="blocked">⛔ Terblokir</option>
                  </select>
                </div>

                <div className="sm:col-span-12">
                  <label className="block font-extrabold text-slate-700 mb-1">Alamat Pengiriman Warga</label>
                  <input
                    type="text"
                    value={memberForm.address}
                    onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                    placeholder="Jl. Cengkareng Timur No. 42, RT 03/RW 08, Jakarta Barat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                {/* Member validation guide box */}
                <div className="sm:col-span-12 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-black text-slate-800">📋 Tanda & Ketentuan Data Anggota:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={memberForm.memberNumber.trim().length >= 4 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {memberForm.memberNumber.trim().length >= 4 ? '✓' : '○'} Nomor Anggota unik (contoh: KMP-ANG-001)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={memberForm.name.trim().length >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {memberForm.name.trim().length >= 3 ? '✓' : '○'} Nama Anggota terisi (minimal 3 huruf)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingMember(false);
                      setMemberFormErrors({});
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    💾 Simpan Data Anggota
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900">Daftar Anggota Resmi Koperasi & Pengelolaan Akses Login</h4>
                <p className="text-[11px] text-slate-500">
                  Sistem pengelolaan akun login anggota berdasarkan Nomor HP dan Nomor Anggota yang terhubung ke Admin Panel.
                </p>
              </div>
              <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
                Total: {filteredMembers.length} Anggota
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/70 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nama Anggota</th>
                    <th className="p-3.5">Nomor Anggota</th>
                    <th className="p-3.5">📱 Nomor HP (Login)</th>
                    <th className="p-3.5">Alamat Lengkap</th>
                    <th className="p-3.5 text-center">Status Anggota</th>
                    <th className="p-3.5 text-center">Status Login</th>
                    <th className="p-3.5">Login Pertama</th>
                    <th className="p-3.5">Login Terakhir</th>
                    <th className="p-3.5 text-center">Akses Login</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((mem) => {
                    const isOnline = mem.loginStatus === 'online';
                    const isLoginAllowed = mem.isLoginAllowed !== false;

                    return (
                      <tr key={mem.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* 1. Nama Anggota */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="font-black text-slate-900">{mem.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Terdaftar: {mem.joinedDate || '2024'}
                          </div>
                        </td>

                        {/* 2. Nomor Anggota */}
                        <td className="p-3.5 font-mono font-black text-red-700">
                          <span className="bg-red-50 text-red-800 px-2.5 py-1 rounded-lg border border-red-200 font-mono text-[11px]">
                            {mem.memberNumber}
                          </span>
                        </td>

                        {/* 3. Nomor HP */}
                        <td className="p-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5 font-mono text-slate-900">
                            <span className="text-slate-400">📱</span>
                            <span>{mem.phone || '-'}</span>
                          </div>
                        </td>

                        {/* 4. Alamat */}
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px]" title={mem.address}>
                            {mem.address || '-'}
                          </div>
                        </td>

                        {/* 5. Status Anggota */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleMemberStatus(mem)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                              mem.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : mem.status === 'blocked' || mem.status === 'Terblokir'
                                ? 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Klik untuk ubah status keaktifan anggota (Aktif -> Nonaktif -> Terblokir)"
                          >
                            {mem.status === 'active' ? '🟢 Aktif' : mem.status === 'blocked' || mem.status === 'Terblokir' ? '⛔ Terblokir' : '🔴 Nonaktif'}
                          </button>
                        </td>

                        {/* 6. Status Login */}
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <span>{isOnline ? '🟢' : '🔴'}</span>
                            <span>{isOnline ? 'Aktif' : 'Tidak Aktif'}</span>
                          </span>
                        </td>

                        {/* 7. Login Pertama */}
                        <td className="p-3.5 text-[11px] text-slate-600 font-medium">
                          {mem.firstLoginAt ? (
                            <span className="font-mono text-slate-800 text-[10px]">{mem.firstLoginAt}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Belum Login</span>
                          )}
                        </td>

                        {/* 8. Login Terakhir */}
                        <td className="p-3.5 text-[11px] text-slate-600 font-medium">
                          {mem.lastLoginAt ? (
                            <span className="font-mono text-slate-800 text-[10px]">{mem.lastLoginAt}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Belum Login</span>
                          )}
                        </td>

                        {/* 9. Akses Login Toggle */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleMemberLoginAllowed(mem)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto border shadow-2xs ${
                              isLoginAllowed
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                            }`}
                            title={isLoginAllowed ? 'Akses Login Aktif. Klik untuk Nonaktifkan Login' : 'Akses Login Mati. Klik untuk Diizinkan Login'}
                          >
                            <span>{isLoginAllowed ? '🟢' : '🔴'}</span>
                            <span>{isLoginAllowed ? 'Izinkan Login' : 'Nonaktifkan Login'}</span>
                          </button>
                        </td>

                        {/* 10. Aksi */}
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(mem.memberNumber);
                              showNotification(`Nomor "${mem.memberNumber}" disalin!`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                            title="Salin Nomor Anggota"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartEditMember(mem)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold"
                            title="Edit Data Anggota"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeleteMember(mem)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold transition-transform active:scale-95 cursor-pointer"
                            title="Hapus Anggota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB: PENGUNJUNG & ANGGOTA (SISTEM AKUN WEBSITE) ===================== */}
      {activeSubTab === 'visitors' && (
        <AdminVisitorManager />
      )}

      {/* ===================== SUBTAB: KOTAK PESAN & PEMBERITAHUAN PELANGGAN ===================== */}
      {activeSubTab === 'inbox' && (
        <AdminInboxManager />
      )}

      {/* ===================== SUBTAB 5: STAFF CREDENTIALS & SECURITY ===================== */}
      {activeSubTab === 'staffInfo' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Key className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                Informasi Staf & Kunci Rahasia Registrasi
              </h3>
              <p className="text-xs text-slate-500">
                Sistem keamanan otentikasi role Karyawan vs Anggota Koperasi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-red-800">
                🔑 Kunci Rahasia Pendaftaran Karyawan (Secret Key)
              </div>
              <div className="p-3 bg-white border border-red-200 rounded-xl font-mono text-base font-black text-red-700 flex items-center justify-between">
                <span>{STAFF_SECRET_KEY}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(STAFF_SECRET_KEY);
                    showNotification('Secret key disalin!');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-red-700 p-1"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-red-900/80 leading-relaxed">
                Berikan kunci rahasia ini hanya kepada pengurus dan staf resmi Koperasi Desa Merah Putih ketika mendaftarkan akun baru.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                📋 Data Karyawan Saat Ini
              </div>
              <div className="space-y-1 text-xs">
                <p><strong>Nama:</strong> {user?.displayName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>ID Karyawan:</strong> {user?.employeeId || 'EMP-KT-001'}</p>
                <p><strong>Peran Sistem:</strong> <span className="text-emerald-700 font-bold">Karyawan / Admin Gerai</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 6: SLIDER / CAROUSEL MANAGEMENT ===================== */}
      {activeSubTab === 'slider' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-black text-slate-900">Kelola Carousel / Slider Banner Bergerak</h3>
                <p className="text-xs text-slate-500">Banner slider yang tampil di bawah header utama dengan geser kanan/kiri.</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {banners.length} Banner Aktif
            </span>
          </div>

          {/* Add Banner Form */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Tambah Banner / Slider Baru</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Banner</label>
                <input 
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Contoh: Gerai Sembako Murah & Terpercaya"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Label Badge (Pita)</label>
                <input 
                  type="text"
                  value={bannerForm.badgeText}
                  onChange={(e) => setBannerForm({ ...bannerForm, badgeText: e.target.value })}
                  placeholder="Contoh: PROMO UTAMA"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subjudul / Keterangan</label>
              <textarea 
                rows={2}
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="Keterangan singkat banner slider..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Gambar / Upload File (PNG, JPEG, JPG, GIF)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shrink-0">
                    📂 Pilih File
                    <input 
                      type="file" 
                      accept=".png,.jpeg,.jpg,.gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) setBannerForm({ ...bannerForm, imageUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!bannerForm.title || !bannerForm.imageUrl) {
                    alert('Mohon isi judul dan gambar banner.');
                    return;
                  }
                  addBanner(bannerForm);
                  setBannerForm({ title: '', subtitle: '', imageUrl: '', badgeText: 'INFO' });
                  alert('Banner slider berhasil ditambahkan!');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                + Simpan Banner
              </button>
            </div>
          </div>

          {/* Banner List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Daftar Banner Slider Aktif</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-4 items-center">
                  <img src={b.imageUrl} alt={b.title} className="w-24 h-16 object-cover rounded-xl border border-slate-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">{b.badgeText}</span>
                    <h5 className="text-xs font-black text-slate-900 truncate mt-1">{b.title}</h5>
                    <p className="text-[11px] text-slate-500 truncate">{b.subtitle}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Hapus banner ini?')) {
                        deleteBanner(b.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 7: APPEARANCE & LOGO MANAGEMENT ===================== */}
      {activeSubTab === 'appearance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-black text-slate-900">Kelola Tampilan & Logo Website</h3>
                <p className="text-xs text-slate-500">Ubah Logo Website, Header Background, Body Background, & Footer Background.</p>
              </div>
            </div>
            <button
              onClick={() => alert('Pengaturan tampilan & logo berhasil disimpan!')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Website */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">Logo Website (PNG, JPEG, JPG, GIF)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                  {appearance.logoUrl ? (
                    <img src={appearance.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">MP</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input 
                    type="text"
                    value={appearance.logoUrl}
                    onChange={(e) => updateAppearance({ logoUrl: e.target.value })}
                    placeholder="URL Logo atau upload file..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                  />
                  <label className="inline-block px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer">
                    📁 Upload Logo
                    <input 
                      type="file"
                      accept=".png,.jpeg,.jpg,.gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) updateAppearance({ logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Header Background */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">Header Background</label>
              <div className="space-y-2">
                <input 
                  type="text"
                  value={appearance.headerBgUrl}
                  onChange={(e) => updateAppearance({ headerBgUrl: e.target.value })}
                  placeholder="URL Header Background..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                />
                <label className="inline-block px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer">
                  📁 Upload Header Bg (PNG, JPG, GIF)
                  <input 
                    type="file"
                    accept=".png,.jpeg,.jpg,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) updateAppearance({ headerBgUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Body Background */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">Body Background</label>
              <div className="space-y-2">
                <input 
                  type="text"
                  value={appearance.bodyBgUrl}
                  onChange={(e) => updateAppearance({ bodyBgUrl: e.target.value })}
                  placeholder="URL Body Background..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                />
                <label className="inline-block px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer">
                  📁 Upload Body Bg (PNG, JPG, GIF)
                  <input 
                    type="file"
                    accept=".png,.jpeg,.jpg,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) updateAppearance({ bodyBgUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Footer Background */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">Footer Background</label>
              <div className="space-y-2">
                <input 
                  type="text"
                  value={appearance.footerBgUrl}
                  onChange={(e) => updateAppearance({ footerBgUrl: e.target.value })}
                  placeholder="URL Footer Background..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-emerald-600"
                />
                <label className="inline-block px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer">
                  📁 Upload Footer Bg (PNG, JPG, GIF)
                  <input 
                    type="file"
                    accept=".png,.jpeg,.jpg,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) updateAppearance({ footerBgUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 8: REVENUE & FINANCIAL DOCS MANAGEMENT ===================== */}
      {activeSubTab === 'revenue' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Kelola Grafik Pendapatan & Laporan Keuangan</h3>
                <p className="text-xs text-slate-500">Kelola rekapitulasi pendapatan bulanan dan dokumen laporan resmi.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingRevenue(false);
                  setEditingRevenueId(null);
                  setRevForm({ year: 2026, month: 'Januari', date: new Date().toISOString().split('T')[0], amount: 50000000, description: '' });
                  setIsRevenueModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Input Pendapatan Baru
              </button>
              <button
                onClick={() => {
                  setIsEditingDoc(false);
                  setEditingDocId(null);
                  setDocForm({ title: '', fileType: 'excel', fileSize: '2.0 MB', fileUrl: '#' });
                  setIsDocModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Upload Dokumen Laporan
              </button>
            </div>
          </div>

          {/* Revenue Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Daftar Rekapitulasi Pendapatan</h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <th className="p-3">Tahun</th>
                    <th className="p-3">Bulan / Tanggal</th>
                    <th className="p-3">Nominal Pendapatan</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-3 font-bold text-slate-900">{r.year}</td>
                      <td className="p-3 text-slate-700">{r.month} ({r.date})</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(r.amount)}
                      </td>
                      <td className="p-3 text-slate-600">{r.description}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setIsEditingRevenue(true);
                              setEditingRevenueId(r.id);
                              setRevForm({
                                year: r.year,
                                month: r.month,
                                date: r.date,
                                amount: r.amount,
                                description: r.description,
                              });
                              setIsRevenueModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            title="Edit Data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({
                                type: 'revenueRecord',
                                id: r.id,
                                title: r.description,
                                subtitle: `Tahun: ${r.year} • Bulan/Tanggal: ${r.month} (${r.date}) • Nominal: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(r.amount)}`,
                                badge: 'Rekapitulasi Pendapatan',
                                itemData: r,
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* List of uploaded financial documents with edit and delete buttons */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">Daftar Dokumen Resmi yang Telah Dipublish ({financialDocs.length})</h5>
            <div className="space-y-2">
              {financialDocs.map((doc) => (
                <div key={doc.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {doc.fileType === 'excel' ? '📊' : doc.fileType === 'word' ? '📝' : '📽️'}
                    </div>
                    <div className="min-w-0">
                      <h6 className="text-xs font-black text-slate-900 truncate">{doc.title}</h6>
                      <p className="text-[10px] text-slate-500">Ukuran: {doc.fileSize} • Diunggah: {doc.uploadDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setIsEditingDoc(true);
                        setEditingDocId(doc.id);
                        setDocForm({
                          title: doc.title,
                          fileType: doc.fileType,
                          fileSize: doc.fileSize,
                          fileUrl: doc.fileUrl,
                        });
                        setIsDocModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Dokumen"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({
                          type: 'financialDoc',
                          id: doc.id,
                          title: doc.title,
                          subtitle: `Format: ${doc.fileType.toUpperCase()} • Ukuran: ${doc.fileSize} • Tanggal Upload: ${doc.uploadDate || 'Terbaru'}`,
                          badge: 'Dokumen Laporan Resmi',
                          itemData: doc,
                        });
                      }}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVENUE RECORD POPUP MODAL */}
      {isRevenueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{isEditingRevenue ? 'Edit Data Rekapitulasi Pendapatan' : 'Input Pendapatan Bulanan / Tahunan Baru'}</span>
              </h3>
              <button
                onClick={() => setIsRevenueModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Tahun *</label>
                  <input 
                    type="number"
                    value={revForm.year}
                    onChange={(e) => setRevForm({ ...revForm, year: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Bulan *</label>
                  <select
                    value={revForm.month}
                    onChange={(e) => setRevForm({ ...revForm, month: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  >
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Tanggal Input *</label>
                  <input 
                    type="date"
                    value={revForm.date}
                    onChange={(e) => setRevForm({ ...revForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Jumlah Nominal (Rp) *</label>
                  <input 
                    type="number"
                    value={revForm.amount}
                    onChange={(e) => setRevForm({ ...revForm, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Keterangan / Sumber Pendapatan *</label>
                <input 
                  type="text"
                  value={revForm.description}
                  onChange={(e) => setRevForm({ ...revForm, description: e.target.value })}
                  placeholder="Contoh: Pendapatan Gerai Sembako & SHU Q1"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRevenueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!revForm.description || revForm.amount <= 0) {
                    alert('Mohon isi keterangan dan nominal pendapatan dengan benar.');
                    return;
                  }
                  if (isEditingRevenue && editingRevenueId) {
                    updateRevenueRecord(editingRevenueId, revForm);
                    alert('Data pendapatan berhasil diperbarui!');
                  } else {
                    addRevenueRecord(revForm);
                    alert('Data pendapatan berhasil dipublish ke grafik!');
                  }
                  setIsRevenueModalOpen(false);
                  setIsEditingRevenue(false);
                  setEditingRevenueId(null);
                  setRevForm({ year: 2026, month: 'Januari', date: new Date().toISOString().split('T')[0], amount: 50000000, description: '' });
                }}
                className={`px-5 py-2 rounded-xl text-white font-black text-xs shadow-md transition-all cursor-pointer ${
                  isEditingRevenue ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isEditingRevenue ? '💾 Simpan Perubahan' : '+ Publish Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL DOC POPUP MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{isEditingDoc ? 'Edit Dokumen Laporan Keuangan' : 'Upload Dokumen Laporan Keuangan'}</span>
              </h3>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Judul Dokumen *</label>
                <input 
                  type="text"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="Contoh: Laporan Keuangan 2026.xlsx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Tipe Berkas</label>
                  <select
                    value={docForm.fileType}
                    onChange={(e) => setDocForm({ ...docForm, fileType: e.target.value as 'excel' | 'word' | 'powerpoint' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="word">Word (.docx)</option>
                    <option value="powerpoint">PowerPoint (.pptx)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Ukuran File</label>
                  <input 
                    type="text"
                    value={docForm.fileSize}
                    onChange={(e) => setDocForm({ ...docForm, fileSize: e.target.value })}
                    placeholder="2.4 MB"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Pilih File dari HP / Komputer</label>
                <label className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                  <span>📁 Pilih Berkas Dokumen (Excel, Word, PPT, PDF)</span>
                  <input 
                    type="file"
                    accept=".xlsx,.xls,.docx,.doc,.pptx,.ppt,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        let fType: 'excel' | 'word' | 'powerpoint' = 'excel';
                        if (ext === 'docx' || ext === 'doc') fType = 'word';
                        if (ext === 'pptx' || ext === 'ppt') fType = 'powerpoint';

                        const reader = new FileReader();
                        reader.onload = () => {
                          setDocForm({
                            title: file.name,
                            fileType: fType,
                            fileSize: sizeMb,
                            fileUrl: reader.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!docForm.title) {
                    showNotification('Mohon isi judul dokumen laporan atau pilih file.', 'error');
                    return;
                  }
                  try {
                    if (isEditingDoc && editingDocId) {
                      await updateFinancialDoc(editingDocId, {
                        title: docForm.title,
                        fileType: docForm.fileType,
                        fileSize: docForm.fileSize,
                        fileUrl: docForm.fileUrl || '#',
                      });
                      showNotification('Dokumen laporan resmi berhasil diperbarui!');
                    } else {
                      await addFinancialDoc({
                        title: docForm.title,
                        fileType: docForm.fileType,
                        fileSize: docForm.fileSize,
                        fileUrl: docForm.fileUrl || '#',
                        uploadDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                      });
                      showNotification('Dokumen laporan resmi berhasil dipublish!');
                    }
                    setDocForm({ title: '', fileType: 'excel', fileSize: '2.0 MB', fileUrl: '#' });
                    setIsDocModalOpen(false);
                    setIsEditingDoc(false);
                    setEditingDocId(null);
                  } catch (err: any) {
                    showNotification('Gagal menyimpan dokumen laporan: ' + (err?.message || 'Terjadi kesalahan'), 'error');
                  }
                }}
                className={`px-5 py-2 rounded-xl text-white font-black text-xs shadow-md transition-all cursor-pointer ${
                  isEditingDoc ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isEditingDoc ? '💾 Simpan Perubahan' : '+ Publish Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== IN-APP DELETE / ACTION CONFIRMATION MODAL ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-black border border-red-200">
                  <span>{deleteTarget.badge || 'Konfirmasi Hapus'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Konfirmasi Hapus Data
                </h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus data ini dari sistem Koperasi?
                </p>
              </div>
            </div>

            {/* Target Item Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>{deleteTarget.title}</span>
              </div>
              <p className="text-xs text-slate-600 pl-4">
                {deleteTarget.subtitle}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Data yang dihapus akan langsung hilang dari database Firestore dan tampilan secara real-time.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 9: AUDIT LOG & RIWAYAT STOK ===================== */}
      {activeSubTab === 'stockLogs' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>Audit Log & Riwayat Perubahan Stok Produk</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mencatat otomatis seluruh mutasi stok baik dari transaksi pembeli (Buat Pesanan) maupun penyesuaian manual oleh pengurus.
                </p>
              </div>

              <div className="w-full sm:w-auto min-w-[260px]">
                <input
                  type="text"
                  value={stockLogFilter}
                  onChange={(e) => setStockLogFilter(e.target.value)}
                  placeholder="Cari produk / variasi / pengurus..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Waktu</th>
                    <th className="p-3.5">Nama Produk</th>
                    <th className="p-3.5">Variasi</th>
                    <th className="p-3.5 text-center">Tipe Mutasi</th>
                    <th className="p-3.5 text-center">Perubahan</th>
                    <th className="p-3.5 text-center">Stok Sisa</th>
                    <th className="p-3.5">Catatan / Keterangan</th>
                    <th className="p-3.5">Aktor / Pengurus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockLogs
                    .filter((log) => {
                      if (!stockLogFilter) return true;
                      const q = stockLogFilter.toLowerCase();
                      return (
                        log.productName.toLowerCase().includes(q) ||
                        log.variation.toLowerCase().includes(q) ||
                        log.actor.toLowerCase().includes(q) ||
                        log.notes?.toLowerCase().includes(q)
                      );
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900">{log.productName}</td>
                        <td className="p-3.5 text-slate-600 font-bold">{log.variation}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              log.type === 'manual_add'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.type === 'order_deduct'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {log.type === 'manual_add'
                              ? '➕ Tambah Stok'
                              : log.type === 'order_deduct'
                              ? '🛍️ Pembelian'
                              : '📝 Penyesuaian'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-black">
                          <span className={log.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-slate-800">
                          {log.oldStock} ➔ <span className="text-amber-700">{log.newStock}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">{log.notes || '-'}</td>
                        <td className="p-3.5 font-bold text-slate-800">{log.actor}</td>
                      </tr>
                    ))}
                  {stockLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        Belum ada riwayat perubahan stok yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab: Kelola Pengiriman & Ongkos Kirim */}
      {activeSubTab === 'shipping' && (
        <AdminShippingManager />
      )}

      {/* Subtab: Riwayat Pesanan */}
      {activeSubTab === 'orders' && (
        <AdminOrderHistoryManager />
      )}

      {/* Subtab: ⭐ Ulasan & Rating Produk */}
      {activeSubTab === 'reviews' && (
        <AdminReviewsManager products={products} />
      )}

      {/* Subtab: Diskon Bundling Anggota */}
      {activeSubTab === 'bundlingMember' && (
        <AdminBundlingManager products={products} defaultAudience="member" />
      )}

      {/* Subtab: Diskon Bundling Basic */}
      {activeSubTab === 'bundlingVisitor' && (
        <AdminBundlingManager products={products} defaultAudience="visitor" />
      )}

      {/* STOCK MANAGEMENT MODAL DIALOG */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  Pengelolaan Stok Real-Time
                </h3>
              </div>
              <button
                onClick={() => setStockModalProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3">
              <span className="text-2xl">{stockModalProduct.emoji || '📦'}</span>
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm">{stockModalProduct.name}</h4>
                <p className="text-[11px] text-amber-800">Kategori: {stockModalProduct.category}</p>
              </div>
            </div>

            {/* Variation stock inputs */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                Stok per Variasi Ukuran
              </label>
              {Object.entries(stockModalMap).map(([variation, currStockVal]) => {
                const currStock = Number(currStockVal) || 0;
                return (
                  <div key={variation} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3">
                    <div className="font-bold text-xs text-slate-800">{variation}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStockModalMap({ ...stockModalMap, [variation]: Math.max(0, currStock - 10) })}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 font-black text-xs rounded-lg cursor-pointer"
                      >
                        -10
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={currStock}
                        onChange={(e) => setStockModalMap({ ...stockModalMap, [variation]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-20 px-2 py-1 text-center bg-white border border-slate-300 rounded-lg font-black text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setStockModalMap({ ...stockModalMap, [variation]: currStock + 10 })}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 font-black text-xs rounded-lg cursor-pointer"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockModalMap({ ...stockModalMap, [variation]: currStock + 50 })}
                        className="px-2 py-1 bg-amber-600 text-white font-black text-xs rounded-lg hover:bg-amber-500 cursor-pointer"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">Catatan Keterangan Mutasi</label>
              <input
                type="text"
                value={stockModalNotes}
                onChange={(e) => setStockModalNotes(e.target.value)}
                placeholder="Contoh: Restock barang baru dari supplier"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveStockModal}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>💾 Simpan & Catat Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
