# Leakcheck by Dappa

The Leakcheck revenue-leak calculator, rebuilt as a Next.js app with a **Payload CMS**
backend for lead capture. Same stack and conventions as the OSA and Zanga projects:
Next.js 16 (App Router) + React 19 + Payload 3 on MongoDB.

## What it does

A three-step tool:

1. **Your business** – the visitor picks a business type.
2. **Your numbers** – they answer ~10 questions about a typical month.
3. **Your report** – after leaving their contact details they see estimated monthly
   "leaks" (unanswered inquiries, slow replies, quiet quotes, no-shows, unpaid balances,
   customers never asked back), with fixes and a WhatsApp hand-off.

Every completed run is saved as a **Lead** in Payload (this replaces the old Google
Sheets endpoint). Leads are written by a server action (`src/forms/actions.ts`) and are
only readable by signed-in admins.

## Project layout

```
src/
  app/
    (frontend)/        the public site (layout + page render the calculator)
    (payload)/         Payload admin panel + REST/GraphQL API
  collections/         Leads, Users (+ shared submissionFields)
  access/              role-based access helpers (admin / editor)
  forms/actions.ts     submitLead server action -> payload.create('leads')
  lib/leakcheck/       data.ts (types, leaks, assumptions) + compute.ts (the maths)
  components/leakcheck/ the UI (LeakcheckTool + Icons)
  payload.config.ts
```

## Getting started

1. **Install** (Node 18+):

   ```bash
   npm install
   ```

2. **Environment** – copy `.env.example` to `.env` and fill it in:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URI` – a MongoDB connection string (MongoDB Atlas free tier, or a local
     `mongodb://127.0.0.1:27017/leakcheck`).
   - `PAYLOAD_SECRET` – any long random string.
   - `NEXT_PUBLIC_SERVER_URL` – `http://localhost:3000` in development.

3. **Generate Payload types** (optional but recommended for a clean build):

   ```bash
   npm run generate:types
   ```

4. **Run it:**

   ```bash
   npm run dev
   ```

   - Site: http://localhost:3000
   - Admin: http://localhost:3000/admin — the first visit prompts you to create the
     first admin user. After that, every lead shows up under **Submissions → Leads**.

## The data you collect

Each lead stores: first name, business name, WhatsApp number, email, consent, traffic
source, currency and business type; the full set of answers; the computed leak
breakdown and the low/high monthly estimate; and the plain-text report. Each lead also
has a **status** (New / Contacted / Audit booked / Closed) so you can work the pipeline
from the admin panel.

## Notes

- Unlike OSA/Zanga this build omits Cloudinary and a Media collection — Leakcheck has no
  image uploads (its photos are external Unsplash URLs), so the backend only needs to
  capture leads. Add them back the same way if you later need managed media.
- The business-type images are hot-linked from Unsplash, exactly as in the original
  single-file version.
