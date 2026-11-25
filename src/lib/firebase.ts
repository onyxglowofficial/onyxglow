import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  BookingStatus,
  CustomerOrder,
  CustomerProfile,
  CustomerStatus,
  EventConfig,
  LaunchBooking,
  OrderItem,
  OrderStatus,
  ProductItem,
  SiteContent,
} from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyDiwWzXzSA4ryNmxkM5fQwBDUN2FxUzlNg',
  authDomain: 'onyx-glow.firebaseapp.com',
  projectId: 'onyx-glow',
  storageBucket: 'onyx-glow.firebasestorage.app',
  messagingSenderId: '582935110155',
  appId: '1:582935110155:web:5cf10564a35d9f81d55d0e',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (rawMessage.toLowerCase().includes('permission') || rawMessage.includes('PERMISSION_DENIED')) {
    throw new Error(
      'Firestore permission denied. Ensure Firestore Database and firestore.rules are published in your onyx-glow Firebase Console.',
    );
  }
  throw new Error(rawMessage);
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export function mapAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters (8+ recommended).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet in Firebase Console (Authentication → Sign-in method).';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/unauthorized-domain':
      return 'This preview domain must be added to Firebase Console → Authentication → Settings → Authorized domains.';
    default:
      return err instanceof Error ? err.message : 'Authentication request failed.';
  }
}

function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function generateRefCode(prefix: string): string {
  const year = new Date().getFullYear();
  const hex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
  return `${prefix}-${year}-${hex}`;
}

const inFlightUserSync = new Map<string, Promise<CustomerProfile>>();

function normalizeName(raw?: string | null): string {
  const trimmed = (raw ?? '').trim().slice(0, 100);
  return trimmed.length >= 2 ? trimmed : 'ONYX GLOW Client';
}

function normalizePhone(raw?: string | null): string {
  return (raw ?? '').trim().slice(0, 30);
}

export async function syncFirebaseUserToFirestore(
  fbUser: FirebaseUser,
  overrides?: { fullName?: string; phone?: string },
): Promise<CustomerProfile> {
  if (!overrides) {
    const pending = inFlightUserSync.get(fbUser.uid);
    if (pending) return pending;
  }

  const run = async (): Promise<CustomerProfile> => {
    const path = `users/${fbUser.uid}`;
    const ref = doc(db, 'users', fbUser.uid);
    const now = new Date().toISOString();

    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const existing = snap.data() as CustomerProfile;
        const updated: CustomerProfile = {
          ...existing,
          fullName: normalizeName(overrides?.fullName || existing.fullName || fbUser.displayName),
          phone: normalizePhone(overrides?.phone ?? existing.phone ?? ''),
          emailVerified: fbUser.emailVerified,
          updatedAt: now,
        };
        await updateDoc(ref, {
          fullName: updated.fullName,
          phone: updated.phone,
          emailVerified: updated.emailVerified,
          updatedAt: updated.updatedAt,
        });
        return updated;
      }

      const created: CustomerProfile = {
        id: fbUser.uid,
        uid: fbUser.uid,
        fullName: normalizeName(overrides?.fullName || fbUser.displayName),
        email: (fbUser.email || '').trim().toLowerCase().slice(0, 160),
        phone: normalizePhone(overrides?.phone || fbUser.phoneNumber),
        emailVerified: fbUser.emailVerified,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(ref, {
        uid: created.uid,
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        emailVerified: created.emailVerified,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
      return created;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const promise = run().finally(() => {
    if (inFlightUserSync.get(fbUser.uid) === promise) {
      inFlightUserSync.delete(fbUser.uid);
    }
  });
  inFlightUserSync.set(fbUser.uid, promise);
  return promise;
}

let authFlowBusy = false;

export function isAuthFlowBusy(): boolean {
  return authFlowBusy;
}

export async function firebaseSignUp(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<CustomerProfile> {
  authFlowBusy = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
    await updateProfile(cred.user, { displayName: params.fullName });
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Verification email dispatch is best-effort
    }
    return await syncFirebaseUserToFirestore(cred.user, {
      fullName: params.fullName,
      phone: params.phone,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Firestore permission denied')) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  } finally {
    authFlowBusy = false;
  }
}

export async function firebaseSignIn(params: {
  email: string;
  password: string;
}): Promise<CustomerProfile> {
  authFlowBusy = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, params.email, params.password);
    const profile = await syncFirebaseUserToFirestore(cred.user);
    if (profile.status === 'suspended') {
      await signOut(auth);
      throw new Error('This account is currently suspended. Please contact ONYX GLOW.');
    }
    return profile;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Firestore permission denied')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('suspended')) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  } finally {
    authFlowBusy = false;
  }
}

export async function firebaseSignInWithGoogle(): Promise<CustomerProfile> {
  authFlowBusy = true;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await syncFirebaseUserToFirestore(cred.user);
    if (profile.status === 'suspended') {
      await signOut(auth);
      throw new Error('This account is currently suspended. Please contact ONYX GLOW.');
    }
    return profile;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Firestore permission denied')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('suspended')) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  } finally {
    authFlowBusy = false;
  }
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

export async function firebaseResetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function firebaseResendVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in first.');
  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function firebaseUpdateProfile(params: {
  fullName: string;
  phone: string;
}): Promise<CustomerProfile> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  await updateProfile(user, { displayName: params.fullName });
  return syncFirebaseUserToFirestore(user, params);
}

export async function firebaseSignInAdminAuth(
  email: string,
  password: string,
): Promise<{ email: string; emailVerified: boolean } | null> {
  authFlowBusy = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return {
      email: cred.user.email || email,
      emailVerified: cred.user.emailVerified,
    };
  } catch {
    return null;
  } finally {
    authFlowBusy = false;
  }
}

