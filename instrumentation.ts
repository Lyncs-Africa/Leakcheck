export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URI) {
    try {
      const { getPayload } = await import('payload')
      const config = await import('@payload-config')
      await getPayload({ config: config.default })
    } catch (err) {
      // Don't let a database that's unreachable at boot take down the whole app. The
      // public calculator works without it; the admin panel and lead storage will start
      // working as soon as DATABASE_URI points at a reachable MongoDB.
      console.warn('[leakcheck] Payload could not connect to MongoDB at startup:', (err as Error).message)
    }
  }
}
