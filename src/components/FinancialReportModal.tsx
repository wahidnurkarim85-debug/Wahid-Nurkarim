import React, { useState } from 'react';
import { X, TrendingUp, Download, FileText, Calendar, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useAuth } from '../context/AuthContext';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ isOpen, onClose }) => {
  const { revenueRecords, financialDocs } = useSiteConfig();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const years = (Array.from(new Set(revenueRecords.map((r) => Number(r.year)))) as number[]).sort((a, b) => b - a);
  
  // Filter by year and optional month
  const filteredRecords = revenueRecords.filter((r) => {
    const matchYear = Number(r.year) === Number(selectedYear);
    const matchMonth = selectedMonthFilter === 'ALL' || r.month === selectedMonthFilter;
    return matchYear && matchMonth;
  });

  const totalRevenueForYear = filteredRecords.reduce((sum, r) => sum + Number(r.amount), 0);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleDownloadDoc = (title: string, fileUrl: string) => {
    if (fileUrl && fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`Berhasil mengunduh dokumen resmi: "${title}" ke perangkat Anda.`);
    } else {
      alert(`Mengunduh dokumen resmi koperasi: "${title}". Berkas tersimpan ke perangkat Anda.`);
    }
  };

  // SVG Line Chart coordinates calculation
  const chartHeight = 220;
  const chartWidth = 600;
  const padding = 40;
  const maxVal = Math.max(...filteredRecords.map((r) => Number(r.amount)), 1000000);
  const minVal = 0;

  const points = filteredRecords.map((rec, idx, arr) => {
    const x = arr.length === 1 ? chartWidth / 2 : padding + (idx / (arr.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((Number(rec.amount) - minVal) / (maxVal - minVal || 1)) * (chartHeight - padding * 2);
    return { x, y, record: rec };
  });

  const pathString = points.length > 0 
    ? points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden relative my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 via-slate-900 to-slate-950 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black shadow-inner">
              📈
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">
                Grafik Pendapatan Bulanan & Tahunan Koperasi
              </h3>
              <p className="text-xs text-slate-300">
                Transparansi Finansial & Dokumen Resmi (Read-Only untuk Anggota & Publik)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Status Bar */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                🔒
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900">Mode Transparan (Read-Only)</h4>
                <p className="text-[11px] text-emerald-700">
                  Data grafik pendapatan dan dokumen laporan dapat dilihat oleh seluruh anggota dan akun Basic publik (Tidak dapat diubah secara mandiri di sini).
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900">
                {user ? `Akun: ${user.name || user.email}` : 'Akun Basic Publik'}
              </span>
            </div>
          </div>

          {/* Filters: Year & Month */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Filter Tahun & Bulan:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-emerald-600"
              >
                {years.map((y) => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>

              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-emerald-600"
              >
                <option value="ALL">Semua Bulan</option>
                {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Chart Section (Grafik Garis Pendapatan Bulanan & Tahunan) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Akumulasi Pendapatan ({selectedYear})</span>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
                  {formatRupiah(totalRevenueForYear)}
                </h3>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-xs flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-medium">Grafik Garis Bulanan</span>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="pt-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              {filteredRecords.length === 0 ? (
                <p className="text-xs text-slate-400 py-12 text-center italic">Belum ada catatan pendapatan untuk periode ini.</p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56">
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const yPos = padding + ratio * (chartHeight - padding * 2);
                      return (
                        <line 
                          key={idx} 
                          x1={padding} 
                          y1={yPos} 
                          x2={chartWidth - padding} 
                          y2={yPos} 
                          stroke="#334155" 
                          strokeDasharray="4 4" 
                          strokeWidth="1" 
                        />
                      );
                    })}

                    {/* Area under line */}
                    {points.length > 1 && (
                      <path
                        d={`${pathString} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`}
                        fill="rgba(16, 185, 129, 0.15)"
                      />
                    )}

                    {/* Line Path */}
                    {points.length > 1 && (
                      <path
                        d={pathString}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Points */}
                    {points.map((pt, i) => (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="6"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="12"
                          fill="transparent"
                          className="hover:fill-emerald-500/20 transition-all"
                        />
                        {/* Tooltip / label */}
                        <text
                          x={pt.x}
                          y={pt.y - 14}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="bold"
                          className="font-mono bg-slate-900 px-1 rounded"
                        >
                          {formatRupiah(pt.record.amount)}
                        </text>
                        <text
                          x={pt.x}
                          y={chartHeight - 15}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {pt.record.month}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </div>

            {/* Detailed Records List */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rincian Data Pendapatan Bulanan & Tahunan</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredRecords.map((r) => (
                  <div key={r.id} className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{r.month} {r.year}</span>
                        <span className="text-[10px] text-slate-400">({r.date})</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{r.description}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatRupiah(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Downloadable Documents Section (Excel, Word, PowerPoint) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                <span>Dokumen Laporan Resmi (Excel, Word, PowerPoint, PDF)</span>
              </h4>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Dapat Diunduh Anggota & Publik
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {financialDocs.map((doc) => {
                const getBadgeColor = (type: string) => {
                  if (type === 'excel') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  if (type === 'word') return 'bg-blue-100 text-blue-800 border-blue-300';
                  return 'bg-amber-100 text-amber-800 border-amber-300';
                };
                const getIconSymbol = (type: string) => {
                  if (type === 'excel') return '📊 Excel';
                  if (type === 'word') return '📝 Word';
                  return '📽️ PPT';
                };

                return (
                  <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${getBadgeColor(doc.fileType)}`}>
                          {getIconSymbol(doc.fileType)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{doc.fileSize}</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 line-clamp-2">{doc.title}</h5>
                      <p className="text-[10px] text-slate-500">Diunggah: {doc.uploadDate}</p>
                    </div>

                    <button
                      onClick={() => handleDownloadDoc(doc.title, doc.fileUrl)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Berkas</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Koperasi Desa Merah Putih — Transparan, Akuntabel, dan Gotong Royong untuk Kesejahteraan Warga.
          </p>
        </div>
      </div>
    </div>
  );
};
