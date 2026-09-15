import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db, STAFF_SECRET_KEY } from '../lib/firebase';
import { UserProfile, UserRole, AccountStatus, AccountRecord, EmployeeRecord, MemberRecord, EmployeePermission } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_MEMBERS } from '../data/initialStaffMemberData';
import { 
  fetchAccountsFromFirestore, 
  createVisitorAccount, 
  upgradeAccountToMember, 
  updateAccountProfile, 
  verifyPassword,
  formatIndonesianDateTime,
  calculateAge,
  generateInternalAccountId,
  saveStoredAccounts,
  INITIAL_ACCOUNTS
} from '../services/accountService';

export const AUTHORIZED_STAFF_EMAIL = 'wahidnurkarim85@gmail.com';

export const isAuthorizedStaffEmail = (email?: string): boolean => {
  if (!email) return false;
  return email.toLowerCase().trim() === AUTHORIZED_STAFF_EMAIL;
};

// Helper to look up an employee by email from Firestore or initial dataset
export const findEmployeeByEmail = async (email: string): Promise<EmployeeRecord | null> => {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;

  try {
    const snap = await getDocs(collection(db, 'employees'));
    for (const d of snap.docs) {
      const data = d.data() as EmployeeRecord;
      if (data.email && data.email.toLowerCase().trim() === cleanEmail) {
        return { ...data, id: d.id };
      }
    }
  } catch (e) {
    console.warn('Error fetching employees from firestore:', e);
  }

  const foundInInitial = INITIAL_EMPLOYEES.find(
    (emp) => emp.email && emp.email.toLowerCase().trim() === cleanEmail
  );
  if (foundInInitial) return foundInInitial;

  if (cleanEmail === AUTHORIZED_STAFF_EMAIL) {
    return INITIAL_EMPLOYEES[0];
  }

  return null;
};

export const getDefaultPermissionsForRole = (role?: string): EmployeePermission[] => {
  switch (role) {
    case 'KASIR':
      return ['kasir_pos', 'kelola_produk', 'riwayat_penjualan'];
    case 'PENGIRIMAN':
      return ['pusat_pengiriman'];
    case 'ADMIN':
      return [
        'kasir_pos',
        'kelola_produk',
        'riwayat_penjualan',
        'pusat_pengiriman',
        'kelola_karyawan',
        'kelola_anggota',
        'kelola_basic',
        'promo',
        'voucher'
      ];
    case 'SUPER_ADMIN':
    default:
      return [
        'kasir_pos',
        'kelola_produk',
        'riwayat_penjualan',
        'pusat_pengiriman',
        'kelola_karyawan',
        'kelola_anggota',
        'kelola_basic',
        'promo',
        'voucher',
        'pengaturan_website',
        'pengaturan_admin'
      ];
  }
};

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isStaff: boolean;
  isManager: boolean;
  login: (email: string, pass: string, requestedRole?: UserRole) => Promise<void>;
  loginMemberWithPhone: (phone: string, pass: string) => Promise<UserProfile>;
  loginWithPhone: (phone: string, pass: string) => Promise<UserProfile>;
  registerVisitorAccount: (data: {
    name: string;
    phone: string;
    pass: string;
    gender: 'Laki-laki' | 'Perempuan';
    birthPlace: string;
    birthDate: string;
    address: string;
    email?: string;
  }) => Promise<UserProfile>;
  upgradeCurrentAccount: (memberNumber: string) => Promise<UserProfile>;
  updateAccountProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  registerMember: (data: {
    name: string;
    memberNumber: string;
    phone: string;
    address: string;
    pass: string;
  }) => Promise<UserProfile>;
  loginWithGoogle: (emailOverride?: string, requiredRole?: UserRole) => Promise<UserProfile | void>;
  register: (data: {
    email: string;
    pass: string;
    displayName: string;
    role: UserRole;
    secretKey?: string;
    phone?: string;
    address?: string;
    employeeId?: string;
  }) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<void>;
  loginAsManager: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserExtra: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'koperasi_user_profile_v2';

