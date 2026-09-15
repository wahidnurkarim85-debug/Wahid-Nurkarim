import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import {
  PointProgram,
  PointReward,
  CustomerPointAccount,
  PointTransaction,
  CustomerOrder,
  PointAudience,
  CartItem
} from '../types';
import { INITIAL_POINT_PROGRAMS, INITIAL_POINT_REWARDS } from '../data/initialPointsData';
import { useAuth } from './AuthContext';
import { useInbox } from './InboxContext';

interface PointContextType {
  pointPrograms: PointProgram[];
  pointRewards: PointReward[];
  pointAccounts: CustomerPointAccount[];
  pointTransactions: PointTransaction[];
  loading: boolean;

  // Calculation & Helpers
  calculateCartPoints: (
    items: CartItem[],
    subtotal: number,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ) => {
    points: number;
    programName: string;
    terms?: string;
    isPromo: boolean;
    promoMultiplier?: number;
  };
  getProductPointBonus: (
    productId: string,
    price: number,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ) => {
    isEligible: boolean;
    estimatedPoints: number;
    badgeLabel: string;
    programName: string;
  };
  calculateProductPoints: (
    productId: string,
    variation: string,
    unitPrice: number,
    qty: number,
    audience?: 'member' | 'basic' | 'all'
  ) => number;
  isPointSystemActive: (role?: 'member' | 'basic' | 'all') => boolean;
  getCurrentUserPointAccount: (phone?: string) => CustomerPointAccount | null;
  getUserPointTransactions: (phone?: string) => PointTransaction[];

  // Order Lifecycle
  awardPointsForOrder: (order: CustomerOrder) => Promise<{ success: boolean; pointsAwarded: number }>;
  deductPointsForOrder: (order: CustomerOrder, reason?: string) => Promise<boolean>;

  // Rewards & Redemption
  redeemReward: (
    reward: PointReward,
    phone: string,
    name: string,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ) => Promise<{ success: boolean; message: string }>;

  // Admin Operations
  updateProgram: (program: PointProgram) => Promise<void>;
  addProgram: (program: Omit<PointProgram, 'id'>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;

  addReward: (reward: Omit<PointReward, 'id'>) => Promise<void>;
  updateReward: (reward: PointReward) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;

  manualAdjustPoints: (params: {
    customerPhone: string;
    customerName: string;
    customerRole: PointAudience;
    pointsDelta: number; // positive or negative
    notes: string;
  }) => Promise<boolean>;
}

const PointContext = createContext<PointContextType | undefined>(undefined);

const LOCAL_STORAGE_PROGRAMS = 'kopdes_point_programs_v1';
const LOCAL_STORAGE_REWARDS = 'kopdes_point_rewards_v1';
const LOCAL_STORAGE_ACCOUNTS = 'kopdes_point_accounts_v1';
const LOCAL_STORAGE_TRANSACTIONS = 'kopdes_point_transactions_v1';

export const PointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { createInboxMessage } = useInbox();

