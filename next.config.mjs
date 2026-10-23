import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'payload'],
  // Pin the workspace root: there is a stray package-lock.json in the home folder,
  // so Next would otherwise guess the wrong root for Turbopack.
  turbopack: {
    root: import.meta.dirname,
  },
}

export default withPayload(nextConfig)
