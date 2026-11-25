import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type CollectionCategory =
  | 'Dhaka Collection'
  | 'Contemporary Ethnic Wear'
  | 'Kurta Sets'
  | 'Tops and Skirts'
  | 'Signature Collection';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Attended';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface StoredOrderItem {
  productId: string;
  productName: string;
  category: CollectionCategory;
  size: string;
  color: string;
  quantity: number;
  priceLabel: string;
}

export interface StoredOrder {
  id: string;
  orderReference: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string;
  items: StoredOrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  emailVerified: boolean;
  verificationToken: string;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccount {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  claimedAt: string;
}

export interface StoredBooking {
  id: string;
  referenceNumber: string;
  fullName: string;
  email: string;
  phone: string;
  guests: number;
  attendanceConfirmed: boolean;
  message: string;
  privacyConsent: boolean;
  userId: string | null;
  status: BookingStatus;
  emailNotificationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredProduct {
  id: string;
  name: string;
  category: CollectionCategory;
  description: string;
  sizes: string[];
  colors: string[];
  priceLabel: string;
  availability: string;
  imageUrl: string;
  isPlaceholder: boolean;
  createdAt: string;
}

export interface StoredEventConfig {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  guestCapacity: number | null;
  ticketPrice: string;
  bookingEnabled: boolean;
  updatedAt: string;
}

export interface StoredSiteContent {
  announcementBanner: string;
  heroSubtitle: string;
  heroStatement: string;
  brandIntroHeading: string;
  brandIntroText: string;
  comingSoonText: string;
  instagramUrl: string;
  facebookUrl: string;
  assets: {
    logoUrl: string;
    heroCoverUrl: string;
    brandIntroUrl: string;
    regionHimalayanUrl: string;
    regionHillyUrl: string;
    regionTeraiUrl: string;
    dhakaMainUrl: string;
    dhakaDetailUrl: string;
  };
  updatedAt: string;
}

export interface StoredEmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'booking_confirmation' | 'admin_notification' | 'verification' | 'password_reset';
  status: 'sent' | 'queued_unconfigured' | 'failed';
  detail: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  adminAccount: AdminAccount | null;
  bookings: StoredBooking[];
  orders: StoredOrder[];
  eventConfig: StoredEventConfig;
  siteContent: StoredSiteContent;
  products: StoredProduct[];
  emailLogs: StoredEmailLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
export const UPLOAD_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'onyx-glow-db.json');

const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

export function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SESSION_SECRET;
}

const DEFAULT_PRODUCTS: StoredProduct[] = [
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
      'Sample modern women\'s draped silhouette celebrating regional Nepali texture and artisanal tailoring. Awaiting final product specifications.',
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
      'Sample flagship couture silhouette representing ONYX GLOW\'s inaugural Nepal heritage vision. Official garment imagery and release details forthcoming.',
    sizes: ['S', 'M', 'L'],
    colors: ['Deep Black', 'Antique Gold'],
    priceLabel: 'Price Pending Official Release',
    availability: 'Sample Placeholder',
    imageUrl: '',
    isPlaceholder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function createDefaultState(): DatabaseState {
  const now = new Date().toISOString();
  return {
    users: [],
    adminAccount: null,
    bookings: [],
    orders: [],
    eventConfig: {
      title: 'ONYX GLOW — Inaugural Heritage Presentation',
      description:
        "An expression of Nepali heritage, a new vision of women's fashion and the beginning of something special. Join us as ONYX GLOW introduces its identity to the world.",
      date: '',
      time: '',
      venue: '',
      guestCapacity: null,
      ticketPrice: '',
      bookingEnabled: true,
      updatedAt: now,
    },
    siteContent: {
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
      updatedAt: now,
    },
    products: DEFAULT_PRODUCTS,
    emailLogs: [],
  };
}

function ensureStorageDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function loadDatabase(): DatabaseState {
  ensureStorageDirs();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createDefaultState();
    saveDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    const defaults = createDefaultState();
    const loadedAssets = {
      ...defaults.siteContent.assets,
      ...(parsed.siteContent?.assets ?? {}),
    };
    let migrated = false;
    if (!loadedAssets.logoUrl) {
      loadedAssets.logoUrl = defaults.siteContent.assets.logoUrl;
      migrated = true;
    }
    if (loadedAssets.heroCoverUrl === '/src/assets/images/hero_onyx_campaign_1795538164225.jpg') {
      loadedAssets.heroCoverUrl = defaults.siteContent.assets.heroCoverUrl;
      migrated = true;
    }
    const nextState: DatabaseState = {
      users: Array.isArray(parsed.users) ? parsed.users : defaults.users,
      adminAccount: parsed.adminAccount ?? defaults.adminAccount,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : defaults.bookings,
      orders: Array.isArray(parsed.orders) ? parsed.orders : defaults.orders,
      eventConfig: { ...defaults.eventConfig, ...(parsed.eventConfig ?? {}) },
      siteContent: {
        ...defaults.siteContent,
        ...(parsed.siteContent ?? {}),
        assets: loadedAssets,
      },
      products: Array.isArray(parsed.products) ? parsed.products : defaults.products,
      emailLogs: Array.isArray(parsed.emailLogs) ? parsed.emailLogs : defaults.emailLogs,
    };
    if (migrated) {
      saveDatabase(nextState);
    }
    return nextState;
  } catch {
    const fallback = createDefaultState();
    saveDatabase(fallback);
    return fallback;
  }
}

export function saveDatabase(state: DatabaseState): void {
  ensureStorageDirs();
  const tmpFile = `${DB_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const derived = crypto.scryptSync(password, storedSalt, 64);
  const target = Buffer.from(storedHash, 'hex');
  if (derived.length !== target.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, target);
}

export function verifyPlainSecret(input: string, configuredSecret: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(configuredSecret).digest();
  return crypto.timingSafeEqual(a, b);
}

export interface SessionPayload {
  sub: string;
  role: 'customer' | 'admin';
  email: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlHours = 24): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.sub || !parsed.role || !parsed.email || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function generateBookingReference(existingRefs: Set<string>): string {
  const year = new Date().getFullYear();
  for (let i = 0; i < 12; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `OG-${year}-${suffix}`;
    if (!existingRefs.has(candidate)) {
      return candidate;
    }
  }
  return `OG-${year}-${Date.now().toString(36).toUpperCase()}`;
}

export function generateOrderReference(existingRefs: Set<string>): string {
  const year = new Date().getFullYear();
  for (let i = 0; i < 12; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `ORD-${year}-${suffix}`;
    if (!existingRefs.has(candidate)) {
      return candidate;
    }
  }
  return `ORD-${year}-${Date.now().toString(36).toUpperCase()}`;
}
