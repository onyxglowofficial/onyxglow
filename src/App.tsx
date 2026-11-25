import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AccountModal } from './components/AccountModal';
import { AdminDashboard } from './components/AdminDashboard';
import {
  BrandIntroductionSection,
  BrandPhilosophySection,
  ComingSoonSection,
  ContactSection,
  DhakaTextileSection,
  NepalHeritageSection,
  PartnershipSection,
} from './components/EditorialSections';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { LaunchEventSection } from './components/LaunchEventSection';
import { LegalPage } from './components/LegalPages';
import { Navbar } from './components/Navbar';
import { BagDrawer, SearchDrawer, type BagSelection } from './components/Overlays';
import { WomenCollectionSection } from './components/WomenCollectionSection';
import { fetchStorefront } from './lib/api';
import {
  auth,
  fetchFirestoreStorefront,
  fetchUserBookingsAndOrders,
  firebaseSignOut,
  isAuthFlowBusy,
  syncFirebaseUserToFirestore,
  testFirestoreConnection,
} from './lib/firebase';
import type {
  AppRoute,
  CustomerOrder,
  CustomerProfile,
  EventConfig,
  LaunchBooking,
  ProductItem,
  SiteContent,
} from './types';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-[#F5F0E8] flex items-center justify-center p-6 text-center">
          <div className="max-w-md border border-[#B69A5A]/40 p-8 space-y-4">
            <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">ONYX GLOW</p>
            <h1 className="font-serif-editorial text-3xl text-[#FFFFFF]">
              Unable to Display View
            </h1>
            <p className="text-xs text-[#D8C9A5]/80">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.22em] uppercase font-medium cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveAssetUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/assets/') || url.startsWith('/src/assets/')) {
    const base = import.meta.env.BASE_URL || './';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${url.slice(1)}`;
  }
  return url;
}

function normalizeContentAssets(content: SiteContent): SiteContent {
  return {
    ...content,
    assets: {
      logoUrl: resolveAssetUrl(content.assets.logoUrl),
      heroCoverUrl: resolveAssetUrl(content.assets.heroCoverUrl),
      brandIntroUrl: resolveAssetUrl(content.assets.brandIntroUrl),
      regionHimalayanUrl: resolveAssetUrl(content.assets.regionHimalayanUrl),
      regionHillyUrl: resolveAssetUrl(content.assets.regionHillyUrl),
      regionTeraiUrl: resolveAssetUrl(content.assets.regionTeraiUrl),
      dhakaMainUrl: resolveAssetUrl(content.assets.dhakaMainUrl),
      dhakaDetailUrl: resolveAssetUrl(content.assets.dhakaDetailUrl),
    },
  };
}

function shouldUseHashRouting(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname.endsWith('.github.io')) return true;
  if (window.location.hash.startsWith('#/')) return true;
  const base = import.meta.env.BASE_URL || '/';
  return base !== '/' && base !== './';
}

function parseRoute(pathname: string, hash: string): AppRoute {
  const hashPath = hash.startsWith('#/') ? hash.slice(1) : '';
  const target = hashPath || pathname;
  if (target.endsWith('/women')) return '/women';
  if (target.endsWith('/admin')) return '/admin';
  if (target.endsWith('/privacy-policy')) return '/privacy-policy';
  if (target.endsWith('/terms')) return '/terms';
  if (target.endsWith('/event-booking-policy')) return '/event-booking-policy';
  return '/';
}

const FALLBACK_CONTENT: SiteContent = normalizeContentAssets({
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
});

const FALLBACK_EVENT: EventConfig = {
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

const FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: 'sample-dhaka-01',
    name: 'Sample Placeholder — Dhaka Heritage Coat',
    category: 'Dhaka Collection',
    description:
      'Sample architectural outerwear silhouette designed to showcase handwoven Nepali Dhaka geometric borders. Replace with finalized garment copy and photography via Admin Dashboard.',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Obsidian Black', 'Antique Gold Trim'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample-ethnic-02',
    name: 'Sample Placeholder — Contemporary Ethnic Drape',
    category: 'Contemporary Ethnic Wear',
    description:
      "Sample modern women's draped silhouette celebrating regional Nepali texture and artisanal tailoring. Awaiting final product specifications.",
    sizes: ['S', 'M', 'L'],
    colors: ['Warm Ivory', 'Champagne'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample-kurta-03',
    name: 'Sample Placeholder — Tailored Dhaka Kurta Set',
    category: 'Kurta Sets',
    description:
      'Sample two-piece contemporary kurta ensemble featuring structured cuffs and traditional Palpali-inspired motifs. Product details to be updated before launch.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Deep Black', 'Warm Ivory'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample-tops-04',
    name: 'Sample Placeholder — Woven Accent Blouse & Pleated Skirt',
    category: 'Tops and Skirts',
    description:
      'Sample modern separates pairing crisp contemporary proportions with authentic Nepali textile accents. Final pricing and inventory pending.',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Champagne', 'Obsidian'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample-signature-05',
    name: 'Sample Placeholder — Signature Himalayan Evening Gown',
    category: 'Signature Collection',
    description:
      "Sample flagship couture silhouette representing ONYX GLOW's inaugural Nepal heritage vision. Official garment imagery and release details forthcoming.",
    sizes: ['S', 'M', 'L'],
    colors: ['Deep Black', 'Antique Gold'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseRoute(window.location.pathname, window.location.hash),
  );
  const [siteContent, setSiteContent] = useState<SiteContent>(FALLBACK_CONTENT);
  const [eventConfig, setEventConfig] = useState<EventConfig>(FALLBACK_EVENT);
  const [products, setProducts] = useState<ProductItem[]>(FALLBACK_PRODUCTS);
  const [loadingStore, setLoadingStore] = useState(true);

  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);
  const [userBookings, setUserBookings] = useState<LaunchBooking[]>([]);
  const [userOrders, setUserOrders] = useState<CustomerOrder[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'booking' | 'checkout' | null>(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagCheckoutMode, setBagCheckoutMode] = useState(false);
  const [bagItems, setBagItems] = useState<BagSelection[]>([]);

  const loadStorefront = useCallback(async () => {
    try {
      const [serverData, firestoreData] = await Promise.all([
        fetchStorefront().catch(() => null),
        fetchFirestoreStorefront().catch(() => ({
          products: null,
          eventConfig: null,
          siteContent: null,
        })),
      ]);

      if (firestoreData.siteContent) {
        setSiteContent(normalizeContentAssets(firestoreData.siteContent));
      } else if (serverData?.siteContent) {
        setSiteContent(normalizeContentAssets(serverData.siteContent));
      }

      if (firestoreData.eventConfig) {
        setEventConfig(firestoreData.eventConfig);
      } else if (serverData?.eventConfig) {
        setEventConfig(serverData.eventConfig);
      }

      const rawProducts =
        firestoreData.products && firestoreData.products.length > 0
          ? firestoreData.products
          : serverData?.products && serverData.products.length > 0
            ? serverData.products
            : FALLBACK_PRODUCTS;

      setProducts(
        rawProducts.map((item) => ({
          ...item,
          imageUrl: resolveAssetUrl(item.imageUrl),
        })),
      );
    } finally {
      setLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    loadStorefront();
  }, [loadStorefront]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setUserBookings([]);
        setUserOrders([]);
        return;
      }

      if (isAuthFlowBusy()) {
        return;
      }

      try {
        const profile = await syncFirebaseUserToFirestore(fbUser);
        setCurrentUser(profile);
        const history = await fetchUserBookingsAndOrders(fbUser.uid);
        setUserBookings(history.bookings);
        setUserOrders(history.orders);
      } catch {
        setCurrentUser({
          id: fbUser.uid,
          uid: fbUser.uid,
          fullName: fbUser.displayName || 'ONYX GLOW Client',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          emailVerified: fbUser.emailVerified,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onRouteChange = () => {
      setRoute(parseRoute(window.location.pathname, window.location.hash));
    };
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, sectionId?: string) => {
    if (shouldUseHashRouting()) {
      const nextHash = `#${nextRoute}`;
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    } else if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    setRoute(nextRoute);

    if (sectionId) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 60);
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleAddToBag = (product: ProductItem, size: string, color: string) => {
    setBagItems((prev) => [
      ...prev,
      {
        id: `${product.id}-${size}-${color}-${Date.now()}`,
        product,
        size,
        color,
        quantity: 1,
      },
    ]);
    setBagCheckoutMode(false);
    setBagOpen(true);
  };

  const handleBuyNow = (product: ProductItem, size: string, color: string) => {
    setBagItems((prev) => [
      ...prev,
      {
        id: `${product.id}-${size}-${color}-${Date.now()}`,
        product,
        size,
        color,
        quantity: 1,
      },
    ]);
    if (!currentUser) {
      setAuthPrompt('Please sign in or create an account before buying a product.');
      setPendingAction('checkout');
      setAccountOpen(true);
    } else {
      setBagCheckoutMode(true);
      setBagOpen(true);
    }
  };

  const handleRequireAuthForBooking = (reason: string) => {
    setAuthPrompt(reason);
    setPendingAction('booking');
    setAccountOpen(true);
  };

  const handleRequireAuthForCheckout = (reason: string) => {
    setBagOpen(false);
    setAuthPrompt(reason);
    setPendingAction('checkout');
    setAccountOpen(true);
  };

  const handleAuthSuccess = async (profile: CustomerProfile) => {
    setCurrentUser(profile);
    if (profile.uid) {
      try {
        const history = await fetchUserBookingsAndOrders(profile.uid);
        setUserBookings(history.bookings);
        setUserOrders(history.orders);
      } catch {
        // Ignore if rules are pending deployment
      }
    }

    if (pendingAction === 'booking') {
      setPendingAction(null);
      setAuthPrompt(null);
      setAccountOpen(false);
      setBookingModalOpen(true);
    } else if (pendingAction === 'checkout') {
      setPendingAction(null);
      setAuthPrompt(null);
      setAccountOpen(false);
      setBagCheckoutMode(true);
      setBagOpen(true);
    }
  };

  const handleLogout = async () => {
    await firebaseSignOut();
    setCurrentUser(null);
    setUserBookings([]);
    setUserOrders([]);
  };

  if (route === '/admin') {
    return (
      <AppErrorBoundary>
        <AdminDashboard
          onBackToSite={() => navigate('/')}
          onStorefrontUpdated={loadStorefront}
        />
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#080808] text-[#F5F0E8]">
        <Navbar
          logoUrl={siteContent.assets.logoUrl}
          currentRoute={route}
          bagCount={bagItems.length}
          isSignedIn={Boolean(currentUser)}
          onNavigate={navigate}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAccount={() => {
            setAuthPrompt(null);
            setPendingAction(null);
            setAccountOpen(true);
          }}
          onOpenBag={() => {
            setBagCheckoutMode(false);
            setBagOpen(true);
          }}
        />

        {route === '/' && (
          <main className="flex-1">
            <HeroSection
              coverUrl={siteContent.assets.heroCoverUrl}
              subtitle={siteContent.heroSubtitle}
              statement={siteContent.heroStatement}
              onDiscoverStory={() => navigate('/', 'our-story')}
            />

            <BrandIntroductionSection siteContent={siteContent} />
            <NepalHeritageSection siteContent={siteContent} />
            <DhakaTextileSection siteContent={siteContent} />
            <BrandPhilosophySection />

            {!loadingStore && (
              <WomenCollectionSection
                products={products}
                onViewAllWomen={() => navigate('/women')}
                onAddToBag={handleAddToBag}
                onBuyNow={handleBuyNow}
              />
            )}

            <PartnershipSection />

            <LaunchEventSection
              eventConfig={eventConfig}
              currentUser={currentUser}
              modalOpen={bookingModalOpen}
              onSetModalOpen={setBookingModalOpen}
              onRequireAuth={handleRequireAuthForBooking}
              onBookingCreated={(booking) => setUserBookings((prev) => [booking, ...prev])}
              onNavigate={navigate}
            />

            <ContactSection siteContent={siteContent} />
            <ComingSoonSection siteContent={siteContent} />
          </main>
        )}

        {route === '/women' && (
          <main className="flex-1">
            <WomenCollectionSection
              products={products}
              isFullPage
              onAddToBag={handleAddToBag}
              onBuyNow={handleBuyNow}
            />
          </main>
        )}

        {(route === '/privacy-policy' ||
          route === '/terms' ||
          route === '/event-booking-policy') && (
          <LegalPage page={route} onBack={() => navigate('/')} />
        )}

        <Footer
          logoUrl={siteContent.assets.logoUrl}
          instagramUrl={siteContent.instagramUrl}
          facebookUrl={siteContent.facebookUrl}
          onNavigate={navigate}
          onOpenAccount={() => {
            setAuthPrompt(null);
            setPendingAction(null);
            setAccountOpen(true);
          }}
        />

        <SearchDrawer
          open={searchOpen}
          products={products}
          onClose={() => setSearchOpen(false)}
          onNavigate={navigate}
        />

        <BagDrawer
          open={bagOpen}
          items={bagItems}
          currentUser={currentUser}
          checkoutMode={bagCheckoutMode}
          onSetCheckoutMode={setBagCheckoutMode}
          onClose={() => setBagOpen(false)}
          onRemove={(id) => setBagItems((prev) => prev.filter((item) => item.id !== id))}
          onClearBag={() => setBagItems([])}
          onExploreWomen={() => navigate('/women')}
          onRequireAuth={handleRequireAuthForCheckout}
          onOrderCreated={(order) => setUserOrders((prev) => [order, ...prev])}
        />

        <AccountModal
          open={accountOpen}
          user={currentUser}
          bookings={userBookings}
          orders={userOrders}
          promptMessage={authPrompt}
          onClose={() => {
            setAccountOpen(false);
            setAuthPrompt(null);
            setPendingAction(null);
          }}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      </div>
    </AppErrorBoundary>
  );
}
