// app/api/roles/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

export async function GET() {
  // const auth = await requirePermission('roles', 'view')
  // if (!auth.authorized) return auth.response

  // const roles = await prisma.role.findMany({ where: { orgId: auth.user.orgId } })
  const roles = await prisma.role.findMany()

  return NextResponse.json(roles)
}