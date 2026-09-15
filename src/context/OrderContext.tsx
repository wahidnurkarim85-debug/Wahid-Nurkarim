import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  runTransaction,
  addDoc
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { CustomerOrder, OrderStatus, PaymentStatus, PaymentMethod, OrderItem, Voucher } from '../types';
import { useAuth } from './AuthContext';
import { useInbox } from './InboxContext';
import { usePoints } from './PointContext';

interface CreateOrderParams {
  customerName: string;
  customerPhone: string;
  customerRole: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN';
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  appliedVoucher?: Voucher | null;
  voucherDiscountAmount: number;
  shippingOrigin: string;
  shippingDestination: string;
  deliveryDistanceKm: number;
  billedDistanceKm: number;
  shippingRatePerKm: number;
  rawShippingFee: number;
  appliedShippingVoucherCode?: string;
  shippingVoucherDiscount: number;
  shippingFee: number;
  grandTotal: number;
  shippingAddress: string;
  landmarkNotes?: string;
  customerNotes?: string;
  paymentMethod?: PaymentMethod;
  estimatedPoints?: number;
}

interface OrderContextType {
  orders: CustomerOrder[];
  userOrders: CustomerOrder[];
  loading: boolean;
  isCreatingOrder: boolean;
  isOrderHistoryOpen: boolean;
  setIsOrderHistoryOpen: (open: boolean) => void;
  selectedOrderForDetail: CustomerOrder | null;
  setSelectedOrderForDetail: (order: CustomerOrder | null) => void;
  openOrderDetail: (orderId: string) => void;
  createOrder: (params: CreateOrderParams) => Promise<CustomerOrder>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, nextStatus: PaymentStatus, note?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const LOCAL_ORDERS_KEY = 'kopdes_local_order_ids_v1';

function formatIndonesianDateTime(date: Date): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = date.getDate().toString().padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d} ${m} ${y}, ${h}:${min} WIB`;
}

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { createInboxMessage } = useInbox();
  const { awardPointsForOrder, deductPointsForOrder } = usePoints();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [localOrderIds, setLocalOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState<boolean>(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<CustomerOrder | null>(null);

  // Sync local order IDs with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrderIds));
    } catch {}
  }, [localOrderIds]);

  // Real-time Firestore listener for orders
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orderList: CustomerOrder[] = [];
        snapshot.forEach((docSnap) => {
          orderList.push({ ...docSnap.data(), id: docSnap.id } as CustomerOrder);
        });
        setOrders(orderList);
        setLoading(false);
      },
      (error) => {
        console.warn('Orders onSnapshot error (using cached state):', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter orders for the active user (Member account or Basic/Visitor)
  const userOrders = useMemo(() => {
    const userIdentifiers = [
      user?.uid,
      user?.accountId,
      user?.phone,
      user?.email,
    ].filter(Boolean) as string[];

    return orders.filter((ord) => {
      // 1. Matches any identifier if logged in
      if (userIdentifiers.length > 0) {
        if (ord.userId && userIdentifiers.includes(ord.userId)) return true;
        if (ord.userAccountId && userIdentifiers.includes(ord.userAccountId)) return true;
        if (ord.customerPhone && userIdentifiers.includes(ord.customerPhone)) return true;
      }
      // 2. Or matches order ID recorded on this browser session
      if (localOrderIds.includes(ord.id) || localOrderIds.includes(ord.orderNumber)) {
        return true;
      }
      return false;
    });
  }, [orders, user, localOrderIds]);

  // Open single order detail
  const openOrderDetail = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (found) {
      setSelectedOrderForDetail(found);
    }
  };

  // 🛍️ BUAT PESANAN LANGSUNG DARI WEBSITE
  const createOrder = async (params: CreateOrderParams): Promise<CustomerOrder> => {
    if (isCreatingOrder) {
      throw new Error('Pesanan sedang diproses, mohon tunggu sebentar...');
    }

    setIsCreatingOrder(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `ORD-${dateStr}-${randomSuffix}`;
      const docId = orderNumber;
      const formattedDate = formatIndonesianDateTime(now);

      const totalPaidItemsCount = params.items.filter((i) => !i.isBonus).reduce((s, i) => s + i.quantity, 0);
      const totalBonusItemsCount = params.items.filter((i) => i.isBonus).reduce((s, i) => s + i.quantity, 0);
      const totalItemsCount = totalPaidItemsCount + totalBonusItemsCount;

      const rawOrder = {
        id: docId,
        orderNumber,
        createdAt: now.toISOString(),
        formattedDate,
        customerName: params.customerName.trim() || 'Pelanggan',
        customerPhone: params.customerPhone.trim() || '-',
        customerRole: params.customerRole,
        userId: user?.uid || null,
        userAccountId: user?.accountId || null,
        items: params.items,
        totalItemsCount,
        totalPaidItemsCount,
        totalBonusItemsCount,
        subtotal: params.subtotal,
        discountAmount: params.discountAmount,
        appliedVoucherCode: params.appliedVoucher?.code || null,
        voucherDiscountAmount: params.voucherDiscountAmount,
        shippingOrigin: params.shippingOrigin,
        shippingDestination: params.shippingDestination,
        deliveryDistanceKm: params.deliveryDistanceKm,
        billedDistanceKm: params.billedDistanceKm,
        shippingRatePerKm: params.shippingRatePerKm,
        rawShippingFee: params.rawShippingFee,
        appliedShippingVoucherCode: params.appliedShippingVoucherCode || null,
        shippingVoucherDiscount: params.shippingVoucherDiscount,
        shippingFee: params.shippingFee,
        grandTotal: params.grandTotal,
        shippingAddress: params.shippingAddress,
        landmarkNotes: params.landmarkNotes || null,
        customerNotes: params.customerNotes || null,
        paymentMethod: params.paymentMethod || 'Transfer Bank',
        paymentStatus: 'Menunggu Pembayaran',
        orderStatus: 'Menunggu Pembayaran',
        estimatedPoints: params.estimatedPoints || 0,
        pointsAwarded: false,
        pointsEarned: 0,
        statusHistory: [
          {
            status: 'Pesanan Dibuat',
            updatedAt: formattedDate,
            note: 'Pesanan berhasil dibuat langsung melalui sistem website.'
          },
          {
            status: 'Menunggu Pembayaran',
            updatedAt: formattedDate,
            note: 'Menunggu konfirmasi pembayaran dari pelanggan.'
          }
        ],
        updatedAt: now.toISOString(),
      };

      const newOrder: CustomerOrder = sanitizeFirestoreData(rawOrder as CustomerOrder);

      // 1. Simpan order ke Firestore
      await setDoc(doc(db, 'orders', docId), newOrder);

      // 2. Catat ke ID lokal browser untuk akses instan
      setLocalOrderIds((prev) => Array.from(new Set([docId, ...prev])));

      // 3. Update memory state
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== docId)]);

      // 4. Update penggunaan Voucher (bila ada)
      if (params.appliedVoucher) {
        try {
          const v = params.appliedVoucher;
          const userKey = user?.uid || user?.accountId || params.customerPhone || 'visitor';
          const currentUsage = v.userUsage || {};
          const userUsedCount = (currentUsage[userKey] || 0) + 1;
          const nextUserUsage = { ...currentUsage, [userKey]: userUsedCount };
          const nextTotalUsed = (v.usedCount || 0) + 1;
          const maxLimit = v.usageLimit || 1;

          // Periksa apakah sudah mencapai batas penggunaan
          const isDepletedForUser = userUsedCount >= maxLimit;

          await updateDoc(doc(db, 'vouchers', v.id), {
            usedCount: nextTotalUsed,
            userUsage: nextUserUsage,
            ...(isDepletedForUser && maxLimit === 1 ? { isDepleted: true } : {})
          });

          // Catat penggunaan voucher ke riwayat gift_activities
          await addDoc(collection(db, 'gift_activities'), {
            type: 'voucher',
            orderId: orderNumber,
            voucherCode: v.code,
            giftName: v.name || v.code,
            memberName: params.customerName,
            memberPhone: params.customerPhone,
            memberId: user?.id || user?.phone || user?.accountId || 'guest',
            discountSummary: v.discountType === 'percentage' ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString('id-ID')}`,
            givenAt: new Date().toISOString(),
            status: 'Digunakan',
            usedCount: userUsedCount,
            remainingQuota: v.quota !== undefined ? Math.max(0, v.quota - nextTotalUsed) : undefined,
          });
        } catch (vErr) {
          console.warn('Gagal memperbarui kuota voucher di Firestore:', vErr);
        }
      }

      // 5. Potong stok produk dan stok bonus di Firestore secara otomatis
      try {
        for (const item of params.items) {
          if (item.isBonus) {
            // Potong stok bonus program promo
            if (item.bonusPromoId) {
              try {
                const promoRef = doc(db, 'promotions', item.bonusPromoId);
                await runTransaction(db, async (tx) => {
                  const pSnap = await tx.get(promoRef);
                  if (pSnap.exists()) {
                    const pData = pSnap.data();
                    const currentBonusStock = pData.bonusStock !== undefined ? Number(pData.bonusStock) : 100;
                    const nextBonusStock = Math.max(0, currentBonusStock - item.quantity);
                    tx.update(promoRef, {
                      bonusStock: nextBonusStock,
                      isStockExhausted: nextBonusStock <= 0,
                      updatedAt: new Date().toISOString(),
                    });
                  }
                });

                // Catat pemberian/penggunaan bonus ke gift_activities
                await addDoc(collection(db, 'gift_activities'), {
                  type: 'bonus',
                  orderId: orderNumber,
                  giftName: item.bonusPromoName || item.productName,
                  bonusProductName: item.productName,
                  bonusQty: item.quantity,
                  memberName: params.customerName,
                  memberPhone: params.customerPhone,
                  memberId: user?.id || user?.phone || user?.accountId || 'guest',
                  givenAt: new Date().toISOString(),
                  status: 'Digunakan',
                  usedCount: 1,
                });
              } catch (promoErr) {
                console.warn('Gagal memotong stok bonus promo:', promoErr);
              }
            }
            continue;
          }

          const prodRef = doc(db, 'products', item.productId);
          await runTransaction(db, async (tx) => {
            const pSnap = await tx.get(prodRef);
            if (pSnap.exists()) {
              const pData = pSnap.data();
              const varStocks = { ...(pData.variationStocks || {}) };
              if (varStocks[item.variation] !== undefined) {
                varStocks[item.variation] = Math.max(0, varStocks[item.variation] - item.quantity);
              }
              const nextTotalStock: number = Object.values(varStocks).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
              tx.update(prodRef, {
                variationStocks: varStocks,
                stock: nextTotalStock > 0 ? nextTotalStock : Math.max(0, (Number(pData.stock) || 0) - item.quantity),
                updatedAt: new Date().toISOString()
              });
            }
          });
        }
      } catch (stkErr) {
        console.warn('Gagal memotong stok transaksi otomatis:', stkErr);
      }

      // 6. 📩 Buat Notifikasi Otomatis Masuk Kotak Pesan
      const targetUserId = user?.accountId || user?.phone || user?.email || user?.uid || params.customerPhone;
      const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(params.grandTotal);

      await createInboxMessage({
        title: '🔔 Pesanan Berhasil Dibuat',
        content: `Pesanan Anda #${orderNumber} telah berhasil dibuat melalui website.\n\n` +
          `• Total Belanja: ${formattedTotal}\n` +
          `• Jumlah Produk: ${totalItemsCount} item\n` +
          `• Status: Menunggu Pembayaran\n\n` +
          `Silakan membuka Riwayat Pesanan untuk melihat detail pesanan atau melakukan pembayaran.`,
        category: 'pesanan',
        targetAudience: targetUserId ? 'specific' : 'all',
        targetUserId: targetUserId || undefined,
        sender: 'system',
        isActive: true,
        actionType: 'order',
        actionLabel: '📦 Lihat Pesanan',
        actionTab: 'cart',
        metadata: {
          orderId: orderNumber,
          amount: params.grandTotal
        }
      });

      return newOrder;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // 🔄 PERBARUI STATUS PESANAN (DILAKUKAN ADMIN DENGAN NOTIFIKASI OTOMATIS KE KOTAK PESAN)
  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus, note?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!targetOrder) return;

    const now = new Date();
    const formattedDate = formatIndonesianDateTime(now);
    const existingHistory = targetOrder.statusHistory || [];

    const newHistoryEntry = {
      status: nextStatus,
      updatedAt: formattedDate,
      note: note || `Status diperbarui menjadi: ${nextStatus}`
    };

    const isLunas = nextStatus === 'Pembayaran Berhasil' || nextStatus === 'Dikemas' || nextStatus === 'Dikirim' || nextStatus === 'Selesai';
    const nextPaymentStatus: PaymentStatus = isLunas ? 'Lunas' : targetOrder.paymentStatus;

    const updatePayload: Partial<CustomerOrder> = {
      orderStatus: nextStatus,
      paymentStatus: nextPaymentStatus,
      statusHistory: [...existingHistory, newHistoryEntry],
      updatedAt: now.toISOString()
    };

    // 🎁 Otomatis Berikan / Potong Point Berdasarkan Status Transaksi
    if (nextStatus === 'Selesai' && !targetOrder.pointsAwarded) {
      try {
        const res = await awardPointsForOrder(targetOrder);
        if (res && res.pointsAwarded > 0) {
          updatePayload.pointsAwarded = true;
          updatePayload.pointsEarned = res.pointsAwarded;
        }
      } catch (ptErr) {
        console.warn('Gagal memberikan point otomatis saat pesanan selesai:', ptErr);
      }
    } else if (nextStatus === 'Dibatalkan' && targetOrder.pointsAwarded) {
      try {
        await deductPointsForOrder(targetOrder, note || 'Pesanan dibatalkan');
        updatePayload.pointsAwarded = false;
      } catch (ptErr) {
        console.warn('Gagal memotong point pesanan yang dibatalkan:', ptErr);
      }
    }

    // 1. Update State Lokal Instan
    setOrders((prev) =>
      prev.map((o) => (o.id === targetOrder.id ? { ...o, ...updatePayload } : o))
    );
    if (selectedOrderForDetail?.id === targetOrder.id) {
      setSelectedOrderForDetail({ ...selectedOrderForDetail, ...updatePayload });
    }

    // 2. Persist ke Firestore
    try {
      await updateDoc(doc(db, 'orders', targetOrder.id), updatePayload);
    } catch (err) {
      console.warn('Gagal update status order ke Firestore:', err);
    }

    // 3. 📩 Kirim Notifikasi Perubahan Status Otomatis ke Kotak Pesan Pelanggan
    const targetUserId = targetOrder.userId || targetOrder.userAccountId || targetOrder.customerPhone;
    let notifTitle = '';
    let notifContent = '';

    switch (nextStatus) {
      case 'Pembayaran Berhasil':
        notifTitle = '💳 Pembayaran Berhasil Diterima';
        notifContent = `Pembayaran untuk pesanan #${targetOrder.orderNumber} telah berhasil diterima dan diverifikasi oleh sistem/Admin Kopdes. Pesanan akan segera disiapkan.`;
        break;
      case 'Verifikasi Pesanan':
        notifTitle = '🔎 Pesanan Sedang Diverifikasi';
        notifContent = `Pesanan #${targetOrder.orderNumber} sedang dalam tahap verifikasi rincian barang dan alamat oleh Admin Kopdes.`;
        break;
      case 'Dikemas':
        notifTitle = '📦 Pesanan Sedang Dikemas';
        notifContent = `Pesanan #${targetOrder.orderNumber} sedang dikemas dengan rapi oleh petugas Kopdes Merah Putih untuk pengiriman.`;
        break;
      case 'Dikirim':
        notifTitle = '🚚 Pesanan Sedang Dikirim';
        notifContent = `Pesanan #${targetOrder.orderNumber} telah diserahkan kepada kurir dan dalam perjalanan menuju alamat Anda.`;
        break;
      case 'Selesai':
        notifTitle = '✅ Pesanan Selesai';
        notifContent = `Pesanan #${targetOrder.orderNumber} telah selesai. Terima kasih telah berbelanja sembako di Koperasi Desa Merah Putih Cengkareng Timur!${
          updatePayload.pointsEarned ? `\n\n⭐ Selamat! Anda memperoleh +${updatePayload.pointsEarned} Point dari pesanan ini. Cek saldo dan tukarkan hadiah menarik di menu 'Point Pembelian'.` : ''
        }`;
        break;
      case 'Dibatalkan':
        notifTitle = '❌ Pesanan Dibatalkan';
        notifContent = `Pesanan #${targetOrder.orderNumber} telah dibatalkan. ${note ? `Alasan: ${note}` : ''}${
          targetOrder.pointsAwarded ? '\n\n⚠️ Point yang diperoleh dari pesanan ini telah ditarik kembali sesuai ketentuan pembatalan.' : ''
        }`;
        break;
      default:
        notifTitle = `ℹ️ Status Pesanan #${targetOrder.orderNumber}: ${nextStatus}`;
        notifContent = `Pesanan #${targetOrder.orderNumber} diperbarui menjadi status ${nextStatus}. ${note || ''}`;
        break;
    }

    await createInboxMessage({
      title: notifTitle,
      content: notifContent,
      category: 'pesanan',
      targetAudience: targetUserId ? 'specific' : 'all',
      targetUserId: targetUserId || undefined,
      sender: 'system',
      isActive: true,
      actionType: 'order',
      actionLabel: '📦 Lihat Pesanan',
      actionTab: 'cart',
      metadata: {
        orderId: targetOrder.orderNumber,
        amount: targetOrder.grandTotal
      }
    });
  };

  // Update payment status specifically
  const updatePaymentStatus = async (orderId: string, nextStatus: PaymentStatus, note?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!targetOrder) return;

    const now = new Date();
    const formattedDate = formatIndonesianDateTime(now);

    const updatePayload: Partial<CustomerOrder> = {
      paymentStatus: nextStatus,
      orderStatus: nextStatus === 'Lunas' ? 'Pembayaran Berhasil' : targetOrder.orderStatus,
      statusHistory: [
        ...(targetOrder.statusHistory || []),
        {
          status: (nextStatus === 'Lunas' ? 'Pembayaran Berhasil' : targetOrder.orderStatus) as OrderStatus,
          updatedAt: formattedDate,
          note: note || `Status pembayaran diubah menjadi: ${nextStatus}`
        }
      ],
      updatedAt: now.toISOString()
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === targetOrder.id ? { ...o, ...updatePayload } : o))
    );
    if (selectedOrderForDetail?.id === targetOrder.id) {
      setSelectedOrderForDetail({ ...selectedOrderForDetail, ...updatePayload });
    }

    try {
      await updateDoc(doc(db, 'orders', targetOrder.id), updatePayload);
    } catch (e) {
      console.warn('Gagal update payment status ke Firestore:', e);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: string, reason?: string) => {
    await updateOrderStatus(orderId, 'Dibatalkan', reason || 'Pesanan dibatalkan oleh pengguna.');
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        userOrders,
        loading,
        isCreatingOrder,
        isOrderHistoryOpen,
        setIsOrderHistoryOpen,
        selectedOrderForDetail,
        setSelectedOrderForDetail,
        openOrderDetail,
        createOrder,
        updateOrderStatus,
        updatePaymentStatus,
        cancelOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
