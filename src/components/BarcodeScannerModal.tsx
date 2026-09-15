import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, QrCode, Keyboard, Sparkles, Flashlight } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcodeValue: string) => void;
  expectedBarcode?: string;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  expectedBarcode,
  title = 'Scan Barcode Pesanan',
  subtitle = 'Arahkan kamera ke barcode pada label resi/struk pesanan',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Play beep sound on scan success
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext fallback
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    setScannedResult(null);
    setValidationError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setCameraError('Tidak dapat mengakses kamera device. Gunakan fitur Input Barcode Manual di bawah.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleSimulateScan = (codeToTest?: string) => {
    const code = codeToTest || expectedBarcode || 'ORD-20260909-001';
    processBarcode(code);
  };

  const processBarcode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setValidationError('Kode barcode tidak boleh kosong!');
      return;
    }

    if (expectedBarcode) {
      const cleanExpected = expectedBarcode.trim().toUpperCase();
      if (clean !== cleanExpected) {
        setValidationError(`❌ Barcode tidak cocok! Di-scan: "${clean}". Seharusnya: "${cleanExpected}". Pesanan ini bukan milik tugas Anda.`);
        return;
      }
    }

    setScannedResult(clean);
    setValidationError(null);
    playBeepSound();

    setTimeout(() => {
      onScanSuccess(clean);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{title}</h3>
              <p className="text-xs text-slate-300">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Barcode Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Input Kode Manual</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {expectedBarcode && (
            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Barcode Target Pesanan:</span>
              <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300">
                {expectedBarcode}
              </span>
            </div>
          )}

          {scannedResult ? (
            <div className="py-8 text-center space-y-3 bg-emerald-50 border-2 border-emerald-400 rounded-3xl animate-bounce-short">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-emerald-950">
                ✅ BARCODE TERVERIFIKASI SAMA!
              </h4>
              <p className="font-mono text-sm font-bold text-emerald-800 bg-white/80 py-1.5 px-4 rounded-xl border border-emerald-200 inline-block">
                {scannedResult}
              </p>
              <p className="text-xs text-emerald-700 font-medium">
                Sistem memproses status pesanan...
              </p>
            </div>
          ) : activeTab === 'camera' ? (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Perhatian Akses Kamera:</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">{cameraError}</p>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-video border-2 border-slate-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Scanner Overlay Box */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                    <div className="w-64 h-32 border-2 border-emerald-400 rounded-2xl relative bg-emerald-500/10 shadow-2xl animate-pulse">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br"></div>
                      
                      {/* Red Laser Scanning Line */}
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] absolute top-1/2 left-0 -translate-y-1/2 animate-ping"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl text-center">
                    <span className="text-[11px] font-bold text-white flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      Scanner Kamera Aktif - Posisikan Barcode di Kotak Hijau
                    </span>
                  </div>
                </div>
              )}

              {/* Simulation Quick Trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSimulateScan(expectedBarcode)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>[Simulasi Scan Kamera] Verifikasi Barcode Pesanan Ini</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Ketik Nomor Barcode / Kode Pesanan:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder={expectedBarcode || 'Contoh: ORD-20260909-001'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  {expectedBarcode && (
                    <button
                      type="button"
                      onClick={() => setManualCode(expectedBarcode)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      Isi Kode Target
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => processBarcode(manualCode)}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-300" />
                <span>Verifikasi Kode Manual</span>
              </button>
            </div>
          )}

          {validationError && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-2xl text-red-900 text-xs font-bold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
