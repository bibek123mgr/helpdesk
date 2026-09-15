export const MODULES = ['tickets','user', 'team', 'organization', 'roles', 'reports', 'notifications', 'tags'] as const
export type ModuleName = (typeof MODULES)[number]

export const ACTIONS = ['view', 'create', 'update', 'delete'] as const
export type Action = (typeof ACTIONS)[number]

export type PermissionMap = Partial<Record<ModuleName, Partial<Record<Action, boolean>>>>

export function can(permissions: PermissionMap | null | undefined, mod: ModuleName, action: Action): boolean {
  if (!permissions) return false
  return permissions[mod]?.[action] === true
}

// A module is "usable" if any action on it is granted — this is your on/off toggle per model
export function moduleEnabled(permissions: PermissionMap | null | undefined, mod: ModuleName): boolean {
  if (!permissions) return false
  const modulePerms = permissions[mod]
  if (!modulePerms) return false
  return Object.values(modulePerms).some(Boolean)
}

export const DEFAULT_PERMISSIONS: Record<'org_admin' | 'agent' | 'user', PermissionMap> = {
  org_admin: {
    tickets: { view: true, create: true, update: true, delete: true },
    team: { view: true, create: true, update: true, delete: true },
    organization: { view: true, update: true },
    roles: { view: true, create: true, update: true, delete: true },
    reports: { view: true },
  },
  agent: {
    tickets: { view: true, create: true, update: true, delete: false },
    team: { view: true },
    reports: { view: true },
  },
  user: {
    tickets: { view: true, create: true, update: false, delete: false },
  },
}