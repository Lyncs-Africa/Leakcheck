import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Leads } from './collections/Leads'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// On Vercel the domain is provided at runtime, so the app works without setting a URL by hand.
// Override with NEXT_PUBLIC_SERVER_URL once a custom domain is attached.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
const serverURL =
  process.env.NEXT_PUBLIC_SERVER_URL || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

const allowedOrigins = [
  serverURL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
].filter(Boolean) as string[]

export default buildConfig({
  serverURL,

  admin: {
    user: Users.slug,
    theme: 'light',
    meta: {
      titleSuffix: '- Leakcheck CMS',
    },
  },

  collections: [Leads, Users],

  editor: lexicalEditor({}),

  // Email is optional: only wired up when SMTP settings are present in the environment.
  // Until then Payload falls back to logging emails to the console (harmless).
  ...(process.env.SMTP_HOST
    ? {
        email: nodemailerAdapter({
          defaultFromName: 'Leakcheck by Dappa',
          defaultFromAddress: process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@localhost',
          transportOptions: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        }),
      }
    : {}),

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),

  cors: allowedOrigins,
  csrf: allowedOrigins,
})
