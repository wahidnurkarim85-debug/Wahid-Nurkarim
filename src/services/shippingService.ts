// Service untuk Pengiriman & Ongkos Kirim Otomatis Berbasis Peta & Rute Jalan
// Sesuai Spesifikasi:
// 1. Titik Asal Kopdes: Dapat diatur & disimpan oleh Admin menggunakan GPS / Geocoding
// 2. Alamat Tujuan: Mendukung Autocomplete & GPS Saya dengan reverse geocoding lengkap
// 3. Perhitungan Jarak: Rute Jalan Nyata (OSRM) dibulatkan ke atas
// 4. Pengaturan Ongkos Kirim: Tarif fleksibel per km, tarif minimum, status pengiriman
// 5. Kelola Voucher Ongkos Kirim: Minimal jarak, kuota penggunaan, potongan ongkir, sasaran

import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { ShippingLocation, ShippingCalculation, ShippingConfig, ShippingVoucher } from '../types';
import { 
  DEFAULT_KOPDES_ORIGIN, 
  DEFAULT_SHIPPING_CONFIG, 
  INITIAL_SHIPPING_VOUCHERS 
} from '../data/initialShippingData';

export const CONFIG_STORAGE_KEY = 'koperasi_shipping_config_v2';
export const VOUCHERS_STORAGE_KEY = 'koperasi_shipping_vouchers_v2';

// In-memory / fallback defaults
export const KOPDES_ORIGIN: ShippingLocation = { ...DEFAULT_KOPDES_ORIGIN };
export const RATE_PER_KM = 5000;

// Daftar Alamat Populer & Sekitar Cengkareng untuk responsivitas cepat
export const POPULAR_DESTINATION_PRESETS: Array<{
  label: string;
  address: string;
  lat: number;
  lng: number;
  area: string;
  landmark?: string;
  icon?: string;
}> = [
  {
    label: 'Jl. Kayu Besar RT 13/RW 11 (Dekat Koperasi)',
    address: 'Jl. Kayu Besar RT 13/RW 11, Cengkareng Timur, Cengkareng, Jakarta Barat 11730',
    lat: -6.1439,
    lng: 106.7295,
    area: 'Cengkareng Timur',
    landmark: 'Dekat Rusun BPS & Pasar Bersih Cengkareng',
    icon: '🛒',
  },
  {
    label: 'Jl. Utama Raya Cengkareng Timur',
    address: 'Jl. Utama Raya No. 25, Cengkareng Timur, Jakarta Barat 11730',
    lat: -6.1482,
    lng: 106.7365,
    area: 'Cengkareng Timur',
    landmark: 'Dekat Masjid Jami Al-Hidayah',
    icon: '🕌',
  },
  {
    label: 'Rusun Flamboyan Cengkareng Barat',
    address: 'Rusun Flamboyan, Jl. Flamboyan, Cengkareng Barat, Jakarta Barat 11730',
    lat: -6.1368,
    lng: 106.7215,
    area: 'Cengkareng Barat',
    landmark: 'Fasilitas Rusun & Posyandu',
    icon: '🏢',
  },
  {
    label: 'Jl. Kamal Raya (Dekat Lampu Merah Cengkareng)',
    address: 'Jl. Kamal Raya No. 42, Cengkareng Timur, Jakarta Barat 11730',
    lat: -6.1495,
    lng: 106.7320,
    area: 'Cengkareng Timur',
    landmark: 'Pertokoan & Halte Busway',
    icon: '🏪',
  },
  {
    label: 'Jl. Bangun Nusa Raya (Dekat Kantor Lurah)',
    address: 'Jl. Bangun Nusa Raya RT 05/RW 03, Cengkareng Timur, Jakarta Barat 11730',
    lat: -6.1512,
    lng: 106.7390,
    area: 'Cengkareng Timur',
    landmark: 'Kantor Kelurahan Cengkareng Timur',
    icon: '🏢',
  },
  {
    label: 'Pasar Ganefo Cengkareng',
    address: 'Pasar Ganefo, Jl. Pasar Ganefo, Cengkareng Barat, Jakarta Barat 11730',
    lat: -6.1555,
    lng: 106.7265,
    area: 'Cengkareng Barat',
    landmark: 'Pasar Tradisional Ganefo',
    icon: '🛒',
  },
  {
    label: 'Mall Taman Palem / Cengkareng Timur',
    address: 'Mall Taman Palem, Jl. Boulevard Taman Palem, Cengkareng, Jakarta Barat 11730',
    lat: -6.1390,
    lng: 106.7410,
    area: 'Cengkareng Timur',
    landmark: 'Pusat Perbelanjaan Mall Taman Palem',
    icon: '🛒',
  },
  {
    label: 'Rawa Buaya (Stasiun Rawa Buaya)',
    address: 'Jl. Raya Rawa Buaya, Cengkareng, Jakarta Barat 11740',
    lat: -6.1605,
    lng: 106.7380,
    area: 'Rawa Buaya',
    landmark: 'Stasiun Kereta KRL Rawa Buaya',
    icon: '📍',
  },
  {
    label: 'Puri Indah Mall (Kembangan)',
    address: 'Puri Indah Mall, Jl. Puri Agung, Kembangan, Jakarta Barat 11610',
    lat: -6.1865,
    lng: 106.7345,
    area: 'Kembangan',
    landmark: 'Puri Indah Mall',
    icon: '🛒',
  },
];

