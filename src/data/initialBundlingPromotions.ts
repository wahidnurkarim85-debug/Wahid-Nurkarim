import { BundlingPromotion, MinimumPurchaseDiscount } from '../types';

export const INITIAL_BUNDLING_PROMOTIONS: BundlingPromotion[] = [
  {
    id: 'bundle_aqua_member',
    name: 'Beli 2 Aqua 500 ml → Diskon 10% (Anggota)',
    targetAudience: 'member',
    productId: 'prod_aqua_500',
    productName: 'Aqua 500 ml',
    productEmoji: '💧',
    variation: '500 ml',
    minQty: 2,
    discountType: 'percentage',
    discountValue: 10,
    isMultiple: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bundle_aqua_visitor',
    name: 'Beli 2 Aqua 500 ml → Diskon 5% (Basic)',
    targetAudience: 'visitor',
    productId: 'prod_aqua_500',
    productName: 'Aqua 500 ml',
    productEmoji: '💧',
    variation: '500 ml',
    minQty: 2,
    discountType: 'percentage',
    discountValue: 5,
    isMultiple: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bundle_beras_member',
    name: 'Beli 2 Beras Premium 5kg → Diskon 15% (Anggota)',
    targetAudience: 'member',
    productId: 'prod_beras_5kg',
    productName: 'Beras Premium',
    productEmoji: '🌾',
    variation: '5 kg',
    minQty: 2,
    discountType: 'percentage',
    discountValue: 15,
    isMultiple: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_MIN_PURCHASE_DISCOUNTS: MinimumPurchaseDiscount[] = [
  {
    id: 'min_pur_member',
    name: 'Minimal Belanja Rp 10.000 → Diskon 10% (Anggota)',
    targetAudience: 'member',
    minPurchase: 10000,
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 50000,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'min_pur_visitor',
    name: 'Minimal Belanja Rp 20.000 → Diskon 5% (Basic)',
    targetAudience: 'visitor',
    minPurchase: 20000,
    discountType: 'percentage',
    discountValue: 5,
    maxDiscount: 25000,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];
