import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Eye,
  EyeOff,
  ArrowRight,
  HelpCircle,
  Users,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculateAge, fetchAccountsFromFirestore } from '../services/accountService';
import { INITIAL_MEMBERS } from '../data/initialStaffMemberData';

const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  onSuccess 
}) => {
  const { 
    loginWithPhone, 
    login, 
    registerVisitorAccount, 
    loginAsManager, 
    loginWithGoogle,
    loading 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'google'>('phone');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Google Login & Gmail States
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');

  // Login Form Fields
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register Form Fields (Pengunjung)
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regGender, setRegGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [regBirthPlace, setRegBirthPlace] = useState<string>('');
  const [regBirthDate, setRegBirthDate] = useState<string>('');
  const [regAddress, setRegAddress] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // Validation feedback
  const [phoneDupStatus, setPhoneDupStatus] = useState<'idle' | 'checking' | 'duplicate' | 'valid'>('idle');
  const [emailDupStatus, setEmailDupStatus] = useState<'idle' | 'checking' | 'duplicate' | 'valid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [regSuccessData, setRegSuccessData] = useState<{ accountId: string; name: string } | null>(null);

  // Next Account ID counter preview
  const [previewId, setPreviewId] = useState<string>('ACC-000001');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setLoginMethod('phone');
      setErrorMessage('');
      setRegSuccessData(null);
      setShowPassword(false);
      
      // Fetch latest accounts to compute preview ID
      fetchAccountsFromFirestore().then((accs) => {
        let max = 0;
        accs.forEach((a) => {
          const m = a.accountId?.match(/ACC-(\d+)/);
          if (m && m[1]) {
            const num = parseInt(m[1], 10);
            if (num > max) max = num;
          }
        });
        setPreviewId(`ACC-${String(max + 1).padStart(6, '0')}`);
      });
    }
  }, [isOpen, initialMode]);

  // Live Phone Duplication Check for Register
  useEffect(() => {
    if (mode !== 'register') return;
    const cleanPhone = regPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setPhoneDupStatus('idle');
      return;
    }

    setPhoneDupStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const accs = await fetchAccountsFromFirestore();
        const found = accs.find((a) => a.phone.replace(/[^0-9]/g, '') === cleanPhone);
        const inMembers = INITIAL_MEMBERS.find((m) => m.phone.replace(/[^0-9]/g, '') === cleanPhone);
        
        if (found || inMembers) {
          setPhoneDupStatus('duplicate');
        } else {
          setPhoneDupStatus('valid');
        }
      } catch {
        setPhoneDupStatus('valid');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [regPhone, mode]);

  // Live Email Duplication Check for Register
  useEffect(() => {
    if (mode !== 'register' || !regEmail.trim()) {
      setEmailDupStatus('idle');
      return;
    }
    const cleanEmail = regEmail.trim().toLowerCase();
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!isValidFormat) {
      setEmailDupStatus('idle');
      return;
    }

    setEmailDupStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const accs = await fetchAccountsFromFirestore();
        const found = accs.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
        if (found) {
          setEmailDupStatus('duplicate');
        } else {
          setEmailDupStatus('valid');
        }
      } catch {
        setEmailDupStatus('valid');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [regEmail, mode]);

  if (!isOpen) return null;

  // Age calculation
  const calculatedAge = regBirthDate ? calculateAge(regBirthDate) : 0;

  // Validation checks for register form
  const isNameValid = regName.trim().length >= 3;
  const isPhoneValid = regPhone.replace(/[^0-9]/g, '').length >= 8 && phoneDupStatus !== 'duplicate';
  const isGenderValid = Boolean(regGender);
  const isBirthPlaceValid = regBirthPlace.trim().length >= 2;
  const isBirthDateValid = Boolean(regBirthDate) && calculatedAge >= 0;
  const isAddressValid = regAddress.trim().length >= 5;
  const isPasswordValid = regPassword.length >= 6;
  const isConfirmPasswordValid = regConfirmPassword === regPassword && isPasswordValid;
  const isEmailValid = !regEmail.trim() || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim()) && emailDupStatus !== 'duplicate');

  const isFormCompleteAndValid = 
    isNameValid &&
    isPhoneValid &&
    isGenderValid &&
    isBirthPlaceValid &&
    isBirthDateValid &&
    isAddressValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    isEmailValid;

  // Handle Google Login Trigger
  const handleGoogleLoginClick = async (targetEmail?: string) => {
    setErrorMessage('');
    try {
      const profile = await loginWithGoogle(targetEmail);
      if (profile) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk menggunakan Akun Google.');
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      if (loginMethod === 'phone') {
        const clean = loginPhone.replace(/[^0-9]/g, '');
        if (!clean || clean.length < 8) {
          throw new Error('Masukkan nomor HP yang valid (minimal 8-15 digit).');
        }
        await loginWithPhone(loginPhone, loginPassword);
      } else {
        // Handled directly via handleGoogleLoginClick
        await handleGoogleLoginClick(customGoogleEmail || undefined);
        return;
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk. Periksa kembali data Anda.');
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isFormCompleteAndValid) {
      setErrorMessage('Harap lengkapi semua kolom wajib dengan data yang benar sebelum mendaftar.');
      return;
    }

    try {
      const newAcc = await registerVisitorAccount({
        name: regName.trim(),
        phone: regPhone,
        pass: regPassword,
        gender: regGender,
        birthPlace: regBirthPlace.trim(),
        birthDate: regBirthDate,
        address: regAddress.trim(),
        email: regEmail.trim() || undefined,
      });

      setRegSuccessData({
        accountId: newAcc.accountId || previewId,
        name: newAcc.displayName || regName,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    }
  };

  // Quick Demo fill buttons for reviewers
  const handleFillDemo = (type: 'pengunjung' | 'anggota' | 'manager') => {
    setMode('login');
    setErrorMessage('');
    if (type === 'pengunjung') {
      setLoginMethod('phone');
      setLoginPhone('081299887766');
      setLoginPassword('password123');
    } else if (type === 'anggota') {
      setLoginMethod('phone');
      setLoginPhone('081234567890');
      setLoginPassword('password123');
    } else if (type === 'manager') {
      setLoginMethod('google');
      handleGoogleLoginClick('WahidNurkarim85@gmail.com');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-black text-sm">
              MP
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-100">
              Koperasi Desa Merah Putih
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {mode === 'login' ? 'Masuk ke Akun Anda' : 'Pendaftaran Akun Pengunjung'}
          </h2>
          <p className="text-xs text-red-100 mt-1">
            {mode === 'login' 
              ? 'Gunakan Nomor HP dan Kata Sandi untuk mengakses akun Pengunjung atau Anggota.'
              : 'Daftar sebagai Pengunjung untuk menikmati belanja mudah dan upgrade ke Anggota kapan saja.'}
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex bg-black/20 p-1 rounded-xl mt-4 max-w-xs">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'login' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'register' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* LOGIN FORM                                              */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <div className="space-y-4">
              
              {/* Login Method Toggle: Nomor HP vs Masuk Akun Google */}
              <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('phone'); setErrorMessage(''); }}
                  className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <span>Nomor HP (Utama)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('google'); setErrorMessage(''); }}
                  className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginMethod === 'google'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GoogleLogo className="w-4 h-4 shrink-0" />
                  <span>Masuk Akun Google</span>
                </button>
              </div>

              {/* Login via Phone (Nomor HP & Password) */}
              {loginMethod === 'phone' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Phone Field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Nomor HP Terdaftar <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="Contoh: 081299887766"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 font-mono transition-all"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Nomor HP yang didaftarkan saat membuat akun Pengunjung / Anggota.
                    </p>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Masukkan kata sandi akun"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-900/20 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                          <span>Sedang Masuk...</span>
                        </>
                      ) : (
                        <>
                          <span>Masuk ke Akun</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Demo Test Selector */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Akun Contoh Siap Pakai (Klik 1 Kali untuk Mengisi):</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleFillDemo('pengunjung')}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-left transition-colors cursor-pointer"
                      >
                        <p className="font-extrabold">👤 Akun Basic</p>
                        <p className="text-[10px] text-blue-700 font-mono truncate">ACC-000001 (Budi)</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFillDemo('anggota')}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 text-left transition-colors cursor-pointer"
                      >
                        <p className="font-extrabold">👥 Anggota</p>
                        <p className="text-[10px] text-red-700 font-mono truncate">ACC-000003 (Rina)</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFillDemo('manager')}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-left transition-colors cursor-pointer"
                      >
                        <p className="font-extrabold">🛡️ Karyawan</p>
                        <p className="text-[10px] text-emerald-700 truncate">Manager Gerai</p>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Login via Google (Email & Password removed, Google Account picker with automatic access grant) */}
              {loginMethod === 'google' && (
                <div className="space-y-4">
                  {/* Initial Google Login Button & Visitor Gmail Selector */}
                  <div className="space-y-4">
                    {/* Big Google button matching screenshot */}
                    <button
                      type="button"
                      onClick={() => handleGoogleLoginClick()}
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl sm:rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none group"
                    >
                      <GoogleLogo className="w-5 h-5 group-hover:scale-105 transition-transform" />
                      <span>Masuk Akun Google</span>
                    </button>

                      {/* Visitor Gmail Account Picker */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-red-600" />
                            <span>Pilih Akun Gmail Basic:</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Klik = Otomatis Masuk & Beri Akses
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Alamat email dan kata sandi otomatis diverifikasi lewat Google. Klik salah satu akun Gmail Basic berikut untuk langsung masuk dan mendapatkan ID Akun Internal:
                        </p>

                        {/* List of visitor Gmail accounts */}
                        <div className="space-y-1.5">
                          {/* Wahid (Manager) */}
                          <button
                            type="button"
                            onClick={() => handleGoogleLoginClick('WahidNurkarim85@gmail.com')}
                            disabled={loading}
                            className="w-full p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                W
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                                  WahidNurkarim85@gmail.com
                                </p>
                                <p className="text-[10px] text-emerald-700 font-medium truncate">
                                  Wakhid Nur Kharim • Manager Gerai Koperasi (ACC-000000)
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 px-2 py-1 rounded bg-emerald-100/70 shrink-0 ml-2 border border-emerald-200">
                              Masuk & Beri Akses
                            </span>
                          </button>

                          {/* Budi Santoso (Pengunjung ACC-000001) */}
                          <button
                            type="button"
                            onClick={() => handleGoogleLoginClick('budi.santoso@gmail.com')}
                            disabled={loading}
                            className="w-full p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                B
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                                  budi.santoso@gmail.com
                                </p>
                                <p className="text-[10px] text-blue-700 font-mono truncate">
                                  Budi Santoso • ID: ACC-000001 (Pengunjung)
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 px-2 py-1 rounded bg-blue-100/70 shrink-0 ml-2 border border-blue-200">
                              Masuk & Beri Akses
                            </span>
                          </button>

                          {/* Dewi Lestari (Pengunjung ACC-000002) */}
                          <button
                            type="button"
                            onClick={() => handleGoogleLoginClick('dewi.lestari@gmail.com')}
                            disabled={loading}
                            className="w-full p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                D
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                                  dewi.lestari@gmail.com
                                </p>
                                <p className="text-[10px] text-blue-700 font-mono truncate">
                                  Dewi Lestari • ID: ACC-000002 (Pengunjung)
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 px-2 py-1 rounded bg-blue-100/70 shrink-0 ml-2 border border-blue-200">
                              Masuk & Beri Akses
                            </span>
                          </button>

                          {/* Ibu Rina Kartika (Anggota ACC-000003) */}
                          <button
                            type="button"
                            onClick={() => handleGoogleLoginClick('ibu.rina@gmail.com')}
                            disabled={loading}
                            className="w-full p-2.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                                R
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-red-900 truncate">
                                  ibu.rina@gmail.com
                                </p>
                                <p className="text-[10px] text-red-700 font-mono truncate">
                                  Ibu Rina Kartika • ID: ACC-000003 (Anggota)
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-red-700 px-2 py-1 rounded bg-red-100/70 shrink-0 ml-2 border border-red-200">
                              Masuk & Beri Akses
                            </span>
                          </button>
                        </div>

                        {/* Custom Visitor Gmail Input */}
                        <div className="pt-2 border-t border-slate-200/80">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Atau Masuk dengan Gmail Basic Lainnya:
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="email"
                                value={customGoogleEmail}
                                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                                placeholder="nama.basic@gmail.com"
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 font-mono"
                              />
                              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (customGoogleEmail && customGoogleEmail.includes('@')) {
                                  handleGoogleLoginClick(customGoogleEmail);
                                } else {
                                  setErrorMessage('Harap ketik alamat Gmail Basic yang valid.');
                                }
                              }}
                              disabled={loading}
                              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 transition-colors shadow-2xs cursor-pointer"
                            >
                              Masuk & Beri Akses
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Gmail baru akan langsung dibuatkan akun Basic dengan ID tetap (ACC-XXXXXX) yang tersimpan aman di database.
                          </p>
                        </div>
                      </div>
                    </div>
                </div>
              )}

              {/* Switch to Register */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrorMessage(''); }}
                    className="font-bold text-red-700 hover:text-red-800 underline cursor-pointer"
                  >
                    Daftar Akun Pengunjung Baru
                  </button>
                </p>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* REGISTER VISITOR FORM                                    */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <>
              {regSuccessData ? (
                <div className="text-center py-6 space-y-4 animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      🎉 Pendaftaran Berhasil!
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                      Selamat datang di Koperasi Desa Merah Putih, <strong>{regSuccessData.name}</strong>!
                    </p>
                  </div>

                  {/* ID Akun Internal Display */}
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">ID Akun Internal Tetap:</span>
                      <span className="font-mono font-black text-base text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300">
                        {regSuccessData.accountId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Status Akun:</span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        👤 PENGUNJUNG TERDAFTAR
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    ID Akun Internal Anda bersifat tetap dan tersimpan aman di database. Anda sudah otomatis masuk ke dalam sistem.
                  </p>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
                  >
                    Mulai Berbelanja
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  
                  {/* Automatic Account ID & Status Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        Calon ID Akun Internal (Otomatis):
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {previewId}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                        👤 Pengunjung
                      </span>
                    </div>
                  </div>

                  {/* 1. Nama Lengkap (Wajib) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      {regName.trim().length >= 3 && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Data Valid
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    {regName.length > 0 && regName.trim().length < 3 && (
                      <p className="text-[10px] text-red-600">Nama minimal 3 karakter.</p>
                    )}
                  </div>

                  {/* 2. Nomor HP (Wajib + Duplication Check) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Nomor HP (Untuk Masuk Akun) <span className="text-red-500">*</span>
                      </label>
                      {phoneDupStatus === 'valid' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Nomor Tersedia
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="Contoh: 081299887766"
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-mono transition-all ${
                          phoneDupStatus === 'duplicate'
                            ? 'border-red-500 bg-red-50/40 text-red-900 focus:border-red-600'
                            : 'border-slate-300 focus:border-red-600'
                        }`}
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    {phoneDupStatus === 'checking' && (
                      <p className="text-[10px] text-blue-600">Memeriksa ketersediaan nomor HP...</p>
                    )}
                    {phoneDupStatus === 'duplicate' && (
                      <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Nomor HP sudah terdaftar. Gunakan nomor HP lain atau masuk ke akun Anda.
                      </p>
                    )}
                  </div>

                  {/* 3. Jenis Kelamin (Wajib) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Jenis Kelamin <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                        regGender === 'Laki-laki' 
                          ? 'border-red-600 bg-red-50/60 font-bold text-red-900' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="gender"
                          value="Laki-laki"
                          checked={regGender === 'Laki-laki'}
                          onChange={() => setRegGender('Laki-laki')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Laki-laki</span>
                      </label>

                      <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                        regGender === 'Perempuan' 
                          ? 'border-red-600 bg-red-50/60 font-bold text-red-900' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="gender"
                          value="Perempuan"
                          checked={regGender === 'Perempuan'}
                          onChange={() => setRegGender('Perempuan')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Perempuan</span>
                      </label>
                    </div>
                  </div>

                  {/* 4. Tempat Lahir & Tanggal Lahir (Wajib + Usia Otomatis) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Tempat Lahir <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regBirthPlace}
                        onChange={(e) => setRegBirthPlace(e.target.value)}
                        placeholder="Contoh: Jakarta"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700">
                          Tanggal Lahir <span className="text-red-500">*</span>
                        </label>
                        {calculatedAge > 0 && (
                          <span className="text-[10px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            Usia: {calculatedAge} Thn
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={regBirthDate}
                        onChange={(e) => setRegBirthDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600"
                      />
                    </div>
                  </div>

                  {/* 5. Alamat Lengkap (Wajib) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Alamat Lengkap <span className="text-red-500">*</span>
                      </label>
                      {regAddress.trim().length >= 5 && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Contoh: Jl. Bangun Nusa Raya No. 12, RT 02/RW 03, Cengkareng Timur"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600"
                    />
                  </div>

                  {/* 6. Email (Opsional) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Alamat Email <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      {emailDupStatus === 'valid' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Email Tersedia
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    {emailDupStatus === 'duplicate' && (
                      <p className="text-[10px] text-red-600 font-bold">
                        Email ini sudah terdaftar pada akun lain.
                      </p>
                    )}
                  </div>

                  {/* 7. Password & Confirm Password (Wajib) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-red-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Konfirmasi Sandi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Ulangi sandi"
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          regConfirmPassword && regConfirmPassword !== regPassword
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-slate-300 focus:border-red-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password match check message */}
                  {regConfirmPassword && regConfirmPassword !== regPassword && (
                    <p className="text-[10px] text-red-600 font-bold">
                      Konfirmasi kata sandi tidak cocok.
                    </p>
                  )}

                  {/* Security Note */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Kata sandi disimpan terenkripsi dengan aman (SHA-256 Hash).</span>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !isFormCompleteAndValid}
                      className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                        isFormCompleteAndValid && !loading
                          ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-red-900/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                          <span>Memproses Pendaftaran...</span>
                        </>
                      ) : (
                        <>
                          <span>Daftar Akun Pengunjung Sekarang</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Switch to Login */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-600">
                      Sudah punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setErrorMessage(''); }}
                        className="font-bold text-red-700 hover:text-red-800 underline"
                      >
                        Masuk di sini
                      </button>
                    </p>
                  </div>

                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
