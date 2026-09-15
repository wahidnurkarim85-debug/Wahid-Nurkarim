import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  Lock,
  User,
  Phone,
  MapPin,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberRecord } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_MEMBERS } from '../data/initialStaffMemberData';
import { fetchAccountsFromFirestore } from '../services/accountService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, upgradeCurrentAccount, loading } = useAuth();

  const [memberNumberInput, setMemberNumberInput] = useState<string>('');
  const [verifStatus, setVerifStatus] = useState<'idle' | 'checking' | 'valid' | 'not_found' | 'blocked' | 'already_linked'>('idle');
  const [matchedMember, setMatchedMember] = useState<MemberRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMemberNumberInput('');
      setVerifStatus('idle');
      setMatchedMember(null);
      setErrorMessage('');
      setIsSuccess(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Live verification of Member Number
  useEffect(() => {
    const cleanNum = memberNumberInput.trim().toUpperCase();
    if (!cleanNum || cleanNum.length < 3) {
      setVerifStatus('idle');
      setMatchedMember(null);
      return;
    }

    setVerifStatus('checking');

    const timer = setTimeout(async () => {
      try {
        let found: MemberRecord | null = null;

        // 1. Search in Firestore members collection
        try {
          const snap = await getDocs(collection(db, 'members'));
          for (const d of snap.docs) {
            const data = d.data() as MemberRecord;
            if (data.memberNumber && data.memberNumber.trim().toUpperCase() === cleanNum) {
              found = { ...data, id: d.id };
              break;
            }
          }
        } catch (e) {
          console.warn('Firestore member check:', e);
        }

        // 2. Fallback to INITIAL_MEMBERS
        if (!found) {
          const init = INITIAL_MEMBERS.find(m => m.memberNumber.trim().toUpperCase() === cleanNum);
          if (init) found = { ...init };
        }

        if (!found) {
          setVerifStatus('not_found');
          setMatchedMember(null);
          return;
        }

        // Check if member is blocked / inactive
        if (
          found.status === 'inactive' ||
          found.status === 'blocked' ||
          found.status === 'Nonaktif' ||
          found.status === 'Terblokir' ||
          found.isLoginAllowed === false
        ) {
          setVerifStatus('blocked');
          setMatchedMember(found);
          return;
        }

        // Check if already linked to another account
        const allAccs = await fetchAccountsFromFirestore();
        const otherLinked = allAccs.find(
          a => a.memberNumber && 
               a.memberNumber.toUpperCase() === cleanNum && 
               a.accountId.toUpperCase() !== (user?.accountId || '').toUpperCase()
        );

        if (otherLinked) {
          setVerifStatus('already_linked');
          setMatchedMember(found);
          return;
        }

        setVerifStatus('valid');
        setMatchedMember(found);
      } catch (e) {
        setVerifStatus('not_found');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberNumberInput, user?.accountId]);

  if (!isOpen) return null;

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifStatus !== 'valid' || !memberNumberInput.trim()) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await upgradeCurrentAccount(memberNumberInput.trim());
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan upgrade akun.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Satu Akun = Satu ID Internal Tetap</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Upgrade Akun ke Anggota Resmi
          </h2>
          <p className="text-xs sm:text-sm text-red-100 mt-1">
            Ubah status akun Anda dari Pengunjung menjadi Anggota Koperasi tanpa membuat akun baru.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  🎉 Upgrade Akun Berhasil!
                </h3>
                <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                  Selamat! Akun Anda kini resmi berstatus <strong className="text-red-700 font-extrabold">ANGGOTA</strong> Koperasi Desa Merah Putih.
                </p>
              </div>

              {/* Account Card Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">ID Akun Internal (Tetap):</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {user?.accountId || 'ACC-000001'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Status Akun Sekarang:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    👥 ANGGOTA RESMI
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Nomor Anggota Terhubung:</span>
                  <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {memberNumberInput.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left">
                <p className="font-bold">✨ Manfaat Anggota Aktif:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Anda kini otomatis mendapatkan akses promo khusus anggota, harga beras murah subsidi anggota, dan potongan voucher belanja.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
              >
                Selesai & Lanjutkan Belanja
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpgradeSubmit} className="space-y-5">
              
              {/* Permanent ID Akun Internal Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">ID Akun Internal Anda (Tetap):</p>
                  <p className="font-mono font-black text-slate-900 text-sm sm:text-base">
                    {user?.accountId || 'ACC-000001'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                    👤 Pengunjung
                  </span>
                </div>
              </div>

              {/* Readonly Account Data Overview */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Akun:</span>
                  <strong className="text-slate-800 truncate block">{user?.displayName || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor HP Terdaftar:</span>
                  <strong className="text-slate-800 truncate block">{user?.phone || '-'}</strong>
                </div>
              </div>

              {/* Form Input: Nomor Anggota Koperasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nomor Anggota Koperasi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={memberNumberInput}
                    onChange={(e) => setMemberNumberInput(e.target.value)}
                    placeholder="Contoh: KMP-ANG-001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-sm font-mono font-semibold uppercase tracking-wider uppercase transition-all"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Nomor resmi yang diberikan oleh Pengurus / Karyawan Koperasi Merah Putih.
                </p>

                {/* Live Member Number Validation Indicator */}
                {verifStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                    <span>Memeriksa Nomor Anggota di database Koperasi...</span>
                  </div>
                )}

                {verifStatus === 'valid' && matchedMember && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Nomor Anggota Valid & Terverifikasi</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 pl-5.5">
                      Terdaftar di Koperasi atas nama: <strong>{matchedMember.name}</strong>
                    </p>
                  </div>
                )}

                {verifStatus === 'not_found' && (
                  <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nomor Anggota tidak ditemukan</p>
                      <p className="text-[11px] text-red-600 mt-0.5">
                        Pastikan nomor anggota sudah benar atau hubungi Karyawan Gerai untuk pendaftaran nomor anggota.
                      </p>
                    </div>
                  </div>
                )}

                {verifStatus === 'blocked' && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nomor Anggota Nonaktif / Terblokir</p>
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        Status keanggotaan ini dinonaktifkan oleh Pengurus. Silakan hubungi kantor gerai koperasi.
                      </p>
                    </div>
                  </div>
                )}

                {verifStatus === 'already_linked' && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nomor Anggota Sudah Digunakan</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Nomor anggota ini telah terhubung dengan ID Akun Internal lain. Satu nomor anggota hanya untuk satu akun.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample test numbers */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">Contoh Nomor Anggota Siap Pakai:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['KMP-ANG-001', 'KMP-ANG-002', 'KMP-ANG-003', 'KMP-ANG-004', 'KMP-ANG-005'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMemberNumberInput(num)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 font-mono text-[10px] font-bold text-slate-700 hover:text-red-700 transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Error Message */}
              {errorMessage && (
                <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || verifStatus !== 'valid'}
                  className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    verifStatus === 'valid' && !submitting
                      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-red-900/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Memproses Upgrade Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>⬆️ Konfirmasi Upgrade ke Anggota</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Batal & Kembali
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
