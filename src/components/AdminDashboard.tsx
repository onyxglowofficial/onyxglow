import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  EyeOff,
  FileText,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  claimAdminAccount,
  createAdminBooking,
  createAdminProduct,
  deleteAdminBooking,
  deleteAdminProduct,
  downloadBookingsCsv,
  downloadOrdersCsv,
  fetchAdminBootstrapStatus,
  fetchAdminOverview,
  getAdminToken,
  loginAdmin,
  saveAdminEventConfig,
  saveAdminSiteContent,
  setAdminToken,
  updateAdminOrderStatus,
  updateBookingStatus,
  updateCustomerStatus,
  uploadBrandAsset,
} from '../lib/api';
import {
  auth,
  createFirestoreAdminBooking,
  createFirestoreProduct,
  deleteFirestoreBooking,
  deleteFirestoreProduct,
  fetchFirestoreAdminRecords,
  fetchFirestoreStorefront,
  firebaseResendVerification,
  firebaseSignInAdminAuth,
  firebaseSignInAdminStrict,
  firebaseSignInAdminWithGoogleStrict,
  firebaseSignInWithGoogle,
  firebaseSignOut,
  refreshFirebaseUserStatus,
  saveFirestoreEventConfig,
  saveFirestoreSiteContent,
  updateFirestoreBookingStatus,
  updateFirestoreCustomerStatus,
  updateFirestoreOrderStatus,
} from '../lib/firebase';
import { FIRESTORE_RULES_SNIPPET } from '../lib/rulesSnippet';
import type {
  AdminBootstrapStatus,
  BookingStatus,
  CollectionCategory,
  CustomerOrder,
  CustomerProfile,
  EmailLogEntry,
  EventConfig,
  LaunchBooking,
  OrderStatus,
  ProductItem,
  SiteContent,
} from '../types';

type AdminTab = 'bookings' | 'orders' | 'event' | 'customers' | 'cms' | 'setup';

interface AdminDashboardProps {
  onBackToSite: () => void;
  onStorefrontUpdated: () => void;
}

const AUTHORIZED_ADMIN_EMAIL = 'onyxglow@gmail.com';

const STATIC_DEFAULT_EVENT: EventConfig = {
  title: 'ONYX GLOW — Inaugural Heritage Presentation',
  description:
    "An expression of Nepali heritage, a new vision of women's fashion and the beginning of something special. Join us as ONYX GLOW introduces its identity to the world.",
  date: '',
  time: '',
  venue: '',
  guestCapacity: null,
  ticketPrice: '',
  bookingEnabled: true,
  updatedAt: '',
};

const STATIC_DEFAULT_CONTENT: SiteContent = {
  announcementBanner: 'INAUGURAL COLLECTION — PROUDLY MADE IN NEPAL',
  heroSubtitle: 'THE ART OF NEPALI HERITAGE',
  heroStatement: "Where traditional Nepali texture meets contemporary women's fashion.",
  brandIntroHeading: 'MORE THAN FASHION. A CULTURAL IDENTITY.',
  brandIntroText:
    "Born from the beauty of Nepal, ONYX GLOW brings traditional craftsmanship and contemporary women's fashion together. Our identity is deeply connected to Nepali culture, textile heritage and the unique artistry of Dhaka fabric.",
  comingSoonText: 'Rooted in heritage. Created for the future.',
  instagramUrl: '',
  facebookUrl: '',
  assets: {
    logoUrl: '/assets/aistudio/WhatsApp_Image_2026-11-24_at_10.31.25_PM_22f58e84.jpeg',
    heroCoverUrl: '/assets/aistudio/ChatGPT_Image_Nov_24__2026__10_22_54_PM_067f61a5.png',
    brandIntroUrl: '/src/assets/images/brand_intro_editorial_1795538164962.jpg',
    regionHimalayanUrl: '/src/assets/images/region_himalayan_1795538165119.jpg',
    regionHillyUrl: '/src/assets/images/region_hilly_1795538165933.jpg',
    regionTeraiUrl: '/src/assets/images/region_terai_1795538166750.jpg',
    dhakaMainUrl: '/src/assets/images/dhaka_textile_macro_1795538166727.jpg',
    dhakaDetailUrl: '/src/assets/images/brand_intro_editorial_1795538164962.jpg',
  },
  updatedAt: '',
};