// ==========================================
// 1. PENGATURAN ONGKOS KIRIM & TITIK ASAL KOPDES
// ==========================================

export function getStoredShippingConfig(): ShippingConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.origin && typeof parsed.ratePerKm === 'number') {
        return {
          ...DEFAULT_SHIPPING_CONFIG,
          ...parsed,
          origin: {
            ...DEFAULT_KOPDES_ORIGIN,
            ...parsed.origin,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Error reading shipping config from localStorage:', err);
  }
  return DEFAULT_SHIPPING_CONFIG;
}

export async function saveShippingConfig(config: ShippingConfig): Promise<void> {
  // Simpan ke localStorage terlebih dahulu untuk persistensi instan
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Error saving shipping config to localStorage:', err);
  }

  // Sinkronkan ke Firestore
  try {
    const configRef = doc(db, 'settings', 'shipping');
    await setDoc(configRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore shipping config sync warning (fallback to local):', err);
  }
}

// ==========================================
// 2. KELOLA VOUCHER ONGKOS KIRIM
// ==========================================

export function getStoredShippingVouchers(): ShippingVoucher[] {
  try {
    const saved = localStorage.getItem(VOUCHERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading shipping vouchers from localStorage:', err);
  }
  return INITIAL_SHIPPING_VOUCHERS;
}

export async function saveShippingVouchers(vouchers: ShippingVoucher[]): Promise<void> {
  try {
    localStorage.setItem(VOUCHERS_STORAGE_KEY, JSON.stringify(vouchers));
  } catch (err) {
    console.warn('Error saving shipping vouchers to localStorage:', err);
  }

  // Sinkronkan voucher individual ke Firestore
  try {
    const promises = vouchers.map((v) => {
      const vRef = doc(db, 'shipping_vouchers', v.id);
      return setDoc(vRef, sanitizeFirestoreData({
        ...v,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    });
    await Promise.all(promises);
  } catch (err) {
    console.warn('Firestore shipping vouchers sync warning:', err);
  }
}

// Pengurangan Kuota Voucher saat Transaksi WhatsApp Berhasil/Dikonfirmasi
export async function deductShippingVoucherUsage(voucherCodeOrId: string): Promise<boolean> {
  try {
    const vouchers = getStoredShippingVouchers();
    let updated = false;

    const nextVouchers = vouchers.map((v) => {
      if (v.code.toUpperCase() === voucherCodeOrId.toUpperCase() || v.id === voucherCodeOrId) {
        const newUsedCount = (v.usedCount || 0) + 1;
        const isExhausted = newUsedCount >= v.totalQuota;
        updated = true;
        return {
          ...v,
          usedCount: newUsedCount,
          isActive: isExhausted ? false : v.isActive, // Jika stok habis -> otomatis nonaktif
          updatedAt: new Date().toISOString(),
        };
      }
      return v;
    });

    if (updated) {
      await saveShippingVouchers(nextVouchers);
      return true;
    }
  } catch (err) {
    console.warn('Error deducting shipping voucher usage:', err);
  }
  return false;
}

// ==========================================
// 3. REVERSE GEOCODING DENGAN DETAIL LENGKAP & PATOKAN PETA
// ==========================================

export interface ReverseGeocodeResult extends ShippingLocation {
  displayName: string;
}

// Pemetaan Ikon Landmark Berdasarkan Tag OpenStreetMap
function detectLandmarkCategory(props: any): { icon: string; category: string } {
  const type = (props.type || props.class || '').toLowerCase();
  const amenity = (props.amenity || '').toLowerCase();
  const shop = (props.shop || '').toLowerCase();
  const building = (props.building || '').toLowerCase();

  if (amenity.includes('place_of_worship') || amenity.includes('mosque') || type.includes('mosque')) {
    return { icon: '🕌', category: 'Masjid / Mushola' };
  }
  if (amenity.includes('school') || amenity.includes('college') || amenity.includes('kindergarten') || building.includes('school')) {
    return { icon: '🏫', category: 'Sekolah / Pendidikan' };
  }
  if (amenity.includes('office') || props.office || building.includes('office')) {
    return { icon: '🏢', category: 'Kantor' };
  }
  if (amenity.includes('marketplace') || shop.includes('supermarket') || type.includes('marketplace')) {
    return { icon: '🛒', category: 'Pasar / Supermarket' };
  }
  if (shop || amenity.includes('convenience')) {
    return { icon: '🏪', category: 'Toko / Warung' };
  }
  if (amenity.includes('hospital') || amenity.includes('clinic') || amenity.includes('pharmacy')) {
    return { icon: '🏥', category: 'Fasilitas Kesehatan' };
  }
  return { icon: '📍', category: 'Patokan Lokasi' };
}

export async function reverseGeocodeAddress(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'id',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const extratags = data.extratags || {};
        const landmarkInfo = detectLandmarkCategory({ ...addr, ...extratags, type: data.type, class: data.class });

        const street = addr.road || addr.residential || addr.pedestrian || addr.street || '';
        const rt = addr.rt || '';
        const rw = addr.rw || '';
        const kelurahan = addr.village || addr.quarter || addr.suburb || addr.neighbourhood || '';
        const kecamatan = addr.city_district || addr.subdistrict || addr.municipality || '';
        const city = addr.city || addr.county || addr.town || 'Jakarta Barat';
        const province = addr.state || addr.region || 'DKI Jakarta';
        const postalCode = addr.postcode || '';

        // Deteksi nama bangunan / patokan
        const landmarkName = data.name || extratags.name || extratags.brand || (data.namedetails ? data.namedetails.name : '');
        let landmarkStr = '';
        if (landmarkName && landmarkName !== street) {
          landmarkStr = `${landmarkInfo.icon} ${landmarkInfo.category}: ${landmarkName}`;
        }

        // Susun alamat terstruktur rapi
        const parts: string[] = [];
        if (street) parts.push(street);
        if (rt || rw) parts.push(`RT ${rt || '-'}/RW ${rw || '-'}`);
        if (kelurahan) parts.push(`Kel. ${kelurahan}`);
        if (kecamatan) parts.push(`Kec. ${kecamatan}`);
        if (city) parts.push(city);
        if (province) parts.push(province);
        if (postalCode) parts.push(postalCode);

        const structuredAddress = parts.join(', ') || data.display_name;

        return {
          name: landmarkName || (street ? `Alamat ${street}` : `Titik Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`),
          address: structuredAddress,
          lat,
          lng,
          street,
          rt,
          rw,
          kelurahan,
          kecamatan,
          city,
          province,
          postalCode,
          landmark: landmarkStr || (landmarkInfo.category !== 'Patokan Lokasi' ? `${landmarkInfo.icon} ${landmarkInfo.category}` : undefined),
          displayName: data.display_name || structuredAddress,
        };
      }
    }
  } catch (err) {
    console.warn('Reverse geocode error, fallback to coordinate label:', err);
  }

  // Fallback jika API sedang sibuk
  return {
    name: `Lokasi GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    address: `Koordinat GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    displayName: `Koordinat GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

// ==========================================
// 4. AUTOCOMPLETE PENCARIAN ALAMAT
// ==========================================

export interface AutocompleteResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
  landmark?: string;
  icon?: string;
}

export async function searchAddressAutocomplete(
  queryText: string,
  referenceOrigin: ShippingLocation = KOPDES_ORIGIN
): Promise<AutocompleteResult[]> {
  const cleanQuery = queryText.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // 1. Preset lokal untuk responsivitas seketika
  const localMatches: AutocompleteResult[] = POPULAR_DESTINATION_PRESETS.filter(
    (p) =>
      p.label.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      p.area.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      (p.landmark && p.landmark.toLowerCase().includes(cleanQuery.toLowerCase()))
  ).map((p, idx) => ({
    id: `preset_${idx}`,
    name: p.label,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    type: p.area,
    landmark: p.landmark,
    icon: p.icon || '📍',
  }));

  // 2. Query ke Photon Komoot (berbasis OpenStreetMap dengan pembobotan titik asal Kopdes)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      cleanQuery
    )}&lat=${referenceOrigin.lat}&lon=${referenceOrigin.lng}&limit=8`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const apiResults: AutocompleteResult[] = data.features.map(
          (feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0];
            const name = props.name || props.street || cleanQuery;
            const landmarkInfo = detectLandmarkCategory(props);

            const parts = [
              props.name,
              props.street,
              props.district,
              props.city || 'Jakarta Barat',
              props.state,
              props.postcode,
            ].filter(Boolean);
            const fullAddress = Array.from(new Set(parts)).join(', ');

            return {
              id: `photon_${idx}_${props.osm_id || idx}`,
              name: name,
              address: fullAddress || cleanQuery,
              lat: coords[1],
              lng: coords[0],
              type: props.district || props.city || 'Alamat',
              landmark: landmarkInfo.category !== 'Patokan Lokasi' ? `${landmarkInfo.icon} ${landmarkInfo.category}` : undefined,
              icon: landmarkInfo.icon,
            };
          }
        );

        const combined = [...localMatches];
        for (const item of apiResults) {
          if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.0008 && Math.abs(c.lng - item.lng) < 0.0008)) {
            combined.push(item);
          }
        }
        return combined.slice(0, 8);
      }
    }
  } catch (err) {
    // jika offline atau timeout, fallback ke Nominatim
  }

  // 3. Fallback ke OpenStreetMap Nominatim
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanQuery + ' Jakarta'
    )}&countrycodes=id&viewbox=106.65,-6.05,106.85,-6.25&limit=6`;

    const nomRes = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'id',
      },
    });

    if (nomRes.ok) {
      const list = await nomRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const nomResults: AutocompleteResult[] = list.map((item: any, idx: number) => {
          const landmarkInfo = detectLandmarkCategory(item);
          return {
            id: `nom_${item.place_id || idx}`,
            name: item.name || item.display_name.split(',')[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type || 'Lokasi',
            landmark: landmarkInfo.category !== 'Patokan Lokasi' ? `${landmarkInfo.icon} ${landmarkInfo.category}` : undefined,
            icon: landmarkInfo.icon,
          };
        });

        const combined = [...localMatches];
        for (const item of nomResults) {
          if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.0008 && Math.abs(c.lng - item.lng) < 0.0008)) {
            combined.push(item);
          }
        }
        return combined.slice(0, 8);
      }
    }
  } catch {
    // fallback ke local matches
  }

  return localMatches;
}

// ==========================================
// 5. KALKULASI JARAK RUTE JALAN (OSRM) & ONGKIR
// ==========================================

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Aturan pembulatan jarak rute jalan:
 * - Desimal <= 0,5 km dibulatkan ke bawah (floor)
 *   Contoh: 1,5 km = 1 km, 2,5 km = 2 km
 * - Desimal > 0,5 km dibulatkan ke atas (ceil)
 *   Contoh: 1,6 km = 2 km, 2,6 km = 3 km
 * - Minimal jarak penagihan pengiriman adalah 1 km
 */
export function roundRouteDistanceKm(distanceKm: number): number {
  if (distanceKm <= 0) return 1;
  const clean = Math.round(distanceKm * 10) / 10;
  const floorVal = Math.floor(clean);
  const decimalPart = Math.round((clean - floorVal) * 10) / 10;

  const rounded = decimalPart <= 0.5 ? floorVal : Math.ceil(clean);
  return Math.max(1, rounded);
}

export function calculateShippingFee(
  actualDistanceKm: number,
  ratePerKm: number = RATE_PER_KM,
  minShippingFee: number = 5000
): {
  actualDistanceKm: number;
  billedDistanceKm: number;
  shippingFee: number;
  ratePerKm: number;
} {
  const cleanActual = Math.max(0.1, Math.round(actualDistanceKm * 10) / 10);
  const billedKm = roundRouteDistanceKm(cleanActual);
  const rawFee = billedKm * ratePerKm;
  const finalFee = Math.max(rawFee, minShippingFee);

  return {
    actualDistanceKm: cleanActual,
    billedDistanceKm: billedKm,
    shippingFee: finalFee,
    ratePerKm,
  };
}

export async function calculateRoadRouteDistance(
  destLat: number,
  destLng: number,
  origin: ShippingLocation = KOPDES_ORIGIN,
  ratePerKm: number = RATE_PER_KM,
  minShippingFee: number = 5000,
  vehicleType: 'motorcycle' | 'car' = 'motorcycle',
  avoidTolls: boolean = true
): Promise<{
  actualDistanceKm: number;
  billedDistanceKm: number;
  shippingFee: number;
  ratePerKm: number;
  estimatedDurationMinutes: number;
  routeGeometry: [number, number][];
  isRoadRoute: boolean;
  vehicleType: 'motorcycle' | 'car';
  avoidTolls: boolean;
}> {
  // 1. Prioritas: Rute Sepeda Motor Non-Tol (menghindari jalan tol mobil via OpenStreetMap non-motorway engine)
  if (vehicleType === 'motorcycle' || avoidTolls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // routed-bike secara ketat memblokir jalan tol (toll=yes, motorway) dan hanya melewati rute jalan umum/arteri yang boleh dilewati sepeda motor
      const motorcycleUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson`;

      const res = await fetch(motorcycleUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceMeters = route.distance || 0;
          const actualKm = Number((distanceMeters / 1000).toFixed(1));
          // Estimasi waktu tempuh sepeda motor di Jakarta (rata-rata 30-35 km/jam ~ 2 menit/km)
          const durationMin = Math.max(2, Math.round(actualKm * 2.2));

          let geometry: [number, number][] = [];
          if (route.geometry && Array.isArray(route.geometry.coordinates)) {
            geometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          }

          const feeCalc = calculateShippingFee(actualKm, ratePerKm, minShippingFee);

          return {
            ...feeCalc,
            estimatedDurationMinutes: durationMin,
            routeGeometry: geometry,
            isRoadRoute: true,
            vehicleType: 'motorcycle',
            avoidTolls: true,
          };
        }
      }
    } catch (err) {
      console.warn('Motorcycle non-toll routing warning, attempting fallback:', err);
    }
  }

  // 2. Fallback jika engine non-tol sedang sibuk: OSRM standard
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceMeters = route.distance || 0;
        const actualKm = Number((distanceMeters / 1000).toFixed(1));
        const durationMin = Math.max(2, Math.round(actualKm * 2.2));

        let geometry: [number, number][] = [];
        if (route.geometry && Array.isArray(route.geometry.coordinates)) {
          geometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        }

        const feeCalc = calculateShippingFee(actualKm, ratePerKm, minShippingFee);

        return {
          ...feeCalc,
          estimatedDurationMinutes: durationMin,
          routeGeometry: geometry,
          isRoadRoute: true,
          vehicleType,
          avoidTolls,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing error/timeout, using road factor fallback:', err);
  }

  // 3. Fallback kelokan jalan perkotaan Jakarta (1.35x garis lurus)
  const straightKm = calculateHaversineKm(
    origin.lat,
    origin.lng,
    destLat,
    destLng
  );
  const estimatedRoadKm = Number((straightKm * 1.35).toFixed(1));
  const feeCalc = calculateShippingFee(estimatedRoadKm, ratePerKm, minShippingFee);

  return {
    ...feeCalc,
    estimatedDurationMinutes: Math.max(3, Math.round(estimatedRoadKm * 2.5)),
    routeGeometry: [
      [origin.lat, origin.lng],
      [destLat, destLng],
    ],
    isRoadRoute: false,
    vehicleType,
    avoidTolls,
  };
}

export function getGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  origin: ShippingLocation = KOPDES_ORIGIN,
  vehicleType: 'motorcycle' | 'car' = 'motorcycle',
  avoidTolls: boolean = true
): string {
  // Mode Sepeda Motor (travelmode=two_wheeler) dan Hindari Tol (avoid=tolls & dirflg=w)
  // Menjamin navigasi di Google Maps HP dan Web tidak masuk ke jalan tol mobil
  const travelMode = vehicleType === 'motorcycle' ? 'two_wheeler' : 'driving';
  const dirflg = vehicleType === 'motorcycle' ? '&dirflg=w' : '';
  const avoid = avoidTolls ? '&avoid=tolls' : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destLat},${destLng}&travelmode=${travelMode}${dirflg}${avoid}`;
}
