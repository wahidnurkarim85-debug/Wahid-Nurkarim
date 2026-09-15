import { Product, Voucher, ShippingVoucher, ProductPromotion, BundlingPromotion } from '../types';

export interface PopularProductCopyItem {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  imageUrl?: string;
  emoji?: string;
  trendText: string;
  bannerSvgUrl: string;
  hasDiscount?: boolean;
  discountText?: string;
}

export interface DiscountVoucherCopyItem {
  id: string;
  code: string;
  name: string;
  discountText: string;
  minPurchaseText: string;
  targetAudienceText: string;
  expiryText?: string;
}

export interface ShippingVoucherCopyItem {
  id: string;
  code: string;
  name: string;
  discountText: string;
  minDistanceText: string;
  targetAudienceText: string;
  expiryText?: string;
}

export interface CatalogDiscountCopyItem {
  productId: string;
  productName: string;
  emoji?: string;
  imageUrl?: string;
  originalPrice: number;
  discountedPrice: number;
  discountSummary: string;
  popularityScore?: number;
  popularityTrend?: string;
}

export interface GiftPromoCopyItem {
  id: string;
  title: string;
  conditionText: string;
  rewardText: string;
  audienceText: string;
  buyProductId?: string;
  rewardProductId?: string;
  popularityScore?: number;
  popularityTrend?: string;
}

export interface BundlingPromoCopyItem {
  id: string;
  name: string;
  ruleText: string;
  discountText: string;
  audienceText: string;
  productId?: string;
  popularityScore?: number;
  popularityTrend?: string;
}

export interface CopywritingPayload {
  text: string;
  generatedAt: string;
  popularProducts: PopularProductCopyItem[];
  discountVouchers: DiscountVoucherCopyItem[];
  shippingVouchers: ShippingVoucherCopyItem[];
  catalogDiscounts: CatalogDiscountCopyItem[];
  giftPromos: GiftPromoCopyItem[];
  bundlingPromos: BundlingPromoCopyItem[];
}

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generate a high-contrast, beautiful SVG Data URL banner containing:
 * - Koperasi Desa Merah Putih header
 * - Trending / Analytics Badge
 * - Product Title & Price
 * - Prominent "BELANJA SEKARANG" Banner Button
 */
