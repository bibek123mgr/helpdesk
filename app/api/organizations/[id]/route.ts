import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/getCurrentUser'

async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role.role !== 'super_admin' || user.role.orgId !== null) {
    return null
  }
  return user
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { plan } = await request.json()

  const org = await prisma.organization.update({
    where: { id: Number(params.id) },
    data: { ...(plan && { plan }) },
    include: { _count: { select: { users: true, tickets: true } } },
  })

  return NextResponse.json(org)
}