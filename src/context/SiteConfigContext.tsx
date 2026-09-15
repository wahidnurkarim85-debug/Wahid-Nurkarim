import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot, 
  getDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  badgeText: string;
}

export interface AppearanceConfig {
  logoUrl: string;
  headerBgUrl: string;
  bodyBgUrl: string;
  footerBgUrl: string;
  logoShape: 'rounded' | 'circle' | 'square';
  bgOpacity: number;
}

export interface RevenueRecord {
  id: string;
  year: number;
  month: string;
  date: string;
  amount: number;
  description: string;
}

export interface FinancialDocument {
  id: string;
  title: string;
  fileType: 'excel' | 'word' | 'powerpoint';
  fileUrl: string;
  fileSize: string;
  uploadDate: string;
}

interface SiteConfigContextType {
  banners: BannerItem[];
  addBanner: (banner: Omit<BannerItem, 'id'>) => void;
  updateBanner: (id: string, banner: Partial<BannerItem>) => void;
  deleteBanner: (id: string) => void;

  appearance: AppearanceConfig;
  updateAppearance: (config: Partial<AppearanceConfig>) => void;

  revenueRecords: RevenueRecord[];
  addRevenueRecord: (record: Omit<RevenueRecord, 'id'>) => void;
  updateRevenueRecord: (id: string, record: Partial<RevenueRecord>) => void;
  deleteRevenueRecord: (id: string) => void;

  financialDocs: FinancialDocument[];
  addFinancialDoc: (doc: Omit<FinancialDocument, 'id'>) => void;
  updateFinancialDoc: (id: string, doc: Partial<FinancialDocument>) => void;
  deleteFinancialDoc: (id: string) => void;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: 'Gerai Sembako Murah & Terpercaya',
    subtitle: 'Koperasi Desa Merah Putih Cengkareng Timur melayani kebutuhan pokok warga dengan harga bersahabat dan kualitas terbaik.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    badgeText: 'PROMO UTAMA',
  },
  {
    id: 'b2',
    title: 'Sembako Subsidi & Gotong Royong',
    subtitle: 'Nikmati kemudahan belanja beras, minyak goreng, gula, dan kebutuhan dapur langsung dari koperasi resmi desa.',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    badgeText: 'KOPERASI DIGITAL',
  },
  {
    id: 'b3',
    title: 'Transparansi Keuangan & Kesejahteraan',
    subtitle: 'Laporan keuangan dan grafik pendapatan tahunan dapat diakses dan diunduh secara transparan oleh seluruh anggota.',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    badgeText: 'LAPORAN RESMI',
  },
];

const DEFAULT_APPEARANCE: AppearanceConfig = {
  logoUrl: '',
  headerBgUrl: '',
  bodyBgUrl: '',
  footerBgUrl: '',
  logoShape: 'rounded',
  bgOpacity: 100,
};

const DEFAULT_REVENUE: RevenueRecord[] = [
  { id: 'r1', year: 2024, month: 'Januari', date: '2024-01-31', amount: 45000000, description: 'Pendapatan Gerai Sembako & Sisa Hasil Usaha (SHU) Q1' },
  { id: 'r2', year: 2024, month: 'April', date: '2024-04-30', amount: 52000000, description: 'Distribusi Sembako Subsidi Lebaran & Anggota' },
  { id: 'r3', year: 2025, month: 'Januari', date: '2025-01-31', amount: 68000000, description: 'Pertumbuhan SHU & Penambahan Anggota Baru' },
  { id: 'r4', year: 2025, month: 'Juni', date: '2025-06-30', amount: 85000000, description: 'Pendapatan Semester I Gerai Cengkareng Timur' },
  { id: 'r5', year: 2026, month: 'Januari', date: '2026-01-31', amount: 110000000, description: 'Rekapitulasi Pendapatan Awal Tahun 2026' },
  { id: 'r6', year: 2026, month: 'Februari', date: '2026-02-28', amount: 98000000, description: 'Penjualan Sembako Grosir & Eceran Anggota' },
];

