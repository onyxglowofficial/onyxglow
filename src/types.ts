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

export type CustomerStatus = 'active' | 'suspended';

export interface ProductItem {
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

export interface EventConfig {
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

export interface BrandAssets {
  logoUrl: string;
  heroCoverUrl: string;
  brandIntroUrl: string;
  regionHimalayanUrl: string;
  regionHillyUrl: string;
  regionTeraiUrl: string;
  dhakaMainUrl: string;
  dhakaDetailUrl: string;
}

export interface SiteContent {
  announcementBanner: string;
  heroSubtitle: string;
  heroStatement: string;
  brandIntroHeading: string;
  brandIntroText: string;
  comingSoonText: string;
  instagramUrl: string;
  facebookUrl: string;
  assets: BrandAssets;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchBooking {
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

export interface OrderItem {
  productId: string;
  productName: string;
  category: CollectionCategory;
  size: string;
  color: string;
  quantity: number;
  priceLabel: string;
}

export interface CustomerOrder {
  id: string;
  orderReference: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  type: 'booking_confirmation' | 'admin_notification' | 'verification' | 'password_reset';
  status: 'sent' | 'queued_unconfigured' | 'failed';
  detail: string;
  createdAt: string;
}

export interface AdminBootstrapStatus {
  configuredViaEnv: boolean;
  claimed: boolean;
  emailHint: string | null;
}

export type AppRoute =
  | '/'
  | '/women'
  | '/admin'
  | '/privacy-policy'
  | '/terms'
  | '/event-booking-policy';
