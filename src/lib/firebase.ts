import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';
import { INITIAL_PRODUCTS, INITIAL_VOUCHERS } from '../data/initialProducts';
import { INITIAL_PROMOTIONS } from '../data/initialPromotions';
import { INITIAL_EMPLOYEES, INITIAL_MEMBERS } from '../data/initialStaffMemberData';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || "AIzaSyDLOeErgaIUqLvgjcMpj1NnRaKTNW9LWUc",
  authDomain: firebaseConfigData.authDomain || "hypnagogic-broker-dnm9t.firebaseapp.com",
  projectId: firebaseConfigData.projectId || "hypnagogic-broker-dnm9t",
  storageBucket: firebaseConfigData.storageBucket || "hypnagogic-broker-dnm9t.firebasestorage.app",
  messagingSenderId: firebaseConfigData.messagingSenderId || "763401163212",
  appId: firebaseConfigData.appId || "1:763401163212:web:c8aa3b09785a2c37330d69"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling for network & iframe resilience
const databaseId = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)'
  ? firebaseConfigData.firestoreDatabaseId
  : undefined;

export const db = databaseId 
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, databaseId) 
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

// Initialize Firebase Auth
export const auth = getAuth(app);

// Helper to sanitize undefined values recursively before passing objects to Firestore setDoc/addDoc/updateDoc
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    // Check if it's a plain object (e.g. { a: 1 }) and not a special class or FieldValue
    const isPlainObject = Object.prototype.toString.call(data) === '[object Object]' && 
      (data.constructor === Object || !data.constructor);
      
    if (!isPlainObject) {
      return data;
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Secret Key for Staff Registration
export const STAFF_SECRET_KEY = 'KOPERASI-MERAHPUTIH-2026';

// Official Koperasi WhatsApp Contact
export const WA_NUMBER = '6285881688927';

// Helper to execute getDocs with a timeout to avoid hanging on backend connectivity delays
async function getDocsWithTimeout(ref: any, timeoutMs = 4000) {
  const fetchPromise = getDocs(ref);
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Firestore connection timeout')), timeoutMs)
  );
  return Promise.race([fetchPromise, timeoutPromise]);
}

// Helper to seed initial products & vouchers if Firestore collection is empty
export async function seedInitialFirestoreData(force = false) {
  try {
    const productsRef = collection(db, 'products');
    const snap = await getDocsWithTimeout(productsRef);
    
    if (snap.empty || force) {
      console.log('Seeding initial products to Firestore...');
      const batch = writeBatch(db);
      
      INITIAL_PRODUCTS.forEach((prod, index) => {
        const docId = `prod_${index + 1}_${prod.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const prodDoc = doc(db, 'products', docId);
        batch.set(prodDoc, {
          ...prod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      console.log('50 Products seeded successfully!');
    }

    const vouchersRef = collection(db, 'vouchers');
    const voucherSnap = await getDocsWithTimeout(vouchersRef);
    if (voucherSnap.empty || force) {
      console.log('Seeding initial vouchers to Firestore...');
      const vBatch = writeBatch(db);
      INITIAL_VOUCHERS.forEach((vouch) => {
        const vDoc = doc(db, 'vouchers', `voucher_${vouch.code.toLowerCase()}`);
        vBatch.set(vDoc, {
          ...vouch,
          id: `voucher_${vouch.code.toLowerCase()}`
        });
      });
      await vBatch.commit();
      console.log('Initial vouchers seeded successfully!');
    }

    const employeesRef = collection(db, 'employees');
    const empSnap = await getDocsWithTimeout(employeesRef);
    if (empSnap.empty || force) {
      console.log('Seeding initial employees to Firestore...');
      const eBatch = writeBatch(db);
      INITIAL_EMPLOYEES.forEach((emp) => {
        const eDoc = doc(db, 'employees', emp.id);
        eBatch.set(eDoc, {
          ...emp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      await eBatch.commit();
      console.log('Initial employees seeded successfully!');
    } else {
      // Ensure manager Wakhid Nur Kharim is present
      const managerDocRef = doc(db, 'employees', 'emp_manager_wakhid');
      const managerSnap = await getDocsWithTimeout(employeesRef);
      const hasManager = managerSnap.docs.some((d: any) => d.data().nik === '3173010508990019' || d.id === 'emp_manager_wakhid');
      if (!hasManager) {
        const target = INITIAL_EMPLOYEES.find(e => e.id === 'emp_manager_wakhid') || INITIAL_EMPLOYEES[0];
        await setDoc(managerDocRef, {
          ...target,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const membersRef = collection(db, 'members');
    const memSnap = await getDocsWithTimeout(membersRef);
    if (memSnap.empty || force) {
      console.log('Seeding initial members to Firestore...');
      const mBatch = writeBatch(db);
      INITIAL_MEMBERS.forEach((mem) => {
        const mDoc = doc(db, 'members', mem.id);
        mBatch.set(mDoc, {
          ...mem,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      await mBatch.commit();
      console.log('Initial members seeded successfully!');
    }

    const promosRef = collection(db, 'promotions');
    const initDocRef = doc(db, 'system_meta', 'promotions_initialized');
    let isPromoInit = false;
    try {
      const initSnap = await getDoc(initDocRef);
      if (initSnap.exists()) {
        isPromoInit = true;
      }
    } catch (e) {
      // ignore
    }

    const promoSnap = await getDocsWithTimeout(promosRef);
    if ((promoSnap.empty && !isPromoInit) || force) {
      console.log('Seeding initial promotions to Firestore...');
      const pBatch = writeBatch(db);
      INITIAL_PROMOTIONS.forEach((promo) => {
        const pDoc = doc(db, 'promotions', promo.id);
        pBatch.set(pDoc, {
          ...promo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      pBatch.set(initDocRef, { initializedAt: new Date().toISOString() });
      await pBatch.commit();
      console.log('Initial promotions seeded successfully!');
    }
  } catch (error) {
    console.warn('Firestore seeding check (fallback mode active):', error);
  }
}
