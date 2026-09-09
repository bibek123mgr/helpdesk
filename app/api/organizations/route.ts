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

export async function GET() {
  // const user = await requireSuperAdmin()
  // if (!user) {
  //   return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  // }

  const organizations = await prisma.organization.findMany({
    include: {
      _count: { select: { users: true, tickets: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(organizations)
}