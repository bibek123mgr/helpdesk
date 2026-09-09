// lib/requirePermission.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { can, ModuleName, Action, PermissionMap } from '@/lib/permissions'

export async function requirePermission(mod: ModuleName, action: Action) {
  const user = await getCurrentUser()

  if (!user) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  // super_admin (orgId: null role) bypasses module checks entirely
  if (user.role.role === 'super_admin' && user.role.orgId === null) {
    return { authorized: true as const, user }
  }


  // if (!can(user.role.permissions as PermissionMap, mod, action)) {
  //   return { authorized: false as const, response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  // }


  return { authorized: true as const, user }
}