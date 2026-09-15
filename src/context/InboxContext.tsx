import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc 
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { InboxMessage, InboxCategory, InboxTargetAudience } from '../types';
import { useAuth } from './AuthContext';
import { formatIndonesianDateTime } from '../services/accountService';

interface InboxContextType {
  messages: InboxMessage[];
  allAdminMessages: InboxMessage[];
  unreadCount: number;
  loading: boolean;
  isAuthenticatedUser: boolean;
  isBasicUser: boolean;
  isMemberUser: boolean;
  latestNewGift: InboxMessage | null;
  dismissLatestGift: () => void;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteMessageForUser: (messageId: string) => Promise<void>;
  createInboxMessage: (msg: Omit<InboxMessage, 'id' | 'createdAt' | 'isRead' | 'readBy' | 'deletedBy'> & { createdAtTimestamp?: number; expiresAtTimestamp?: number }) => Promise<void>;
  deleteMessageByAdmin: (messageId: string) => Promise<void>;
  toggleMessageActiveByAdmin: (messageId: string, currentActive: boolean) => Promise<void>;
  // System triggers & Gift distribution
  sendOrderNotification: (orderId: string, grandTotal: number, itemCount: number) => Promise<void>;
  sendVoucherNotification: (voucherCode: string, discountNominal: number) => Promise<void>;
  sendGiftNotification: (giftName: string, notes?: string) => Promise<void>;
  sendPromoNotification: (title: string, content: string) => Promise<void>;
  sendGiftVoucherNotification: (params: {
    name: string;
    code: string;
    discountText: string;
    minPurchase: number;
    usageLimit: number;
    expiresAt: string;
    targetAudience: 'all' | 'member' | 'specific';
    targetUserId?: string;
    giftTitle?: string;
    giftMessage?: string;
  }) => Promise<void>;
  sendGiftBonusProgramNotification: (params: {
    programName: string;
    giftTitle?: string;
    triggerProductName: string;
    minQty: number;
    rewardProductName: string;
    rewardQty: number;
    targetAudience: 'all' | 'member' | 'specific';
    targetUserId?: string;
    expiresAt?: string;
  }) => Promise<void>;
}

const InboxContext = createContext<InboxContextType | undefined>(undefined);

const LOCAL_INBOX_KEY = 'kopdes_inbox_messages_v1';
const LOCAL_READ_IDS_KEY = 'kopdes_inbox_read_ids_v1';
const LOCAL_DELETED_IDS_KEY = 'kopdes_inbox_deleted_ids_v1';

