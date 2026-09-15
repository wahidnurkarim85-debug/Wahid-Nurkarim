import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs 
} from 'firebase/firestore';
import { 
  User, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  RefreshCw, 
  Clock, 
  Eye, 
  Edit, 
  Trash2, 
  X,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { AccountRecord } from '../types';
import { INITIAL_ACCOUNTS, calculateAge, formatIndonesianDateTime } from '../services/accountService';

export const AdminVisitorManager: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loginStatusFilter, setLoginStatusFilter] = useState<'ALL' | 'online' | 'offline'>('ALL');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'allowed' | 'restricted'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // ⚙️ Modal Kelola Detail
  const [manageAccount, setManageAccount] = useState<AccountRecord | null>(null);

  // ✏️ Modal Edit Data
  const [editAccount, setEditAccount] = useState<AccountRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    email: string;
    memberNumber: string;
    gender: 'Laki-laki' | 'Perempuan';
    birthPlace: string;
    birthDate: string;
    address: string;
    isLoginAllowed: boolean;
  }>({
    name: '',
    phone: '',
    email: '',
    memberNumber: '',
    gender: 'Laki-laki',
    birthPlace: '',
    birthDate: '',
    address: '',
    isLoginAllowed: true,
  });

  // 🗑️ Modal Hapus Data dengan Konfirmasi Perlindungan
  const [deleteAccount, setDeleteAccount] = useState<AccountRecord | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);
    const accsRef = collection(db, 'accounts');
    const unsub = onSnapshot(
      accsRef,
      (snap) => {
        if (!snap.empty) {
          const list: AccountRecord[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as Omit<AccountRecord, 'id'>) });
          });
          // Sort by accountId ascending
          list.sort((a, b) => (a.accountId || '').localeCompare(b.accountId || ''));
          setAccounts(list);
        } else {
          // Seed INITIAL_ACCOUNTS
          INITIAL_ACCOUNTS.forEach(async (acc) => {
            try {
              await setDoc(doc(db, 'accounts', acc.id), acc, { merge: true });
            } catch {}
          });
          setAccounts(INITIAL_ACCOUNTS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore accounts error, using fallback:', err);
        setAccounts(INITIAL_ACCOUNTS);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ⚠️ STRICT PEMISAHAN: HANYA AKUN BERSTATUS PENGUNJUNG
  const visitorAccounts = accounts.filter((acc) => acc.status === 'PENGUNJUNG');

  // Filter & Search
  const filteredVisitors = visitorAccounts.filter((acc) => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      (acc.name || '').toLowerCase().includes(cleanSearch) ||
      (acc.accountId || '').toLowerCase().includes(cleanSearch) ||
      (acc.phone || '').includes(cleanSearch) ||
      (acc.email || '').toLowerCase().includes(cleanSearch);

    const matchesLoginStatus = 
      loginStatusFilter === 'ALL' ||
      (loginStatusFilter === 'online' && acc.loginStatus === 'online') ||
      (loginStatusFilter === 'offline' && acc.loginStatus !== 'online');

    const isAllowed = acc.isLoginAllowed !== false;
    const matchesAccess = 
      accessFilter === 'ALL' ||
      (accessFilter === 'allowed' && isAllowed) ||
      (accessFilter === 'restricted' && !isAllowed);

    return matchesSearch && matchesLoginStatus && matchesAccess;
  });

  // Toggle Akses Login
  const handleSetAccess = async (accId: string, allowed: boolean) => {
    try {
      await updateDoc(doc(db, 'accounts', accId), {
        isLoginAllowed: allowed,
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === accId ? { ...a, isLoginAllowed: allowed } : a))
      );
      if (manageAccount && manageAccount.id === accId) {
        setManageAccount((prev) => prev ? { ...prev, isLoginAllowed: allowed } : null);
      }
      setFeedback(allowed ? 'Akses login berhasil diizinkan!' : 'Akses login berhasil dibatasi!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error('Gagal memperbarui akses login:', e);
    }
  };

  // Buka Modal Edit
  const openEditModal = (acc: AccountRecord) => {
    setEditAccount(acc);
    setEditForm({
      name: acc.name || '',
      phone: acc.phone || '',
      email: acc.email || '',
      memberNumber: acc.memberNumber || '',
      gender: acc.gender || 'Laki-laki',
      birthPlace: acc.birthPlace || '',
      birthDate: acc.birthDate || '',
      address: acc.address || '',
      isLoginAllowed: acc.isLoginAllowed !== false,
    });
  };

  // Simpan Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount) return;

    try {
      const calculatedNewAge = editForm.birthDate ? calculateAge(editForm.birthDate) : editAccount.age;
      
      // Catatan: Role PENGUNJUNG tetap tidak berubah meskipun Nomor Anggota diedit (PENGUNJUNG != ANGGOTA)
      // ID Akun, Login Pertama, dan Login Terakhir TIDAK diubah
      const updates = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        memberNumber: editForm.memberNumber.trim() || undefined,
        gender: editForm.gender,
        birthPlace: editForm.birthPlace.trim(),
        birthDate: editForm.birthDate,
        age: calculatedNewAge,
        address: editForm.address.trim(),
        isLoginAllowed: editForm.isLoginAllowed,
      };

      await updateDoc(doc(db, 'accounts', editAccount.id), updates);

      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editAccount.id ? { ...a, ...updates } : a
        )
      );

      setFeedback(`Data Akun Basic "${editForm.name}" berhasil diperbarui!`);
      setEditAccount(null);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan perubahan: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  // Eksekusi Hapus Akun
  const handleExecuteDelete = async () => {
    if (!deleteAccount) return;
    try {
      await deleteDoc(doc(db, 'accounts', deleteAccount.id));
      setAccounts((prev) => prev.filter((a) => a.id !== deleteAccount.id));
      setFeedback(`Akun Basic "${deleteAccount.name}" (${deleteAccount.accountId}) telah berhasil dihapus.`);
      setDeleteAccount(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(`Gagal menghapus akun: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  // Hitung Metrik Khusus Pengunjung
  const totalPengunjung = visitorAccounts.length;
  const onlinePengunjung = visitorAccounts.filter((a) => a.loginStatus === 'online').length;
  const offlinePengunjung = totalPengunjung - onlinePengunjung;
  const restrictedPengunjung = visitorAccounts.filter((a) => a.isLoginAllowed === false).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>Sistem Manajemen Akun Basic</span>
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">
              Role: BASIC (Terpisah dari Akun Anggota)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            👤 Akun Basic
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Pantau status login aktif secara otomatis, riwayat login pertama & terakhir, batasi atau izinkan akses masuk, kelola profil, dan lakukan pencarian akun Basic website.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all self-stretch sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 4 Statistics Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Akun Basic</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {totalPengunjung}
          </p>
          <p className="text-[11px] text-slate-400">Akun terdaftar dengan role Basic</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Sedang Login</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
            {onlinePengunjung}
          </p>
          <p className="text-[11px] text-slate-400">🟢 Sesi login aktif saat ini</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tidak Login</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-700 tracking-tight">
            {offlinePengunjung}
          </p>
          <p className="text-[11px] text-slate-400">⚪ Sedang tidak membuka sesi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Akses Dibatasi</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
            {restrictedPengunjung}
          </p>
          <p className="text-[11px] text-slate-400">🔴 Akses login ditangguhkan</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Nama, ID Akun, Nomor HP, Email..."
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          {/* Status Login Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <span className="text-slate-500 text-[10px] font-bold px-2">Status:</span>
            <button
              onClick={() => setLoginStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all ${
                loginStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setLoginStatusFilter('online')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1 ${
                loginStatusFilter === 'online' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🟢</span>
              <span>Sedang Login</span>
            </button>
            <button
              onClick={() => setLoginStatusFilter('offline')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1 ${
                loginStatusFilter === 'offline' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚪</span>
              <span>Tidak Login</span>
            </button>
          </div>

          {/* Akses Login Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <span className="text-slate-500 text-[10px] font-bold px-2">Akses:</span>
            <button
              onClick={() => setAccessFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all ${
                accessFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setAccessFilter('allowed')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1 ${
                accessFilter === 'allowed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🟢</span>
              <span>Diizinkan</span>
            </button>
            <button
              onClick={() => setAccessFilter('restricted')}
              className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1 ${
                accessFilter === 'restricted' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🔴</span>
              <span>Dibatasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 9. 📊 TABEL MANAGEMENT AKUN BASIC */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-3 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Akun Basic</th>
                <th className="py-3.5 px-4">ID Akun</th>
                <th className="py-3.5 px-4">Nomor HP / Email</th>
                <th className="py-3.5 px-4 text-center">Status Login</th>
                <th className="py-3.5 px-4">Login Pertama</th>
                <th className="py-3.5 px-4">Login Terakhir</th>
                <th className="py-3.5 px-4 text-center">Akses Login</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Memuat data akun Basic...</span>
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <p className="font-extrabold text-sm">Tidak ada Akun Basic yang ditemukan.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {visitorAccounts.length === 0 
                        ? 'Belum ada pendaftaran akun berstatus Basic.'
                        : 'Coba sesuaikan kata kunci pencarian atau pilihan filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((acc, index) => {
                  const isOnline = acc.loginStatus === 'online';
                  const isAllowed = acc.isLoginAllowed !== false;

                  return (
                    <tr 
                      key={acc.id} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      {/* Nama Pengunjung */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black shrink-0">
                            {acc.name ? acc.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">
                              {acc.name}
                            </p>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              BASIC
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ID Akun */}
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                            {acc.accountId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.accountId, acc.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 transition-colors"
                            title="Salin ID Akun"
                          >
                            {copiedId === acc.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Nomor HP / Email */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-mono font-bold text-slate-900 text-xs">
                          {acc.phone}
                        </p>
                        {acc.email ? (
                          <p className="text-[11px] text-slate-500 max-w-[140px] truncate" title={acc.email}>
                            {acc.email}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Tanpa email</p>
                        )}
                      </td>

                      {/* 2. 👁️ STATUS LOGIN */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>🟢 Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>⚪ Tidak Login</span>
                          </span>
                        )}
                      </td>

                      {/* 3. 📅 LOGIN PERTAMA */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                        {acc.firstLoginAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{acc.firstLoginAt}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum pernah login</span>
                        )}
                      </td>

                      {/* 4. 🕐 LOGIN TERAKHIR */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                        {acc.lastLoginAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{acc.lastLoginAt}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum pernah login</span>
                        )}
                      </td>

                      {/* 6. 🔐 AKSES LOGIN */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isAllowed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span>🟢 Diizinkan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            <span>🔴 Dibatasi</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi: ⚙️ Kelola · ✏️ Edit · 🗑️ Hapus */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ⚙️ Kelola */}
                          <button
                            type="button"
                            onClick={() => setManageAccount(acc)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                            title="Kelola Detail Akun & Akses"
                          >
                            <Settings className="w-3 h-3 text-slate-600" />
                            <span>Kelola</span>
                          </button>

                          {/* ✏️ Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                            title="Edit Data Basic"
                          >
                            <Edit className="w-3 h-3 text-blue-600" />
                            <span>Edit</span>
                          </button>

                          {/* 🗑️ Hapus */}
                          <button
                            type="button"
                            onClick={() => setDeleteAccount(acc)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                            title="Hapus Akun Basic"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 10. ⚙️ MODAL KELOLA DETAIL AKUN                           */}
      {/* ========================================================= */}
      {manageAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setManageAccount(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-black">Kelola Akun Basic</h3>
                  <p className="text-xs text-slate-300 font-mono">{manageAccount.accountId}</p>
                </div>
              </div>
              <button
                onClick={() => setManageAccount(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 👤 Informasi Akun */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>👤 Informasi Akun</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nama Akun Basic:</span>
                    <span className="font-extrabold text-slate-900">{manageAccount.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">ID Akun Basic:</span>
                    <span className="font-mono font-extrabold text-slate-900">{manageAccount.accountId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nomor HP:</span>
                    <span className="font-mono font-bold text-slate-900">{manageAccount.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-bold text-slate-700">{manageAccount.email || '-'}</span>
                  </div>
                  {manageAccount.memberNumber && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Nomor Anggota (Field):</span>
                      <span className="font-mono font-bold text-slate-900">{manageAccount.memberNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Tanggal Pendaftaran:</span>
                    <span className="font-medium text-slate-700">{manageAccount.registeredAt}</span>
                  </div>
                </div>
              </div>

              {/* 🔐 Informasi Login */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🔐 Informasi Login</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Status Login:</span>
                    <span className="font-extrabold">
                      {manageAccount.loginStatus === 'online' ? '🟢 Sedang Login / Aktif' : '⚪ Tidak Login / Tidak Aktif'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Login Pertama:</span>
                    <span className="font-mono font-medium text-slate-800">{manageAccount.firstLoginAt || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Login Terakhir:</span>
                    <span className="font-mono font-medium text-slate-800">{manageAccount.lastLoginAt || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Akses Login:</span>
                    <span className="font-black">
                      {manageAccount.isLoginAllowed !== false ? '🟢 Diizinkan' : '🔴 Dibatasi'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ⚙️ Pengaturan Akses */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span>⚙️ Pengaturan Akses Login</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetAccess(manageAccount.id, true)}
                    className={`py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${
                      manageAccount.isLoginAllowed !== false
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <span>🟢</span>
                    <span>Izinkan Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetAccess(manageAccount.id, false)}
                    className={`py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${
                      manageAccount.isLoginAllowed === false
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <span>🔴</span>
                    <span>Batasi Login</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Jika dibatasi, pengguna akan ditolak masuk dengan pesan instruksi menghubungi Admin.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setManageAccount(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. ✏️ MODAL EDIT DATA AKUN                               */}
      {/* ========================================================= */}
      {editAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setEditAccount(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6"
          >
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                  ✏️
                </div>
                <div>
                  <h3 className="text-base font-black">Edit Data Akun Basic</h3>
                  <p className="text-xs text-blue-200 font-mono">ID: {editAccount.accountId} (Terkunci)</p>
                </div>
              </div>
              <button
                onClick={() => setEditAccount(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-blue-700" />
                  <span>🔒 Data Terproteksi (Tidak Dapat Diedit)</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  ID Akun ({editAccount.accountId}), Login Pertama ({editAccount.firstLoginAt || '-'}), dan Login Terakhir ({editAccount.lastLoginAt || '-'}) tidak dapat diubah oleh Admin demi validitas riwayat sistem.
                </p>
              </div>

              {/* Nama Pengunjung */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Akun Basic *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-bold"
                />
              </div>

              {/* Nomor HP */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nomor HP Aktif *</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-mono"
                />
              </div>

              {/* Email jika digunakan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email (Opsional)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="contoh@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
                />
              </div>

              {/* Nomor Anggota jika tersedia */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Nomor Anggota (Jika Tersedia)</label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                    BASIC ≠ ANGGOTA
                  </span>
                </div>
                <input
                  type="text"
                  value={editForm.memberNumber}
                  onChange={(e) => setEditForm({ ...editForm, memberNumber: e.target.value })}
                  placeholder="Contoh: KMP-ANG-001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Pengisian Nomor Anggota tidak akan mengubah status Basic menjadi Anggota secara otomatis.
                </p>
              </div>

              {/* Profil Lainnya */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jenis Kelamin</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Akses Login</label>
                  <select
                    value={editForm.isLoginAllowed ? 'true' : 'false'}
                    onChange={(e) => setEditForm({ ...editForm, isLoginAllowed: e.target.value === 'true' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="true">🟢 Diizinkan</option>
                    <option value="false">🔴 Dibatasi</option>
                  </select>
                </div>
              </div>

              {/* Alamat */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Alamat Domisili</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. 🗑️ MODAL HAPUS DATA DENGAN KONFIRMASI PERLINDUNGAN     */}
      {/* ========================================================= */}
      {deleteAccount && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeleteAccount(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                Konfirmasi Hapus Akun Basic
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-rose-50/80 p-3 rounded-2xl border border-rose-200 text-rose-900">
                «"Apakah Anda yakin ingin menghapus akun Basic ini? Data yang telah dihapus tidak dapat dipulihkan."»
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs space-y-1 mt-2">
                <p><span className="text-slate-400">Nama:</span> <span className="font-extrabold text-slate-800">{deleteAccount.name}</span></p>
                <p><span className="text-slate-400">ID Akun:</span> <span className="font-mono font-bold text-slate-800">{deleteAccount.accountId}</span></p>
                <p><span className="text-slate-400">Nomor HP:</span> <span className="font-mono font-bold text-slate-800">{deleteAccount.phone}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAccount(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
