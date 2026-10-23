import type { Access, AccessArgs, FieldAccess } from 'payload'

type UserWithRole = { id: string; role?: 'admin' | 'editor' }

async function getRole(req: AccessArgs['req']): Promise<'admin' | 'editor' | undefined> {
  if (!req.user?.id) return undefined
  try {
    const user = (await req.payload.findByID({
      collection: 'users',
      id: req.user.id as string,
      overrideAccess: true,
      depth: 0,
    })) as UserWithRole
    return user?.role
  } catch {
    return undefined
  }
}

export const isAdmin: Access = async ({ req }) => (await getRole(req)) === 'admin'

export const isAdminOrEditor: Access = async ({ req }) => {
  const role = await getRole(req)
  return role === 'admin' || role === 'editor'
}

export const isAdminOrSelf: Access = async ({ req }) => {
  if (!req.user) return false
  const role = await getRole(req)
  if (role === 'admin') return true
  return { id: { equals: req.user.id } }
}

export const isAdminField: FieldAccess = async ({ req }) => (await getRole(req)) === 'admin'
