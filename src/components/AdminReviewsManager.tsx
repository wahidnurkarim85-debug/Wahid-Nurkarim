import React, { useState, useMemo } from 'react';
import { useReviewLove } from '../context/ReviewLoveContext';
import { Star, Heart, MessageSquare, Search, Filter, Calendar, User, CheckCircle2, ShieldCheck, Reply, CornerDownRight } from 'lucide-react';

interface AdminReviewsManagerProps {
  products: Array<{ id: string; name: string; category?: string; emoji?: string }>;
}

export const AdminReviewsManager: React.FC<AdminReviewsManagerProps> = ({ products }) => {
  const { reviews, loves, replyToReview, getProductRatingStats, getProductLoveCount, getProductSoldCount } = useReviewLove();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('all');
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'reviews' | 'product_stats'>('reviews');

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      const matchSearch = 
        rev.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rev.comment && rev.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
        rev.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchProduct = selectedProductFilter === 'all' || rev.productId === selectedProductFilter;
      const matchRating = selectedRatingFilter === 'all' || rev.rating.toString() === selectedRatingFilter;

      return matchSearch && matchProduct && matchRating;
    });
  }, [reviews, searchQuery, selectedProductFilter, selectedRatingFilter]);

  // Handle admin reply submit
  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    await replyToReview(reviewId, replyText);
    setReplyingReviewId(null);
    setReplyText('');
  };

  // Calculate overall stats
  const totalReviewsCount = reviews.length;
  const overallAvgRating = totalReviewsCount > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1) 
    : '0.0';
  const totalLovesCount = loves.length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ulasan</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{totalReviewsCount} Ulasan</h4>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>Rata-rata {overallAvgRating} / 5.0 ⭐</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Star className="w-7 h-7 fill-current" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Produk Disukai</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{totalLovesCount} ❤️ Love</h4>
            <p className="text-xs text-pink-600 font-semibold mt-1">Interaksi pelanggan di katalog</p>
          </div>
          <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
            <Heart className="w-7 h-7 fill-current text-pink-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Sinkronisasi</p>
            <h4 className="text-xl font-black text-emerald-700 mt-1">Real-time Aktif</h4>
            <p className="text-xs text-slate-500 mt-1">Firestore Database Connected</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Subtab Toggle (Daftar Ulasan vs Ringkasan Produk) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveViewMode('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeViewMode === 'reviews'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ⭐ Daftar Semua Ulasan ({reviews.length})
        </button>
        <button
          onClick={() => setActiveViewMode('product_stats')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeViewMode === 'product_stats'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          📊 Ringkasan Rating & Love Per Produk ({products.length})
        </button>
      </div>

      {activeViewMode === 'reviews' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pelanggan, produk, ulasan..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Product Filter */}
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.emoji || '📦'} {p.name}
                  </option>
                ))}
              </select>

              {/* Rating Filter */}
              <select
                value={selectedRatingFilter}
                onChange={(e) => setSelectedRatingFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Semua Bintang ⭐</option>
                <option value="5">5 Bintang ⭐⭐⭐⭐⭐</option>
                <option value="4">4 Bintang ⭐⭐⭐⭐</option>
                <option value="3">3 Bintang ⭐⭐⭐</option>
                <option value="2">2 Bintang ⭐⭐</option>
                <option value="1">1 Bintang ⭐</option>
              </select>
            </div>
          </div>

          {/* Reviews List Table */}
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-bold text-base">Belum Ada Ulasan Ditemukan</p>
              <p className="text-slate-400 text-xs mt-1">Ulasan pelanggan akan muncul otomatis setelah pesanan berstatus Selesai.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center shrink-0 text-sm">
                        {rev.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-slate-900 text-sm">{rev.customerName}</h5>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            rev.customerRole === 'ANGGOTA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rev.customerRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>No. HP: {rev.customerPhone}</span>
                          <span>•</span>
                          <span>Pesanan: #{rev.orderNumber}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-current text-amber-500' : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-amber-900 ml-1">{rev.rating}.0</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{rev.createdAt}</span>
                    </div>
                  </div>

                  {/* Product Tag */}
                  <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl w-fit">
                    <span className="text-xs font-bold text-slate-700">📦 Produk:</span>
                    <span className="text-xs font-black text-slate-900">{rev.productName}</span>
                    {rev.variation && <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-600 font-semibold">({rev.variation})</span>}
                  </div>

                  {/* Comment */}
                  {rev.comment ? (
                    <p className="text-xs text-slate-800 font-medium bg-white p-3 rounded-xl border border-slate-200/70">
                      "{rev.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Pelanggan hanya memberikan rating tanpa teks ulasan.</p>
                  )}

                  {/* Admin Reply Display or Form */}
                  {rev.adminReply ? (
                    <div className="ml-6 pl-4 border-l-2 border-red-500 bg-red-50/50 p-3 rounded-r-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-red-900 flex items-center gap-1">
                          <CornerDownRight className="w-3.5 h-3.5" />
                          Balasan Admin Koperasi:
                        </span>
                        {rev.adminReplyAt && <span className="text-[10px] text-slate-500">{rev.adminReplyAt}</span>}
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{rev.adminReply}</p>
                    </div>
                  ) : (
                    <div>
                      {replyingReviewId === rev.id ? (
                        <div className="space-y-2 mt-2 ml-6">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Tulis balasan resmi Koperasi untuk ulasan ini..."
                            rows={2}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                          ></textarea>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSendReply(rev.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                            >
                              Kirim Balasan
                            </button>
                            <button
                              onClick={() => {
                                setReplyingReviewId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyingReviewId(rev.id);
                            setReplyText(rev.adminReply || '');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>Balas Ulasan Ini</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ================= RINGKASAN PRODUK (RATING & LOVE) ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-sm">Statistik Ulasan, Love, & Penjualan Per Produk</h4>
            <p className="text-xs text-slate-500">Data ter-sinkronisasi otomatis real-time dari katalog & transaksi selesai.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5 text-center">Rating Rata-Rata</th>
                  <th className="p-3.5 text-center">Jumlah Ulasan</th>
                  <th className="p-3.5 text-center">Total ❤️ Love</th>
                  <th className="p-3.5 text-center">📦 Terjual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {products.map((prod) => {
                  const stats = getProductRatingStats(prod.id);
                  const loveCount = getProductLoveCount(prod.id);
                  const soldCount = getProductSoldCount(prod.id, prod.name);
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">{prod.emoji || '📦'}</span>
                        <div>
                          <div className="font-black">{prod.name}</div>
                          <div className="text-[10px] text-slate-400">{prod.category || 'Sembako'}</div>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 font-black">
                          <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                          <span>{stats.averageRating > 0 ? stats.averageRating : '0.0'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {stats.reviewCount} ulasan
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-black text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
                          <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
                          <span>{loveCount}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          {soldCount} unit
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
