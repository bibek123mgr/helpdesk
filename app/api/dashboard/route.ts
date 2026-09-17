// app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

export async function GET() {
  const auth = await requirePermission('tickets', 'view')
  if (!auth.authorized) return auth.response

  const requestUser = auth.user
  if (!requestUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // orgId is nullable — null means "super admin, count across all orgs"
  const orgId: number | null = requestUser.orgId ?? null
  const isGlobal = orgId === null

  // Build a reusable scope filter
  const scope = isGlobal ? {} : { orgId: orgId as number }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000)
  const twoHoursFromNow = new Date(now.getTime() + 2 * 3600_000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600_000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000)

  try {
    const [
      open,
      unassigned,
      overdueSla,
      resolvedThisWeek,
      totalUsers,
      totalTeams,
      totalTags,
      needsAttentionRaw,
      byStatusRaw,
      byPriorityRaw,
      byTeamRaw,
      trendRaw,
    ] = await Promise.all([
      // -------- KPIs --------
      prisma.ticket.count({
        where: { ...scope, status: 'open' },
      }),

      prisma.ticket.count({
        where: {
          ...scope,
          status: { notIn: ['resolved', 'closed'] },
          assigneeId: null,
        },
      }),

      prisma.ticket.count({
        where: {
          ...scope,
          status: { notIn: ['resolved', 'closed'] },
          slaResolveDueAt: { lt: now },
        },
      }),

      prisma.ticket.count({
        where: {
          ...scope,
          status: 'resolved',
          updatedAt: { gte: weekAgo },
        },
      }),

      prisma.user.count({
        where: {
          // Super admins themselves don't count toward any org
          ...(isGlobal ? { orgId: { not: null } } : { orgId: orgId as number }),
        },
      }),

      prisma.team.count({ where: scope }),

      prisma.tag.count({ where: scope }),

      // -------- Needs attention --------
      prisma.ticket.findMany({
        where: {
          ...scope,
          status: { notIn: ['resolved', 'closed'] },
          OR: [
            { priority: { in: ['urgent', 'high'] } },
            { assigneeId: null, createdAt: { lt: twentyFourHoursAgo } },
            { slaResolveDueAt: { lt: twoHoursFromNow } },
          ],
        },
        include: {
          assignee: { select: { name: true } },
          team: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { slaResolveDueAt: 'asc' }],
        take: 8,
      }),

      // -------- Breakdowns --------
      prisma.ticket.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
      }),

      prisma.ticket.groupBy({
        by: ['priority'],
        where: scope,
        _count: { _all: true },
      }),

      prisma.ticket.groupBy({
        by: ['teamId'],
        where: scope,
        _count: { _all: true },
      }),

      // -------- Trend (last 30 days) --------
      prisma.ticket.findMany({
        where: {
          ...scope,
          OR: [
            { createdAt: { gte: thirtyDaysAgo } },
            { status: 'resolved', updatedAt: { gte: thirtyDaysAgo } },
          ],
        },
        select: {
          createdAt: true,
          updatedAt: true,
          status: true,
        },
      }),
    ])

    // -------- Resolve team names --------
    const teamIds = byTeamRaw
      .map((r) => r.teamId)
      .filter((id): id is number => id !== null)

    const teamNameMap: Record<number, string> = teamIds.length
      ? Object.fromEntries(
          (
            await prisma.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true },
            })
          ).map((t) => [t.id, t.name])
        )
      : {}

    // -------- Shape the response --------
    const needsAttention = needsAttentionRaw.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      ageHours: Math.floor(
        (now.getTime() - t.createdAt.getTime()) / 3600_000
      ),
      assigneeName: t.assignee?.name ?? null,
      teamName: t.team?.name ?? null,
    }))

    const trend = buildTrend(trendRaw, thirtyDaysAgo, now)

    const breakdowns = {
      byStatus: byStatusRaw.map((r) => ({
        key: r.status,
        count: r._count._all,
      })),
      byPriority: byPriorityRaw.map((r) => ({
        key: r.priority,
        count: r._count._all,
      })),
      byTeam: byTeamRaw.map((r) => ({
        key:
          r.teamId === null
            ? 'Unassigned'
            : teamNameMap[r.teamId] ?? 'Unknown',
        count: r._count._all,
      })),
    }

    return NextResponse.json(
      {
        kpis: {
          open,
          unassigned,
          overdueSla,
          resolvedThisWeek,
          totalUsers,
          totalTeams,
          totalTags,
        },
        scope: isGlobal ? 'global' : 'organization',
        needsAttention,
        trend,
        breakdowns,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Error fetching dashboard' },
      { status: 500 }
    )
  }
}

// ---------- Trend helper ----------

type TrendSourceRow = {
  createdAt: Date
  updatedAt: Date
  status: string
}

type TrendPoint = { date: string; created: number; resolved: number }

function buildTrend(
  rows: TrendSourceRow[],
  from: Date,
  to: Date
): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>()

  const start = new Date(from)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)

  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, created: 0, resolved: 0 })
  }

  for (const row of rows) {
    const createdKey = row.createdAt.toISOString().slice(0, 10)
    const createdBucket = buckets.get(createdKey)
    if (createdBucket) createdBucket.created += 1

    if (row.status === 'resolved') {
      const resolvedKey = row.updatedAt.toISOString().slice(0, 10)
      const resolvedBucket = buckets.get(resolvedKey)
      if (resolvedBucket) resolvedBucket.resolved += 1
    }
  }

  return Array.from(buckets.values())
}