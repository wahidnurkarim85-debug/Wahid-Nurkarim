export type UserRole = 'visitor' | 'member' | 'staff';
export type AccountStatus = 'PENGUNJUNG' | 'ANGGOTA' | 'KARYAWAN';

export type EmployeeRole = 'KASIR' | 'PENGIRIMAN' | 'ADMIN' | 'SUPER_ADMIN';

export type EmployeePermission = 
  | 'kasir_pos'
  | 'kelola_produk'
  | 'riwayat_penjualan'
  | 'pusat_pengiriman'
  | 'kelola_karyawan'
  | 'kelola_anggota'
  | 'kelola_basic'
  | 'promo'
  | 'voucher'
  | 'pengaturan_website'
  | 'pengaturan_admin'
  | 'analitik';

export interface AnalyticsEvent {
  id?: string;
  sessionId: string;
  userId?: string;
  userRole: 'basic' | 'anggota';
  eventType: 'page_view' | 'catalog_view' | 'cart_view' | 'product_click' | 'variation_select' | 'add_to_cart' | 'quantity_change' | 'product_saved' | 'buat_pesanan';
  productId?: string;
  productName?: string;
  productCategory?: string;
  variation?: string;
  quantity?: number;
  price?: number;
  cartTotal?: number;
  cartItemsCount?: number;
  source?: string;
  createdAt: string;
  timestamp: number;
}

export interface SavedProduct {
  id?: string;
  userId: string;
  productId: string;
  productName: string;
  productCategory?: string;
  variation?: string;
  createdAt: string;
}

export interface AccountRecord {
  id: string; // Document ID (e.g. acc_000001 or uid)
  accountId: string; // ID Akun Internal Tetap (e.g. "ACC-000001")
  status: 'PENGUNJUNG' | 'ANGGOTA';
  name: string;
  phone: string;
  email?: string;
  passwordHash: string; // SHA-256 Hash kata sandi
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  age: number; // Usia otomatis
  address: string;

  // Upgrade data
  isUpgraded?: boolean;
  memberNumber?: string; // Nomor Anggota setelah upgrade (e.g. KMP-ANG-001)
  upgradedAt?: string; // Tanggal & Waktu Upgrade

  // Aktivitas & Login
  registeredAt: string; // Tanggal & Waktu Pendaftaran Akun
  firstLoginAt?: string;
  lastLoginAt?: string;
  loginStatus?: 'online' | 'offline';
  isLoginAllowed?: boolean;

  // Riwayat Perubahan Status Akun
  statusHistory?: {
    status: 'PENGUNJUNG' | 'ANGGOTA';
    changedAt: string;
    note: string;
  }[];
}

export interface UserProfile {
  uid: string;
  accountId?: string; // ID Akun Internal Tetap (e.g. "ACC-000001")
  accountStatus?: 'PENGUNJUNG' | 'ANGGOTA' | 'KARYAWAN';
  email: string;
  displayName: string;
  role: UserRole;
  employeeRole?: EmployeeRole;
  permissions?: EmployeePermission[];
  phone?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  birthPlace?: string;
  birthDate?: string;
  age?: number;
  address?: string;
  position?: string;
  employeeId?: string;
  nik?: string;
  memberNumber?: string;
  photoURL?: string;
  createdAt: string;

  // Upgrade status
  isUpgraded?: boolean;
  upgradedAt?: string;

  // Account login status fields
  loginStatus?: 'online' | 'offline';
  firstLoginAt?: string;
  lastLoginAt?: string;
  isLoginAllowed?: boolean;
}

export interface EmployeeRecord {
  id: string;
  employeeId: string; // ID Karyawan (e.g. KMP-EMP-001)
  name: string;
  nik: string; // NIK KTP (16 digit)
  position: string; // Jabatan/peran (e.g. Karyawan Kasir, Karyawan Pengiriman, Admin)
  employeeRole: EmployeeRole;
  phone: string;
  email: string; // Gmail akun Google OAuth
  status: 'active' | 'inactive' | 'blocked';
  isLoginAllowed: boolean;
  permissions: EmployeePermission[];
  joinedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  loginStatus?: 'online' | 'offline';
  notes?: string;
  activeDeliveryTasksCount?: number;
}