  const [pointPrograms, setPointPrograms] = useState<PointProgram[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PROGRAMS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POINT_PROGRAMS;
  });

  const [pointRewards, setPointRewards] = useState<PointReward[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_REWARDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POINT_REWARDS;
  });

  const [pointAccounts, setPointAccounts] = useState<CustomerPointAccount[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PROGRAMS, JSON.stringify(pointPrograms));
  }, [pointPrograms]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_REWARDS, JSON.stringify(pointRewards));
  }, [pointRewards]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ACCOUNTS, JSON.stringify(pointAccounts));
  }, [pointAccounts]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS, JSON.stringify(pointTransactions));
  }, [pointTransactions]);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    // 1. Point Programs
    const unsubPrograms = onSnapshot(
      collection(db, 'pointPrograms'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointProgram));
          setPointPrograms(list);
        } else {
          // Seed defaults if empty
          INITIAL_POINT_PROGRAMS.forEach(async (prog) => {
            try {
              await setDoc(doc(db, 'pointPrograms', prog.id), prog);
            } catch (err) {
              console.warn('Seed pointPrograms error:', err);
            }
          });
        }
      },
      (err) => console.warn('pointPrograms snap error:', err)
    );

    // 2. Point Rewards
    const unsubRewards = onSnapshot(
      collection(db, 'pointRewards'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointReward));
          setPointRewards(list);
        } else {
          INITIAL_POINT_REWARDS.forEach(async (rew) => {
            try {
              await setDoc(doc(db, 'pointRewards', rew.id), rew);
            } catch (err) {
              console.warn('Seed pointRewards error:', err);
            }
          });
        }
      },
      (err) => console.warn('pointRewards snap error:', err)
    );

    // 3. Point Accounts
    const unsubAccounts = onSnapshot(
      collection(db, 'pointAccounts'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerPointAccount));
          setPointAccounts(list);
        }
      },
      (err) => console.warn('pointAccounts snap error:', err)
    );

    // 4. Point Transactions
    const unsubTransactions = onSnapshot(
      collection(db, 'pointTransactions'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointTransaction));
          // Sort descending by date
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPointTransactions(list);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('pointTransactions snap error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubPrograms();
      unsubRewards();
      unsubAccounts();
      unsubTransactions();
    };
  }, []);

  // Helper: map role
  const mapRoleToAudience = (role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'): PointAudience => {
    return role === 'ANGGOTA' || role === 'KARYAWAN' ? 'member' : 'basic';
  };

  // Helper: Rounding
  const applyRounding = (val: number, rounding: 'floor' | 'round' | 'ceil') => {
    if (rounding === 'round') return Math.round(val);
    if (rounding === 'ceil') return Math.ceil(val);
    return Math.floor(val);
  };

  // 🧮 1. Hitung Estimasi Point Keranjang Belanja
  const calculateCartPoints = (
    items: CartItem[],
    subtotal: number,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ) => {
    const targetAudience = mapRoleToAudience(role);
    const activeProgram = pointPrograms.find(
      (p) => p.isActive && p.targetAudience === targetAudience
    );

    if (!activeProgram) {
      return {
        points: 0,
        programName: '',
        isPromo: false,
      };
    }

    // Filter items based on productScope
    const eligiblePaidItems = items.filter((it) => {
      if (it.isBonus) return false;
      if (activeProgram.productScope === 'specific') {
        const prodMatch = activeProgram.applicableProductIds?.includes(it.id);
        if (!prodMatch) return false;
        if (activeProgram.applicableVariations && activeProgram.applicableVariations.length > 0) {
          return activeProgram.applicableVariations.includes(it.variation);
        }
        return true;
      }
      return true;
    });

    const eligibleSubtotal = eligiblePaidItems.reduce((acc, it) => acc + (it.price * it.qty), 0);

    // Check minPurchase
    if (eligibleSubtotal < (activeProgram.minPurchase || 0)) {
      return {
        points: 0,
        programName: activeProgram.name,
        terms: `Minimal belanja Rp ${(activeProgram.minPurchase || 0).toLocaleString('id-ID')} untuk mendapatkan point.`,
        isPromo: activeProgram.isPromoActive,
        promoMultiplier: activeProgram.promoMultiplier,
      };
    }

    let rawPoints = 0;
    if (activeProgram.calculationType === 'quantity') {
      const totalQty = eligiblePaidItems.reduce((sum, it) => sum + it.qty, 0);
      rawPoints = totalQty * (activeProgram.pointsPerUnit || 1);
    } else {
      // Default: 'spend'
      const spendPerPoint = activeProgram.spendPerPoint || 10000;
      rawPoints = (eligibleSubtotal / spendPerPoint) * (activeProgram.pointsPerUnit || 1);
    }

    if (activeProgram.isPromoActive && (activeProgram.promoMultiplier || 1) > 1) {
      rawPoints = rawPoints * (activeProgram.promoMultiplier || 1);
    }

    let finalPoints = applyRounding(rawPoints, activeProgram.rounding || 'floor');

    // Cap at maxPointsPerTransaction if set
    if (activeProgram.maxPointsPerTransaction && activeProgram.maxPointsPerTransaction > 0) {
      finalPoints = Math.min(finalPoints, activeProgram.maxPointsPerTransaction);
    }

    finalPoints = Math.max(0, finalPoints);

    return {
      points: finalPoints,
      programName: activeProgram.name,
      terms: activeProgram.terms,
      isPromo: activeProgram.isPromoActive,
      promoMultiplier: activeProgram.promoMultiplier,
    };
  };

  // 🏷️ 2. Label & Info Point di Produk / Katalog
  const getProductPointBonus = (
    productId: string,
    price: number,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ) => {
    const targetAudience = mapRoleToAudience(role);
    const activeProgram = pointPrograms.find(
      (p) => p.isActive && p.targetAudience === targetAudience
    );

    if (!activeProgram) {
      return {
        isEligible: false,
        estimatedPoints: 0,
        badgeLabel: '',
        programName: '',
      };
    }

    if (activeProgram.productScope === 'specific') {
      const match = activeProgram.applicableProductIds?.includes(productId);
      if (!match) {
        return {
          isEligible: false,
          estimatedPoints: 0,
          badgeLabel: '',
          programName: activeProgram.name,
        };
      }
    }

    let unitPoints = 0;
    if (activeProgram.calculationType === 'quantity') {
      unitPoints = activeProgram.pointsPerUnit || 1;
    } else {
      const spendPerPoint = activeProgram.spendPerPoint || 10000;
      unitPoints = (price / spendPerPoint) * (activeProgram.pointsPerUnit || 1);
    }

    if (activeProgram.isPromoActive && (activeProgram.promoMultiplier || 1) > 1) {
      unitPoints = unitPoints * (activeProgram.promoMultiplier || 1);
    }

    const rounded = applyRounding(unitPoints, activeProgram.rounding || 'floor');

    return {
      isEligible: true,
      estimatedPoints: rounded,
      badgeLabel: activeProgram.isPromoActive ? `⭐ Double Point (+${rounded} Point)` : `⭐ +${rounded} Point`,
      programName: activeProgram.name,
    };
  };

  const isPointSystemActive = (role: 'member' | 'basic' | 'all' = 'all'): boolean => {
    if (role === 'all') {
      return pointPrograms.some((p) => p.isActive);
    }
    const targetAudience: PointAudience = role === 'member' ? 'member' : 'basic';
    return pointPrograms.some(
      (p) => p.isActive && (p.targetAudience === targetAudience || p.targetAudience === 'all')
    );
  };

  const calculateProductPoints = (
    productId: string,
    _variation: string,
    unitPrice: number,
    qty: number,
    audience: 'member' | 'basic' | 'all' = 'all'
  ): number => {
    const role: 'ANGGOTA' | 'PENGUNJUNG' = audience === 'member' ? 'ANGGOTA' : 'PENGUNJUNG';
    const bonus = getProductPointBonus(productId, unitPrice, role);
    if (!bonus.isEligible) return 0;
    return bonus.estimatedPoints * Math.max(1, qty);
  };

  // 👤 3. Dapatkan Akun Point User Saat Ini
  const getCurrentUserPointAccount = (phoneOverride?: string): CustomerPointAccount | null => {
    const targetPhone = phoneOverride || user?.phone;
    if (!targetPhone) return null;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    return (
      pointAccounts.find((acc) => acc.customerPhone.replace(/\D/g, '') === cleanPhone) || null
    );
  };

  // 📜 4. Dapatkan Riwayat Transaksi Point User
  const getUserPointTransactions = (phoneOverride?: string): PointTransaction[] => {
    const targetPhone = phoneOverride || user?.phone;
    if (!targetPhone) return [];
    const cleanPhone = targetPhone.replace(/\D/g, '');
    return pointTransactions.filter(
      (tx) => tx.customerPhone.replace(/\D/g, '') === cleanPhone
    );
  };

  // 🎁 5. Berikan Point Otomatis Saat Pesanan Berstatus "Selesai"
  const awardPointsForOrder = async (
    order: CustomerOrder
  ): Promise<{ success: boolean; pointsAwarded: number }> => {
    if (order.pointsAwarded) {
      console.log(`Pesanan ${order.orderNumber} sudah pernah diberikan point.`);
      return { success: false, pointsAwarded: 0 };
    }

    const role = order.customerRole || 'PENGUNJUNG';
    const pointsCalc = calculateCartPoints(
      order.items.map((it) => ({
        key: it.productId,
        id: it.productId,
        name: it.productName,
        emoji: it.emoji || '🛍️',
        variation: it.variation,
        price: it.price,
        qty: it.quantity,
        isBonus: it.isBonus,
      })),
      order.subtotal,
      role
    );

    const pointsToAward = order.estimatedPoints !== undefined ? order.estimatedPoints : pointsCalc.points;

    if (pointsToAward <= 0) {
      return { success: false, pointsAwarded: 0 };
    }

    const customerPhone = order.customerPhone.trim();
    const customerName = order.customerName.trim() || 'Pelanggan';
    const customerRole = mapRoleToAudience(role);
    const accountId = `point_acc_${customerPhone.replace(/\D/g, '')}`;

    // Cari atau inisialisasi Akun Point Pelanggan
    let currentAccount = pointAccounts.find((acc) => acc.id === accountId);
    if (!currentAccount) {
      currentAccount = {
        id: accountId,
        customerPhone,
        customerName,
        customerRole,
        totalEarned: 0,
        totalRedeemed: 0,
        totalDeducted: 0,
        balance: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const newTotalEarned = currentAccount.totalEarned + pointsToAward;
    const newBalance = newTotalEarned - currentAccount.totalRedeemed - currentAccount.totalDeducted;

    const updatedAccount: CustomerPointAccount = {
      ...currentAccount,
      customerName,
      customerRole,
      totalEarned: newTotalEarned,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    // Buat Log Mutasi Point Transaksi
    const newTransaction: PointTransaction = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      accountId,
      customerPhone,
      customerName,
      customerRole,
      type: 'earn',
      points: pointsToAward,
      balanceAfter: newBalance,
      orderId: order.id,
      orderNumber: order.orderNumber,
      notes: `⭐ Penambahan point pesanan selesai #${order.orderNumber} (${pointsCalc.programName || 'Program Point'})`,
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    // Update Local State
    setPointAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === accountId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedAccount;
        return copy;
      }
      return [...prev, updatedAccount];
    });

    setPointTransactions((prev) => [newTransaction, ...prev]);

    // Persist ke Firestore
    try {
      await setDoc(doc(db, 'pointAccounts', accountId), sanitizeFirestoreData(updatedAccount));
      await setDoc(doc(db, 'pointTransactions', newTransaction.id), sanitizeFirestoreData(newTransaction));
      await updateDoc(doc(db, 'orders', order.id), {
        pointsAwarded: true,
        pointsAwardedAt: new Date().toISOString(),
        estimatedPoints: pointsToAward,
      });
    } catch (err) {
      console.warn('Gagal persist point ke Firestore:', err);
    }

    // Kirim notifikasi kotak pesan ke pelanggan
    try {
      await createInboxMessage({
        title: '⭐ Point Pembelian Diterima!',
        content: `Selamat! Anda mendapatkan ⭐ +${pointsToAward} Point dari pesanan #${order.orderNumber}.\n\n` +
          `• Total Point Didapat: +${pointsToAward} Point\n` +
          `• Saldo Point Anda Sekarang: ⭐ ${newBalance} Point\n\n` +
          `Point ini dapat Anda kumpulkan dan tukarkan dengan berbagai voucher diskon, gratis ongkir, atau produk hadiah sembako menarik di Kopdes Merah Putih!`,
        category: 'promo',
        targetAudience: 'specific',
        targetUserId: customerPhone,
        sender: 'system',
        isActive: true,
        actionType: 'promo',
        actionLabel: '⭐ Cek Point Saya',
        actionTab: 'profile',
      });
    } catch (inboxErr) {
      console.warn('Gagal kirim inbox point:', inboxErr);
    }

    return { success: true, pointsAwarded: pointsToAward };
  };

  // 🔻 6. Kurangi Point Jika Pesanan Dibatalkan / Diretur Setelah Point Diberikan
  const deductPointsForOrder = async (order: CustomerOrder, reason?: string): Promise<boolean> => {
    if (!order.pointsAwarded) {
      return false;
    }

    const customerPhone = order.customerPhone.trim();
    const accountId = `point_acc_${customerPhone.replace(/\D/g, '')}`;
    const currentAccount = pointAccounts.find((acc) => acc.id === accountId);
    if (!currentAccount) return false;

    const pointsToDeduct = order.estimatedPoints || 0;
    if (pointsToDeduct <= 0) return false;

    const newTotalDeducted = currentAccount.totalDeducted + pointsToDeduct;
    const newBalance = Math.max(0, currentAccount.totalEarned - currentAccount.totalRedeemed - newTotalDeducted);

    const updatedAccount: CustomerPointAccount = {
      ...currentAccount,
      totalDeducted: newTotalDeducted,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    const newTransaction: PointTransaction = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      accountId,
      customerPhone,
      customerName: currentAccount.customerName,
      customerRole: currentAccount.customerRole,
      type: 'deduct',
      points: -pointsToDeduct,
      balanceAfter: newBalance,
      orderId: order.id,
      orderNumber: order.orderNumber,
      notes: reason || `🔻 Pengurangan point karena pesanan #${order.orderNumber} dibatalkan/diretur`,
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    setPointAccounts((prev) => prev.map((a) => (a.id === accountId ? updatedAccount : a)));
    setPointTransactions((prev) => [newTransaction, ...prev]);

    try {
      await setDoc(doc(db, 'pointAccounts', accountId), sanitizeFirestoreData(updatedAccount));
      await setDoc(doc(db, 'pointTransactions', newTransaction.id), sanitizeFirestoreData(newTransaction));
      await updateDoc(doc(db, 'orders', order.id), {
        pointsAwarded: false,
        pointsDeductedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Gagal persist pengurangan point:', err);
    }

    return true;
  };

  // 🎁 7. Penukaran Hadiah Point (Redemption)
  const redeemReward = async (
    reward: PointReward,
    phone: string,
    name: string,
    role: 'ANGGOTA' | 'PENGUNJUNG' | 'KARYAWAN'
  ): Promise<{ success: boolean; message: string }> => {
    const cleanPhone = phone.trim();
    const accountId = `point_acc_${cleanPhone.replace(/\D/g, '')}`;
    const account = pointAccounts.find((a) => a.id === accountId);

    if (!account || account.balance < reward.pointsCost) {
      return {
        success: false,
        message: `Saldo point Anda tidak mencukupi (Perlu ${reward.pointsCost} Point, Saldo: ${account?.balance || 0} Point).`,
      };
    }

    if (reward.quota !== undefined && (reward.quota - (reward.usedCount || 0)) <= 0) {
      return { success: false, message: 'Kuota hadiah ini telah habis.' };
    }

    const newTotalRedeemed = account.totalRedeemed + reward.pointsCost;
    const newBalance = account.balance - reward.pointsCost;

    const updatedAccount: CustomerPointAccount = {
      ...account,
      totalRedeemed: newTotalRedeemed,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    const newTransaction: PointTransaction = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      accountId,
      customerPhone: cleanPhone,
      customerName: name,
      customerRole: mapRoleToAudience(role),
      type: 'redeem',
      points: -reward.pointsCost,
      balanceAfter: newBalance,
      rewardId: reward.id,
      rewardName: reward.name,
      notes: `🎁 Penukaran Reward: ${reward.name} (-${reward.pointsCost} Point)`,
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    const updatedReward: PointReward = {
      ...reward,
      usedCount: (reward.usedCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    // Local State update
    setPointAccounts((prev) => prev.map((a) => (a.id === accountId ? updatedAccount : a)));
    setPointTransactions((prev) => [newTransaction, ...prev]);
    setPointRewards((prev) => prev.map((r) => (r.id === reward.id ? updatedReward : r)));

    // Firestore update
    try {
      await setDoc(doc(db, 'pointAccounts', accountId), updatedAccount);
      await setDoc(doc(db, 'pointTransactions', newTransaction.id), newTransaction);
      await updateDoc(doc(db, 'pointRewards', reward.id), {
        usedCount: updatedReward.usedCount,
        updatedAt: updatedReward.updatedAt,
      });
    } catch (err) {
      console.warn('Gagal persist penukaran reward ke Firestore:', err);
    }

    // Kirim notifikasi Inbox
    try {
      await createInboxMessage({
        title: '🎉 Penukaran Point Berhasil!',
        content: `Anda telah berhasil menukarkan ⭐ ${reward.pointsCost} Point untuk hadiah:\n\n` +
          `🎁 ${reward.name}\n` +
          `• Sisa Saldo Point: ⭐ ${newBalance} Point\n\n` +
          `Hadiah telah aktif dan dapat langsung digunakan saat transaksi belanja Anda berikutnya!`,
        category: 'gift',
        targetAudience: 'specific',
        targetUserId: cleanPhone,
        sender: 'system',
        isActive: true,
        actionType: 'gift',
        actionLabel: 'Lihat Hadiah',
        actionTab: 'profile',
      });
    } catch (e) {
      console.warn(e);
    }

    return {
      success: true,
      message: `Berhasil menukarkan ${reward.pointsCost} Point untuk ${reward.name}! Sisa point Anda: ${newBalance}.`,
    };
  };

  // ✏️ 8. Penyesuaian / Koreksi Point Manual oleh Admin
  const manualAdjustPoints = async (params: {
    customerPhone: string;
    customerName: string;
    customerRole: PointAudience;
    pointsDelta: number;
    notes: string;
  }): Promise<boolean> => {
    const cleanPhone = params.customerPhone.trim();
    const accountId = `point_acc_${cleanPhone.replace(/\D/g, '')}`;
    let account = pointAccounts.find((a) => a.id === accountId);

    if (!account) {
      account = {
        id: accountId,
        customerPhone: cleanPhone,
        customerName: params.customerName.trim() || 'Pelanggan',
        customerRole: params.customerRole,
        totalEarned: 0,
        totalRedeemed: 0,
        totalDeducted: 0,
        balance: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    let nextTotalEarned = account.totalEarned;
    let nextTotalDeducted = account.totalDeducted;

    if (params.pointsDelta >= 0) {
      nextTotalEarned += params.pointsDelta;
    } else {
      nextTotalDeducted += Math.abs(params.pointsDelta);
    }

    const nextBalance = Math.max(0, nextTotalEarned - account.totalRedeemed - nextTotalDeducted);

    const updatedAccount: CustomerPointAccount = {
      ...account,
      customerName: params.customerName.trim() || account.customerName,
      customerRole: params.customerRole,
      totalEarned: nextTotalEarned,
      totalDeducted: nextTotalDeducted,
      balance: nextBalance,
      updatedAt: new Date().toISOString(),
    };

    const newTransaction: PointTransaction = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      accountId,
      customerPhone: cleanPhone,
      customerName: updatedAccount.customerName,
      customerRole: updatedAccount.customerRole,
      type: 'adjust',
      points: params.pointsDelta,
      balanceAfter: nextBalance,
      notes: params.notes || 'Penyesuaian manual oleh Admin Kopdes',
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    setPointAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === accountId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedAccount;
        return copy;
      }
      return [...prev, updatedAccount];
    });
    setPointTransactions((prev) => [newTransaction, ...prev]);

    try {
      await setDoc(doc(db, 'pointAccounts', accountId), updatedAccount);
      await setDoc(doc(db, 'pointTransactions', newTransaction.id), newTransaction);
    } catch (err) {
      console.warn('Gagal persist manual adjust point:', err);
    }

    return true;
  };

  // ⚙️ 9. Admin Program CRUD
  const updateProgram = async (program: PointProgram) => {
    const updated = { ...program, updatedAt: new Date().toISOString() };
    setPointPrograms((prev) => prev.map((p) => (p.id === program.id ? updated : p)));
    try {
      await setDoc(doc(db, 'pointPrograms', program.id), updated);
    } catch (e) {
      console.warn(e);
    }
  };

  const addProgram = async (programData: Omit<PointProgram, 'id'>) => {
    const newId = `prog_${Date.now()}`;
    const newProgram: PointProgram = {
      ...programData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPointPrograms((prev) => [...prev, newProgram]);
    try {
      await setDoc(doc(db, 'pointPrograms', newId), newProgram);
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteProgram = async (id: string) => {
    setPointPrograms((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteDoc(doc(db, 'pointPrograms', id));
    } catch (e) {
      console.warn(e);
    }
  };

  // 🎁 10. Admin Rewards CRUD
  const addReward = async (rewardData: Omit<PointReward, 'id'>) => {
    const newId = `rew_${Date.now()}`;
    const newReward: PointReward = {
      ...rewardData,
      id: newId,
      usedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPointRewards((prev) => [...prev, newReward]);
    try {
      await setDoc(doc(db, 'pointRewards', newId), newReward);
    } catch (e) {
      console.warn(e);
    }
  };

  const updateReward = async (reward: PointReward) => {
    const updated = { ...reward, updatedAt: new Date().toISOString() };
    setPointRewards((prev) => prev.map((r) => (r.id === reward.id ? updated : r)));
    try {
      await setDoc(doc(db, 'pointRewards', reward.id), updated);
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteReward = async (id: string) => {
    setPointRewards((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteDoc(doc(db, 'pointRewards', id));
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <PointContext.Provider
      value={{
        pointPrograms,
        pointRewards,
        pointAccounts,
        pointTransactions,
        loading,
        calculateCartPoints,
        getProductPointBonus,
        calculateProductPoints,
        isPointSystemActive,
        getCurrentUserPointAccount,
        getUserPointTransactions,
        awardPointsForOrder,
        deductPointsForOrder,
        redeemReward,
        updateProgram,
        addProgram,
        deleteProgram,
        addReward,
        updateReward,
        deleteReward,
        manualAdjustPoints,
      }}
    >
      {children}
    </PointContext.Provider>
  );
};

export const usePoints = () => {
  const ctx = useContext(PointContext);
  if (!ctx) {
    throw new Error('usePoints must be used within a PointProvider');
  }
  return ctx;
};
