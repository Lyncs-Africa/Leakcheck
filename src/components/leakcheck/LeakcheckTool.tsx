'use client'

import React, { useEffect, useRef, useState } from 'react'
import Icons, { Ic } from './Icons'
import { CONTACT, CURRENCIES, LEAKS, TYPES } from '../../lib/leakcheck/data'
import type { CurrencyCode, LeakKey, TypeKey } from '../../lib/leakcheck/data'
import { compute, money as fmtMoney, parseNum, reportText } from '../../lib/leakcheck/compute'
import type { Answers, Result } from '../../lib/leakcheck/compute'
import { submitLead } from '../../forms/actions'

type Screen = 'intro' | 'questions' | 'contact' | 'results'
type Errors = Record<string, string>
type Contact = {
  name: string
  business: string
  whatsapp: string
  email: string
  consent: boolean
  website: string
}

const TYPE_KEYS = Object.keys(TYPES) as TypeKey[]
const CUR_KEYS = Object.keys(CURRENCIES) as CurrencyCode[]

/** Formats what's typed into a money/number field with thousands separators as you go. */
function withCommas(raw: string, allowDecimal: boolean): string {
  let v = raw.replace(/,/g, '')
  if (allowDecimal) {
    v = v.replace(/[^0-9.]/g, '')
    const dot = v.indexOf('.')
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '')
    const [intPart, decPart] = v.split('.')
    const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decPart !== undefined ? `${intFmt}.${decPart.slice(0, 2)}` : intFmt
  }
  v = v.replace(/[^0-9]/g, '')
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const onAmountInput =
  (allowDecimal: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.value = withCommas(e.currentTarget.value, allowDecimal)
  }

