import type { CollectionConfig } from 'payload'
import { submissionAccess, submissionStatus } from './submissionFields'

/**
 * Every completed Leakcheck lands here. This replaces the old Google Sheet endpoint:
 * the three-step tool posts the visitor's contact details, their answers and the
 * computed leak figures through the submitLead server action (see src/forms/actions.ts).
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'business', 'email', 'businessType', 'monthlyHigh', 'status', 'createdAt'],
    group: 'Submissions',
  },
  access: submissionAccess,
  fields: [
    // ---- Contact ----
    { name: 'name', label: 'First name', type: 'text', required: true },
    { name: 'business', label: 'Business name', type: 'text' },
    { name: 'whatsapp', label: 'WhatsApp number', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'consent',
      label: 'Consented to contact',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      label: 'Traffic source',
      type: 'text',
      admin: { position: 'sidebar', description: 'From ?src= or ?utm_source= on the landing URL.' },
    },
    {
      name: 'currency',
      type: 'select',
      options: ['GBP', 'USD', 'EUR', 'NGN'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'businessType',
      type: 'select',
      options: [
        { label: 'Food and catering', value: 'food' },
        { label: 'Hair, beauty and nails', value: 'beauty' },
        { label: 'Events and celebrations', value: 'events' },
        { label: 'Fashion and tailoring', value: 'fashion' },
        { label: 'Cleaning and home services', value: 'home' },
        { label: 'Cargo, shipping and errands', value: 'logistics' },
      ],
    },

    // ---- What they told us (a typical month) ----
    {
      type: 'group',
      name: 'answers',
      label: 'Their answers',
      fields: [
        { name: 'inquiries', label: 'New inquiries / month', type: 'number' },
        { name: 'value', label: 'Typical sale value', type: 'number' },
        { name: 'convert', label: 'Paying, out of 10', type: 'number' },
        { name: 'speed', label: 'First reply speed', type: 'text' },
        { name: 'missed', label: 'Slip-through rate', type: 'text' },
        { name: 'quiet', label: 'Quiet quotes / month', type: 'number' },
        { name: 'chase', label: 'Follow-up habit', type: 'text' },
        { name: 'noshows', label: 'No-shows / month', type: 'number' },
        { name: 'reminders', label: 'Sends reminders', type: 'text' },
        { name: 'unpaid', label: 'Unpaid / late / month', type: 'number' },
        { name: 'askback', label: 'Asks customers back', type: 'text' },
      ],
    },

    // ---- What Leakcheck estimated ----
    {
      type: 'group',
      name: 'result',
      label: 'Estimated result',
      fields: [
        { name: 'monthlyLow', label: 'Could win back (low) / month', type: 'number' },
        { name: 'monthlyHigh', label: 'Could win back (high) / month', type: 'number' },
        { name: 'topLeak', label: 'Biggest leak', type: 'text' },
        {
          type: 'row',
          fields: [
            { name: 'leakUnanswered', label: 'Unanswered inquiries', type: 'number' },
            { name: 'leakSlowReplies', label: 'Slow replies', type: 'number' },
            { name: 'leakQuotes', label: 'Quiet quotes', type: 'number' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'leakNoShows', label: 'No-shows', type: 'number' },
            { name: 'leakPayments', label: 'Unpaid', type: 'number' },
            { name: 'leakRepeat', label: 'Not asked back', type: 'number' },
          ],
        },
      ],
    },
    {
      name: 'reportText',
      label: 'Report (as sent)',
      type: 'textarea',
      admin: { description: 'The plain-text report the visitor can send on WhatsApp.' },
    },

    submissionStatus,
  ],
  timestamps: true,
}
