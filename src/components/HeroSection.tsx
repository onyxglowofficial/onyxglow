import { EditorialImage } from './BrandMark';

interface HeroSectionProps {
  coverUrl: string;
  subtitle: string;
  statement: string;
  onDiscoverStory: () => void;
}

export function HeroSection({
  coverUrl,
  subtitle,
  statement,
  onDiscoverStory,
}: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative w-full bg-[#080808] pt-16 md:pt-20 flex flex-col justify-between overflow-hidden"
    >
      {/* Full-width Campaign Cover Showcase preserving full subject and campaign composition */}
      <div className="relative w-full bg-[#080808]">
        <div className="max-w-[1600px] mx-auto relative">
          <EditorialImage
            src={coverUrl}
            alt="ONYX GLOW Campaign — Contemporary Nepali Luxury Women's Fashion"
            fallbackTitle="ONYX GLOW CAMPAIGN"
            className="w-full h-auto max-h-[82vh] object-contain md:object-cover object-center mx-auto block"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#080808] to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Architectural Editorial Campaign Bar below cover artwork (prevents overlapping cover typography) */}
      <div className="relative z-10 w-full bg-[#080808] border-t border-[#B69A5A]/20 border-b border-[#B69A5A]/20">
        <div className="max-w-[1320px] mx-auto px-6 sm:px-10 py-10 md:py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#B69A5A]">
              <span>ONYX GLOW</span>
              <span aria-hidden="true">·</span>
              <span>{subtitle || 'THE ART OF NEPALI HERITAGE'}</span>
              <span aria-hidden="true">·</span>
              <span>MADE IN NEPAL</span>
            </div>

            <p className="font-serif-editorial italic text-2xl sm:text-3xl text-[#F5F0E8] leading-snug text-balance">
              &ldquo;{statement || "Where traditional Nepali texture meets contemporary women's fashion."}&rdquo;
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onDiscoverStory}
              className="px-8 py-4 border border-[#B69A5A] bg-[#080808] hover:bg-[#B69A5A] text-[#F5F0E8] hover:text-[#080808] text-[11px] tracking-[0.28em] uppercase font-medium transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              DISCOVER OUR STORY
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