// Initial pre-seeded messages for real-time rich experience
export const INITIAL_INBOX_MESSAGES: InboxMessage[] = [
  {
    id: 'msg_vouc_001',
    title: '🎟️ Selamat! Voucher Sembako Rp10.000 Aktif',
    content: 'Koperasi Desa Merah Putih memberikan voucher potongan belanja Rp10.000 untuk transaksi sembako Anda. Gunakan kode diskon di keranjang belanja!',
    category: 'voucher',
    createdAt: '08 September 2026, 10:00:00',
    isRead: false,
    targetAudience: 'all',
    sender: 'system',
    isActive: true,
    actionType: 'voucher',
    actionLabel: 'Lihat Voucher',
    actionTab: 'cart',
    metadata: { voucherCode: 'KOPDES10K' }
  },
  {
    id: 'msg_gift_002',
    title: '🎁 Bonus Promo Gift Minyak Goreng 1L',
    content: 'Belanja kebutuhan pokok minimal Rp150.000 minggu ini dan nikmati bonus langsung 1 liter Minyak Goreng kemasan resmi dari Kopdes Cengkareng Timur.',
    category: 'gift',
    createdAt: '08 September 2026, 12:30:00',
    isRead: false,
    targetAudience: 'all',
    sender: 'system',
    isActive: true,
    actionType: 'gift',
    actionLabel: 'Lihat Promo Gift',
    actionTab: 'catalog',
    metadata: { giftName: 'Minyak Goreng 1L' }
  },
  {
    id: 'msg_order_003',
    title: '🛍️ Pesanan Sembako Anda Siap Diproses',
    content: 'Terima kasih telah berbelanja di Gerai Sembako Koperasi Desa Merah Putih. Pesanan Anda dicatat dalam sistem dan tim kurir siap mengantarkan belanjaan ke rumah Anda.',
    category: 'pesanan',
    createdAt: '08 September 2026, 14:45:00',
    isRead: false,
    targetAudience: 'all',
    sender: 'system',
    isActive: true,
    actionType: 'order',
    actionLabel: 'Lihat Pesanan',
    actionTab: 'cart'
  },
  {
    id: 'msg_promo_004',
    title: '💰 Diskon Spesial Beras Rojolele & Gula Pasir',
    content: 'Harga spesial sembako murah merakyat kembali hadir! Nikmati potongan harga hingga 15% untuk anggota resmi dan 5% untuk seluruh pelanggan gerai.',
    category: 'promo',
    createdAt: '09 September 2026, 08:15:00',
    isRead: false,
    targetAudience: 'all',
    sender: 'admin',
    isActive: true,
    actionType: 'promo',
    actionLabel: 'Lihat Katalog Sembako',
    actionTab: 'catalog'
  },
  {
    id: 'msg_info_005',
    title: '📢 Layanan Antar Gerai Sembako Cengkareng Timur',
    content: 'Pemberitahuan: Pengiriman sembako kini menggunakan motor kurir lokal dengan tarif hemat bebas tol, melayani seluruh kawasan Cengkareng Timur dan sekitarnya.',
    category: 'informasi',
    createdAt: '09 September 2026, 09:00:00',
    isRead: true,
    targetAudience: 'all',
    sender: 'admin',
    isActive: true,
    actionType: 'catalog',
    actionLabel: 'Buka Katalog',
    actionTab: 'catalog'
  },
  {
    id: 'msg_sys_006',
    title: '⚠️ Sistem: Verifikasi Akun Basic Sukses',
    content: 'Akun Basic Anda aktif di sistem Koperasi Desa Merah Putih. Anda dapat menyimpan alamat pengantaran, mengumpulkan voucher belanja, atau meng-upgrade akun ke Anggota Koperasi.',
    category: 'sistem',
    createdAt: '09 September 2026, 09:30:00',
    isRead: true,
    targetAudience: 'all',
    sender: 'system',
    isActive: true,
    actionType: 'profile',
    actionLabel: 'Buka Profil Akun',
    actionTab: 'member'
  }
];

