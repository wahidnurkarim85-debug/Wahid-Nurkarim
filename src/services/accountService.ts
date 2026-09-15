import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AccountRecord, MemberRecord, UserProfile } from '../types';
import { INITIAL_MEMBERS } from '../data/initialStaffMemberData';

const ACCOUNTS_STORAGE_KEY = 'koperasi_internal_accounts_v1';
const HASH_SALT = 'KOPDES_MERAHPUTIH_SALT_2026';

// 🔐 Hash Password securely using SHA-256 via Web Crypto API with Fallback
export async function hashPassword(password: string): Promise<string> {
  const salted = password + HASH_SALT;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(salted);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto error, using fallback hash:', e);
  }

  // Fallback simple 64-character deterministic pseudo-SHA256
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const combined = (part1 + part2).repeat(4).slice(0, 64);
  return combined;
}

// 🔐 Verify Password against Stored Hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // If stored as plain text (legacy fallback)
  if (storedHash === password) return true;
  
  const computed = await hashPassword(password);
  return computed.toLowerCase() === storedHash.toLowerCase();
}

// 📅 Calculate Age Automatically from Birth Date (YYYY-MM-DD)
export function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  try {
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return 0;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

// 🇮🇩 Format Indonesian Date Time
export function formatIndonesianDateTime(date: Date = new Date()): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
}

// 🔢 Generate Next Sequential ID Akun Internal (e.g. ACC-000001)
export function generateInternalAccountId(accountsList: AccountRecord[]): string {
  let maxId = 0;
  accountsList.forEach((acc) => {
    if (acc.accountId) {
      const match = acc.accountId.match(/ACC-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  });

  const nextNum = maxId + 1;
  return `ACC-${String(nextNum).padStart(6, '0')}`;
}

// 📋 Initial Sample Accounts (Basic & Upgraded Member)
export const INITIAL_ACCOUNTS: AccountRecord[] = [
  {
    id: 'acc_000001',
    accountId: 'ACC-000001',
    status: 'PENGUNJUNG',
    name: 'Bpk. Budi Santoso',
    phone: '081299887766',
    email: 'budi.santoso@gmail.com',
    passwordHash: '8f4b1a7d6e5c9b2e4a3d8f1c7e9b2a4d6f8a1c3e5b7d9f2a4c6e8b1d3f5a7c9e',
    gender: 'Laki-laki',
    birthPlace: 'Jakarta Barat',
    birthDate: '1995-04-12',
    age: calculateAge('1995-04-12'),
    address: 'Jl. Utama Raya No. 18, RT 02/RW 03, Cengkareng Timur',
    registeredAt: '01 September 2026, 09:30:00',
    firstLoginAt: '01 September 2026, 09:35:00',
    lastLoginAt: '07 September 2026, 11:20:14',
    loginStatus: 'offline',
    isLoginAllowed: true,
    statusHistory: [
      {
        status: 'PENGUNJUNG',
        changedAt: '01 September 2026, 09:30:00',
        note: 'Pendaftaran Akun Basic Baru melalui Website',
      },
    ],
  },
  {
    id: 'acc_000002',
    accountId: 'ACC-000002',
    status: 'PENGUNJUNG',
    name: 'Ibu Dewi Lestari',
    phone: '085611223344',
    email: 'dewi.lestari@gmail.com',
    passwordHash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    gender: 'Perempuan',
    birthPlace: 'Tangerang',
    birthDate: '1998-08-25',
    age: calculateAge('1998-08-25'),
    address: 'Jl. Bangun Nusa Indah No. 7, Cengkareng Timur',
    registeredAt: '03 September 2026, 14:15:00',
    firstLoginAt: '03 September 2026, 14:20:00',
    lastLoginAt: '06 September 2026, 16:45:10',
    loginStatus: 'offline',
    isLoginAllowed: true,
    statusHistory: [
      {
        status: 'PENGUNJUNG',
        changedAt: '03 September 2026, 14:15:00',
        note: 'Pendaftaran Akun Basic Baru melalui Website',
      },
    ],
  },
  {
    id: 'acc_000003',
    accountId: 'ACC-000003',
    status: 'ANGGOTA',
    name: 'Ibu Rina Kartika',
    phone: '081234567890',
    email: 'ibu.rina@gmail.com',
    passwordHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    gender: 'Perempuan',
    birthPlace: 'Jakarta Barat',
    birthDate: '1989-09-15',
    age: calculateAge('1989-09-15'),
    address: 'Jl. Cengkareng Timur No. 42, RT 03/RW 08, Jakarta Barat',
    isUpgraded: true,
    memberNumber: 'KMP-ANG-001',
    upgradedAt: '12 Januari 2024, 09:00:00',
    registeredAt: '12 Januari 2024, 08:30:00',
    firstLoginAt: '12 Januari 2024, 09:05:00',
    lastLoginAt: '08 September 2026, 10:14:22',
    loginStatus: 'offline',
    isLoginAllowed: true,
    statusHistory: [
      {
        status: 'PENGUNJUNG',
        changedAt: '12 Januari 2024, 08:30:00',
        note: 'Pendaftaran Awal Akun Basic',
      },
      {
        status: 'ANGGOTA',
        changedAt: '12 Januari 2024, 09:00:00',
        note: 'Berhasil Upgrade Akun ke Anggota Resmi (Nomor Anggota: KMP-ANG-001)',
      },
    ],
  },
];

// 💾 Local Storage Helpers
export function getStoredAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_ACCOUNTS;
}

export function saveStoredAccounts(accounts: AccountRecord[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

// ☁️ Firestore Helpers for Accounts Collection
export async function fetchAccountsFromFirestore(): Promise<AccountRecord[]> {
  try {
    const colRef = collection(db, 'accounts');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: AccountRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<AccountRecord, 'id'>) });
      });
      // Sort by accountId ascending
      list.sort((a, b) => (a.accountId || '').localeCompare(b.accountId || ''));
      saveStoredAccounts(list);
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch accounts from Firestore, using cached/initial:', err);
  }
  return getStoredAccounts();
}

