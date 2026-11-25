import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Search, Trash2, X } from 'lucide-react';
import { createOrderMirror } from '../lib/api';
import { auth, createFirestoreOrder } from '../lib/firebase';
import type { AppRoute, CustomerOrder, CustomerProfile, ProductItem } from '../types';

export interface BagSelection {
  id: string;
  product: ProductItem;
  size: string;
  color: string;
  quantity: number;
}

interface SearchDrawerProps {
  open: boolean;
  products: ProductItem[];
  onClose: () => void;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
}

export function SearchDrawer({ open, products, onClose, onNavigate }: SearchDrawerProps) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const quickLinks: Array<{ label: string; route: AppRoute; sectionId?: string }> = [
    { label: 'Women Collection', route: '/women' },
    { label: 'Our Story — Cultural Identity', route: '/', sectionId: 'our-story' },
    { label: 'The Beauty of Nepal', route: '/', sectionId: 'heritage' },
    { label: 'Launch Event RSVP', route: '/', sectionId: 'launch-event' },
    { label: 'Leadership & Partnership', route: '/', sectionId: 'partnership' },
    { label: 'Contact ONYX GLOW', route: '/', sectionId: 'contact' },
  ];

  const matchedProducts = products.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );

  const matchedLinks = quickLinks.filter((l) => !q || l.label.toLowerCase().includes(q));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808]/85 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Search ONYX GLOW"
    >
      <div className="w-full max-w-md bg-[#0D0D0D] border-l border-[#B69A5A]/30 h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
              Search The House
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="w-9 h-9 flex items-center justify-center text-[#D8C9A5] hover:text-[#FFFFFF] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Dhaka, Kurta Sets, Heritage..."
              className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] pl-10 pr-4 py-3 text-sm text-[#FFFFFF] outline-none"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#77736D]">
              Editorial &amp; Sections
            </p>
            <div className="divide-y divide-[#F5F0E8]/10">
              {matchedLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate(link.route, link.sectionId);
                  }}
                  className="w-full py-3 text-left text-xs tracking-[0.16em] uppercase text-[#F5F0E8] hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#77736D]">
              Women Catalogue ({matchedProducts.length})
            </p>
            <div className="space-y-2.5">
              {matchedProducts.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('/women');
                  }}
                  className="w-full text-left border border-[#F5F0E8]/10 bg-[#080808] hover:border-[#B69A5A] p-3.5 transition-colors cursor-pointer"
                >
                  <p className="font-serif-editorial text-lg text-[#FFFFFF]">{item.name}</p>
                  <p className="text-[11px] tracking-[0.16em] uppercase text-[#B69A5A] mt-0.5">
                    {item.category} · {item.priceLabel}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BagDrawerProps {
  open: boolean;
  items: BagSelection[];
  currentUser: CustomerProfile | null;
  checkoutMode: boolean;
  onSetCheckoutMode: (val: boolean) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClearBag: () => void;
  onExploreWomen: () => void;
  onRequireAuth: (reason: string) => void;
  onOrderCreated: (order: CustomerOrder) => void;
}

