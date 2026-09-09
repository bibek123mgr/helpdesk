import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('team', 'update')
  if (!auth.authorized) return auth.response

  const { roleId, isActive } = await request.json()

  const user = await prisma.user.update({
    where: { id: Number(params.id), orgId: auth.user.orgId },
    data: {
      ...(roleId !== undefined && { roleId: Number(roleId) }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      role: { select: { id: true, role: true } },
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('team', 'delete')
  if (!auth.authorized) return auth.response

  // don't allow an admin to delete themselves by accident
  if (Number(params.id) === auth.user.id) {
    return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: Number(params.id), orgId: auth.user.orgId } })
  return NextResponse.json({ success: true })
}