const ADMIN_EMAIL = 'onyxglow@gmail.com';

export async function firebaseSignInAdminStrict(
  email: string,
  password: string,
): Promise<{ email: string; emailVerified: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== ADMIN_EMAIL) {
    throw new Error(`Access restricted strictly to authorized admin (${ADMIN_EMAIL}).`);
  }
  authFlowBusy = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, normalized, password);
    const userEmail = (cred.user.email || '').trim().toLowerCase();
    if (userEmail !== ADMIN_EMAIL) {
      await signOut(auth);
      throw new Error(`Access restricted strictly to authorized admin (${ADMIN_EMAIL}).`);
    }
    return {
      email: cred.user.email || normalized,
      emailVerified: cred.user.emailVerified,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access restricted')) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  } finally {
    authFlowBusy = false;
  }
}

export async function firebaseSignInAdminWithGoogleStrict(): Promise<{
  email: string;
  emailVerified: boolean;
}> {
  authFlowBusy = true;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const userEmail = (cred.user.email || '').trim().toLowerCase();
    if (userEmail !== ADMIN_EMAIL) {
      await signOut(auth);
      throw new Error(`Access restricted strictly to ${ADMIN_EMAIL}. Signed out ${userEmail || 'account'}.`);
    }
    return {
      email: cred.user.email || ADMIN_EMAIL,
      emailVerified: cred.user.emailVerified,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access restricted')) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  } finally {
    authFlowBusy = false;
  }
}

export async function refreshFirebaseUserStatus(): Promise<{
  email: string | null;
  emailVerified: boolean;
}> {
  if (!auth.currentUser) {
    return { email: null, emailVerified: false };
  }
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return {
    email: auth.currentUser.email,
    emailVerified: auth.currentUser.emailVerified,
  };
}

export async function fetchUserBookingsAndOrders(uid: string): Promise<{
  bookings: LaunchBooking[];
  orders: CustomerOrder[];
}> {
  let bookings: LaunchBooking[] = [];
  let orders: CustomerOrder[] = [];

  try {
    const bSnap = await getDocs(
      query(collection(db, 'bookings'), where('userId', '==', uid)),
    );
    bookings = bSnap.docs
      .map((d) => d.data() as LaunchBooking)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }

  try {
    const oSnap = await getDocs(
      query(collection(db, 'orders'), where('userId', '==', uid)),
    );
    orders = oSnap.docs
      .map((d) => d.data() as CustomerOrder)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'orders');
  }

  return { bookings, orders };
}

