/**
 * The Leakcheck domain model: currencies, business types, the leak library and the
 * assumptions behind every estimate. Ported directly from the original single-file tool
 * so the figures stay identical. Shared by the UI and the lead-saving server action.
 */

export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'NGN'
export type TypeKey = 'food' | 'beauty' | 'events' | 'fashion' | 'home' | 'logistics'
export type LeakKey = 'missed' | 'speed' | 'quotes' | 'noshow' | 'payments' | 'repeat'

export const CONTACT = {
  whatsapp: '2348141364787',
  email: 'hampey88@gmail.com',
}

export const CURRENCIES: Record<CurrencyCode, { locale: string; symbol: string }> = {
  GBP: { locale: 'en-GB', symbol: '£' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'en-IE', symbol: '€' },
  NGN: { locale: 'en-NG', symbol: '₦' },
}

export type BusinessType = {
  img: string
  name: string
  sells: string
  also: string
  unit: string
  units: string
  again: string
  leaks: LeakKey[]
  example: Record<CurrencyCode, number>
}

export const TYPES: Record<TypeKey, BusinessType> = {
  food: {
    img: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?auto=format&fit=crop&w=800&h=840&q=70',
    name: 'Food and catering',
    sells: 'Sold by order',
    also: 'Caterers, small chops, cakes and bakes, meal prep, private chefs, food trays',
    unit: 'order',
    units: 'orders',
    again: 'reorder',
    leaks: ['missed', 'speed', 'quotes', 'payments', 'repeat'],
    example: { GBP: 250, USD: 300, EUR: 275, NGN: 200000 },
  },
  beauty: {
    img: 'https://images.unsplash.com/photo-1762745103094-6760fab8eb50?auto=format&fit=crop&w=800&h=840&q=70&crop=faces',
    name: 'Hair, beauty and nails',
    sells: 'Booked by appointment',
    also: 'Braiders, barbers, wig makers, lash and brow techs, makeup artists, nail techs, spa',
    unit: 'appointment',
    units: 'appointments',
    again: 'rebook',
    leaks: ['missed', 'speed', 'noshow', 'repeat'],
    example: { GBP: 85, USD: 110, EUR: 90, NGN: 35000 },
  },
  events: {
    img: 'https://images.unsplash.com/photo-1738860283475-c7590c92eae8?auto=format&fit=crop&w=800&h=840&q=70',
    name: 'Events and celebrations',
    sells: 'Priced by quote',
    also: 'Planners, decorators, DJs, MCs, photographers, videographers, rentals, ushers',
    unit: 'booking',
    units: 'bookings',
    again: 'book again',
    leaks: ['missed', 'speed', 'quotes', 'payments', 'repeat'],
    example: { GBP: 900, USD: 1100, EUR: 1000, NGN: 600000 },
  },
  fashion: {
    img: 'https://images.unsplash.com/photo-1687422809069-0fa3546b8471?auto=format&fit=crop&w=800&h=840&q=70&crop=faces',
    name: 'Fashion and tailoring',
    sells: 'Made to order',
    also: 'Tailors, designers, aso-ebi, alterations, gele tying, jewellery and accessories',
    unit: 'order',
    units: 'orders',
    again: 'reorder',
    leaks: ['missed', 'speed', 'quotes', 'payments', 'repeat'],
    example: { GBP: 180, USD: 220, EUR: 200, NGN: 90000 },
  },
  home: {
    img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=800&h=840&q=70&crop=faces',
    name: 'Cleaning and home services',
    sells: 'Booked by the job',
    also: 'Cleaners, handymen, movers, painters, gardeners, pest control, tutors who visit',
    unit: 'job',
    units: 'jobs',
    again: 'rebook',
    leaks: ['missed', 'speed', 'quotes', 'noshow', 'repeat'],
    example: { GBP: 120, USD: 150, EUR: 130, NGN: 40000 },
  },
  logistics: {
    img: 'https://images.unsplash.com/photo-1579998120084-16688be7b6d1?auto=format&fit=crop&w=800&h=840&q=70&crop=faces',
    name: 'Cargo, shipping and errands',
    sells: 'Priced per shipment',
    also: 'Cargo to Nigeria, couriers, freight forwarders, errand and sourcing services',
    unit: 'shipment',
    units: 'shipments',
    again: 'ship again',
    leaks: ['missed', 'speed', 'quotes', 'payments', 'repeat'],
    example: { GBP: 150, USD: 180, EUR: 160, NGN: 120000 },
  },
}