function downloadClientCsv(filename: string, headers: string[], rows: string[][]): void {
  const escapeCell = (value: string) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
    '\n',
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function AdminDashboard({ onBackToSite, onStorefrontUpdated }: AdminDashboardProps) {
  const [bootstrap, setBootstrap] = useState<AdminBootstrapStatus | null>(null);
  const [staticFirebaseMode, setStaticFirebaseMode] = useState(false);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('bookings');

  const [emailInput, setEmailInput] = useState('onyxglow@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [bookings, setBookings] = useState<LaunchBooking[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [eventForm, setEventForm] = useState<EventConfig | null>(null);
  const [contentForm, setContentForm] = useState<SiteContent | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);

  const [firebaseAdminConnected, setFirebaseAdminConnected] = useState(Boolean(auth.currentUser));
  const [firebaseEmailVerified, setFirebaseEmailVerified] = useState(
    Boolean(auth.currentUser?.emailVerified),
  );
  const [firebaseSyncNote, setFirebaseSyncNote] = useState('');

  // Filters
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [customerSearch, setCustomerSearch] = useState('');

  // Admin Add New Booking Form
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [newBkgName, setNewBkgName] = useState('');
  const [newBkgEmail, setNewBkgEmail] = useState('');
  const [newBkgPhone, setNewBkgPhone] = useState('');
  const [newBkgGuests, setNewBkgGuests] = useState(1);
  const [newBkgStatus, setNewBkgStatus] = useState<BookingStatus>('Confirmed');
  const [newBkgMessage, setNewBkgMessage] = useState('');

  // Add Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<CollectionCategory>('Dhaka Collection');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('Price Pending Official Release');
  const [newProdAvail, setNewProdAvail] = useState('Sample Placeholder');
  const [newProdSizes, setNewProdSizes] = useState('XS, S, M, L');
  const [newProdColors, setNewProdColors] = useState('Obsidian Black, Warm Ivory');
  const [newProdImage, setNewProdImage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOverview = async (forceStatic = staticFirebaseMode) => {
    let serverData: Awaited<ReturnType<typeof fetchAdminOverview>> | null = null;

    if (!forceStatic) {
      try {
        serverData = await fetchAdminOverview();
      } catch {
        setStaticFirebaseMode(true);
        forceStatic = true;
      }
    }

    if (serverData && !forceStatic) {
      setEventForm(serverData.eventConfig);
      setContentForm(serverData.siteContent);
      setProducts(serverData.products);
      setEmailLogs(serverData.emailLogs);
      setEmailConfigured(serverData.emailConfigured);

      let mergedBookings = [...serverData.bookings];
      let mergedOrders = [...(serverData.orders || [])];
      let mergedCustomers = [...serverData.customers];

      if (auth.currentUser) {
        setFirebaseAdminConnected(true);
        setFirebaseEmailVerified(auth.currentUser.emailVerified);
        try {
          const fbData = await fetchFirestoreAdminRecords();

          const fbBookingRefs = new Set(fbData.bookings.map((b) => b.referenceNumber));
          mergedBookings = [
            ...fbData.bookings,
            ...serverData.bookings.filter((b) => !fbBookingRefs.has(b.referenceNumber)),
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          const fbOrderRefs = new Set(fbData.orders.map((o) => o.orderReference));
          mergedOrders = [
            ...fbData.orders,
            ...(serverData.orders || []).filter((o) => !fbOrderRefs.has(o.orderReference)),
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          const fbCustEmails = new Set(fbData.customers.map((c) => c.email));
          mergedCustomers = [
            ...fbData.customers,
            ...serverData.customers.filter((c) => !fbCustEmails.has(c.email)),
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          setFirebaseSyncNote('');
        } catch (err) {
          setFirebaseSyncNote(
            err instanceof Error
              ? err.message
              : 'Verify your Firebase admin email (onyxglow@gmail.com) and publish firestore.rules to sync live Firestore records.',
          );
        }
      } else {
        setFirebaseAdminConnected(false);
        setFirebaseEmailVerified(false);
      }

      setBookings(mergedBookings);
      setOrders(mergedOrders);
      setCustomers(mergedCustomers);
      return;
    }

    // Static / Firebase-only host mode (e.g., GitHub Pages)
    const fbStorefront = await fetchFirestoreStorefront().catch(() => ({
      products: null,
      eventConfig: null,
      siteContent: null,
    }));
    setEventForm(fbStorefront.eventConfig || STATIC_DEFAULT_EVENT);
    setContentForm(fbStorefront.siteContent || STATIC_DEFAULT_CONTENT);
    setProducts(fbStorefront.products || []);
    setEmailLogs([]);
    setEmailConfigured(false);

    if (auth.currentUser) {
      setFirebaseAdminConnected(true);
      setFirebaseEmailVerified(auth.currentUser.emailVerified);
      try {
        const fbData = await fetchFirestoreAdminRecords();
        setBookings(fbData.bookings);
        setOrders(fbData.orders);
        setCustomers(fbData.customers);
        setFirebaseSyncNote('');
      } catch (err) {
        setBookings([]);
        setOrders([]);
        setCustomers([]);
        setFirebaseSyncNote(
          err instanceof Error
            ? err.message
            : 'Verify onyxglow@gmail.com and publish firestore.rules in Firebase Console to manage records.',
        );
      }
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await fetchAdminBootstrapStatus();
        if (!active) return;
        setBootstrap(status);
        setStaticFirebaseMode(false);
        if (status.emailHint) {
          setEmailInput(status.emailHint);
        }
        if (getAdminToken()) {
          await loadOverview(false);
          if (active) setAuthedEmail(status.emailHint || AUTHORIZED_ADMIN_EMAIL);
        }
      } catch {
        if (!active) return;
        setAdminToken(null);
        setStaticFirebaseMode(true);
        setBootstrap({
          configuredViaEnv: true,
          claimed: true,
          emailHint: AUTHORIZED_ADMIN_EMAIL,
        });
        if (auth.currentUser?.email?.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
          await loadOverview(true);
          if (active) setAuthedEmail(AUTHORIZED_ADMIN_EMAIL);
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const normalizedEmail = emailInput.trim().toLowerCase();
      if (normalizedEmail !== AUTHORIZED_ADMIN_EMAIL) {
        throw new Error(`Access is restricted strictly to ${AUTHORIZED_ADMIN_EMAIL}.`);
      }

      if (staticFirebaseMode) {
        const fbAdmin = await firebaseSignInAdminStrict(normalizedEmail, passwordInput);
        setPasswordInput('');
        setAuthedEmail(fbAdmin.email);
        await loadOverview(true);
        return;
      }

      try {
        const isFirstRunClaim = bootstrap && !bootstrap.configuredViaEnv && !bootstrap.claimed;
        const res = isFirstRunClaim
          ? await claimAdminAccount({ email: normalizedEmail, password: passwordInput })
          : await loginAdmin({ email: normalizedEmail, password: passwordInput });

        setAdminToken(res.token);
        setAuthedEmail(res.adminEmail);
        await firebaseSignInAdminAuth(normalizedEmail, passwordInput);
        setPasswordInput('');
        await loadOverview(false);
        setBootstrap(await fetchAdminBootstrapStatus());
      } catch (serverErr) {
        const msg = serverErr instanceof Error ? serverErr.message : '';
        // If backend /api/* returned 404 or non-JSON (static hosting), authenticate directly via Firebase Auth
        if (msg.includes('404') || msg.includes('Failed to fetch')) {
          setStaticFirebaseMode(true);
          const fbAdmin = await firebaseSignInAdminStrict(normalizedEmail, passwordInput);
          setPasswordInput('');
          setAuthedEmail(fbAdmin.email);
          await loadOverview(true);
        } else {
          throw serverErr;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const fbAdmin = await firebaseSignInAdminWithGoogleStrict();
      setAuthedEmail(fbAdmin.email);
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google admin sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFirebaseAdmin = async () => {
    setError('');
    try {
      await firebaseSignInAdminWithGoogleStrict();
      await loadOverview();
      setNotice('Connected verified Google Firebase admin session.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Firebase session.');
    }
  };

  const handleSendAdminVerification = async () => {
    setError('');
    try {
      await firebaseResendVerification();
      setNotice('Verification email sent to onyxglow@gmail.com. Open the link, then click Refresh Status.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification email.');
    }
  };

  const handleRefreshFirebaseVerification = async () => {
    setError('');
    try {
      const status = await refreshFirebaseUserStatus();
      setFirebaseEmailVerified(status.emailVerified);
      await loadOverview();
      setNotice(
        status.emailVerified
          ? 'Firebase admin email verified and live Firestore sync active.'
          : 'Email not verified yet — please check your inbox or use Verify via Google Sign-In.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    }
  };

  const handleSignOut = async () => {
    setAdminToken(null);
    setAuthedEmail(null);
    if (staticFirebaseMode) {
      await firebaseSignOut().catch(() => undefined);
    }
  };

  const handleCreateAdminBooking = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (newBkgName.trim().length < 2) {
      setError('Please enter guest full name (2–100 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBkgEmail.trim())) {
      setError('Please enter a valid guest email address.');
      return;
    }
    if (!/^[+\d\s\-()]{6,30}$/.test(newBkgPhone.trim())) {
      setError('Please enter a valid guest phone or WhatsApp number.');
      return;
    }

    setLoading(true);
    try {
      let booking: LaunchBooking;

      if (staticFirebaseMode) {
        booking = await createFirestoreAdminBooking({
          fullName: newBkgName.trim(),
          email: newBkgEmail.trim(),
          phone: newBkgPhone.trim(),
          guests: newBkgGuests,
          status: newBkgStatus,
          message: newBkgMessage.trim(),
        });
      } else {
        const res = await createAdminBooking({
          fullName: newBkgName.trim(),
          email: newBkgEmail.trim(),
          phone: newBkgPhone.trim(),
          guests: newBkgGuests,
          status: newBkgStatus,
          message: newBkgMessage.trim(),
        });
        booking = res.booking;

        if (auth.currentUser && auth.currentUser.emailVerified) {
          try {
            await createFirestoreAdminBooking({
              id: booking.id,
              referenceNumber: booking.referenceNumber,
              fullName: booking.fullName,
              email: booking.email,
              phone: booking.phone,
              guests: booking.guests,
              status: booking.status,
              message: booking.message,
            });
          } catch {
            // Best-effort Firestore mirror
          }
        }
      }

      setBookings((prev) => [booking, ...prev]);
      setNewBkgName('');
      setNewBkgEmail('');
      setNewBkgPhone('');
      setNewBkgGuests(1);
      setNewBkgStatus('Confirmed');
      setNewBkgMessage('');
      setShowAddBooking(false);
      setNotice(`New launch booking ${booking.referenceNumber} created for ${booking.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingStatusChange = async (booking: LaunchBooking, status: BookingStatus) => {
    setError('');
    try {
      let updated = false;
      try {
        await updateBookingStatus(booking.id, status);
        updated = true;
      } catch {
        // Booking may exist only in Firestore
      }
      if (auth.currentUser) {
        try {
          await updateFirestoreBookingStatus(booking.id, status);
          updated = true;
        } catch (fbErr) {
          if (!updated) throw fbErr;
        }
      }
      if (!updated) throw new Error('Unable to update booking status.');

      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)));
      setNotice(`Booking ${booking.referenceNumber} marked as ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update booking status.');
    }
  };

  const handleDeleteBooking = async (booking: LaunchBooking) => {
    setError('');
    try {
      let deleted = false;
      try {
        await deleteAdminBooking(booking.id);
        deleted = true;
      } catch {
        // May exist only in Firestore
      }
      if (auth.currentUser) {
        try {
          await deleteFirestoreBooking(booking.id);
          deleted = true;
        } catch (fbErr) {
          if (!deleted) throw fbErr;
        }
      }
      if (!deleted) throw new Error('Unable to delete booking.');

      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      setNotice(`Booking ${booking.referenceNumber} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete booking.');
    }
  };

  const handleOrderStatusChange = async (order: CustomerOrder, status: OrderStatus) => {
    setError('');
    try {
      let updated = false;
      try {
        await updateAdminOrderStatus(order.id, status);
        updated = true;
      } catch {
        // Order may exist only in Firestore
      }
      if (auth.currentUser) {
        try {
          await updateFirestoreOrderStatus(order.id, status);
          updated = true;
        } catch (fbErr) {
          if (!updated) throw fbErr;
        }
      }
      if (!updated) throw new Error('Unable to update order status.');

      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      setNotice(`Order ${order.orderReference} updated to ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update order status.');
    }
  };

  const handleCustomerToggle = async (customer: CustomerProfile) => {
    setError('');
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    try {
      if (customer.uid && auth.currentUser) {
        await updateFirestoreCustomerStatus(customer.uid, nextStatus);
      } else {
        await updateCustomerStatus(customer.id, nextStatus);
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c)),
      );
      setNotice(`Customer ${customer.email} status set to ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update customer.');
    }
  };

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventForm) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (staticFirebaseMode) {
        const nextConfig: EventConfig = { ...eventForm, updatedAt: new Date().toISOString() };
        await saveFirestoreEventConfig(nextConfig);
        setEventForm(nextConfig);
      } else {
        const res = await saveAdminEventConfig({
          title: eventForm.title,
          description: eventForm.description,
          date: eventForm.date,
          time: eventForm.time,
          venue: eventForm.venue,
          guestCapacity: eventForm.guestCapacity,
          ticketPrice: eventForm.ticketPrice,
          bookingEnabled: eventForm.bookingEnabled,
        });
        setEventForm(res.eventConfig);
        if (auth.currentUser) {
          try {
            await saveFirestoreEventConfig(res.eventConfig);
          } catch {
            // Best-effort Firestore mirror
          }
        }
      }
      onStorefrontUpdated();
      setNotice('Launch event configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async (e: FormEvent) => {
    e.preventDefault();
    if (!contentForm) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (staticFirebaseMode) {
        const nextContent: SiteContent = { ...contentForm, updatedAt: new Date().toISOString() };
        await saveFirestoreSiteContent(nextContent);
        setContentForm(nextContent);
      } else {
        const res = await saveAdminSiteContent(contentForm);
        setContentForm(res.siteContent);
        if (auth.currentUser) {
          try {
            await saveFirestoreSiteContent(res.siteContent);
          } catch {
            // Best-effort Firestore mirror
          }
        }
      }
      onStorefrontUpdated();
      setNotice('Homepage content & brand assets saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update content.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (staticFirebaseMode) {
      setError('Direct image file upload requires the Node backend server.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setError('');
        const dataUrl = String(reader.result || '');
        const res = await uploadBrandAsset(dataUrl);
        onUploaded(res.url);
        setNotice('Image uploaded. Click Save Website Content to publish.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Image upload failed.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const payload = {
        name: newProdName.trim(),
        category: newProdCategory,
        description: newProdDesc.trim(),
        priceLabel: newProdPrice.trim(),
        availability: newProdAvail.trim(),
        sizes: newProdSizes.split(',').map((s) => s.trim()).filter(Boolean),
        colors: newProdColors.split(',').map((c) => c.trim()).filter(Boolean),
        imageUrl: newProdImage,
        isPlaceholder: newProdPrice.toLowerCase().includes('pending'),
      };

      let createdProduct: ProductItem;
      if (staticFirebaseMode) {
        createdProduct = {
          id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        await createFirestoreProduct(createdProduct);
      } else {
        const res = await createAdminProduct(payload);
        createdProduct = res.product;
        if (auth.currentUser) {
          try {
            await createFirestoreProduct(createdProduct);
          } catch {
            // Best-effort Firestore mirror
          }
        }
      }

      setProducts((prev) => [createdProduct, ...prev]);
      setNewProdName('');
      setNewProdDesc('');
      setNewProdImage('');
      onStorefrontUpdated();
      setNotice('Collection entry added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add collection item.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setError('');
    try {
      if (staticFirebaseMode) {
        await deleteFirestoreProduct(id);
      } else {
        await deleteAdminProduct(id);
        if (auth.currentUser) {
          try {
            await deleteFirestoreProduct(id);
          } catch {
            // Best-effort Firestore mirror
          }
        }
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      onStorefrontUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove item.');
    }
  };

  const handleExportBookingsCsv = async () => {
    if (staticFirebaseMode) {
      downloadClientCsv(
        'onyx-glow-launch-bookings.csv',
        ['Reference', 'Full Name', 'Email', 'Phone', 'Guests', 'Status', 'Message', 'Created At'],
        bookings.map((b) => [
          b.referenceNumber,
          b.fullName,
          b.email,
          b.phone,
          String(b.guests),
          b.status,
          b.message || '',
          b.createdAt,
        ]),
      );
      return;
    }
    try {
      await downloadBookingsCsv();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export bookings CSV.');
    }
  };

  const handleExportOrdersCsv = async () => {
    if (staticFirebaseMode) {
      downloadClientCsv(
        'onyx-glow-orders.csv',
        ['Order Reference', 'Customer', 'Email', 'Phone', 'Address', 'Items', 'Status', 'Created At'],
        orders.map((o) => [
          o.orderReference,
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          o.shippingAddress,
          o.items.map((i) => `${i.productName} (${i.size}, ${i.color}) x${i.quantity}`).join('; '),
          o.status,
          o.createdAt,
        ]),
      );
      return;
    }
    try {
      await downloadOrdersCsv();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export orders CSV.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
    const q = bookingSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.fullName.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.referenceNumber.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderReference.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.customerPhone.toLowerCase().includes(q) ||
      o.items.some((item) => item.productName.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    return !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const totalReservedGuests = bookings
    .filter((b) => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.guests, 0);
  const confirmedGuests = bookings
    .filter((b) => b.status === 'Confirmed' || b.status === 'Attended')
    .reduce((sum, b) => sum + b.guests, 0);
  const totalOrderItemsCount = orders.reduce(
    (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Preparing',
  ).length;

  if (!authedEmail) {
    const isClaimMode = Boolean(bootstrap && !bootstrap.configuredViaEnv && !bootstrap.claimed);
    const authorizedAdminEmail = bootstrap?.emailHint || 'onyxglow@gmail.com';
    return (
      <div className="min-h-screen bg-[#080808] text-[#F5F0E8] flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-[#B69A5A]/35 bg-[#0D0D0D] p-8 sm:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] hover:text-[#B69A5A] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
            <Shield className="w-5 h-5 text-[#B69A5A]" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
              Restricted Admin Only
            </p>
            <h1 className="font-serif-editorial text-3xl text-[#FFFFFF]">
              {isClaimMode ? 'INITIALIZE ADMIN ACCESS' : 'ONYX GLOW ADMIN LOGIN'}
            </h1>
            <p className="text-xs text-[#D8C9A5]/75 leading-relaxed">
              {isClaimMode
                ? `First-run setup: sign in as ${authorizedAdminEmail} with your chosen administrator password (minimum 10 characters) to lock admin access.`
                : `Access is restricted strictly to authorized ONYX GLOW administrator (${authorizedAdminEmail}).`}
            </p>
          </div>

          {error && (
            <div className="border border-red-400/50 bg-red-950/40 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                Admin ID (Email)
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={authorizedAdminEmail}
                className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                {isClaimMode ? 'Set Admin Password (min 10 chars)' : 'Admin Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isClaimMode ? 10 : 1}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 pr-11 text-sm text-[#FFFFFF] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736D] hover:text-[#F5F0E8] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#B69A5A] hover:bg-[#D8C9A5] text-[#080808] text-xs tracking-[0.25em] uppercase font-medium cursor-pointer"
            >
              {loading
                ? 'VERIFYING...'
                : isClaimMode
                  ? 'SET PASSWORD & ENTER ADMIN'
                  : 'SIGN IN TO ADMIN CONSOLE'}
            </button>
          </form>

          <div className="pt-2 border-t border-[#F5F0E8]/10">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAdminLogin}
              className="w-full py-3 border border-[#B69A5A]/45 hover:border-[#B69A5A] text-[#D8C9A5] text-[11px] tracking-[0.22em] uppercase cursor-pointer"
            >
              Sign In With Google ({authorizedAdminEmail})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] pt-8 pb-20">
      <div className="max-w-[1380px] mx-auto px-6 sm:px-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#B69A5A]/25">
          <div>
            <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
              ONYX GLOW · House Administration
            </p>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#FFFFFF] mt-1">
              Executive Operations Console
            </h1>
            <p className="text-xs text-[#77736D] mt-1">
              Signed in as {authedEmail} · Firebase Sync:{' '}
              {firebaseAdminConnected
                ? `${auth.currentUser?.email} (${firebaseEmailVerified ? 'Verified' : 'Email Unverified'})`
                : 'Not Connected'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!firebaseAdminConnected && (
              <button
                type="button"
                onClick={handleConnectFirebaseAdmin}
                className="px-4 py-2.5 border border-[#B69A5A] text-[11px] tracking-[0.2em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] cursor-pointer"
              >
                Connect Firebase Admin
              </button>
            )}
            <button
              type="button"
              onClick={onBackToSite}
              className="px-4 py-2.5 border border-[#F5F0E8]/20 text-[11px] tracking-[0.2em] uppercase hover:border-[#B69A5A] cursor-pointer"
            >
              View Website
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#B69A5A]/40 text-[11px] tracking-[0.2em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {(firebaseSyncNote || (firebaseAdminConnected && !firebaseEmailVerified)) && (
          <div className="border border-[#B69A5A]/40 bg-[#B69A5A]/10 px-5 py-4 text-xs text-[#D8C9A5] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[#FFFFFF] font-medium">
                {firebaseSyncNote ||
                  'Firebase admin email verification pending — verify once to sync live Firestore orders and bookings.'}
              </p>
              <p className="text-[#D8C9A5]/75">
                All local server records remain active below. Verify onyxglow@gmail.com or sign in with Google to enable full Firestore cloud sync.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSendAdminVerification}
                className="px-3.5 py-2 border border-[#B69A5A]/60 text-[10px] tracking-[0.18em] uppercase text-[#F5F0E8] hover:border-[#B69A5A] cursor-pointer"
              >
                Send Verification Email
              </button>
              <button
                type="button"
                onClick={handleRefreshFirebaseVerification}
                className="px-3.5 py-2 border border-[#B69A5A]/60 text-[10px] tracking-[0.18em] uppercase text-[#F5F0E8] hover:border-[#B69A5A] cursor-pointer"
              >
                Refresh Status
              </button>
              <button
                type="button"
                onClick={handleConnectFirebaseAdmin}
                className="px-3.5 py-2 bg-[#B69A5A] text-[#080808] text-[10px] tracking-[0.18em] uppercase font-medium cursor-pointer"
              >
                Verify via Google
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'bookings', label: `Launch Bookings (${bookings.length})`, icon: Calendar },
            { id: 'orders', label: `Customer Orders (${orders.length})`, icon: Package },
            { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
            { id: 'event', label: 'Event Settings', icon: Settings },
            { id: 'cms', label: 'Content & Collection', icon: FileText },
            { id: 'setup', label: 'Firebase & Email Setup', icon: Shield },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as AdminTab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.18em] uppercase border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#B69A5A] text-[#080808] border-[#B69A5A] font-medium'
                    : 'bg-[#0D0D0D] text-[#D8C9A5] border-[#F5F0E8]/15 hover:border-[#B69A5A]/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="border border-red-400/50 bg-red-950/40 px-4 py-3 text-xs text-red-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="border border-[#B69A5A]/50 bg-[#B69A5A]/10 px-4 py-3 text-xs text-[#D8C9A5]">
            {notice}
          </div>
        )}

        {/* TAB 1: LAUNCH EVENT BOOKINGS + ADD NEW BOOKING */}
        {tab === 'bookings' && (
          <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">Total Bookings</p>
                <p className="font-serif-editorial text-3xl text-[#FFFFFF] mt-1 tabular-nums">
                  {bookings.length}
                </p>
              </div>
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">Reserved Guests</p>
                <p className="font-serif-editorial text-3xl text-[#B69A5A] mt-1 tabular-nums">
                  {totalReservedGuests}
                </p>
              </div>
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">Confirmed Guests</p>
                <p className="font-serif-editorial text-3xl text-[#FFFFFF] mt-1 tabular-nums">
                  {confirmedGuests}
                </p>
              </div>
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">Pending Review</p>
                <p className="font-serif-editorial text-3xl text-[#D8C9A5] mt-1 tabular-nums">
                  {bookings.filter((b) => b.status === 'Pending').length}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search reference, guest name, email, phone..."
                    className="w-full bg-[#0D0D0D] border border-[#F5F0E8]/20 pl-10 pr-4 py-2.5 text-xs text-[#FFFFFF] outline-none focus:border-[#B69A5A]"
                  />
                </div>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value as 'ALL' | BookingStatus)}
                  className="bg-[#0D0D0D] border border-[#F5F0E8]/20 px-4 py-2.5 text-xs text-[#FFFFFF] outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Attended">Attended</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBooking((v) => !v)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B69A5A] hover:bg-[#D8C9A5] text-[#080808] text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddBooking ? 'Close Booking Form' : 'Add New Booking'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportBookingsCsv}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#B69A5A] text-[11px] tracking-[0.2em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Admin Add New Launch Booking Form */}
            {showAddBooking && (
              <form
                onSubmit={handleCreateAdminBooking}
                className="border border-[#B69A5A]/45 bg-[#0D0D0D] p-6 sm:p-8 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#F5F0E8]/10 pb-3">
                  <div>
                    <p className="text-[10px] tracking-[0.24em] uppercase text-[#B69A5A]">
                      Admin Entry
                    </p>
                    <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
                      Add New Launch Event Booking
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddBooking(false)}
                    aria-label="Close new booking form"
                    className="p-1.5 text-[#77736D] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Guest Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBkgName}
                      onChange={(e) => setNewBkgName(e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newBkgEmail}
                      onChange={(e) => setNewBkgEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newBkgPhone}
                      onChange={(e) => setNewBkgPhone(e.target.value)}
                      placeholder="+977-98XXXXXXXX"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Number of Guests *
                    </label>
                    <select
                      value={newBkgGuests}
                      onChange={(e) => setNewBkgGuests(Number(e.target.value))}
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Initial Status *
                    </label>
                    <select
                      value={newBkgStatus}
                      onChange={(e) => setNewBkgStatus(e.target.value as BookingStatus)}
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Pending">Pending</option>
                      <option value="Attended">Attended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      VIP / Seating Notes
                    </label>
                    <input
                      type="text"
                      value={newBkgMessage}
                      onChange={(e) => setNewBkgMessage(e.target.value)}
                      placeholder="Front row, press, partner guest..."
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-7 py-3 bg-[#B69A5A] hover:bg-[#D8C9A5] disabled:opacity-50 text-[#080808] text-xs tracking-[0.22em] uppercase font-medium cursor-pointer"
                  >
                    {loading ? 'SAVING BOOKING...' : 'CREATE LAUNCH BOOKING'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBooking(false)}
                    className="px-5 py-3 border border-[#F5F0E8]/20 text-xs tracking-[0.18em] uppercase text-[#D8C9A5] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto border border-[#F5F0E8]/15 bg-[#0D0D0D]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F5F0E8]/15 text-[10px] tracking-[0.2em] uppercase text-[#B69A5A]">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Guest</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Party</th>
                    <th className="p-4">Message</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]/10">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#77736D]">
                        No launch event bookings found. Click &ldquo;Add New Booking&rdquo; above to add a guest manually.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F5F0E8]/[0.02]">
                        <td className="p-4 font-medium text-[#B69A5A] tabular-nums whitespace-nowrap">
                          <p>{b.referenceNumber}</p>
                          {b.userId === 'admin-entry' && (
                            <span className="text-[10px] uppercase tracking-wider text-[#77736D]">
                              Admin Added
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-[#FFFFFF] font-medium">{b.fullName}</p>
                          <p className="text-[#77736D] tabular-nums">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <p>{b.email}</p>
                          <p className="text-[#77736D] tabular-nums">{b.phone}</p>
                        </td>
                        <td className="p-4 tabular-nums">{b.guests}</td>
                        <td className="p-4 max-w-xs text-[#D8C9A5]/75">{b.message || '—'}</td>
                        <td className="p-4">
                          <select
                            value={b.status}
                            onChange={(e) =>
                              handleBookingStatusChange(b, e.target.value as BookingStatus)
                            }
                            className="bg-[#080808] border border-[#B69A5A]/40 px-3 py-1.5 text-xs text-[#FFFFFF] outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Attended">Attended</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b)}
                            aria-label={`Delete booking ${b.referenceNumber}`}
                            className="text-[#77736D] hover:text-red-400 p-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER PRODUCT ORDERS & ITEMS */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">Total Orders</p>
                <p className="font-serif-editorial text-3xl text-[#FFFFFF] mt-1 tabular-nums">
                  {orders.length}
                </p>
              </div>
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">
                  Total Items Ordered
                </p>
                <p className="font-serif-editorial text-3xl text-[#B69A5A] mt-1 tabular-nums">
                  {totalOrderItemsCount}
                </p>
              </div>
              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">
                  Active / In Progress
                </p>
                <p className="font-serif-editorial text-3xl text-[#D8C9A5] mt-1 tabular-nums">
                  {pendingOrdersCount}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order ref, customer, email, or item name..."
                    className="w-full bg-[#0D0D0D] border border-[#F5F0E8]/20 pl-10 pr-4 py-2.5 text-xs text-[#FFFFFF] outline-none focus:border-[#B69A5A]"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value as 'ALL' | OrderStatus)}
                  className="bg-[#0D0D0D] border border-[#F5F0E8]/20 px-4 py-2.5 text-xs text-[#FFFFFF] outline-none"
                >
                  <option value="ALL">All Order Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportOrdersCsv}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#B69A5A] text-[11px] tracking-[0.2em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Orders CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#F5F0E8]/15 bg-[#0D0D0D]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F5F0E8]/15 text-[10px] tracking-[0.2em] uppercase text-[#B69A5A]">
                  <tr>
                    <th className="p-4">Order Ref &amp; Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Delivery Details</th>
                    <th className="p-4">Ordered Items</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]/10">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#77736D]">
                        No customer product orders found yet.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="align-top hover:bg-[#F5F0E8]/[0.02]">
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-medium text-[#B69A5A] tabular-nums">
                            {o.orderReference}
                          </p>
                          <p className="text-[#77736D] tabular-nums mt-1">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-[#FFFFFF] font-medium">{o.customerName}</p>
                          <p className="text-[#D8C9A5]/80">{o.customerEmail}</p>
                          <p className="text-[#77736D] tabular-nums">{o.customerPhone}</p>
                        </td>
                        <td className="p-4 max-w-xs text-[#D8C9A5]/80">
                          <p>{o.shippingAddress}</p>
                          {o.notes && <p className="text-[#77736D] mt-1">Note: {o.notes}</p>}
                        </td>
                        <td className="p-4 space-y-2 min-w-[260px]">
                          {o.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="border border-[#F5F0E8]/10 bg-[#080808] px-3 py-2 space-y-0.5"
                            >
                              <p className="text-[#FFFFFF] font-medium">
                                {item.productName} <span className="text-[#B69A5A]">x{item.quantity}</span>
                              </p>
                              <p className="text-[11px] text-[#77736D]">
                                {item.category} · Size {item.size} · {item.color}
                              </p>
                              <p className="text-[11px] text-[#D8C9A5]/75">{item.priceLabel}</p>
                            </div>
                          ))}
                        </td>
                        <td className="p-4">
                          <select
                            value={o.status}
                            onChange={(e) =>
                              handleOrderStatusChange(o, e.target.value as OrderStatus)
                            }
                            className="bg-[#080808] border border-[#B69A5A]/40 px-3 py-1.5 text-xs text-[#FFFFFF] outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer name or email..."
                className="w-full bg-[#0D0D0D] border border-[#F5F0E8]/20 pl-10 pr-4 py-2.5 text-xs text-[#FFFFFF] outline-none focus:border-[#B69A5A]"
              />
            </div>

            <div className="overflow-x-auto border border-[#F5F0E8]/15 bg-[#0D0D0D]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F5F0E8]/15 text-[10px] tracking-[0.2em] uppercase text-[#B69A5A]">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]/10">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#77736D]">
                        No registered customers found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id}>
                        <td className="p-4 text-[#FFFFFF] font-medium">{c.fullName}</td>
                        <td className="p-4">{c.email}</td>
                        <td className="p-4 tabular-nums">{c.phone || '—'}</td>
                        <td className="p-4">{c.emailVerified ? 'Verified' : 'Pending'}</td>
                        <td className="p-4 uppercase tracking-wider">{c.status}</td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleCustomerToggle(c)}
                            className="px-3 py-1.5 border border-[#B69A5A]/40 text-[10px] tracking-[0.18em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] cursor-pointer"
                          >
                            {c.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EVENT SETTINGS */}
        {tab === 'event' && eventForm && (
          <form
            onSubmit={handleSaveEvent}
            className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 sm:p-10 space-y-6 max-w-3xl"
          >
            <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
              Launch Event Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Event Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Event Date
                </label>
                <input
                  type="text"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  placeholder="To Be Announced"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Event Time
                </label>
                <input
                  type="text"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  placeholder="To Be Announced"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Venue
                </label>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  placeholder="Venue location"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Guest Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={eventForm.guestCapacity ?? ''}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      guestCapacity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Ticket Price
                </label>
                <input
                  type="text"
                  value={eventForm.ticketPrice}
                  onChange={(e) => setEventForm({ ...eventForm, ticketPrice: e.target.value })}
                  placeholder="By Invitation / Complimentary"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 text-xs text-[#F5F0E8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventForm.bookingEnabled}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, bookingEnabled: e.target.checked })
                    }
                    className="accent-[#B69A5A]"
                  />
                  <span>Enable launch event booking</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium cursor-pointer"
            >
              Save Event Configuration
            </button>
          </form>
        )}

        {/* TAB 5: CMS & COLLECTION */}
        {tab === 'cms' && contentForm && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleSaveContent}
              className="lg:col-span-7 border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
                Homepage Copy &amp; Original Brand Assets
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                    Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={contentForm.heroSubtitle}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, heroSubtitle: e.target.value })
                    }
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-2.5 text-sm text-[#FFFFFF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                    Hero Statement
                  </label>
                  <input
                    type="text"
                    value={contentForm.heroStatement}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, heroStatement: e.target.value })
                    }
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-2.5 text-sm text-[#FFFFFF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                    Brand Intro Copy
                  </label>
                  <textarea
                    rows={3}
                    value={contentForm.brandIntroText}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, brandIntroText: e.target.value })
                    }
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-2.5 text-sm text-[#FFFFFF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={contentForm.instagramUrl}
                      onChange={(e) =>
                        setContentForm({ ...contentForm, instagramUrl: e.target.value })
                      }
                      placeholder="https://instagram.com/..."
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-2.5 text-sm text-[#FFFFFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={contentForm.facebookUrl}
                      onChange={(e) =>
                        setContentForm({ ...contentForm, facebookUrl: e.target.value })
                      }
                      placeholder="https://facebook.com/..."
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-4 py-2.5 text-sm text-[#FFFFFF]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F5F0E8]/10 space-y-3">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-[#B69A5A]">
                    Upload Original Brand Logo &amp; Photography
                  </p>
                  {(
                    [
                      ['logoUrl', 'Original Brand Logo'],
                      ['heroCoverUrl', 'Hero Campaign Cover'],
                      ['brandIntroUrl', 'Brand Story Portrait'],
                      ['regionHimalayanUrl', 'Himalayan Region Photo'],
                      ['regionHillyUrl', 'Hilly Region Photo'],
                      ['regionTeraiUrl', 'Terai Region Photo'],
                      ['dhakaMainUrl', 'Dhaka Textile Main Photo'],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#F5F0E8]/10 p-3 bg-[#080808]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[#FFFFFF]">{label}</p>
                        <p className="text-[10px] text-[#77736D] truncate">
                          {contentForm.assets[key] || 'Not set'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) =>
                          handleFileUpload(e, (url) =>
                            setContentForm({
                              ...contentForm,
                              assets: { ...contentForm.assets, [key]: url },
                            }),
                          )
                        }
                        className="text-[11px] text-[#D8C9A5] file:mr-3 file:border file:border-[#B69A5A]/40 file:bg-transparent file:px-3 file:py-1 file:text-[10px] file:uppercase file:text-[#B69A5A]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium cursor-pointer"
              >
                Save Website Content
              </button>
            </form>

            <div className="lg:col-span-5 space-y-6">
              <form
                onSubmit={handleAddProduct}
                className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 space-y-4"
              >
                <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
                  Add Women Collection Item
                </h2>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Garment title"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-3.5 py-2.5 text-xs text-[#FFFFFF]"
                />
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value as CollectionCategory)}
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-3.5 py-2.5 text-xs text-[#FFFFFF]"
                >
                  <option value="Dhaka Collection">Dhaka Collection</option>
                  <option value="Contemporary Ethnic Wear">Contemporary Ethnic Wear</option>
                  <option value="Kurta Sets">Kurta Sets</option>
                  <option value="Tops and Skirts">Tops and Skirts</option>
                  <option value="Signature Collection">Signature Collection</option>
                </select>
                <textarea
                  rows={2}
                  required
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Garment description"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-3.5 py-2.5 text-xs text-[#FFFFFF]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="Price label"
                    className="bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2 text-xs text-[#FFFFFF]"
                  />
                  <input
                    type="text"
                    value={newProdAvail}
                    onChange={(e) => setNewProdAvail(e.target.value)}
                    placeholder="Availability"
                    className="bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2 text-xs text-[#FFFFFF]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newProdSizes}
                    onChange={(e) => setNewProdSizes(e.target.value)}
                    placeholder="Sizes (comma separated)"
                    className="bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2 text-xs text-[#FFFFFF]"
                  />
                  <input
                    type="text"
                    value={newProdColors}
                    onChange={(e) => setNewProdColors(e.target.value)}
                    placeholder="Colors (comma separated)"
                    className="bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2 text-xs text-[#FFFFFF]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.18em] uppercase text-[#77736D] mb-1">
                    Garment Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleFileUpload(e, setNewProdImage)}
                    className="text-[11px] text-[#D8C9A5]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.2em] uppercase font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Collection Item</span>
                </button>
              </form>

              <div className="border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 space-y-3">
                <p className="text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                  Current Catalogue ({products.length})
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="border border-[#F5F0E8]/10 bg-[#080808] p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="text-[#FFFFFF] truncate">{p.name}</p>
                        <p className="text-[#77736D]">
                          {p.category} · {p.priceLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        aria-label={`Delete ${p.name}`}
                        className="text-[#77736D] hover:text-red-400 p-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FIREBASE & EMAIL SETUP */}
        {tab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 space-y-4">
              <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
                Firebase Project Checklist (onyx-glow)
              </h2>
              <div className="space-y-3 text-xs">
                <div className="border border-[#F5F0E8]/10 bg-[#080808] p-4 space-y-1">
                  <p className="text-[#B69A5A] uppercase tracking-[0.18em]">
                    1. Enable Authentication Providers
                  </p>
                  <p className="text-[#D8C9A5]/85">
                    In Firebase Console → Authentication → Sign-in method, enable{' '}
                    <strong>Email/Password</strong> and <strong>Google</strong>, and add your app
                    domain under Authentication → Settings → Authorized domains.
                  </p>
                </div>
                <div className="border border-[#F5F0E8]/10 bg-[#080808] p-4 space-y-2.5">
                  <p className="text-[#B69A5A] uppercase tracking-[0.18em]">
                    2. Enable Firestore &amp; Publish Security Rules
                  </p>
                  <p className="text-[#D8C9A5]/85">
                    Create the default Firestore database in project <strong>onyx-glow</strong> and
                    publish the rules from <code>firestore.rules</code> in Firestore → Rules.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(FIRESTORE_RULES_SNIPPET);
                        setNotice('Copied firestore.rules to clipboard.');
                      }}
                      className="px-3.5 py-2 bg-[#B69A5A] text-[#080808] text-[10px] tracking-[0.18em] uppercase font-medium cursor-pointer"
                    >
                      Copy firestore.rules
                    </button>
                    <a
                      href="https://console.firebase.google.com/project/onyx-glow/firestore/rules"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[#D8C9A5]"
                    >
                      Open Firebase Console Rules
                    </a>
                  </div>
                </div>
                <div className="border border-[#F5F0E8]/10 bg-[#080808] p-4 space-y-1">
                  <p className="text-[#B69A5A] uppercase tracking-[0.18em]">
                    3. Transactional Email Service
                  </p>
                  <p className="text-[#FFFFFF]">
                    {emailConfigured
                      ? 'Active — RESEND_API_KEY and EMAIL_FROM configured'
                      : 'Optional — Set RESEND_API_KEY, EMAIL_FROM, and ADMIN_NOTIFICATION_EMAIL in Secrets for automated confirmation emails.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 border border-[#F5F0E8]/15 bg-[#0D0D0D] p-6 space-y-4">
              <h2 className="font-serif-editorial text-2xl text-[#FFFFFF]">
                Recent Server Email Log
              </h2>
              {emailLogs.length === 0 ? (
                <p className="text-xs text-[#77736D]">No server email notifications recorded.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-[#F5F0E8]/10 bg-[#080808] p-3.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[#FFFFFF] font-medium">{log.subject}</span>
                        <span className="uppercase tracking-[0.16em] text-[#B69A5A]">
                          {log.status}
                        </span>
                      </div>
                      <p className="text-[#77736D]">
                        To: {log.to} · {new Date(log.createdAt).toLocaleString()}
                      </p>
                      <p className="text-[#D8C9A5]/70">{log.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