export interface MemberRecord {
  id: string;
  memberNumber: string; // Nomor Anggota Koperasi (e.g. KMP-ANG-001)
  name: string;
  nik?: string;
  phone: string; // 📱 Nomor HP untuk Login (Mandatory)
  address?: string;
  email?: string;
  status: 'active' | 'inactive' | 'blocked' | 'Nonaktif' | 'Terblokir'; // Status Keanggotaan: Aktif / Tidak Aktif / Terblokir
  joinedDate?: string;
  updatedAt?: string;
  createdAt?: string;

  // 🔐 Account Login, Verification & History Status
  password?: string; // Stored/encrypted password for member account login
  loginStatus?: 'online' | 'offline'; // 🟢 Aktif (Sedang Login) / 🔴 Tidak Aktif
  firstLoginAt?: string; // Tanggal & Waktu Pertama Login (e.g. "06 September 2026, 08:15:32")
  lastLoginAt?: string; // Tanggal & Waktu Terakhir Login (e.g. "06 September 2026, 10:27:18")
  isLoginAllowed?: boolean; // Akses Login: Diizinkan (true) / Dinonaktifkan (false)
  isRegistered?: boolean; // Penanda akun sudah terdaftar
  accountId?: string; // ID Akun Internal Tetap (e.g. ACC-000001)
  upgradedAt?: string; // Tanggal Upgrade Akun
}

export interface Product {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  images?: string[]; // Up to 5 photos per product
  videoUrl?: string; // Up to 1 video per product
  category: string;
  variations: string[];
  variationStocks?: Record<string, number>; // Stock per variation (e.g. { "25 kg": 200, "50 kg": 100 })
  stock?: number; // Total or default stock
  price: number;
  isAvailable: boolean;
  unitDescription?: string;
  updatedAt?: string;
  // Member discount fields
  hasMemberDiscount?: boolean;
  memberDiscountType?: 'percentage' | 'fixed'; // percentage (%) or fixed (Rp)
  memberDiscountValue?: number; // e.g. 10 for 10% or 5000 for Rp 5.000
  // Visitor discount fields (Diskon Pengunjung)
  hasVisitorDiscount?: boolean;
  visitorDiscountType?: 'percentage' | 'fixed'; // percentage (%) or fixed (Rp)
  visitorDiscountValue?: number; // e.g. 5 for 5% or 3000 for Rp 3.000
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  variation: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  type: 'admin_edit' | 'checkout' | 'admin_add' | 'admin_reduce';
  notes: string;
  orderId?: string;
  updatedBy?: string;
  createdAt: string;
}

export type OrderStatus = 
  | 'Pesanan Dibuat'
  | 'Menunggu Pembayaran'
  | 'Pembayaran Berhasil'
  | 'Verifikasi Pesanan'
  | 'Dikemas'
  | 'Dikirim'
  | 'Selesai'
  | 'Dibatalkan';

export type PaymentStatus = 
  | 'Menunggu Pembayaran'
  | 'Lunas'
  | 'Dibatalkan';

export type PaymentMethod = 
  | 'Transfer Bank'
  | 'QRIS'
  | 'COD (Bayar di Tempat)'
  | 'Saldo Simpanan Koperasi';

export interface OrderItem {
  productId: string;
  productName: string;
  name?: string; // alias for productName
  emoji?: string;
  imageUrl?: string;
  variation: string;
  selectedVariation?: string;
  selectedUnit?: string;
  appliedAudienceDiscount?: number;
  quantity: number;
  price: number;
  originalPrice?: number;
  subtotal: number;
  isBonus?: boolean;
  bonusPromoId?: string;
  bonusPromoName?: string;
}

export interface CustomerOrder {
  id: string; // Document ID / Nomor Pesanan unik (contoh: ORD-20260909-001)
  orderNumber: string;
  createdAt: string; // ISO string
  formattedDate: string; // e.g. "09 September 2026, 19:30 WIB"

  // Pelanggan
  customerName: string;
  customerPhone: string;
  customerRole: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN';
  userId?: string;
  userAccountId?: string;

  // Produk yang dipesan
  items: OrderItem[];
  totalItemsCount: number; // beli + bonus
  totalPaidItemsCount: number;
  totalBonusItemsCount: number;

  // Finansial
  subtotal: number;
  discountAmount: number; // potongan diskon anggota/pengunjung
  appliedVoucherCode?: string;
  voucherDiscountAmount: number; // potongan voucher diskon
  
