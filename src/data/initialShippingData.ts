import { ShippingLocation, ShippingConfig, ShippingVoucher } from '../types';

export const DEFAULT_KOPDES_ORIGIN: ShippingLocation = {
  name: 'Koperasi Desa Cengkareng Timur (Gerai Sembako)',
  address: 'Jalan Kayu Besar RT 13/RW 11, Cengkareng Timur, Kecamatan Cengkareng, Jakarta Barat, DKI Jakarta 11730',
  lat: -6.14364,
  lng: 106.72892,
  street: 'Jalan Kayu Besar',
  rt: '13',
  rw: '11',
  kelurahan: 'Cengkareng Timur',
  kecamatan: 'Cengkareng',
  city: 'Jakarta Barat',
  province: 'DKI Jakarta',
  postalCode: '11730',
  landmark: 'Dekat Rusun BPS & Pasar Bersih Cengkareng',
  notes: 'Titik pusat gudang gerai sembako resmi Koperasi Desa Merah Putih',
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  origin: DEFAULT_KOPDES_ORIGIN,
  ratePerKm: 5000, // Rp 5.000 / km
  minShippingFee: 5000, // Tarif minimum Rp 5.000
  isDeliveryActive: true,
  vehicleType: 'motorcycle', // Mode Kendaraan: Sepeda Motor (Bebas Tol)
  avoidTolls: true, // Menghindari jalan tol agar tidak masuk navigasi mobil
  memberDiscountPerKm: 0, // Opsional diskon khusus anggota
  memberMinPurchaseFreeShipping: 0,
  visitorDiscountPerKm: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin Koperasi',
};

export const INITIAL_SHIPPING_VOUCHERS: ShippingVoucher[] = [
  {
    id: 'sv_ongkir10',
    code: 'ONGKIR10',
    name: 'Potongan Ongkir Rp10.000 (Min. 3 km)',
    minDistanceKm: 3,
    discountAmount: 10000,
    totalQuota: 100,
    usedCount: 0,
    expiryDate: '2026-12-31',
    isActive: true,
    targetAudience: 'all',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'sv_kopdes5',
    code: 'KOPDESFREE5',
    name: 'Diskon Pengiriman Rp5.000 Tanpa Min. Jarak',
    minDistanceKm: 1,
    discountAmount: 5000,
    totalQuota: 50,
    usedCount: 0,
    expiryDate: '2026-12-31',
    isActive: true,
    targetAudience: 'all',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'sv_anggota15',
    code: 'ONGKIRANGGOTA',
    name: 'Subsidi Ongkir Anggota Rp15.000 (Min. 4 km)',
    minDistanceKm: 4,
    discountAmount: 15000,
    totalQuota: 75,
    usedCount: 0,
    expiryDate: '2026-12-31',
    isActive: true,
    targetAudience: 'member',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'sv_welcome5',
    code: 'ONGKIRBARU',
    name: 'Spesial Akun Basic Baru Potongan Rp5.000 (Min. 2 km)',
    minDistanceKm: 2,
    discountAmount: 5000,
    totalQuota: 30,
    usedCount: 0,
    expiryDate: '2026-12-31',
    isActive: true,
    targetAudience: 'visitor',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];
