import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  User,
  ArrowUpRight,
  Edit3,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberRecord } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, WA_NUMBER } from '../lib/firebase';
import { INITIAL_MEMBERS } from '../data/initialStaffMemberData';
import { calculateAge } from '../services/accountService';

interface MemberViewProps {
  onOpenCatalog?: () => void;
  onOpenAuth?: () => void;
  onOpenUpgrade?: () => void;
  onOpenProfile?: () => void;
}

export const MemberView: React.FC<MemberViewProps> = ({ 
  onOpenCatalog, 
  onOpenAuth,
  onOpenUpgrade,
  onOpenProfile 
}) => {
  const { user, isStaff } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Sync with Firestore members collection in real-time
  useEffect(() => {
    const membersRef = collection(db, 'members');
    const unsub = onSnapshot(
      membersRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: MemberRecord[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<MemberRecord, 'id'>) });
          });
          setMembers(list);
        } else {
          setMembers(INITIAL_MEMBERS);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Member fetch fallback:', error);
        setMembers(INITIAL_MEMBERS);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const isVisitor = user && user.accountStatus === 'PENGUNJUNG';
  const isMember = user && (user.accountStatus === 'ANGGOTA' || user.role === 'member');

  // Find active member record or construct from user data
  const currentMember = user 
    ? members.find(m => 
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
        (m.name && user.displayName && m.name.toLowerCase().includes(user.displayName.toLowerCase())) ||
        (m.phone && user.phone && m.phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''))
      ) || {
        id: 'mem_user',
        memberNumber: user.memberNumber || 'KMP-ANG-001',
        name: user.displayName || 'Ibu Rina Kartika',
        nik: user.nik || '3174065509890002',
        phone: user.phone || '0812-3456-7890',
        email: user.email || 'ibu.rina@gmail.com',
        address: user.address || 'Jl. Cengkareng Timur No. 42, Jakarta Barat',
        status: 'active' as const,
        joinedDate: '12 Januari 2024'
      }
    : (members[0] || INITIAL_MEMBERS[0]);

  const handleCopyNumber = () => {
    const num = user?.memberNumber || currentMember?.memberNumber;
    if (num) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAccountId = () => {
    const accId = user?.accountId || 'ACC-000001';
    navigator.clipboard.writeText(accId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{isVisitor ? 'Akun Pengunjung Website' : 'Menu Anggota Resmi'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {isVisitor ? 'Profil & Identitas Akun Pengunjung' : 'Kartu & Data Anggota Koperasi'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          {isVisitor
            ? 'Setiap akun memiliki ID Akun Internal tetap. Upgrade kapan saja ke Anggota Koperasi tanpa membuat akun baru.'
            : 'Data identitas keanggotaan terverifikasi yang terhubung langsung dengan sistem administrasi pengurus/karyawan gerai.'}
        </p>
      </div>

      {/* VISITOR ACCOUNT VIEW */}
      {isVisitor && (
        <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Status: Pengunjung
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {user.displayName || 'Pengunjung Koperasi'}
              </h2>
              <p className="text-xs text-blue-200">
                Terdaftar dengan nomor HP: <strong className="font-mono text-white">{user.phone}</strong>
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] text-blue-200 font-bold block uppercase tracking-wider">
                ID Akun Internal Tetap:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xl text-yellow-300">
                  {user.accountId || 'ACC-000001'}
                </span>
                <button
                  onClick={handleCopyAccountId}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Salin ID Akun Internal"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-blue-300">ID ini tidak akan berubah saat upgrade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] text-blue-300 block font-semibold">Usia Terhitung:</span>
              <span className="text-base font-bold text-white">
                🎂 {user.birthDate ? `${calculateAge(user.birthDate)} Tahun` : '-'}
              </span>
              <p className="text-[10px] text-blue-300 truncate">{user.birthPlace || ''} {user.birthDate || ''}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] text-blue-300 block font-semibold">Diskon Basic:</span>
              <span className="text-base font-bold text-emerald-400">
                🏷️ Aktif di Katalog
              </span>
              <p className="text-[10px] text-blue-300">Promo khusus akun Basic</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] text-blue-300 block font-semibold">Keuntungan Anggota:</span>
              <span className="text-base font-bold text-yellow-300">
                ⭐ Diskon Lebih Besar
              </span>
              <p className="text-[10px] text-blue-300">Voucher & Nomor Anggota resmi</p>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-yellow-300 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Ingin Mendapatkan Nomor Anggota & Diskon Penuh?</span>
              </h4>
              <p className="text-xs text-blue-100 max-w-xl">
                Cukup masukkan Nomor Anggota yang Anda miliki atau ajukan ke Koperasi. Akun Basic Anda akan otomatis di-upgrade tanpa perlu registrasi ulang.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profil</span>
                </button>
              )}
              {onOpenUpgrade && (
                <button
                  onClick={onOpenUpgrade}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/40 transition-all hover:scale-105"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Upgrade ke Anggota</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Banner: Read-Only Notice (For Members) */}
      {!isVisitor && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-amber-950">
              🔒 Hak Akses Anggota Resmi
            </p>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Nomor Anggota Anda telah diverifikasi oleh Koperasi Desa Merah Putih. Anda berhak menikmati diskon anggota dan promo khusus sembako warga.
            </p>
          </div>
        </div>
      )}

      {/* Main Digital Member Card (For Anggota or Not Logged In Preview) */}
      {!isVisitor && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Card Visual Presentation */}
          <div className="md:col-span-7">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-800 via-red-700 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-red-500/20 space-y-6">
              
              {/* Card Background Pattern & Watermark */}
              <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none"></div>
              <div className="absolute right-4 top-4 text-6xl font-black text-white/5 select-none pointer-events-none">
                MERAH PUTIH
              </div>

              {/* Top Card Header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-red-700 flex items-center justify-center font-black text-base shadow-md">
                    MP
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-wide">KOPERASI MERAH PUTIH</h3>
                    <p className="text-[10px] text-red-200 font-medium">Gerai Sembako Cengkareng Timur</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Anggota Aktif
                </span>
              </div>

              {/* Card Chip & Hologram look */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-400 shadow-inner flex items-center justify-center">
                    <div className="w-7 h-5 border border-amber-600/30 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                      <div className="bg-amber-600/20 rounded-xs"></div>
                      <div className="bg-amber-600/20 rounded-xs"></div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">
                    DIGITAL IDENTITY PASS
                  </span>
                </div>

                {/* ID Akun Internal Badge */}
                <span className="font-mono text-xs text-red-200 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                  ID: {user?.accountId || 'ACC-000001'}
                </span>
              </div>

              {/* Card Numbers & Names */}
              <div className="space-y-4 relative z-10 pt-2">
                <div>
                  <p className="text-[10px] font-bold text-red-200 uppercase tracking-wider">
                    Nomor Anggota Koperasi
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xl sm:text-2xl font-mono font-black tracking-wider text-amber-300">
                      {user?.memberNumber || currentMember?.memberNumber || 'KMP-ANG-001'}
                    </p>
                    <button
                      onClick={handleCopyNumber}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Salin Nomor Anggota"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-red-200 uppercase tracking-wider">
                      Nama Anggota
                    </p>
                    <p className="text-sm font-black text-white truncate mt-0.5">
                      {user?.displayName || currentMember?.name || 'Ibu Rina Kartika'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-200 uppercase tracking-wider">
                      Wilayah Layanan
                    </p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">
                      Cengkareng Timur
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Bottom QR & Verification */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-red-200 relative z-10">
                <span className="font-mono">ID Internal: {user?.accountId || 'ACC-000001'}</span>
                <span className="flex items-center gap-1 text-emerald-300 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Terhubung ke Data Karyawan
                </span>
              </div>

            </div>
          </div>

          {/* Right Details Panel */}
          <div className="md:col-span-5 space-y-4">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">
                  Rincian Data Akun
                </h3>
                {user && onOpenProfile && (
                  <button
                    onClick={onOpenProfile}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profil</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                {/* ID Internal */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                    ID Akun Internal (Tetap)
                  </div>
                  <div className="font-mono font-black text-slate-900 text-sm flex items-center justify-between">
                    <span>{user?.accountId || 'ACC-000001'}</span>
                    <button
                      onClick={handleCopyAccountId}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-700 flex items-center gap-1"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                    Nama Lengkap Anggota
                  </div>
                  <div className="font-black text-slate-900 text-sm">
                    {user?.displayName || currentMember?.name}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                    Nomor Anggota (ID Koperasi)
                  </div>
                  <div className="font-mono font-black text-red-700 text-sm flex items-center justify-between">
                    <span>{user?.memberNumber || currentMember?.memberNumber}</span>
                    <button
                      onClick={handleCopyNumber}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-700 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                    Status Data & Sinkronisasi
                  </div>
                  <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tersinkron Real-time dari Panel Karyawan</span>
                  </div>
                </div>

                {(user?.phone || currentMember?.phone) && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                      No. WhatsApp Terdaftar
                    </div>
                    <div className="font-medium text-slate-800">
                      {user?.phone || currentMember.phone}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {onOpenCatalog && (
                  <button
                    onClick={onOpenCatalog}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Belanja Sembako dengan Akun Anggota</span>
                  </button>
                )}

                <a
                  href={`https://wa.me/${WA_NUMBER}?text=Halo%20Admin%20Koperasi%20Merah%20Putih,%20saya%20anggota%20dengan%20Nomor%20${encodeURIComponent(user?.memberNumber || currentMember?.memberNumber || '')}%20(${encodeURIComponent(user?.displayName || currentMember?.name || '')})%20ingin%20mengonfirmasi%20data%20keanggotaan.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hubungi Karyawan via WhatsApp</span>
                </a>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Member Benefits Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Keuntungan Menjadi Anggota Koperasi Merah Putih</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              🏷️
            </div>
            <h4 className="font-black text-slate-900 text-xs">Harga Khusus & Voucher</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Klaim voucher potongan harga belanja sembako langsung di keranjang belanja digital.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              🛵
            </div>
            <h4 className="font-black text-slate-900 text-xs">Prioritas Pengantaran Warga</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pesanan anggota diproses lebih cepat oleh tim operasional gerai Cengkareng Timur.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              🤝
            </div>
            <h4 className="font-black text-slate-900 text-xs">Bagi Hasil & Gotong Royong</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Mendukung kemandirian pangan dan perekonomian desa/kelurahan Merah Putih.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
