import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  Package, 
  MapPin, 
  Users, 
  UserCheck,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { CustomerOrder, DeliveryNotificationType } from '../types';
import { 
  NOTIFICATION_TEMPLATES, 
  sendCustomerDeliveryNotification 
} from '../services/deliveryOptimizationService';

interface DeliveryNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomerOrder | null;
  employeeId: string;
  employeeName: string;
  onNotificationSent: (type: DeliveryNotificationType, message: string) => void;
}

export const DeliveryNotificationModal: React.FC<DeliveryNotificationModalProps> = ({
  isOpen,
  onClose,
  order,
  employeeId,
  employeeName,
  onNotificationSent,
}) => {
  const [selectedType, setSelectedType] = useState<DeliveryNotificationType>('PENGIRIMAN_DIKONFIRMASI');
  const [customNote, setCustomNote] = useState<string>('');
  const [delayReason, setDelayReason] = useState<string>('Cuaca hujan lebat di perjalanan');
  const [isSending, setIsSending] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const currentTemplate = NOTIFICATION_TEMPLATES[selectedType];
  const accountType = order.customerRole === 'ANGGOTA' ? 'Anggota' : 'Basic';
  const accountId = order.userId || order.userAccountId || order.customerPhone || 'ACC-GUEST';

  const previewMessage = currentTemplate.generateMessage(
    order,
    employeeName,
    selectedType === 'PESANAN_TERTUNDA' ? delayReason : customNote
  );

  const handleSend = async () => {
    try {
      setIsSending(true);
      await sendCustomerDeliveryNotification({
        order,
        employeeId,
        employeeName,
        type: selectedType,
        customNote,
        delayReason: selectedType === 'PESANAN_TERTUNDA' ? delayReason : undefined,
      });

      onNotificationSent(selectedType, previewMessage);
      onClose();
    } catch (err: any) {
      alert(`Gagal mengirim notifikasi: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const notificationOptions: { type: DeliveryNotificationType; label: string; icon: string }[] = [
    { type: 'PENGIRIMAN_DIKONFIRMASI', label: '🚚 Pengiriman Dikonfirmasi', icon: '🚚' },
    { type: 'PESANAN_DIAMBIL', label: '📦 Pesanan Sudah Diambil', icon: '📦' },
    { type: 'DALAM_PERJALANAN', label: '🚚 Sedang Dalam Perjalanan', icon: '🚚' },
    { type: 'PESANAN_TERTUNDA', label: '⏳ Pesanan Tertunda + Alasan', icon: '⏳' },
    { type: 'HAMPIR_TIBA', label: '📍 Petugas Hampir Tiba (±500m)', icon: '📍' },
    { type: 'SUDAH_TIBA', label: '📍 Petugas Sudah Tiba di Lokasi', icon: '📍' },
    { type: 'MENUNGGU_PENERIMA', label: '🤝 Menunggu Penerima', icon: '🤝' },
    { type: 'PESANAN_SELESAI', label: '✅ Pesanan Selesai', icon: '✅' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                Kirim Pemberitahuan Pelanggan
              </h3>
              <p className="text-xs text-blue-100">
                Terhubung otomatis ke Kotak Pesan & Riwayat Pesanan Pelanggan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* Target Account Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Tujuan Pengiriman:</span>
              <p className="text-xs font-black text-slate-900">
                {order.customerName} ({order.orderNumber})
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                ID Akun: {accountId}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${
                accountType === 'Anggota'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}>
                {accountType === 'Anggota' ? '👥 Akun Anggota' : '👤 Akun Basic'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Tervalidasi Tepat Akun</span>
            </div>
          </div>

          {/* Select Notification Type */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Pilih Jenis Pemberitahuan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {notificationOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    selectedType === opt.type
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="line-clamp-1">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delay Reason Input if Delayed */}
          {selectedType === 'PESANAN_TERTUNDA' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
              <label className="block text-xs font-black text-amber-900">
                Alasan Keterlambatan:
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full text-xs font-medium p-2 rounded-lg border border-amber-300 bg-white text-slate-800"
              >
                <option value="Cuaca hujan lebat di perjalanan">🌧️ Cuaca hujan lebat di perjalanan</option>
                <option value="Kondisi jalan macet padat">🚗 Kondisi jalan macet padat</option>
                <option value="Sedang mencari patokan alamat di gang">📍 Sedang mencari patokan alamat di gang</option>
                <option value="Kendaraan kurir perlu perbaikan singkat">🛵 Kendaraan kurir kendala teknis ringan</option>
                <option value="Penerima belum menjawab panggilan telepon">📞 Penerima belum menjawab panggilan telepon</option>
              </select>
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Atau ketik alasan keterlambatan kustom..."
                className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white"
              />
            </div>
          )}

          {/* Optional Note for Wait / Others */}
          {(selectedType === 'MENUNGGU_PENERIMA' || selectedType === 'PENGIRIMAN_DIKONFIRMASI') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Contoh: Kurir berada di pos satpam gerbang depan..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          )}

          {/* Preview Box */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Pratinjau Pesan yang Diterima Pelanggan:
            </span>
            <p className="text-xs font-black text-slate-900">{currentTemplate.title}</p>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {previewMessage}
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                [📦 Lihat Pesanan]
              </span>
              <span className="text-[10px] text-slate-500">
                Tombol interaktif otomatis tersemat di Kotak Pesan
              </span>
            </div>
          </div>

          {/* Security & Access Check Info */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Pengirim: <strong>{employeeName}</strong> ({employeeId}). Pesan hanya masuk ke akun pemilik pesanan.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={handleSend}
            className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Mengirim...' : 'Kirim Pemberitahuan Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