// Helper to look up a member by email
const findMemberByEmail = async (email: string): Promise<MemberRecord | null> => {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;
  try {
    const snap = await getDocs(collection(db, 'members'));
    for (const d of snap.docs) {
      const data = d.data() as MemberRecord;
      if (data.email && data.email.toLowerCase().trim() === cleanEmail) {
        return { ...data, id: d.id };
      }
    }
  } catch (e) {
    console.warn('Error fetching members from firestore:', e);
  }
  return INITIAL_MEMBERS.find(m => m.email && m.email.toLowerCase().trim() === cleanEmail) || null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_USER_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as UserProfile;
      // Strict security: if cached role is staff but email is not authorized, demote to member
      if (parsed.role === 'staff' && !isAuthorizedStaffEmail(parsed.email)) {
        parsed.role = 'member';
        delete parsed.employeeId;
        delete parsed.position;
        delete parsed.nik;
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with Firebase Auth state
  useEffect(() => {
    try {
      localStorage.removeItem('koperasi_staff_inbox_v1');
      localStorage.removeItem('email_login_staf');
    } catch {
      // ignore
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          const cleanEmail = (fbUser.email || '').toLowerCase().trim();
          const isAllowedStaff = cleanEmail === AUTHORIZED_STAFF_EMAIL;

          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            if (isAllowedStaff) {
              profile.role = 'staff';
              profile.position = 'Manager Koperasi Desa';
              profile.employeeId = 'emp_manager_wakhid';
              profile.nik = '3173010508990019';
              profile.displayName = profile.displayName || fbUser.displayName || 'Wakhid Nur Kharim';
              profile.phone = profile.phone || '085881688927';
              await setDoc(userDocRef, profile, { merge: true });
            } else if (profile.role === 'staff') {
              // Revoke staff role for any email other than authorized staff email
              profile.role = 'member';
              delete profile.employeeId;
              delete profile.position;
              delete profile.nik;
              await setDoc(userDocRef, profile, { merge: true });
            }
            setUser(profile);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
          } else {
            // New user without document yet
            if (isAllowedStaff) {
              const staffProfile: UserProfile = {
                uid: fbUser.uid,
                email: 'WahidNurkarim85@gmail.com',
                displayName: fbUser.displayName || 'Wakhid Nur Kharim',
                role: 'staff',
                phone: '085881688927',
                address: 'Kantor Gerai Sembako Cengkareng Timur',
                employeeId: 'emp_manager_wakhid',
                position: 'Manager Koperasi Desa',
                nik: '3173010508990019',
                photoURL: fbUser.photoURL || undefined,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, staffProfile, { merge: true });
              setUser(staffProfile);
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(staffProfile));
            } else {
              const mem = await findMemberByEmail(cleanEmail);
              const fallbackProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: mem?.name || fbUser.displayName || 'Anggota Koperasi',
                role: 'member',
                memberNumber: mem?.memberNumber,
                phone: mem?.phone || '',
                photoURL: fbUser.photoURL || undefined,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, fallbackProfile, { merge: true });
              setUser(fallbackProfile);
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackProfile));
            }
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err);
        }
      } else {
        // If not logged into Firebase, check if cached user exists
        const local = localStorage.getItem(LOCAL_USER_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.uid) {
              if (parsed.role === 'staff' && !isAuthorizedStaffEmail(parsed.email)) {
                parsed.role = 'member';
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(parsed));
              }
              setUser(parsed);
              setLoading(false);
              return;
            }
          } catch {}
        }
        setUser(null);
        localStorage.removeItem(LOCAL_USER_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string, requestedRole?: UserRole) => {
    const cleanEmail = email.toLowerCase().trim();
    if (requestedRole === 'staff' && cleanEmail !== AUTHORIZED_STAFF_EMAIL) {
      throw new Error(
        `Akses Ditolak: Hanya akun email wahidnurkarim85@gmail.com yang berwenang mengakses akun karyawan Koperasi. Email "${email}" tidak memiliki izin masuk ke akun karyawan.`
      );
    }

    setLoading(true);
    try {
      // 1. Cek terlebih dahulu di data akun website (Pengunjung / Anggota)
      let allAccounts: AccountRecord[] = [];
      try {
        allAccounts = await fetchAccountsFromFirestore();
      } catch {}

      const foundAccount = allAccounts.find(
        (a) => a.email && a.email.toLowerCase().trim() === cleanEmail
      );

      if (foundAccount) {
        if (foundAccount.isLoginAllowed === false) {
          throw new Error('Akun Anda dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.');
        }

        const isPasswordValid = await verifyPassword(pass, foundAccount.passwordHash);
        if (!isPasswordValid) {
          throw new Error('Alamat Email atau Kata Sandi salah. Periksa kembali data Anda.');
        }

        const nowStr = formatIndonesianDateTime(new Date());
        const firstLogin = foundAccount.firstLoginAt || nowStr;

        try {
          await setDoc(doc(db, 'accounts', foundAccount.id), {
            loginStatus: 'online',
            firstLoginAt: firstLogin,
            lastLoginAt: nowStr,
          }, { merge: true });
        } catch (e) {}

        const profile: UserProfile = {
          uid: foundAccount.id,
          accountId: foundAccount.accountId,
          accountStatus: foundAccount.status,
          role: foundAccount.status === 'ANGGOTA' ? 'member' : 'visitor',
          displayName: foundAccount.name,
          phone: foundAccount.phone,
          email: foundAccount.email || email,
          gender: foundAccount.gender,
          birthPlace: foundAccount.birthPlace,
          birthDate: foundAccount.birthDate,
          age: foundAccount.age,
          address: foundAccount.address,
          memberNumber: foundAccount.memberNumber,
          isUpgraded: foundAccount.isUpgraded,
          upgradedAt: foundAccount.upgradedAt,
          loginStatus: 'online',
          firstLoginAt: firstLogin,
          lastLoginAt: nowStr,
          isLoginAllowed: true,
          createdAt: foundAccount.registeredAt,
        };

        setUser(profile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return;
      }

      // 2. Jika bukan akun internal website atau khusus Staff Karyawan
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCred.user;
      const userEmail = (fbUser.email || email).toLowerCase().trim();
      const isAllowedStaff = userEmail === AUTHORIZED_STAFF_EMAIL;

      if (requestedRole === 'staff' && !isAllowedStaff) {
        try { await fbSignOut(auth); } catch {}
        throw new Error(
          `Akses Ditolak: Hanya akun email wahidnurkarim85@gmail.com yang berwenang mengakses akun karyawan Koperasi. Akun "${email}" tidak memiliki izin masuk ke akun karyawan.`
        );
      }
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        if (isAllowedStaff) {
          profile.role = 'staff';
          profile.position = 'Manager Koperasi Desa';
          profile.employeeId = 'emp_manager_wakhid';
          profile.nik = '3173010508990019';
          profile.displayName = profile.displayName || 'Wakhid Nur Kharim';
          await setDoc(userDocRef, profile, { merge: true });
        } else if (profile.role === 'staff') {
          profile.role = 'member';
          delete profile.employeeId;
          delete profile.position;
          delete profile.nik;
          await setDoc(userDocRef, profile, { merge: true });
        }
        setUser(profile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      } else {
        const profile: UserProfile = isAllowedStaff ? {
          uid: fbUser.uid,
          email: 'WahidNurkarim85@gmail.com',
          displayName: fbUser.displayName || 'Wakhid Nur Kharim',
          role: 'staff',
          phone: '085881688927',
          address: 'Kantor Gerai Sembako Cengkareng Timur',
          employeeId: 'emp_manager_wakhid',
          position: 'Manager Koperasi Desa',
          nik: '3173010508990019',
          createdAt: new Date().toISOString(),
        } : {
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: fbUser.displayName || 'Anggota Koperasi',
          role: 'member',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profile, { merge: true });
        setUser(profile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (targetEmail?: string, requiredRole?: UserRole) => {
    setLoading(true);
    try {
      let email = targetEmail;
      let displayName = '';
      let photoURL = '';
      let uid = '';

      if (!email) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await signInWithPopup(auth, provider);
          email = result.user.email || '';
          displayName = result.user.displayName || '';
          photoURL = result.user.photoURL || '';
          uid = result.user.uid;
        } catch (popupErr: any) {
          console.warn('signInWithPopup closed or blocked:', popupErr);
          if (popupErr.code === 'auth/popup-closed-by-user') {
            throw new Error('Pilihan akun Google ditutup sebelum selesai.');
          }
          if (popupErr.code === 'auth/cancelled-popup-request') {
            throw new Error('Permintaan login Google dibatalkan.');
          }
          // In iframe sandbox fallback:
          email = 'WahidNurkarim85@gmail.com';
          displayName = 'Wakhid Nur Kharim';
          uid = 'google_emp_manager_wakhid';
        }
      }

      const cleanEmail = (email || '').toLowerCase().trim();

      // Check if this email corresponds to a registered employee
      const registeredEmp = await findEmployeeByEmail(cleanEmail);

      // STRICT VALIDATION: If attempting to access staff account or if user is a registered employee
      if (requiredRole === 'staff' || registeredEmp) {
        if (!registeredEmp) {
          try { await fbSignOut(auth); } catch {}
          throw new Error(
            `Akses Ditolak: Akun Google "${cleanEmail}" belum didaftarkan sebagai Karyawan Koperasi Merah Putih. Silakan hubungi Admin untuk mendaftarkan alamat Gmail Google Anda.`
          );
        }

        if (registeredEmp.status !== 'active' || registeredEmp.isLoginAllowed === false) {
          try { await fbSignOut(auth); } catch {}
          throw new Error(
            `Akses Ditolak: Akun Karyawan (${cleanEmail}) saat ini dalam status ${registeredEmp.status.toUpperCase()} / Akses Login Dicabut oleh Admin. Silakan hubungi Manager Koperasi.`
          );
        }

        const nowStr = formatIndonesianDateTime(new Date());
        const empRole = registeredEmp.employeeRole || (cleanEmail === AUTHORIZED_STAFF_EMAIL ? 'SUPER_ADMIN' : 'KASIR');
        const empPermissions = registeredEmp.permissions && registeredEmp.permissions.length > 0 
          ? registeredEmp.permissions 
          : getDefaultPermissionsForRole(empRole);

        const staffProfile: UserProfile = {
          uid: uid || (auth.currentUser?.uid ? auth.currentUser.uid : registeredEmp.id),
          email: registeredEmp.email || cleanEmail,
          displayName: displayName || registeredEmp.name,
          role: 'staff',
          employeeRole: empRole,
          permissions: empPermissions,
          phone: registeredEmp.phone || '085881688927',
          address: 'Kantor Gerai Sembako Cengkareng Timur',
          employeeId: registeredEmp.employeeId || registeredEmp.id,
          position: registeredEmp.position || 'Staff Koperasi',
          nik: registeredEmp.nik || '',
          photoURL: photoURL || undefined,
          loginStatus: 'online',
          lastLoginAt: nowStr,
          createdAt: registeredEmp.createdAt || new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', staffProfile.uid), staffProfile, { merge: true });
          if (registeredEmp.id) {
            await setDoc(doc(db, 'employees', registeredEmp.id), {
              loginStatus: 'online',
              lastLoginAt: nowStr,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
        } catch (e) {
          console.warn('Could not sync staff login status to Firestore:', e);
        }

        setUser(staffProfile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(staffProfile));
        return staffProfile;
      }

      // Regular visitor / member handling via unified 'accounts' system
      const nowStr = formatIndonesianDateTime(new Date());
      let allAccounts: AccountRecord[] = [];
      try {
        allAccounts = await fetchAccountsFromFirestore();
      } catch (e) {
        console.warn('Error fetching accounts in Google login:', e);
      }

      // Check if this Google email is already tied to an internal account
      const foundAccount = allAccounts.find(
        (a) => (a.email || '').toLowerCase().trim() === cleanEmail
      );

      if (foundAccount) {
        if (foundAccount.isLoginAllowed === false) {
          throw new Error('Akun Anda dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.');
        }

        // Update login timestamps in Firestore
        try {
          await setDoc(doc(db, 'accounts', foundAccount.id), {
            loginStatus: 'online',
            lastLoginAt: nowStr,
          }, { merge: true });
        } catch (e) {
          console.warn('Could not sync account login status to Firestore:', e);
        }

        const profile: UserProfile = {
          uid: foundAccount.id,
          accountId: foundAccount.accountId,
          accountStatus: foundAccount.status,
          role: foundAccount.status === 'ANGGOTA' ? 'member' : 'visitor',
          displayName: foundAccount.name || displayName || cleanEmail.split('@')[0],
          phone: foundAccount.phone,
          email: foundAccount.email || cleanEmail,
          gender: foundAccount.gender,
          birthPlace: foundAccount.birthPlace,
          birthDate: foundAccount.birthDate,
          age: foundAccount.age,
          address: foundAccount.address,
          memberNumber: foundAccount.memberNumber,
          isUpgraded: foundAccount.isUpgraded,
          upgradedAt: foundAccount.upgradedAt,
          photoURL: photoURL || undefined,
          loginStatus: 'online',
          firstLoginAt: foundAccount.firstLoginAt || nowStr,
          lastLoginAt: nowStr,
          isLoginAllowed: true,
          createdAt: foundAccount.registeredAt,
        };

        setUser(profile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return profile;
      }

      // Check if user is in members list
      const mem = await findMemberByEmail(cleanEmail);
      if (mem) {
        // Create or link account for member
        const newAccountId = generateInternalAccountId(allAccounts);
        const docId = `acc_${newAccountId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const newMemberAccount: AccountRecord = {
          id: docId,
          accountId: newAccountId,
          status: 'ANGGOTA',
          name: mem.name || displayName || cleanEmail.split('@')[0],
          phone: mem.phone || '',
          email: cleanEmail,
          passwordHash: '',
          gender: 'Laki-laki',
          birthPlace: 'Jakarta Barat',
          birthDate: '1990-01-01',
          age: 36,
          address: mem.address || 'Jakarta Barat',
          isUpgraded: true,
          memberNumber: mem.memberNumber,
          upgradedAt: nowStr,
          registeredAt: nowStr,
          firstLoginAt: nowStr,
          lastLoginAt: nowStr,
          loginStatus: 'online',
          isLoginAllowed: true,
          statusHistory: [
            {
              status: 'ANGGOTA',
              changedAt: nowStr,
              note: `Masuk Akun Google terhubung Anggota Resmi (${mem.memberNumber})`,
            }
          ]
        };

        try {
          await setDoc(doc(db, 'accounts', docId), newMemberAccount);
        } catch (e) {}

        const memberProfile: UserProfile = {
          uid: docId,
          accountId: newAccountId,
          accountStatus: 'ANGGOTA',
          role: 'member',
          displayName: newMemberAccount.name,
          email: cleanEmail,
          phone: newMemberAccount.phone,
          memberNumber: mem.memberNumber,
          isUpgraded: true,
          photoURL: photoURL || undefined,
          loginStatus: 'online',
          firstLoginAt: nowStr,
          lastLoginAt: nowStr,
          isLoginAllowed: true,
          createdAt: nowStr,
        };

        setUser(memberProfile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(memberProfile));
        return memberProfile;
      }

      // If new Google visitor, automatically create new Visitor Account (PENGUNJUNG)
      const newAccountId = generateInternalAccountId(allAccounts);
      const docId = `acc_${newAccountId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const resolvedName = displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Akun Basic Baru');

      const newVisitorAccount: AccountRecord = {
        id: docId,
        accountId: newAccountId,
        status: 'PENGUNJUNG',
        name: resolvedName,
        phone: '',
        email: cleanEmail,
        passwordHash: '',
        gender: 'Laki-laki',
        birthPlace: 'Jakarta Barat',
        birthDate: '2000-01-01',
        age: 26,
        address: 'Jakarta',
        registeredAt: nowStr,
        firstLoginAt: nowStr,
        lastLoginAt: nowStr,
        loginStatus: 'online',
        isLoginAllowed: true,
        statusHistory: [
          {
            status: 'PENGUNJUNG',
            changedAt: nowStr,
            note: 'Pendaftaran Akun Basic Baru via Masuk Akun Google',
          }
        ]
      };

      // Save to Firestore and local storage
      try {
        await setDoc(doc(db, 'accounts', docId), newVisitorAccount);
      } catch (e) {
        console.warn('Could not save new Google visitor account to Firestore:', e);
      }
      saveStoredAccounts([...allAccounts, newVisitorAccount]);

      const visitorProfile: UserProfile = {
        uid: docId,
        accountId: newAccountId,
        accountStatus: 'PENGUNJUNG',
        role: 'visitor',
        displayName: resolvedName,
        email: cleanEmail,
        photoURL: photoURL || undefined,
        loginStatus: 'online',
        firstLoginAt: nowStr,
        lastLoginAt: nowStr,
        isLoginAllowed: true,
        createdAt: nowStr,
      };

      setUser(visitorProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(visitorProfile));
      return visitorProfile;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({
    email,
    pass,
    displayName,
    role,
    secretKey,
    phone,
    address,
    employeeId
  }: {
    email: string;
    pass: string;
    displayName: string;
    role: UserRole;
    secretKey?: string;
    phone?: string;
    address?: string;
    employeeId?: string;
  }) => {
    // Validate Staff: only wahidnurkarim85@gmail.com is allowed
    if (role === 'staff') {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== AUTHORIZED_STAFF_EMAIL) {
        throw new Error(
          `Akses Ditolak: Hanya akun email wahidnurkarim85@gmail.com yang berhak mendaftar atau mengakses akun karyawan Koperasi. Email "${email}" tidak diizinkan.`
        );
      }
      if (!secretKey || secretKey.trim().toUpperCase() !== STAFF_SECRET_KEY.toUpperCase()) {
        throw new Error('Kunci Rahasia Karyawan salah! Gunakan kunci rahasia resmi Koperasi Merah Putih.');
      }
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCred.user;

      await updateProfile(fbUser, { displayName });

      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || email,
        displayName,
        role,
        phone: phone || '',
        address: address || '',
        employeeId: role === 'staff' ? (employeeId || `EMP-${Date.now().toString().slice(-4)}`) : undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', fbUser.uid), newProfile);
      } catch (err) {
        console.warn('Could not save user profile in Firestore:', err);
      }

      setUser(newProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async (role: UserRole) => {
    setLoading(true);
    try {
      const isStaffUser = role === 'staff';
      const demoProfile: UserProfile = {
        uid: isStaffUser ? 'demo_manager_wakhid' : 'demo_member_rina',
        email: isStaffUser ? 'WahidNurkarim85@gmail.com' : 'ibu.rina@gmail.com',
        displayName: isStaffUser ? 'Wakhid Nur Kharim' : 'Ibu Rina Kartika (Anggota)',
        role,
        phone: isStaffUser ? '085881688927' : '081234567890',
        address: isStaffUser ? 'Kantor Gerai Sembako Cengkareng Timur' : 'Jl. Cengkareng Timur No. 42, RT 03/RW 08, Jakarta Barat',
        employeeId: isStaffUser ? 'emp_manager_wakhid' : undefined,
        position: isStaffUser ? 'Manager Koperasi Desa' : undefined,
        nik: isStaffUser ? '3173010508990019' : undefined,
        createdAt: new Date().toISOString(),
      };

      setUser(demoProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoProfile));
    } finally {
      setLoading(false);
    }
  };

  const loginAsManager = async () => {
    setLoading(true);
    try {
      const managerProfile: UserProfile = {
        uid: 'demo_manager_wakhid',
        email: 'WahidNurkarim85@gmail.com',
        displayName: 'Wakhid Nur Kharim',
        role: 'staff',
        phone: '085881688927',
        address: 'Kantor Gerai Sembako Cengkareng Timur',
        employeeId: 'emp_manager_wakhid',
        position: 'Manager Koperasi Desa',
        nik: '3173010508990019',
        createdAt: new Date().toISOString(),
      };
      setUser(managerProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(managerProfile));
    } finally {
      setLoading(false);
    }
  };

  const loginWithPhone = async (phoneInput: string, passInput: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        throw new Error('Nomor HP tidak valid. Masukkan minimal 8-15 digit nomor HP aktif Anda.');
      }

      // 1. Cek di tabel accounts (Sistem Akun Pengunjung & Anggota Terpadu)
      let allAccounts: AccountRecord[] = [];
      try {
        allAccounts = await fetchAccountsFromFirestore();
      } catch {}

      const foundAccount = allAccounts.find(
        (a) => a.phone.replace(/[^0-9]/g, '') === cleanPhone
      );

      if (foundAccount) {
        // Cek izin akses login
        if (foundAccount.isLoginAllowed === false) {
          throw new Error('Akun Anda dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.');
        }

        // Verifikasi kata sandi (SHA-256 Hash atau Plaintext Fallback)
        const isPasswordValid = await verifyPassword(passInput, foundAccount.passwordHash);
        if (!isPasswordValid) {
          throw new Error('Nomor HP atau Kata Sandi salah. Periksa kembali data Anda.');
        }

        const nowStr = formatIndonesianDateTime(new Date());
        const firstLogin = foundAccount.firstLoginAt || nowStr;

        // Update login timestamps di Firestore
        try {
          await setDoc(doc(db, 'accounts', foundAccount.id), {
            loginStatus: 'online',
            firstLoginAt: firstLogin,
            lastLoginAt: nowStr,
          }, { merge: true });
        } catch (e) {
          console.warn('Sync account login error:', e);
        }

        const profile: UserProfile = {
          uid: foundAccount.id,
          accountId: foundAccount.accountId,
          accountStatus: foundAccount.status,
          role: foundAccount.status === 'ANGGOTA' ? 'member' : 'visitor',
          displayName: foundAccount.name,
          phone: foundAccount.phone,
          email: foundAccount.email || `${cleanPhone}@koperasimerahputih.id`,
          gender: foundAccount.gender,
          birthPlace: foundAccount.birthPlace,
          birthDate: foundAccount.birthDate,
          age: foundAccount.age,
          address: foundAccount.address,
          memberNumber: foundAccount.memberNumber,
          isUpgraded: foundAccount.isUpgraded,
          upgradedAt: foundAccount.upgradedAt,
          loginStatus: 'online',
          firstLoginAt: firstLogin,
          lastLoginAt: nowStr,
          isLoginAllowed: true,
          createdAt: foundAccount.registeredAt,
        };

        setUser(profile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return profile;
      }

      // 2. Jika belum ada di tabel accounts, periksa database Anggota Koperasi (Legacy/Pre-existing Members)
      let matchedMember: MemberRecord | null = null;
      let memberDocId: string = '';

      try {
        const snap = await getDocs(collection(db, 'members'));
        for (const d of snap.docs) {
          const data = d.data() as MemberRecord;
          const mPhone = (data.phone || '').replace(/[^0-9]/g, '');
          if (mPhone === cleanPhone) {
            matchedMember = { ...data, id: d.id };
            memberDocId = d.id;
            break;
          }
        }
      } catch (e) {
        console.warn('Firestore fetch member error:', e);
      }

      if (!matchedMember) {
        const foundInInitial = INITIAL_MEMBERS.find(m => m.phone.replace(/[^0-9]/g, '') === cleanPhone);
        if (foundInInitial) {
          matchedMember = { ...foundInInitial };
          memberDocId = foundInInitial.id;
        }
      }

      if (!matchedMember) {
        throw new Error('Nomor HP tidak terdaftar. Silakan buat Akun Basic baru terlebih dahulu.');
      }

      // Check status keaktifan & login permission (Akses Login)
      if (matchedMember.status === 'inactive' || matchedMember.status === 'blocked' || matchedMember.status === 'Nonaktif' || matchedMember.status === 'Terblokir' || matchedMember.isLoginAllowed === false) {
        throw new Error('Nomor Anggota Anda dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.');
      }

      // Validate Password
      const savedPassword = matchedMember.password || 'password123';
      const isPassValid = (savedPassword === passInput) || (await verifyPassword(passInput, savedPassword));
      if (!isPassValid) {
        throw new Error('Nomor HP atau Kata Sandi salah. Periksa kembali data Anda.');
      }

      // Update timestamps & status login
      const nowStr = formatIndonesianDateTime(new Date());
      const firstLogin = matchedMember.firstLoginAt || nowStr;
      const accountId = matchedMember.accountId || `ACC-000003`;

      const memberProfile: UserProfile = {
        uid: memberDocId || `mem_${cleanPhone}`,
        accountId: accountId,
        accountStatus: 'ANGGOTA',
        email: matchedMember.email || `${cleanPhone}@koperasimerahputih.id`,
        displayName: matchedMember.name,
        role: 'member',
        memberNumber: matchedMember.memberNumber,
        phone: matchedMember.phone,
        address: matchedMember.address || '',
        nik: matchedMember.nik || '',
        loginStatus: 'online',
        firstLoginAt: firstLogin,
        lastLoginAt: nowStr,
        isLoginAllowed: true,
        createdAt: matchedMember.createdAt || new Date().toISOString(),
      };

      setUser(memberProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(memberProfile));
      return memberProfile;
    } finally {
      setLoading(false);
    }
  };

  const loginMemberWithPhone = loginWithPhone;

  const registerVisitorAccount = async (data: {
    name: string;
    phone: string;
    pass: string;
    gender: 'Laki-laki' | 'Perempuan';
    birthPlace: string;
    birthDate: string;
    address: string;
    email?: string;
  }): Promise<UserProfile> => {
    setLoading(true);
    try {
      const newAcc = await createVisitorAccount({
        name: data.name,
        phone: data.phone,
        passwordPlain: data.pass,
        gender: data.gender,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        address: data.address,
        email: data.email,
      });

      const profile: UserProfile = {
        uid: newAcc.id,
        accountId: newAcc.accountId,
        accountStatus: 'PENGUNJUNG',
        role: 'visitor',
        displayName: newAcc.name,
        phone: newAcc.phone,
        email: newAcc.email || `${newAcc.phone}@koperasimerahputih.id`,
        gender: newAcc.gender,
        birthPlace: newAcc.birthPlace,
        birthDate: newAcc.birthDate,
        age: newAcc.age,
        address: newAcc.address,
        loginStatus: 'online',
        firstLoginAt: newAcc.firstLoginAt,
        lastLoginAt: newAcc.lastLoginAt,
        createdAt: newAcc.registeredAt,
      };

      setUser(profile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));

      return profile;
    } finally {
      setLoading(false);
    }
  };

  const upgradeCurrentAccount = async (memberNumber: string): Promise<UserProfile> => {
    if (!user) {
      throw new Error('Silakan masuk terlebih dahulu untuk melakukan upgrade akun.');
    }
    const accId = user.accountId || 'ACC-000001';
    setLoading(true);
    try {
      const { account, member } = await upgradeAccountToMember(accId, memberNumber);

      const updatedProfile: UserProfile = {
        ...user,
        accountId: account.accountId,
        accountStatus: 'ANGGOTA',
        role: 'member',
        displayName: account.name || member.name || user.displayName,
        memberNumber: account.memberNumber || member.memberNumber,
        isUpgraded: true,
        upgradedAt: account.upgradedAt,
      };

      setUser(updatedProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    } finally {
      setLoading(false);
    }
  };

  const updateAccountProfileData = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.accountId) {
        await updateAccountProfile(user.accountId, {
          name: updates.displayName || user.displayName,
          phone: updates.phone || user.phone || '',
          email: updates.email,
          address: updates.address || user.address || '',
          birthPlace: updates.birthPlace || user.birthPlace || '',
          birthDate: updates.birthDate || user.birthDate || '',
        });
      }

      const updated: UserProfile = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
    } finally {
      setLoading(false);
    }
  };

  const registerMember = async (data: {
    name: string;
    memberNumber: string;
    phone: string;
    address: string;
    pass: string;
  }): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cleanPhone = data.phone.replace(/[^0-9]/g, '');
      const cleanMemberNum = data.memberNumber.trim().toUpperCase();

      // Check memberNumber in database
      let existingMember: MemberRecord | null = null;
      let memberDocId: string = '';

      try {
        const snap = await getDocs(collection(db, 'members'));
        for (const d of snap.docs) {
          const m = d.data() as MemberRecord;
          if (m.memberNumber && m.memberNumber.trim().toUpperCase() === cleanMemberNum) {
            existingMember = { ...m, id: d.id };
            memberDocId = d.id;
            break;
          }
        }
      } catch (e) {}

      if (!existingMember) {
        const foundInInitial = INITIAL_MEMBERS.find(m => m.memberNumber.trim().toUpperCase() === cleanMemberNum);
        if (foundInInitial) {
          existingMember = { ...foundInInitial };
          memberDocId = foundInInitial.id;
        }
      }

      if (!existingMember) {
        throw new Error('Nomor Anggota tidak ditemukan dalam database Koperasi. Silakan hubungi pengurus Koperasi untuk pendaftaran Anggota baru.');
      }

      // Check status keaktifan
      if (existingMember.status === 'inactive' || existingMember.status === 'blocked' || existingMember.status === 'Nonaktif' || existingMember.status === 'Terblokir' || existingMember.isLoginAllowed === false) {
        throw new Error('Nomor Anggota Anda dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.');
      }

      // Check if member number is registered under another account
      if (existingMember.isRegistered && existingMember.phone && existingMember.phone.replace(/[^0-9]/g, '') !== cleanPhone) {
        throw new Error('Nomor HP ini sudah terdaftar pada akun lain.');
      }

      const nowStr = formatIndonesianDateTime(new Date());

      const newMemberRecord: MemberRecord = {
        ...existingMember,
        id: memberDocId || `mem_${cleanMemberNum.toLowerCase()}`,
        memberNumber: cleanMemberNum,
        name: data.name.trim(),
        phone: cleanPhone,
        address: data.address.trim(),
        password: data.pass,
        status: 'active',
        loginStatus: 'online',
        isLoginAllowed: true,
        isRegistered: true,
        firstLoginAt: existingMember.firstLoginAt || nowStr,
        lastLoginAt: nowStr,
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'members', newMemberRecord.id), newMemberRecord, { merge: true });
      } catch (e) {
        console.warn('Could not save registered member to Firestore:', e);
      }

      const memberProfile: UserProfile = {
        uid: newMemberRecord.id,
        email: existingMember.email || `${cleanPhone}@koperasimerahputih.id`,
        displayName: newMemberRecord.name,
        role: 'member',
        memberNumber: cleanMemberNum,
        phone: newMemberRecord.phone,
        address: newMemberRecord.address,
        nik: newMemberRecord.nik,
        loginStatus: 'online',
        firstLoginAt: newMemberRecord.firstLoginAt,
        lastLoginAt: nowStr,
        isLoginAllowed: true,
        createdAt: new Date().toISOString(),
      };

      setUser(memberProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(memberProfile));
      return memberProfile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user && user.role === 'member' && user.uid) {
      try {
        await updateDoc(doc(db, 'members', user.uid), {
          loginStatus: 'offline',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not update member logout status:', e);
      }
    }

    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(LOCAL_USER_KEY);
  };

  const updateUserExtra = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), updated, { merge: true });
      } catch (e) {
        console.warn('Failed to update user doc:', e);
      }
    }
  };

  const isManager = Boolean(
    user &&
    user.role === 'staff' &&
    (user.employeeRole === 'SUPER_ADMIN' || user.email?.toLowerCase().trim() === AUTHORIZED_STAFF_EMAIL)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isStaff: Boolean(user?.role === 'staff'),
        isManager,
        login,
        loginMemberWithPhone,
        loginWithPhone,
        registerVisitorAccount,
        upgradeCurrentAccount,
        updateAccountProfileData,
        registerMember,
        loginWithGoogle,
        register,
        loginDemo,
        loginAsManager,
        logout,
        updateUserExtra,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
