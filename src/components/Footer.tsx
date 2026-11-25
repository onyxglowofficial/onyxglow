import { BrandMark } from './BrandMark';
import type { AppRoute } from '../types';

interface FooterProps {
  logoUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
  onOpenAccount: () => void;
}

export function Footer({
  logoUrl,
  instagramUrl,
  facebookUrl,
  onNavigate,
  onOpenAccount,
}: FooterProps) {
  return (
    <footer className="bg-[#080808] border-t border-[#B69A5A]/25 text-[#F5F0E8]">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-14 border-b border-[#F5F0E8]/10">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-5">
            <BrandMark logoUrl={logoUrl} />
            <p className="text-xs tracking-[0.24em] uppercase text-[#B69A5A]">
              OUTFIT FOR WOMEN&apos;S WITH NEPALI TEXTURE
            </p>
            <p className="text-sm text-[#D8C9A5]/80 leading-relaxed max-w-sm">
              Rooted in Nepal. Inspired by heritage. Designed for the modern woman.
            </p>
          </div>

          {/* House Navigation */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-[11px] tracking-[0.25em] uppercase text-[#B69A5A] mb-4">
              The House
            </h3>
            <ul className="space-y-2.5 text-xs tracking-[0.16em] uppercase text-[#F5F0E8]/80">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/women')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Women
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'our-story')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Our Story
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'heritage')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Heritage
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'contact')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Client & Legal */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-[11px] tracking-[0.25em] uppercase text-[#B69A5A] mb-4">
              Client &amp; Legal
            </h3>
            <ul className="space-y-2.5 text-xs tracking-[0.16em] uppercase text-[#F5F0E8]/80">
              <li>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Login / My Account
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/privacy-policy')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/terms')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/event-booking-policy')}
                  className="hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  Event Booking Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Social & Atelier Portal */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-[11px] tracking-[0.25em] uppercase text-[#B69A5A] mb-4">
              Connect
            </h3>
            <ul className="space-y-2.5 text-xs tracking-[0.16em] uppercase text-[#F5F0E8]/80">
              <li>
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#B69A5A] transition-colors"
                  >
                    Instagram
                  </a>
                ) : (
                  <span className="text-[#77736D]">Instagram · Official Profile Pending</span>
                )}
              </li>
              <li>
                {facebookUrl ? (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#B69A5A] transition-colors"
                  >
                    Facebook
                  </a>
                ) : (
                  <span className="text-[#77736D]">Facebook · Official Profile Pending</span>
                )}
              </li>
              <li className="pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className="text-[11px] tracking-[0.2em] uppercase text-[#77736D] hover:text-[#B69A5A] transition-colors cursor-pointer"
                >
                  House Administration
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] tracking-[0.22em] uppercase text-[#77736D]">
          <p>© 2026 ONYX GLOW. ALL RIGHTS RESERVED.</p>
          <p>PROUDLY MADE IN NEPAL</p>
        </div>
      </div>
    </footer>
  );
}
