import type {
  AdminBootstrapStatus,
  BookingStatus,
  CollectionCategory,
  CustomerOrder,
  CustomerProfile,
  CustomerStatus,
  EmailLogEntry,
  EventConfig,
  LaunchBooking,
  OrderItem,
  OrderStatus,
  ProductItem,
  SiteContent,
} from '../types';

let customerToken: string | null = null;
let adminToken: string | null = null;

export function setCustomerToken(token: string | null): void {
  customerToken = token;
}

export function getCustomerToken(): string | null {
  return customerToken;
}

export function setAdminToken(token: string | null): void {
  adminToken = token;
}

export function getAdminToken(): string | null {
  return adminToken;
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof data.error === 'string' && data.error
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchStorefront(): Promise<{
  eventConfig: EventConfig;
  siteContent: SiteContent;
  products: ProductItem[];
  emailConfigured: boolean;
}> {
  return requestJson('/api/public/storefront');
}

export async function registerCustomer(payload: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
}): Promise<{
  token: string;
  user: CustomerProfile;
  emailConfigured: boolean;
  verificationPreviewNotice: string;
}> {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginCustomer(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: CustomerProfile }> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCustomerMe(): Promise<{
  user: CustomerProfile;
  bookings: LaunchBooking[];
}> {
  return requestJson('/api/auth/me', {}, customerToken);
}

export async function updateCustomerProfile(payload: {
  fullName: string;
  phone: string;
}): Promise<{ user: CustomerProfile }> {
  return requestJson(
    '/api/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    customerToken,
  );
}

export async function verifyCustomerEmail(tokenCode: string): Promise<{ user: CustomerProfile }> {
  return requestJson(
    '/api/auth/verify-email',
    {
      method: 'POST',
      body: JSON.stringify({ token: tokenCode }),
    },
    customerToken,
  );
}

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  emailConfigured: boolean;
}> {
  return requestJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(payload: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return requestJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitLaunchBooking(
  payload: {
    clientId?: string;
    referenceNumber?: string;
    fullName: string;
    email: string;
    phone: string;
    guests: number;
    attendanceConfirmed: boolean;
    message: string;
    privacyConsent: boolean;
  },
  bearerToken?: string | null,
): Promise<{
  booking: LaunchBooking;
  emailConfigured: boolean;
  emailNotice: string;
}> {
  return requestJson(
    '/api/bookings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    bearerToken || customerToken,
  );
}

export async function createOrderMirror(
  payload: {
    clientId?: string;
    orderReference?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    notes: string;
    items: OrderItem[];
  },
  bearerToken?: string | null,
): Promise<{ order: CustomerOrder }> {
  return requestJson(
    '/api/orders',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    bearerToken || customerToken,
  );
}

export async function fetchAdminBootstrapStatus(): Promise<AdminBootstrapStatus> {
  return requestJson('/api/admin/bootstrap-status');
}

export async function claimAdminAccount(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; adminEmail: string }> {
  return requestJson('/api/admin/claim', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginAdmin(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; adminEmail: string }> {
  return requestJson('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminOverview(): Promise<{
  bookings: LaunchBooking[];
  orders: CustomerOrder[];
  customers: CustomerProfile[];
  eventConfig: EventConfig;
  siteContent: SiteContent;
  products: ProductItem[];
  emailLogs: EmailLogEntry[];
  emailConfigured: boolean;
}> {
  return requestJson('/api/admin/overview', {}, adminToken);
}

export async function createAdminBooking(payload: {
  clientId?: string;
  referenceNumber?: string;
  fullName: string;
  email: string;
  phone: string;
  guests: number;
  status: BookingStatus;
  message: string;
}): Promise<{ booking: LaunchBooking }> {
  return requestJson(
    '/api/admin/bookings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    adminToken,
  );
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<{ booking: LaunchBooking }> {
  return requestJson(
    `/api/admin/bookings/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    adminToken,
  );
}

export async function deleteAdminBooking(id: string): Promise<{ deletedId: string }> {
  return requestJson(
    `/api/admin/bookings/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    adminToken,
  );
}

export async function downloadBookingsCsv(): Promise<void> {
  if (!adminToken) throw new Error('Administrator sign-in required.');
  const response = await fetch('/api/admin/bookings/export.csv', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to export CSV.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'onyx-glow-launch-bookings.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ order: CustomerOrder }> {
  return requestJson(
    `/api/admin/orders/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    adminToken,
  );
}

export async function downloadOrdersCsv(): Promise<void> {
  if (!adminToken) throw new Error('Administrator sign-in required.');
  const response = await fetch('/api/admin/orders/export.csv', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to export orders CSV.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'onyx-glow-orders.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function updateCustomerStatus(
  id: string,
  status: CustomerStatus,
): Promise<{ customer: CustomerProfile }> {
  return requestJson(
    `/api/admin/customers/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    adminToken,
  );
}

export async function saveAdminEventConfig(payload: {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  guestCapacity: number | null;
  ticketPrice: string;
  bookingEnabled: boolean;
}): Promise<{ eventConfig: EventConfig }> {
  return requestJson(
    '/api/admin/event',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    adminToken,
  );
}

export async function saveAdminSiteContent(payload: Partial<SiteContent>): Promise<{
  siteContent: SiteContent;
}> {
  return requestJson(
    '/api/admin/content',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    adminToken,
  );
}

export async function uploadBrandAsset(dataUrl: string): Promise<{ url: string }> {
  return requestJson(
    '/api/admin/upload-asset',
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    },
    adminToken,
  );
}

export async function createAdminProduct(payload: {
  name: string;
  category: CollectionCategory;
  description: string;
  sizes: string[];
  colors: string[];
  priceLabel: string;
  availability: string;
  imageUrl: string;
  isPlaceholder: boolean;
}): Promise<{ product: ProductItem }> {
  return requestJson(
    '/api/admin/products',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    adminToken,
  );
}

export async function deleteAdminProduct(id: string): Promise<{ deletedId: string }> {
  return requestJson(
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    adminToken,
  );
}
