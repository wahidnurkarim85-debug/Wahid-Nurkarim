import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Bell, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Clock, 
  User, 
  Users, 
  ShieldCheck, 
  Truck, 
  FileText, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { DeliveryNotificationLog } from '../types';
import { SAMPLE_NOTIFICATION_LOGS } from '../data/initialOrdersData';

export const AdminDeliveryNotificationLogs: React.FC = () => {
  const [logs, setLogs] = useState<DeliveryNotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'Basic' | 'Anggota'>('ALL');
  const [readFilter, setReadFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL');
  const [selectedLog, setSelectedLog] = useState<DeliveryNotificationLog | null>(null);

  // Firestore real-time subscription
  useEffect(() => {
    setLoading(true);
    const logsRef = collection(db, 'deliveryNotificationLogs');
    const q = query(logsRef, orderBy('createdAtIso', 'desc'), limit(100));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list: DeliveryNotificationLog[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<DeliveryNotificationLog, 'id'>) });
          });
          setLogs(list);
        } else {
          // Fallback to initial sample logs if empty
          setLogs(SAMPLE_NOTIFICATION_LOGS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Notification logs Firestore listener fallback:', err);
        setLogs(SAMPLE_NOTIFICATION_LOGS);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    if (accountFilter !== 'ALL' && log.accountType !== accountFilter) return false;
    if (readFilter === 'READ' && !log.isRead) return false;
    if (readFilter === 'UNREAD' && log.isRead) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = log.orderNumber.toLowerCase().includes(q);
      const matchAccount = log.accountId.toLowerCase().includes(q);
      const matchCustomer = log.customerName.toLowerCase().includes(q);
      const matchEmployee = log.employeeName.toLowerCase().includes(q);
      const matchTitle = log.title.toLowerCase().includes(q);
      return matchOrder || matchAccount || matchCustomer || matchEmployee || matchTitle;
    }
    return true;
  });

  const totalLogs = logs.length;
  const anggotaCount = logs.filter((l) => l.accountType === 'Anggota').length;
  const basicCount = logs.filter((l) => l.accountType === 'Basic').length;
  const readCount = logs.filter((l) => l.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Pemberitahuan</span>
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalLogs}</p>
          <span className="text-[10px] text-slate-400">Terekam di sistem</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Akun Anggota</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">{anggotaCount}</p>
          <span className="text-[10px] text-amber-700">Pemberitahuan terkirim</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">Akun Basic</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-1">{basicCount}</p>
          <span className="text-[10px] text-blue-700">Pemberitahuan terkirim</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Status Dibaca</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {totalLogs > 0 ? Math.round((readCount / totalLogs) * 100) : 0}%
          </p>
          <span className="text-[10px] text-emerald-700">{readCount} dari {totalLogs} dibaca</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Order ID, ID Akun, Nama Pelanggan, atau Karyawan..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setAccountFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                accountFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Semua Akun
            </button>
            <button
              onClick={() => setAccountFilter('Anggota')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                accountFilter === 'Anggota' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              👥 Anggota
            </button>
            <button
              onClick={() => setAccountFilter('Basic')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                accountFilter === 'Basic' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              👤 Basic
            </button>
          </div>

          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as any)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">Status Baca: Semua</option>
            <option value="READ">📖 Sudah Dibaca</option>
            <option value="UNREAD">✉️ Belum Dibaca</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>Log Pemberitahuan Pengiriman Pelanggan</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredLogs.length} Entri
            </span>
          </h3>
          <span className="text-[11px] text-slate-400">Update otomatis real-time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Pesanan & Akun</th>
                <th className="py-3 px-4">Karyawan Pengirim</th>
                <th className="py-3 px-4">Jenis & Isi Notifikasi</th>
                <th className="py-3 px-4">Waktu Dikirim</th>
                <th className="py-3 px-4">Status Pengiriman</th>
                <th className="py-3 px-4 text-center">Status Baca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan log pemberitahuan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Pesanan & Akun */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-slate-900 block text-xs">
                          {log.orderNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                            log.accountType === 'Anggota'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.accountType === 'Anggota' ? '👥 Anggota' : '👤 Basic'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {log.accountId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold">{log.customerName}</p>
                      </div>
                    </td>

                    {/* Karyawan Pengirim */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">
                          👨‍💼 {log.employeeName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {log.employeeId}
                        </span>
                      </div>
                    </td>

                    {/* Jenis & Isi Notifikasi */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        <span className="font-black text-slate-900 block text-xs">
                          {log.title}
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {log.message}
                        </p>
                        {log.delayReason && (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Kendala: {log.delayReason}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Waktu Dikirim */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.sentAt}</span>
                      </div>
                    </td>

                    {/* Status Pengiriman */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        🚚 {log.currentDeliveryStatus}
                      </span>
                    </td>

                    {/* Status Baca */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {log.isRead ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          📖 Sudah Dibaca
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          ✉️ Belum Dibaca
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal if row is clicked */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Rincian Log Pemberitahuan
              </h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Pesanan:</span>
                  <strong className="font-mono">{selectedLog.orderNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Akun Pelanggan:</span>
                  <strong className="font-mono">{selectedLog.accountId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Akun:</span>
                  <strong>{selectedLog.accountType === 'Anggota' ? '👥 Anggota Kopdes' : '👤 Basic (Pengunjung)'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerima:</span>
                  <strong>{selectedLog.customerName}</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl space-y-1 border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Karyawan Pengirim:</span>
                  <strong className="text-blue-900">👨‍💼 {selectedLog.employeeName} ({selectedLog.employeeId})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Kirim:</span>
                  <span>{selectedLog.sentAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Dibaca:</span>
                  <strong className={selectedLog.isRead ? 'text-emerald-700' : 'text-slate-600'}>
                    {selectedLog.isRead ? '📖 Sudah Dibaca Pelanggan' : '✉️ Belum Dibaca'}
                  </strong>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Isi Teks Notifikasi:
                </label>
                <div className="p-3 bg-slate-100 rounded-xl text-slate-800 leading-relaxed font-sans">
                  <strong>{selectedLog.title}</strong>
                  <p className="mt-1">{selectedLog.message}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