export function BagDrawer({
  open,
  items,
  currentUser,
  checkoutMode,
  onSetCheckoutMode,
  onClose,
  onRemove,
  onClearBag,
  onExploreWomen,
  onRequireAuth,
  onOrderCreated,
}: BagDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.fullName);
      setCustomerPhone((prev) => prev || currentUser.phone);
    }
  }, [currentUser]);

  if (!open) return null;

  const handleProceedClick = () => {
    setError('');
    setConfirmedOrder(null);
    if (!currentUser) {
      onRequireAuth('Please sign in or create an ONYX GLOW account before buying a product.');
      return;
    }
    setCustomerName(currentUser.fullName);
    setCustomerPhone(currentUser.phone);
    onSetCheckoutMode(true);
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!currentUser) {
      onRequireAuth('Please sign in or create an ONYX GLOW account before buying a product.');
      return;
    }
    if (customerName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[+\d\s\-()]{6,30}$/.test(customerPhone.trim())) {
      setError('Please enter a valid phone or WhatsApp number.');
      return;
    }
    if (shippingAddress.trim().length < 4) {
      setError('Please enter your delivery address or city.');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerEmail: currentUser.email,
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim(),
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          category: i.product.category,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          priceLabel: i.product.priceLabel,
        })),
      };
      const order = await createFirestoreOrder(orderPayload);
      try {
        const fbToken = await auth.currentUser?.getIdToken();
        if (fbToken) {
          await createOrderMirror(
            {
              clientId: order.id,
              orderReference: order.orderReference,
              ...orderPayload,
            },
            fbToken,
          );
        }
      } catch {
        // Best-effort Express sync for admin operations console
      }
      setConfirmedOrder(order);
      onOrderCreated(order);
      onClearBag();
      onSetCheckoutMode(false);
      setShippingAddress('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808]/85 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Selection Bag & Product Order"
    >
      <div className="w-full max-w-md bg-[#0D0D0D] border-l border-[#B69A5A]/30 h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#F5F0E8]/10 pb-4">
            <span className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
              {confirmedOrder
                ? 'Order Confirmed'
                : checkoutMode
                  ? 'Order Details'
                  : `Selection Bag (${items.length})`}
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirmedOrder(null);
                onSetCheckoutMode(false);
                onClose();
              }}
              aria-label="Close selection bag"
              className="w-9 h-9 flex items-center justify-center text-[#D8C9A5] hover:text-[#FFFFFF] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="border border-red-400/50 bg-red-950/40 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {confirmedOrder ? (
            <div className="space-y-5 py-4">
              <div className="flex items-center gap-2.5 text-[#B69A5A]">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-[11px] tracking-[0.24em] uppercase">
                  Order Saved in Firebase
                </span>
              </div>
              <h3 className="font-serif-editorial text-3xl text-[#FFFFFF]">
                Thank You, {confirmedOrder.customerName}
              </h3>
              <div className="border border-[#B69A5A]/30 bg-[#080808] p-5 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#77736D] uppercase tracking-wider">Order Reference</span>
                  <span className="text-[#B69A5A] tabular-nums font-medium">
                    {confirmedOrder.orderReference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77736D] uppercase tracking-wider">Items</span>
                  <span className="tabular-nums">{confirmedOrder.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77736D] uppercase tracking-wider">Status</span>
                  <span>{confirmedOrder.status}</span>
                </div>
              </div>
              <p className="text-xs text-[#D8C9A5]/80 leading-relaxed">
                Your order items have been recorded under your account. You can review your order
                history anytime inside My Account.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full py-3.5 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium cursor-pointer"
              >
                Continue Exploring
              </button>
            </div>
          ) : checkoutMode && items.length > 0 ? (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <p className="text-xs text-[#D8C9A5]/80">
                Ordering as <span className="text-[#FFFFFF]">{currentUser?.email}</span>
              </p>

              <div>
                <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
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
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+977-98XXXXXXXX"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street, city, district, Nepal"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                  Tailoring / Order Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional sizing or delivery instructions"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none resize-none"
                />
              </div>

              <div className="border-t border-[#F5F0E8]/10 pt-3 space-y-2">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#77736D]">
                  Items ({items.length})
                </p>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-[#D8C9A5]">
                    <span className="truncate pr-3">
                      {item.product.name} ({item.size}, {item.color})
                    </span>
                    <span className="tabular-nums shrink-0">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onSetCheckoutMode(false)}
                  className="px-4 py-3 border border-[#F5F0E8]/20 text-xs tracking-[0.18em] uppercase text-[#D8C9A5] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#B69A5A] hover:bg-[#D8C9A5] disabled:opacity-50 text-[#080808] text-xs tracking-[0.22em] uppercase font-medium cursor-pointer"
                >
                  {submitting ? 'PLACING ORDER...' : 'CONFIRM & PLACE ORDER'}
                </button>
              </div>
            </form>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="font-serif-editorial text-2xl text-[#FFFFFF]">
                Your Selection Bag Is Empty
              </p>
              <p className="text-xs text-[#77736D] leading-relaxed">
                Explore the Women&apos;s collection to select silhouettes and place an order.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreWomen();
                }}
                className="px-6 py-3 border border-[#B69A5A] text-[11px] tracking-[0.22em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
              >
                Explore Women Collection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#F5F0E8]/15 bg-[#080808] p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#B69A5A]">
                      {item.product.category}
                    </p>
                    <p className="font-serif-editorial text-lg text-[#FFFFFF]">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#77736D]">
                      Size {item.size} · {item.color} · Qty {item.quantity}
                    </p>
                    <p className="text-[11px] text-[#D8C9A5] pt-1">{item.product.priceLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove item"
                    className="text-[#77736D] hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!confirmedOrder && !checkoutMode && items.length > 0 && (
          <div className="pt-6 border-t border-[#F5F0E8]/15 space-y-3">
            <p className="text-xs text-[#77736D] leading-relaxed">
              {currentUser
                ? `Signed in as ${currentUser.email}. Ready to submit your order.`
                : 'Sign in or create an account to confirm and store your product order.'}
            </p>
            <button
              type="button"
              onClick={handleProceedClick}
              className="w-full py-3.5 bg-[#B69A5A] hover:bg-[#D8C9A5] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium cursor-pointer"
            >
              {currentUser ? 'PROCEED TO ORDER' : 'SIGN IN TO BUY PRODUCT'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
