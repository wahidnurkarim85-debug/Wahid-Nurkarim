import { 
  CustomerOrder, 
  DeliveryNotificationLog, 
  DeliveryNotificationType, 
  DeliveryRoute, 
  ShippingLocation 
} from '../types';
import { calculateHaversineKm } from './shippingService';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

export interface RouteOptimizationResult {
  orderedOrders: CustomerOrder[];
  totalGpsDistanceKm: number;
  estimatedRoadDistanceKm: number;
  legs: {
    fromName: string;
    toName: string;
    gpsDistanceKm: number;
    estimatedRoadKm: number;
  }[];
}

/**
 * Hitung jarak garis lurus GPS (Haversine)
 */
export function getStraightLineGpsDistanceKm(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const dist = calculateHaversineKm(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
  return Number(dist.toFixed(2));
}

/**
 * Estimasi jarak rute jalan perkotaan (faktor kelokan jalan perkotaan Jakarta ~1.35x)
 */
export function estimateRoadDistanceKm(gpsDistanceKm: number): number {
  return Number((gpsDistanceKm * 1.35).toFixed(1));
}

/**
 * Format teks jarak yang transparan dan edukatif sesuai regulasi:
 * Membedakan jarak garis lurus GPS dengan estimasi rute jalan nyata dan estimasi waktu tempuh (ETA).
 */
export function formatDistanceDescription(gpsKm: number): {
  gpsText: string;
  roadEstText: string;
  clarification: string;
} {
  const roadKm = estimateRoadDistanceKm(gpsKm);
  return {
    gpsText: gpsKm < 1 ? `${Math.round(gpsKm * 1000)} meter (GPS lurus)` : `${gpsKm.toFixed(2)} km (GPS lurus)`,
    roadEstText: roadKm < 1 ? `±${Math.round(roadKm * 1000)} m (estimasi jalan)` : `±${roadKm.toFixed(1)} km (estimasi jalan)`,
    clarification: 'Jarak GPS garis lurus dihitung dari koordinat satelit. Estimasi rute jalan memperhitungkan belokan jalan. Buka Google Maps untuk rute dan kondisi lalu lintas terkini.'
  };
}

/**
 * Urutkan dan filter pesanan berdasarkan titik referensi (Kopdes / Titik Utama / GPS Kurir)
 */
export function findNearestOrders(
  orders: CustomerOrder[],
  referenceCoord: { lat: number; lng: number },
  options: {
    searchQuery?: string;
    maxDistanceKm?: number | null; // 0.5, 1, 2, 5, atau null (Semua)
    kelurahanFilter?: string;
    excludeOrderId?: string;
  } = {}
): Array<CustomerOrder & { distanceGpsKm: number; estimatedRoadKm: number }> {
  const { searchQuery, maxDistanceKm, kelurahanFilter, excludeOrderId } = options;
  const cleanQuery = (searchQuery || '').trim().toLowerCase();

  const mapped = orders
    .filter((order) => {
      // Exclude specific order (e.g. when picking anchor)
      if (excludeOrderId && order.id === excludeOrderId) return false;

      // Filter search query (alamat, nama, nomor pesanan, patokan, kelurahan)
      if (cleanQuery) {
        const matchNumber = order.orderNumber.toLowerCase().includes(cleanQuery);
        const matchCustomer = order.customerName.toLowerCase().includes(cleanQuery);
        const matchAddress = order.shippingAddress.toLowerCase().includes(cleanQuery);
        const matchKelurahan = (order.kelurahan || '').toLowerCase().includes(cleanQuery);
        const matchKecamatan = (order.kecamatan || '').toLowerCase().includes(cleanQuery);
        const matchLandmark = (order.landmarkNotes || '').toLowerCase().includes(cleanQuery);
        if (!matchNumber && !matchCustomer && !matchAddress && !matchKelurahan && !matchKecamatan && !matchLandmark) {
          return false;
        }
      }

      // Filter kelurahan
      if (kelurahanFilter && kelurahanFilter !== 'Semua') {
        const orderKel = (order.kelurahan || '').toLowerCase();
        if (!orderKel.includes(kelurahanFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .map((order) => {
      const orderCoord = order.deliveryCoords || { lat: -6.1482, lng: 106.7365 };
      const distanceGpsKm = getStraightLineGpsDistanceKm(referenceCoord, orderCoord);
      const estimatedRoadKm = estimateRoadDistanceKm(distanceGpsKm);

      return {
        ...order,
        distanceGpsKm,
        estimatedRoadKm,
      };
    });

  // Filter radius jika dipilih
  const filteredByRadius = typeof maxDistanceKm === 'number' && maxDistanceKm > 0
    ? mapped.filter((o) => o.distanceGpsKm <= maxDistanceKm)
    : mapped;

  // Urutkan dari yang terdekat
  return filteredByRadius.sort((a, b) => a.distanceGpsKm - b.distanceGpsKm);
}

/**
 * Algoritma Optimasi Rute (Greedy Nearest-Neighbor TSP Heuristic)
 * Menyusun urutan pengiriman paling efisien dari titik awal
 */
export function optimizeDeliverySequence(
  originCoord: { lat: number; lng: number },
  originName: string,
  ordersToDeliver: CustomerOrder[]
): RouteOptimizationResult {
  if (ordersToDeliver.length === 0) {
    return {
      orderedOrders: [],
      totalGpsDistanceKm: 0,
      estimatedRoadDistanceKm: 0,
      legs: [],
    };
  }

  const remaining = [...ordersToDeliver];
  const orderedOrders: CustomerOrder[] = [];
  const legs: RouteOptimizationResult['legs'] = [];

  let currentCoord = originCoord;
  let currentName = originName;
  let totalGps = 0;

  while (remaining.length > 0) {
    // Cari yang paling dekat dengan posisi saat ini
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const coord = remaining[i].deliveryCoords || { lat: -6.1482, lng: 106.7365 };
      const d = getStraightLineGpsDistanceKm(currentCoord, coord);
      if (d < minDistance) {
        minDistance = d;
        bestIndex = i;
      }
    }

    const nextOrder = remaining.splice(bestIndex, 1)[0];
    const nextCoord = nextOrder.deliveryCoords || { lat: -6.1482, lng: 106.7365 };
    const legGps = Number(minDistance.toFixed(2));
    const legRoad = estimateRoadDistanceKm(legGps);

    legs.push({
      fromName: currentName,
      toName: `${nextOrder.orderNumber} (${nextOrder.customerName})`,
      gpsDistanceKm: legGps,
      estimatedRoadKm: legRoad,
    });

    totalGps += legGps;
    orderedOrders.push(nextOrder);
    currentCoord = nextCoord;
    currentName = `${nextOrder.orderNumber} - ${nextOrder.shippingAddress.slice(0, 30)}...`;
  }

  const totalRoad = estimateRoadDistanceKm(totalGps);

  return {
    orderedOrders,
    totalGpsDistanceKm: Number(totalGps.toFixed(2)),
    estimatedRoadDistanceKm: Number(totalRoad.toFixed(1)),
    legs,
  };
}

/**
 * Buat URL Google Maps Rute Pengiriman (Multi-Stop Waypoints)
 * Menggunakan titik acuan asal dinamis (GPS Kurir / Kopdes)
 */
export function generateMultiStopGoogleMapsUrl(
  origin: { lat: number; lng: number },
  orders: CustomerOrder[],
  vehicleType: 'motorcycle' | 'car' = 'motorcycle'
): string {
  if (orders.length === 0) return '';

  const originParam = `${origin.lat},${origin.lng}`;
  const lastOrder = orders[orders.length - 1];
  const destCoord = lastOrder.deliveryCoords || { lat: origin.lat, lng: origin.lng };
  const destParam = `${destCoord.lat},${destCoord.lng}`;

  const waypoints = orders
    .slice(0, -1)
    .map((o) => {
      const c = o.deliveryCoords || { lat: origin.lat, lng: origin.lng };
      return `${c.lat},${c.lng}`;
    })
    .join('|');

  const travelMode = vehicleType === 'motorcycle' ? 'two_wheeler' : 'driving';
  const dirflg = vehicleType === 'motorcycle' ? '&dirflg=w' : '';
  const waypointsQuery = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}${waypointsQuery}&travelmode=${travelMode}${dirflg}&avoid=tolls`;
}

/**
 * Metadata template teks pemberitahuan pelanggan terintegrasi
 */
export const NOTIFICATION_TEMPLATES: Record<
  DeliveryNotificationType,
  {
    title: string;
    badgeLabel: string;
    icon: string;
    generateMessage: (order: CustomerOrder, employeeName: string, customNote?: string) => string;
  }
> = {
  PENGIRIMAN_DIKONFIRMASI: {
    title: '🔔 Pengiriman Dikonfirmasi',
    badgeLabel: 'Dikonfirmasi',
    icon: '🔔',
    generateMessage: (o, emp) =>
      `Pesanan ${o.orderNumber} telah dikonfirmasi oleh petugas pengiriman ${emp}. Paket belanja sembako Anda sedang disiapkan di gerai Kopdes.`,
  },
  PESANAN_DIAMBIL: {
    title: '📦 Pesanan Sudah Diambil',
    badgeLabel: 'Diambil',
    icon: '📦',
    generateMessage: (o, emp) =>
      `Pesanan ${o.orderNumber} telah diambil oleh kurir ${emp} dari gerai Kopdes dan selesai diverifikasi.`,
  },
  DALAM_PERJALANAN: {
    title: '🚚 Sedang Dalam Perjalanan',
    badgeLabel: 'Perjalanan',
    icon: '🚚',
    generateMessage: (o, emp) =>
      `Kurir ${emp} sedang dalam perjalanan mengantarkan paket pesanan ${o.orderNumber} menuju lokasi alamat Anda (${o.shippingAddress}).`,
  },
  PESANAN_TERTUNDA: {
    title: '⏳ Pesanan Tertunda',
    badgeLabel: 'Tertunda',
    icon: '⏳',
    generateMessage: (o, emp, reason) =>
      `Pengiriman pesanan ${o.orderNumber} mengalami sedikit keterlambatan dikarenakan: "${reason || 'Kendala lalu lintas / cuaca hujan'}". Kurir ${emp} tetap berusaha secepatnya tiba di lokasi Anda.`,
  },
  HAMPIR_TIBA: {
    title: '📍 Petugas Hampir Tiba',
    badgeLabel: 'Hampir Tiba',
    icon: '📍',
    generateMessage: (o, emp) =>
      `Kurir ${emp} sudah berada di sekitar wilayah Anda (radius ±500m). Mohon pastikan penerima atau nomor telepon ${o.customerPhone} dapat dihubungi.`,
  },
  SUDAH_TIBA: {
    title: '📍 Petugas Sudah Tiba di Lokasi',
    badgeLabel: 'Tiba',
    icon: '📍',
    generateMessage: (o, emp) =>
      `Kurir ${emp} telah tiba di titik lokasi alamat pengiriman pesanan ${o.orderNumber}. Mohon bersiap menerima paket.`,
  },
  MENUNGGU_PENERIMA: {
    title: '🤝 Menunggu Konfirmasi Penerima',
    badgeLabel: 'Menunggu',
    icon: '🤝',
    generateMessage: (o, emp, note) =>
      `Kurir ${emp} sedang menunggu penerima di depan alamat pesanan ${o.orderNumber}. ${note ? `Catatan: ${note}` : 'Silakan temui petugas kurir.'}`,
  },
  PESANAN_SELESAI: {
    title: '✅ Pesanan Selesai & Diterima',
    badgeLabel: 'Selesai',
    icon: '✅',
    generateMessage: (o, emp, recipient) =>
      `Pesanan ${o.orderNumber} telah sukses diserahkan oleh kurir ${emp} kepada ${recipient || o.customerName}. Terima kasih telah berbelanja di Koperasi Desa Merah Putih!`,
  },
};

/**
 * Dispatch Notifikasi Pelanggan & Rekam ke Log Admin + Riwayat Pesanan
 */
export async function sendCustomerDeliveryNotification(params: {
  order: CustomerOrder;
  employeeId: string;
  employeeName: string;
  type: DeliveryNotificationType;
  customNote?: string;
  delayReason?: string;
}): Promise<DeliveryNotificationLog> {
  const { order, employeeId, employeeName, type, customNote, delayReason } = params;

  const template = NOTIFICATION_TEMPLATES[type];
  const title = template.title;
  const message = template.generateMessage(order, employeeName, delayReason || customNote);

  const accountType: 'Basic' | 'Anggota' = order.customerRole === 'ANGGOTA' ? 'Anggota' : 'Basic';
  const accountId = order.userId || order.userAccountId || order.customerPhone || 'ACC-GUEST';
  const now = new Date();
  const sentAtStr = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  const notificationLog: DeliveryNotificationLog = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    accountId,
    accountType,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    employeeId,
    employeeName,
    notificationType: type,
    title,
    message,
    sentAt: sentAtStr,
    isRead: false,
    currentDeliveryStatus: order.deliveryStatus || 'Diproses',
    delayReason,
  };

  // 1. Simpan ke Firestore collection 'deliveryNotificationLogs' untuk Log Admin
  try {
    await addDoc(collection(db, 'deliveryNotificationLogs'), {
      ...notificationLog,
      createdAtIso: now.toISOString(),
      timestampMs: now.getTime(),
    });
  } catch (err) {
    console.warn('Could not write to deliveryNotificationLogs:', err);
  }

  // 2. Simpan ke Firestore collection 'inbox' agar muncul di Kotak Pesan Akun Pelanggan yang Tepat (Basic vs Anggota)
  try {
    await addDoc(collection(db, 'inbox'), {
      title,
      content: message,
      category: 'order',
      createdAt: sentAtStr,
      createdAtTimestamp: now.getTime(),
      isRead: false,
      targetAudience: 'specific',
      targetUserId: accountId,
      sender: employeeName,
      isActive: true,
      actionType: 'order_tracking',
      actionLabel: 'Lihat Pesanan',
      actionTab: 'history',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        accountId,
        accountType,
        notificationType: type,
      },
    });
  } catch (err) {
    console.warn('Could not write to customer inbox:', err);
  }

  // 3. Tambahkan status ke riwayat pengiriman pesanan (deliveryTimeline)
  try {
    const currentTimeline = order.deliveryTimeline || [];
    const updatedTimeline = [
      ...currentTimeline,
      {
        status: title,
        timestamp: sentAtStr,
        courierId: employeeId,
        courierName: employeeName,
        note: message,
      },
    ];

    await updateDoc(doc(db, 'orders', order.id), {
      deliveryTimeline: updatedTimeline,
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    console.warn('Could not update order timeline:', err);
  }

  return notificationLog;
}

/**
 * Validasi Hak Akses Karyawan Pengiriman
 */
export function checkCourierOrderAccess(
  user: {
    uid?: string;
    employeeId?: string;
    email?: string;
    employeeRole?: string;
    position?: string;
  } | null,
  isManager: boolean,
  order: CustomerOrder
): { hasAccess: boolean; reason?: string } {
  if (!user) {
    return { hasAccess: false, reason: 'Pengguna belum login' };
  }

  // Super Admin & Manager memiliki akses menyeluruh untuk supervisi & delegasi
  if (isManager || user.employeeRole === 'SUPER_ADMIN') {
    return { hasAccess: true };
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const orderCourierEmail = (order.assignedCourierEmail || '').toLowerCase().trim();
  const userEmpId = user.employeeId || user.uid;

  // Jika ditugaskan ke karyawan ini
  if (
    (orderCourierEmail && orderCourierEmail === userEmail) ||
    (order.assignedCourierId && (order.assignedCourierId === userEmpId || order.assignedCourierId === user.uid))
  ) {
    return { hasAccess: true };
  }

  // Jika pesanan belum ditugaskan namun berstatus Siap Dikirim di antrean
  if (!order.assignedCourierId && (order.deliveryStatus === 'Siap Dikirim' || !order.deliveryStatus)) {
    return { hasAccess: true };
  }

  return {
    hasAccess: false,
    reason: 'Pesanan ini bukan tugas pengiriman Anda. Akses dibatasi sesuai hak penugasan.',
  };
}
