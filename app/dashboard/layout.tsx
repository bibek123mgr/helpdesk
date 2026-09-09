import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/getCurrentUser'
import DashboardShell from '@/components/DashboardShell'
import type { PermissionMap } from '@/lib/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Only pass what the client component actually needs — never the password hash
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

  return <DashboardShell user={shellUser}>{children}</DashboardShell>
}