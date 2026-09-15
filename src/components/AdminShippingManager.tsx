import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Truck, 
  Ticket, 
  Settings, 
  Compass, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Search, 
  ShieldCheck, 
  Users, 
  Clock, 
  Calculator, 
  DollarSign, 
  Check, 
  X,
  Sparkles,
  Info,
  Bell
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ShippingLocation, ShippingConfig, ShippingVoucher } from '../types';
import { 
  reverseGeocodeAddress, 
  calculateRoadRouteDistance, 
  getGoogleMapsDirectionsUrl,
  searchAddressAutocomplete,
  POPULAR_DESTINATION_PRESETS,
  roundRouteDistanceKm
} from '../services/shippingService';
import { DEFAULT_KOPDES_ORIGIN, DEFAULT_SHIPPING_CONFIG } from '../data/initialShippingData';
import { DeliveryCenterView } from './DeliveryCenterView';
import { AdminDeliveryNotificationLogs } from './AdminDeliveryNotificationLogs';

export const AdminShippingManager: React.FC = () => {
  const { 
    shippingConfig, 
    updateShippingConfig, 
    shippingVouchers, 
    updateShippingVouchers 
  } = useCart();

  // Active inner tab: 'origin' | 'pricing' | 'vouchers' | 'simulation' | 'deliveryCenter' | 'notificationLogs'
  const [activeTab, setActiveTab] = useState<'origin' | 'pricing' | 'vouchers' | 'simulation' | 'deliveryCenter' | 'notificationLogs'>('origin');

  // ========================================================
  // 1. STATE TITIK ASAL KOPDES
  // ========================================================
  const [originForm, setOriginForm] = useState<ShippingLocation>(() => shippingConfig.origin || DEFAULT_KOPDES_ORIGIN);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveOriginStatus, setSaveOriginStatus] = useState<string | null>(null);

  useEffect(() => {
    if (shippingConfig.origin) {
      setOriginForm(shippingConfig.origin);
    }
  }, [shippingConfig.origin]);

  // Handle GPS Device Geolocation for Kopdes
  const handleUseAdminGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage({
        type: 'error',
        text: 'Perangkat atau browser Anda tidak mendukung akses sensor GPS.',
      });
      return;
    }

    setGpsLoading(true);
    setGpsMessage(null);

    const onGeoSuccess = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setGpsMessage({
        type: 'success',
        text: `📍 GPS berhasil diizinkan! Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)}) terdeteksi. Mengambil rincian alamat...`,
      });

      try {
        const geoResult = await reverseGeocodeAddress(lat, lng);
        setOriginForm({
          name: originForm.name || 'Koperasi Desa Cengkareng Timur (Gerai Sembako)',
          address: geoResult.address,
          lat,
          lng,
          street: geoResult.street || originForm.street || '',
          rt: geoResult.rt || originForm.rt || '',
          rw: geoResult.rw || originForm.rw || '',
          kelurahan: geoResult.kelurahan || originForm.kelurahan || '',
          kecamatan: geoResult.kecamatan || originForm.kecamatan || '',
          city: geoResult.city || originForm.city || 'Jakarta Barat',
          province: geoResult.province || originForm.province || 'DKI Jakarta',
          postalCode: geoResult.postalCode || originForm.postalCode || '',
          landmark: geoResult.landmark || originForm.landmark || '',
          notes: originForm.notes || 'Titik pusat gerai sembako resmi Kopdes',
        });

        setGpsMessage({
          type: 'success',
          text: `✅ Alamat titik asal Kopdes berhasil diperbarui otomatis dari GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}). Silakan periksa rincian di bawah lalu klik Simpan.`,
        });
      } catch {
        setOriginForm((prev) => ({
          ...prev,
          lat,
          lng,
          address: `Koordinat GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        }));
      } finally {
        setGpsLoading(false);
      }
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsMessage({
          type: 'error',
          text: 'Izin akses GPS ditolak. Silakan klik tombol "Izinkan" pada jendela izin lokasi peramban Anda.',
        });
      } else {
        setGpsMessage({
          type: 'error',
          text: 'Gagal mengambil data sensor GPS perangkat saat ini. Anda dapat memasukkan koordinat atau alamat secara manual.',
        });
      }
    };

    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      onGeoError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveOrigin = async () => {
    const updatedConfig: ShippingConfig = {
      ...shippingConfig,
      origin: {
        ...originForm,
        name: originForm.name.trim() || 'Koperasi Desa Cengkareng Timur (Gerai Sembako)',
        address: originForm.address.trim() || 'Jalan Kayu Besar, Cengkareng Timur, Jakarta Barat',
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin Koperasi',
    };

    await updateShippingConfig(updatedConfig);
    setSaveOriginStatus('✅ Titik asal pengiriman Kopdes berhasil disimpan dan menjadi acuan utama!');
    setTimeout(() => setSaveOriginStatus(null), 5000);
  };

  const handleResetOriginToDefault = () => {
    if (confirm('Kembalikan titik asal Kopdes ke lokasi default (Cengkareng Timur)?')) {
      setOriginForm(DEFAULT_KOPDES_ORIGIN);
    }
  };

  // ========================================================
  // 2. STATE PENGATURAN TARIF & LAYANAN ONGKOS KIRIM
  // ========================================================
  const [ratePerKmInput, setRatePerKmInput] = useState<number>(shippingConfig.ratePerKm || 5000);
  const [minShippingFeeInput, setMinShippingFeeInput] = useState<number>(shippingConfig.minShippingFee || 5000);
  const [isDeliveryActiveInput, setIsDeliveryActiveInput] = useState<boolean>(shippingConfig.isDeliveryActive ?? true);
  const [vehicleTypeInput, setVehicleTypeInput] = useState<'motorcycle' | 'car'>(shippingConfig.vehicleType || 'motorcycle');
  const [avoidTollsInput, setAvoidTollsInput] = useState<boolean>(shippingConfig.avoidTolls !== false);
  const [memberDiscountPerKmInput, setMemberDiscountPerKmInput] = useState<number>(shippingConfig.memberDiscountPerKm || 0);
  const [savePricingStatus, setSavePricingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (shippingConfig) {
      setRatePerKmInput(shippingConfig.ratePerKm || 5000);
      setMinShippingFeeInput(shippingConfig.minShippingFee || 5000);
      setIsDeliveryActiveInput(shippingConfig.isDeliveryActive ?? true);
      setVehicleTypeInput(shippingConfig.vehicleType || 'motorcycle');
      setAvoidTollsInput(shippingConfig.avoidTolls !== false);
      setMemberDiscountPerKmInput(shippingConfig.memberDiscountPerKm || 0);
    }
  }, [shippingConfig]);

  // Simulasi Tarif Live (Aturan: desimal <= 0,5 dibulatkan ke bawah; desimal > 0,5 dibulatkan ke atas)
  const [simKm, setSimKm] = useState<number>(3.5);
  const simBilledKm = roundRouteDistanceKm(simKm);
  const simRawFee = Math.max(simBilledKm * ratePerKmInput, minShippingFeeInput);
  const simMemberFee = Math.max(0, simRawFee - (simBilledKm * memberDiscountPerKmInput));

  const handleSavePricing = async () => {
    const updatedConfig: ShippingConfig = {
      ...shippingConfig,
      ratePerKm: Math.max(0, ratePerKmInput),
      minShippingFee: Math.max(0, minShippingFeeInput),
      isDeliveryActive: isDeliveryActiveInput,
      vehicleType: vehicleTypeInput,
      avoidTolls: avoidTollsInput,
      memberDiscountPerKm: Math.max(0, memberDiscountPerKmInput),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin Koperasi',
    };

    await updateShippingConfig(updatedConfig);
    setSavePricingStatus('✅ Pengaturan rute armada & biaya ongkir berhasil diperbarui!');
    setTimeout(() => setSavePricingStatus(null), 4000);
  };

  // ========================================================
  // 3. STATE KELOLA VOUCHER ONGKOS KIRIM
  // ========================================================
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [voucherForm, setVoucherForm] = useState<{
    code: string;
    name: string;
    minDistanceKm: number;
    discountAmount: number;
    totalQuota: number;
    expiryDate: string;
    targetAudience: 'all' | 'member' | 'visitor';
    isActive: boolean;
  }>({
    code: '',
    name: '',
    minDistanceKm: 3,
    discountAmount: 10000,
    totalQuota: 100,
    expiryDate: '2026-12-31',
    targetAudience: 'all',
    isActive: true,
  });
  const [voucherFeedback, setVoucherFeedback] = useState<string | null>(null);

  const handleResetVoucherForm = () => {
    setEditingVoucherId(null);
    setVoucherForm({
      code: '',
      name: '',
      minDistanceKm: 3,
      discountAmount: 10000,
      totalQuota: 100,
      expiryDate: '2026-12-31',
      targetAudience: 'all',
      isActive: true,
    });
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherForm.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      alert('Kode voucher tidak boleh kosong.');
      return;
    }

    if (voucherForm.discountAmount <= 0) {
      alert('Nominal potongan voucher harus lebih dari Rp 0.');
      return;
    }

    if (voucherForm.totalQuota <= 0) {
      alert('Jumlah voucher/kuota harus minimal 1.');
      return;
    }

    if (editingVoucherId) {
      // Update existing
      const updated = shippingVouchers.map((v) => {
        if (v.id === editingVoucherId) {
          return {
            ...v,
            code: cleanCode,
            name: voucherForm.name.trim() || `Potongan Ongkir Rp${voucherForm.discountAmount.toLocaleString('id-ID')}`,
            minDistanceKm: Math.max(0, voucherForm.minDistanceKm),
            discountAmount: Math.max(0, voucherForm.discountAmount),
            totalQuota: Math.max(v.usedCount || 0, voucherForm.totalQuota),
            expiryDate: voucherForm.expiryDate,
            targetAudience: voucherForm.targetAudience,
            isActive: voucherForm.isActive,
            updatedAt: new Date().toISOString(),
          };
        }
        return v;
      });
      await updateShippingVouchers(updated);
      setVoucherFeedback(`✅ Voucher ongkir "${cleanCode}" berhasil diperbarui!`);
    } else {
      // Cek duplikasi kode
      const exists = shippingVouchers.some((v) => v.code.toUpperCase() === cleanCode);
      if (exists) {
        alert(`Kode voucher "${cleanCode}" sudah ada. Silakan gunakan kode lain.`);
        return;
      }

      const newVoucher: ShippingVoucher = {
        id: `sv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: cleanCode,
        name: voucherForm.name.trim() || `Potongan Ongkir Rp${voucherForm.discountAmount.toLocaleString('id-ID')}`,
        minDistanceKm: Math.max(0, voucherForm.minDistanceKm),
        discountAmount: Math.max(0, voucherForm.discountAmount),
        totalQuota: Math.max(1, voucherForm.totalQuota),
        usedCount: 0,
        expiryDate: voucherForm.expiryDate,
        targetAudience: voucherForm.targetAudience,
        isActive: voucherForm.isActive,
        createdAt: new Date().toISOString(),
      };

      await updateShippingVouchers([newVoucher, ...shippingVouchers]);
      setVoucherFeedback(`🎉 Voucher ongkir "${cleanCode}" berhasil ditambahkan!`);
    }

    handleResetVoucherForm();
    setTimeout(() => setVoucherFeedback(null), 4000);
  };

  const handleEditVoucher = (v: ShippingVoucher) => {
    setEditingVoucherId(v.id);
    setVoucherForm({
      code: v.code,
      name: v.name,
      minDistanceKm: v.minDistanceKm,
      discountAmount: v.discountAmount,
      totalQuota: v.totalQuota,
      expiryDate: v.expiryDate || '2026-12-31',
      targetAudience: v.targetAudience || 'all',
      isActive: v.isActive,
    });
    // scroll to form if needed
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleDeleteVoucher = async (id: string, code: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus voucher ongkir "${code}"?`)) {
      const next = shippingVouchers.filter((v) => v.id !== id);
      await updateShippingVouchers(next);
      setVoucherFeedback(`🗑️ Voucher "${code}" berhasil dihapus.`);
      setTimeout(() => setVoucherFeedback(null), 3000);
    }
  };

  const handleToggleVoucherActive = async (id: string) => {
    const next = shippingVouchers.map((v) => {
      if (v.id === id) {
        return { ...v, isActive: !v.isActive, updatedAt: new Date().toISOString() };
      }
      return v;
    });
    await updateShippingVouchers(next);
  };

  const handleAddQuota = async (id: string, additional: number) => {
    const next = shippingVouchers.map((v) => {
      if (v.id === id) {
        const newTotal = v.totalQuota + additional;
        return {
          ...v,
          totalQuota: newTotal,
          isActive: newTotal > (v.usedCount || 0) ? true : v.isActive,
          updatedAt: new Date().toISOString(),
        };
      }
      return v;
    });
    await updateShippingVouchers(next);
    setVoucherFeedback(`➕ Kuota voucher berhasil ditambah +${additional}!`);
    setTimeout(() => setVoucherFeedback(null), 3000);
  };

  // ========================================================
  // 4. STATE SIMULASI RUTE & UJI COBA PENGIRIMAN
  // ========================================================
  const [testDestQuery, setTestDestQuery] = useState<string>('Mall Taman Palem');
  const [testDestCoords, setTestDestCoords] = useState<{ lat: number; lng: number }>({ lat: -6.1390, lng: 106.7410 });
  const [testSimResult, setTestSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedTestVoucher, setSelectedTestVoucher] = useState<string>('');

  const runTestSimulation = async (coords = testDestCoords) => {
    setIsSimulating(true);
    try {
      const res = await calculateRoadRouteDistance(
        coords.lat,
        coords.lng,
        originForm,
        ratePerKmInput,
        minShippingFeeInput,
        vehicleTypeInput,
        avoidTollsInput
      );
      setTestSimResult(res);
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulation') {
      runTestSimulation();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header Utama Fitur Pengiriman & Ongkir */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-red-100 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  Panel Kelola Logistik & Ongkir
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Kelola Pengiriman & Ongkos Kirim
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Khusus Admin/Karyawan</span>
            </div>
          </div>

          <p className="text-red-100 text-sm mt-3 max-w-3xl leading-relaxed">
            Atur titik asal pengiriman gerai Kopdes, tarif per kilometer, titik koordinat GPS, serta voucher diskon ongkir. 
            Semua perubahan akan langsung menjadi acuan otomatis bagi pelanggan saat membuat pesanan.
          </p>

          {/* Sub Navigasi 4 Tab */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/15">
            <button
              onClick={() => setActiveTab('origin')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'origin'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>1. Titik Asal Kopdes</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'pricing'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>2. Pengaturan Biaya Ongkir</span>
            </button>

            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'vouchers'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>3. Voucher Ongkos Kirim ({shippingVouchers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'simulation'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>4. Simulasi Uji Rute Peta</span>
            </button>

            <button
              onClick={() => setActiveTab('deliveryCenter')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'deliveryCenter'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>5. 🚚 Pusat Pengiriman Karyawan</span>
            </button>

            <button
              onClick={() => setActiveTab('notificationLogs')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                activeTab === 'notificationLogs'
                  ? 'bg-white text-red-700 shadow-md scale-105'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>6. 📊 Log Pemberitahuan Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: TITIK ASAL PENGIRIMAN KOPDES
      ======================================================== */}
      {activeTab === 'origin' && (
        <div className="space-y-6">
          {/* Card Info Hak Akses */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              <span className="font-bold">🔒 Hak Akses Terkendali Admin/Karyawan:</span> Hanya Admin dan Karyawan 
              yang dapat mengubah titik asal Kopdes. Anggota dan akun Basic tidak memiliki akses untuk mengubah lokasi gudang Kopdes ini, 
              melainkan hanya menggunakannya sebagai titik awal patokan perhitungan jarak pengiriman ke alamat tujuan masing-masing.
            </div>
          </div>

          {/* Banner Tombol GPS Saya */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Sensor GPS Perangkat Admin
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mt-1">
                  Deteksi Lokasi Gerai Kopdes Melalui GPS
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tekan tombol di samping saat berada di gerai/kantor Kopdes untuk otomatis mengunci koordinat akurat dan alamat lengkap.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleUseAdminGps}
                  disabled={gpsLoading}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-md shadow-red-200 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>{gpsLoading ? 'Mendeteksi GPS...' : '📍 Gunakan GPS Saya'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetOriginToDefault}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all"
                  title="Kembalikan ke Cengkareng Timur"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Pesan Feedback GPS */}
            {gpsMessage && (
              <div
                className={`mt-4 p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3 ${
                  gpsMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {gpsMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>{gpsMessage.text}</div>
              </div>
            )}

            {/* Form Input Rincian Alamat Titik Asal */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Tempat / Kopdes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tempat / Gerai Kopdes:
                </label>
                <input
                  type="text"
                  value={originForm.name}
                  onChange={(e) => setOriginForm({ ...originForm, name: e.target.value })}
                  placeholder="Contoh: Koperasi Desa Cengkareng Timur (Gerai Sembako)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* Alamat Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Lengkap Resmi Titik Asal:
                </label>
                <textarea
                  rows={2}
                  value={originForm.address}
                  onChange={(e) => setOriginForm({ ...originForm, address: e.target.value })}
                  placeholder="Jalan Kayu Besar RT 13/RW 11, Cengkareng Timur, Jakarta Barat"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* Jalan / Gang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jalan / Gang:
                </label>
                <input
                  type="text"
                  value={originForm.street || ''}
                  onChange={(e) => setOriginForm({ ...originForm, street: e.target.value })}
                  placeholder="Jalan Kayu Besar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* RT / RW */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    RT:
                  </label>
                  <input
                    type="text"
                    value={originForm.rt || ''}
                    onChange={(e) => setOriginForm({ ...originForm, rt: e.target.value })}
                    placeholder="13"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    RW:
                  </label>
                  <input
                    type="text"
                    value={originForm.rw || ''}
                    onChange={(e) => setOriginForm({ ...originForm, rw: e.target.value })}
                    placeholder="11"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Kelurahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelurahan / Desa:
                </label>
                <input
                  type="text"
                  value={originForm.kelurahan || ''}
                  onChange={(e) => setOriginForm({ ...originForm, kelurahan: e.target.value })}
                  placeholder="Cengkareng Timur"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Kecamatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kecamatan:
                </label>
                <input
                  type="text"
                  value={originForm.kecamatan || ''}
                  onChange={(e) => setOriginForm({ ...originForm, kecamatan: e.target.value })}
                  placeholder="Cengkareng"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Kota / Kabupaten */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kota / Kabupaten:
                </label>
                <input
                  type="text"
                  value={originForm.city || ''}
                  onChange={(e) => setOriginForm({ ...originForm, city: e.target.value })}
                  placeholder="Jakarta Barat"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Provinsi & Kode Pos */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Provinsi:
                  </label>
                  <input
                    type="text"
                    value={originForm.province || ''}
                    onChange={(e) => setOriginForm({ ...originForm, province: e.target.value })}
                    placeholder="DKI Jakarta"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kode Pos:
                  </label>
                  <input
                    type="text"
                    value={originForm.postalCode || ''}
                    onChange={(e) => setOriginForm({ ...originForm, postalCode: e.target.value })}
                    placeholder="11730"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Koordinat GPS: Latitude & Longitude */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Latitude:
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={originForm.lat}
                    onChange={(e) => setOriginForm({ ...originForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Longitude:
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={originForm.lng}
                    onChange={(e) => setOriginForm({ ...originForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Patokan Lokasi Terdekat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patokan Lokasi Terdekat:
                </label>
                <input
                  type="text"
                  value={originForm.landmark || ''}
                  onChange={(e) => setOriginForm({ ...originForm, landmark: e.target.value })}
                  placeholder="Dekat Rusun BPS, Pasar Bersih, Masjid Al-Ikhlas"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Catatan / Keterangan Kurir */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan Tambahan untuk Petugas/Kurir:
                </label>
                <input
                  type="text"
                  value={originForm.notes || ''}
                  onChange={(e) => setOriginForm({ ...originForm, notes: e.target.value })}
                  placeholder="Gerbang gudang warna merah, sebelah pos satpam"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            {/* Tombol Simpan & Tautan Peta */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <a
                href={getGoogleMapsDirectionsUrl(originForm.lat, originForm.lng, originForm, vehicleTypeInput, avoidTollsInput)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Lihat Pin Titik Asal di Google Maps</span>
              </a>

              <button
                type="button"
                onClick={handleSaveOrigin}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-emerald-200 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Titik Asal Kopdes</span>
              </button>
            </div>

            {saveOriginStatus && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{saveOriginStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PENGATURAN BIAYA ONGKOS KIRIM
      ======================================================== */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-800">
              Pengaturan Tarif & Aturan Ongkos Kirim
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sesuaikan biaya tarif per kilometer, tarif minimal, dan perlakuan khusus untuk Anggota vs Pengunjung.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarif Per Kilometer */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tarif Dasar per Kilometer (Rp/km):
                  </label>
                  <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                    Standar Rp 5.000
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={ratePerKmInput}
                    onChange={(e) => setRatePerKmInput(parseInt(e.target.value) || 0)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-base font-black text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Jarak rute jalan dibulatkan sesuai aturan: desimal ≤ 0,5 km dibulatkan ke bawah (1,5 km = 1 km, 2,5 km = 2 km) dan desimal &gt; 0,5 km dibulatkan ke atas (1,6 km = 2 km, 2,6 km = 3 km). Jarak hasil pembulatan dikalikan dengan tarif ini.
                </p>
              </div>

              {/* Tarif Minimal Pengiriman */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tarif Minimum Pengiriman (Rp):
                  </label>
                  <span className="text-xs font-bold text-slate-600">Batas Bawah</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={minShippingFeeInput}
                    onChange={(e) => setMinShippingFeeInput(parseInt(e.target.value) || 0)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-base font-black text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ongkos kirim tidak akan pernah berada di bawah angka ini (misal pengiriman jarak sangat dekat 0.5 km tetap kena minimum).
                </p>
              </div>

              {/* Status Layanan Pengiriman Aktif */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">
                    Status Layanan Pengiriman
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jika dinonaktifkan, gerai hanya melayani ambil langsung di tempat (ongkir Rp0).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeliveryActiveInput(!isDeliveryActiveInput)}
                  className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 ${
                    isDeliveryActiveInput ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white transition-transform ${
                      isDeliveryActiveInput ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Potongan Ongkir Khusus Anggota */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Subsidi Diskon Anggota per km (Rp):</span>
                  </label>
                  <span className="text-xs text-emerald-600 font-bold">Opsional</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={memberDiscountPerKmInput}
                    onChange={(e) => setMemberDiscountPerKmInput(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-base font-black text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Potongan ongkir khusus akun Anggota Koperasi per km.
                </p>
              </div>

              {/* Moda Kendaraan & Pengaturan Rute Bebas Tol */}
              <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-200 md:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-base">
                      🛵
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Moda Kendaraan & Perhitungan Rute (Non-Tol)
                      </h4>
                      <p className="text-xs text-slate-600">
                        Atur rute navigasi kendaraan pengiriman agar navigasi per km tidak masuk ke jalan tol mobil.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-200 text-amber-900">
                    {vehicleTypeInput === 'motorcycle' ? '✓ Mode Sepeda Motor Aktif' : 'Mode Mobil'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleTypeInput('motorcycle');
                      setAvoidTollsInput(true);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      vehicleTypeInput === 'motorcycle'
                        ? 'border-amber-500 bg-white shadow-md ring-2 ring-amber-400'
                        : 'border-slate-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <div className="text-2xl mt-0.5">🛵</div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Sepeda Motor (Disarankan)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Default</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Menghitung rute via jalan arteri, perumahan, & jalan raya biasa. Menghindari masuk jalan tol mobil secara ketat.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleTypeInput('car')}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      vehicleTypeInput === 'car'
                        ? 'border-red-500 bg-white shadow-md ring-2 ring-red-400'
                        : 'border-slate-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <div className="text-2xl mt-0.5">🚗</div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        Mobil / Mobil Box
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Menghitung rute jalan umum mobil. Dapat mengizinkan atau menghindari jalan tol sesuai opsi di bawah.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Toggle Hindari Jalan Tol */}
                <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-amber-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      🚫 Hindari Jalan Tol Saat Navigasi GPS & Perhitungan Jarak (Bebas Tol)
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                      Wajib untuk Motor
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvoidTollsInput(!avoidTollsInput)}
                    className={`w-12 h-7 rounded-full transition-colors relative p-1 shrink-0 ${
                      avoidTollsInput ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        avoidTollsInput ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Simulasi Kalkulator Live */}
            <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-red-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-red-700">
                  Simulasi Kalkulasi Tarif Langsung
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Coba Jarak Rute (km):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={simKm}
                    onChange={(e) => setSimKm(parseFloat(e.target.value) || 0.1)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Jarak Dibulatkan</div>
                  <div className="text-base font-black text-slate-800">{simBilledKm} km</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Ongkir Pengunjung</div>
                  <div className="text-base font-black text-red-600">Rp {simRawFee.toLocaleString('id-ID')}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Ongkir Anggota</div>
                  <div className="text-base font-black text-emerald-600">Rp {simMemberFee.toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>

            {/* Tombol Simpan Tarif */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Perubahan tarif berlaku untuk semua transaksi pemesanan baru berikutnya.
              </p>
              <button
                type="button"
                onClick={handleSavePricing}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-emerald-200 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Tarif</span>
              </button>
            </div>

            {savePricingStatus && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{savePricingStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: KELOLA VOUCHER ONGKOS KIRIM
      ======================================================== */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          {/* Ringkasan Statistik Voucher Ongkir */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Voucher</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{shippingVouchers.length}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Status Aktif</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {shippingVouchers.filter((v) => v.isActive && (!v.totalQuota || (v.usedCount || 0) < v.totalQuota)).length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-red-600 font-bold uppercase tracking-wider">Habis / Nonaktif</div>
              <div className="text-2xl font-black text-red-600 mt-1">
                {shippingVouchers.filter((v) => !v.isActive || (v.totalQuota && (v.usedCount || 0) >= v.totalQuota)).length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Total Pemakaian</div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {shippingVouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0)} kali
              </div>
            </div>
          </div>

          {/* Form Tambah / Edit Voucher Ongkir */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-black text-slate-800">
                  {editingVoucherId ? '✏️ Edit Voucher Ongkir' : '➕ Tambah Voucher Ongkos Kirim Baru'}
                </h3>
              </div>
              {editingVoucherId && (
                <button
                  type="button"
                  onClick={handleResetVoucherForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            {voucherFeedback && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{voucherFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveVoucher} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kode Voucher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kode Voucher (Unik & Huruf Besar):
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherForm.code}
                    onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: ONGKIR10"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black tracking-wider text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Pelanggan memasukkan kode ini saat checkout.
                  </span>
                </div>

                {/* Nama / Deskripsi Voucher */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Judul Voucher:
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherForm.name}
                    onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
                    placeholder="Contoh: Potongan Ongkir Rp10.000 (Min. 3 km)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>

                {/* Minimal Jarak Pengiriman */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Minimal Jarak Pengiriman (km):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={voucherForm.minDistanceKm}
                      onChange={(e) => setVoucherForm({ ...voucherForm, minDistanceKm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-hidden focus:border-red-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      km
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Jika jarak pelanggan di bawah ini, voucher ditolak otomatis.
                  </span>
                </div>

                {/* Nominal Potongan Voucher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nominal Potongan Ongkir (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="1000"
                      min="1000"
                      required
                      value={voucherForm.discountAmount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, discountAmount: parseInt(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-red-600 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Nominal potongan langsung dari biaya ongkir.
                  </span>
                </div>

                {/* Jumlah Voucher / Kuota */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jumlah Voucher (Kuota Total):
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={voucherForm.totalQuota}
                    onChange={(e) => setVoucherForm({ ...voucherForm, totalQuota: parseInt(e.target.value) || 1 })}
                    placeholder="Contoh: 100"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Berkurang 1 tiap transaksi WA yang berhasil.
                  </span>
                </div>

                {/* Masa Berlaku */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Masa Berlaku (Kadaluarsa):
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherForm.expiryDate}
                    onChange={(e) => setVoucherForm({ ...voucherForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                  />
                </div>

                {/* Sasaran Penggunaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sasaran Penggunaan:
                  </label>
                  <select
                    value={voucherForm.targetAudience}
                    onChange={(e) => setVoucherForm({ ...voucherForm, targetAudience: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                  >
                    <option value="all">👥 Semua Pelanggan</option>
                    <option value="member">🪪 Khusus Anggota Koperasi</option>
                    <option value="visitor">👤 Khusus Pengunjung Baru</option>
                  </select>
                </div>

                {/* Status Aktif / Nonaktif */}
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={voucherForm.isActive}
                      onChange={(e) => setVoucherForm({ ...voucherForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded-md text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Status Voucher Aktif
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                {editingVoucherId && (
                  <button
                    type="button"
                    onClick={handleResetVoucherForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black shadow-md shadow-red-200 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingVoucherId ? 'Simpan Perubahan Voucher' : 'Tambahkan Voucher Ongkir'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Daftar Tabel Voucher Ongkir */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Daftar Voucher Ongkos Kirim Tersedia
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau stok kuota, masa berlaku, dan efektivitas penggunaan voucher ongkir.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Kode & Nama</th>
                    <th className="py-3.5 px-4">Potongan</th>
                    <th className="py-3.5 px-4">Min. Jarak</th>
                    <th className="py-3.5 px-4">Sisa Kuota</th>
                    <th className="py-3.5 px-4">Sasaran</th>
                    <th className="py-3.5 px-4">Masa Berlaku</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {shippingVouchers.map((v) => {
                    const used = v.usedCount || 0;
                    const remaining = Math.max(0, v.totalQuota - used);
                    const isExhausted = remaining === 0;
                    const isExpired = v.expiryDate && new Date().toISOString().split('T')[0] > v.expiryDate;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900 tracking-wider text-sm flex items-center gap-1.5">
                            <span>{v.code}</span>
                            {isExhausted && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                ❌ Habis
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{v.name}</div>
                        </td>

                        <td className="py-3 px-4 font-black text-red-600">
                          Rp {v.discountAmount.toLocaleString('id-ID')}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800">
                          {v.minDistanceKm} km
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-black ${isExhausted ? 'text-rose-600' : 'text-slate-800'}`}>
                              {remaining} / {v.totalQuota}
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleAddQuota(v.id, 25)}
                                title="Tambah +25 kuota"
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                +25
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddQuota(v.id, 50)}
                                title="Tambah +50 kuota"
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                +50
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {v.targetAudience === 'member' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-100">
                              Anggota
                            </span>
                          )}
                          {v.targetAudience === 'visitor' && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                              Pengunjung
                            </span>
                          )}
                          {(!v.targetAudience || v.targetAudience === 'all') && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                              Semua
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {v.expiryDate || 'Selamanya'}
                          {isExpired && (
                            <span className="block text-[10px] font-bold text-rose-600">Kadaluarsa</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleVoucherActive(v.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                              v.isActive && !isExhausted && !isExpired
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {v.isActive && !isExhausted && !isExpired ? '● Aktif' : '○ Nonaktif'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditVoucher(v)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Edit Voucher"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVoucher(v.id, v.code)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Hapus Voucher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ========================================================
          TAB 4: SIMULASI UJI COBA RUTE PETA
      ======================================================== */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-800">
              Uji Coba Rute Peta & Simulasi Ongkir
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Periksa bagaimana sistem OSRM jalan nyata menghitung rute, durasi, biaya ongkir, dan validasi voucher dari titik asal Kopdes ke alamat pelanggan.
            </p>

            {/* Pilihan Cepat Preset Alamat Uji Coba */}
            <div className="mt-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Pilih Alamat Tujuan Uji Coba:
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_DESTINATION_PRESETS.slice(0, 6).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTestDestQuery(preset.address);
                      setTestDestCoords({ lat: preset.lat, lng: preset.lng });
                      runTestSimulation({ lat: preset.lat, lng: preset.lng });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      testDestCoords.lat === preset.lat && testDestCoords.lng === preset.lng
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.icon || '📍'}</span> <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kotak Hasil Simulasi */}
            {testSimResult && (
              <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-red-600">
                      Rute Jalan Nyata (OSRM OpenStreetMap)
                    </div>
                    <h4 className="text-base font-black text-slate-800 mt-0.5">
                      {testDestQuery}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>~{testSimResult.estimatedDurationMinutes} Menit Perjalanan</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-bold">Jarak Rute Asli</div>
                    <div className="text-xl font-black text-slate-800 mt-1">
                      {testSimResult.actualDistanceKm.toFixed(1)} km
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-bold">Jarak Penagihan (Dibulatkan)</div>
                    <div className="text-xl font-black text-slate-800 mt-1">
                      {testSimResult.billedDistanceKm} km
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-bold">Tarif Dasar</div>
                    <div className="text-xl font-black text-slate-800 mt-1">
                      Rp {testSimResult.ratePerKm.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-bold">Biaya Ongkir Standar</div>
                    <div className="text-xl font-black text-red-600 mt-1">
                      Rp {testSimResult.shippingFee.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Tes Pasang Voucher Ongkir pada Simulasi */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Uji Potongan Voucher pada Rute Ini:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {shippingVouchers.map((v) => {
                      const qualified = testSimResult.actualDistanceKm >= v.minDistanceKm;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedTestVoucher(selectedTestVoucher === v.code ? '' : v.code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                            selectedTestVoucher === v.code
                              ? 'bg-red-600 text-white border-red-600'
                              : qualified
                              ? 'bg-white text-slate-800 border-slate-200 hover:border-red-300'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          <span>{v.code}</span>
                          <span className="text-[10px]">
                            ({qualified ? `Potong Rp${v.discountAmount.toLocaleString('id-ID')}` : `Min. ${v.minDistanceKm} km - Tidak Cukup`})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedTestVoucher && (() => {
                    const matched = shippingVouchers.find((v) => v.code === selectedTestVoucher);
                    if (!matched) return null;
                    const discount = Math.min(matched.discountAmount, testSimResult.shippingFee);
                    const netFee = Math.max(0, testSimResult.shippingFee - discount);
                    return (
                      <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span>
                          Voucher {matched.code} Aktif: Hemat Rp {discount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          Ongkir Akhir: Rp {netFee.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 text-right">
                  <a
                    href={getGoogleMapsDirectionsUrl(testDestCoords.lat, testDestCoords.lng, originForm, vehicleTypeInput, avoidTollsInput)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
                    title="Buka Navigasi Google Maps mode Sepeda Motor (bebas jalan tol)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🛵 Buka Panduan Navigasi Motor (Bebas Tol) di Google Maps</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: PUSAT PENGIRIMAN KARYAWAN & RUTE GPS
      ======================================================== */}
      {activeTab === 'deliveryCenter' && (
        <div className="pt-2 animate-fade-in">
          <DeliveryCenterView />
        </div>
      )}

      {/* ========================================================
          TAB 6: LOG PEMBERITAHUAN ADMIN
      ======================================================== */}
      {activeTab === 'notificationLogs' && (
        <div className="pt-2 animate-fade-in">
          <AdminDeliveryNotificationLogs />
        </div>
      )}
    </div>
  );
};
