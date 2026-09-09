// app/api/roles/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

export async function GET() {
  // const auth = await requirePermission('roles', 'view')
  // if (!auth.authorized) return auth.response

    const roles = await prisma.role.findMany({
    where: {
      role: {
        notIn: ['super_admin', 'org_admin'],
      },
     
    },
  })
  return NextResponse.json(roles)
}