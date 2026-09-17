'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box, Paper, Typography, Chip, Stack, Divider,
  Table, TableBody, TableRow, TableCell, Button, Skeleton,
  Alert,
} from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import GroupsIcon from '@mui/icons-material/Groups'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
// ---------- Types ----------

type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Status = 'open' | 'pending' | 'resolved' | 'closed'

type Kpis = {
  open: number
  unassigned: number
  overdueSla: number
  resolvedThisWeek: number,
  totalUsers:number,
  totalTags:number,
  totalTeams:number
}

type AttentionTicket = {
  id: number
  ticketNumber: number
  subject: string
  priority: Priority
  status: Status
  ageHours: number
  assigneeName: string | null
  teamName: string | null
}

type TrendPoint = { date: string; created: number; resolved: number }
type BreakdownRow = { key: string; count: number }

type DashboardData = {
  kpis: Kpis
  needsAttention: AttentionTicket[]
  trend: TrendPoint[]
  breakdowns: {
    byStatus: BreakdownRow[]
    byPriority: BreakdownRow[]
    byTeam: BreakdownRow[]
  }
}

// ---------- Constants ----------

const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#8A93A3',
  medium: '#2F5DE0',
  high: '#E8A63A',
  urgent: '#E24C4C',
}

const STATUS_COLOR: Record<Status, { bg: string; text: string }> = {
  open:     { bg: '#2F5DE014', text: '#2F5DE0' },
  pending:  { bg: '#E8A63A14', text: '#B4791F' },
  resolved: { bg: '#12B88614', text: '#0E8F69' },
  closed:   { bg: '#8A93A314', text: '#5A6272' },
}

const EMPTY_DATA: DashboardData = {
  kpis: { open: 0, unassigned: 0, overdueSla: 0, resolvedThisWeek: 0,totalTags:0,totalTeams:0,totalUsers:0 },
  needsAttention: [],
  trend: [],
  breakdowns: { byStatus: [], byPriority: [], byTeam: [] },
}

// ---------- Helpers ----------

function ageLabel(hours: number) {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h`
  return `${Math.floor(hours / 24)}d`
}

function sparkPath(values: number[], width: number, height: number) {
  if (values.length < 2) return ''
  const max = Math.max(...values, 1)
  const step = width / (values.length - 1)
  return values
    .map((v, i) => {
      const x = i * step
      const y = height - (v / max) * height
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function normalise(raw: any): DashboardData {
  return {
    kpis: {
      open:             Number(raw?.kpis?.open ?? 0),
      unassigned:       Number(raw?.kpis?.unassigned ?? 0),
      overdueSla:       Number(raw?.kpis?.overdueSla ?? 0),
      resolvedThisWeek: Number(raw?.kpis?.resolvedThisWeek ?? 0),
      totalTags:Number(raw?.kpis?.totalTags ?? 0),
      totalUsers:Number(raw?.kpis?.totalUsers ?? 0),
      totalTeams:Number(raw?.kpis?.totalTeams ?? 0)

    },
    needsAttention: Array.isArray(raw?.needsAttention)
      ? raw.needsAttention.map((t: any) => ({
          id: Number(t.id),
          ticketNumber: Number(t.ticketNumber) || 0,
          subject: String(t.subject ?? ''),
          priority: (t.priority ?? 'medium') as Priority,
          status: (t.status ?? 'open') as Status,
          ageHours: Number(t.ageHours) || 0,
          assigneeName: t.assigneeName ?? null,
          teamName: t.teamName ?? null,
        }))
      : [],
    trend: Array.isArray(raw?.trend)
      ? raw.trend.map((p: any) => ({
          date: String(p.date),
          created: Number(p.created) || 0,
          resolved: Number(p.resolved) || 0,
        }))
      : [],
    breakdowns: {
      byStatus: Array.isArray(raw?.breakdowns?.byStatus)
        ? raw.breakdowns.byStatus.map((r: any) => ({
            key: String(r.key),
            count: Number(r.count) || 0,
          }))
        : [],
      byPriority: Array.isArray(raw?.breakdowns?.byPriority)
        ? raw.breakdowns.byPriority.map((r: any) => ({
            key: String(r.key),
            count: Number(r.count) || 0,
          }))
        : [],
      byTeam: Array.isArray(raw?.breakdowns?.byTeam)
        ? raw.breakdowns.byTeam.map((r: any) => ({
            key: String(r.key),
            count: Number(r.count) || 0,
          }))
        : [],
    },
  }
}

// ---------- Building blocks ----------

function KpiCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string
  value: number
  icon: any
  color: string
  loading: boolean
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: '#E2E5EA',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: '100%',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: `${color}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18, color }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
          {loading ? <Skeleton width={32} /> : value}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
    </Paper>
  )
}

function BarList({
  title, rows, colorMap, emptyText = 'Nothing here yet', loading,
}: {
  title: string
  rows: BreakdownRow[]
  colorMap?: Record<string, string>
  emptyText?: string
  loading?: boolean
}) {
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA', height: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        {title}
      </Typography>

      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i}>
              <Skeleton width="40%" height={18} />
              <Skeleton height={6} sx={{ mt: 0.5, borderRadius: 3 }} />
            </Box>
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => {
            const color = colorMap?.[row.key] ?? '#5A6272'
            const pct = (row.count / max) * 100
            return (
              <Box key={row.key}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {row.key}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.count}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#EEF0F3',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      bgcolor: color,
                      borderRadius: 3,
                      transition: 'width 300ms ease',
                    }}
                  />
                </Box>
              </Box>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}

