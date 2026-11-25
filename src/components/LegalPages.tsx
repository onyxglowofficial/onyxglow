import { ArrowLeft } from 'lucide-react';
import type { AppRoute } from '../types';

interface LegalPageProps {
  page: Extract<AppRoute, '/privacy-policy' | '/terms' | '/event-booking-policy'>;
  onBack: () => void;
}

export function LegalPage({ page, onBack }: LegalPageProps) {
  const content = {
    '/privacy-policy': {
      kicker: 'Draft Legal Notice · Review Recommended Before Public Release',
      title: 'PRIVACY POLICY',
      sections: [
        {
          heading: '1. Information We Collect',
          body: 'ONYX GLOW collects personal details you voluntarily provide when creating a customer account or registering for our launch event, including your full name, email address, phone or WhatsApp number, guest count, and optional correspondence.',
        },
        {
          heading: '2. How Your Information Is Used',
          body: 'Your information is used strictly to manage your customer profile, process and confirm launch event registrations, send transactional notifications, and respond to direct client inquiries.',
        },
        {
          heading: '3. Data Protection & Storage',
          body: 'Account passwords are protected using salted cryptographic hashing and are never stored in plain text. Access to booking records and customer directories is restricted to authorized ONYX GLOW administrators.',
        },
        {
          heading: '4. Contact for Privacy Requests',
          body: 'To request access, correction, or deletion of your personal data, contact ONYX GLOW at onyxglowofficial@gmail.com or +977-9742930399 (Kakarbhitta, Jhapa, Nepal).',
        },
      ],
    },
    '/terms': {
      kicker: 'Draft Legal Notice · Review Recommended Before Public Release',
      title: 'TERMS AND CONDITIONS',
      sections: [
        {
          heading: '1. Brand & Intellectual Property',
          body: 'All ONYX GLOW trademarks, editorial photography, brand storytelling, garment silhouettes, and website design elements remain the exclusive intellectual property of ONYX GLOW (Nepal).',
        },
        {
          heading: '2. Preview Catalogue & Pricing Notice',
          body: 'Collection entries marked as Sample Placeholders represent upcoming women\'s fashion categories and are provided for preview purposes only until official garment specifications, pricing, and availability are announced.',
        },
        {
          heading: '3. Customer Accounts',
          body: 'Customers are responsible for maintaining the confidentiality of their account credentials. ONYX GLOW reserves the right to suspend accounts that violate house policies or submit fraudulent registrations.',
        },
        {
          heading: '4. Governing Jurisdiction',
          body: 'These draft terms are subject to formal legal review and shall be governed in accordance with applicable laws of Nepal.',
        },
      ],
    },
    '/event-booking-policy': {
      kicker: 'Draft Legal Notice · Review Recommended Before Public Release',
      title: 'EVENT BOOKING POLICY',
      sections: [
        {
          heading: '1. Open Guest Registration',
          body: 'Guests may register for the ONYX GLOW Launch Event without creating a customer account. Each registration generates a unique booking reference number.',
        },
        {
          heading: '2. Confirmation & Capacity',
          body: 'Submitted registrations initially enter Pending status and may be confirmed or updated by ONYX GLOW administration subject to venue capacity and finalized event schedule.',
        },
        {
          heading: '3. Cancellations & Amendments',
          body: 'If you need to amend guest numbers or cancel your attendance, please contact ONYX GLOW directly at onyxglowofficial@gmail.com or +977-9742930399 with your booking reference number.',
        },
      ],
    },
  }[page];

  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#080808] pt-32 pb-24">
      <div className="max-w-[820px] mx-auto px-6 sm:px-10 space-y-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#77736D] hover:text-[#080808] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to ONYX GLOW</span>
        </button>

        <div className="space-y-4 border-b border-[#080808]/15 pb-8">
          <p className="text-[11px] tracking-[0.24em] uppercase text-[#B69A5A]">
            {content.kicker}
          </p>
          <h1 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[#080808]">
            {content.title}
          </h1>
          <p className="text-xs text-[#77736D]">
            Draft policy prepared for legal review prior to commercial publication.
          </p>
        </div>

        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading} className="space-y-2.5">
              <h2 className="font-serif-editorial text-2xl text-[#080808]">{section.heading}</h2>
              <p className="text-sm text-[#080808]/80 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