// Assumptions. Each is what a business could realistically win back.
export const A = {
  missed: { almost: 0.02, in20: 0.05, in10: 0.1, in5: 0.2 } as Record<string, number>,
  speed: { m15: 0, h1: 0.03, hours: 0.06, day: 0.1, next: 0.15 } as Record<string, number>,
  quote: { leave: 0.1, once: 0.05, twice: 0 } as Record<string, number>,
  noshow: { no: 0.29, sometimes: 0.15, always: 0.05 } as Record<string, number>,
  payment: 0.4,
  repeat: { never: 0.05, sometimes: 0.025, always: 0 } as Record<string, number>,
  lowFactor: 0.6,
  revenueCap: 0.4,
}

type Source = { label: string; url: string }

export const SRC: Record<string, Source> = {
  hbr: {
    label: 'Harvard Business Review study, via SmartCompany',
    url: 'https://www.smartcompany.com.au/marketing/20110704-are-you-letting-online-leads-go-cold/',
  },
  calls: {
    label: '411 Locals study, via SchedulingKit',
    url: 'https://schedulingkit.com/statistics/missed-call-statistics',
  },
  reminders: {
    label: 'Hasvold and Wootton review, via SchedulingKit',
    url: 'https://schedulingkit.com/hub/scheduling/appointment-no-show-statistics',
  },
}

export type Leak = {
  name: string
  research: { text: string; src: Source } | null
  how: string
  today: string
  month: string
  audit: string
  tips: Partial<Record<TypeKey, string>>
}

