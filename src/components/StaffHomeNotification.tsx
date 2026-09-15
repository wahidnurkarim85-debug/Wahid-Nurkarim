import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StaffHomeNotificationProps {
  onOpenAdmin: (subTab?: 'products' | 'vouchers' | 'employees' | 'members' | 'staffInfo') => void;
}

export const StaffHomeNotification: React.FC<StaffHomeNotificationProps> = ({ onOpenAdmin }) => {
  const { user, isStaff, isManager } = useAuth();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!isStaff || !user || isDismissed) {
    return null;
  }

  const userEmail = user.email || 'WahidNurkarim85@gmail.com';
  const displayName = user.displayName || 'Wakhid Nur Kharim';
  const roleName = isManager 
    ? 'Manager Koperasi Desa (Otoritas Penuh)' 
    : (user.position || 'Karyawan Gerai Sembako');

  return (
    <section 
      aria-label="Notifikasi Akun Karyawan"
      className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b border-emerald-500/30 px-4 sm:px-6 lg:px-8 py-3.5 relative shadow-md transition-all animate-fade-in"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Main Info Section */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {/* Google / Staff Icon */}
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sesi Karyawan Aktif
                </span>
                
                {/* Tanda Akun Email yang Dipakai Badge */}
                <div 
                  id="staff-active-email-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-slate-900 font-bold text-xs shadow-xs border border-emerald-300"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-600 text-[11px] font-normal">Tanda Email:</span>
                  <span className="font-black text-emerald-950 font-mono tracking-tight">{userEmail}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>

                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600/60 text-emerald-100 border border-emerald-400/30 uppercase">
                  {isManager ? 'Manager' : 'Karyawan'}
                </span>
              </div>

              {!isMinimized && (
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-200 leading-snug">
                    Selamat bertugas, <strong className="text-white">{displayName}</strong>. Anda sedang aktif di sistem dengan hak akses <strong className="text-emerald-300">{roleName}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Dismiss */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              id="staff-banner-btn-admin"
              onClick={() => onOpenAdmin('employees')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Karyawan</span>
            </button>

            <button
              id="staff-banner-btn-products"
              onClick={() => onOpenAdmin('products')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Panel Admin</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              title={isMinimized ? 'Perluas detail' : 'Kecilkan baris'}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Dismiss Button */}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Tutup notifikasi ini"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
