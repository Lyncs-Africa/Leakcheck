'use server'

import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { TYPES } from '../lib/leakcheck/data'
import type { CurrencyCode, TypeKey } from '../lib/leakcheck/data'
import type { Answers, Result } from '../lib/leakcheck/compute'

export type FormResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Something went wrong sending your details. Please try again in a moment.'

export type LeadInput = {
  name: string
  business?: string
  whatsapp: string
  email: string
  consent: boolean
  /** Honeypot: real visitors leave this empty. */
  website?: string
  source?: string
  currency: CurrencyCode
  type: TypeKey
  answers: Answers
  result: Pick<Result, 'low' | 'high' | 'list' | 'leaks'> & { topLeak: string }
  reportText: string
}

const round = (n: number | undefined) => Math.round(n || 0)

export async function submitLead(input: LeadInput): Promise<FormResult> {
  // Bot submitted the hidden field: pretend success, save nothing.
  if (input.website) return { ok: true }

  let payload: Payload
  const L = input.result.leaks
  try {
    payload = await getPayload({ config })
    await payload.create({
      collection: 'leads',
      data: {
        name: input.name,
        business: input.business || undefined,
        whatsapp: input.whatsapp,
        email: input.email,
        consent: input.consent,
        source: input.source || undefined,
        currency: input.currency,
        businessType: input.type,
        answers: {
          inquiries: input.answers.inquiries,
          value: input.answers.value,
          convert: input.answers.convert,
          speed: input.answers.speed,
          missed: input.answers.missed,
          quiet: input.answers.quiet,
          chase: input.answers.chase,
          noshows: input.answers.noshows,
          reminders: input.answers.reminders,
          unpaid: input.answers.unpaid,
          askback: input.answers.askback,
        },
        result: {
          monthlyLow: round(input.result.low),
          monthlyHigh: round(input.result.high),
          topLeak: input.result.topLeak,
          leakUnanswered: round(L.missed),
          leakSlowReplies: round(L.speed),
          leakQuotes: round(L.quotes),
          leakNoShows: round(L.noshow),
          leakPayments: round(L.payments),
          leakRepeat: round(L.repeat),
        },
        reportText: input.reportText,
        status: 'new',
      } as never,
    })
  } catch (error) {
    console.error('Failed to save lead', error)
    return { ok: false, error: GENERIC_ERROR }
  }

  // The lead is safely stored. The two integrations below are best-effort: a failure in
  // either must never fail the submission, so each is awaited inside its own try/catch.
  await sendEmails(payload, input)
  await mirrorToSheet(input)

  return { ok: true }
}

/** Emails the report to the lead, and a new-lead notification to Henry. Off unless SMTP is set. */
async function sendEmails(payload: Payload, input: LeadInput): Promise<void> {
  if (!process.env.SMTP_HOST) return
  const typeName = TYPES[input.type].name
  try {
    await payload.sendEmail({
      to: input.email,
      subject: 'Your Leakcheck results',
      text: input.reportText,
    })
  } catch (error) {
    console.error('Failed to email the lead their report', error)
  }

  const notifyTo = process.env.EMAIL_TO
  if (!notifyTo) return
  try {
    const lines = [
      `New Leakcheck lead.`,
      '',
      `Name: ${input.name}`,
      input.business ? `Business: ${input.business}` : null,
      `Type: ${typeName}`,
      `WhatsApp: ${input.whatsapp}`,
      `Email: ${input.email}`,
      `Estimate: ${input.currency} ${round(input.result.low)} to ${round(input.result.high)} a month`,
      `Biggest leak: ${input.result.topLeak || 'none found'}`,
      input.source ? `Source: ${input.source}` : null,
    ].filter(Boolean)
    await payload.sendEmail({
      to: notifyTo,
      subject: `New Leakcheck lead: ${input.name}${input.business ? ` (${input.business})` : ''}`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send new-lead notification', error)
  }
}

/** Appends the lead to a Google Sheet via an Apps Script web app. Off unless the URL is set. */
async function mirrorToSheet(input: LeadInput): Promise<void> {
  const url = process.env.SHEET_WEBHOOK_URL
  if (!url) return
  const a = input.answers
  const L = input.result.leaks
  const row = {
    timestamp: new Date().toISOString(),
    source: input.source || '',
    name: input.name,
    business: input.business || '',
    whatsapp: input.whatsapp,
    email: input.email,
    consent: input.consent ? 'yes' : 'no',
    currency: input.currency,
    type: TYPES[input.type].name,
    inquiries: a.inquiries,
    value: a.value,
    convert_out_of_10: a.convert,
    reply_speed: a.speed,
    slip_through: a.missed,
    quiet_quotes: a.quiet,
    follow_up: a.chase,
    no_shows: a.noshows,
    reminders: a.reminders,
    unpaid: a.unpaid,
    ask_back: a.askback,
    monthly_low: round(input.result.low),
    monthly_high: round(input.result.high),
    top_leak: input.result.topLeak,
    leak_unanswered: round(L.missed),
    leak_slow_replies: round(L.speed),
    leak_quotes: round(L.quotes),
    leak_no_shows: round(L.noshow),
    leak_payments: round(L.payments),
    leak_repeat: round(L.repeat),
    report_text: input.reportText,
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
  } catch (error) {
    console.error('Failed to mirror lead to Google Sheet', error)
  }
}