  // Pengiriman & Ongkir
  shippingOrigin: string;
  shippingDestination: string;
  deliveryDistanceKm: number;
  billedDistanceKm: number;
  shippingRatePerKm: number;
  rawShippingFee: number;
  appliedShippingVoucherCode?: string;
  shippingVoucherDiscount: number;
  shippingFee: number;

  // Grand Total
  grandTotal: number;

  // ⭐ Point Pembelian
  estimatedPoints?: number;
  pointsAwarded?: boolean;
  pointsAwardedAt?: string;
  pointsEarned?: number;
  appliedPointReward?: {
    rewardId: string;
    rewardName: string;
    pointsSpent: number;
    discountAmount: number;
  };

  // Alamat & Catatan
  shippingAddress: string;
  landmarkNotes?: string;
  customerNotes?: string;

  // Status & Pembayaran
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  // 🚚 Kurir & Pengiriman Karyawan (Tugas Pengiriman RBAC)
  assignedCourierId?: string; // ID Karyawan Pengiriman (e.g. KMP-EMP-002)
  assignedCourierName?: string; // Nama Karyawan Pengiriman
  assignedCourierEmail?: string; // Gmail Kurir Google OAuth
  assignedAt?: string;
  deliveryStatus?: 'Pesanan Dibuat' | 'Siap Dikirim' | 'Ditugaskan' | 'Pesanan Diambil' | 'Diambil' | 'Dalam Perjalanan' | 'Tiba di Lokasi' | 'Menunggu Konfirmasi' | 'Menunggu Konfirmasi Penerima' | 'Selesai' | 'Tertunda' | string;
  deliveryBarcode?: string; // Barcode unik pesanan (defaults to orderNumber)
  
  // 📸 Foto Dokumentasi & Bukti
  preShipmentPhotoUrl?: string; // Foto produk sebelum dikirim dari toko
  preShipmentPhotoTimestamp?: string;
  preShipmentCheckedItems?: string[]; // Item checklist sebelum dikirim
  
  deliveryProofPhotoUrl?: string; // Foto bukti penyerahan produk ke penerima
  deliveryProofTimestamp?: string;
  recipientConfirmationName?: string; // Nama penerima paket
  recipientConfirmedAt?: string;
  
  // 📍 Koordinat & Google Maps Navigasi
  deliveryCoords?: { lat: number; lng: number };
  kelurahan?: string;
  kecamatan?: string;
  rt?: string;
  rw?: string;

  // Riwayat Status Pesanan
  statusHistory?: {
    status: OrderStatus;
    updatedAt: string;
    note?: string;
    actor?: string;
  }[];

  deliveryTimeline?: {
    status: string;
    timestamp: string;
    courierId?: string;
    courierName?: string;
    note?: string;
    location?: { lat: number; lng: number };
  }[];

  updatedAt?: string;
}

export interface DeliveryActivityLog {
  id: string;
  orderId: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  action: 'ASSIGNED' | 'ACCEPTED' | 'BARCODE_SCANNED' | 'PRE_SHIPMENT_PHOTO' | 'STATUS_CHANGED' | 'DELIVERY_PROOF_PHOTO' | 'COMPLETED' | 'REASSIGNED' | 'DENIED_ACCESS' | 'NOTIFICATION_SENT';
  details: string;
  timestamp: string;
  location?: { lat: number; lng: number };
}

export interface DeliveryRoute {
  id: string; // e.g. "RT-00015"
  routeNumber: string; // e.g. "#RT-00015"
  courierId: string;
  courierName: string;
  courierEmail?: string;
  createdAt: string;
  status: 'DRAFT' | 'AKTIF' | 'SELESAI';
  orderIds: string[];
  totalGpsDistanceKm: number; // Jarak garis lurus GPS
  estimatedRoadDistanceKm: number; // Estimasi rute jalan
  currentOrderIndex: number;
  notes?: string;
}

export type DeliveryNotificationType =
  | 'PENGIRIMAN_DIKONFIRMASI'
  | 'PESANAN_DIAMBIL'
  | 'DALAM_PERJALANAN'
  | 'PESANAN_TERTUNDA'
  | 'HAMPIR_TIBA'
  | 'SUDAH_TIBA'
  | 'MENUNGGU_PENERIMA'
  | 'PESANAN_SELESAI';

