import type { CollectionConfig, Field } from 'payload'
import { isAdmin } from '../access'

/** Leads are created by the site's server action; only signed-in admins can read or manage them. */
export const submissionAccess: CollectionConfig['access'] = {
  // The public form writes via the server action (Local API, which overrides access),
  // so REST creation can stay locked to admins to keep the endpoint from being spammed.
  create: isAdmin,
  read: isAdmin,
  update: isAdmin,
  delete: isAdmin,
}

export const submissionStatus: Field = {
  name: 'status',
  type: 'select',
  required: true,
  defaultValue: 'new',
  options: [
    { label: 'New', value: 'new' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Audit booked', value: 'audit-booked' },
    { label: 'Closed', value: 'closed' },
  ],
  admin: {
    position: 'sidebar',
  },
}