function TrendChart({
  points, loading,
}: {
  points: TrendPoint[]
  loading?: boolean
}) {
  const width = 520
  const height = 140
  const created = points.map((p) => p.created)
  const resolved = points.map((p) => p.resolved)
  const max = Math.max(...created, ...resolved, 1)

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Created vs Resolved
        </Typography>
        <Stack direction="row" spacing={2}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 2, bgcolor: '#2F5DE0' }} />
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 2, bgcolor: '#12B886' }} />
            <Typography variant="caption" color="text.secondary">
              Resolved
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
      ) : points.length < 2 ? (
        <Box
          sx={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Not enough data yet
          </Typography>
        </Box>
      ) : (
        <Box>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height, display: 'block' }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line
                key={t}
                x1={0}
                x2={width}
                y1={t * height}
                y2={t * height}
                stroke="#EEF0F3"
                strokeWidth={1}
              />
            ))}
            <path
              d={sparkPath(created, width, height)}
              fill="none"
              stroke="#2F5DE0"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={sparkPath(resolved, width, height)}
              fill="none"
              stroke="#12B886"
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {points[0]?.date.slice(5)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {points[points.length - 1]?.date.slice(5)}
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            Peak: {max}/day
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ---------- Page ----------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError('')

    fetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((res) => {
        if (cancelled) return
        setData(normalise(res))
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load dashboard:', err)
        setError('Could not load dashboard data. Please try again.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // KPI strip: only 3 cards now (overdueSla removed)
 const kpiCards = useMemo(
  () => [
    { label: 'Open tickets',       value: data.kpis.open,             icon: InboxIcon,       color: '#2F5DE0' },
    { label: 'Unassigned',         value: data.kpis.unassigned,       icon: PersonOffIcon,   color: '#8A93A3' },
    { label: 'Resolved this week', value: data.kpis.resolvedThisWeek, icon: CheckCircleIcon, color: '#12B886' },
    { label: 'Total Users',        value: data.kpis.totalUsers,       icon: PeopleAltIcon,   color: '#7C3AED' },
    { label: 'Total Teams',        value: data.kpis.totalTeams,       icon: GroupsIcon,      color: '#E8A63A' },
    { label: 'Total Tags',         value: data.kpis.totalTags,        icon: LocalOfferIcon,  color: '#0891B2' },
  ],
  [data.kpis]
)

  const priorityColorMap = useMemo(
    () => Object.fromEntries(Object.entries(PRIORITY_COLOR)) as Record<string, string>,
    []
  )

  const statusColorMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_COLOR).map(([k, v]) => [k, v.text])
      ),
    []
  )

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            An overview of what's happening in your workspace.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          href="/dashboard/tickets"
        >
          All tickets
        </Button>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon fontSize="small" />}
          sx={{ mt: 3 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* KPI strip — now 3 cards in one row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
          mt: 3,
        }}
      >
        {kpiCards.map((k) => (
          <KpiCard key={k.label} {...k} loading={loading} />
        ))}
      </Box>

      {/* Needs attention + Trend */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
          gap: 2,
          mt: 3,
        }}
      >
        {/* Needs attention */}
        <Paper variant="outlined" sx={{ borderColor: '#E2E5EA', overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Needs attention
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Unassigned, high priority, or nearing SLA
              </Typography>
            </Box>
            {!loading && data.needsAttention.length > 0 && (
              <Chip
                label={data.needsAttention.length}
                size="small"
                sx={{
                  bgcolor: '#E24C4C14',
                  color: '#E24C4C',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Divider sx={{ borderColor: '#E2E5EA' }} />

          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={44} />
              ))}
            </Box>
          ) : data.needsAttention.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#12B886', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Nothing needs attention right now.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableBody>
                {data.needsAttention.map((t) => (
                  <TableRow
                    key={t.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() =>
                      (window.location.href = `/dashboard/tickets/${t.id}`)
                    }
                  >
                    <TableCell
                      sx={{
                        width: 60,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: 'text.secondary',
                      }}
                    >
                      HD-{String(t.ticketNumber).padStart(2, '0')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.teamName ?? t.assigneeName ?? 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: 'center' }}
                      >
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            bgcolor: PRIORITY_COLOR[t.priority] ?? '#8A93A3',
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ textTransform: 'capitalize' }}
                        >
                          {t.priority}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        sx={{
                          bgcolor: STATUS_COLOR[t.status]?.bg ?? '#E2E5EA',
                          color: STATUS_COLOR[t.status]?.text ?? '#5A6272',
                          fontWeight: 500,
                          fontSize: 11,
                          height: 20,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontSize: 12 }}
                    >
                      {ageLabel(t.ageHours)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Trend */}
        <TrendChart points={data.trend} loading={loading} />
      </Box>

      {/* Breakdowns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mt: 3,
          mb: 4,
        }}
      >
        <BarList
          title="By status"
          rows={data.breakdowns.byStatus}
          colorMap={statusColorMap}
          loading={loading}
        />
        <BarList
          title="By priority"
          rows={data.breakdowns.byPriority}
          colorMap={priorityColorMap}
          loading={loading}
        />
        <BarList
          title="By team"
          rows={data.breakdowns.byTeam}
          emptyText="No teams assigned yet"
          loading={loading}
        />
      </Box>
    </Box>
  )
}