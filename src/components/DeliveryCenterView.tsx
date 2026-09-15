import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { 
  Truck, 
  Package, 
  MapPin, 
  QrCode, 
  Camera, 
  Image as ImageIcon,
  CheckCircle2, 
  Clock, 
  Phone, 
  User, 
  AlertCircle, 
  ExternalLink, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Eye, 
  ListCheck, 
  Navigation, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  Trash2,
  Send,
  X,
  FileText,
  Compass,
  ArrowUpDown,
  Bell,
  Check,
  Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CustomerOrder, DeliveryActivityLog, DeliveryNotificationType, ShippingLocation } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { DeliveryNotificationModal } from './DeliveryNotificationModal';
import { AdminDeliveryNotificationLogs } from './AdminDeliveryNotificationLogs';
import { 
  findNearestOrders, 
  optimizeDeliverySequence, 
  generateMultiStopGoogleMapsUrl,
  checkCourierOrderAccess,
  formatDistanceDescription,
  getStraightLineGpsDistanceKm,
  estimateRoadDistanceKm
} from '../services/deliveryOptimizationService';
import { SAMPLE_DELIVERY_ORDERS } from '../data/initialOrdersData';
import { DEFAULT_KOPDES_ORIGIN } from '../data/initialShippingData';

export const DeliveryCenterView: React.FC = () => {
  const { user, isStaff, isManager } = useAuth();
  const { shippingConfig } = useCart();

  const kopdesOrigin: ShippingLocation = shippingConfig?.origin || DEFAULT_KOPDES_ORIGIN;

  // Main navigation tab inside Delivery Center
  const [activeTab, setActiveTab] = useState<'nearest' | 'workflow' | 'history' | 'logs'>('nearest');

  // Orders state
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 1. Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number | null>(null); // null: Semua, 0.5, 1, 2, 5
  const [kelurahanFilter, setKelurahanFilter] = useState<string>('Semua');
  const [referenceMode, setReferenceMode] = useState<'KOPDES' | 'ANCHOR' | 'MY_GPS'>('MY_GPS');
  const [anchorOrderId, setAnchorOrderId] = useState<string | null>(null);
  const [myGpsCoords, setMyGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);

  // 2. Route Builder State (#RT-00015)
  const [routeOrders, setRouteOrders] = useState<CustomerOrder[]>([]);
  const [routeNumber, setRouteNumber] = useState<string>('#RT-00015');
  const [routeNotes, setRouteNotes] = useState<string>('');
  const [isRouteActive, setIsRouteActive] = useState<boolean>(false);

  // 3. Modals & Actions
  const [detailOrder, setDetailOrder] = useState<CustomerOrder | null>(null);
  const [activeWorkflowOrder, setActiveWorkflowOrder] = useState<CustomerOrder | null>(null);
  const [workflowStep, setWorkflowStep] = useState<number>(1); // 1: Barcode Scan, 2: Pre-shipment Photo, 3: Navigation, 4: Delivery Proof
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [liveCameraTarget, setLiveCameraTarget] = useState<'preShipment' | 'deliveryProof'>('preShipment');
  const [notificationModalOrder, setNotificationModalOrder] = useState<CustomerOrder | null>(null);

  // Workflow Documentation forms
  const [preShipmentItems, setPreShipmentItems] = useState<Record<string, boolean>>({});
  const [preShipmentPhotoUrl, setPreShipmentPhotoUrl] = useState<string>('');
  const [deliveryProofPhotoUrl, setDeliveryProofPhotoUrl] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [workflowNotes, setWorkflowNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Listen to orders from Firestore with fallback to sample realistic orders
  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const unsub = onSnapshot(
      ordersRef,
      (snap) => {
        if (!snap.empty) {
          const list: CustomerOrder[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomerOrder, 'id'>) });
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list);
        } else {
          setOrders(SAMPLE_DELIVERY_ORDERS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Orders listener error in delivery center, using sample data:', err);
        setOrders(SAMPLE_DELIVERY_ORDERS);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Auto-detect & Continuous Live Courier GPS Tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    setGpsDetecting(true);

    // Initial immediate GPS acquisition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyGpsCoords(coords);
        setGpsDetecting(false);
      },
      (err) => {
        setGpsDetecting(false);
        console.warn('GPS initial detection fallback:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );

    // Continuous watch position as courier moves
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyGpsCoords(coords);
        setGpsDetecting(false);
      },
      (err) => {
        console.warn('GPS watchPosition warning:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Handle Manual Courier Device GPS Refresh
  const handleDetectCourierGps = () => {
    if (!navigator.geolocation) {
      showNotification('Perangkat atau browser tidak mendukung sensor GPS.', 'error');
      return;
    }

    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyGpsCoords(coords);
        setReferenceMode('MY_GPS');
        setGpsDetecting(false);
        showNotification(`📍 GPS Perangkat terdeteksi: (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      },
      (err) => {
        setGpsDetecting(false);
        showNotification(`Gagal membaca GPS: ${err.message}. Menggunakan titik lokasi Kopdes.`, 'error');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Determine current effective reference coordinate
  const currentReferenceCoord = useMemo(() => {
    if (referenceMode === 'ANCHOR' && anchorOrderId) {
      const anchor = orders.find((o) => o.id === anchorOrderId);
      if (anchor?.deliveryCoords) {
        return anchor.deliveryCoords;
      }
    }
    if (referenceMode === 'MY_GPS' && myGpsCoords) {
      return myGpsCoords;
    }
    return { lat: kopdesOrigin.lat, lng: kopdesOrigin.lng };
  }, [referenceMode, anchorOrderId, myGpsCoords, kopdesOrigin, orders]);

  const currentReferenceName = useMemo(() => {
    if (referenceMode === 'ANCHOR' && anchorOrderId) {
      const anchor = orders.find((o) => o.id === anchorOrderId);
      return `📍 Titik Utama: ${anchor?.orderNumber} (${anchor?.customerName})`;
    }
    if (referenceMode === 'MY_GPS') {
      return myGpsCoords
        ? `🧭 GPS Posisi Kurir Saat Ini (${myGpsCoords.lat.toFixed(4)}, ${myGpsCoords.lng.toFixed(4)})`
        : `🧭 GPS Posisi Kurir Saat Ini (Sedang Mengakses Sensor GPS...)`;
    }
    return `🔵 Lokasi Kopdes: ${kopdesOrigin.name || 'Gerai Pusat Sembako'}`;
  }, [referenceMode, anchorOrderId, myGpsCoords, kopdesOrigin, orders]);

  // Security & RBAC Access Check
  const filteredAccessibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const access = checkCourierOrderAccess(user as any, isManager, order);
      return access.hasAccess;
    });
  }, [orders, user, isManager]);

  // Nearest orders list based on reference point
  const nearestOrders = useMemo(() => {
    return findNearestOrders(filteredAccessibleOrders, currentReferenceCoord, {
      searchQuery,
      maxDistanceKm: maxDistanceFilter,
      kelurahanFilter,
    });
  }, [filteredAccessibleOrders, currentReferenceCoord, searchQuery, maxDistanceFilter, kelurahanFilter]);

  // Distinct Kelurahan list for filter dropdown
  const kelurahanList = useMemo(() => {
    const set = new Set<string>();
    filteredAccessibleOrders.forEach((o) => {
      if (o.kelurahan) set.add(o.kelurahan);
    });
    return Array.from(set);
  }, [filteredAccessibleOrders]);

  // Toggle order in route
  const handleToggleRouteOrder = (order: CustomerOrder) => {
    if (routeOrders.some((ro) => ro.id === order.id)) {
      setRouteOrders((prev) => prev.filter((ro) => ro.id !== order.id));
      showNotification(`Pesanan ${order.orderNumber} dikeluarkan dari rute.`);
    } else {
      setRouteOrders((prev) => [...prev, order]);
      showNotification(`➕ Pesanan ${order.orderNumber} ditambahkan ke Rute ${routeNumber}`);
    }
  };

  // Reorder Route: Move Up
  const handleMoveOrderUp = (index: number) => {
    if (index <= 0) return;
    setRouteOrders((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Reorder Route: Move Down
  const handleMoveOrderDown = (index: number) => {
    if (index >= routeOrders.length - 1) return;
    setRouteOrders((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Smart Route Sequence Optimizer (Greedy Nearest Neighbor TSP from Courier Active GPS)
  const handleOptimizeRouteSequence = () => {
    if (routeOrders.length <= 1) {
      showNotification('Tambahkan minimal 2 pesanan untuk menyusun rekomendasi rute efisien!', 'error');
      return;
    }

    const res = optimizeDeliverySequence(
      currentReferenceCoord,
      currentReferenceName,
      routeOrders
    );

    setRouteOrders(res.orderedOrders);
    showNotification(`🧠 Rekomendasi urutan rute berhasil dihitung dari ${currentReferenceName}! Estimasi rute jalan: ${res.estimatedRoadDistanceKm} km.`);
  };

  // Calculate route cumulative distances starting from Courier Active GPS
  const routeCalculations = useMemo(() => {
    if (routeOrders.length === 0) return { totalGps: 0, totalRoad: 0 };
    let totalGps = 0;
    let prevCoord = currentReferenceCoord;

    routeOrders.forEach((o) => {
      const c = o.deliveryCoords || currentReferenceCoord;
      totalGps += getStraightLineGpsDistanceKm(prevCoord, c);
      prevCoord = c;
    });

    const totalRoad = estimateRoadDistanceKm(totalGps);
    return {
      totalGps: Number(totalGps.toFixed(2)),
      totalRoad: Number(totalRoad.toFixed(1)),
    };
  }, [routeOrders, currentReferenceCoord]);

  // Open multi-stop Google Maps Route from Courier Active GPS Location
  const handleOpenGoogleMapsRoute = () => {
    if (routeOrders.length === 0) return;
    const url = generateMultiStopGoogleMapsUrl(currentReferenceCoord, routeOrders, 'motorcycle');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // =========================================================================
  // WORKFLOW: 7 STATUS STEPS
  // =========================================================================
  const handleStartWorkflow = (order: CustomerOrder) => {
    setActiveWorkflowOrder(order);
    setPreShipmentPhotoUrl(order.preShipmentPhotoUrl || '');
    setDeliveryProofPhotoUrl(order.deliveryProofPhotoUrl || '');
    setRecipientName(order.recipientConfirmationName || order.customerName || '');

    const initialCheck: Record<string, boolean> = {};
    order.items.forEach((item, idx) => {
      initialCheck[`${idx}_${item.productId}`] = true;
    });
    setPreShipmentItems(initialCheck);

    // Set step based on current status
    if (
      order.deliveryStatus === 'Ditugaskan' || 
      order.deliveryStatus === 'Pesanan Diambil' || 
      order.deliveryStatus === 'Diambil'
    ) {
      setWorkflowStep(2);
    } else if (order.deliveryStatus === 'Dalam Perjalanan') {
      setWorkflowStep(3);
    } else if (order.deliveryStatus === 'Tiba di Lokasi' || order.deliveryStatus === 'Menunggu Konfirmasi') {
      setWorkflowStep(4);
    } else {
      setWorkflowStep(1); // Barcode scan
    }
  };

  // Step 1: Barcode Scan Success
  const handleBarcodeVerified = async (barcodeVal: string) => {
    if (!activeWorkflowOrder) return;
    try {
      setIsSubmitting(true);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      const currentTimeline = activeWorkflowOrder.deliveryTimeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        {
          status: '📦 Pesanan Diambil (Barcode Diverifikasi)',
          timestamp: nowStr,
          courierId: user?.employeeId || user?.uid,
          courierName: user?.displayName,
          note: `Barcode ${barcodeVal} terverifikasi cocok oleh Kurir ${user?.displayName}. Barang diambil dari gerai.`,
        },
      ];

      await updateDoc(doc(db, 'orders', activeWorkflowOrder.id), {
        deliveryStatus: 'Pesanan Diambil',
        orderStatus: 'Dikirim',
        deliveryBarcode: barcodeVal,
        deliveryTimeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      setActiveWorkflowOrder({
        ...activeWorkflowOrder,
        deliveryStatus: 'Pesanan Diambil',
        orderStatus: 'Dikirim',
        deliveryTimeline: updatedTimeline,
      });

      showNotification('✅ Barcode berhasil diverifikasi! Status diubah ke: "Pesanan Diambil".');
      setWorkflowStep(2);
    } catch (err: any) {
      showNotification(`Gagal update barcode: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Pre-shipment Photo & Start Journey
  const handleSavePreShipment = async () => {
    if (!activeWorkflowOrder) return;
    if (!preShipmentPhotoUrl) {
      showNotification('Ambil / Unggah foto dokumentasi produk sebelum dikirim!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      const currentTimeline = activeWorkflowOrder.deliveryTimeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        {
          status: '🚚 Dalam Perjalanan (Dokumentasi Lengkap)',
          timestamp: nowStr,
          courierId: user?.employeeId,
          courierName: user?.displayName,
          note: `Foto produk sebelum berangkat tersimpan. Kurir memulai pengantaran ke lokasi.`,
        },
      ];

      await updateDoc(doc(db, 'orders', activeWorkflowOrder.id), {
        preShipmentPhotoUrl,
        preShipmentPhotoTimestamp: new Date().toISOString(),
        preShipmentCheckedItems: Object.keys(preShipmentItems).filter((k) => preShipmentItems[k]),
        deliveryStatus: 'Dalam Perjalanan',
        orderStatus: 'Dikirim',
        deliveryTimeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      setActiveWorkflowOrder({
        ...activeWorkflowOrder,
        preShipmentPhotoUrl,
        deliveryStatus: 'Dalam Perjalanan',
        deliveryTimeline: updatedTimeline,
      });

      showNotification('✅ Foto produk tersimpan! Status diubah: "Dalam Perjalanan".');
      setWorkflowStep(3);
    } catch (err: any) {
      showNotification(`Gagal simpan foto: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Arrived at Location
  const handleMarkArrived = async () => {
    if (!activeWorkflowOrder) return;
    try {
      setIsSubmitting(true);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      const currentTimeline = activeWorkflowOrder.deliveryTimeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        {
          status: '📍 Tiba di Lokasi Alamat Pelanggan',
          timestamp: nowStr,
          courierId: user?.employeeId,
          courierName: user?.displayName,
          note: `Kurir telah tiba di titik lokasi alamat penerima. Memproses penyerahan barang.`,
        },
      ];

      await updateDoc(doc(db, 'orders', activeWorkflowOrder.id), {
        deliveryStatus: 'Tiba di Lokasi',
        deliveryTimeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      // If preShipmentPhotoUrl is set but deliveryProofPhotoUrl is empty, sync it
      if (preShipmentPhotoUrl && !deliveryProofPhotoUrl) {
        setDeliveryProofPhotoUrl(preShipmentPhotoUrl);
      }

      setActiveWorkflowOrder({
        ...activeWorkflowOrder,
        deliveryStatus: 'Tiba di Lokasi',
        deliveryTimeline: updatedTimeline,
      });

      showNotification('📍 Status diperbarui: Kurir Tiba di Lokasi.');
      setWorkflowStep(4);
    } catch (err: any) {
      showNotification(`Gagal update status: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Complete Delivery (Can also be triggered from Step 3 / Dalam Perjalanan)
  const handleCompleteDelivery = async () => {
    if (!activeWorkflowOrder) return;

    // Accept either deliveryProofPhotoUrl or preShipmentPhotoUrl
    const effectivePhotoUrl =
      deliveryProofPhotoUrl ||
      preShipmentPhotoUrl ||
      activeWorkflowOrder.deliveryProofPhotoUrl ||
      activeWorkflowOrder.preShipmentPhotoUrl;

    if (!effectivePhotoUrl) {
      showNotification('Unggah foto via Kamera HP atau Galeri HP terlebih dahulu!', 'error');
      return;
    }

    const effectiveRecipient =
      recipientName.trim() ||
      activeWorkflowOrder.recipientConfirmationName ||
      activeWorkflowOrder.customerName ||
      'Pelanggan Kopdes';

    try {
      setIsSubmitting(true);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      const currentTimeline = activeWorkflowOrder.deliveryTimeline || [];
      const updatedTimeline = [...currentTimeline];

      // Auto add '📍 Tiba di Lokasi Alamat Pelanggan' timeline log if completing from 'Dalam Perjalanan' or earlier
      const currentStatus = activeWorkflowOrder.deliveryStatus;
      if (
        currentStatus === 'Dalam Perjalanan' ||
        currentStatus === 'Pesanan Diambil' ||
        currentStatus === 'Ditugaskan' ||
        currentStatus === 'Diambil'
      ) {
        updatedTimeline.push({
          status: '📍 Tiba di Lokasi Alamat Pelanggan',
          timestamp: nowStr,
          courierId: user?.employeeId,
          courierName: user?.displayName,
          note: `Kurir telah tiba di titik lokasi alamat penerima.`,
        });
      }

      updatedTimeline.push({
        status: '✅ Selesai (Diserahkan & Diverifikasi)',
        timestamp: nowStr,
        courierId: user?.employeeId,
        courierName: user?.displayName,
        note: `Pesanan telah sukses diserahkan kepada ${effectiveRecipient}. Foto bukti serah terima terverifikasi.`,
      });

      await updateDoc(doc(db, 'orders', activeWorkflowOrder.id), {
        deliveryProofPhotoUrl: effectivePhotoUrl,
        preShipmentPhotoUrl: activeWorkflowOrder.preShipmentPhotoUrl || effectivePhotoUrl,
        deliveryProofTimestamp: new Date().toISOString(),
        recipientConfirmationName: effectiveRecipient,
        recipientConfirmedAt: new Date().toISOString(),
        deliveryStatus: 'Selesai',
        orderStatus: 'Selesai',
        paymentStatus: 'Lunas',
        deliveryTimeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      // Send automated completion notification to customer
      const accountId =
        activeWorkflowOrder.userId ||
        activeWorkflowOrder.userAccountId ||
        activeWorkflowOrder.customerPhone ||
        'ACC-GUEST';
      try {
        await addDoc(collection(db, 'inbox'), {
          title: `✅ Pesanan ${activeWorkflowOrder.orderNumber} Selesai Diterima!`,
          content: `Halo ${activeWorkflowOrder.customerName}, pesanan sembako Anda (${activeWorkflowOrder.orderNumber}) telah sukses diantarkan dan diterima oleh ${effectiveRecipient} pada ${nowStr}. Terima kasih telah berbelanja di Koperasi Desa Merah Putih!`,
          category: 'order',
          createdAt: nowStr,
          createdAtTimestamp: Date.now(),
          isRead: false,
          targetAudience: 'specific',
          targetUserId: accountId,
          sender: user?.displayName || 'Kurir Kopdes',
          isActive: true,
          actionType: 'order_tracking',
          actionLabel: 'Lihat Pesanan',
          actionTab: 'history',
          metadata: {
            orderId: activeWorkflowOrder.id,
            orderNumber: activeWorkflowOrder.orderNumber,
          },
        });
      } catch {}

      showNotification(`🎉 PESANAN ${activeWorkflowOrder.orderNumber} SUKSES DISELESAIKAN!`);
      setActiveWorkflowOrder(null);
    } catch (err: any) {
      showNotification(`Gagal menyelesaikan pengiriman: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Robust Helper Photo File Handler supporting Kamera HP & Galeri HP
  // Supports file formats: JPG, PNG, IMG, IMAGE, JPEG, WEBP, GIF
  const processPhotoFile = (
    file: File,
    setTargetUrl: (url: string) => void,
    label: string
  ) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showNotification('Ukuran foto terlalu besar (Maksimal 10MB)!', 'error');
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|img|image)$/i.test(fileNameLower);

    if (!isImage) {
      showNotification('Format file tidak valid! Gunakan format foto JPG, PNG, IMG, IMAGE, atau JPEG.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setTargetUrl(res);
        showNotification(`✅ Foto ${label} berhasil diproses!`);
      }
    };
    reader.onerror = () => {
      showNotification('Gagal membaca file foto. Coba pilih file lain.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Open single order Google Maps Navigation starting from Courier's Active GPS Location
  const openSingleOrderMap = (order: CustomerOrder) => {
    let mapsUrl = '';
    const originToUse = currentReferenceCoord;
    if (order.deliveryCoords) {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originToUse.lat},${originToUse.lng}&destination=${order.deliveryCoords.lat},${order.deliveryCoords.lng}&travelmode=two_wheeler&avoid=tolls`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shippingAddress)}`;
    }
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isStaff) {
    return (
      <div className="py-16 px-4 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-700 flex items-center justify-center mx-auto text-2xl font-black shadow-inner border border-red-200">
          <Truck className="w-8 h-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900">
            Akses Khusus Karyawan Pengiriman
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Halaman Pusat Pengiriman ini khusus diakses oleh akun Karyawan Pengiriman (Kurir) atau Pengelola Koperasi Desa. Silakan masuk menggunakan akun karyawan resmi Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* 🚚 HEADER BANNER */}
      <div className="bg-gradient-to-r from-red-800 via-rose-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-red-200">
            <Truck className="w-4 h-4 text-red-300" />
            <span>Pusat Pengiriman Karyawan Berbasis GPS & Notifikasi</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>🚚 Logistik & Rute Pengiriman Pintar</span>
          </h2>
          <p className="text-xs sm:text-sm text-red-100 flex flex-wrap items-center gap-2">
            <span>Karyawan: <strong>{user?.displayName}</strong> ({user?.email})</span>
            <span>• ID: <strong className="font-mono bg-white/20 px-2 py-0.5 rounded">{user?.employeeId || 'KMP-EMP-002'}</strong></span>
            {isManager && <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded">Akses Penuh Pengelola</span>}
          </p>
        </div>

        {/* Quick Stats on Banner */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-2xl border border-white/20 text-center">
            <span className="text-[11px] text-red-200 block font-medium">Tugas Sesuai Akses:</span>
            <span className="text-2xl font-black text-white">{filteredAccessibleOrders.length} Pesanan</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-2xl border border-white/20 text-center">
            <span className="text-[11px] text-red-200 block font-medium">Dalam Rute Aktif:</span>
            <span className="text-2xl font-black text-emerald-300">{routeOrders.length} Pesanan</span>
          </div>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 🧭 NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('nearest')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'nearest'
              ? 'bg-white text-red-800 shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>1. 🔎 Cari Pesanan Terdekat ({nearestOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-white text-red-800 shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>2. 📦 Proses Pengiriman & Scan Barcode</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-red-800 shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>3. ✅ Riwayat Selesai</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-red-800 shadow-xs scale-102'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>4. 📊 Log Pemberitahuan Admin</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: 🔎 PENCARIAN PESANAN TERDEKAT BERBASIS GPS
          ========================================================================= */}
      {activeTab === 'nearest' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Reference Anchor Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border border-blue-200 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Titik Acuan Perhitungan Jarak Terdekat:
              </span>
              <p className="text-sm font-black text-slate-900">
                {currentReferenceName}
              </p>
              <p className="text-xs text-slate-600">
                Koordinat: {currentReferenceCoord.lat.toFixed(5)}, {currentReferenceCoord.lng.toFixed(5)}
              </p>
            </div>

            {/* Selector Modes */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setReferenceMode('KOPDES');
                  setAnchorOrderId(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referenceMode === 'KOPDES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🔵 Dari Gerai Kopdes
              </button>

              <button
                onClick={handleDetectCourierGps}
                disabled={gpsDetecting}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  referenceMode === 'MY_GPS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{gpsDetecting ? 'Mencari...' : '🧭 Dari GPS Saya'}</span>
              </button>

              {anchorOrderId && (
                <button
                  onClick={() => {
                    setAnchorOrderId(null);
                    setReferenceMode('KOPDES');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer"
                >
                  ✕ Lepas Titik Utama
                </button>
              )}
            </div>
          </div>

          {/* Search & Radius Filter Panel */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search text */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari alamat, area (Kapuk, Cengkareng, Rawa Buaya), nama pelanggan, nomor pesanan..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              {/* Kelurahan dropdown */}
              <div className="w-full md:w-56">
                <select
                  value={kelurahanFilter}
                  onChange={(e) => setKelurahanFilter(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
                >
                  <option value="Semua">Kelurahan: Semua Area</option>
                  {kelurahanList.map((kel) => (
                    <option key={kel} value={kel}>
                      📍 {kel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Radius Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-black text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter Jarak Radius:
              </span>
              {[
                { label: 'Semua Jarak', value: null },
                { label: '≤ 500 meter', value: 0.5 },
                { label: '≤ 1 km', value: 1.0 },
                { label: '≤ 2 km', value: 2.0 },
                { label: '≤ 5 km', value: 5.0 },
              ].map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => setMaxDistanceFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    maxDistanceFilter === pill.value
                      ? 'bg-red-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <span className="ml-auto text-xs font-bold text-slate-400">
                Ditemukan: <strong className="text-slate-800">{nearestOrders.length}</strong> pesanan aktif
              </span>
            </div>
          </div>

          {/* List of Nearest Orders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearestOrders.map((order) => {
              const isAnchor = anchorOrderId === order.id;
              const isInRoute = routeOrders.some((ro) => ro.id === order.id);
              const routeIdx = routeOrders.findIndex((ro) => ro.id === order.id);
              const distDesc = formatDistanceDescription(order.distanceGpsKm);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs transition-all ${
                    isAnchor
                      ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/20'
                      : isInRoute
                      ? 'border-emerald-300 ring-2 ring-emerald-200/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {order.orderNumber}
                          </span>
                          {isInRoute && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              Rute #{routeIdx + 1}
                            </span>
                          )}
                          {isAnchor && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                              ★ Titik Utama
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{order.formattedDate || 'Hari ini'}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          order.customerRole === 'ANGGOTA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {order.customerRole === 'ANGGOTA' ? '👥 Anggota' : '👤 Basic'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {order.deliveryStatus || 'Siap Dikirim'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <strong className="text-slate-900">{order.customerName}</strong>
                        <span className="text-slate-500 font-mono text-[11px]">{order.customerPhone}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                        📍 {order.shippingAddress}
                      </p>
                      {order.kelurahan && (
                        <p className="text-[11px] text-slate-500">
                          Kel. <strong>{order.kelurahan}</strong>, Kec. {order.kecamatan || 'Cengkareng'} (RT {order.rt || '-'} / RW {order.rw || '-'})
                        </p>
                      )}
                      {order.landmarkNotes && (
                        <p className="text-[11px] text-amber-800 font-semibold">
                          🏢 Patokan: {order.landmarkNotes}
                        </p>
                      )}
                      {order.customerNotes && (
                        <p className="text-[11px] text-slate-500 italic">
                          Catatan: "{order.customerNotes}"
                        </p>
                      )}
                    </div>

                    {/* GPS Distance Metrics */}
                    <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Jarak Garis Lurus:</span>
                        <strong className="text-blue-900 font-bold">{distDesc.gpsText}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Estimasi Rute Jalan:</span>
                        <strong className="text-indigo-900 font-bold">{distDesc.roadEstText}</strong>
                      </div>
                      {order.deliveryCoords && (
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          GPS: {order.deliveryCoords.lat.toFixed(5)}, {order.deliveryCoords.lng.toFixed(5)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Set as Anchor */}
                      <button
                        onClick={() => {
                          setAnchorOrderId(order.id);
                          setReferenceMode('ANCHOR');
                          showNotification(`📍 Pesanan ${order.orderNumber} dijadikan Titik Utama pencarian.`);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          isAnchor
                            ? 'bg-amber-500 text-white'
                            : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-300'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isAnchor ? 'Titik Utama' : 'Jadikan Titik Utama'}</span>
                      </button>

                      {/* Add/Remove from Route */}
                      <button
                        onClick={() => handleToggleRouteOrder(order)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          isInRoute
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{isInRoute ? 'Lepas Rute' : '➕ Ke Rute'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Send Customer Notification */}
                      <button
                        onClick={() => setNotificationModalOrder(order)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <span>Notifikasi</span>
                      </button>

                      {/* Start Workflow */}
                      <button
                        onClick={() => {
                          handleStartWorkflow(order);
                          setActiveTab('workflow');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Proses Kirim</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {nearestOrders.length === 0 && (
            <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center p-6 space-y-3">
              <Compass className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Tidak ada pesanan yang sesuai kriteria pencarian.</p>
              <p className="text-xs text-slate-500">Coba ubah filter radius jarak atau hapus kata kunci pencarian area.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: 📦 PROSES PENGIRIMAN & WORKFLOW 7 TAHAP
          ========================================================================= */}
      {activeTab === 'workflow' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Active Workflow Process Panel */}
          {activeWorkflowOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Alur Proses Pengiriman: {activeWorkflowOrder.orderNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Penerima: <strong>{activeWorkflowOrder.customerName}</strong> • {activeWorkflowOrder.shippingAddress}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveWorkflowOrder(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Tutup Alur
                </button>
              </div>

              {/* 7-Step Horizontal Breadcrumb */}
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center gap-1 min-w-[680px] text-xs font-bold">
                  {[
                    { num: 1, label: 'Siap Dikirim' },
                    { num: 2, label: 'Ditugaskan' },
                    { num: 3, label: 'Diambil (Scan)' },
                    { num: 4, label: 'Dalam Perjalanan' },
                    { num: 5, label: 'Tiba di Lokasi' },
                    { num: 6, label: 'Konfirmasi Penerima' },
                    { num: 7, label: 'Selesai' },
                  ].map((step, idx) => (
                    <React.Fragment key={step.label}>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                        workflowStep >= idx + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                          {step.num}
                        </span>
                        <span>{step.label}</span>
                      </div>
                      {idx < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step Content Area */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                
                {/* STEP 1: SCAN BARCODE */}
                {workflowStep === 1 && (
                  <div className="space-y-4 max-w-lg mx-auto text-center py-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                      <QrCode className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Langkah 1: Verifikasi Barcode Fisik Paket
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Pindai barcode pada kardus / paket sebelum dikeluarkan dari gerai sembako Kopdes.
                      </p>
                    </div>

                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setIsScannerOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Buka Kamera Scan Barcode</span>
                      </button>

                      <button
                        onClick={() => handleBarcodeVerified(activeWorkflowOrder.deliveryBarcode || activeWorkflowOrder.orderNumber)}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        Verifikasi Manual ({activeWorkflowOrder.orderNumber})
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: PRE-SHIPMENT PHOTO */}
                {workflowStep === 2 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <Camera className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        Langkah 2: Dokumentasi Foto Produk Sebelum Berangkat
                      </h4>
                      <p className="text-xs text-slate-500">
                        Ambil foto kondisi paket sembako dan checklist kelengkapan barang.
                      </p>
                    </div>

                    {/* Items Checklist */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-black text-slate-700 uppercase">
                        Checklist Produk Pesanan:
                      </span>
                      {activeWorkflowOrder.items.map((item, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preShipmentItems[`${idx}_${item.productId}`] || false}
                            onChange={(e) =>
                              setPreShipmentItems((prev) => ({
                                ...prev,
                                [`${idx}_${item.productId}`]: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600"
                          />
                          <span>
                            <strong>{item.quantity}x</strong> {item.name} ({item.selectedVariation || 'Standar'})
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Photo Upload Options (Kamera HP vs Galeri HP) */}
                    <div className="space-y-3">
                      {preShipmentPhotoUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 max-h-56 shadow-md bg-slate-900">
                          <img src={preShipmentPhotoUrl} alt="Dokumentasi Produk Sebelum Kirim" className="w-full h-56 object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end justify-between p-3.5">
                            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                              <span>Foto Produk Tersimpan</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreShipmentPhotoUrl('')}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus / Ganti Foto</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-blue-600" />
                              Pilih Opsi Foto Produk (Ditugaskan)
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              JPG, PNG, IMG, IMAGE, JPEG
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium">
                            Ambil foto barang sembako menggunakan kamera HP secara langsung atau unggah foto dari galeri HP:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* OPTS 1: KAMERA HP */}
                            <label className="p-3.5 rounded-2xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/60 hover:bg-blue-50 flex items-center gap-3 cursor-pointer transition-all group">
                              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <Camera className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-blue-950 block">Foto via Kamera HP</span>
                                <span className="text-[10px] text-blue-700 block font-medium">Buka kamera HP langsung</span>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                capture="environment"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processPhotoFile(file, setPreShipmentPhotoUrl, 'Sebelum Kirim');
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>

                            {/* OPTS 2: GALERI HP */}
                            <label className="p-3.5 rounded-2xl border-2 border-purple-200 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-50 flex items-center gap-3 cursor-pointer transition-all group">
                              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-purple-950 block">Unggah dari Galeri HP</span>
                                <span className="text-[10px] text-purple-700 block font-medium">Pilih gambar dari galeri HP</span>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processPhotoFile(file, setPreShipmentPhotoUrl, 'Sebelum Kirim');
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="pt-2 text-center border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setLiveCameraTarget('preShipment');
                                setIsLiveCameraOpen(true);
                              }}
                              className="text-[11px] font-bold text-slate-600 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer py-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Atau Buka Mode Kamera Live Layar (Web Realtime Video)</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={handleSavePreShipment}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Mulai Pengantaran (Dalam Perjalanan)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: NAVIGATION, PHOTO & COMPLETE DELIVERY */}
                {workflowStep === 3 && (
                  <div className="space-y-4 max-w-lg mx-auto py-2">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                        <Navigation className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        Langkah 3: Kurir Sedang Dalam Perjalanan
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Menuju alamat: <strong>{activeWorkflowOrder.shippingAddress}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openSingleOrderMap(activeWorkflowOrder)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Navigasi Google Maps Sepeda Motor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotificationModalOrder(activeWorkflowOrder)}
                        className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Kirim Info "Hampir Tiba"</span>
                      </button>
                    </div>

                    {/* Recipient Name Field */}
                    <div className="text-left space-y-1 pt-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Nama Penerima Barang (Opsional / Default Pelanggan):
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder={`Nama penerima (default: ${activeWorkflowOrder.customerName})...`}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                      />
                    </div>

                    {/* Photo Upload Options (Kamera HP vs Galeri HP) */}
                    <div className="space-y-3 text-left">
                      {deliveryProofPhotoUrl || preShipmentPhotoUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 max-h-56 shadow-md bg-slate-900">
                          <img
                            src={deliveryProofPhotoUrl || preShipmentPhotoUrl}
                            alt="Foto Pengiriman Dalam Perjalanan"
                            className="w-full h-56 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end justify-between p-3.5">
                            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                              <span>Foto Pengiriman Siap</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryProofPhotoUrl('');
                                setPreShipmentPhotoUrl('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus / Ganti Foto</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-emerald-600" />
                              Unggah Foto Penyerahan / Bukti Pengiriman
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              JPG, PNG, IMG, IMAGE, JPEG
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium">
                            Ambil foto penyerahan barang di lokasi menggunakan kamera HP atau unggah dari galeri HP:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* OPTS 1: KAMERA HP */}
                            <label className="p-3 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50/60 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer transition-all group">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <Camera className="w-4.5 h-4.5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-emerald-950 block">Foto via Kamera HP</span>
                                <span className="text-[10px] text-emerald-700 block font-medium">Buka kamera HP</span>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                capture="environment"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processPhotoFile(file, setDeliveryProofPhotoUrl, 'Bukti Penyerahan');
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>

                            {/* OPTS 2: GALERI HP */}
                            <label className="p-3 rounded-2xl border-2 border-purple-200 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer transition-all group">
                              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <ImageIcon className="w-4.5 h-4.5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-purple-950 block">Unggah dari Galeri HP</span>
                                <span className="text-[10px] text-purple-700 block font-medium">Pilih gambar galeri</span>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processPhotoFile(file, setDeliveryProofPhotoUrl, 'Bukti Penyerahan');
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="pt-1.5 text-center border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setLiveCameraTarget('deliveryProof');
                                setIsLiveCameraOpen(true);
                              }}
                              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer py-0.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Atau Buka Mode Kamera Live Layar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleMarkArrived}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>📍 Konfirmasi Tiba di Lokasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCompleteDelivery}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ Selesaikan Pesanan & Kirim Bukti</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: RECIPIENT HAND-OFF & PROOF PHOTO */}
                {workflowStep === 4 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        Langkah 4: Konfirmasi Penerima & Bukti Penyerahan
                      </h4>
                      <p className="text-xs text-slate-500">
                        Serahkan barang ke pelanggan dan dokumentasikan foto serah terima.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nama Penerima Paket:
                        </label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Nama lengkap penerima barang..."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>

                      {/* Photo Upload Options (Kamera HP vs Galeri HP) */}
                      <div className="space-y-3">
                        {deliveryProofPhotoUrl ? (
                          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 max-h-56 shadow-md bg-slate-900">
                            <img src={deliveryProofPhotoUrl} alt="Bukti Serah Terima Paket" className="w-full h-56 object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end justify-between p-3.5">
                              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                                <span>Foto Bukti Penyerahan Tersimpan</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeliveryProofPhotoUrl('')}
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus / Ganti Foto</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                <Camera className="w-4 h-4 text-emerald-600" />
                                Pilih Opsi Foto Bukti Penyerahan Paket
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                JPG, PNG, IMG, IMAGE, JPEG
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium">
                              Ambil foto bukti serah terima paket menggunakan kamera HP secara langsung atau unggah foto dari galeri HP:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* OPTS 1: KAMERA HP */}
                              <label className="p-3.5 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50/60 hover:bg-emerald-50 flex items-center gap-3 cursor-pointer transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-xs font-black text-emerald-950 block">Foto via Kamera HP</span>
                                  <span className="text-[10px] text-emerald-700 block font-medium">Ambil foto penerima/paket via HP</span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) processPhotoFile(file, setDeliveryProofPhotoUrl, 'Bukti Serah Terima');
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {/* OPTS 2: GALERI HP */}
                              <label className="p-3.5 rounded-2xl border-2 border-purple-200 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-50 flex items-center gap-3 cursor-pointer transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-xs font-black text-purple-950 block">Unggah dari Galeri HP</span>
                                  <span className="text-[10px] text-purple-700 block font-medium">Pilih gambar bukti dari galeri HP</span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,.jpg,.jpeg,.png,.img,.image,image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) processPhotoFile(file, setDeliveryProofPhotoUrl, 'Bukti Serah Terima');
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            <div className="pt-2 text-center border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setLiveCameraTarget('deliveryProof');
                                  setIsLiveCameraOpen(true);
                                }}
                                className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 inline-flex items-center gap-1.5 cursor-pointer py-1"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Atau Buka Mode Kamera Live Layar (Web Realtime Video)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={handleCompleteDelivery}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesaikan Pesanan & Kirim Bukti</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Choose active order to start workflow */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pilih Pesanan untuk Diproses Kirim
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik salah satu pesanan aktif di bawah ini untuk memulai tahapan verifikasi barcode & dokumentasi
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAccessibleOrders.filter((o) => o.orderStatus !== 'Selesai').map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleStartWorkflow(o)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-xs">{o.orderNumber}</span>
                        <strong className="text-xs text-slate-800">{o.customerName}</strong>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">📍 {o.shippingAddress}</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Status: {o.deliveryStatus || 'Siap Dikirim'}
                      </span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: ✅ RIWAYAT PENGIRIMAN SELESAI
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Riwayat Pengiriman Selesai</h3>
              <p className="text-xs text-slate-500">Daftar paket yang telah sukses diserahkan kepada pelanggan</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.filter((o) => o.orderStatus === 'Selesai').map((o) => (
              <div key={o.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-xs">{o.orderNumber}</span>
                    <strong className="text-xs text-slate-800">{o.customerName}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ✅ Selesai Diterima
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">📍 {o.shippingAddress}</p>
                  <p className="text-[11px] text-slate-500">
                    Penerima: <strong>{o.recipientConfirmationName || o.customerName}</strong>
                    {o.recipientConfirmedAt && ` • ${new Date(o.recipientConfirmedAt).toLocaleString('id-ID')}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {o.deliveryProofPhotoUrl && (
                    <button
                      onClick={() => setDetailOrder(o)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Foto Bukti</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: 📊 LOG PEMBERITAHUAN ADMIN
          ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="animate-fade-in">
          <AdminDeliveryNotificationLogs />
        </div>
      )}

      {/* MODAL SCANNER BARCODE */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(val) => {
            setIsScannerOpen(false);
            handleBarcodeVerified(val);
          }}
          expectedBarcode={activeWorkflowOrder?.deliveryBarcode || activeWorkflowOrder?.orderNumber}
        />
      )}

      {/* MODAL NOTIFIKASI PELANGGAN REAL-TIME */}
      {notificationModalOrder && (
        <DeliveryNotificationModal
          isOpen={Boolean(notificationModalOrder)}
          onClose={() => setNotificationModalOrder(null)}
          order={notificationModalOrder}
          employeeId={user?.employeeId || 'KMP-EMP-002'}
          employeeName={user?.displayName || 'Kurir Kopdes'}
          onNotificationSent={(type, msg) => {
            showNotification(`🔔 Notifikasi berhasil dikirim ke akun ${notificationModalOrder.customerRole === 'ANGGOTA' ? 'Anggota' : 'Basic'} pelanggan!`);
          }}
        />
      )}

      {/* MODAL DETAIL PESANAN & FOTO BUKTI */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900">
                Detail Bukti Penyerahan: {detailOrder.orderNumber}
              </h4>
              <button
                onClick={() => setDetailOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {detailOrder.deliveryProofPhotoUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <img src={detailOrder.deliveryProofPhotoUrl} alt="Bukti Penyerahan" className="w-full max-h-64 object-cover" />
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p>Penerima: <strong>{detailOrder.recipientConfirmationName || detailOrder.customerName}</strong></p>
                <p>Alamat: {detailOrder.shippingAddress}</p>
                <p>Status Pembayaran: <strong className="text-emerald-700">{detailOrder.paymentStatus}</strong></p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KAMERA LANGSUNG WEB REALTIME */}
      {isLiveCameraOpen && (
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={(dataUrl) => {
            if (liveCameraTarget === 'preShipment') {
              setPreShipmentPhotoUrl(dataUrl);
              showNotification('✅ Foto dokumentasi sebelum kirim berhasil diambil dari kamera!');
            } else {
              setDeliveryProofPhotoUrl(dataUrl);
              showNotification('✅ Foto bukti penyerahan berhasil diambil dari kamera!');
            }
          }}
          title={
            liveCameraTarget === 'preShipment'
              ? 'Kamera Foto Produk Sebelum Kirim'
              : 'Kamera Foto Bukti Penyerahan Paket'
          }
        />
      )}
    </div>
  );
};

/* =========================================================================
   LIVE WEBCAM / CAMERA MODAL FOR DELIVERY PHOTOS
   ========================================================================= */
interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto via Kamera Device',
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Live camera access error:', err);
      setCameraError('Kamera langsung web tidak dapat dibuka. Gunakan tombol "Foto via Kamera HP" atau "Unggah dari Galeri HP".');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>{title}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cameraError ? (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-xs font-bold text-red-900">{cameraError}</p>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
            <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Balik Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          {!cameraError && (
            <button
              type="button"
              onClick={handleTakePhoto}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil Foto Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
