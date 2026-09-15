import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { reverseGeocodeAddress } from '../services/shippingService';

interface GeolocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (coords: { lat: number; lng: number }, address?: string) => void;
}

export function GeolocationPermissionModal({
  isOpen,
  onClose,
  onSuccess,
}: GeolocationPermissionModalProps) {
  const { setDestination, deliveryNotes } = useCart();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeny = () => {
    try {
      localStorage.setItem('kopdes_geo_permission_status', 'denied');
      sessionStorage.setItem('kopdes_geo_prompt_shown', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleAllow = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Perangkat atau browser Anda tidak mendukung sensor GPS.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg('Mengakses sensor lokasi perangkat...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        try {
          localStorage.setItem('kopdes_geo_permission_status', 'granted');
          sessionStorage.setItem('kopdes_geo_prompt_shown', 'true');
        } catch {
          // ignore
        }

        const fastLabel = `Lokasi GPS (${userLat.toFixed(5)}, ${userLng.toFixed(5)})`;
        await setDestination(fastLabel, { lat: userLat, lng: userLng }, deliveryNotes);

        try {
          const rev = await reverseGeocodeAddress(userLat, userLng);
          if (rev && rev.address) {
            await setDestination(rev.address, { lat: userLat, lng: userLng }, deliveryNotes);
            if (onSuccess) onSuccess({ lat: userLat, lng: userLng }, rev.address);
          } else {
            if (onSuccess) onSuccess({ lat: userLat, lng: userLng }, fastLabel);
          }
        } catch {
          if (onSuccess) onSuccess({ lat: userLat, lng: userLng }, fastLabel);
        }

        setLoading(false);
        setSuccessMsg('Lokasi geografis berhasil diizinkan!');
        setTimeout(() => {
          onClose();
        }, 1200);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Izin lokasi ditolak oleh browser. Anda dapat mengaktifkannya melalui ikon gembok/pengaturan peramban.');
        } else {
          setErrorMsg('Tidak dapat membaca sensor lokasi GPS saat ini.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div
      id="geo-permission-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="geo-permission-dialog-card"
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative transition-all"
      >
        {/* Header with Title & Close Icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              Permintaan akses lokasi geografis
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Body */}
        <div className="mt-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Aplikasi ini memerlukan akses ke lokasi geografis agar dapat berfungsi dengan benar. Apakah Anda ingin mengizinkan akses ke lokasi geografis?
          </p>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleDeny}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            Melarang
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl shadow-xs hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Izinkan akses lokasi geografis</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
