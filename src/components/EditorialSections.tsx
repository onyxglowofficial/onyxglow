import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { EditorialImage } from './BrandMark';
import type { SiteContent } from '../types';

interface BrandStoryProps {
  siteContent: SiteContent;
}

export function BrandIntroductionSection({ siteContent }: BrandStoryProps) {
  return (
    <section
      id="our-story"
      className="bg-[#F5F0E8] text-[#080808] py-24 md:py-32 border-b border-[#080808]/10"
    >
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#77736D]">
              Our Story · Nepal
            </p>
            <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#080808] leading-[1.08] text-balance">
              {siteContent.brandIntroHeading || 'MORE THAN FASHION. A CULTURAL IDENTITY.'}
            </h2>
          </div>

          <div className="w-16 h-px bg-[#B69A5A]" />

          <div className="space-y-5 text-sm sm:text-base leading-relaxed text-[#080808]/80 max-w-xl">
            <p>{siteContent.brandIntroText}</p>
            <p>
              ONYX GLOW is more than a fashion brand. It represents our relationship with Nepal, its
              people, its culture and the fabrics created through generations of craftsmanship.
            </p>
            <p>
              Our inspiration comes from the unique beauty of Nepali textiles, especially traditional
              Dhaka patterns. We aim to bring the authenticity of Nepali heritage into contemporary
              women&apos;s fashion. Every design represents a connection between tradition and modern
              expression. Proudly made in Nepal.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tracking-[0.22em] uppercase text-[#77736D]">
            <span>Rooted in Nepal</span>
            <span aria-hidden="true">·</span>
            <span>Inspired by Heritage</span>
            <span aria-hidden="true">·</span>
            <span>Designed for the Modern Woman</span>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="h-full min-h-[460px] lg:min-h-[620px] overflow-hidden bg-[#080808]">
            <EditorialImage
              src={siteContent.assets.brandIntroUrl}
              alt="ONYX GLOW Contemporary Women's Silhouette with Traditional Dhaka Trim"
              fallbackTitle="Brand Story Portrait"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function NepalHeritageSection({ siteContent }: BrandStoryProps) {
  const regions = [
    {
      title: 'HIMALAYAN REGION',
      subtitle: 'High Altitude Stillness',
      image: siteContent.assets.regionHimalayanUrl,
      description:
        'Representing the majestic mountains, natural beauty, enduring strength, and sacred cultural heritage of northern Nepal.',
    },
    {
      title: 'HILLY REGION',
      subtitle: 'Artisanal Terraces',
      image: siteContent.assets.regionHillyUrl,
      description:
        'Representing lush green hills, historic villages, traditional lifestyles, and the artistic richness of Nepali weaving communities.',
    },
    {
      title: 'TERAI REGION',
      subtitle: 'Sunlit Southern Plains',
      image: siteContent.assets.regionTeraiUrl,
      description:
        'Representing the fertile plains, deep cultural diversity, traditional attire, and vibrant living heritage of southern Nepal.',
    },
  ];

  return (
    <section id="heritage" className="bg-[#080808] text-[#F5F0E8] py-24 md:py-32">
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10">
        <div className="max-w-2xl mb-16 space-y-4">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#B69A5A]">
            Three Cultural Landscapes
          </p>
          <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#FFFFFF] tracking-tight text-balance">
            THE BEAUTY OF NEPAL
          </h2>
          <p className="text-sm sm:text-base text-[#D8C9A5]/80 leading-relaxed">
            From snow-crowned summits to terraced hills and golden southern plains, every region
            shapes the visual language and textile soul of ONYX GLOW.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {regions.map((region) => (
            <article key={region.title} className="group flex flex-col">
              <div className="aspect-[3/4] overflow-hidden bg-[#121212] border border-[#B69A5A]/20">
                <EditorialImage
                  src={region.image}
                  alt={`${region.title} — Nepal Cultural Inspiration`}
                  fallbackTitle={region.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="pt-6 space-y-2.5">
                <p className="text-[11px] tracking-[0.25em] uppercase text-[#B69A5A]">
                  {region.subtitle}
                </p>
                <h3 className="font-serif-editorial text-2xl tracking-[0.08em] text-[#FFFFFF]">
                  {region.title}
                </h3>
                <p className="text-sm text-[#D8C9A5]/75 leading-relaxed">
                  {region.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DhakaTextileSection({ siteContent }: BrandStoryProps) {
  return (
    <section className="bg-[#101010] text-[#F5F0E8] py-24 md:py-32 border-t border-b border-[#B69A5A]/20">
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#B69A5A]">
              Artisanal Textile Craft
            </p>
            <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#FFFFFF] text-balance">
              THE BEAUTY OF NEPALI DHAKA
            </h2>
            <p className="font-serif-editorial italic text-2xl sm:text-3xl text-[#D8C9A5] leading-snug text-balance">
              &ldquo;Every pattern tells a story. Every thread carries a piece of our heritage.&rdquo;
            </p>
          </div>
          <div className="lg:col-span-5 space-y-4 text-sm sm:text-base text-[#F5F0E8]/80 leading-relaxed">
            <p>
              Dhaka is one of Nepal&apos;s most recognisable traditional textile identities. Its
              distinctive geometric patterns and rich weave represent generations of creativity and
              handloom craftsmanship.
            </p>
            <p>
              ONYX GLOW celebrates this living heritage by translating traditional Nepali textile
              inspiration into disciplined, contemporary women&apos;s silhouettes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-8 aspect-[4/3] lg:aspect-auto lg:min-h-[500px] overflow-hidden bg-[#080808] border border-[#B69A5A]/20">
            <EditorialImage
              src={siteContent.assets.dhakaMainUrl}
              alt="Close-up handwoven Nepali Dhaka textile geometric diamond motif"
              fallbackTitle="Nepali Dhaka Textile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-4 flex flex-col justify-between bg-[#080808] border border-[#B69A5A]/20 p-8 sm:p-10 space-y-8">
            <div className="aspect-[4/3] overflow-hidden bg-[#121212]">
              <EditorialImage
                src={siteContent.assets.dhakaDetailUrl}
                alt="Traditional Dhaka detail tailored into modern outerwear"
                fallbackTitle="Dhaka Tailoring Detail"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="space-y-3">
              <p className="text-[11px] tracking-[0.26em] uppercase text-[#B69A5A]">
                Texture &amp; Proportion
              </p>
              <p className="text-sm text-[#D8C9A5]/85 leading-relaxed">
                Hand-guided geometric motifs balanced against structured black wool, raw silk, and
                warm ivory cotton — crafted without excess ornamentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandPhilosophySection() {
  const pillars = [
    {
      index: '01',
      title: 'HERITAGE',
      description: 'Inspired by the cultural identity and traditional handwoven textiles of Nepal.',
    },
    {
      index: '02',
      title: 'CONTEMPORARY DESIGN',
      description:
        "Traditional inspiration thoughtfully transformed into modern women's fashion silhouettes.",
    },
    {
      index: '03',
      title: 'MADE IN NEPAL',
      description:
        'Proudly connected to Nepali craftsmanship, creative stewardship, and cultural identity.',
    },
  ];

  return (
    <section className="bg-[#F5F0E8] text-[#080808] py-24 md:py-28">
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[#080808]/15">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#77736D]">
              The House Philosophy
            </p>
            <h2 className="mt-3 font-serif-editorial text-3xl sm:text-4xl md:text-5xl font-normal text-[#080808]">
              OUTFIT FOR WOMEN&apos;S WITH NEPALI TEXTURE
            </h2>
          </div>
          <p className="text-xs tracking-[0.22em] uppercase text-[#77736D]">
            Three Founding Principles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#080808]/15 pt-10">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="py-6 md:py-4 md:px-8 first:md:pl-0 last:md:pr-0 space-y-4">
              <span className="font-serif-editorial text-2xl text-[#B69A5A] tabular-nums block">
                {pillar.index}.
              </span>
              <h3 className="text-sm tracking-[0.24em] uppercase font-medium text-[#080808]">
                {pillar.title}
              </h3>
              <p className="text-sm text-[#080808]/75 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnershipSection() {
  const leadership = [
    {
      role: 'FOUNDER & CEO',
      name: 'Yubraj Gahatraj',
    },
    {
      role: 'PARTNERSHIP',
      name: 'Kabiraj Puri / Manoj Poudel',
    },
    {
      role: 'CHAIRMAN',
      name: 'Khusi Lohar',
    },
  ];

  return (
    <section
      id="partnership"
      className="bg-[#080808] text-[#F5F0E8] py-24 md:py-32 border-t border-[#B69A5A]/20"
    >
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10">
        <div className="max-w-2xl mb-16 space-y-4">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#B69A5A]">
            Leadership &amp; Stewardship
          </p>
          <h2 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[#FFFFFF] text-balance">
            THE PEOPLE BEHIND ONYX GLOW
          </h2>
          <p className="text-sm text-[#D8C9A5]/75 leading-relaxed">
            Guided by shared commitment to Nepali creative stewardship and international luxury
            standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {leadership.map((leader) => (
            <div
              key={leader.role}
              className="border border-[#B69A5A]/25 bg-[#0F0F0F] p-8 sm:p-10 flex flex-col justify-between min-h-[210px]"
            >
              <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                {leader.role}
              </p>
              <div className="pt-10">
                <div className="w-10 h-px bg-[#B69A5A]/50 mb-5" />
                <h3 className="font-serif-editorial text-3xl font-normal text-[#FFFFFF] tracking-wide">
                  {leader.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComingSoonSection({ siteContent }: BrandStoryProps) {
  return (
    <section className="relative bg-[#080808] text-[#F5F0E8] py-28 md:py-36 overflow-hidden border-t border-[#B69A5A]/20">
      <div className="absolute inset-0 opacity-25">
        <EditorialImage
          src={siteContent.assets.dhakaMainUrl}
          alt="Nepali Dhaka texture backdrop"
          fallbackTitle="ONYX GLOW"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#080808]/75" aria-hidden="true" />
      </div>

      <div className="relative z-10 max-w-[960px] mx-auto px-6 text-center space-y-6">
        <p className="text-[11px] tracking-[0.35em] uppercase text-[#B69A5A]">
          ONYX GLOW · COMING SOON
        </p>
        <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#FFFFFF] text-balance">
          A NEW EXPRESSION OF NEPALI FASHION.
        </h2>
        <p className="font-serif-editorial italic text-xl sm:text-2xl text-[#D8C9A5]">
          &ldquo;{siteContent.comingSoonText || 'Rooted in heritage. Created for the future.'}&rdquo;
        </p>
      </div>
    </section>
  );
}

export function ContactSection({ siteContent }: BrandStoryProps) {
  return (
    <section
      id="contact"
      className="bg-[#F5F0E8] text-[#080808] py-24 md:py-32 border-t border-[#080808]/10"
    >
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-5">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#77736D]">
            House Inquiries
          </p>
          <h2 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[#080808] text-balance">
            CONNECT WITH ONYX GLOW
          </h2>
          <p className="text-sm text-[#080808]/75 leading-relaxed">
            For press inquiries, private appointments, launch collaborations, and house correspondence
            in Nepal and internationally.
          </p>
          <div className="pt-4 border-t border-[#080808]/15 text-xs tracking-[0.18em] uppercase text-[#77736D]">
            Founder &amp; CEO · <span className="text-[#080808] font-medium">Yubraj Gahatraj</span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border border-[#080808]/15 bg-[#FFFFFF] p-7 space-y-3">
            <MapPin className="w-5 h-5 text-[#B69A5A]" strokeWidth={1.5} />
            <p className="text-[11px] tracking-[0.24em] uppercase text-[#77736D]">Location</p>
            <p className="font-serif-editorial text-2xl text-[#080808]">
              Kakarbhitta, Jhapa, Nepal
            </p>
          </div>

          <a
            href="mailto:onyxglowofficial@gmail.com"
            className="border border-[#080808]/15 bg-[#FFFFFF] hover:border-[#B69A5A] p-7 space-y-3 transition-colors block"
          >
            <Mail className="w-5 h-5 text-[#B69A5A]" strokeWidth={1.5} />
            <p className="text-[11px] tracking-[0.24em] uppercase text-[#77736D]">Email</p>
            <p className="font-serif-editorial text-2xl text-[#080808] break-all">
              onyxglowofficial@gmail.com
            </p>
          </a>

          <a
            href="tel:+9779742930399"
            className="border border-[#080808]/15 bg-[#FFFFFF] hover:border-[#B69A5A] p-7 space-y-3 transition-colors block"
          >
            <Phone className="w-5 h-5 text-[#B69A5A]" strokeWidth={1.5} />
            <p className="text-[11px] tracking-[0.24em] uppercase text-[#77736D]">Telephone</p>
            <p className="font-serif-editorial text-2xl text-[#080808] tabular-nums">
              +977-9742930399
            </p>
          </a>

          <a
            href="https://wa.me/9779742930399"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#080808]/15 bg-[#FFFFFF] hover:border-[#B69A5A] p-7 space-y-3 transition-colors block"
          >
            <MessageCircle className="w-5 h-5 text-[#B69A5A]" strokeWidth={1.5} />
            <p className="text-[11px] tracking-[0.24em] uppercase text-[#77736D]">WhatsApp Direct</p>
            <p className="font-serif-editorial text-2xl text-[#080808] tabular-nums">
              +977-9742930399
            </p>
          </a>

          <div className="sm:col-span-2 border border-[#080808]/15 bg-[#FFFFFF] p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.24em] uppercase text-[#77736D]">
                Official Social Channels
              </p>
              <p className="mt-1 text-sm text-[#080808]/75">
                Official links configurable in the House Administration portal.
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs tracking-[0.2em] uppercase">
              {siteContent.instagramUrl ? (
                <a
                  href={siteContent.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#080808] hover:text-[#B69A5A] underline underline-offset-4"
                >
                  Instagram
                </a>
              ) : (
                <span className="text-[#77736D]">Instagram (Placeholder)</span>
              )}
              {siteContent.facebookUrl ? (
                <a
                  href={siteContent.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#080808] hover:text-[#B69A5A] underline underline-offset-4"
                >
                  Facebook
                </a>
              ) : (
                <span className="text-[#77736D]">Facebook (Placeholder)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
