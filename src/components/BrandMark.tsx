import { useState } from 'react';

interface BrandMarkProps {
  logoUrl?: string;
  variant?: 'dark' | 'light';
  className?: string;
}

export function BrandMark({ logoUrl, variant = 'dark', className = '' }: BrandMarkProps) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt="ONYX GLOW"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`h-10 md:h-12 w-auto object-contain select-none ${
          variant === 'dark' ? 'invert mix-blend-screen' : 'mix-blend-multiply'
        } ${className}`}
      />
    );
  }

  return (
    <span
      className={`font-serif-editorial text-xl md:text-2xl tracking-[0.34em] uppercase font-medium text-[#F5F0E8] whitespace-nowrap shrink-0 select-none ${className}`}
    >
      ONYX GLOW
    </span>
  );
}

interface EditorialImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function EditorialImage({ src, alt, fallbackTitle, className = '' }: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-[#121212] border border-[#B69A5A]/25 flex flex-col items-center justify-center p-8 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="font-serif-editorial text-lg tracking-[0.22em] uppercase text-[#D8C9A5]">
          {fallbackTitle}
        </span>
        <span className="mt-2 text-[11px] tracking-[0.2em] uppercase text-[#77736D]">
          Original Brand Asset Placeholder
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
