import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, X } from 'lucide-react';
import { submitLaunchBooking } from '../lib/api';
import { auth, createFirestoreLaunchBooking } from '../lib/firebase';
import type { AppRoute, CustomerProfile, EventConfig, LaunchBooking } from '../types';

interface LaunchEventSectionProps {
  eventConfig: EventConfig;
  currentUser: CustomerProfile | null;
  modalOpen: boolean;
  onSetModalOpen: (open: boolean) => void;
  onRequireAuth: (reason: string) => void;
  onBookingCreated: (booking: LaunchBooking) => void;
  onNavigate: (route: AppRoute) => void;
}

export function LaunchEventSection({
  eventConfig,
  currentUser,
  modalOpen,
  onSetModalOpen,
  onRequireAuth,
  onBookingCreated,
  onNavigate,
}: LaunchEventSectionProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState(1);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(true);
  const [message, setMessage] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<LaunchBooking | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName((prev) => prev || currentUser.fullName);
      setEmail((prev) => prev || currentUser.email);
      setPhone((prev) => prev || currentUser.phone);
    }
  }, [currentUser]);

  const handleBookClick = () => {
    if (!currentUser) {
      onRequireAuth('Please sign in or create an account before booking the launch event.');
      return;
    }
    setError('');
    setConfirmation(null);
    setFullName(currentUser.fullName);
    setEmail(currentUser.email);
    setPhone(currentUser.phone);
    onSetModalOpen(true);
  };

  const resetForm = () => {
    setConfirmation(null);
    setError('');
    setFullName(currentUser?.fullName ?? '');
    setEmail(currentUser?.email ?? '');
    setPhone(currentUser?.phone ?? '');
    setGuests(1);
    setAttendanceConfirmed(true);
    setMessage('');
    setPrivacyConsent(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!currentUser) {
      onSetModalOpen(false);
      onRequireAuth('Please sign in or create an account before booking the launch event.');
      return;
    }

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[+\d\s\-()]{6,30}$/.test(phone.trim())) {
      setError('Please enter a valid phone or WhatsApp number.');
      return;
    }
    if (!attendanceConfirmed) {
      setError('Please confirm your intention to attend.');
      return;
    }
    if (!privacyConsent) {
      setError('Please accept the privacy consent to confirm your booking.');
      return;
    }

    setSubmitting(true);
    try {
      const bookingPayload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        guests,
        attendanceConfirmed,
        message: message.trim(),
        privacyConsent,
      };
      const booking = await createFirestoreLaunchBooking(bookingPayload);
      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await submitLaunchBooking(
          {
            clientId: booking.id,
            referenceNumber: booking.referenceNumber,
            ...bookingPayload,
          },
          fbToken,
        );
      } catch {
        // Best-effort Express sync
      }
      setConfirmation(booking);
      onBookingCreated(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="launch-event"
      className="bg-[#080808] text-[#F5F0E8] py-24 md:py-32 border-t border-[#B69A5A]/25"
    >
      <div className="max-w-[1160px] mx-auto px-6 sm:px-10">
        <div className="border border-[#B69A5A]/35 bg-[#0D0D0D] p-8 sm:p-14 md:p-16 text-center space-y-8">
          <p className="text-[11px] tracking-[0.34em] uppercase text-[#B69A5A]">
            Inaugural House Presentation
          </p>

          <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#FFFFFF] text-balance">
            BE PART OF OUR BEGINNING.
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#D8C9A5]/85 leading-relaxed">
            {eventConfig.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-8 border-t border-b border-[#B69A5A]/20 text-left">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Event Date</span>
              </div>
              <p className="font-serif-editorial text-xl text-[#FFFFFF]">
                {eventConfig.date || 'To Be Announced'}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                <Clock className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </div>
              <p className="font-serif-editorial text-xl text-[#FFFFFF]">
                {eventConfig.time || 'To Be Announced'}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                <MapPin className="w-3.5 h-3.5" />
                <span>Venue &amp; Entry</span>
              </div>
              <p className="font-serif-editorial text-xl text-[#FFFFFF]">
                {eventConfig.venue || 'To Be Announced'}
                {eventConfig.ticketPrice ? ` · ${eventConfig.ticketPrice}` : ''}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {eventConfig.bookingEnabled ? (
              <button
                type="button"
                onClick={handleBookClick}
                className="px-9 py-4 bg-[#B69A5A] hover:bg-[#D8C9A5] text-[#080808] text-xs tracking-[0.28em] uppercase font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                BOOK THE LAUNCH EVENT
              </button>
            ) : (
              <p className="text-xs tracking-[0.24em] uppercase text-[#77736D]">
                Launch event registrations are currently paused.
              </p>
            )}
            <p className="text-xs text-[#77736D]">
              {currentUser
                ? 'Account active — ready to reserve.'
                : 'Sign in or create an ONYX GLOW account to reserve your invitation.'}{' '}
              Inquiries:{' '}
              <a
                href="mailto:onyxglowofficial@gmail.com"
                className="text-[#D8C9A5] hover:text-[#B69A5A] underline underline-offset-4"
              >
                onyxglowofficial@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#080808]/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <div className="relative w-full max-w-xl bg-[#0D0D0D] border border-[#B69A5A]/45 p-6 sm:p-10 text-[#F5F0E8] my-8">
            <button
              type="button"
              onClick={() => onSetModalOpen(false)}
              aria-label="Close booking dialog"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#D8C9A5] hover:text-[#FFFFFF] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {confirmation ? (
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-3 text-[#B69A5A]">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-[0.28em] uppercase">
                    Reservation Saved in Firebase
                  </span>
                </div>

                <h3
                  id="booking-modal-title"
                  className="font-serif-editorial text-3xl sm:text-4xl text-[#FFFFFF]"
                >
                  Thank You, {confirmation.fullName}
                </h3>

                <div className="border border-[#B69A5A]/30 bg-[#080808] p-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#77736D] uppercase text-[11px] tracking-[0.2em]">
                      Booking Reference
                    </span>
                    <span className="font-medium text-[#B69A5A] tabular-nums tracking-widest">
                      {confirmation.referenceNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#77736D] uppercase text-[11px] tracking-[0.2em]">
                      Guests
                    </span>
                    <span className="tabular-nums">{confirmation.guests}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#77736D] uppercase text-[11px] tracking-[0.2em]">
                      Status
                    </span>
                    <span>{confirmation.status}</span>
                  </div>
                </div>

                <p className="text-xs text-[#D8C9A5]/80 leading-relaxed">
                  Your launch event booking is saved to your ONYX GLOW account and can be reviewed
                  anytime in My Account.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onSetModalOpen(false)}
                    className="px-6 py-3 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.22em] uppercase font-medium cursor-pointer"
                  >
                    Return to ONYX GLOW
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-[#F5F0E8]/25 text-xs tracking-[0.22em] uppercase text-[#F5F0E8] hover:border-[#B69A5A] cursor-pointer"
                  >
                    New Booking
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2 pr-8">
                  <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                    Launch Event RSVP
                  </p>
                  <h3 id="booking-modal-title" className="font-serif-editorial text-3xl text-[#FFFFFF]">
                    {eventConfig.title}
                  </h3>
                  <p className="text-xs text-[#D8C9A5]/75">
                    Booking as {currentUser?.email}
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="border border-red-400/50 bg-red-950/40 px-4 py-3 text-xs text-red-200"
                  >
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="booking-fullname"
                      className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2"
                    >
                      Full Name *
                    </label>
                    <input
                      id="booking-fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="booking-email"
                      className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      id="booking-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="booking-phone"
                      className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2"
                    >
                      Phone / WhatsApp *
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+977-98XXXXXXXX"
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="booking-guests"
                      className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2"
                    >
                      Number of Guests *
                    </label>
                    <select
                      id="booking-guests"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="booking-message"
                      className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2"
                    >
                      Optional Message
                    </label>
                    <textarea
                      id="booking-message"
                      rows={3}
                      maxLength={600}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Seating preferences, press affiliation, or notes..."
                      className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-[#D8C9A5]/85">
                    <input
                      type="checkbox"
                      checked={attendanceConfirmed}
                      onChange={(e) => setAttendanceConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#B69A5A]"
                    />
                    <span>I confirm my intended attendance for the ONYX GLOW Launch Event.</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs text-[#D8C9A5]/85">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 accent-[#B69A5A]"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onSetModalOpen(false);
                          onNavigate('/event-booking-policy');
                        }}
                        className="underline text-[#B69A5A] cursor-pointer"
                      >
                        Event Booking Policy
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onSetModalOpen(false);
                          onNavigate('/privacy-policy');
                        }}
                        className="underline text-[#B69A5A] cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-[#B69A5A] hover:bg-[#D8C9A5] disabled:opacity-50 text-[#080808] text-xs tracking-[0.26em] uppercase font-medium transition-colors cursor-pointer"
                >
                  {submitting ? 'CONFIRMING...' : 'CONFIRM MY BOOKING'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
