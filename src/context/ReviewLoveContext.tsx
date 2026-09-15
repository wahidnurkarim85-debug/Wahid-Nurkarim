import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { ProductReview, ProductLove, CustomerOrder } from '../types';
import { useAuth } from './AuthContext';
import { useOrders } from './OrderContext';

interface ReviewLoveContextType {
  reviews: ProductReview[];
  loves: ProductLove[];
  loading: boolean;
  addProductReview: (params: {
    productId: string;
    productName: string;
    variation?: string;
    orderId: string;
    orderNumber: string;
    rating: number;
    comment?: string;
  }) => Promise<{ success: boolean; message: string }>;
  replyToReview: (reviewId: string, reply: string) => Promise<void>;
  toggleProductLove: (productId: string) => Promise<{ isLoved: boolean }>;
  getProductReviews: (productId: string) => ProductReview[];
  getProductRatingStats: (productId: string) => { averageRating: number; reviewCount: number };
  getProductLoveCount: (productId: string) => number;
  hasUserLovedProduct: (productId: string) => boolean;
  canUserReviewProduct: (productId: string) => { canReview: boolean; eligibleOrders: CustomerOrder[] };
  getProductSoldCount: (productId: string, productName: string) => number;
}

const ReviewLoveContext = createContext<ReviewLoveContextType | undefined>(undefined);

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

