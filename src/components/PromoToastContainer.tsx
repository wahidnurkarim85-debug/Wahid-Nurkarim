import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PromoToast } from '../types';

interface PromoToastItemProps {
  key?: string;
  toast: PromoToast;
  onDismiss: (id: string) => void;
  onViewCart?: () => void;
}

const TOAST_DURATION_MS = 5000;

function PromoToastItem({ toast, onDismiss, onViewCart }: PromoToastItemProps) {
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const remainingTimeRef = useRef<number>(TOAST_DURATION_MS);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (isPaused) {
        lastTickRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      const newPercent = (remainingTimeRef.current / TOAST_DURATION_MS) * 100;
      setProgress(newPercent);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [toast.id, onDismiss, isPaused]);

  const isBonus = toast.type === 'bonus';

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return '';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 40, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      id={`promo-toast-${toast.id}`}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl border transition-all ${
        isBonus
          ? 'bg-white/95 text-slate-900 border-emerald-500/30 shadow-emerald-950/15'
          : 'bg-white/95 text-slate-900 border-amber-500/35 shadow-amber-950/15'
      }`}
    >
      {/* Glow Accent Background */}
      <div
        className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 ${
          isBonus ? 'bg-emerald-400' : 'bg-amber-400'
        }`}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${
              isBonus
                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                : 'bg-amber-100/90 text-amber-900 border-amber-300'
            }`}
          >
            {isBonus ? (
              <>
                <Gift className="w-3 h-3 text-emerald-600" />
                <span>{toast.badgeText || 'Bonus Hadiah Rp0'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{toast.badgeText || 'Hemat Bundling'}</span>
              </>
            )}
          </span>

          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <CheckCircle2 className={`w-3 h-3 ${isBonus ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>Otomatis Diterapkan</span>
          </span>
        </div>

        <button
          id={`toast-dismiss-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          aria-label="Tutup notifikasi"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Info */}
      <div className="flex items-start gap-3 relative z-10">
        {/* Left Decorative Icon */}
        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
            isBonus
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-200'
              : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30 ring-2 ring-amber-200'
          }`}
        >
          {isBonus ? <Gift className="w-6 h-6 animate-pulse" /> : <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-slate-900 leading-snug">
            {toast.title}
          </h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2 font-medium">
            {toast.message}
          </p>

          {/* Additional Badges / Highlighted Pills */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {isBonus && toast.rewardProductName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                <span>🎁 Gratis:</span>
                <span className="underline decoration-emerald-500/50">
                  {toast.rewardQty ? `${toast.rewardQty}x ` : ''}
                  {toast.rewardProductName}
                  {toast.rewardVariation ? ` (${toast.rewardVariation})` : ''}
                </span>
                <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded font-black">
                  Rp 0
                </span>
              </span>
            )}

            {!isBonus && toast.discountAmount !== undefined && toast.discountAmount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                <span>💰 Potongan:</span>
                <strong className="text-amber-800 font-black">
                  {formatRupiah(toast.discountAmount)}
                </strong>
              </span>
            )}

            {onViewCart && (
              <button
                id={`toast-view-cart-${toast.id}`}
                onClick={() => {
                  onViewCart();
                  onDismiss(toast.id);
                }}
                className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg transition-transform active:scale-95 shadow-xs ${
                  isBonus
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Lihat Keranjang</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Progress Timer Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${
            isBonus ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

interface PromoToastContainerProps {
  onViewCart?: () => void;
}

export function PromoToastContainer({ onViewCart }: PromoToastContainerProps) {
  const { promoToasts, dismissPromoToast } = useCart();

  if (!promoToasts || promoToasts.length === 0) {
    return null;
  }

  return (
    <aside
      id="promo-toast-container"
      aria-label="Notifikasi Promo dan Hadiah Keranjang"
      className="fixed top-4 sm:top-5 right-4 sm:right-5 z-[99999] pointer-events-none flex flex-col gap-3 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full"
    >
      <AnimatePresence mode="popLayout">
        {promoToasts.map((toast) => (
          <PromoToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissPromoToast}
            onViewCart={onViewCart}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
}
