import { db } from '@/lib/db'
import { methodLabel, formatDateHuman, to12h } from '@/lib/availability'

const BRAND = {
  name: 'Etarnity Global Innovation',
  color: '#18181B',
  accent: '#B45309',
  muted: '#6B7280',
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 20px 8px;">
          <span style="font-size:15px;font-weight:800;letter-spacing:4px;color:${BRAND.color};">ETARNITY</span>
          <span style="font-size:12px;color:${BRAND.muted};letter-spacing:1px;">&nbsp;·&nbsp;Global Innovation</span>
        </td></tr>
        <tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:36px;">
          <h1 style="margin:0 0 18px;font-size:21px;color:${BRAND.color};">${title}</h1>
          <div style="font-size:14px;line-height:1.7;color:#272B33;">${bodyHtml}</div>
          ${
            cta
              ? `<div style="margin-top:28px;"><a href="${cta.url}" style="display:inline-block;background:${BRAND.color};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:9px;">${cta.label}</a></div>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:18px 8px;font-size:12px;color:${BRAND.muted};line-height:1.6;">
          ${BRAND.name} — Connect. Schedule. Collaborate.<br/>
          This is an automated message from Etarnity Meeting.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function detailTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
    ${rows
      .map(
        ([k, v], i) => `<tr style="${i % 2 ? 'background:#F7F8FA;' : ''}">
      <td style="padding:9px 14px;font-size:12px;color:${BRAND.muted};width:160px;white-space:nowrap;">${k}</td>
      <td style="padding:9px 14px;font-size:13px;color:${BRAND.color};font-weight:600;">${v}</td></tr>`
      )
      .join('')}
  </table>`
}

type SendArgs = {
  to: string
  subject: string
  title: string
  bodyHtml: string
  cta?: { label: string; url: string }
  type: string
  bookingId?: string
}

async function send(args: SendArgs) {
  const html = layout(args.title, args.bodyHtml, args.cta)
  await db.emailLog.create({
    data: {
      toEmail: args.to,
      subject: args.subject,
      html,
      type: args.type,
      bookingId: args.bookingId ?? null,
      status: 'SENT',
    },
  })
}

function fmtSlot(date: string, start: string, end: string, tz: string): string {
  return `${formatDateHuman(date)} · ${to12h(start)} – ${to12h(end)} (${tz})`
}

export const mailer = {
  bookingSubmittedToVisitor: (
    to: string,
    name: string,
    booking: { reference: string; date: string; startTime: string; endTime: string; method: string; timezone: string },
    memberName: string
  ) =>
    send({
      to,
      subject: `Your Meeting Request – Etarnity Global Innovation`,
      title: `Your meeting request has been submitted`,
      type: 'BOOKING_SUBMITTED',
      bodyHtml: `<p>Dear ${name},</p>
        <p>Thank you for your interest in connecting with ${BRAND.name}. Your meeting request with <strong>${memberName}</strong> has been received and is now <strong>pending review</strong>. You will receive a confirmation email once the board member reviews your request.</p>
        ${detailTable([
          ['Reference ID', booking.reference],
          ['Board Member', memberName],
          ['Date & Time', fmtSlot(booking.date, booking.startTime, booking.endTime, booking.timezone)],
          ['Method', methodLabel(booking.method)],
          ['Status', 'Pending Review'],
        ])}`,
    }),

  newRequestToMember: (
    to: string,
    memberName: string,
    booking: {
      reference: string
      fullName: string
      date: string
      startTime: string
      endTime: string
      method: string
      timezone: string
      subject: string
    }
  ) =>
    send({
      to,
      subject: `New Meeting Request from ${booking.fullName} – Etarnity Meeting`,
      title: `New meeting request awaiting your review`,
      type: 'NEW_REQUEST',
      bodyHtml: `<p>Dear ${memberName},</p>
        <p>A new meeting request has been submitted through Etarnity Meeting. Please review it in your dashboard.</p>
        ${detailTable([
          ['Reference ID', booking.reference],
          ['Requester', booking.fullName],
          ['Subject', booking.subject],
          ['Date & Time', fmtSlot(booking.date, booking.startTime, booking.endTime, booking.timezone)],
          ['Method', methodLabel(booking.method)],
        ])}`,
      cta: { label: 'Open Dashboard', url: '/dashboard/requests' },
    }),

  bookingApprovedToVisitor: (
    to: string,
    name: string,
    booking: {
      reference: string
      date: string
      startTime: string
      endTime: string
      method: string
      timezone: string
      meetingLink?: string | null
    },
    memberName: string
  ) =>
    send({
      to,
      subject: `Meeting Approved – Etarnity Global Innovation`,
      title: `Your meeting has been approved`,
      type: 'BOOKING_APPROVED',
      bodyHtml: `<p>Dear ${name},</p>
        <p>Great news — <strong>${memberName}</strong> has approved your meeting request. The meeting is confirmed.</p>
        ${detailTable([
          ['Reference ID', booking.reference],
          ['Board Member', memberName],
          ['Date & Time', fmtSlot(booking.date, booking.startTime, booking.endTime, booking.timezone)],
          ['Method', methodLabel(booking.method)],
          ...(booking.meetingLink ? [['Meeting Link', booking.meetingLink] as [string, string]] : []),
        ])}
        <p>Please be ready a few minutes before the scheduled time.</p>`,
    }),

  bookingRejectedToVisitor: (
    to: string,
    name: string,
    booking: { reference: string; date: string; startTime: string; endTime: string; timezone: string },
    memberName: string,
    reason?: string | null
  ) =>
    send({
      to,
      subject: `Meeting Request Update – Etarnity Global Innovation`,
      title: `Your meeting request was not approved`,
      type: 'BOOKING_REJECTED',
      bodyHtml: `<p>Dear ${name},</p>
        <p>Unfortunately, <strong>${memberName}</strong> is unable to accept your meeting request at the requested time${
          reason ? ` for the following reason: <em>${reason}</em>` : ''
        }.</p>
        ${detailTable([
          ['Reference ID', booking.reference],
          ['Requested Time', fmtSlot(booking.date, booking.startTime, booking.endTime, booking.timezone)],
        ])}
        <p>You are welcome to pick another available time on the booking page. We appreciate your understanding.</p>`,
    }),

  bookingCancelled: (
    to: string,
    name: string,
    booking: { reference: string; date: string; startTime: string; endTime: string; timezone: string },
    memberName: string,
    by: string
  ) =>
    send({
      to,
      subject: `Meeting Cancelled – Etarnity Global Innovation`,
      title: `Meeting cancelled`,
      type: 'BOOKING_CANCELLED',
      bodyHtml: `<p>Dear ${name},</p>
        <p>The meeting below has been cancelled${by ? ` by the ${by}` : ''}.</p>
        ${detailTable([
          ['Reference ID', booking.reference],
          ['Board Member', memberName],
          ['Was Scheduled', fmtSlot(booking.date, booking.startTime, booking.endTime, booking.timezone)],
        ])}`,
    }),

  invitation: (to: string, token: string, invitedName?: string | null) =>
    send({
      to,
      subject: `You're invited to join Etarnity Meeting`,
      title: `Board member invitation`,
      type: 'INVITATION',
      bodyHtml: `<p>Dear ${invitedName || 'Colleague'},</p>
        <p>You have been invited to join <strong>${BRAND.name}</strong> as a board member on Etarnity Meeting. Please complete your registration using the invitation code below.</p>
        ${detailTable([['Invitation Code', `<span style="letter-spacing:1px;">${token}</span>`]])}
        <p>The code is valid for 14 days. Use it on the board member sign-up page.</p>`,
      cta: { label: 'Register Now', url: '/signup/etarnity/board-member' },
    }),

  passwordReset: (to: string, token: string) =>
    send({
      to,
      subject: `Reset Your Password – Etarnity Meeting`,
      title: `Password reset requested`,
      type: 'PASSWORD_RESET',
      bodyHtml: `<p>We received a request to reset the password for your Etarnity Meeting account (${to}).</p>
        ${detailTable([['Reset Code', `<span style="letter-spacing:1px;">${token}</span>`]])}
        <p>This code expires in 30 minutes. If you did not request this, you can safely ignore this email.</p>`,
    }),
}