export interface DeliveryNotificationLog {
  id: string; // ID Notifikasi unik
  orderId: string; // ID Pesanan internal
  orderNumber: string; // Nomor Pesanan (e.g. ORD-000123)
  accountId: string; // User ID / Account ID pemilik pesanan
  accountType: 'Basic' | 'Anggota'; // Klasifikasi jenis akun
  customerName: string;
  customerPhone?: string;
  employeeId: string; // ID Karyawan Pengirim (e.g. EMP-001)
  employeeName: string; // Nama Karyawan Pengirim (e.g. Andi)
  notificationType: DeliveryNotificationType;
  title: string;
  message: string;
  sentAt: string; // Waktu kirim ISO & format WIB
  isRead: boolean;
  readAt?: string;
  currentDeliveryStatus: string;
  delayReason?: string; // Alasan jika status tertunda
}

export interface ProcessedOrder {
  id: string; // Unique Order ID e.g. "ORD-20260906-8A3F"
  items: {
    productId: string;
    productName: string;
    variation: string;
    qty: number;
  }[];
  customerName?: string;
  customerPhone?: string;
  totalPaid: number;
  processedAt: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface ProductPromotion {
  id: string;
  name: string; // e.g. "Beli Aqua 500 ml Gratis Aqua 150 ml"
  giftTitle?: string; // Judul Gift (e.g. "🎁 Program Gift Spesial Anggota")
  description?: string; // Deskripsi Gift / Program
  // Buy condition
  buyProductId: string;
  buyProductName: string;
  buyProductEmoji?: string;
  buyVariation: string; // "Semua Variasi" or specific, e.g. "500 ml", "5 kg"
  minQty: number; // minimal jumlah pembelian produk pemicu
  minSpend?: number; // alternatif syarat minimal belanja (opsional)

  // Reward / Gift product
  rewardProductId: string;
  rewardProductName: string;
  rewardProductEmoji?: string;
  rewardVariation: string; // e.g. "150 ml", "1 liter"
  rewardQty: number; // jumlah produk gratis per paket

  // Tiers & Audience
  isTiered: boolean; // kelipatan: beli 2 dapat 1, beli 4 dapat 2
  maxBonus?: number; // 0 or undefined for tanpa batas
  maxBonusPerTransaction?: number; // Maksimal bonus per transaksi (default 1)
  targetAudience: 'all' | 'member' | 'visitor' | 'specific_members'; // berlaku untuk semua, khusus anggota, atau khusus pengunjung
  targetMemberIds?: string[]; // Jika khusus anggota tertentu

  // Stock Management (Admin dapat menentukan stok produk bonus)
  bonusStock?: number; // Sisa stok bonus
  initialBonusStock?: number; // Stok awal bonus
  isStockExhausted?: boolean; // True jika stok habis

  // Period & Status
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface BundlingPromotion {
  id: string;
  name: string;
  targetAudience: 'member' | 'visitor';
  productId: string;
  productName: string;
  productEmoji?: string;
  variation: string;
  minQty: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isMultiple: boolean; // 🔘 Berlaku Kelipatan
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MinimumPurchaseDiscount {
  id: string;
  name: string;
  targetAudience: 'member' | 'visitor';
  minPurchase: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Voucher {
  id: string;
  name?: string; // Nama Voucher
  code: string; // Kode Voucher (misal HEMAT10)
  description: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 10 for 10% or 10000 for Rp 10.000
  minPurchase: number; // e.g. 50000 / 200000
  maxDiscount?: number; // max cap for percentage discount, e.g. 25000
  startDate?: string; // Tanggal mulai berlaku (YYYY-MM-DD)
  expiresAt?: string; // Tanggal berakhir (YYYY-MM-DD)
  endDate?: string; // Tanggal berakhir alias (YYYY-MM-DD)
  usageLimit?: number; // Batas penggunaan per pelanggan: 1x atau 2x
  usedCount: number; // Total penggunaan global
  userUsage?: Record<string, number>; // Rekam penggunaan per pelanggan: { [userId/phone]: jumlahPakai }
  
  // Fitur Gift Voucher Khusus Anggota
  applicableScope?: 'all' | 'specific'; // 'all' = seluruh produk, 'specific' = produk tertentu
  applicableProductIds?: string[]; // Produk yang mendapatkan voucher
  targetAudience?: 'all' | 'member' | 'specific_members'; // Penerima
  targetMemberIds?: string[]; // Anggota penerima spesifik
  quota?: number; // Kuota / Jumlah voucher yang dibagikan
  remainingQuota?: number; // Sisa kuota
  giftTitle?: string; // Judul Gift (misal: "🎁 Anda Mendapat Gift Voucher!")
  giftMessage?: string; // Isi pesan Gift

  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface GiftActivity {
  id: string;
  type: 'voucher' | 'bonus';
  giftName: string;
  voucherCode?: string;
  memberName: string;
  memberPhone?: string;
  memberId?: string;
  triggerProductName?: string;
  bonusProductName?: string;
  bonusQty?: number;
  discountSummary?: string;
  givenAt: string; // Tanggal Pemberian
  status: 'Aktif' | 'Digunakan' | 'Kedaluwarsa' | 'Habis';
  usedCount: number;
  remainingStock?: number;
  orderId?: string;
}

export interface CartItem {
  key: string; // id + '_' + variation or bonus identifier
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  variation: string;
  availableVariations?: string[];
  price: number; // Current active price
  originalPrice?: number; // Regular price before discounts
  
  // Member discount
  memberPrice?: number;
  hasMemberDiscount?: boolean;
  memberDiscountBadge?: string;

  // Visitor discount
  visitorPrice?: number;
  hasVisitorDiscount?: boolean;
  visitorDiscountBadge?: string;

  qty: number;

  // Promo bonus fields
  isBonus?: boolean;
  bonusPromoId?: string;
  bonusPromoName?: string;
  bonusBuyProductName?: string;
}

export interface ShippingLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  street?: string; // Jalan / Gang
  rt?: string; // RT
  rw?: string; // RW
  kelurahan?: string; // Kelurahan
  kecamatan?: string; // Kecamatan
  city?: string; // Kota/Kabupaten
  province?: string; // Provinsi
  postalCode?: string; // Kode Pos
  landmark?: string; // Informasi patokan terdekat (Masjid, Sekolah, dsb)
  notes?: string; // Catatan tambahan
}

export interface ShippingConfig {
  origin: ShippingLocation;
  ratePerKm: number; // Tarif per km, default Rp 5.000
  minShippingFee: number; // Tarif minimum, misal Rp 5.000
  isDeliveryActive: boolean; // Status layanan pengiriman aktif/nonaktif
  vehicleType?: 'motorcycle' | 'car'; // Default: 'motorcycle' (Sepeda Motor)
  avoidTolls?: boolean; // Default: true (Hindari Jalan Tol)
  memberDiscountPerKm?: number; // Potongan ongkir khusus anggota per km
  memberMinPurchaseFreeShipping?: number; // Gratis ongkir jika belanja anggota >= X
  visitorDiscountPerKm?: number; // Potongan ongkir pengunjung jika ada
  updatedAt?: string;
  updatedBy?: string;
}

export interface ShippingVoucher {
  id: string;
  code: string; // Kode voucher, contoh: ONGKIR10
  name: string; // Nama voucher, contoh: Potongan Ongkir Rp10.000
  minDistanceKm: number; // Minimal jarak pengiriman (contoh: 3 km)
  discountAmount: number; // Nominal potongan ongkir (contoh: 10000)
  totalQuota: number; // Jumlah voucher tersedia (contoh: 100)
  usedCount: number; // Jumlah yang sudah terpakai
  expiryDate?: string; // Masa berlaku (YYYY-MM-DD)
  isActive: boolean; // Status aktif / nonaktif
  targetAudience: 'all' | 'member' | 'visitor'; // Sasaran: Semua, Anggota, Pengunjung
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingCalculation {
  origin: ShippingLocation;
  destination: ShippingLocation;
  actualDistanceKm: number; // Jarak rute jalan nyata (contoh: 5.7 km)
  billedDistanceKm: number; // Jarak penagihan pembulatan (contoh: 1,5 km = 1 km; 1,6 km = 2 km; 2,5 km = 2 km; 2,6 km = 3 km)
  ratePerKm: number; // Tarif per km
  rawShippingFee: number; // Ongkos kirim sebelum potongan voucher
  shippingDiscount: number; // Potongan dari voucher ongkos kirim
  shippingFee: number; // Ongkos kirim akhir setelah potongan (tidak boleh minus)
  estimatedDurationMinutes?: number;
  routeGeometry?: [number, number][]; // Garis rute [lat, lng]
  appliedShippingVoucher?: ShippingVoucher | null;
  vehicleType?: 'motorcycle' | 'car'; // 'motorcycle' (sepeda motor)
  avoidTolls?: boolean; // Menghindari rute jalan tol
}

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCoords?: { lat: number; lng: number };
  originAddress?: string;
  deliveryDistanceKm?: number;
  billedDistanceKm?: number;
  shippingFee?: number;
  notes: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  appliedVoucherCode?: string;
  grandTotal: number;
  createdAt: string;
}

// ==========================================
// 📩 FITUR KOTAK PESAN (INBOX & NOTIFIKASI)
// ==========================================
export type InboxCategory = 
  | 'pesanan' 
  | 'voucher' 
  | 'gift' 
  | 'promo' 
  | 'informasi' 
  | 'sistem';

export type InboxTargetAudience = 
  | 'all' 
  | 'member' 
  | 'visitor' 
  | 'specific';

export interface InboxMessage {
  id: string;
  title: string;
  content: string;
  category: InboxCategory;
  createdAt: string; // Indonesian formatted or ISO string
  createdAtTimestamp?: number; // Milliseconds timestamp for calculation
  expiresAtTimestamp?: number; // Milliseconds timestamp for 7-day auto-delete
  isRead: boolean;
  readBy?: string[]; // user IDs who have read this broadcast message
  deletedBy?: string[]; // user IDs who deleted this message from their view
  targetAudience: InboxTargetAudience;
  targetUserId?: string; // specific user UID, accountId, or phone
  sender: 'system' | 'admin';
  isActive: boolean;
  actionType?: 'order' | 'voucher' | 'gift' | 'promo' | 'catalog' | 'profile' | 'none';
  actionLabel?: string; // e.g. "Lihat Voucher", "Lihat Gift", "Lihat Pesanan", "Lihat Promo"
  actionTab?: 'home' | 'catalog' | 'cart' | 'member' | 'profile' | 'admin';
  giftDetails?: {
    voucherCode?: string;
    discountText?: string;
    minPurchase?: number;
    usageLimit?: number;
    expiresAt?: string;
    giftType?: 'voucher' | 'bonus';
    bonusProductName?: string;
    bonusQty?: number;
  };
  metadata?: {
    orderId?: string;
    voucherCode?: string;
    giftName?: string;
    promoName?: string;
    amount?: number;
  };
  featuredProducts?: Array<{
    id: string;
    name: string;
    price: number;
    formattedPrice: string;
    imageUrl?: string;
    emoji?: string;
    trendText: string;
    bannerSvgUrl?: string;
    hasDiscount?: boolean;
    discountText?: string;
  }>;
  availableVouchers?: Array<{
    id: string;
    code: string;
    name: string;
    discountText: string;
    minRequirementText?: string;
    targetAudienceText?: string;
    type?: 'discount' | 'shipping';
  }>;
  catalogDiscounts?: Array<{
    productId: string;
    productName: string;
    originalPrice: number;
    discountedPrice: number;
    discountSummary: string;
  }>;
  giftPromos?: Array<{
    id: string;
    title: string;
    conditionText: string;
    rewardText: string;
    audienceText?: string;
  }>;
}

export interface PromoToast {
  id: string;
  type: 'bonus' | 'bundling';
  title: string;
  message: string;
  badgeText: string;
  productName?: string;
  rewardProductName?: string;
  rewardVariation?: string;
  rewardQty?: number;
  discountAmount?: number;
  timestamp: number;
}

export interface BundlingProgressHint {
  promoId: string;
  promoName: string;
  productName: string;
  message: string;
  currentQty: number;
  minQty: number;
  neededQty: number;
  numBundles?: number;
  discountAmount?: number;
}

// ==========================================
// ⭐ SISTEM POINT PEMBELIAN MARKETPLACE
// ==========================================
export type PointAudience = 'member' | 'basic';
export type PointCalculationType = 'spend' | 'quantity';
export type PointRounding = 'floor' | 'round' | 'ceil';
export type PointRewardType = 'discount_nominal' | 'discount_percentage' | 'free_shipping' | 'product_gift';
export type PointTransactionType = 'earn' | 'redeem' | 'deduct' | 'adjust';

export interface PointProgram {
  id: string;
  name: string; // Nama Program Point (e.g. "Loyalitas Belanja Anggota Kopdes")
  targetAudience: PointAudience; // 'member' (Anggota) atau 'basic' (Basic) - terpisah ketat!
  calculationType: PointCalculationType; // 'spend' (Rp per point) atau 'quantity' (per jumlah produk)
  spendPerPoint: number; // Nilai belanja untuk 1 point (misal: Rp10.000 = 1 Point)
  pointsPerUnit: number; // Jumlah point per kelipatan / per barang (misal: 1 point, atau 2 saat promo)
  minPurchase: number; // Nilai minimal belanja (misal: 0 atau 50.000)
  maxPointsPerTransaction?: number; // Batas maksimal point per transaksi (0 / undefined = tanpa batas)
  maxPointsPerMonth?: number; // Batas maksimal point per hari / bulan
  rounding: PointRounding; // 'floor' (ke bawah: Rp 25.000 / 10.000 = 2 point), 'round', 'ceil'
  productScope: 'all' | 'specific'; // Semua produk atau produk tertentu
  applicableProductIds?: string[]; // ID produk yang mendapatkan point
  applicableVariations?: string[]; // Variasi ukuran produk tertentu (opsional)
  isPromoActive: boolean; // Status promo khusus (Double Point dsb)
  promoMultiplier?: number; // Pengali promo point (misal: 2x)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isActive: boolean; // 🟢 Aktif / 🔴 Nonaktif
  terms?: string; // Ketentuan penggunaan point
  createdAt?: string;
  updatedAt?: string;
}

export interface PointReward {
  id: string;
  name: string; // Nama hadiah (e.g. "Voucher Belanja Rp10.000", "Gratis Ongkir", "Beras 5kg Gratis")
  pointsCost: number; // Jumlah point yang dibutuhkan (e.g. 100 Point)
  rewardType: PointRewardType; // 'discount_nominal' | 'discount_percentage' | 'free_shipping' | 'product_gift'
  discountValue: number; // Nilai diskon nominal (Rp) atau persen (%)
  maxDiscount?: number; // Maksimal potongan untuk persen
  freeShippingCap?: number; // Maksimal potongan ongkir (misal Rp 15.000)
  rewardProductId?: string; // ID produk gratis
  rewardProductName?: string; // Nama produk hadiah
  rewardVariation?: string; // Variasi produk hadiah
  rewardProductEmoji?: string;
  quota?: number; // Jumlah kuota hadiah tersedia
  usedCount: number; // Jumlah yang sudah ditukarkan
  userLimit?: number; // Batas penukaran per pengguna (default: 1x / tanpa batas)
  targetAudience: 'all' | 'member' | 'basic'; // Target pengguna
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPointAccount {
  id: string;
  customerPhone: string; // Kunci identifikasi pelanggan (Anggota maupun Basic)
  customerName: string;
  customerRole: PointAudience; // 'member' atau 'basic'
  memberNumber?: string;
  totalEarned: number; // Total point yang pernah didapatkan
  totalRedeemed: number; // Total point yang telah ditukarkan
  totalDeducted: number; // Total point yang dikurangi (retur/batal/koreksi)
  balance: number; // Saldo point aktif: totalEarned - totalRedeemed - totalDeducted
  updatedAt: string;
}

export interface PointTransaction {
  id: string;
  accountId: string;
  customerPhone: string;
  customerName: string;
  customerRole: PointAudience;
  type: PointTransactionType; // 'earn' (masuk), 'redeem' (keluar), 'deduct' (dikurangi batal), 'adjust' (koreksi)
  points: number; // Jumlah point (+/-)
  balanceAfter: number; // Saldo point setelah transaksi
  orderId?: string;
  orderNumber?: string; // e.g. "ORD-20260909-001"
  rewardId?: string;
  rewardName?: string;
  notes: string; // Keterangan transaksi
  createdAt: string; // ISO string / formatted date
  status: 'completed' | 'cancelled';
}

export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  variation?: string;
  userId: string;
  accountId: string;
  customerName: string;
  customerPhone: string;
  customerRole: 'ANGGOTA' | 'Basic' | 'KARYAWAN' | string;
  orderId: string;
  orderNumber: string;
  rating: number;
  comment?: string;
  adminReply?: string;
  adminReplyAt?: string;
  createdAt: string;
  timestamp: number;
}

export interface ProductLove {
  id: string;
  productId: string;
  userId: string;
  accountId: string;
  customerPhone: string;
  createdAt: string;
}

