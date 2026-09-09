import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  const auth = await requirePermission('team', 'view')
  if (!auth.authorized) return auth.response

  const users = await prisma.user.findMany({
    where: { orgId: auth.user.orgId },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      role: { select: { id: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const auth = await requirePermission('team', 'create')
  if (!auth.authorized) return auth.response

  const { name, email, password, roleId } = await request.json()

  if (!name || !email || !password || !roleId) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  // make sure the role actually belongs to this org (or is a valid global role)
  const role = await prisma.role.findFirst({
    where: { id: Number(roleId), OR: [{ orgId: auth.user.orgId }, { orgId: null }] },
  })
  if (!role) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const hashed = await hashPassword(password)

  const user = await prisma.user.create({
    data: { orgId: auth.user.orgId, name, email, password: hashed, roleId: role.id },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      role: { select: { id: true, role: true } },
    },
  })

  return NextResponse.json(user, { status: 201 })
}