export async function createFirestoreLaunchBooking(params: {
  fullName: string;
  email: string;
  phone: string;
  guests: number;
  attendanceConfirmed: boolean;
  message: string;
  privacyConsent: boolean;
}): Promise<LaunchBooking> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in or create an account before booking the launch event.');
  }

  const path = 'bookings';
  try {
    const existingSnap = await getDocs(
      query(collection(db, path), where('userId', '==', user.uid)),
    );
    const activeExisting = existingSnap.docs
      .map((d) => d.data() as LaunchBooking)
      .find((b) => b.status === 'Pending' || b.status === 'Confirmed');
    if (activeExisting) {
      throw new Error(
        `You already have an active launch event booking (${activeExisting.referenceNumber}).`,
      );
    }

    const id = generateDocId('bkg');
    const now = new Date().toISOString();
    const booking: LaunchBooking = {
      id,
      referenceNumber: generateRefCode('OG'),
      fullName: params.fullName,
      email: params.email.toLowerCase(),
      phone: params.phone,
      guests: params.guests,
      attendanceConfirmed: params.attendanceConfirmed,
      message: params.message,
      privacyConsent: params.privacyConsent,
      userId: user.uid,
      status: 'Pending',
      emailNotificationStatus: 'stored_firestore',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, path, id), {
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      userId: user.uid,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      guests: booking.guests,
      attendanceConfirmed: true,
      message: booking.message,
      privacyConsent: true,
      status: 'Pending',
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    });

    return booking;
  } catch (error) {
    if (error instanceof Error && error.message.includes('active launch event booking')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createFirestoreOrder(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string;
  items: OrderItem[];
}): Promise<CustomerOrder> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in or create an account before placing an order.');
  }
  if (params.items.length === 0) {
    throw new Error('Your selection bag is empty.');
  }

  const id = generateDocId('ord');
  const now = new Date().toISOString();
  const order: CustomerOrder = {
    id,
    orderReference: generateRefCode('ORD'),
    userId: user.uid,
    customerName: params.customerName,
    customerEmail: params.customerEmail.toLowerCase(),
    customerPhone: params.customerPhone,
    shippingAddress: params.shippingAddress,
    notes: params.notes,
    items: params.items,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'orders', id), {
      id: order.id,
      orderReference: order.orderReference,
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      items: order.items,
      status: 'Pending',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
    return order;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${id}`);
  }
}

export async function fetchFirestoreStorefront(): Promise<{
  products: ProductItem[] | null;
  eventConfig: EventConfig | null;
  siteContent: SiteContent | null;
}> {
  let products: ProductItem[] | null = null;
  let eventConfig: EventConfig | null = null;
  let siteContent: SiteContent | null = null;

  try {
    const pSnap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
    if (!pSnap.empty) {
      products = pSnap.docs.map((d) => d.data() as ProductItem);
    }
  } catch {
    // Fallback cleanly if Firestore collection/rules are not yet initialized
  }

  try {
    const eSnap = await getDoc(doc(db, 'config', 'event'));
    if (eSnap.exists()) {
      eventConfig = eSnap.data() as EventConfig;
    }
  } catch {
    // Fallback cleanly
  }

  try {
    const cSnap = await getDoc(doc(db, 'config', 'siteContent'));
    if (cSnap.exists()) {
      siteContent = cSnap.data() as SiteContent;
    }
  } catch {
    // Fallback cleanly
  }

  return { products, eventConfig, siteContent };
}

export async function fetchFirestoreAdminRecords(): Promise<{
  bookings: LaunchBooking[];
  orders: CustomerOrder[];
  customers: CustomerProfile[];
}> {
  const [bSnap, oSnap, uSnap] = await Promise.all([
    getDocs(collection(db, 'bookings')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, 'bookings'),
    ),
    getDocs(collection(db, 'orders')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, 'orders'),
    ),
    getDocs(collection(db, 'users')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, 'users'),
    ),
  ]);

  return {
    bookings: bSnap.docs
      .map((d) => d.data() as LaunchBooking)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    orders: oSnap.docs
      .map((d) => d.data() as CustomerOrder)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    customers: uSnap.docs
      .map((d) => d.data() as CustomerProfile)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function createFirestoreAdminBooking(params: {
  id?: string;
  referenceNumber?: string;
  fullName: string;
  email: string;
  phone: string;
  guests: number;
  status: BookingStatus;
  message: string;
}): Promise<LaunchBooking> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase Admin session required.');
  }
  const id = params.id || generateDocId('bkg_adm');
  const referenceNumber = params.referenceNumber || generateRefCode('OG');
  const now = new Date().toISOString();
  const booking: LaunchBooking = {
    id,
    referenceNumber,
    fullName: params.fullName,
    email: params.email.toLowerCase(),
    phone: params.phone,
    guests: params.guests,
    attendanceConfirmed: true,
    message: params.message,
    privacyConsent: true,
    userId: user.uid,
    status: params.status,
    emailNotificationStatus: 'admin_created',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'bookings', id), {
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      userId: user.uid,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      guests: booking.guests,
      attendanceConfirmed: true,
      message: booking.message,
      privacyConsent: true,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    });
    return booking;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `bookings/${id}`);
  }
}

export async function updateFirestoreBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'bookings', id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
  }
}

export async function deleteFirestoreBooking(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'bookings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
  }
}

export async function updateFirestoreOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
  }
}

export async function updateFirestoreCustomerStatus(
  uid: string,
  status: CustomerStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function saveFirestoreEventConfig(config: EventConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'config', 'event'), config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'config/event');
  }
}

export async function saveFirestoreSiteContent(content: SiteContent): Promise<void> {
  try {
    await setDoc(doc(db, 'config', 'siteContent'), content);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'config/siteContent');
  }
}

export async function createFirestoreProduct(product: ProductItem): Promise<void> {
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
  }
}

export async function deleteFirestoreProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
}
