import crypto from 'node:crypto';
import type { StoredBooking, StoredEmailLog } from './store.ts';

export interface EmailDispatchResult {
  sent: boolean;
  status: 'sent' | 'queued_unconfigured' | 'failed';
  detail: string;
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function dispatchEmail(params: {
  to: string;
  subject: string;
  html: string;
  type: StoredEmailLog['type'];
}): Promise<{ log: StoredEmailLog; result: EmailDispatchResult }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  if (!apiKey || !from) {
    const detail =
      'Transactional email credentials (RESEND_API_KEY / EMAIL_FROM) not yet configured. Notification logged for dispatch once configured.';
    const log: StoredEmailLog = {
      id,
      to: params.to,
      subject: params.subject,
      type: params.type,
      status: 'queued_unconfigured',
      detail,
      createdAt: now,
    };
    return {
      log,
      result: { sent: false, status: 'queued_unconfigured', detail },
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const detail = `Email provider returned HTTP ${response.status}: ${errorText.slice(0, 180)}`;
      return {
        log: {
          id,
          to: params.to,
          subject: params.subject,
          type: params.type,
          status: 'failed',
          detail,
          createdAt: now,
        },
        result: { sent: false, status: 'failed', detail },
      };
    }

    const detail = 'Delivered via Resend transactional email service.';
    return {
      log: {
        id,
        to: params.to,
        subject: params.subject,
        type: params.type,
        status: 'sent',
        detail,
        createdAt: now,
      },
      result: { sent: true, status: 'sent', detail },
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error sending email';
    return {
      log: {
        id,
        to: params.to,
        subject: params.subject,
        type: params.type,
        status: 'failed',
        detail,
        createdAt: now,
      },
      result: { sent: false, status: 'failed', detail },
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildBookingConfirmationHtml(booking: StoredBooking, eventTitle: string): string {
  return `
    <div style="background:#080808;color:#F5F0E8;padding:40px 24px;font-family:Georgia,serif;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #B69A5A;padding:32px;">
        <p style="letter-spacing:0.25em;font-size:11px;color:#B69A5A;text-transform:uppercase;margin:0 0 12px;">ONYX GLOW · NEPAL</p>
        <h1 style="font-size:26px;font-weight:400;margin:0 0 18px;color:#FFFFFF;">Launch Event Registration Received</h1>
        <p style="font-size:14px;line-height:1.7;color:#D8C9A5;">Dear ${escapeHtml(booking.fullName)},</p>
        <p style="font-size:14px;line-height:1.7;color:#F5F0E8;">Thank you for registering for <strong>${escapeHtml(eventTitle)}</strong>.</p>
        <div style="border-top:1px solid rgba(182,154,90,0.35);border-bottom:1px solid rgba(182,154,90,0.35);padding:16px 0;margin:20px 0;">
          <p style="margin:4px 0;font-size:13px;">Reference Number: <strong style="color:#B69A5A;">${escapeHtml(booking.referenceNumber)}</strong></p>
          <p style="margin:4px 0;font-size:13px;">Guests: <strong>${booking.guests}</strong></p>
          <p style="margin:4px 0;font-size:13px;">Status: <strong>${escapeHtml(booking.status)}</strong></p>
        </div>
        <p style="font-size:12px;color:#77736D;">ONYX GLOW · Kakarbhitta, Jhapa, Nepal · onyxglowofficial@gmail.com</p>
      </div>
    </div>
  `;
}

export function buildAdminBookingNotificationHtml(booking: StoredBooking): string {
  return `
    <div style="font-family:Arial,sans-serif;padding:24px;color:#080808;">
      <h2>New ONYX GLOW Launch Event Booking</h2>
      <p><strong>Reference:</strong> ${escapeHtml(booking.referenceNumber)}</p>
      <p><strong>Guest Name:</strong> ${escapeHtml(booking.fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(booking.phone)}</p>
      <p><strong>Number of Guests:</strong> ${booking.guests}</p>
      <p><strong>Status:</strong> ${escapeHtml(booking.status)}</p>
      ${booking.message ? `<p><strong>Message:</strong> ${escapeHtml(booking.message)}</p>` : ''}
    </div>
  `;
}
