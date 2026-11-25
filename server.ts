import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UPLOAD_DIR,
  generateBookingReference,
  generateOrderReference,
  hashPassword,
  loadDatabase,
  saveDatabase,
  signSessionToken,
  verifyPassword,
  verifyPlainSecret,
  verifySessionToken,
} from './server/store.ts';
import type {
  BookingStatus,
  CollectionCategory,
  OrderStatus,
  SessionPayload,
  StoredBooking,
  StoredOrder,
  StoredOrderItem,
  StoredProduct,
  StoredUser,
} from './server/store.ts';
import {
  buildAdminBookingNotificationHtml,
  buildBookingConfirmationHtml,
  dispatchEmail,
  isEmailServiceConfigured,
} from './server/email.ts';

dotenv.config();

interface AuthedRequest extends Request {
  session?: SessionPayload;
}

const VALID_CATEGORIES = new Set<CollectionCategory>([
  'Dhaka Collection',
  'Contemporary Ethnic Wear',
  'Kurta Sets',
  'Tops and Skirts',
  'Signature Collection',
]);

const VALID_BOOKING_STATUSES = new Set<BookingStatus>([
  'Pending',
  'Confirmed',
  'Cancelled',
  'Attended',
]);

const VALID_ORDER_STATUSES = new Set<OrderStatus>([
  'Pending',
  'Confirmed',
  'Preparing',
  'Shipped',
  'Delivered',
  'Cancelled',
]);

const FIREBASE_PROJECT_ID = 'onyx-glow';
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedFirebaseCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedFirebaseCerts && now < cachedFirebaseCerts.expiresAt) {
    return cachedFirebaseCerts.certs;
  }
  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Unable to retrieve Firebase verification certificates.');
  }
  const certs = (await response.json()) as Record<string, string>;
  const cacheHeader = response.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheHeader);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
  cachedFirebaseCerts = { certs, expiresAt: now + Math.max(60_000, ttlMs) };
  return certs;
}

async function verifyFirebaseIdToken(
  token: string,
): Promise<{ uid: string; email: string; emailVerified: boolean } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSig] = parts;
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    };

    if (header.alg !== 'RS256' || !header.kid) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.exp !== 'number' ||
      payload.exp <= nowSec ||
      typeof payload.iat !== 'number' ||
      payload.iat > nowSec + 300
    ) {
      return null;
    }

    const certs = await getFirebasePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    const valid = verifier.verify(cert, Buffer.from(encodedSig, 'base64url'));
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : '',
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

