import React, { useState } from 'react';
import { useReviewLove } from '../context/ReviewLoveContext';
import { useAuth } from '../context/AuthContext';
import { Star, X, MessageSquare, CheckCircle2, ShieldAlert, Send } from 'lucide-react';
import { Product } from '../types';

interface ReviewModalProps {
  product: Product;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ product, onClose, onOpenAuth }) => {
  const { user } = useAuth();
  const { 
    addProductReview, 
    getProductReviews, 
    getProductRatingStats, 
    canUserReviewProduct 
  } = useReviewLove();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const productReviews = getProductReviews(product.id);
  const stats = getProductRatingStats(product.id);
  const { canReview, eligibleOrders } = canUserReviewProduct(product.id);

  // Set default selected order id if eligible
  React.useEffect(() => {
    if (eligibleOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(eligibleOrders[0].id);
    }
  }, [eligibleOrders, selectedOrderId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!canReview || eligibleOrders.length === 0 || !selectedOrderId) {
      setFeedback({ 
        message: 'Ulasan dan rating hanya bisa diisi setelah pesanan selesai (Status Pesanan: Selesai). Anda belum memiliki pesanan selesai untuk produk ini.', 
        type: 'error' 
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const targetOrder = eligibleOrders.find((o) => o.id === selectedOrderId);
    const orderNumber = targetOrder ? targetOrder.orderNumber : 'KOPDES-ORD';

    const res = await addProductReview({
      productId: product.id,
      productName: product.name,
      orderId: selectedOrderId,
      orderNumber: orderNumber,
      rating: rating,
      comment: comment,
    });

    setIsSubmitting(false);
    if (res.success) {
      setFeedback({ message: res.message, type: 'success' });
      setComment('');
      setTimeout(() => {
        // Can close or stay to see
      }, 1500);
    } else {
      setFeedback({ message: res.message, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-white/20 p-2 rounded-2xl">{product.emoji || '📦'}</span>
            <div>
              <h3 className="font-black text-lg leading-tight">Ulasan & Rating Produk</h3>
              <p className="text-xs text-red-100 font-medium truncate max-w-xs sm:max-w-md">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Rating Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-amber-900 uppercase">Rating Keseluruhan</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-black text-amber-900">{stats.averageRating}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(stats.averageRating) ? 'fill-current text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900">{stats.reviewCount}</span>
              <p className="text-xs font-bold text-slate-600">Total Ulasan Pelanggan</p>
            </div>
          </div>

          {/* Form Tulis Ulasan (Hanya Jika Eligible) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-red-600" />
              <span>Tulis Ulasan Anda</span>
            </h4>

            {!user ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-600 font-semibold">Silakan masuk sebagai Anggota atau Pengunjung Basic untuk memberikan ulasan.</p>
                <button
                  onClick={onOpenAuth}
                  className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Masuk / Daftar Akun
                </button>
              </div>
            ) : !canReview || eligibleOrders.length === 0 ? (
              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 font-medium">
                  Ulasan dan rating hanya bisa diisi setelah pesanan selesai. Anda harus menyelesaikan pembelian produk ini terlebih dahulu sebelum dapat memberikan ulasan & rating.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Select Eligible Order if available */}
                {eligibleOrders.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Transaksi Selesai:</label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {eligibleOrders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          Pesanan #{ord.orderNumber} ({ord.formattedDate}) - Status: Selesai
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Star Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Rating Bintang (1 - 5):</label>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-300 w-fit">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 focus:outline-none cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= rating ? 'fill-current text-amber-500' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-black text-amber-900 ml-2">{rating} / 5 Bintang</span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Komentar / Ulasan (Opsional):</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ceritakan pengalaman Anda menggunakan produk ini (kualitas, rasa, kesegaran, dll)..."
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  ></textarea>
                </div>

                {feedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    feedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {feedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengirim Ulasan...' : 'Kirim Ulasan Produk'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Daftar Semua Ulasan Produk Ini */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm">Ulasan Pelanggan ({productReviews.length})</h4>
            {productReviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan ulasan!</p>
            ) : (
              <div className="space-y-3">
                {productReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                          {rev.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">{rev.customerName}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              rev.customerRole === 'ANGGOTA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {rev.customerRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{rev.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating ? 'fill-current text-amber-500' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-slate-700 font-medium pl-10">"{rev.comment}"</p>
                    )}

                    {rev.adminReply && (
                      <div className="ml-10 pl-3 border-l-2 border-red-500 bg-white p-2.5 rounded-r-xl space-y-0.5">
                        <span className="text-[10px] font-extrabold text-red-700">Balasan Admin Koperasi:</span>
                        <p className="text-[11px] text-slate-600 font-medium">{rev.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