export const InboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [rawMessages, setRawMessages] = useState<InboxMessage[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_INBOX_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_INBOX_MESSAGES;
  });

  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_READ_IDS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['msg_info_005', 'msg_sys_006'];
  });

  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_DELETED_IDS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Sync to Firestore & listen real-time
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'inbox_messages');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: InboxMessage[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as Omit<InboxMessage, 'id'>) });
          });
          // Sort newest first
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setRawMessages(list);
          try {
            localStorage.setItem(LOCAL_INBOX_KEY, JSON.stringify(list));
          } catch {}
        } else {
          // Seed with initial messages
          INITIAL_INBOX_MESSAGES.forEach(async (msg) => {
            try {
              await setDoc(doc(db, 'inbox_messages', msg.id), msg, { merge: true });
            } catch {}
          });
          setRawMessages(INITIAL_INBOX_MESSAGES);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore inbox_messages error, using local fallback:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Save local read and deleted IDs
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_READ_IDS_KEY, JSON.stringify(localReadIds));
    } catch {}
  }, [localReadIds]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DELETED_IDS_KEY, JSON.stringify(localDeletedIds));
    } catch {}
  }, [localDeletedIds]);

  const [dismissedGiftIds, setDismissedGiftIds] = useState<string[]>([]);

  const isMemberUser = Boolean(
    user && (
      user.accountStatus === 'ANGGOTA' || 
      user.role === 'member'
    )
  );

  const isBasicUser = Boolean(
    user && (
      user.accountStatus === 'PENGUNJUNG' || 
      user.accountStatus === 'BASIC' || 
      user.role === 'visitor' ||
      (!isMemberUser && user.role !== 'staff')
    )
  );

  const isStaffUser = Boolean(
    user && user.role === 'staff'
  );

  const isAuthenticatedUser = Boolean(
    user && (isMemberUser || isBasicUser || isStaffUser)
  );

  // Filter messages for current user and accurately calculate per-user read/unread state
  const userMessages = useMemo(() => {
    // 🔒 ATURAN UTAMA:
    // Kotak pesan pelanggan otomatis tidak menerima pesan saat tidak login akun basic atau anggota
    if (!isAuthenticatedUser || !user) {
      return [];
    }

    const userId = user.uid || user.accountId || user.phone || '';
    const userIdentifiers = [
      userId,
      user.uid,
      user.accountId,
      user.phone,
      user.email,
    ].filter(Boolean) as string[];

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari dalam milidetik

    return rawMessages
      .filter((msg) => {
        if (!msg.isActive) return false;

        // ⏳ ATURAN 5: PESAN OTOMATIS TERHAPUS SETELAH 7 HARI
        // Setiap pesan Gift disimpan maksimal 7 hari. Sistem otomatis menghapus pesan setelah 7 hari.
        let msgTime = msg.createdAtTimestamp;
        if (!msgTime && msg.createdAt) {
          const parsed = Date.parse(msg.createdAt);
          if (!isNaN(parsed)) {
            msgTime = parsed;
          }
        }
        if (msgTime && now - msgTime > SEVEN_DAYS_MS) {
          return false; // Otomatis terhapus setelah 7 hari
        }

        // 👥 ATURAN: SISTEM TERPISAH ANGGOTA & BASIC
        // Basic tidak mendapatkan fitur Gift, Voucher khusus Anggota, Kotak Pesan Gift Anggota
        if (!isMemberUser && !isStaffUser) {
          // Pengunjung/Basic hanya boleh menerima info umum atau broadcast pengunjung
          if (msg.category === 'gift') {
            return false;
          }
          if (msg.targetAudience === 'member') {
            return false;
          }
        }

        // Check if deleted by this user (either in doc or locally)
        const isDeletedInDoc = Array.isArray(msg.deletedBy) && userIdentifiers.some((id) => msg.deletedBy?.includes(id));
        const isDeletedLocally = localDeletedIds.includes(msg.id);
        if (isDeletedInDoc || isDeletedLocally) return false;

        // Check target audience
        if (msg.targetAudience === 'all') return true;
        if (msg.targetAudience === 'member' && (isMemberUser || isStaffUser)) return true;
        if (msg.targetAudience === 'visitor' && isBasicUser) return true;
        if (msg.targetAudience === 'specific') {
          if (!msg.targetUserId) return false;
          const targetClean = msg.targetUserId.toLowerCase().trim();
          if (
            (user.accountId && user.accountId.toLowerCase().trim() === targetClean) ||
            (user.phone && user.phone.replace(/[^0-9]/g, '') === targetClean.replace(/[^0-9]/g, '')) ||
            (user.email && user.email.toLowerCase().trim() === targetClean) ||
            (user.uid && user.uid === targetClean)
          ) {
            return true;
          }
          return false;
        }
        return false;
      })
      .map((msg) => {
        // A message is read if it was marked read locally OR recorded in readBy array in Firestore
        const isReadInDoc = Array.isArray(msg.readBy) && userIdentifiers.some((id) => msg.readBy?.includes(id));
        const isReadLocally = localReadIds.includes(msg.id);
        const isReadSpecific = msg.targetAudience === 'specific' && Boolean(msg.isRead);

        return {
          ...msg,
          isRead: Boolean(isReadInDoc || isReadLocally || isReadSpecific),
        };
      });
  }, [rawMessages, user, isAuthenticatedUser, isMemberUser, isBasicUser, isStaffUser, localReadIds, localDeletedIds]);

  // Compute unread count in real-time
  const unreadCount = useMemo(() => {
    if (!isAuthenticatedUser) return 0;
    return userMessages.filter((m) => !m.isRead).length;
  }, [isAuthenticatedUser, userMessages]);

  // 📲 ATURAN 3: NOTIFIKASI GIFT BARU DI DALAM WEBSITE
  // Menampilkan pop-up banner gift baru saat anggota mendapatkan gift/voucher yang belum dibaca
  const latestNewGift = useMemo(() => {
    if (!isAuthenticatedUser || !isMemberUser) return null;
    const unreadGift = userMessages.find(
      (m) => !m.isRead && (m.category === 'gift' || m.category === 'voucher') && !dismissedGiftIds.includes(m.id)
    );
    return unreadGift || null;
  }, [isAuthenticatedUser, userMessages, isMemberUser, dismissedGiftIds]);

  const dismissLatestGift = () => {
    if (latestNewGift) {
      setDismissedGiftIds((prev) => [...prev, latestNewGift.id]);
    }
  };

  // Mark single message as read
  const markAsRead = async (messageId: string) => {
    if (!isAuthenticatedUser || !user) return;
    const userIdentifiers = [
      user.uid,
      user.accountId,
      user.phone,
      user.email,
    ].filter(Boolean) as string[];

    // 1. Update local state immediately for 0ms reactive feedback
    setLocalReadIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));

    // 2. Synchronously update rawMessages in React state so unreadCount decrements instantly
    setRawMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          return {
            ...msg,
            readBy: Array.from(new Set([...currentReadBy, ...userIdentifiers])),
            isRead: true,
          };
        }
        return msg;
      })
    );

    // 3. Persist to Firestore
    try {
      const msgDoc = rawMessages.find((m) => m.id === messageId);
      if (msgDoc) {
        const currentReadBy = Array.isArray(msgDoc.readBy) ? msgDoc.readBy : [];
        const updatedReadBy = Array.from(new Set([...currentReadBy, ...userIdentifiers]));
        await updateDoc(doc(db, 'inbox_messages', messageId), {
          readBy: updatedReadBy,
          isRead: true,
        });
      }
    } catch (e) {
      console.warn('Failed to update read status in Firestore:', e);
    }
  };

  // Mark all messages as read
  const markAllAsRead = async () => {
    if (!isAuthenticatedUser || !user) return;
    const allIds = userMessages.map((m) => m.id);
    if (allIds.length === 0) return;

    const userIdentifiers = [
      user.uid,
      user.accountId,
      user.phone,
      user.email,
    ].filter(Boolean) as string[];

    // 1. Update local state immediately
    setLocalReadIds((prev) => Array.from(new Set([...prev, ...allIds])));

    // 2. Synchronously update rawMessages in memory
    setRawMessages((prev) =>
      prev.map((msg) => {
        if (allIds.includes(msg.id)) {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          return {
            ...msg,
            readBy: Array.from(new Set([...currentReadBy, ...userIdentifiers])),
            isRead: true,
          };
        }
        return msg;
      })
    );

    // 3. Persist to Firestore
    for (const msg of userMessages) {
      if (!msg.isRead) {
        try {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          const updatedReadBy = Array.from(new Set([...currentReadBy, ...userIdentifiers]));
          await updateDoc(doc(db, 'inbox_messages', msg.id), {
            readBy: updatedReadBy,
            isRead: true,
          });
        } catch {}
      }
    }
  };

  // Delete message for this user (does NOT alter original order or database data)
  const deleteMessageForUser = async (messageId: string) => {
    if (!isAuthenticatedUser || !user) return;
    const userIdentifiers = [
      user.uid,
      user.accountId,
      user.phone,
      user.email,
    ].filter(Boolean) as string[];

    // 1. Update local state immediately
    setLocalDeletedIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));

    // 2. Update rawMessages in state
    setRawMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const currentDeleted = Array.isArray(msg.deletedBy) ? msg.deletedBy : [];
          return {
            ...msg,
            deletedBy: Array.from(new Set([...currentDeleted, ...userIdentifiers])),
          };
        }
        return msg;
      })
    );

    // 3. Persist to Firestore
    try {
      const msgDoc = rawMessages.find((m) => m.id === messageId);
      if (msgDoc) {
        const currentDeleted = Array.isArray(msgDoc.deletedBy) ? msgDoc.deletedBy : [];
        const updatedDeletedBy = Array.from(new Set([...currentDeleted, ...userIdentifiers]));
        await updateDoc(doc(db, 'inbox_messages', messageId), {
          deletedBy: updatedDeletedBy,
        });
      }
    } catch (e) {
      console.warn('Failed to delete message for user in Firestore:', e);
    }
  };

  // Admin create message
  const createInboxMessage = async (
    data: Omit<InboxMessage, 'id' | 'createdAt' | 'isRead' | 'readBy' | 'deletedBy'> & {
      createdAtTimestamp?: number;
      expiresAtTimestamp?: number;
    }
  ) => {
    const now = Date.now();
    const newId = `msg_${now}`;
    const nowStr = formatIndonesianDateTime(new Date(now));
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const newMsg: InboxMessage = {
      ...data,
      id: newId,
      createdAt: nowStr,
      createdAtTimestamp: data.createdAtTimestamp || now,
      expiresAtTimestamp: data.expiresAtTimestamp || (now + SEVEN_DAYS_MS),
      isRead: false,
      readBy: [],
      deletedBy: [],
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    setRawMessages((prev) => [newMsg, ...prev]);

    try {
      await setDoc(doc(db, 'inbox_messages', newId), sanitizeFirestoreData(newMsg));
    } catch (e) {
      console.warn('Failed to save new inbox message to Firestore:', e);
    }
  };

  // Admin delete message completely
  const deleteMessageByAdmin = async (messageId: string) => {
    setRawMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteDoc(doc(db, 'inbox_messages', messageId));
    } catch (e) {
      console.warn('Failed to delete inbox message by admin:', e);
    }
  };

  // Admin toggle active status
  const toggleMessageActiveByAdmin = async (messageId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setRawMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isActive: nextActive } : m))
    );
    try {
      await updateDoc(doc(db, 'inbox_messages', messageId), {
        isActive: nextActive,
      });
    } catch (e) {
      console.warn('Failed to toggle active status in Firestore:', e);
    }
  };

  // System Triggers: Auto message generators
  const sendOrderNotification = async (orderId: string, grandTotal: number, itemCount: number) => {
    const targetUserId = user?.accountId || user?.phone || user?.email || user?.uid;
    const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(grandTotal);

    await createInboxMessage({
      title: `🛍️ Pesanan #${orderId.slice(-6).toUpperCase()} Berhasil Dibuat`,
      content: `Pesanan Anda berisi ${itemCount} barang sembako senilai ${formattedTotal} telah diterima oleh sistem dan siap dipersiapkan oleh petugas Kopdes.`,
      category: 'pesanan',
      targetAudience: targetUserId ? 'specific' : 'all',
      targetUserId: targetUserId || undefined,
      sender: 'system',
      isActive: true,
      actionType: 'order',
      actionLabel: 'Lihat Rincian Pesanan',
      actionTab: 'cart',
      metadata: { orderId, amount: grandTotal }
    });
  };

  const sendVoucherNotification = async (voucherCode: string, discountNominal: number) => {
    const formattedDisc = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(discountNominal);

    await createInboxMessage({
      title: `🎟️ Voucher Diskon ${voucherCode} Diterima!`,
      content: `Selamat! Anda menerima voucher diskon sebesar ${formattedDisc}. Gunakan voucher ini saat checkout belanjaan sembako Anda untuk mendapatkan potongan langsung.`,
      category: 'voucher',
      targetAudience: 'all',
      sender: 'system',
      isActive: true,
      actionType: 'voucher',
      actionLabel: 'Gunakan di Keranjang',
      actionTab: 'cart',
      metadata: { voucherCode }
    });
  };

  const sendGiftNotification = async (giftName: string, notes?: string) => {
    await createInboxMessage({
      title: `🎁 Hadiah/Bonus Siap Diklaim: ${giftName}`,
      content: `Belanjaan Anda memenuhi kualifikasi program bonus sembako. Hadiah "${giftName}" akan dikemas bersama pesanan Anda. ${notes || ''}`,
      category: 'gift',
      targetAudience: 'all',
      sender: 'system',
      isActive: true,
      actionType: 'gift',
      actionLabel: 'Lihat Bonus Sembako',
      actionTab: 'catalog',
      metadata: { giftName }
    });
  };

  const sendPromoNotification = async (title: string, content: string) => {
    await createInboxMessage({
      title: `💰 ${title}`,
      content: content,
      category: 'promo',
      targetAudience: 'all',
      sender: 'system',
      isActive: true,
      actionType: 'promo',
      actionLabel: 'Lihat Promo',
      actionTab: 'catalog',
    });
  };

  // 🎟️ ATURAN 1 & 2: KIRIM GIFT BERUPA VOUCHER DISKON KE KOTAK PESAN ANGGOTA
  const sendGiftVoucherNotification = async (params: {
    name: string;
    code: string;
    discountText: string;
    minPurchase: number;
    usageLimit: number;
    expiresAt: string;
    targetAudience: 'all' | 'member' | 'specific';
    targetUserId?: string;
    giftTitle?: string;
    giftMessage?: string;
  }) => {
    const formattedMin = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(params.minPurchase);
    const title = params.giftTitle || `🎁 Anda Mendapat Gift Voucher!`;
    const defaultContent = 
      `Voucher ${params.code} telah masuk ke akun Anda.\n\n` +
      `• Diskon: ${params.discountText}\n` +
      `• Minimal pembelian: ${formattedMin}\n` +
      `• Penggunaan: Maksimal ${params.usageLimit}×\n` +
      `• Berlaku sampai: ${params.expiresAt}\n\n` +
      `Gunakan voucher ini di keranjang belanja saat melakukan checkout pesanan sembako Anda!`;

    await createInboxMessage({
      title,
      content: params.giftMessage || defaultContent,
      category: 'voucher',
      targetAudience: params.targetAudience,
      targetUserId: params.targetUserId,
      sender: 'admin',
      isActive: true,
      actionType: 'voucher',
      actionLabel: 'Gunakan Voucher',
      actionTab: 'cart',
      giftDetails: {
        voucherCode: params.code,
        discountText: params.discountText,
        minPurchase: params.minPurchase,
        usageLimit: params.usageLimit,
        expiresAt: params.expiresAt,
        giftType: 'voucher',
      },
      metadata: { voucherCode: params.code },
    });
  };

  // 🎁 ATURAN 6 & 7: KIRIM PEMBERITAHUAN PROGRAM GIFT GRATIS / BONUS KE KOTAK PESAN ANGGOTA
  const sendGiftBonusProgramNotification = async (params: {
    programName: string;
    giftTitle?: string;
    triggerProductName: string;
    minQty: number;
    rewardProductName: string;
    rewardQty: number;
    targetAudience: 'all' | 'member' | 'specific';
    targetUserId?: string;
    expiresAt?: string;
  }) => {
    const title = params.giftTitle || `🎁 Program Gift Bonus Baru: ${params.programName}`;
    const content = 
      `Kabar gembira untuk Anggota Koperasi!\n\n` +
      `Dapatkan bonus gratis ${params.rewardQty}x ${params.rewardProductName} (Rp0) secara otomatis setiap pembelian ${params.minQty}x ${params.triggerProductName}.\n\n` +
      `• Produk Pemicu: ${params.triggerProductName} (Minimal ${params.minQty} pcs)\n` +
      `• Produk Bonus: ${params.rewardProductName} (${params.rewardQty} pcs GRATIS Rp0)\n` +
      (params.expiresAt ? `• Periode Berlaku Sampai: ${params.expiresAt}\n\n` : '\n') +
      `Bonus akan otomatis masuk ke keranjang belanja Anda dengan harga Rp0 saat syarat terpenuhi.`;

    await createInboxMessage({
      title,
      content,
      category: 'gift',
      targetAudience: params.targetAudience,
      targetUserId: params.targetUserId,
      sender: 'admin',
      isActive: true,
      actionType: 'gift',
      actionLabel: 'Buka Katalog Belanja',
      actionTab: 'catalog',
      giftDetails: {
        giftType: 'bonus',
        bonusProductName: params.rewardProductName,
        bonusQty: params.rewardQty,
        expiresAt: params.expiresAt,
      },
      metadata: { giftName: params.programName },
    });
  };

  return (
    <InboxContext.Provider
      value={{
        messages: userMessages,
        allAdminMessages: rawMessages,
        unreadCount,
        loading,
        isAuthenticatedUser,
        isBasicUser,
        isMemberUser,
        latestNewGift,
        dismissLatestGift,
        markAsRead,
        markAllAsRead,
        deleteMessageForUser,
        createInboxMessage,
        deleteMessageByAdmin,
        toggleMessageActiveByAdmin,
        sendOrderNotification,
        sendVoucherNotification,
        sendGiftNotification,
        sendPromoNotification,
        sendGiftVoucherNotification,
        sendGiftBonusProgramNotification,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
};

export const useInbox = () => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within an InboxProvider');
  }
  return context;
};