// ➕ Create New Visitor Account (Pendaftaran Akun Basic)
export async function createVisitorAccount(data: {
  name: string;
  phone: string;
  passwordPlain: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  address: string;
  email?: string;
}): Promise<AccountRecord> {
  const cleanPhone = data.phone.replace(/[^0-9]/g, '');
  const existingList = await fetchAccountsFromFirestore();

  // Check duplicate phone
  const phoneDup = existingList.find(
    (a) => a.phone.replace(/[^0-9]/g, '') === cleanPhone
  );
  if (phoneDup) {
    throw new Error(`Nomor HP "${data.phone}" sudah terdaftar. Silakan masuk menggunakan akun Anda.`);
  }

  // Check duplicate email if provided
  if (data.email && data.email.trim()) {
    const cleanEmail = data.email.trim().toLowerCase();
    const emailDup = existingList.find(
      (a) => a.email && a.email.trim().toLowerCase() === cleanEmail
    );
    if (emailDup) {
      throw new Error(`Alamat email "${data.email}" sudah terdaftar pada akun lain.`);
    }
  }

  // Generate Unique Internal Account ID (e.g. ACC-000001)
  const newAccountId = generateInternalAccountId(existingList);
  const docId = `acc_${newAccountId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const passHash = await hashPassword(data.passwordPlain);
  const age = calculateAge(data.birthDate);
  const nowStr = formatIndonesianDateTime(new Date());

  const newAccount: AccountRecord = {
    id: docId,
    accountId: newAccountId,
    status: 'PENGUNJUNG',
    name: data.name.trim(),
    phone: cleanPhone,
    email: data.email?.trim() || undefined,
    passwordHash: passHash,
    gender: data.gender,
    birthPlace: data.birthPlace.trim(),
    birthDate: data.birthDate,
    age,
    address: data.address.trim(),
    registeredAt: nowStr,
    firstLoginAt: nowStr,
    lastLoginAt: nowStr,
    loginStatus: 'online',
    isLoginAllowed: true,
    statusHistory: [
      {
        status: 'PENGUNJUNG',
        changedAt: nowStr,
        note: 'Pendaftaran Akun Basic Baru melalui Website',
      },
    ],
  };

  // Save to Firestore 'accounts'
  try {
    await setDoc(doc(db, 'accounts', docId), newAccount);
  } catch (e) {
    console.warn('Firestore set account error, cached locally:', e);
  }

  // Update local storage
  const updatedList = [...existingList, newAccount];
  saveStoredAccounts(updatedList);

  return newAccount;
}

// ⬆️ Upgrade Account from Basic to Anggota (TETAP SATU ID AKUN INTERNAL)
export async function upgradeAccountToMember(
  accountId: string,
  memberNumberToLink: string
): Promise<{ account: AccountRecord; member: MemberRecord }> {
  const cleanMemberNum = memberNumberToLink.trim().toUpperCase();
  const existingAccounts = await fetchAccountsFromFirestore();
  const targetAccount = existingAccounts.find(
    (a) => a.accountId.toUpperCase() === accountId.toUpperCase()
  );

  if (!targetAccount) {
    throw new Error(`Akun dengan ID "${accountId}" tidak ditemukan.`);
  }

  if (targetAccount.status === 'ANGGOTA') {
    throw new Error(`Akun ini sudah berstatus Anggota (Nomor Anggota: ${targetAccount.memberNumber || '-'}).`);
  }

  // Verify Member Number against Members collection
  let matchedMember: MemberRecord | null = null;
  let memberDocId: string = '';

  try {
    const snap = await getDocs(collection(db, 'members'));
    for (const d of snap.docs) {
      const m = d.data() as MemberRecord;
      if (m.memberNumber && m.memberNumber.trim().toUpperCase() === cleanMemberNum) {
        matchedMember = { ...m, id: d.id };
        memberDocId = d.id;
        break;
      }
    }
  } catch (err) {}

  if (!matchedMember) {
    const foundInitial = INITIAL_MEMBERS.find(
      (m) => m.memberNumber.trim().toUpperCase() === cleanMemberNum
    );
    if (foundInitial) {
      matchedMember = { ...foundInitial };
      memberDocId = foundInitial.id;
    }
  }

  if (!matchedMember) {
    throw new Error(
      `Nomor Anggota "${memberNumberToLink}" tidak ditemukan dalam data Koperasi Merah Putih. Pastikan nomor sudah didaftarkan oleh Pengurus/Karyawan.`
    );
  }

  if (
    matchedMember.status === 'inactive' ||
    matchedMember.status === 'blocked' ||
    matchedMember.status === 'Nonaktif' ||
    matchedMember.status === 'Terblokir' ||
    matchedMember.isLoginAllowed === false
  ) {
    throw new Error(`Nomor Anggota "${cleanMemberNum}" dalam status Nonaktif / Terblokir. Silakan hubungi pengurus Koperasi.`);
  }

  // Check if member is already linked to another account
  const alreadyLinked = existingAccounts.find(
    (a) =>
      a.memberNumber &&
      a.memberNumber.toUpperCase() === cleanMemberNum &&
      a.accountId.toUpperCase() !== accountId.toUpperCase()
  );
  if (alreadyLinked) {
    throw new Error(
      `Nomor Anggota "${cleanMemberNum}" sudah terhubung dengan ID Akun Internal lain (${alreadyLinked.accountId}).`
    );
  }

  const nowStr = formatIndonesianDateTime(new Date());

  // UPGRADE THE ACCOUNT: Keep same ID Akun Internal!
  const updatedAccount: AccountRecord = {
    ...targetAccount,
    status: 'ANGGOTA',
    isUpgraded: true,
    memberNumber: cleanMemberNum,
    upgradedAt: nowStr,
    statusHistory: [
      ...(targetAccount.statusHistory || []),
      {
        status: 'ANGGOTA',
        changedAt: nowStr,
        note: `Upgrade Akun Basic menjadi Anggota Resmi (No. Anggota: ${cleanMemberNum}, Nama: ${matchedMember.name})`,
      },
    ],
  };

  // UPDATE MEMBER RECORD to link to accountId
  const updatedMember: MemberRecord = {
    ...matchedMember,
    accountId: targetAccount.accountId,
    upgradedAt: nowStr,
    isRegistered: true,
    phone: matchedMember.phone || targetAccount.phone,
    address: matchedMember.address || targetAccount.address,
    updatedAt: new Date().toISOString(),
  };

  // Sync to Firestore
  try {
    await setDoc(doc(db, 'accounts', targetAccount.id), updatedAccount, { merge: true });
    await setDoc(doc(db, 'members', memberDocId || updatedMember.id), updatedMember, { merge: true });
  } catch (err) {
    console.warn('Sync to Firestore on upgrade error:', err);
  }

  // Update local storage
  const updatedList = existingAccounts.map((a) =>
    a.accountId.toUpperCase() === accountId.toUpperCase() ? updatedAccount : a
  );
  saveStoredAccounts(updatedList);

  return { account: updatedAccount, member: updatedMember };
}

// ✏️ Update Account Profile (Email, Alamat, Tempat Lahir, dll)
export async function updateAccountProfile(
  accountId: string,
  updates: Partial<Omit<AccountRecord, 'id' | 'accountId' | 'passwordHash'>>
): Promise<AccountRecord> {
  const existingAccounts = await fetchAccountsFromFirestore();
  const target = existingAccounts.find(
    (a) => a.accountId.toUpperCase() === accountId.toUpperCase()
  );

  if (!target) {
    throw new Error(`Akun ID "${accountId}" tidak ditemukan.`);
  }

  // Re-calculate age if birthDate changed
  const newBirthDate = updates.birthDate || target.birthDate;
  const newAge = newBirthDate ? calculateAge(newBirthDate) : target.age;

  const updated: AccountRecord = {
    ...target,
    ...updates,
    birthDate: newBirthDate,
    age: newAge,
  };

  try {
    await setDoc(doc(db, 'accounts', target.id), updated, { merge: true });
    // Also if upgraded, update member address/phone if applicable
    if (target.memberNumber) {
      const snap = await getDocs(collection(db, 'members'));
      for (const d of snap.docs) {
        const m = d.data() as MemberRecord;
        if (m.memberNumber === target.memberNumber) {
          await updateDoc(doc(db, 'members', d.id), {
            address: updated.address,
            phone: updated.phone,
            updatedAt: new Date().toISOString(),
          });
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Sync profile update error:', err);
  }

  const updatedList = existingAccounts.map((a) =>
    a.accountId.toUpperCase() === accountId.toUpperCase() ? updated : a
  );
  saveStoredAccounts(updatedList);

  return updated;
}
