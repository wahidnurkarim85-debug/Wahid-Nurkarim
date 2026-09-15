import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Gift,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Ticket,
  Truck,
  Users,
  Info
} from 'lucide-react';
import { usePoints } from '../context/PointContext';
import { useAuth } from '../context/AuthContext';
import { PointReward } from '../types';

interface PointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCatalog?: () => void;
}

export const PointModal: React.FC<PointModalProps> = ({ isOpen, onClose, onOpenCatalog }) => {
  const { user } = useAuth();
  const {
    pointRewards,
    getCurrentUserPointAccount,
    getUserPointTransactions,
    pointPrograms,
    redeemReward,
  } = usePoints();

  const [activeTab, setActiveTab] = useState<'balance' | 'redeem' | 'history'>('balance');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  // Identify customer
  const customerPhone = user?.phone || '';
  const customerRole = user?.role === 'ANGGOTA' || user?.role === 'KARYAWAN' ? 'member' : 'basic';
  const customerName = user?.displayName || user?.name || 'Pelanggan';

  const pointAccount = useMemo(() => {
    return getCurrentUserPointAccount(customerPhone);
  }, [getCurrentUserPointAccount, customerPhone]);

  const transactions = useMemo(() => {
    return getUserPointTransactions(customerPhone);
  }, [getUserPointTransactions, customerPhone]);

  const activeProgram = useMemo(() => {
    return pointPrograms.find((p) => p.isActive && p.targetAudience === customerRole) || null;
  }, [pointPrograms, customerRole]);

  // Rewards eligible for current user
  const eligibleRewards = useMemo(() => {
    return pointRewards.filter((rew) => {
      if (!rew.isActive) return false;
      if (rew.targetAudience === 'member' && customerRole !== 'member') return false;
      if (rew.targetAudience === 'basic' && customerRole !== 'basic') return false;
      return true;
    });
  }, [pointRewards, customerRole]);

  if (!isOpen) return null;

  const currentBalance = pointAccount?.balance || 0;

  const handleRedeem = async (reward: PointReward) => {
    if (!customerPhone) {
      setFeedback({
        message: 'Silakan lakukan transaksi atau login untuk menghubungkan nomor HP dengan akun point.',
        type: 'error',
      });
      return;
    }

    if (currentBalance < reward.pointsCost) {
      setFeedback({
        message: `Saldo point Anda (${currentBalance} Point) belum cukup untuk menukar hadiah ini (${reward.pointsCost} Point).`,
        type: 'error',
      });
      return;
    }

    setIsRedeeming(reward.id);
    try {
      const res = await redeemReward(
        reward,
        customerPhone,
        customerName,
        customerRole === 'member' ? 'ANGGOTA' : 'PENGUNJUNG'
      );
      if (res.success) {
        setFeedback({ message: res.message, type: 'success' });
      } else {
        setFeedback({ message: res.message, type: 'error' });
      }
    } catch (e) {
      setFeedback({ message: 'Terjadi kesalahan saat menukarkan point.', type: 'error' });
    } finally {
      setIsRedeeming(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Program Loyalitas Pelanggan
          </div>

          <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            ⭐ Point Pembelian Saya
          </h3>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            Kumpulkan point dari setiap belanja sembako yang berhasil dan tukarkan dengan berbagai hadiah menarik!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'balance'
                ? 'border-amber-600 text-amber-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Saldo & Ketentuan</span>
          </button>

          <button
            onClick={() => setActiveTab('redeem')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'redeem'
                ? 'border-amber-600 text-amber-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>🎁 Tukar Hadiah ({eligibleRewards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>📜 Riwayat Point ({transactions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: SALDO & KETENTUAN */}
          {activeTab === 'balance' && (
            <div className="space-y-4">
              {/* Golden Card Saldo Point */}
              <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">
                        Saldo Point Anda
                      </div>
                      <div className="text-3xl sm:text-4xl font-black mt-1 flex items-center gap-2">
                        ⭐ {currentBalance.toLocaleString('id-ID')} <span className="text-lg font-bold text-amber-200">Point</span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        customerRole === 'member' ? 'bg-emerald-900/40 text-emerald-100' : 'bg-blue-900/40 text-blue-100'
                      }`}
                    >
                      {customerRole === 'member' ? '👥 Anggota' : '👤 Basic'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20 text-center">
                    <div className="bg-white/10 rounded-xl p-2">
                      <div className="text-[10px] text-amber-100">Total Didapat</div>
                      <div className="text-sm sm:text-base font-black text-emerald-200">
                        +{(pointAccount?.totalEarned || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2">
                      <div className="text-[10px] text-amber-100">Total Ditukar</div>
                      <div className="text-sm sm:text-base font-black text-amber-200">
                        -{(pointAccount?.totalRedeemed || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2">
                      <div className="text-[10px] text-amber-100">Total Dipotong</div>
                      <div className="text-sm sm:text-base font-black text-red-200">
                        -{(pointAccount?.totalDeducted || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute right-2 bottom-0 text-white/10 text-9xl font-black select-none pointer-events-none">
                  ★
                </div>
              </div>

              {/* Info Ketentuan Perolehan Point Aktif */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-500" />
                  Aturan Program Point Saat Ini ({activeProgram?.name || 'Program Point'})
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    • <strong>Rasio Point:</strong> Setiap belanja kelipatan{' '}
                    <strong>Rp {(activeProgram?.spendPerPoint || 10000).toLocaleString('id-ID')}</strong> berhak
                    mendapatkan <strong>+{activeProgram?.pointsPerUnit || 1} Point</strong>.
                  </p>
                  {(activeProgram?.minPurchase || 0) > 0 && (
                    <p>
                      • <strong>Minimal Belanja:</strong> Rp{' '}
                      {(activeProgram?.minPurchase || 0).toLocaleString('id-ID')}.
                    </p>
                  )}
                  {activeProgram?.isPromoActive && (
                    <p className="text-amber-700 font-bold">
                      • 🌟 <strong>Event Promo Aktif:</strong> Double Point ({activeProgram.promoMultiplier || 2}x point)!
                    </p>
                  )}
                  <p>
                    • <strong>Pemberian Otomatis:</strong> Point langsung masuk ke akun Anda saat pesanan belanja berstatus <strong>Selesai</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    *Point bukan uang tunai dan dapat ditukarkan dengan hadiah voucher atau produk sembako di tab "Tukar Hadiah".
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('redeem')}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all"
                >
                  <Gift className="w-4 h-4" />
                  <span>Lihat Katalog Hadiah & Tukar Point</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TUKAR HADIAH */}
          {activeTab === 'redeem' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span>Saldo Point Anda Saat Ini:</span>
                <span className="font-black text-amber-800 text-sm">⭐ {currentBalance} Point</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eligibleRewards.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-slate-400 text-xs font-semibold">
                    Belum ada hadiah penukaran point yang aktif saat ini.
                  </div>
                ) : (
                  eligibleRewards.map((rew) => {
                    const isEnough = currentBalance >= rew.pointsCost;
                    return (
                      <div
                        key={rew.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-amber-300 transition-all shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                              ⭐ {rew.pointsCost} Point
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Sisa kuota: {(rew.quota || 0) - (rew.usedCount || 0)}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm">{rew.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {rew.rewardType === 'discount_nominal' && `Potongan belanja Rp ${(rew.discountValue || 0).toLocaleString('id-ID')}`}
                            {rew.rewardType === 'discount_percentage' && `Diskon ${rew.discountValue}% (Maks. Rp ${(rew.maxDiscount || 0).toLocaleString('id-ID')})`}
                            {rew.rewardType === 'free_shipping' && `Potongan ongkir hingga Rp ${(rew.freeShippingCap || 10000).toLocaleString('id-ID')}`}
                            {rew.rewardType === 'product_gift' && `Hadiah sembako: ${rew.rewardProductEmoji || '🎁'} ${rew.rewardProductName}`}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={!isEnough || isRedeeming === rew.id}
                            onClick={() => handleRedeem(rew)}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              isEnough
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>
                              {isRedeeming === rew.id
                                ? 'Memproses...'
                                : isEnough
                                ? 'Tukarkan Sekarang'
                                : `Kurang ${rew.pointsCost - currentBalance} Point`}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT TRANSAKSI POINT */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  Belum ada catatan mutasi point. Kumpulkan point dengan menyelesaikan transaksi belanja Anda!
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{tx.notes}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {tx.orderNumber && `• No. Pesanan #${tx.orderNumber}`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-black text-sm ${
                            tx.points > 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {tx.points > 0 ? `+${tx.points}` : tx.points} Point
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Saldo: ⭐ {tx.balanceAfter}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Koperasi Desa Merah Putih Cengkareng Timur
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
