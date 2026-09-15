'use client'

import { createContext, useContext } from 'react'
import { can as canFn, ModuleName, Action, PermissionMap } from '@/lib/permissions'

export type ShellUser = {
  id: number
  name: string | null
  email: string
  organization: { name: string | null }
  role: {
    role: string
    orgId: number | null
    permissions: PermissionMap | null
  }
}

type UserContextValue = {
  user: ShellUser
  isSuperAdmin: boolean
  can: (mod: ModuleName, action: Action) => boolean
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  const isSuperAdmin =
    user.role.role === 'super_admin' && user.role.orgId === null

  const value: UserContextValue = {
    user,
    isSuperAdmin,
    can: (mod, action) => canFn(user.role.permissions, mod, action),
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}