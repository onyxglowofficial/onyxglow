import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { AppRoute } from '../types';

interface NavbarProps {
  logoUrl: string;
  currentRoute: AppRoute;
  bagCount: number;
  isSignedIn: boolean;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
  onOpenSearch: () => void;
  onOpenAccount: () => void;
  onOpenBag: () => void;
}

export function Navbar({
  logoUrl,
  currentRoute,
  bagCount,
  isSignedIn,
  onNavigate,
  onOpenSearch,
  onOpenAccount,
  onOpenBag,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isTransparent = currentRoute === '/' && !scrolled && !mobileMenuOpen;

  const navItems: Array<{ label: string; route: AppRoute; sectionId?: string }> = [
    { label: 'WOMEN', route: '/women' },
    { label: 'OUR STORY', route: '/', sectionId: 'our-story' },
    { label: 'HERITAGE', route: '/', sectionId: 'heritage' },
    { label: 'PARTNERSHIP', route: '/', sectionId: 'partnership' },
    { label: 'CONTACT', route: '/', sectionId: 'contact' },
  ];

  const handleLinkClick = (route: AppRoute, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(route, sectionId);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
          isTransparent
            ? 'bg-gradient-to-b from-[#080808]/75 to-transparent border-b border-transparent'
            : 'bg-[#080808]/95 backdrop-blur-md border-b border-[#B69A5A]/20'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Left Navigation (Desktop) / Hamburger (Mobile) */}
          <div className="flex items-center lg:flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#F5F0E8] hover:text-[#B69A5A] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-7" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive =
                  item.route === '/women'
                    ? currentRoute === '/women'
                    : false;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleLinkClick(item.route, item.sectionId)}
                    className={`relative text-[11px] tracking-[0.22em] font-medium whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#B69A5A]'
                        : 'text-[#F5F0E8]/90 hover:text-[#B69A5A]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Center Brand Logo */}
          <button
            type="button"
            onClick={() => handleLinkClick('/', 'hero')}
            aria-label="ONYX GLOW Home"
            className="flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-1 focus-visible:outline-[#B69A5A]"
          >
            <BrandMark logoUrl={logoUrl} />
          </button>

          {/* Right Functional Icons */}
          <div className="flex items-center justify-end gap-1 sm:gap-3 lg:flex-1 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search collections and stories"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#F5F0E8]/90 hover:text-[#B69A5A] transition-colors cursor-pointer"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={onOpenAccount}
              aria-label={isSignedIn ? 'My Account' : 'Sign in or create account'}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#F5F0E8]/90 hover:text-[#B69A5A] transition-colors cursor-pointer relative"
            >
              <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {isSignedIn && (
                <span className="sr-only">Signed in</span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenBag}
              aria-label="Selection Bag"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1.5 text-[#F5F0E8]/90 hover:text-[#B69A5A] transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {bagCount > 0 && (
                <span className="text-[11px] tabular-nums tracking-wider text-[#B69A5A]">
                  {bagCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-[#080808] pt-24 pb-10 px-6 flex flex-col justify-between lg:hidden overflow-y-auto">
          <nav className="flex flex-col divide-y divide-[#F5F0E8]/10" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleLinkClick(item.route, item.sectionId)}
                className="py-5 text-left text-sm tracking-[0.26em] text-[#F5F0E8] hover:text-[#B69A5A] transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccount();
              }}
              className="py-5 text-left text-sm tracking-[0.26em] text-[#D8C9A5] hover:text-[#B69A5A] transition-colors cursor-pointer"
            >
              {isSignedIn ? 'MY ACCOUNT' : 'LOGIN / REGISTER'}
            </button>
          </nav>

          <div className="pt-8 border-t border-[#B69A5A]/20 text-xs text-[#77736D] space-y-1">
            <p className="tracking-[0.2em] uppercase text-[#B69A5A]">MADE IN NEPAL</p>
            <p>Kakarbhitta, Jhapa, Nepal</p>
          </div>
        </div>
      )}
    </>
  );
}
