import re

with open('src/utils/copywritingHelper.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace catalogDiscounts, activeGiftPromos, and activeBundlingPromos
pattern_sections = r'  // 4\. Products with active catalog discounts.*?  // ================= BUILD COPYWRITING TEXT ================='

replacement_sections = '''  // 4. Products with active catalog discounts - AUTOMATICALLY FOLLOWING POPULAR PRODUCTS
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

  // ================= BUILD COPYWRITING TEXT ================='''

if not re.search(pattern_sections, content, re.DOTALL):
    print("FAILED TO MATCH SECTIONS")
    exit(1)

content = re.sub(pattern_sections, replacement_sections, content, flags=re.DOTALL)

# 2. Remove the line: text += `     🖼️ [GAMBAR: BELANJA SEKARANG]\n`;
old_banner_text = "      // REQUIREMENT: Hapus link URL otomatis, ganti dengan gambar bertuliskan \"Belanja Sekarang\"\n      text += `     🖼️ [GAMBAR: BELANJA SEKARANG]\\n`;\n"
new_banner_text = "      // Catatan: Tanda teks \"[GAMBAR: BELANJA SEKARANG]\" telah dihapus sesuai instruksi\n"

if old_banner_text in content:
    content = content.replace(old_banner_text, new_banner_text)
else:
    # Also handle if slightly different
    content = re.sub(r'[ \t]*text \+= `[ \t]*🖼️ \[GAMBAR: BELANJA SEKARANG\]\\n`;\n?', '', content)

# 3. Update the text headings for Catalog Discounts, Gift Promos, Bundling Promos to reflect popularity & trend
old_discounts_section = """  // CATALOG DISCOUNTS SECTION
  if (catalogDiscounts.length > 0) {
    text += `🏷️ *DISKON SPESIAL KATALOG PRODUK* 🏷️\\n`;
    text += `Potongan harga langsung untuk produk pilihan hari ini:\\n`;
    catalogDiscounts.forEach((cd) => {
      text += `• *${cd.productName}*: ${cd.discountSummary}\\n`;
      text += `  Harga Spesial: ${formatRupiah(cd.discountedPrice)} (Harga Normal: ${formatRupiah(cd.originalPrice)})\\n`;
    });
    text += `\\n`;
  }"""

new_discounts_section = """  // CATALOG DISCOUNTS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (catalogDiscounts.length > 0) {
    text += `🏷️ *DISKON SPESIAL KATALOG PRODUK POPULER* 🏷️\\n`;
    text += `Potongan harga langsung khusus produk yang sedang populer & laris di website:\\n`;
    catalogDiscounts.forEach((cd) => {
      text += `• *${cd.productName}*: ${cd.discountSummary}\\n`;
      text += `  Harga Spesial: ${formatRupiah(cd.discountedPrice)} (Harga Normal: ${formatRupiah(cd.originalPrice)})\\n`;
      if (cd.popularityTrend) {
        text += `  📊 Tren Analitik: ${cd.popularityTrend}\\n`;
      }
    });
    text += `\\n`;
  }"""

if old_discounts_section in content:
    content = content.replace(old_discounts_section, new_discounts_section)

old_gifts_section = """  // GIFT PROMOS SECTION
  if (activeGiftPromos.length > 0) {
    text += `🎁 *PROMO GIFT & HADIAH GRATIS* 🎁\\n`;
    text += `Beli kebutuhan pokok dapat bonus produk gratis langsung:\\n`;
    activeGiftPromos.forEach((gp) => {
      text += `• *${gp.title}*\\n`;
      text += `  Syarat: ${gp.conditionText}\\n`;
      text += `  🎉 Hadiah: *${gp.rewardText}* (${gp.audienceText})\\n`;
    });
    text += `\\n`;
  }"""

new_gifts_section = """  // GIFT PROMOS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (activeGiftPromos.length > 0) {
    text += `🎁 *PROMO GIFT & HADIAH GRATIS (PRODUK TERPOPULER)* 🎁\\n`;
    text += `Beli kebutuhan pokok terpopuler dapat bonus produk gratis langsung:\\n`;
    activeGiftPromos.forEach((gp) => {
      text += `• *${gp.title}*\\n`;
      text += `  Syarat: ${gp.conditionText}\\n`;
      text += `  🎉 Hadiah: *${gp.rewardText}* (${gp.audienceText})\\n`;
      if (gp.popularityTrend) {
        text += `  📊 Tren Produk: ${gp.popularityTrend}\\n`;
      }
    });
    text += `\\n`;
  }"""

if old_gifts_section in content:
    content = content.replace(old_gifts_section, new_gifts_section)

old_bundling_section = """  // BUNDLING PROMOS SECTION
  if (activeBundlingPromos.length > 0) {
    text += `📦 *PAKET BUNDLING HEMAT* 📦\\n`;
    activeBundlingPromos.forEach((bp) => {
      text += `• *${bp.name}*: ${bp.ruleText} ➜ *${bp.discountText}* (${bp.audienceText})\\n`;
    });
    text += `\\n`;
  }"""

new_bundling_section = """  // BUNDLING PROMOS SECTION (Otomatis mengikuti produk populer terhubung analitik website)
  if (activeBundlingPromos.length > 0) {
    text += `📦 *PAKET BUNDLING HEMAT (PRODUK TERPOPULER)* 📦\\n`;
    text += `Paket hemat otomatis untuk produk-produk yang sedang populer dan laris di website:\\n`;
    activeBundlingPromos.forEach((bp) => {
      text += `• *${bp.name}*: ${bp.ruleText} ➜ *${bp.discountText}* (${bp.audienceText})\\n`;
      if (bp.popularityTrend) {
        text += `  📊 Tren Produk: ${bp.popularityTrend}\\n`;
      }
    });
    text += `\\n`;
  }"""

if old_bundling_section in content:
    content = content.replace(old_bundling_section, new_bundling_section)

with open('src/utils/copywritingHelper.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESSFULLY APPLIED")
