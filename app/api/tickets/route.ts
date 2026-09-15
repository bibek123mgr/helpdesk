import { getNextTicketNumber } from "@/lib/getCurrentTicketNumber"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/requirePermission"
import { NextResponse } from "next/server"

interface IWhereClause {
  orgId: number;
  status?: string;
}

export async function POST(request: Request) {

  const { subject, description, priority, category } = await request.json()

  if (!subject || !description || !priority || !category) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const auth = await requirePermission('tickets', 'create')
  const requestUser = auth.user;
  if (!requestUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const currentTicketNumber = await getNextTicketNumber(tx, requestUser.orgId);
      const newTicket = await tx.ticket.create({
        data: {
          orgId: requestUser.orgId,
          ticketNumber: currentTicketNumber,
          subject,
          description,
          priority,
          category,
          requesterId: requestUser.id,
          status: 'open',
        },
      })
      await tx.notification.create({
        data: {
          userId: requestUser.id,
          ticketId: newTicket.id,
          message: `Ticket #${newTicket.ticketNumber} created successfully.`,
          type: 'success',
          isRead: false,
        },
      })
      return newTicket;
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Error creating ticket' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const auth = await requirePermission('tickets', 'view')
  if (!auth.authorized) return auth.response

  const requestUser = auth.user

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') || 'all'

  const whereClause: { orgId: number; status?: string } = {
    orgId: requestUser.orgId,
  }

  if (scope !== 'all') {
    whereClause.status = scope
  }

  // Stats are org-wide — intentionally ignores the `scope` filter
  const statsWhere = { orgId: requestUser.orgId }

  try {
    const [tickets, statusGroups] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          requester: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: statsWhere,
        _count: { _all: true },
      }),
    ])

    // Flatten groupBy result into a simple map
    const counts: Record<string, number> = {}
    let total = 0
    for (const group of statusGroups) {
      const count = group._count._all
      counts[group.status] = count
      total += count
    }

    const stats = {
      total,
      open: counts.open ?? 0,
      pending: counts.pending ?? 0,
      resolved: counts.resolved ?? 0,
      closed: counts.closed ?? 0,
    }

    return NextResponse.json(
      { tickets, stats, isStaff: !!requestUser },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Error fetching tickets' }, { status: 500 })
  }
}