export const ReviewLoveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { orders } = useOrders();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loves, setLoves] = useState<ProductLove[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Real-time listener for reviews
  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reviewList: ProductReview[] = [];
        snapshot.forEach((docSnap) => {
          reviewList.push({ ...docSnap.data(), id: docSnap.id } as ProductReview);
        });
        setReviews(reviewList);
        setLoading(false);
      },
      (error) => {
        console.warn('Reviews snapshot error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for product loves
  useEffect(() => {
    const lovesRef = collection(db, 'product_loves');

    const unsubscribe = onSnapshot(
      lovesRef,
      (snapshot) => {
        const loveList: ProductLove[] = [];
        snapshot.forEach((docSnap) => {
          loveList.push({ ...docSnap.data(), id: docSnap.id } as ProductLove);
        });
        setLoves(loveList);
      },
      (error) => {
        console.warn('Product loves snapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper user identifier
  const userIdentifier = user?.uid || user?.accountId || user?.phone || 'visitor';
  const accountId = user?.accountId || user?.uid || 'ACC-GUEST';
  const customerPhone = user?.phone || '-';
  const customerName = user?.displayName || user?.email || 'Pelanggan';
  const customerRole = user?.accountStatus === 'ANGGOTA' || user?.role === 'member' ? 'ANGGOTA' : 'Basic';

  // Check if user can review product (must be Basic or Anggota, have completed order 'Selesai' with product)
  const canUserReviewProduct = (productId: string) => {
    if (!user || (user.role !== 'member' && user.role !== 'visitor' && !user.accountStatus)) {
      return { canReview: false, eligibleOrders: [] };
    }

    // Find completed orders for this user containing productId or matching product name
    const completedOrders = orders.filter((ord) => {
      const isCompleted = ord.orderStatus === 'Selesai';
      const isUserOrder = 
        (ord.userId && ord.userId === user.uid) ||
        (ord.userAccountId && ord.userAccountId === user.accountId) ||
        (ord.customerPhone && ord.customerPhone === user.phone);

      if (!isCompleted || !isUserOrder) return false;

      // Check if items contain this product
      const hasProduct = ord.items.some((item) => item.productId === productId);
      return hasProduct;
    });

    // Check which eligible orders have not been reviewed yet for this product
    const eligibleOrders = completedOrders.filter((ord) => {
      const alreadyReviewed = reviews.some(
        (rev) => rev.productId === productId && rev.orderId === ord.id && rev.userId === userIdentifier
      );
      return !alreadyReviewed;
    });

    return {
      canReview: eligibleOrders.length > 0,
      eligibleOrders,
    };
  };

  const addProductReview = async (params: {
    productId: string;
    productName: string;
    variation?: string;
    orderId: string;
    orderNumber: string;
    rating: number;
    comment?: string;
  }) => {
    try {
      if (!user) {
        return { success: false, message: 'Silakan masuk terlebih dahulu untuk memberikan ulasan.' };
      }

      if (params.rating < 1 || params.rating > 5) {
        return { success: false, message: 'Rating harus antara 1 sampai 5 bintang.' };
      }

      // Check duplicate review for same order & product
      const existing = reviews.find(
        (rev) => rev.productId === params.productId && rev.orderId === params.orderId && rev.userId === userIdentifier
      );

      if (existing) {
        return { success: false, message: 'Anda sudah memberikan ulasan untuk pesanan dan produk ini sebelumnya.' };
      }

      const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newReview: ProductReview = {
        id: reviewId,
        productId: params.productId,
        productName: params.productName,
        variation: params.variation || 'Standar',
        userId: userIdentifier,
        accountId: accountId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerRole: customerRole,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        rating: params.rating,
        comment: params.comment?.trim() || '',
        createdAt: formatIndonesianDateTime(new Date()),
        timestamp: Date.now(),
      };

      const docRef = doc(db, 'reviews', reviewId);
      await setDoc(docRef, sanitizeFirestoreData(newReview));

      return { success: true, message: 'Ulasan berhasil dikirim dan ditampilkan pada produk!' };
    } catch (err: any) {
      console.error('Error adding product review:', err);
      return { success: false, message: err.message || 'Gagal mengirim ulasan.' };
    }
  };

  const replyToReview = async (reviewId: string, reply: string) => {
    try {
      const docRef = doc(db, 'reviews', reviewId);
      await updateDoc(docRef, {
        adminReply: reply.trim(),
        adminReplyAt: formatIndonesianDateTime(new Date()),
      });
    } catch (err) {
      console.error('Error replying to review:', err);
    }
  };

  const toggleProductLove = async (productId: string) => {
    if (!user) {
      return { isLoved: false };
    }

    const loveId = `love_${userIdentifier}_${productId}`;
    const existingLove = loves.find((l) => l.productId === productId && l.userId === userIdentifier);

    try {
      const docRef = doc(db, 'product_loves', loveId);
      if (existingLove) {
        await deleteDoc(docRef);
        return { isLoved: false };
      } else {
        const newLove: ProductLove = {
          id: loveId,
          productId: productId,
          userId: userIdentifier,
          accountId: accountId,
          customerPhone: customerPhone,
          createdAt: formatIndonesianDateTime(new Date()),
        };
        await setDoc(docRef, sanitizeFirestoreData(newLove));
        return { isLoved: true };
      }
    } catch (err) {
      console.error('Error toggling product love:', err);
      return { isLoved: !!existingLove };
    }
  };

  const getProductReviews = (productId: string) => {
    return reviews.filter((rev) => rev.productId === productId);
  };

  const getProductRatingStats = (productId: string) => {
    const prodReviews = getProductReviews(productId);
    const reviewCount = prodReviews.length;
    if (reviewCount === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }
    const sum = prodReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = Number((sum / reviewCount).toFixed(1));
    return { averageRating, reviewCount };
  };

  const getProductLoveCount = (productId: string) => {
    return loves.filter((l) => l.productId === productId).length;
  };

  const hasUserLovedProduct = (productId: string) => {
    if (!user) return false;
    return loves.some((l) => l.productId === productId && l.userId === userIdentifier);
  };

  const getProductSoldCount = (productId: string, productName: string) => {
    let total = 0;
    orders.forEach((ord) => {
      if (ord.orderStatus === 'Selesai') {
        ord.items.forEach((item) => {
          if (item.productId === productId || item.productName?.toLowerCase() === productName.toLowerCase()) {
            total += item.quantity || 1;
          }
        });
      }
    });
    return total;
  };

  return (
    <ReviewLoveContext.Provider
      value={{
        reviews,
        loves,
        loading,
        addProductReview,
        replyToReview,
        toggleProductLove,
        getProductReviews,
        getProductRatingStats,
        getProductLoveCount,
        hasUserLovedProduct,
        canUserReviewProduct,
        getProductSoldCount,
      }}
    >
      {children}
    </ReviewLoveContext.Provider>
  );
};

export const useReviewLove = () => {
  const context = useContext(ReviewLoveContext);
  if (!context) {
    throw new Error('useReviewLove must be used within a ReviewLoveProvider');
  }
  return context;
};
