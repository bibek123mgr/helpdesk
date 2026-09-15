import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/getCurrentUser'
import DashboardShell from '@/components/DashboardShell'
import { UserProvider } from '@/lib/user-context'
import type { PermissionMap } from '@/lib/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const shellUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    organization: { name: user.organization.name },
    role: {
      role: user.role.role,
      orgId: user.role.orgId,
      permissions: user.role.permissions as PermissionMap | null,
    },
  }

  return (
    <UserProvider user={shellUser}>
      <DashboardShell user={shellUser}>{children}</DashboardShell>
    </UserProvider>
  )
}