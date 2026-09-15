import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Check, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Compass, 
  X, 
  Home, 
  Truck, 
  ChevronRight,
  FileText,
  LocateFixed,
  RefreshCw,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  KOPDES_ORIGIN, 
  RATE_PER_KM, 
  POPULAR_DESTINATION_PRESETS, 
  searchAddressAutocomplete, 
  AutocompleteResult,
  getGoogleMapsDirectionsUrl,
  reverseGeocodeAddress
} from '../services/shippingService';
import { GeolocationPermissionModal } from './GeolocationPermissionModal';

interface DeliveryAddressPickerProps {
  compact?: boolean;
  onAddressSelected?: () => void;
  onOpenAuth?: () => void;
}

export const DeliveryAddressPicker: React.FC<DeliveryAddressPickerProps> = ({ 
  compact = false,
  onAddressSelected,
  onOpenAuth
}) => {
  const {
    kopdesOrigin,
    deliveryAddress,
    deliveryCoords,
    deliveryNotes,
    actualDistanceKm,
    billedDistanceKm,
    shippingFee,
    estimatedDurationMinutes,
    isCalculatingRoute,
    isRoadRoute,
    setDestination,
    setDeliveryNotes,
    recalculateShipping,
  } = useCart();

  const { user } = useAuth();

  const [inputSearch, setInputSearch] = useState<string>(deliveryAddress);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [localNotes, setLocalNotes] = useState<string>(deliveryNotes);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState<string | null>(null);
  const [isGeoModalOpen, setIsGeoModalOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss GPS success message
  useEffect(() => {
    if (gpsSuccess) {
      const timer = setTimeout(() => setGpsSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [gpsSuccess]);

  // Request GPS Location Directly or Open Modal
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Perangkat atau peramban Anda tidak mendukung sensor GPS.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setGpsSuccess('📡 Mengakses sensor GPS perangkat...');

    const onGeoSuccess = async (pos: GeolocationPosition) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const fastLabel = `Lokasi GPS (${userLat.toFixed(5)}, ${userLng.toFixed(5)})`;
      setInputSearch(fastLabel);
      setGpsSuccess(`📍 Akses lokasi geografis diizinkan! Koordinat (${userLat.toFixed(5)}, ${userLng.toFixed(5)}) dikunci.`);

      await setDestination(fastLabel, { lat: userLat, lng: userLng }, localNotes);
      setGpsLoading(false);
      if (onAddressSelected) onAddressSelected();

      try {
        const rev = await reverseGeocodeAddress(userLat, userLng);
        if (rev && rev.address) {
          setInputSearch(rev.address);
          await setDestination(rev.address, { lat: userLat, lng: userLng }, localNotes);
        }
      } catch {
        // Tetap gunakan koordinat GPS
      }
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError('Izin akses lokasi geografis ditolak. Anda dapat membukanya kembali lewat tombol di samping.');
      } else {
        setGpsError('Tidak dapat membaca sensor lokasi GPS perangkat saat ini.');
      }
    };

    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      onGeoError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [localNotes, onAddressSelected, setDestination]);

  // Sinkronkan input text jika alamat di context berubah
  useEffect(() => {
    setInputSearch(deliveryAddress);
  }, [deliveryAddress]);

  useEffect(() => {
    setLocalNotes(deliveryNotes);
  }, [deliveryNotes]);

  // Klik di luar dropdown untuk menutup autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputSearch(val);
    setGpsError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressAutocomplete(val);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Pilih alamat dari hasil autocomplete atau preset
  const handleSelectSuggestion = async (item: {
    name?: string;
    label?: string;
    address: string;
    lat: number;
    lng: number;
  }) => {
    const chosenAddress = item.address || item.name || item.label || 'Alamat Tujuan';
    setInputSearch(chosenAddress);
    setShowDropdown(false);
    setSuggestions([]);
    await setDestination(chosenAddress, { lat: item.lat, lng: item.lng }, localNotes);
    if (onAddressSelected) {
      onAddressSelected();
    }
  };

  const handleNotesBlur = () => {
    setDeliveryNotes(localNotes);
  };

  const googleMapsUrl = deliveryCoords 
    ? getGoogleMapsDirectionsUrl(deliveryCoords.lat, deliveryCoords.lng, kopdesOrigin, 'motorcycle', true) 
    : '#';

  // Sederhanakan untuk mode compact (tampilan di Katalog)
  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 transition-all hover:border-red-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  Pengiriman Kopdes
                </span>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  🛵 Rute Motor (Non-Tol)
                </span>
                <span className="text-xs text-slate-500">Tarif Rp5.000 / km</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-0.5 line-clamp-1">
                {deliveryAddress || 'Belum pilih alamat pengiriman'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-500">
                Jarak: <span className="font-bold text-slate-800">{actualDistanceKm.toFixed(1)} km</span> (Tagih {billedDistanceKm} km)
              </div>
              <div className="text-base font-black text-red-600">
                Rp {shippingFee.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* Input Autocomplete Cepat */}
        <div className="mt-3 relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputSearch}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Ganti alamat tujuan pengiriman..."
              className="w-full pl-9 pr-24 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-800 transition-all font-medium"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {inputSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setInputSearch('');
                    setSuggestions([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsGeoModalOpen(true)}
                disabled={gpsLoading}
                title="Gunakan Lokasi GPS Saya"
                className="px-2 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-1 transition-all"
              >
                <LocateFixed className="w-3 h-3 text-red-600" />
                <span className="hidden sm:inline">GPS</span>
              </button>
            </div>
          </div>

          {/* Dropdown Suggestions */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                  Mencari alamat tujuan...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left p-2.5 hover:bg-red-50/60 transition-colors flex items-start gap-2 text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-1">{item.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.address}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Ketik nama jalan, RT/RW, atau perumahan di Cengkareng / Jakarta Barat
                </div>
              )}
            </div>
          )}

          {gpsSuccess && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>{gpsSuccess}</span>
            </div>
          )}

          {gpsError && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{gpsError}</span>
            </div>
          )}

          <GeolocationPermissionModal
            isOpen={isGeoModalOpen}
            onClose={() => setIsGeoModalOpen(false)}
            onSuccess={(_coords, address) => {
              if (address) setInputSearch(address);
              if (onAddressSelected) onAddressSelected();
            }}
          />
        </div>
      </div>
    );
  }

  // Tampilan Full untuk Checkout & Keranjang
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header Pengiriman */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Pengiriman Berbasis Rute Jalan
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Cek Rute & Ongkos Kirim Otomatis
              </h3>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/15 text-right">
            <div className="text-[11px] text-red-100 font-medium">Tarif Resmi Kopdes</div>
            <div className="text-base font-black text-white">Rp 5.000 <span className="text-xs font-normal text-red-100">/ 1 km</span></div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Titik Asal Kopdes */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                📍 Titik Asal Pengiriman (Kopdes)
              </span>
              <span className="text-xs text-amber-700 hidden sm:inline">GPS: -6.14364, 106.72892</span>
            </div>
            <h4 className="text-sm font-black text-slate-900 mt-1">
              {kopdesOrigin.name}
            </h4>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
              {kopdesOrigin.address}
            </p>
          </div>
        </div>

        {/* Input Pencarian Alamat Tujuan dengan Autocomplete */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-red-600" />
              <span>Cari Alamat Tujuan Pelanggan (Autocomplete)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsGeoModalOpen(true)}
              disabled={gpsLoading}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 hover:underline transition-all"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>{gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Gunakan GPS Saya'}</span>
            </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <MapPin className="w-5 h-5 text-red-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputSearch}
                onChange={handleInputChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                placeholder="Ketik nama jalan, perumahan, kelurahan, atau RT/RW tujuan..."
                className="w-full pl-12 pr-28 py-3.5 text-sm bg-slate-50 border-2 border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl outline-none text-slate-900 font-semibold shadow-inner transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {inputSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputSearch('');
                      setSuggestions([]);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isSearching && (
                  <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                )}
              </div>
            </div>

            {/* Dropdown Suggestions List */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                    <span>Mencari alamat sesuai lokasi Kopdes...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-3.5 hover:bg-red-50/80 transition-colors flex items-start gap-3 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.address}
                        </div>
                        {item.type && (
                          <span className="inline-block mt-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-colors self-center shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Tidak ditemukan alamat yang cocok. Silakan coba kata kunci lain.
                  </div>
                )}
              </div>
            )}
          </div>

          {gpsSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{gpsSuccess}</span>
            </div>
          )}

          {gpsError && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Quick Preset Chips */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              📍 Pilihan Cepat Alamat Sekitar Cengkareng:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_DESTINATION_PRESETS.map((preset, idx) => {
                const isSelected = deliveryAddress.includes(preset.label) || deliveryAddress.includes(preset.address);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(preset)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-sm shadow-red-200 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-red-500'}`} />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Input Patokan Alamat / No. Rumah */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span>Detail Alamat / No. Rumah / Patokan Kurir</span>
          </label>
          <input
            type="text"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Contoh: No. 18, RT 04/RW 02, Rumah pagar hitam seberang masjid..."
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:bg-white outline-none text-slate-800 font-medium"
          />
        </div>

        {/* 🗺️ Visual Rute Peta Sederhana & Status Koordinat */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Compass className="w-4 h-4 text-red-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Peta Visual Rute Jalan
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {isRoadRoute ? '✓ Jalur Arteri Motor' : 'Estimasi Jalan'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                🛵 Tanpa Tol
              </span>
            </div>
            {deliveryCoords && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                title="Buka Navigasi Google Maps mode Sepeda Motor (bebas jalan tol)"
              >
                <span>🛵 Navigasi Motor (Bebas Tol)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* SVG Map Route Visualizer */}
          <div className="w-full h-32 bg-slate-900 rounded-xl relative overflow-hidden border border-slate-800 flex items-center justify-center p-4">
            {/* Grid Pattern Background */}
            <div 
              className="absolute inset-0 opacity-20" 
              style={{ 
                backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
              }}
            />

            {/* Connecting Road Line Representation */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path
                d="M 60 70 Q 180 20, 260 80 T 460 60"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeDasharray="6,4"
                className="animate-pulse"
              />
            </svg>

            {/* Titik Asal Pin (Kopdes) */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
                📍
              </div>
              <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 px-2 py-1 rounded text-[10px] text-white font-bold hidden sm:block">
                Kopdes Cengkareng
              </div>
            </div>

            {/* Center Distance Badge */}
            <div className="z-10 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
              {isCalculatingRoute ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                  <span>Menghitung rute...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <span className="text-red-600">📏 {actualDistanceKm.toFixed(1)} km</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    ~{estimatedDurationMinutes} mnt
                  </span>
                </div>
              )}
            </div>

            {/* Titik Tujuan Pin (Pelanggan) */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
                🏠
              </div>
              <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 px-2 py-1 rounded text-[10px] text-white font-bold hidden sm:block">
                Tujuan Pelanggan
              </div>
            </div>
          </div>
        </div>

        {/* 💰 Kartu Ringkasan Perhitungan Ongkos Kirim Otomatis */}
        <div className="bg-gradient-to-br from-slate-50 to-red-50/40 rounded-2xl border-2 border-red-100 p-4 sm:p-5">
          <div className="text-xs font-black uppercase tracking-wider text-red-900 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-red-600" />
              Rincian Perhitungan Ongkos Kirim
            </span>
            <span className="text-[11px] font-bold text-red-700 bg-red-100/70 px-2 py-0.5 rounded">
              Otomatis Diperbarui
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase">📍 Titik Asal Kopdes</div>
              <div className="font-bold text-slate-800 mt-0.5 line-clamp-1">{kopdesOrigin.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{kopdesOrigin.address}</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase">🏠 Titik Tujuan Pelanggan</div>
              <div className="font-bold text-slate-800 mt-0.5 line-clamp-1">{deliveryAddress}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {deliveryCoords ? `GPS: ${deliveryCoords.lat.toFixed(5)}, ${deliveryCoords.lng.toFixed(5)}` : 'Koordinat terdeteksi'}
              </div>
            </div>
          </div>

          {/* Formula Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <span>🛵 Jarak Rute Sepeda Motor (Non-Tol):</span>
              </span>
              <span className="font-bold text-slate-800">{actualDistanceKm.toFixed(1)} km</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium" title="Aturan: desimal ≤ 0,5 km dibulatkan ke bawah (1,5 km = 1 km, 2,5 km = 2 km); desimal > 0,5 km dibulatkan ke atas (1,6 km = 2 km, 2,6 km = 3 km)">
                🚚 Jarak Penagihan (Dibulatkan):
              </span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {billedDistanceKm} km
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">💵 Tarif Resmi per Kilometer:</span>
              <span className="font-bold text-slate-800">Rp {RATE_PER_KM.toLocaleString('id-ID')} / km</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <div>
                <div className="text-xs font-black text-slate-900">💰 Total Ongkos Kirim:</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Rumus: {billedDistanceKm} km × Rp 5.000
                </div>
              </div>
              <div className="text-lg font-black text-red-600">
                Rp {shippingFee.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <GeolocationPermissionModal
        isOpen={isGeoModalOpen}
        onClose={() => setIsGeoModalOpen(false)}
        onSuccess={(_coords, address) => {
          if (address) setInputSearch(address);
          if (onAddressSelected) onAddressSelected();
        }}
      />
    </div>
  );
};