export const createBelanjaSekarangBannerSvg = (
  productName: string,
  priceText: string,
  trendText?: string
): string => {
  const safeName = (productName || 'Produk Kopdes')
    .replace(/[<>&"]/g, '')
    .trim();
  const safePrice = (priceText || 'Harga Terjangkau')
    .replace(/[<>&"]/g, '')
    .trim();
  const safeTrend = (trendText || 'Produk Terpopuler')
    .replace(/[<>&"]/g, '')
    .trim();

  const truncatedName = safeName.length > 28 ? safeName.substring(0, 28) + '...' : safeName;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240">
    <defs>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#831843" />
        <stop offset="40%" stop-color="#991b1b" />
        <stop offset="100%" stop-color="#450a0a" />
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#15803d" />
        <stop offset="50%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#fbbf24" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
      </filter>
    </defs>

    <!-- Base Canvas Card -->
    <rect width="640" height="240" rx="24" fill="url(#cardGrad)" stroke="#f87171" stroke-width="1.5" />
    
    <!-- Header: Kopdes Brand Pill -->
    <g transform="translate(24, 20)">
      <rect width="210" height="28" rx="14" fill="#ffffff" fill-opacity="0.18" />
      <text x="14" y="19" fill="#fef08a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" letter-spacing="0.5">🇮🇩 KOPDES MERAH PUTIH</text>
    </g>

    <!-- Analytics Trend Badge -->
    <g transform="translate(244, 20)">
      <rect width="220" height="28" rx="14" fill="url(#badgeGrad)" />
      <text x="14" y="19" fill="#78350f" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900">🔥 ${safeTrend}</text>
    </g>

    <!-- Product Title -->
    <text x="24" y="86" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="23" font-weight="900">
      ${truncatedName}
    </text>

    <!-- Product Price Tag -->
    <text x="24" y="122" fill="#fef08a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900">
      ${safePrice}
    </text>
    <text x="24" y="146" fill="#fecaca" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">
      Jaminan Mutu &amp; Kualitas Segar Terbaik Langsung dari Koperasi
    </text>

    <!-- "BELANJA SEKARANG" Banner Button Graphic -->
    <g filter="url(#shadow)" transform="translate(24, 166)">
      <rect width="320" height="52" rx="16" fill="url(#btnGrad)" stroke="#86efac" stroke-width="2" />
      <!-- Pulsing Shopping Cart Icon -->
      <text x="20" y="34" font-size="20">🛒</text>
      <!-- Prominent Text: BELANJA SEKARANG -->
      <text x="56" y="34" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" letter-spacing="1">
        BELANJA SEKARANG
      </text>
      <text x="282" y="34" fill="#fef08a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900">
        ➜
      </text>
    </g>

    <!-- Right Side Decorative Bag Illustration -->
    <g transform="translate(510, 120)">
      <circle cx="0" cy="0" r="68" fill="#ffffff" fill-opacity="0.08" />
      <circle cx="0" cy="0" r="52" fill="#ffffff" fill-opacity="0.06" />
      <text x="-32" y="24" font-size="64">🛍️</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Dispatch a smooth, reliable navigation event that:
 * 1. Updates URL params to `?tab=catalog&product=<productId>`
 * 2. Switches main App tab to 'catalog'
 * 3. Instructs ProductCatalog to open the zoom modal and scroll into view with pulse highlight
 */
export const navigateToCatalogProduct = (productId: string): void => {
  if (typeof window === 'undefined' || !productId) return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'catalog');
    url.searchParams.set('product', productId);
    window.history.pushState({}, '', url.toString());
  } catch (e) {
    console.warn('History pushState error:', e);
  }

  // Dispatch custom event for both App.tsx (tab switch) and ProductCatalog.tsx (zoom & scroll)
  window.dispatchEvent(
    new CustomEvent('kopdes_navigate_to_product', {
      detail: { productId }
    })
  );
};

export interface GenerateCopywritingParams {
  products: Product[];
  productStats: Record<string, any>;
  discountVouchers: Voucher[];
  shippingVouchers: ShippingVoucher[];
  promotions: ProductPromotion[];
  bundlingPromotions: BundlingPromotion[];
  websiteUrl?: string;
}

export interface ProductPopularityInfo {
  isPopular: boolean;
  score: number;
  trendText: string;
  stats?: {
    views?: number;
    adds?: number;
    saves?: number;
    orders?: number;
    select?: number;
    score?: number;
  };
}

/**
 * Evaluates whether a product is popular based on real-time website analytics & statistics.
 * Checks engagement scores (orders, cart adds, saves, views, selects) and membership in popular lists.
 * Returns isPopular: false for products that have no engagement or stats.
 */
export const findProductPopularity = (
  productId: string | undefined,
  productName: string | undefined,
  products: Product[],
  productStats: Record<string, any>,
  popularProductIds: Set<string>
): ProductPopularityInfo => {
  let matchedProduct: Product | undefined;
  if (productId) {
    matchedProduct = products.find((p) => p.id === productId);
  }
  if (!matchedProduct && productName) {
    const norm = productName.toLowerCase().trim();
    matchedProduct = products.find((p) => {
      const pNorm = p.name.toLowerCase().trim();
      return pNorm === norm || norm.includes(pNorm) || pNorm.includes(norm);
    });
  }

  const candidateIds = new Set<string>();
  if (productId) candidateIds.add(productId);
  if (matchedProduct) candidateIds.add(matchedProduct.id);

  let bestStats: any = null;
  let bestScore = 0;

  for (const id of candidateIds) {
    if (productStats && productStats[id]) {
      const s = productStats[id];
      const sc =
        Number(s.score) ||
        (s.orders || 0) * 10 +
          (s.adds || 0) * 5 +
          (s.saves || 0) * 3 +
          (s.views || 0) * 1 +
          (s.select || 0) * 2;
      if (sc > bestScore) {
        bestScore = sc;
        bestStats = s;
      }
    }
  }

  // Fallback search across productStats keys
  if (!bestStats && productName) {
    const norm = productName.toLowerCase().trim();
    for (const [key, s] of Object.entries(productStats || {})) {
      const catProd = products.find((p) => p.id === key);
      if (catProd) {
        const catNorm = catProd.name.toLowerCase().trim();
        if (catNorm === norm || norm.includes(catNorm) || catNorm.includes(norm)) {
          const sc =
            Number((s as any).score) ||
            ((s as any).orders || 0) * 10 +
              ((s as any).adds || 0) * 5 +
              ((s as any).saves || 0) * 3 +
              ((s as any).views || 0) * 1 +
              ((s as any).select || 0) * 2;
          if (sc > bestScore) {
            bestScore = sc;
            bestStats = s;
          }
        }
      }
    }
  }

  const inPopularList = Boolean(
    (productId && popularProductIds.has(productId)) ||
    (matchedProduct && popularProductIds.has(matchedProduct.id))
  );

  const isPopular = bestScore > 0 || inPopularList;

  let trendText = 'Produk Populer di Website';
  if (bestStats) {
    if ((bestStats.orders || 0) > 0) {
      trendText = `Terlaris (${bestStats.orders}x dipesan)`;
    } else if ((bestStats.adds || 0) > 0) {
      trendText = `Favorit Keranjang (${bestStats.adds}x)`;
    } else if ((bestStats.saves || 0) > 0) {
      trendText = `Banyak Disimpan (${bestStats.saves}x)`;
    } else if ((bestStats.views || 0) > 0) {
      trendText = `Banyak Dilihat (${bestStats.views} tayangan)`;
    }
  }

  return {
    isPopular,
    score: bestScore,
    trendText,
    stats: bestStats,
  };
};

/**
 * Generates the complete, high-converting copywriting connected with:
 * 1. Popular products from analytics (WITHOUT plain links, replaced by "Belanja Sekarang" banner)
 * 2. Shopping discount vouchers (Voucher Diskon Belanja)
 * 3. Shipping vouchers (Voucher Ongkir)
 * 4. Catalog discounts (Diskon Anggota / Pengunjung) - Following popular products from analytics
 * 5. Gift promos & free bonuses (Promo Gift & Hadiah) - Following popular products from analytics
 * 6. Bundling packages (Paket Bundling Hemat) - Following popular products from analytics
 */
export const generateSmartCopywriting = ({
  products,
  productStats,
  discountVouchers,
  shippingVouchers,
  promotions,
  bundlingPromotions,
  websiteUrl,
}: GenerateCopywritingParams): CopywritingPayload => {
  const baseUrl = (
    websiteUrl?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '');

  // 1. Identify popular products from analytics
  const scoredProducts = Object.entries(productStats || {})
    .map(([id, stats]) => {
      const product = products.find((p) => p.id === id);
      return { id, stats, product };
    })
    .filter((item) => item.product && item.product.isAvailable && ((item.stats as any)?.score || 0) > 0)
    .sort((a, b) => ((b.stats as any)?.score || 0) - ((a.stats as any)?.score || 0));

  let topProducts = scoredProducts.slice(0, 3);

  // Fallback if no analytics data yet
  if (topProducts.length === 0 && products.length > 0) {
    const available = products.filter((p) => p.isAvailable).slice(0, 3);
    topProducts = available.map((p) => ({
      id: p.id,
      stats: { views: 1, adds: 1, saves: 0, orders: 1, select: 0, score: 18 },
      product: p,
    }));
  }

  const popularProductIds = new Set<string>(
    scoredProducts.length > 0
      ? scoredProducts.map((item) => item.id)
      : topProducts.map((item) => item.id)
  );

  const popularProductItems: PopularProductCopyItem[] = topProducts.map((item, idx) => {
    const p = item.product!;
    const stats = (item.stats || {}) as {
      views?: number;
      adds?: number;
      saves?: number;
      orders?: number;
    };

    let trendText = 'Produk Terpopuler';
    if ((stats.orders || 0) > 0) {
      trendText = `Terlaris Minggu Ini (${stats.orders}x dipesan)`;
    } else if ((stats.adds || 0) > 0) {
      trendText = `Favorit Keranjang (${stats.adds}x)`;
    } else if ((stats.views || 0) > 0) {
      trendText = `Banyak Dilihat Pengunjung`;
    }

    let priceFormatted = formatRupiah(p.price);
    let hasDiscount = false;
    let discountText = '';

    if (p.hasMemberDiscount && p.memberDiscountValue) {
      hasDiscount = true;
      const valText =
        p.memberDiscountType === 'percentage'
          ? `${p.memberDiscountValue}%`
          : formatRupiah(p.memberDiscountValue);
      discountText = `Diskon Anggota ${valText}`;
    } else if (p.hasVisitorDiscount && p.visitorDiscountValue) {
      hasDiscount = true;
      const valText =
        p.visitorDiscountType === 'percentage'
          ? `${p.visitorDiscountValue}%`
          : formatRupiah(p.visitorDiscountValue);
      discountText = `Diskon Pengunjung ${valText}`;
    }

    const bannerSvgUrl = createBelanjaSekarangBannerSvg(
      p.name,
      hasDiscount ? `${priceFormatted} (${discountText})` : priceFormatted,
      trendText
    );

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      formattedPrice: priceFormatted,
      imageUrl: p.imageUrl || (p.images && p.images[0]),
      emoji: p.emoji || '🛍️',
      trendText,
      bannerSvgUrl,
      hasDiscount,
      discountText,
    };
  });

  // 2. Shopping discount vouchers
  const activeDiscountVouchers: DiscountVoucherCopyItem[] = (discountVouchers || [])
    .filter((v) => v.isActive && (!v.quota || (v.usedCount || 0) < v.quota))
    .slice(0, 4)
    .map((v) => {
      const discountText =
        v.discountType === 'percentage'
          ? `Diskon ${v.discountValue}% (Hemat s/d ${formatRupiah(v.maxDiscount || 0)})`
          : `Potongan Langsung ${formatRupiah(v.discountValue)}`;
      const minPurchaseText =
        (v.minPurchase || 0) > 0
          ? `Min. Belanja ${formatRupiah(v.minPurchase || 0)}`
          : 'Tanpa Minimum Belanja';
      const targetAudienceText =
        v.targetAudience === 'member'
          ? 'Khusus Anggota'
          : v.targetAudience === 'specific_members'
          ? 'Anggota Terpilih'
          : 'Semua Pelanggan';

      return {
        id: v.id,
        code: v.code.toUpperCase(),
        name: v.name,
        discountText,
        minPurchaseText,
        targetAudienceText,
        expiryText: v.endDate ? `s/d ${v.endDate}` : undefined,
      };
    });

  // 3. Shipping vouchers
  const activeShippingVouchers: ShippingVoucherCopyItem[] = (shippingVouchers || [])
    .filter((sv) => sv.isActive && (!sv.totalQuota || (sv.usedCount || 0) < sv.totalQuota))
    .slice(0, 4)
    .map((sv) => {
      const discountText = `Potongan Ongkir ${formatRupiah(sv.discountAmount)}`;
      const minDistanceText =
        (sv.minDistanceKm || 0) > 0
          ? `Min. Jarak ${sv.minDistanceKm} km`
          : 'Semua Jarak Antar';
      const targetAudienceText =
        sv.targetAudience === 'member'
          ? 'Khusus Anggota'
          : sv.targetAudience === 'visitor'
          ? 'Khusus Pengunjung'
          : 'Semua Pelanggan';

      return {
        id: sv.id,
        code: sv.code.toUpperCase(),
        name: sv.name,
        discountText,
        minDistanceText,
        targetAudienceText,
        expiryText: sv.expiryDate ? `s/d ${sv.expiryDate}` : undefined,
      };
    });

  // 4. Products with active catalog discounts - AUTOMATICALLY FOLLOWING POPULAR PRODUCTS
  // Products that are NOT popular according to website statistics and analytics are strictly EXCLUDED
  const catalogDiscounts: CatalogDiscountCopyItem[] = products
    .filter((p) => p.isAvailable && (p.hasMemberDiscount || p.hasVisitorDiscount))
    .map((p) => {
      const popInfo = findProductPopularity(p.id, p.name, products, productStats, popularProductIds);
      return { p, popInfo };
    })
    .filter(({ popInfo }) => popInfo.isPopular)
    .sort((a, b) => b.popInfo.score - a.popInfo.score)
    .slice(0, 5)
    .map(({ p, popInfo }) => {
      let descParts: string[] = [];
      let discountedPrice = p.price;

      if (p.hasMemberDiscount && p.memberDiscountValue) {
        if (p.memberDiscountType === 'percentage') {
          const cut = Math.round((p.price * p.memberDiscountValue) / 100);
          discountedPrice = Math.max(0, p.price - cut);
          descParts.push(`Diskon Anggota ${p.memberDiscountValue}% (Hemat ${formatRupiah(cut)})`);
        } else {
          discountedPrice = Math.max(0, p.price - p.memberDiscountValue);
          descParts.push(`Potongan Anggota ${formatRupiah(p.memberDiscountValue)}`);
        }
      }

      if (p.hasVisitorDiscount && p.visitorDiscountValue) {
        if (p.visitorDiscountType === 'percentage') {
          const cut = Math.round((p.price * p.visitorDiscountValue) / 100);
          discountedPrice = Math.max(0, p.price - cut);
          descParts.push(`Diskon Pengunjung ${p.visitorDiscountValue}%`);
        } else {
          descParts.push(`Potongan Pengunjung ${formatRupiah(p.visitorDiscountValue)}`);
        }
      }

      return {
        productId: p.id,
        productName: p.name,
        emoji: p.emoji,
        imageUrl: p.imageUrl,
        originalPrice: p.price,
        discountedPrice,
        discountSummary: descParts.join(' & '),
        popularityScore: popInfo.score,
        popularityTrend: popInfo.trendText,
      };
    });

  // 5. Active gift promotions - AUTOMATICALLY FOLLOWING POPULAR PRODUCTS
  // Promo gift & hadiah gratis that are NOT popular according to website statistics and analytics are strictly EXCLUDED
  const activeGiftPromos: GiftPromoCopyItem[] = (promotions || [])
    .filter((p) => p.isActive && (!p.isStockExhausted || (p.bonusStock && p.bonusStock > 0)))
    .map((p) => {
      const buyPop = findProductPopularity(p.buyProductId, p.buyProductName, products, productStats, popularProductIds);
      const rewardPop = findProductPopularity(p.rewardProductId, p.rewardProductName, products, productStats, popularProductIds);
      const isPopular = buyPop.isPopular || rewardPop.isPopular;
      const score = Math.max(buyPop.score, rewardPop.score);
      const trendText = buyPop.isPopular ? buyPop.trendText : rewardPop.trendText;
      return { p, isPopular, score, trendText };
    })
    .filter(({ isPopular }) => isPopular)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ p, score, trendText }) => ({
      id: p.id,
      title: p.giftTitle || p.name,
      conditionText: `Beli min. ${p.minQty}x ${p.buyProductName} (${p.buyVariation})`,
      rewardText: `GRATIS ${p.rewardQty}x ${p.rewardProductName} (${p.rewardVariation})`,
      audienceText:
        p.targetAudience === 'member'
          ? 'Khusus Anggota'
          : p.targetAudience === 'visitor'
          ? 'Khusus Pengunjung'
          : 'Semua Pelanggan',
      buyProductId: p.buyProductId,
      rewardProductId: p.rewardProductId,
      popularityScore: score,
      popularityTrend: trendText,
    }));

  // 6. Active bundling promotions - AUTOMATICALLY FOLLOWING POPULAR PRODUCTS
  // Bundling promos that are NOT popular according to website statistics and analytics are strictly EXCLUDED
  const activeBundlingPromos: BundlingPromoCopyItem[] = (bundlingPromotions || [])
    .filter((bp) => bp.isActive)
    .map((bp) => {
      const popInfo = findProductPopularity(bp.productId, bp.productName, products, productStats, popularProductIds);
      return { bp, popInfo };
    })
    .filter(({ popInfo }) => popInfo.isPopular)
    .sort((a, b) => b.popInfo.score - a.popInfo.score)
    .slice(0, 4)
    .map(({ bp, popInfo }) => {
      const discountText =
        bp.discountType === 'percentage'
          ? `Hemat ${bp.discountValue}%`
          : `Hemat ${formatRupiah(bp.discountValue)}`;
      return {
        id: bp.id,
        name: bp.name,
        ruleText: `Beli min. ${bp.minQty}x ${bp.productName} (${bp.variation})`,
        discountText,
        audienceText: bp.targetAudience === 'member' ? 'Khusus Anggota' : 'Khusus Pengunjung',
        productId: bp.productId,
        popularityScore: popInfo.score,
        popularityTrend: popInfo.trendText,
      };
    });

  // ================= BUILD COPYWRITING TEXT =================
  let text = `🔥 *PRODUK TERPOPULER DI KOPDES SAAT INI* 🔥\n\n`;

  if (popularProductItems.length > 0) {
    text += `Berdasarkan data tren dan statistik pesanan pelanggan terbaru di website kami, produk pilihan berikut sedang banyak diminati:\n\n`;

    popularProductItems.forEach((item, idx) => {
      text += `${idx + 1}. ✅ *${item.name}* - ${item.formattedPrice}\n`;
      text += `     🌟 Tren: ${item.trendText}\n`;
      if (item.hasDiscount) {
        text += `     🏷️ Promo: ${item.discountText}\n`;
      }
      // Catatan: Instruksi klik gambar telah dihapus sesuai instruksi
      text += `\n`;
    });
  }

  // SHOPPING VOUCHERS SECTION
  if (activeDiscountVouchers.length > 0) {
    text += `🎟️ *VOUCHER DISKON BELANJA TERSEDIA* 🎟️\n`;
    text += `Klaim kode voucher berikut saat checkout untuk belanja lebih hemat:\n`;
    activeDiscountVouchers.forEach((v) => {
      text += `• Kode: *${v.code}* ➜ ${v.discountText}\n`;
      text += `  (${v.minPurchaseText} | Sasaran: ${v.targetAudienceText})\n`;
    });
    text += `\n`;
  }

  // SHIPPING VOUCHERS SECTION
  if (activeShippingVouchers.length > 0) {
    text += `🚚 *VOUCHER ONGKOS KIRIM KOPDES* 🚚\n`;
    text += `Dapatkan subsidi ongkos kirim langsung ke rumah Anda:\n`;
    activeShippingVouchers.forEach((sv) => {
      text += `• Kode: *${sv.code}* ➜ ${sv.discountText}\n`;
      text += `  (${sv.minDistanceText} | Sasaran: ${sv.targetAudienceText})\n`;
    });
    text += `\n`;
  }

  // CATALOG DISCOUNTS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (catalogDiscounts.length > 0) {
    text += `🏷️ *DISKON SPESIAL KATALOG PRODUK POPULER* 🏷️\n`;
    text += `Potongan harga langsung khusus produk yang sedang populer & laris di website:\n`;
    catalogDiscounts.forEach((cd) => {
      text += `• *${cd.productName}*: ${cd.discountSummary}\n`;
      text += `  Harga Spesial: ${formatRupiah(cd.discountedPrice)} (Harga Normal: ${formatRupiah(cd.originalPrice)})\n`;
      if (cd.popularityTrend) {
        text += `  📊 Tren Analitik: ${cd.popularityTrend}\n`;
      }
    });
    text += `\n`;
  }

  // GIFT PROMOS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (activeGiftPromos.length > 0) {
    text += `🎁 *PROMO GIFT & HADIAH GRATIS (PRODUK TERPOPULER)* 🎁\n`;
    text += `Beli kebutuhan pokok terpopuler dapat bonus produk gratis langsung:\n`;
    activeGiftPromos.forEach((gp) => {
      text += `• *${gp.title}*\n`;
      text += `  Syarat: ${gp.conditionText}\n`;
      text += `  🎉 Hadiah: *${gp.rewardText}* (${gp.audienceText})\n`;
      if (gp.popularityTrend) {
        text += `  📊 Tren Produk: ${gp.popularityTrend}\n`;
      }
    });
    text += `\n`;
  }

  // BUNDLING PROMOS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (activeBundlingPromos.length > 0) {
    text += `📦 *PAKET BUNDLING HEMAT (PRODUK TERPOPULER)* 📦\n`;
    text += `Paket hemat otomatis untuk produk-produk yang sedang populer dan laris di website:\n`;
    activeBundlingPromos.forEach((bp) => {
      text += `• *${bp.name}*: ${bp.ruleText} ➜ *${bp.discountText}* (${bp.audienceText})\n`;
      if (bp.popularityTrend) {
        text += `  📊 Tren Produk: ${bp.popularityTrend}\n`;
      }
    });
    text += `\n`;
  }

  text += `👇 *YUK PESAN SEKARANG SEBELUM KEHABISAN!* 👇\n`;
  text += `Buka katalog belanja lengkap & klaim voucher di website Koperasi Desa Merah Putih:\n`;
  text += `🌐 ${baseUrl}/?tab=catalog\n\n`;
  text += `Punya pertanyaan atau butuh bantuan pesan? Langsung balas pesan WhatsApp ini ya kak! 😊`;

  const payload: CopywritingPayload = {
    text,
    generatedAt: new Date().toISOString(),
    popularProducts: popularProductItems,
    discountVouchers: activeDiscountVouchers,
    shippingVouchers: activeShippingVouchers,
    catalogDiscounts,
    giftPromos: activeGiftPromos,
    bundlingPromos: activeBundlingPromos,
  };

  return payload;
};