export const LEAKS: Record<LeakKey, Leak> = {
  missed: {
    name: 'Unanswered inquiries',
    research: {
      text: 'In one study of 85 small businesses, 62% of incoming calls weren’t answered by a person.',
      src: SRC.calls,
    },
    how: 'Inquiries that get no reply × your paying rate × your typical sale. Slip-through rates: almost none 2%, 1 in 20 is 5%, 1 in 10 is 10%, 1 in 5 is 20%.',
    today:
      'Turn on the greeting and away messages in WhatsApp Business, so every new chat gets an answer even when you’re busy. Add your price list or catalogue to your profile.',
    month:
      'Use one number everywhere (Instagram bio, flyers, Google profile) and send DMs to WhatsApp. Check missed calls every day and text back within the hour.',
    audit:
      'We count a month of chats, DMs and calls across every channel and find where inquiries go missing.',
    tips: {
      food: 'Put your order cut-off times and delivery areas in the away message. Half the questions answer themselves.',
      beauty: 'Add a booking link to your away message so people can book while you’re with a client.',
      events: 'Ask for the event date and guest count in your greeting message. You’ll know straight away who to prioritise.',
      fashion: 'Share your current lead time in the away message, so people know when you can deliver.',
      home: 'Missed calls are the big one in home services. Set up a ‘Sorry I missed you, how can I help?’ text for every missed call.',
      logistics: 'Pin your next shipping dates and drop-off address in the away message.',
    },
  },
  speed: {
    name: 'Slow first replies',
    research: {
      text: 'Firms that replied to an online lead within an hour were nearly 7 times as likely to have a real conversation with the buyer as firms that waited longer.',
      src: SRC.hbr,
    },
    how: 'Inquiries you answer × your paying rate × your typical sale × the share you’d win with faster replies: within the hour 3%, a few hours 6%, later the same day 10%, next day or later 15%.',
    today:
      'Save quick replies for your five most common questions: prices, availability, delivery area, deposit and timing.',
    month:
      'Block two short reply windows in your day, like lunch and straight after work. Every new inquiry gets a first reply within the hour, even if it’s ‘Got it, I’ll send prices tonight.’',
    audit: 'We send test inquiries at different times of day and measure your real reply time.',
    tips: {
      food: 'Have a ready-made menu image and price list to send in one tap.',
      beauty: 'Keep a ‘styles and prices’ photo set ready to send. It answers most first questions.',
      events: 'Reply fast with a short ‘Is your date still open?’ check. The detailed quote can follow.',
      fashion: 'Send a quick reply asking for measurements and the date they need it by.',
      home: 'Reply with two time slots for a quote visit. People book whoever answers first.',
      logistics: 'Keep a rates card per kilo and the next departure date ready to send.',
    },
  },
  quotes: {
    name: 'Quotes nobody chased',
    research: null,
    how: 'Quotes that never get a yes × the share you’d win back with follow-ups (10% if you never follow up, 5% if you follow up once) × your typical sale. Leakcheck estimate.',
    today: 'Label every chat that has a price but no yes as ‘Quoted’. Go through that list every Friday.',
    month:
      'Follow up twice: after 2 days and after 7. Keep it short and specific: the date, the price and one question.',
    audit: 'We count the quotes from the last 60 days and how many got a second message.',
    tips: {
      food: 'Ask about headcount and date in the follow-up. It restarts the conversation without feeling pushy.',
      events: 'Dates sell out. Say the date is still free and how long you can hold it.',
      fashion: 'Send a photo of a similar finished piece with your follow-up.',
      home: 'Offer two specific time slots in the follow-up.',
      logistics: 'Remind them of the next cut-off date for the shipment.',
    },
  },
  noshow: {
    name: 'No-shows and late cancellations',
    research: {
      text: 'Across 29 studies, automated text or phone reminders cut missed appointments by 29% on average.',
      src: SRC.reminders,
    },
    how: 'No-shows a month × your typical sale × the share reminders and deposits win back: 29% if you never remind, 15% if sometimes, 5% if every time.',
    today: 'Send a reminder the day before every booking and ask them to reply YES to confirm.',
    month:
      'Take a deposit when people book, and put your cancellation rule in the booking message.',
    audit:
      'We track no-shows by day and time to find the pattern, then set up reminders that send themselves.',
    tips: {
      beauty: 'Fill the gap from a waiting list. Post open slots on your WhatsApp Status the night before.',
      home: 'Confirm access the day before: keys, parking and who’ll be home.',
    },
  },
  payments: {
    name: 'Unpaid deposits and balances',
    research: null,
    how: 'What you said goes unpaid or very late each month × 40% you could collect with payment links and reminders. Leakcheck estimate.',
    today: 'Write down everyone who owes you, how much and since when.',
    month:
      'Send payment links instead of bank details, take a deposit before you start, and make the balance due before delivery or the event. Remind three days before it’s due.',
    audit: 'We match 60 days of orders against what was actually paid.',
    tips: {
      food: 'Ask for the balance before the cooking day, not on delivery.',
      events: 'Split payment into deposit, mid-point and final, with the final due a week before the event.',
      fashion: 'Take half up front for fabric and the rest before the final fitting.',
      logistics: 'Don’t release goods at the other end until the balance is cleared.',
    },
  },
  repeat: {
    name: 'Customers never asked back',
    research: null,
    how: 'Paying customers a month × your typical sale × extra repeat business from asking: 5% if you never ask, 2.5% if sometimes. Leakcheck estimate.',
    today: 'Label finished customers ‘Done’ in WhatsApp Business so you can find them again.',
    month:
      'Message every finished customer once with a thank you, a review link and when to come back. Use a broadcast list for regulars who’ve opted in.',
    audit: 'We look at how many past customers came back in the last 90 days and what they were sent.',
    tips: {
      food: 'Message past customers before big dates: Christmas, Easter, Eid and wedding season.',
      beauty: 'Rebook before they leave the chair: ‘Same time in six weeks?’',
      events: 'Ask for a review and a referral straight after the event, while the photos are fresh.',
      fashion: 'Message past customers before aso-ebi season and the big holidays.',
      home: 'Offer a regular slot: weekly, fortnightly or monthly.',
      logistics: 'Send your shipping calendar to past customers every month.',
    },
  },
}
