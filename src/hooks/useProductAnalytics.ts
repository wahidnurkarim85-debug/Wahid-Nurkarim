import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsEvent, SavedProduct } from '../types';

export const useProductAnalytics = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qEvents = query(collection(db, 'analyticsEvents'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalyticsEvent));
      setEvents(data);
      setLoading(false);
    });

    const qSaved = query(collection(db, 'savedProducts'));
    const unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedProduct));
      setSavedProducts(data);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeSaved();
    };
  }, []);

  const productStats = useMemo(() => {
    const pStats: Record<string, { views: number; adds: number; saves: number; orders: number; select: number }> = {};

    events.forEach(e => {
      if (e.productId) {
        if (!pStats[e.productId]) pStats[e.productId] = { views: 0, adds: 0, saves: 0, orders: 0, select: 0 };
        
        if (e.eventType === 'product_click') pStats[e.productId].views++;
        if (e.eventType === 'variation_select') pStats[e.productId].select++;
        if (e.eventType === 'add_to_cart') pStats[e.productId].adds++;
        if (e.eventType === 'product_saved') pStats[e.productId].saves++;
        if (e.eventType === 'buat_pesanan') pStats[e.productId].orders++;
      }
    });

    savedProducts.forEach(s => {
      if (s.productId) {
        if (!pStats[s.productId]) pStats[s.productId] = { views: 0, adds: 0, saves: 0, orders: 0, select: 0 };
        pStats[s.productId].saves++;
      }
    });

    // Score based recommendation: orders * 10 + adds * 5 + saves * 3 + views * 1 + select * 2
    Object.keys(pStats).forEach(id => {
      const s = pStats[id];
      (s as any).score = s.orders * 10 + s.adds * 5 + s.saves * 3 + s.views * 1 + s.select * 2;
    });

    return pStats;
  }, [events, savedProducts]);

  return { productStats, loading };
};