function getAuthorizedAdminEmail(): string {
  return (process.env.ADMIN_EMAIL?.trim() || 'onyxglow@gmail.com').toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function isValidPhone(phone: string): boolean {
  return /^[+\d\s\-()]{6,30}$/.test(phone);
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('/api/uploads/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed;
  }
  return '';
}

function toPublicUser(user: StoredUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.session = payload;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.session?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

function csvCell(value: unknown): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  // Serve uploaded brand assets with strict path confinement
  app.get('/api/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const resolved = path.resolve(UPLOAD_DIR, filename);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }
    res.sendFile(resolved);
  });

  // Public Storefront Payload (Content, Event, Products)
  app.get('/api/public/storefront', (_req, res) => {
    const db = loadDatabase();
    res.json({
      eventConfig: db.eventConfig,
      siteContent: db.siteContent,
      products: db.products,
      emailConfigured: isEmailServiceConfigured(),
    });
  });

  // Customer Registration
  app.post('/api/auth/register', async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const acceptedTerms = body.acceptedTerms === true;

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Please enter your full name (2–100 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    if (!acceptedTerms) {
      res.status(400).json({ error: 'You must accept the Terms and Conditions to create an account.' });
      return;
    }

    const db = loadDatabase();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      fullName,
      email,
      phone,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: false,
      verificationToken,
      resetToken: null,
      resetTokenExpiry: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const emailDispatch = await dispatchEmail({
      to: email,
      subject: 'Verify your ONYX GLOW account',
      type: 'verification',
      html: `<div style="background:#080808;color:#F5F0E8;padding:32px;font-family:Georgia,serif;">
        <h2 style="color:#B69A5A;">ONYX GLOW</h2>
        <p>Welcome, ${fullName}. Your verification code is: <strong>${verificationToken}</strong></p>
      </div>`,
    });

    db.users.push(newUser);
    db.emailLogs.unshift(emailDispatch.log);
    if (db.emailLogs.length > 200) db.emailLogs.length = 200;
    saveDatabase(db);

    const token = signSessionToken({ sub: newUser.id, role: 'customer', email: newUser.email });
    res.status(201).json({
      token,
      user: toPublicUser(newUser),
      emailConfigured: isEmailServiceConfigured(),
      verificationPreviewNotice: isEmailServiceConfigured()
        ? 'Verification instructions sent to your email.'
        : 'Account created. Configure RESEND_API_KEY for live email verification delivery.',
    });
  });

  // Customer Login
  app.post('/api/auth/login', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Please provide a valid email address and password.' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account is currently suspended. Please contact ONYX GLOW.' });
      return;
    }

    const token = signSessionToken({ sub: user.id, role: 'customer', email: user.email });
    res.json({ token, user: toPublicUser(user) });
  });

  // Customer Session & Profile
  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    if (req.session?.role !== 'customer') {
      res.status(403).json({ error: 'Customer session required.' });
      return;
    }
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.session?.sub);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const bookings = db.bookings.filter(
      (b) => b.userId === user.id || b.email === user.email,
    );
    res.json({ user: toPublicUser(user), bookings });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    if (req.session?.role !== 'customer') {
      res.status(403).json({ error: 'Customer session required.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Full name must be 2–100 characters.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please provide a valid phone number.' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.session?.sub);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    user.fullName = fullName;
    user.phone = phone;
    user.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/auth/verify-email', requireAuth, (req: AuthedRequest, res) => {
    if (req.session?.role !== 'customer') {
      res.status(403).json({ error: 'Customer session required.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const verificationCode = typeof body.token === 'string' ? body.token.trim() : '';
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.session?.sub);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    if (!verificationCode || verificationCode !== user.verificationToken) {
      res.status(400).json({ error: 'Invalid verification code.' });
      return;
    }
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.email === email);
    if (user) {
      const resetToken = crypto.randomBytes(16).toString('hex');
      user.resetToken = resetToken;
      user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      user.updatedAt = new Date().toISOString();

      const emailDispatch = await dispatchEmail({
        to: user.email,
        subject: 'ONYX GLOW Password Reset Request',
        type: 'password_reset',
        html: `<div style="background:#080808;color:#F5F0E8;padding:32px;font-family:Georgia,serif;">
          <h2 style="color:#B69A5A;">ONYX GLOW</h2>
          <p>Use this reset token within 30 minutes: <strong>${resetToken}</strong></p>
        </div>`,
      });
      db.emailLogs.unshift(emailDispatch.log);
      saveDatabase(db);
    }

    res.json({
      message:
        'If an account exists for that email address, password reset instructions have been processed.',
      emailConfigured: isEmailServiceConfigured(),
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!isValidEmail(email) || !token || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'Invalid reset token or password (minimum 8 characters).' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.email === email);
    if (
      !user ||
      !user.resetToken ||
      !user.resetTokenExpiry ||
      user.resetToken !== token ||
      Date.now() > Date.parse(user.resetTokenExpiry)
    ) {
      res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ message: 'Your password has been updated. Please sign in.' });
  });

  // Launch Event Booking (Open to Guests AND Signed-in Customers)
  app.post('/api/bookings', async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const guestsRaw = Number(body.guests);
    const guests = Number.isInteger(guestsRaw) ? guestsRaw : 0;
    const attendanceConfirmed = body.attendanceConfirmed === true;
    const privacyConsent = body.privacyConsent === true;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Please provide your full name (2–100 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
      return;
    }
    if (guests < 1 || guests > 10) {
      res.status(400).json({ error: 'Number of guests must be between 1 and 10.' });
      return;
    }
    if (!attendanceConfirmed) {
      res.status(400).json({ error: 'Please confirm your intended attendance.' });
      return;
    }
    if (!privacyConsent) {
      res.status(400).json({ error: 'Privacy consent is required to complete your booking.' });
      return;
    }

    const db = loadDatabase();
    if (!db.eventConfig.bookingEnabled) {
      res.status(400).json({ error: 'Launch event registration is currently paused by ONYX GLOW.' });
      return;
    }

    // Check guest capacity if set by admin
    if (typeof db.eventConfig.guestCapacity === 'number' && db.eventConfig.guestCapacity > 0) {
      const activeGuests = db.bookings
        .filter((b) => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Attended')
        .reduce((sum, b) => sum + b.guests, 0);
      if (activeGuests + guests > db.eventConfig.guestCapacity) {
        res.status(400).json({
          error: 'Requested guest count exceeds remaining event capacity.',
        });
        return;
      }
    }

    // Prevent duplicate active bookings for the same email
    const existingDuplicate = db.bookings.find(
      (b) => b.email === email && (b.status === 'Pending' || b.status === 'Confirmed'),
    );
    if (existingDuplicate) {
      res.status(409).json({
        error: `A launch event booking (${existingDuplicate.referenceNumber}) already exists for this email address.`,
        existingReference: existingDuplicate.referenceNumber,
      });
      return;
    }

    // Optional customer association (Express session or verified Firebase ID token)
    let associatedUserId: string | null = null;
    const token = extractBearerToken(req);
    if (token) {
      const session = verifySessionToken(token);
      if (session?.role === 'customer') {
        associatedUserId = session.sub;
      } else {
        const fbSession = await verifyFirebaseIdToken(token);
        if (fbSession) {
          associatedUserId = fbSession.uid;
        }
      }
    }

    const existingRefs = new Set(db.bookings.map((b) => b.referenceNumber));
    const requestedRef =
      typeof body.referenceNumber === 'string' &&
      /^OG-\d{4}-[A-Z0-9]{4,12}$/.test(body.referenceNumber.trim()) &&
      !existingRefs.has(body.referenceNumber.trim())
        ? body.referenceNumber.trim()
        : null;
    const referenceNumber = requestedRef || generateBookingReference(existingRefs);
    const now = new Date().toISOString();

    const booking: StoredBooking = {
      id:
        typeof body.clientId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(body.clientId)
          ? body.clientId
          : crypto.randomUUID(),
      referenceNumber,
      fullName,
      email,
      phone,
      guests,
      attendanceConfirmed,
      message,
      privacyConsent,
      userId: associatedUserId,
      status: 'Pending',
      emailNotificationStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const guestEmail = await dispatchEmail({
      to: email,
      subject: `ONYX GLOW Launch Event — Booking Reference ${referenceNumber}`,
      type: 'booking_confirmation',
      html: buildBookingConfirmationHtml(booking, db.eventConfig.title),
    });

    const adminNotifyEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || 'onyxglowofficial@gmail.com';
    const adminEmail = await dispatchEmail({
      to: adminNotifyEmail,
      subject: `New Launch Event Booking: ${referenceNumber} (${fullName})`,
      type: 'admin_notification',
      html: buildAdminBookingNotificationHtml(booking),
    });

    booking.emailNotificationStatus = guestEmail.result.status;
    db.bookings.unshift(booking);
    db.emailLogs.unshift(guestEmail.log, adminEmail.log);
    if (db.emailLogs.length > 200) db.emailLogs.length = 200;
    saveDatabase(db);

    res.status(201).json({
      booking,
      emailConfigured: isEmailServiceConfigured(),
      emailNotice: guestEmail.result.sent
        ? 'A confirmation email has been sent to your email address.'
        : 'Booking saved securely. Transactional email delivery requires configuring RESEND_API_KEY and EMAIL_FROM.',
    });
  });

  // Customer Product Order Submission (requires verified customer or Firebase session)
  app.post('/api/orders', async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Please sign in before placing an order.' });
      return;
    }

    let verifiedUserId: string | null = null;
    const session = verifySessionToken(token);
    if (session?.role === 'customer') {
      verifiedUserId = session.sub;
    } else {
      const fbUser = await verifyFirebaseIdToken(token);
      if (fbUser) {
        verifiedUserId = fbUser.uid;
      }
    }
    if (!verifiedUserId) {
      res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 100) : '';
    const customerEmail =
      typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const shippingAddress =
      typeof body.shippingAddress === 'string' ? body.shippingAddress.trim().slice(0, 300) : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (customerName.length < 2) {
      res.status(400).json({ error: 'Please provide your full name.' });
      return;
    }
    if (!isValidEmail(customerEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!isValidPhone(customerPhone)) {
      res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
      return;
    }
    if (shippingAddress.length < 4) {
      res.status(400).json({ error: 'Please provide your delivery address.' });
      return;
    }
    if (rawItems.length < 1 || rawItems.length > 25) {
      res.status(400).json({ error: 'Order must contain between 1 and 25 items.' });
      return;
    }

    const items: StoredOrderItem[] = [];
    for (const raw of rawItems) {
      const item = raw as Record<string, unknown>;
      const productId = typeof item.productId === 'string' ? item.productId.trim().slice(0, 128) : '';
      const productName = typeof item.productName === 'string' ? item.productName.trim().slice(0, 120) : '';
      const category =
        typeof item.category === 'string' && VALID_CATEGORIES.has(item.category as CollectionCategory)
          ? (item.category as CollectionCategory)
          : 'Signature Collection';
      const size = typeof item.size === 'string' ? item.size.trim().slice(0, 30) : 'Standard';
      const color = typeof item.color === 'string' ? item.color.trim().slice(0, 40) : 'Default';
      const quantityNum = Number(item.quantity);
      const quantity = Number.isInteger(quantityNum) && quantityNum >= 1 && quantityNum <= 20 ? quantityNum : 1;
      const priceLabel =
        typeof item.priceLabel === 'string' ? item.priceLabel.trim().slice(0, 60) : 'Price Pending';
      if (!productId || !productName) {
        res.status(400).json({ error: 'Invalid order item specification.' });
        return;
      }
      items.push({ productId, productName, category, size, color, quantity, priceLabel });
    }

    const db = loadDatabase();
    const existingRefs = new Set(db.orders.map((o) => o.orderReference));
    const requestedRef =
      typeof body.orderReference === 'string' &&
      /^ORD-\d{4}-[A-Z0-9]{4,12}$/.test(body.orderReference.trim()) &&
      !existingRefs.has(body.orderReference.trim())
        ? body.orderReference.trim()
        : null;
    const orderReference = requestedRef || generateOrderReference(existingRefs);
    const now = new Date().toISOString();

    const order: StoredOrder = {
      id:
        typeof body.clientId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(body.clientId)
          ? body.clientId
          : crypto.randomUUID(),
      orderReference,
      userId: verifiedUserId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      notes,
      items,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    const adminNotifyEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || 'onyxglowofficial@gmail.com';
    const itemLines = items
      .map((i) => `<li>${i.productName} (${i.size}, ${i.color}) x${i.quantity}</li>`)
      .join('');
    const adminEmail = await dispatchEmail({
      to: adminNotifyEmail,
      subject: `New Customer Order: ${orderReference} (${customerName})`,
      type: 'admin_notification',
      html: `<div style="background:#080808;color:#F5F0E8;padding:24px;font-family:Georgia,serif;">
        <h2 style="color:#B69A5A;">ONYX GLOW · New Order ${orderReference}</h2>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail}, ${customerPhone})</p>
        <p><strong>Address:</strong> ${shippingAddress}</p>
        <ul>${itemLines}</ul>
      </div>`,
    });

    db.orders.unshift(order);
    db.emailLogs.unshift(adminEmail.log);
    if (db.emailLogs.length > 200) db.emailLogs.length = 200;
    saveDatabase(db);

    res.status(201).json({ order });
  });

  // Admin Bootstrap & Authentication (strictly restricted to authorized admin email)
  app.get('/api/admin/bootstrap-status', (_req, res) => {
    const db = loadDatabase();
    const configuredViaEnv = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const authorizedEmail = getAuthorizedAdminEmail();
    res.json({
      configuredViaEnv,
      claimed: Boolean(db.adminAccount && db.adminAccount.email === authorizedEmail),
      emailHint: authorizedEmail,
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const db = loadDatabase();
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(403).json({
        error: 'Administrator credentials are already configured via environment secrets.',
      });
      return;
    }
    const authorizedEmail = getAuthorizedAdminEmail();
    if (db.adminAccount && db.adminAccount.email === authorizedEmail) {
      res.status(403).json({ error: 'Administrator account has already been claimed.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidEmail(email) || email !== authorizedEmail) {
      res.status(403).json({
        error: `Admin access is restricted strictly to ${authorizedEmail}.`,
      });
      return;
    }
    if (password.length < 10 || password.length > 128) {
      res.status(400).json({ error: 'Administrator password must be at least 10 characters.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    db.adminAccount = {
      email,
      passwordHash: hash,
      passwordSalt: salt,
      claimedAt: new Date().toISOString(),
    };
    saveDatabase(db);

    const token = signSessionToken({ sub: 'admin-root', role: 'admin', email }, 12);
    res.status(201).json({ token, adminEmail: email });
  });

  app.post('/api/admin/login', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Administrator email and password are required.' });
      return;
    }

    const authorizedEmail = getAuthorizedAdminEmail();
    if (email !== authorizedEmail) {
      res.status(403).json({ error: 'Access denied. Authorized ONYX GLOW administrator only.' });
      return;
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      if (!verifyPlainSecret(password, envPasscode)) {
        res.status(401).json({ error: 'Invalid administrator password.' });
        return;
      }
      const token = signSessionToken({ sub: 'admin-env', role: 'admin', email }, 12);
      res.json({ token, adminEmail: email });
      return;
    }

    const db = loadDatabase();
    if (!db.adminAccount) {
      res.status(403).json({ error: 'Administrator password has not been claimed yet.' });
      return;
    }
    if (
      email !== db.adminAccount.email ||
      !verifyPassword(password, db.adminAccount.passwordHash, db.adminAccount.passwordSalt)
    ) {
      res.status(401).json({ error: 'Invalid administrator password.' });
      return;
    }

    const token = signSessionToken({ sub: 'admin-root', role: 'admin', email }, 12);
    res.json({ token, adminEmail: email });
  });

  // Protected Admin Routes
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    res.json({
      bookings: db.bookings,
      orders: db.orders,
      customers: db.users.map(toPublicUser),
      eventConfig: db.eventConfig,
      siteContent: db.siteContent,
      products: db.products,
      emailLogs: db.emailLogs.slice(0, 40),
      emailConfigured: isEmailServiceConfigured(),
    });
  });

  app.post('/api/admin/bookings', requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const guestsRaw = Number(body.guests);
    const guests = Number.isInteger(guestsRaw) ? guestsRaw : 0;
    const statusRaw = typeof body.status === 'string' ? (body.status as BookingStatus) : 'Confirmed';
    const status: BookingStatus = VALID_BOOKING_STATUSES.has(statusRaw) ? statusRaw : 'Confirmed';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Guest full name must be 2–100 characters.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid guest email address.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please provide a valid guest phone or WhatsApp number.' });
      return;
    }
    if (guests < 1 || guests > 10) {
      res.status(400).json({ error: 'Number of guests must be between 1 and 10.' });
      return;
    }

    const db = loadDatabase();
    if (
      (status === 'Pending' || status === 'Confirmed' || status === 'Attended') &&
      typeof db.eventConfig.guestCapacity === 'number' &&
      db.eventConfig.guestCapacity > 0
    ) {
      const activeGuests = db.bookings
        .filter((b) => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Attended')
        .reduce((sum, b) => sum + b.guests, 0);
      if (activeGuests + guests > db.eventConfig.guestCapacity) {
        res.status(400).json({
          error: 'Requested guest count exceeds remaining event capacity.',
        });
        return;
      }
    }

    const existingRefs = new Set(db.bookings.map((b) => b.referenceNumber));
    const requestedRef =
      typeof body.referenceNumber === 'string' &&
      /^OG-\d{4}-[A-Z0-9]{4,12}$/.test(body.referenceNumber.trim()) &&
      !existingRefs.has(body.referenceNumber.trim())
        ? body.referenceNumber.trim()
        : null;
    const referenceNumber = requestedRef || generateBookingReference(existingRefs);
    const now = new Date().toISOString();

    const booking: StoredBooking = {
      id:
        typeof body.clientId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(body.clientId)
          ? body.clientId
          : `bkg_adm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      referenceNumber,
      fullName,
      email,
      phone,
      guests,
      attendanceConfirmed: true,
      message,
      privacyConsent: true,
      userId: 'admin-entry',
      status,
      emailNotificationStatus: 'admin_created',
      createdAt: now,
      updatedAt: now,
    };

    const guestEmail = await dispatchEmail({
      to: email,
      subject: `ONYX GLOW Launch Event — Booking Reference ${referenceNumber}`,
      type: 'booking_confirmation',
      html: buildBookingConfirmationHtml(booking, db.eventConfig.title),
    });

    booking.emailNotificationStatus = guestEmail.result.sent ? 'sent' : 'admin_created';
    db.bookings.unshift(booking);
    db.emailLogs.unshift(guestEmail.log);
    if (db.emailLogs.length > 200) db.emailLogs.length = 200;
    saveDatabase(db);

    res.status(201).json({ booking });
  });

  app.patch('/api/admin/bookings/:id/status', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const status = typeof body.status === 'string' ? (body.status as BookingStatus) : null;
    if (!status || !VALID_BOOKING_STATUSES.has(status)) {
      res.status(400).json({ error: 'Invalid booking status.' });
      return;
    }

    const db = loadDatabase();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    booking.status = status;
    booking.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ booking });
  });

  app.delete('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const before = db.bookings.length;
    db.bookings = db.bookings.filter((b) => b.id !== req.params.id);
    if (db.bookings.length === before) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ deletedId: req.params.id });
  });

  app.get('/api/admin/bookings/export.csv', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const header = [
      'Reference Number',
      'Full Name',
      'Email',
      'Phone',
      'Guests',
      'Attendance Confirmed',
      'Status',
      'Message',
      'Submitted At',
    ]
      .map(csvCell)
      .join(',');

    const rows = db.bookings.map((b) =>
      [
        b.referenceNumber,
        b.fullName,
        b.email,
        b.phone,
        b.guests,
        b.attendanceConfirmed ? 'Yes' : 'No',
        b.status,
        b.message,
        b.createdAt,
      ]
        .map(csvCell)
        .join(','),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="onyx-glow-launch-bookings.csv"');
    res.send([header, ...rows].join('\n'));
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const status = typeof body.status === 'string' ? (body.status as OrderStatus) : null;
    if (!status || !VALID_ORDER_STATUSES.has(status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }

    const db = loadDatabase();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ order });
  });

  app.get('/api/admin/orders/export.csv', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const header = [
      'Order Reference',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Shipping Address',
      'Items',
      'Status',
      'Notes',
      'Created At',
    ]
      .map(csvCell)
      .join(',');

    const rows = db.orders.map((o) =>
      [
        o.orderReference,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        o.shippingAddress,
        o.items
          .map((i) => `${i.productName} (${i.size}, ${i.color}) x${i.quantity}`)
          .join('; '),
        o.status,
        o.notes,
        o.createdAt,
      ]
        .map(csvCell)
        .join(','),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="onyx-glow-orders.csv"');
    res.send([header, ...rows].join('\n'));
  });

  app.patch('/api/admin/customers/:id/status', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const status = body.status === 'active' || body.status === 'suspended' ? body.status : null;
    if (!status) {
      res.status(400).json({ error: 'Invalid customer status.' });
      return;
    }
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    user.status = status;
    user.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ customer: toPublicUser(user) });
  });

  app.put('/api/admin/event', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const db = loadDatabase();
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 600) : '';
    if (!title || !description) {
      res.status(400).json({ error: 'Event title and description are required.' });
      return;
    }

    const capRaw = body.guestCapacity;
    let guestCapacity: number | null = null;
    if (capRaw !== null && capRaw !== '' && capRaw !== undefined) {
      const parsedCap = Number(capRaw);
      if (!Number.isInteger(parsedCap) || parsedCap < 1 || parsedCap > 10000) {
        res.status(400).json({ error: 'Guest capacity must be a positive integer.' });
        return;
      }
      guestCapacity = parsedCap;
    }

    db.eventConfig = {
      title,
      description,
      date: typeof body.date === 'string' ? body.date.trim().slice(0, 80) : '',
      time: typeof body.time === 'string' ? body.time.trim().slice(0, 80) : '',
      venue: typeof body.venue === 'string' ? body.venue.trim().slice(0, 160) : '',
      guestCapacity,
      ticketPrice: typeof body.ticketPrice === 'string' ? body.ticketPrice.trim().slice(0, 60) : '',
      bookingEnabled: Boolean(body.bookingEnabled),
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ eventConfig: db.eventConfig });
  });

  app.put('/api/admin/content', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const db = loadDatabase();
    const current = db.siteContent;
    const incomingAssets = (body.assets ?? {}) as Record<string, unknown>;

    db.siteContent = {
      announcementBanner:
        typeof body.announcementBanner === 'string'
          ? body.announcementBanner.trim().slice(0, 160)
          : current.announcementBanner,
      heroSubtitle:
        typeof body.heroSubtitle === 'string'
          ? body.heroSubtitle.trim().slice(0, 140)
          : current.heroSubtitle,
      heroStatement:
        typeof body.heroStatement === 'string'
          ? body.heroStatement.trim().slice(0, 220)
          : current.heroStatement,
      brandIntroHeading:
        typeof body.brandIntroHeading === 'string'
          ? body.brandIntroHeading.trim().slice(0, 160)
          : current.brandIntroHeading,
      brandIntroText:
        typeof body.brandIntroText === 'string'
          ? body.brandIntroText.trim().slice(0, 600)
          : current.brandIntroText,
      comingSoonText:
        typeof body.comingSoonText === 'string'
          ? body.comingSoonText.trim().slice(0, 200)
          : current.comingSoonText,
      instagramUrl:
        typeof body.instagramUrl === 'string'
          ? sanitizeUrl(body.instagramUrl)
          : current.instagramUrl,
      facebookUrl:
        typeof body.facebookUrl === 'string' ? sanitizeUrl(body.facebookUrl) : current.facebookUrl,
      assets: {
        logoUrl:
          typeof incomingAssets.logoUrl === 'string'
            ? sanitizeUrl(incomingAssets.logoUrl)
            : current.assets.logoUrl,
        heroCoverUrl:
          typeof incomingAssets.heroCoverUrl === 'string'
            ? sanitizeUrl(incomingAssets.heroCoverUrl) || current.assets.heroCoverUrl
            : current.assets.heroCoverUrl,
        brandIntroUrl:
          typeof incomingAssets.brandIntroUrl === 'string'
            ? sanitizeUrl(incomingAssets.brandIntroUrl) || current.assets.brandIntroUrl
            : current.assets.brandIntroUrl,
        regionHimalayanUrl:
          typeof incomingAssets.regionHimalayanUrl === 'string'
            ? sanitizeUrl(incomingAssets.regionHimalayanUrl) || current.assets.regionHimalayanUrl
            : current.assets.regionHimalayanUrl,
        regionHillyUrl:
          typeof incomingAssets.regionHillyUrl === 'string'
            ? sanitizeUrl(incomingAssets.regionHillyUrl) || current.assets.regionHillyUrl
            : current.assets.regionHillyUrl,
        regionTeraiUrl:
          typeof incomingAssets.regionTeraiUrl === 'string'
            ? sanitizeUrl(incomingAssets.regionTeraiUrl) || current.assets.regionTeraiUrl
            : current.assets.regionTeraiUrl,
        dhakaMainUrl:
          typeof incomingAssets.dhakaMainUrl === 'string'
            ? sanitizeUrl(incomingAssets.dhakaMainUrl) || current.assets.dhakaMainUrl
            : current.assets.dhakaMainUrl,
        dhakaDetailUrl:
          typeof incomingAssets.dhakaDetailUrl === 'string'
            ? sanitizeUrl(incomingAssets.dhakaDetailUrl) || current.assets.dhakaDetailUrl
            : current.assets.dhakaDetailUrl,
      },
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ siteContent: db.siteContent });
  });

  app.post('/api/admin/upload-asset', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Only PNG, JPEG, or WebP image files are accepted.' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size must be 5 MB or less.' });
      return;
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const filename = `onyx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const targetPath = path.resolve(UPLOAD_DIR, filename);
    if (!targetPath.startsWith(UPLOAD_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid upload destination.' });
      return;
    }
    fs.writeFileSync(targetPath, buffer);
    res.status(201).json({ url: `/api/uploads/${filename}` });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const category =
      typeof body.category === 'string' && VALID_CATEGORIES.has(body.category as CollectionCategory)
        ? (body.category as CollectionCategory)
        : null;
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
    const priceLabel =
      typeof body.priceLabel === 'string' && body.priceLabel.trim()
        ? body.priceLabel.trim().slice(0, 60)
        : 'Price Pending Official Release';
    const availability =
      typeof body.availability === 'string' && body.availability.trim()
        ? body.availability.trim().slice(0, 60)
        : 'Sample Placeholder';
    const sizes = Array.isArray(body.sizes)
      ? body.sizes.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 10)
      : ['S', 'M', 'L'];
    const colors = Array.isArray(body.colors)
      ? body.colors.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 10)
      : ['Obsidian', 'Warm Ivory'];
    const imageUrl = typeof body.imageUrl === 'string' ? sanitizeUrl(body.imageUrl) : '';
    const isPlaceholder = body.isPlaceholder !== false;

    if (!name || !category || !description) {
      res.status(400).json({ error: 'Product name, valid category, and description are required.' });
      return;
    }

    const db = loadDatabase();
    const product: StoredProduct = {
      id: crypto.randomUUID(),
      name,
      category,
      description,
      sizes,
      colors,
      priceLabel,
      availability,
      imageUrl,
      isPlaceholder,
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(product);
    saveDatabase(db);
    res.status(201).json({ product });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== req.params.id);
    if (db.products.length === before) {
      res.status(404).json({ error: 'Collection item not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ deletedId: req.params.id });
  });

  // Vite dev middleware or static production build
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use((req, res, next) => {
      if (req.path.length > 1 && req.path.endsWith('/') && !req.path.startsWith('/api/')) {
        res.redirect(301, req.path.slice(0, -1));
        return;
      }
      next();
    });
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`ONYX GLOW server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ONYX GLOW server:', err);
  process.exit(1);
});
