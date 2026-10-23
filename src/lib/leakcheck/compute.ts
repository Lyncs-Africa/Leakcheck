import { A, CURRENCIES, LEAKS, TYPES } from './data'
import type { CurrencyCode, LeakKey, TypeKey } from './data'

export type Answers = {
  inquiries: number
  value: number
  convert: number
  speed: string
  missed: string
  quiet: number
  chase: string
  noshows: number
  reminders: string
  unpaid: number
  askback: string
}

export type LeakLine = { key: LeakKey; amount: number }

export type Result = {
  leaks: Partial<Record<LeakKey, number>>
  list: LeakLine[]
  high: number
  low: number
  revenue: number
  customers: number
  capped: boolean
}

export function parseNum(v: unknown): number {
  if (v == null) return NaN
  const s = String(v).replace(/[^0-9.]/g, '')
  if (s === '' || s === '.') return NaN
  return parseFloat(s)
}

export function nice(x: number): number {
  if (!(x > 0)) return 0
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1))
  return Math.round(x / step) * step
}

export function money(x: number, cur: CurrencyCode): string {
  const c = CURRENCIES[cur]
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(nice(x))
  } catch {
    return c.symbol + Math.round(nice(x)).toLocaleString()
  }
}

export function compute(a: Answers, typeKey: TypeKey): Result {
  const T = TYPES[typeKey]
  const c = a.convert / 10
  const v = a.value
  const has = (k: LeakKey) => T.leaks.indexOf(k) !== -1
  const missRate = A.missed[a.missed]
  const customers = a.inquiries * c
  const revenue = customers * v
  const leaks: Partial<Record<LeakKey, number>> = {}

  leaks.missed = a.inquiries * missRate * c * v
  leaks.speed = a.inquiries * (1 - missRate) * c * v * A.speed[a.speed]
  if (has('quotes')) leaks.quotes = a.quiet * A.quote[a.chase] * v
  if (has('noshow')) leaks.noshow = a.noshows * v * A.noshow[a.reminders]
  if (has('payments')) leaks.payments = a.unpaid * A.payment
  leaks.repeat = customers * v * A.repeat[a.askback]

  let raw = 0
  ;(Object.keys(leaks) as LeakKey[]).forEach((k) => {
    raw += leaks[k] || 0
  })

  let scale = 1
  if (revenue > 0 && raw > revenue * A.revenueCap) scale = (revenue * A.revenueCap) / raw
  ;(Object.keys(leaks) as LeakKey[]).forEach((k) => {
    leaks[k] = (leaks[k] || 0) * scale
  })

  const high = raw * scale
  const low = high * A.lowFactor
  const list: LeakLine[] = (Object.keys(leaks) as LeakKey[])
    .map((k) => ({ key: k, amount: leaks[k] || 0 }))
    .filter((l) => l.amount > 0.5)
    .sort((x, y) => y.amount - x.amount)

  return { leaks, list, high, low, revenue, customers, capped: scale < 1 }
}

/** The plain-text report the visitor can forward on WhatsApp, and that we store with the lead. */
export function reportText(
  res: Result,
  typeKey: TypeKey,
  cur: CurrencyCode,
  name: string,
  whatsapp: string,
): string {
  const T = TYPES[typeKey]
  const lines = [
    `Hi ${name}, here are your Leakcheck results.`,
    '',
    `Business type: ${T.name}`,
    `Could win back: ${money(res.low, cur)} to ${money(res.high, cur)} a month`,
    '',
  ]
  res.list.forEach((l, i) => {
    lines.push(`${i + 1}. ${LEAKS[l.key].name}: about ${money(l.amount, cur)} a month`)
    lines.push(`   First fix: ${LEAKS[l.key].today}`)
  })
  lines.push(
    '',
    `Want the real numbers? Reply to this message or WhatsApp +${whatsapp} to book a Dappa leak audit.`,
    '',
    'Henry',
    'Dappa, usedappa.com',
  )
  return lines.join('\n')
}