export default function LeakcheckTool() {
  const [currency, setCurrency] = useState<CurrencyCode>('GBP')
  const [type, setType] = useState<TypeKey | null>(null)
  const [screen, setScreen] = useState<Screen>('intro')
  const [convertVal, setConvertVal] = useState(3)
  const [answers, setAnswers] = useState<Answers | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [qErrors, setQErrors] = useState<Errors>({})
  const [cErrors, setCErrors] = useState<Errors>({})
  const [source, setSource] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const qFormRef = useRef<HTMLFormElement>(null)
  const cFormRef = useRef<HTMLFormElement>(null)

  const money = (x: number) => fmtMoney(x, currency)

  // Pick up a ?src= / ?utm_source= tag the same way the original did.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      setSource(p.get('src') || p.get('utm_source') || '')
    } catch {
      /* ignore */
    }
  }, [])

  // Match React state to the theme the no-flash script already applied to <html>.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'dark' ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem('lc-theme', next)
      } catch {
        /* ignore */
      }
      return next
    })
  }

  useEffect(() => {
    if (Object.keys(qErrors).length && qFormRef.current) {
      const el = qFormRef.current.querySelector('.err')
      if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'center' })
    }
  }, [qErrors])

  const T = TYPES[type ?? 'food']

  // ---------- progress ----------
  const step = screen === 'intro' ? 1 : screen === 'questions' ? 2 : 3
  const stepItems = [
    { n: 1, label: 'Your business' },
    { n: 2, label: 'Your numbers' },
    { n: 3, label: 'Your report' },
  ]

  function goTo(next: Screen) {
    setScreen(next)
    try {
      window.scrollTo(0, 0)
    } catch {
      /* ignore */
    }
  }

  // ---------- receipt ----------
  function Receipt({
    res,
    typeKey,
    title,
  }: {
    res: Result
    typeKey: TypeKey
    title: string
  }) {
    const max = res.list.length ? res.list[0].amount : 1
    return (
      <>
        <div className="r-head">
          <span>{title}</span>
          <span>
            {TYPES[typeKey].name} · {currency} / month
          </span>
        </div>
        <ul className="r-lines">
          {res.list.length ? (
            res.list.map((l) => (
              <li className="r-line" key={l.key}>
                <span className="nm">{LEAKS[l.key].name}</span>
                <span className="amt">{money(l.amount)}</span>
                <span className="bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(4, Math.round((l.amount / max) * 100))}%` }} />
                </span>
              </li>
            ))
          ) : (
            <li className="r-line">
              <span className="nm">No leaks found</span>
              <span className="amt">{money(0)}</span>
            </li>
          )}
        </ul>
        <div className="r-total">
          <span>Could win back</span>
          <span className="amt">
            {money(res.low)} to {money(res.high)}
          </span>
        </div>
        <div className="r-foot">Estimates per month. Based on your answers and published research.</div>
      </>
    )
  }

  // Example report, recomputed for the current currency (a food caterer, 60 inquiries).
  const exampleRes = (() => {
    const v = TYPES.food.example[currency]
    const ex: Answers = {
      inquiries: 60,
      value: v,
      convert: 3,
      speed: 'day',
      missed: 'in10',
      quiet: 20,
      chase: 'leave',
      noshows: 0,
      reminders: 'always',
      unpaid: v * 1.2,
      askback: 'never',
    }
    return compute(ex, 'food')
  })()

  // ---------- reading answers ----------
  function readAnswers(): Answers | null {
    const form = qFormRef.current
    if (!form) return null
    const fd = new FormData(form)
    const errs: Errors = {}
    const T2 = TYPES[type ?? 'food']

    const num = (key: string, min: number, msg: string) => {
      const n = parseNum(fd.get(key))
      if (isNaN(n) || (min > 0 && n < min)) errs[key] = msg
      return isNaN(n) ? 0 : n
    }
    const pick = (key: string, msg: string) => {
      const v = fd.get(key)
      if (!v) errs[key] = msg
      return (v as string) || ''
    }

    const a: Answers = {
      inquiries: num('inquiries', 1, 'Add how many new inquiries you get a month.'),
      value: num('value', 1, 'Add what a typical ' + T2.unit + ' is worth.'),
      convert: convertVal,
      speed: pick('speed', 'Pick how quickly you usually reply.'),
      missed: pick('missed', 'Pick how many slip through.'),
      quiet: 0,
      chase: 'twice',
      noshows: 0,
      reminders: 'always',
      unpaid: 0,
      askback: '',
    }
    if (T2.leaks.includes('quotes')) {
      a.quiet = num('quiet', 0, 'Add a number here. 0 is fine.')
      a.chase = pick('chase', 'Pick what you do after a quote.')
    }
    if (T2.leaks.includes('noshow')) {
      a.noshows = num('noshows', 0, 'Add a number here. 0 is fine.')
      a.reminders = pick('reminders', 'Pick how often you send reminders.')
    }
    if (T2.leaks.includes('payments')) {
      a.unpaid = num('unpaid', 0, 'Add a rough figure. 0 is fine.')
    }
    a.askback = pick('askback', 'Pick how often you ask customers back.')

    setQErrors(errs)
    return Object.keys(errs).length ? null : a
  }

  function readContact(): Contact | null {
    const form = cFormRef.current
    if (!form) return null
    const fd = new FormData(form)
    const errs: Errors = {}
    const c: Contact = {
      name: String(fd.get('name') || '').trim(),
      business: String(fd.get('business') || '').trim(),
      whatsapp: String(fd.get('whatsapp') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      consent: fd.get('consent') === 'on',
      website: String(fd.get('website') || ''),
    }
    if (!c.name) errs.name = 'Add your first name.'
    const digits = c.whatsapp.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15)
      errs.whatsapp = 'Add your WhatsApp number with the country code, like +44 7700 900123.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email))
      errs.email = 'Add an email address like name@example.com.'
    if (!c.consent) errs.consent = 'Tick the box so we can send your results.'

    setCErrors(errs)
    return Object.keys(errs).length ? null : c
  }

  // ---------- handlers ----------
  function onPickType(k: TypeKey) {
    setType(k)
  }

  function onStart() {
    if (!type) return
    goTo('questions')
  }

  function onQuestionsSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) return
    const a = readAnswers()
    if (!a) return
    const r = compute(a, type)
    setAnswers(a)
    setResult(r)
    if (contact) goTo('results')
    else goTo('contact')
  }

  async function onContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type || !result || !answers) return
    const c = readContact()
    if (!c) return
    setContact(c)
    setSubmitting(true)
    const topLeak = result.list.length ? LEAKS[result.list[0].key].name : ''
    const rt = reportText(result, type, currency, c.name, CONTACT.whatsapp)
    try {
      await submitLead({
        name: c.name,
        business: c.business,
        whatsapp: c.whatsapp,
        email: c.email,
        consent: c.consent,
        website: c.website,
        source,
        currency,
        type,
        answers,
        result: { low: result.low, high: result.high, list: result.list, leaks: result.leaks, topLeak },
        reportText: rt,
      })
    } catch (err) {
      // The visitor still gets their results even if saving the lead fails.
      console.error(err)
    } finally {
      setSubmitting(false)
      goTo('results')
    }
  }

  function onRestart() {
    qFormRef.current?.reset()
    cFormRef.current?.reset()
    setConvertVal(3)
    setType(null)
    setAnswers(null)
    setResult(null)
    setContact(null)
    setQErrors({})
    setCErrors({})
    goTo('intro')
  }

  function onCopyNum() {
    const num = '+' + CONTACT.whatsapp
    try {
      navigator.clipboard.writeText(num).then(
        () => setCopyStatus(' Copied.'),
        () => setCopyStatus(' Select it above to copy.'),
      )
    } catch {
      setCopyStatus(' Select it above to copy.')
    }
  }

  // ---------- results helpers ----------
  function ActionList({ leakKey }: { leakKey: LeakKey }) {
    const L = LEAKS[leakKey]
    const tip = type ? L.tips[type] : undefined
    return (
      <>
        <ul className="steps3">
          <li>
            <span className="when">Today, free</span>
            <span>{L.today}</span>
          </li>
          <li>
            <span className="when">This month</span>
            <span>{L.month}</span>
          </li>
          <li>
            <span className="when">An audit checks</span>
            <span>{L.audit}</span>
          </li>
        </ul>
        {tip && type && (
          <p className="tip">
            <Ic id="bulb" />
            <span>
              <b>For {TYPES[type].name.toLowerCase()}:</b> {tip}
            </span>
          </p>
        )}
      </>
    )
  }

  function Research({ leakKey }: { leakKey: LeakKey }) {
    const r = LEAKS[leakKey].research
    if (!r)
      return <p className="research">Leakcheck estimate. Your audit replaces it with a real figure.</p>
    return (
      <p className="research">
        {r.text}{' '}
        <a href={r.src.url} target="_blank" rel="noopener noreferrer">
          {r.src.label}
        </a>
      </p>
    )
  }

  // WhatsApp hand-off message + link
  const waHref = (() => {
    if (!result || !type) return '#'
    const msg =
      'Hi Henry, I just used Leakcheck by Dappa. I run a ' +
      T.name.toLowerCase() +
      ' business' +
      (contact && contact.business ? ' (' + contact.business + ')' : '') +
      '. My estimate is ' +
      money(result.low) +
      ' to ' +
      money(result.high) +
      ' a month' +
      (result.list.length ? ', and my biggest leak is ' + LEAKS[result.list[0].key].name.toLowerCase() : '') +
      ". I'd like to hear about a Dappa leak audit."
    return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(msg)
  })()

  const name = contact ? contact.name : ''
  const pct = result && result.revenue > 0 ? Math.round((result.high / result.revenue) * 100) : null

  return (
    <div className="lc">
      <Icons />
      <div className="app">
        <header className="top">
          <a
            className="mark"
            href="#"
            aria-label="Leakcheck by Dappa, back to start"
            onClick={(e) => {
              e.preventDefault()
              goTo('intro')
            }}
          >
            <span className="logo">
              <svg viewBox="0 0 26 30" aria-hidden="true">
                <path
                  d="M13 1.5C13 1.5 3 13.2 3 19.5a10 10 0 0 0 20 0C23 13.2 13 1.5 13 1.5Z"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.4"
                />
                <path
                  d="M8.5 20.5a4.5 4.5 0 0 0 4.5 4.5"
                  fill="none"
                  stroke="#F69299"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <b>Leakcheck</b>
            <small>by Dappa</small>
          </a>
          <div className="controls">
            <div className="seg" role="radiogroup" aria-label="Currency">
              {CUR_KEYS.map((code) => (
                <React.Fragment key={code}>
                  <input
                    type="radio"
                    name="cur"
                    id={`cur-${code}`}
                    value={code}
                    checked={currency === code}
                    onChange={() => setCurrency(code)}
                  />
                  <label htmlFor={`cur-${code}`}>
                    {CURRENCIES[code].symbol} {code}
                  </label>
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <Ic id={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
        </header>

        <ol className="steps" aria-label="Progress" hidden={screen === 'intro'}>
          {stepItems.map((s) => (
            <li
              key={s.n}
              className={s.n < step ? 'done' : undefined}
              aria-current={s.n === step ? 'step' : undefined}
            >
              <span>{s.n}</span>
              {s.label}
            </li>
          ))}
        </ol>

        <main>
          {/* 1. Intro and business type */}
          <section
            aria-labelledby="intro-title"
            hidden={screen !== 'intro'}
            style={{ display: screen === 'intro' ? 'flex' : undefined, flexDirection: 'column', gap: 'clamp(40px,7vw,96px)' }}
          >
            <div className="hero">
              <picture>
                <source
                  media="(max-width: 700px)"
                  srcSet="https://images.unsplash.com/photo-1687422808248-f807f4ea2a2e?auto=format&fit=crop&crop=faces&w=900&h=1300&q=70"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1687422808248-f807f4ea2a2e?auto=format&fit=crop&crop=faces&w=2000&h=1250&q=70"
                  alt="A street food vendor in Dar es Salaam smiling at his phone"
                />
              </picture>
              <div className="hero-in">
                <span className="pill on-dark">Free revenue leak calculator from Dappa</span>
                <h1 id="intro-title">Find the money slipping through your chats.</h1>
                <p className="lead">
                  Busy chats hide quiet losses. A DM nobody answered. A quote nobody chased. A regular
                  who never came back. Answer a few questions and Leakcheck shows what that costs you
                  each month, and what to fix first.
                </p>
                <div className="row">
                  <a
                    className="btn light"
                    href="#pick"
                    onClick={(e) => {
                      e.preventDefault()
                      const target =
                        document.getElementById('start-picker') || document.getElementById('pick')
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                  >
                    <span>Start my Leakcheck</span>
                    <span className="go">
                      <Ic id="arrow" />
                    </span>
                  </a>
                  <span className="meta">Free. About three minutes.</span>
                </div>
              </div>
            </div>

            <div className="block" id="pick" style={{ paddingTop: 0, scrollMarginTop: 16 }}>
              <div className="split">
                <h2>Built for businesses that sell in the chat.</h2>
                <div className="side">
                  <p className="lead">
                    Caterers, braiders, tailors, planners, cleaners and cargo services. If customers
                    find you on WhatsApp, Instagram or by phone, the leaks look the same: replies that
                    come too late, quotes that go quiet and customers nobody asks back.
                  </p>
                </div>
              </div>
              <fieldset className="pick" id="start-picker">
                <legend>
                  <span className="pill">Step 1 of 3</span>
                  <span className="prompt">What kind of business do you run?</span>
                </legend>
                <div className="types">
                  {TYPE_KEYS.map((k) => (
                    <div className="type" key={k}>
                      <input
                        type="radio"
                        name="btype"
                        id={`bt-${k}`}
                        value={k}
                        checked={type === k}
                        onChange={() => onPickType(k)}
                      />
                      <label htmlFor={`bt-${k}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={TYPES[k].img} alt="" loading="lazy" />
                        <span className="t-tick">
                          <Ic id="check" />
                        </span>
                        <span className="t-body">
                          <span className="pill solid">{TYPES[k].sells}</span>
                          <span className="t-name">{TYPES[k].name}</span>
                          <span className="t-also">{TYPES[k].also}</span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="note">
                  Not listed? Pick the one that sells most like you. Booked by appointment, pick Hair,
                  beauty and nails. Priced by quote, pick Events and celebrations. Sold by order, pick
                  Food and catering.
                </p>
              </fieldset>
              <div className="row">
                <button className="btn" type="button" disabled={!type} onClick={onStart}>
                  <span>Start my Leakcheck</span>
                  <span className="go">
                    <Ic id="arrow" />
                  </span>
                </button>
                <span className="small muted" aria-live="polite">
                  {type ? `${TYPES[type].name} selected.` : 'Pick a business type to start.'}
                </span>
              </div>
            </div>

            <div className="example" aria-label="Example report">
              <div className="copy">
                <span className="pill">Example report</span>
                <h2>Here&apos;s what your report looks like.</h2>
                <ul className="ticks">
                  <li>
                    <Ic id="check" />
                    <span>What each leak costs you a month, in your currency</span>
                  </li>
                  <li>
                    <Ic id="check" />
                    <span>Your biggest leak first, so you know where to start</span>
                  </li>
                  <li>
                    <Ic id="check" />
                    <span>Free fixes you can start today, and what an audit would check</span>
                  </li>
                </ul>
                <p className="aside-cap">
                  This example is a caterer with 60 inquiries a month who replies later the same day and
                  never chases quiet quotes. Your report uses your own numbers.
                </p>
              </div>
              <div className="receipt">
                <Receipt res={exampleRes} typeKey="food" title="Leak report · example" />
              </div>
            </div>
          </section>

          {/* 2. Questions */}
          <section aria-labelledby="q-title" hidden={screen !== 'questions'}>
            <form className="narrow" ref={qFormRef} noValidate onSubmit={onQuestionsSubmit}>
              <div className="gate-head">
                <span className="pill">{type ? TYPES[type].name : 'Your numbers'}</span>
                <h2 id="q-title">Tell us how a normal month looks.</h2>
                <p className="muted">Rough numbers are fine. Think about a typical month, not your best or worst.</p>
              </div>

              <div className="panel">
                <fieldset>
                  <legend>
                    <span className="pill">New inquiries</span>
                  </legend>
                  <div className="q">
                    <label htmlFor="in-inquiries">How many new inquiries do you get in a typical month?</label>
                    <span className="hint">Count messages, DMs and calls from people who haven&apos;t bought from you before.</span>
                    <div className="field">
                      <input id="in-inquiries" name="inquiries" inputMode="numeric" autoComplete="off" placeholder="e.g. 60" onChange={onAmountInput(false)} />
                    </div>
                    {qErrors.inquiries && <span className="err">{qErrors.inquiries}</span>}
                  </div>
                  <div className="q">
                    <label htmlFor="in-value">
                      What&apos;s a typical {T.unit} worth?
                    </label>
                    <span className="hint">Your average sale, before costs.</span>
                    <div className="field">
                      <span className="pre">{CURRENCIES[currency].symbol}</span>
                      <input
                        id="in-value"
                        name="value"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={`e.g. ${T.example[currency].toLocaleString()}`}
                      />
                    </div>
                    {qErrors.value && <span className="err">{qErrors.value}</span>}
                  </div>
                  <div className="q">
                    <label htmlFor="in-convert">Out of 10 people who ask, how many end up paying?</label>
                    <div className="slider">
                      <input
                        type="range"
                        id="in-convert"
                        min={0}
                        max={10}
                        step={1}
                        value={convertVal}
                        onChange={(e) => setConvertVal(Number(e.target.value))}
                      />
                      <output htmlFor="in-convert">{convertVal} in 10</output>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="panel">
                <fieldset>
                  <legend>
                    <span className="pill">First replies</span>
                  </legend>
                  <div className="q" role="radiogroup" aria-labelledby="l-speed">
                    <span className="q-label" id="l-speed">How quickly do you usually send the first reply?</span>
                    <div className="choices">
                      {[
                        ['m15', 'Within 15 minutes'],
                        ['h1', 'Within the hour'],
                        ['hours', 'A few hours'],
                        ['day', 'Later the same day'],
                        ['next', 'Next day or later'],
                      ].map(([v, label]) => (
                        <React.Fragment key={v}>
                          <input type="radio" name="speed" id={`sp-${v}`} value={v} />
                          <label htmlFor={`sp-${v}`}>{label}</label>
                        </React.Fragment>
                      ))}
                    </div>
                    {qErrors.speed && <span className="err">{qErrors.speed}</span>}
                  </div>
                  <div className="q" role="radiogroup" aria-labelledby="l-missed">
                    <span className="q-label" id="l-missed">How many inquiries slip through without any reply?</span>
                    <span className="hint">Include missed calls and DMs you meant to answer.</span>
                    <div className="choices">
                      {[
                        ['almost', 'Almost none'],
                        ['in20', 'About 1 in 20'],
                        ['in10', 'About 1 in 10'],
                        ['in5', '1 in 5 or more'],
                      ].map(([v, label]) => (
                        <React.Fragment key={v}>
                          <input type="radio" name="missed" id={`mi-${v}`} value={v} />
                          <label htmlFor={`mi-${v}`}>{label}</label>
                        </React.Fragment>
                      ))}
                    </div>
                    {qErrors.missed && <span className="err">{qErrors.missed}</span>}
                  </div>
                </fieldset>
              </div>

              <div className="panel" hidden={!T.leaks.includes('quotes')}>
                <fieldset>
                  <legend>
                    <span className="pill">Quotes and prices</span>
                  </legend>
                  <div className="q">
                    <label htmlFor="in-quiet">How many quotes or price lists do you send in a month that never get a yes?</label>
                    <span className="hint">The people who asked, got a price, then went quiet.</span>
                    <div className="field">
                      <input id="in-quiet" name="quiet" inputMode="numeric" autoComplete="off" placeholder="e.g. 15" />
                    </div>
                    {qErrors.quiet && <span className="err">{qErrors.quiet}</span>}
                  </div>
                  <div className="q" role="radiogroup" aria-labelledby="l-chase">
                    <span className="q-label" id="l-chase">When someone goes quiet after a quote, what do you do?</span>
                    <div className="choices">
                      {[
                        ['leave', 'Leave it'],
                        ['once', 'Follow up once'],
                        ['twice', 'Follow up twice or more'],
                      ].map(([v, label]) => (
                        <React.Fragment key={v}>
                          <input type="radio" name="chase" id={`ch-${v}`} value={v} />
                          <label htmlFor={`ch-${v}`}>{label}</label>
                        </React.Fragment>
                      ))}
                    </div>
                    {qErrors.chase && <span className="err">{qErrors.chase}</span>}
                  </div>
                </fieldset>
              </div>

              <div className="panel" hidden={!T.leaks.includes('noshow')}>
                <fieldset>
                  <legend>
                    <span className="pill">Bookings</span>
                  </legend>
                  <div className="q">
                    <label htmlFor="in-noshows">How many no-shows or last-minute cancellations in a typical month?</label>
                    <div className="field">
                      <input id="in-noshows" name="noshows" inputMode="numeric" autoComplete="off" placeholder="e.g. 5" />
                    </div>
                    {qErrors.noshows && <span className="err">{qErrors.noshows}</span>}
                  </div>
                  <div className="q" role="radiogroup" aria-labelledby="l-reminders">
                    <span className="q-label" id="l-reminders">
                      Do you remind people before their {T.unit}?
                    </span>
                    <div className="choices">
                      {[
                        ['no', 'No'],
                        ['sometimes', 'Sometimes'],
                        ['always', 'Every time'],
                      ].map(([v, label]) => (
                        <React.Fragment key={v}>
                          <input type="radio" name="reminders" id={`re-${v}`} value={v} />
                          <label htmlFor={`re-${v}`}>{label}</label>
                        </React.Fragment>
                      ))}
                    </div>
                    {qErrors.reminders && <span className="err">{qErrors.reminders}</span>}
                  </div>
                </fieldset>
              </div>

              <div className="panel" hidden={!T.leaks.includes('payments')}>
                <fieldset>
                  <legend>
                    <span className="pill">Getting paid</span>
                  </legend>
                  <div className="q">
                    <label htmlFor="in-unpaid">Roughly how much in deposits or balances goes unpaid or very late each month?</label>
                    <span className="hint">A rough figure is fine. Put 0 if everyone pays on time.</span>
                    <div className="field">
                      <span className="pre">{CURRENCIES[currency].symbol}</span>
                      <input
                        id="in-unpaid"
                        name="unpaid"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={`e.g. ${Math.round(T.example[currency] * 1.2).toLocaleString()}`}
                      />
                    </div>
                    {qErrors.unpaid && <span className="err">{qErrors.unpaid}</span>}
                  </div>
                </fieldset>
              </div>

              <div className="panel">
                <fieldset>
                  <legend>
                    <span className="pill">Coming back</span>
                  </legend>
                  <div className="q" role="radiogroup" aria-labelledby="l-askback">
                    <span className="q-label" id="l-askback">
                      Do you ask finished customers to come back, {type ? TYPES[type].again : 'reorder'} or refer a friend?
                    </span>
                    <div className="choices">
                      {[
                        ['never', 'Never'],
                        ['sometimes', 'Sometimes'],
                        ['always', 'Every time'],
                      ].map(([v, label]) => (
                        <React.Fragment key={v}>
                          <input type="radio" name="askback" id={`ab-${v}`} value={v} />
                          <label htmlFor={`ab-${v}`}>{label}</label>
                        </React.Fragment>
                      ))}
                    </div>
                    {qErrors.askback && <span className="err">{qErrors.askback}</span>}
                  </div>
                </fieldset>
              </div>

              {Object.keys(qErrors).length > 0 && (
                <p className="err">A few answers are missing. They&apos;re marked above.</p>
              )}
              <div className="row">
                <button className="btn" type="submit">
                  <span>See my report</span>
                  <span className="go">
                    <Ic id="arrow" />
                  </span>
                </button>
                <button className="btn ghost" type="button" onClick={() => goTo('intro')}>
                  Back
                </button>
              </div>
            </form>
          </section>

          {/* 3. Contact gate */}
          <section aria-labelledby="c-title" hidden={screen !== 'contact'}>
            <div className="contact-grid">
              <form className="narrow" ref={cFormRef} noValidate onSubmit={onContactSubmit}>
                <div className="gate-head">
                  <span className="pill">Almost there</span>
                  <h2 id="c-title">Your report is ready. Where should we send it?</h2>
                </div>
                <div className="panel">
                  <div className="q">
                    <label htmlFor="c-name">First name</label>
                    <input className="text-in" id="c-name" name="name" autoComplete="given-name" />
                    {cErrors.name && <span className="err">{cErrors.name}</span>}
                  </div>
                  <div className="q">
                    <label htmlFor="c-business">
                      Business name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input className="text-in" id="c-business" name="business" autoComplete="organization" />
                  </div>
                  <div className="q">
                    <label htmlFor="c-wa">WhatsApp number</label>
                    <span className="hint">Include your country code, like +44, +1 or +234.</span>
                    <input
                      className="text-in"
                      id="c-wa"
                      name="whatsapp"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+44 7700 900123"
                    />
                    {cErrors.whatsapp && <span className="err">{cErrors.whatsapp}</span>}
                  </div>
                  <div className="q">
                    <label htmlFor="c-email">Email</label>
                    <input className="text-in" id="c-email" name="email" type="email" inputMode="email" autoComplete="email" />
                    {cErrors.email && <span className="err">{cErrors.email}</span>}
                  </div>
                  <div className="hp" aria-hidden="true">
                    <label htmlFor="c-website">Website</label>
                    <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="q">
                    <label className="consent" htmlFor="c-consent">
                      <input type="checkbox" id="c-consent" name="consent" />
                      <span>
                        Send me my results, and contact me about them on WhatsApp and email. I can opt
                        out any time.
                      </span>
                    </label>
                    {cErrors.consent && <span className="err">{cErrors.consent}</span>}
                  </div>
                  <details className="privacy">
                    <summary>How we use your details</summary>
                    <p style={{ marginTop: 8 }}>
                      Leakcheck is a free tool from Dappa, run by Henry Ampey. We use your name, number
                      and email to send your results and follow up about them. We keep your answers to
                      improve the calculator. We don&apos;t sell or share your details. To be removed,
                      message &quot;remove me&quot; on WhatsApp or email {CONTACT.email}.
                    </p>
                  </details>
                </div>
                <div className="row">
                  <button className="btn" type="submit" disabled={submitting}>
                    <span>{submitting ? 'Sending…' : 'Show my results'}</span>
                    <span className="go">
                      <Ic id="arrow" />
                    </span>
                  </button>
                  <button className="btn ghost" type="button" onClick={() => goTo('questions')}>
                    Change my answers
                  </button>
                </div>
              </form>
              <aside className="dark" aria-label="What's in your report">
                <span className="pill on-dark">Leaks found</span>
                <span className="teaser-num">{result ? result.list.length : 4}</span>
                <p className="soft">Your money figures and first fixes are on the next screen.</p>
                <ul className="ticks on-dark">
                  <li>
                    <Ic id="check" />
                    <span>What each leak costs you a month</span>
                  </li>
                  <li>
                    <Ic id="check" />
                    <span>Where to start, with fixes that cost nothing</span>
                  </li>
                  <li>
                    <Ic id="check" />
                    <span>A copy of your report by email</span>
                  </li>
                </ul>
              </aside>
            </div>
          </section>

          {/* 4. Results */}
          <section aria-labelledby="r-title" className="results" hidden={screen !== 'results'}>
            {result && type && (
              <>
                <div className="res-head">
                  <span className="pill">Your Leakcheck report</span>
                  {result.list.length ? (
                    <h2 id="r-title">
                      {name ? `${name}, you` : 'You'} could be leaving{' '}
                      <span className="big">
                        {money(result.low)} to {money(result.high)}
                      </span>{' '}
                      a month on the table.
                    </h2>
                  ) : (
                    <h2 id="r-title">
                      {name ? `${name}, ` : ''}we couldn&apos;t find a leak in these answers.
                    </h2>
                  )}
                  {result.list.length ? (
                    <p className="lead muted">
                      That&apos;s roughly {money(result.low * 12)} to {money(result.high * 12)} a year
                      {pct ? `, or up to ${pct}% of what you take in each month now` : ''}. These are
                      estimates from your answers, not an audit. Here&apos;s where it comes from and what
                      to fix first.
                    </p>
                  ) : (
                    <p className="lead muted">
                      That&apos;s a well-run business on paper. If it doesn&apos;t feel that way day to
                      day, an audit will show what the numbers miss.
                    </p>
                  )}
                </div>

                {result.list.length > 0 && (
                  <>
                    <div className="res-grid">
                      <div className="receipt">
                        <Receipt
                          res={result}
                          typeKey={type}
                          title={`Leak report · ${contact && contact.business ? contact.business : 'your business'}`}
                        />
                      </div>
                      <div className="card start">
                        <div className="c-top">
                          <span className="tile">
                            <Ic id={result.list[0].key} />
                          </span>
                          <span className="pill leak">Start here, your biggest leak</span>
                        </div>
                        <h3>{LEAKS[result.list[0].key].name}</h3>
                        <p>
                          Worth about <b>{money(result.list[0].amount)}</b>{' '}
                          a month. It&apos;s your biggest leak, so it&apos;s the first one to plug.
                        </p>
                        <Research leakKey={result.list[0].key} />
                        <ActionList leakKey={result.list[0].key} />
                      </div>
                    </div>

                    <div className="more">
                      {result.list.slice(1).map((l) => (
                        <details key={l.key}>
                          <summary>
                            <span className="nm">
                              <span className="tile soft">
                                <Ic id={l.key} />
                              </span>
                              {LEAKS[l.key].name}
                            </span>
                            <span className="amt">{money(l.amount)} / month</span>
                          </summary>
                          <div>
                            <Research leakKey={l.key} />
                            <ActionList leakKey={l.key} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </>
                )}

                <div className="cta">
                  <div className="cta-in">
                    <span className="pill on-dark">Next step</span>
                    <h2>Want the real numbers?</h2>
                    <p>
                      This is an estimate from your answers. A Dappa leak audit counts your actual chats,
                      quotes and bookings, puts a real figure on each leak, and sets up the fixes with
                      you. Send your results on WhatsApp and Henry from Dappa will reply with the audit
                      options.
                    </p>
                    <div className="row">
                      <a className="btn light" href={waHref} target="_blank" rel="noopener noreferrer">
                        <Ic id="wa" className="ic lead-ic" />
                        <span>Send my results on WhatsApp</span>
                        <span className="go">
                          <Ic id="arrow" />
                        </span>
                      </a>
                      <button className="btn on-dark" type="button" onClick={onCopyNum}>
                        <Ic id="copy" className="ic lead-ic" />
                        <span>Copy number</span>
                      </button>
                    </div>
                    <p className="small">
                      WhatsApp: <span className="num">+{CONTACT.whatsapp}</span>
                      <span className="small" aria-live="polite">{copyStatus}</span>
                    </p>
                  </div>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1687422808565-929533931584?auto=format&fit=crop&crop=faces&w=1000&h=1000&q=70"
                      alt="A fruit seller at a market in Dar es Salaam giving a thumbs up"
                      loading="lazy"
                    />
                  </figure>
                </div>

                <details className="how">
                  <summary>How we worked this out</summary>
                  <div>
                    <p className="small muted">
                      Each figure is what you could realistically win back, not everything you lose. We
                      show a range: the low end is 60% of our estimate. We also cap the high end at 40%
                      of your current monthly sales, because no business wins everything back.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Leak</th>
                            <th>How we estimate it</th>
                            <th>Based on</th>
                          </tr>
                        </thead>
                        <tbody>
                          {T.leaks.map((k) => {
                            const r = LEAKS[k].research
                            return (
                              <tr key={k}>
                                <td>{LEAKS[k].name}</td>
                                <td>{LEAKS[k].how}</td>
                                <td>
                                  {r ? (
                                    <a href={r.src.url} target="_blank" rel="noopener noreferrer">
                                      {r.src.label}
                                    </a>
                                  ) : (
                                    'Leakcheck estimate'
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>

                <div className="row">
                  <button className="btn ghost" type="button" onClick={() => goTo('questions')}>
                    <Ic id="pencil" className="ic lead-ic" />
                    <span>Change my answers</span>
                  </button>
                  <button className="btn ghost" type="button" onClick={onRestart}>
                    <Ic id="refresh" className="ic lead-ic" />
                    <span>Start again</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </main>

        <footer className="site-footer">
          <div className="foot-main">
            <div className="foot-brand">
              <a
                className="mark"
                href="#"
                aria-label="Leakcheck by Dappa, back to start"
                onClick={(e) => {
                  e.preventDefault()
                  goTo('intro')
                }}
              >
                <span className="logo">
                  <svg viewBox="0 0 26 30" aria-hidden="true">
                    <path
                      d="M13 1.5C13 1.5 3 13.2 3 19.5a10 10 0 0 0 20 0C23 13.2 13 1.5 13 1.5Z"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.4"
                    />
                    <path
                      d="M8.5 20.5a4.5 4.5 0 0 0 4.5 4.5"
                      fill="none"
                      stroke="#F69299"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <b>Leakcheck</b>
                <small>by Dappa</small>
              </a>
              <p className="foot-tag">
                The free revenue leak calculator for small businesses that sell on WhatsApp. Find the
                money slipping through your chats, and what to fix first.
              </p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h4>Tool</h4>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    goTo('intro')
                  }}
                >
                  Start a Leakcheck
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    goTo('intro')
                  }}
                >
                  How it works
                </a>
              </div>
              <div className="foot-col">
                <h4>Get in touch</h4>
                <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <a href={`mailto:${CONTACT.email}`}>Email</a>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} Dappa. A free tool for WhatsApp businesses.</span>
            <span>Figures are estimates from your answers, not financial advice.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