const DEFAULT_DOCS: FinancialDocument[] = [
  { id: 'd1', title: 'Laporan Keuangan Tahunan 2025 (Audit Resmi).xlsx', fileType: 'excel', fileUrl: '#', fileSize: '2.4 MB', uploadDate: '15 Januari 2026' },
  { id: 'd2', title: 'Proposal SHU & Rapat Anggota Tahunan (RAT) 2026.docx', fileType: 'word', fileUrl: '#', fileSize: '1.8 MB', uploadDate: '20 Februari 2026' },
  { id: 'd3', title: 'Paparan Visi Misi & Proyeksi Pendapatan Koperasi.pptx', fileType: 'powerpoint', fileUrl: '#', fileSize: '4.5 MB', uploadDate: '01 Maret 2026' },
];

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banners, setBanners] = useState<BannerItem[]>(() => {
    const saved = localStorage.getItem('koperasi_banners');
    return saved ? JSON.parse(saved) : DEFAULT_BANNERS;
  });

  const [appearance, setAppearance] = useState<AppearanceConfig>(() => {
    const saved = localStorage.getItem('koperasi_appearance');
    return saved ? JSON.parse(saved) : DEFAULT_APPEARANCE;
  });

  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>(() => {
    const saved = localStorage.getItem('koperasi_revenue');
    return saved ? JSON.parse(saved) : DEFAULT_REVENUE;
  });

  const [financialDocs, setFinancialDocs] = useState<FinancialDocument[]>(() => {
    const saved = localStorage.getItem('koperasi_docs');
    return saved ? JSON.parse(saved) : DEFAULT_DOCS;
  });

  useEffect(() => {
    localStorage.setItem('koperasi_banners', JSON.stringify(banners));
  }, [banners]);

  useEffect(() => {
    localStorage.setItem('koperasi_appearance', JSON.stringify(appearance));
  }, [appearance]);

  // Firestore sync for Financial Documents
  useEffect(() => {
    let hasLoadedDocs = false;
    const docsRef = collection(db, 'financial_documents');
    const unsub = onSnapshot(
      docsRef,
      async (snap) => {
        if (!snap.empty) {
          hasLoadedDocs = true;
          const list: FinancialDocument[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as Omit<FinancialDocument, 'id'>) });
          });
          setFinancialDocs(list);
          localStorage.setItem('koperasi_docs', JSON.stringify(list));
        } else if (hasLoadedDocs) {
          setFinancialDocs([]);
          localStorage.setItem('koperasi_docs', JSON.stringify([]));
        } else {
          try {
            const initRef = doc(db, 'system_meta', 'financial_documents_initialized');
            const initSnap = await getDoc(initRef);
            if (initSnap.exists()) {
              setFinancialDocs([]);
              localStorage.setItem('koperasi_docs', JSON.stringify([]));
              return;
            }
          } catch (e) {
            // ignore error
          }

          try {
            const batch = writeBatch(db);
            DEFAULT_DOCS.forEach((item) => {
              const itemRef = doc(db, 'financial_documents', item.id);
              batch.set(itemRef, sanitizeFirestoreData(item));
            });
            const initRef = doc(db, 'system_meta', 'financial_documents_initialized');
            batch.set(initRef, { initializedAt: new Date().toISOString() });
            await batch.commit();
          } catch (err) {
            console.warn('Failed to seed default financial docs to Firestore:', err);
          }
        }
      },
      (err) => {
        console.warn('Firestore financial_documents listen error:', err);
      }
    );

    return () => unsub();
  }, []);

  // Firestore sync for Revenue Records
  useEffect(() => {
    let hasLoadedRevenue = false;
    const revRef = collection(db, 'revenue_records');
    const unsub = onSnapshot(
      revRef,
      async (snap) => {
        if (!snap.empty) {
          hasLoadedRevenue = true;
          const list: RevenueRecord[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as Omit<RevenueRecord, 'id'>) });
          });
          setRevenueRecords(list);
          localStorage.setItem('koperasi_revenue', JSON.stringify(list));
        } else if (hasLoadedRevenue) {
          setRevenueRecords([]);
          localStorage.setItem('koperasi_revenue', JSON.stringify([]));
        } else {
          try {
            const initRef = doc(db, 'system_meta', 'revenue_records_initialized');
            const initSnap = await getDoc(initRef);
            if (initSnap.exists()) {
              setRevenueRecords([]);
              localStorage.setItem('koperasi_revenue', JSON.stringify([]));
              return;
            }
          } catch (e) {
            // ignore
          }

          try {
            const batch = writeBatch(db);
            DEFAULT_REVENUE.forEach((item) => {
              const itemRef = doc(db, 'revenue_records', item.id);
              batch.set(itemRef, sanitizeFirestoreData(item));
            });
            const initRef = doc(db, 'system_meta', 'revenue_records_initialized');
            batch.set(initRef, { initializedAt: new Date().toISOString() });
            await batch.commit();
          } catch (err) {
            console.warn('Failed to seed default revenue records to Firestore:', err);
          }
        }
      },
      (err) => {
        console.warn('Firestore revenue_records listen error:', err);
      }
    );

    return () => unsub();
  }, []);

  const addBanner = (banner: Omit<BannerItem, 'id'>) => {
    const newBanner = { ...banner, id: 'b_' + Date.now() };
    setBanners((prev) => [...prev, newBanner]);
  };

  const updateBanner = (id: string, banner: Partial<BannerItem>) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...banner } : b)));
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const updateAppearance = (config: Partial<AppearanceConfig>) => {
    setAppearance((prev) => ({ ...prev, ...config }));
  };

  const addRevenueRecord = async (record: Omit<RevenueRecord, 'id'>) => {
    const newRecord = { ...record, id: 'r_' + Date.now() };
    setRevenueRecords((prev) => [...prev, newRecord]);

    try {
      const initRef = doc(db, 'system_meta', 'revenue_records_initialized');
      await setDoc(initRef, { initializedAt: new Date().toISOString() }, { merge: true });
      await setDoc(doc(db, 'revenue_records', newRecord.id), sanitizeFirestoreData(newRecord));
    } catch (err) {
      console.error('Failed to save revenue record to Firestore:', err);
    }
  };

  const updateRevenueRecord = async (id: string, record: Partial<RevenueRecord>) => {
    setRevenueRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...record } : r)));

    try {
      await updateDoc(doc(db, 'revenue_records', id), sanitizeFirestoreData(record));
    } catch (err) {
      console.error('Failed to update revenue record in Firestore:', err);
    }
  };

  const deleteRevenueRecord = async (id: string) => {
    const updatedList = revenueRecords.filter((r) => r.id !== id);
    setRevenueRecords(updatedList);
    localStorage.setItem('koperasi_revenue', JSON.stringify(updatedList));

    try {
      const initRef = doc(db, 'system_meta', 'revenue_records_initialized');
      await setDoc(initRef, { initializedAt: new Date().toISOString() }, { merge: true });

      const revRef = collection(db, 'revenue_records');
      const snap = await getDocs(revRef);
      if (snap.empty) {
        if (updatedList.length > 0) {
          const batch = writeBatch(db);
          updatedList.forEach((item) => {
            batch.set(doc(db, 'revenue_records', item.id), sanitizeFirestoreData(item));
          });
          await batch.commit();
        }
      } else {
        await deleteDoc(doc(db, 'revenue_records', id));
      }
    } catch (err) {
      console.error('Failed to delete revenue record from Firestore:', err);
      setRevenueRecords(revenueRecords);
      localStorage.setItem('koperasi_revenue', JSON.stringify(revenueRecords));
      throw err;
    }
  };

  const addFinancialDoc = async (docData: Omit<FinancialDocument, 'id'>) => {
    const newId = 'd_' + Date.now();
    const newDoc: FinancialDocument = { ...docData, id: newId };
    setFinancialDocs((prev) => [newDoc, ...prev]);

    try {
      const initRef = doc(db, 'system_meta', 'financial_documents_initialized');
      await setDoc(initRef, { initializedAt: new Date().toISOString() }, { merge: true });
      await setDoc(doc(db, 'financial_documents', newId), sanitizeFirestoreData(newDoc));
    } catch (err) {
      console.error('Failed to add financial doc to Firestore:', err);
      throw err;
    }
  };

  const updateFinancialDoc = async (id: string, docData: Partial<FinancialDocument>) => {
    setFinancialDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...docData } : d)));

    try {
      await updateDoc(doc(db, 'financial_documents', id), sanitizeFirestoreData(docData));
    } catch (err) {
      console.error('Failed to update financial doc in Firestore:', err);
      throw err;
    }
  };

  const deleteFinancialDoc = async (id: string) => {
    const updatedList = financialDocs.filter((d) => d.id !== id);
    setFinancialDocs(updatedList);
    localStorage.setItem('koperasi_docs', JSON.stringify(updatedList));

    try {
      const initRef = doc(db, 'system_meta', 'financial_documents_initialized');
      await setDoc(initRef, { initializedAt: new Date().toISOString() }, { merge: true });

      const docsRef = collection(db, 'financial_documents');
      const snap = await getDocs(docsRef);
      if (snap.empty) {
        if (updatedList.length > 0) {
          const batch = writeBatch(db);
          updatedList.forEach((item) => {
            batch.set(doc(db, 'financial_documents', item.id), sanitizeFirestoreData(item));
          });
          await batch.commit();
        }
      } else {
        await deleteDoc(doc(db, 'financial_documents', id));
      }
    } catch (err) {
      console.error('Failed to delete financial doc from Firestore:', err);
      setFinancialDocs(financialDocs);
      localStorage.setItem('koperasi_docs', JSON.stringify(financialDocs));
      throw err;
    }
  };

  return (
    <SiteConfigContext.Provider
      value={{
        banners,
        addBanner,
        updateBanner,
        deleteBanner,
        appearance,
        updateAppearance,
        revenueRecords,
        addRevenueRecord,
        updateRevenueRecord,
        deleteRevenueRecord,
        financialDocs,
        addFinancialDoc,
        updateFinancialDoc,
        deleteFinancialDoc,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
};
