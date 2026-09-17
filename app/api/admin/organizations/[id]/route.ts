import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('tickets', 'view')
  if (!auth.authorized) return auth.response

  const { id } = await params
  const orgId = Number(id)
  if (Number.isNaN(orgId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      settings: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          teams: true,
          tickets: true,
          tags: true,
        },
      },
      teams: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              tickets: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          role: {
            select: { role: true },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    timezone: org.timezone,
    settings: org.settings,
    createdAt: org.createdAt,
    counts: {
      users: org._count.users,
      teams: org._count.teams,
      tickets: org._count.tickets,
      tags: org._count.tags,
    },
    teams: org.teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
      _count: {
        members: t._count.members,
        tickets: t._count.tickets,
      },
    })),
    users: org.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      createdAt: u.createdAt,
      role: u.role ? { role: u.role.role } : null,
    })),
  })
}