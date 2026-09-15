import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Copy, 
  Check, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculateAge } from '../services/accountService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgradeModal
}) => {
  const { user, updateAccountProfileData, loading } = useAuth();

  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setGender(user.gender || 'Laki-laki');
      setBirthPlace(user.birthPlace || '');
      setBirthDate(user.birthDate || '');
      setAddress(user.address || '');
      setSaveSuccess(false);
      setErrorMessage('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const currentAge = calculateAge(birthDate || user.birthDate || '');
  const isVisitor = user.accountStatus === 'PENGUNJUNG' || user.role === 'visitor';
  const isMember = user.accountStatus === 'ANGGOTA' || user.role === 'member';

  const handleCopyId = () => {
    if (user.accountId) {
      navigator.clipboard.writeText(user.accountId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      await updateAccountProfileData({
        displayName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender,
        birthPlace: birthPlace.trim(),
        birthDate,
        address: address.trim(),
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan profil.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg ${
              isMember ? 'bg-red-600' : 'bg-blue-600'
            }`}>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {user.displayName || 'Pengguna Koperasi'}
                </h2>
                {isMember ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/30 border border-red-400/40 text-red-200 text-[10px] font-bold">
                    Anggota
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-bold">
                    Pengunjung
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {user.phone || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* 🔐 ID Akun Internal Tetap Box */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>ID Akun Internal Tetap (Sistem)</span>
              </span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin ID</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
                {user.accountId || 'ACC-000001'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                Tetap & Tidak Berubah
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ID Akun Internal ini dibuat otomatis saat Anda pertama kali mendaftar. ID ini menjadi identitas utama akun Anda di seluruh transaksi, keranjang, dan riwayat pesanan.
            </p>
          </div>

          {/* ⬆️ Prominent Upgrade Banner if PENGUNJUNG */}
          {isVisitor && (
            <div className="bg-gradient-to-r from-red-700 to-rose-600 text-white rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-200 text-xs font-bold mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Status Saat Ini: Akun Basic</span>
                  </div>
                  <h4 className="font-black text-base text-white">
                    Upgrade ke Anggota Resmi Koperasi
                  </h4>
                  <p className="text-xs text-red-100 mt-0.5 max-w-sm">
                    Dapatkan harga sembako subsidi anggota, promo beli 2 gratis 1, dan voucher eksklusif. ID Akun Anda tetap sama!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenUpgradeModal) onOpenUpgradeModal();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>⬆️ Upgrade Akun Sekarang</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Member Status Badge if ANGGOTA */}
          {isMember && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-950 text-sm">
                    Anggota Resmi Koperasi Merah Putih
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">
                    Terverifikasi
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Nomor Anggota Terdaftar: <strong className="font-mono text-slate-900">{user.memberNumber || 'KMP-ANG-001'}</strong>
                </p>
                {user.upgradedAt && (
                  <p className="text-[11px] text-emerald-700">
                    Tanggal Upgrade: {user.upgradedAt}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Data profil akun berhasil disimpan dan disinkronkan!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Profile Form Details */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-red-600" />
                <span>Informasi Data Pribadi</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-red-700 hover:text-red-800 transition-colors"
              >
                {isEditing ? 'Batal Edit' : '✏️ Ubah Data'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold">Nama Lengkap</label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                  />
                ) : (
                  <p className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {user.displayName || '-'}
                  </p>
                )}
              </div>

              {/* Nomor HP */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold">Nomor HP (Login)</label>
                <p className="font-mono font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {user.phone || '-'}
                </p>
              </div>

              {/* Jenis Kelamin */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold">Jenis Kelamin</label>
                {isEditing ? (
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                ) : (
                  <p className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {user.gender || 'Laki-laki'}
                  </p>
                )}
              </div>

              {/* Tempat Lahir */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold">Tempat Lahir</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Jakarta"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                  />
                ) : (
                  <p className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {user.birthPlace || '-'}
                  </p>
                )}
              </div>

              {/* Tanggal Lahir & Usia Otomatis */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-600 font-bold">Tanggal Lahir</label>
                  {currentAge > 0 && (
                    <span className="text-[10px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      Usia: {currentAge} Tahun
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                  />
                ) : (
                  <p className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {user.birthDate ? `${user.birthDate} (${currentAge} Tahun)` : '-'}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-slate-600 font-bold">Alamat Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                  />
                ) : (
                  <p className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100 truncate">
                    {user.email || '-'}
                  </p>
                )}
              </div>

            </div>

            {/* Alamat Lengkap */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-600 font-bold">Alamat Lengkap</label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-red-600"
                />
              ) : (
                <p className="font-medium text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {user.address || '-'}
                </p>
              )}
            </div>

            {/* Save Button when Editing */}
            {isEditing && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Data Profil</span>
                </button>
              </div>
            )}
          </form>

          {/* Timeline & Account History */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Riwayat Aktivitas & Perubahan Status</span>
            </h4>
            
            <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1 text-[11px]">
              <div>
                <p className="font-bold text-slate-800">Pendaftaran Akun Basic</p>
                <p className="text-slate-500">{user.createdAt || '01 September 2026'}</p>
              </div>
              {user.isUpgraded && (
                <div>
                  <p className="font-bold text-emerald-800">
                    Upgrade ke Anggota Resmi (No: {user.memberNumber})
                  </p>
                  <p className="text-emerald-600">{user.upgradedAt || '12 Januari 2024'}</p>
                </div>
              )}
              <div>
                <p className="font-bold text-slate-800">Terakhir Masuk / Login</p>
                <p className="text-slate-500">{user.lastLoginAt || 'Hari ini'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
