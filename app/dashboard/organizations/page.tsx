'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, TextField, InputAdornment, Select, MenuItem, Skeleton, Snackbar, Alert,
  Drawer, Divider, Avatar, Stack, IconButton, Tooltip, List,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import CloseIcon from '@mui/icons-material/Close'
import GroupsIcon from '@mui/icons-material/Groups'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import BadgeIcon from '@mui/icons-material/Badge'
import RefreshIcon from '@mui/icons-material/Refresh'

type Org = {
  id: number
  name: string | null
  slug: string
  plan: string
  createdAt: string
  _count: { users: number; tickets: number }
}

type OrgTeam = {
  id: number
  name: string
  description: string | null
  _count?: { members?: number; tickets?: number }
}

type OrgUser = {
  id: number
  name: string | null
  email: string
  isActive: boolean
  role?: { role: string } | null
}

type OrgDetail = {
  name: string | null
  slug: string
  plan: string
  createdAt: string
  counts: {
    users: number
    teams: number
    tickets: number
    tags: number
  }
  teams: OrgTeam[]
  users: OrgUser[]
}

const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  free: { bg: '#8A93A314', text: '#5A6272' },
  pro: { bg: '#2F5DE014', text: '#2F5DE0' },
  enterprise: { bg: '#12B88614', text: '#0E8F69' },
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email || 'U'
  return source.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const [drawerOrgId, setDrawerOrgId] = useState<number | null>(null)
  const [detail, setDetail] = useState<OrgDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Cache opened org details so re-opening is instant
  const detailCache = useRef<Map<number, OrgDetail>>(new Map())

  useEffect(() => {
    fetch('/api/admin/organizations')
      .then((res) => res.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false))
  }, [])

  const safeOrgs = Array.isArray(orgs) ? orgs : []

  const filtered = useMemo(() => {
    if (!search.trim()) return safeOrgs
    const q = search.toLowerCase()
    return safeOrgs.filter(
      (o) => (o.name ?? '').toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    )
  }, [safeOrgs, search])

  const totals = useMemo(
    () => ({
      orgs: safeOrgs.length,
      users: safeOrgs.reduce((sum, o) => sum + (o._count?.users ?? 0), 0),
      tickets: safeOrgs.reduce((sum, o) => sum + (o._count?.tickets ?? 0), 0),
    }),
    [safeOrgs]
  )

  async function changePlan(org: Org, plan: string) {
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, plan } : o)))
    const res = await fetch(`/api/admin/organizations/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (!res.ok) {
      setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, plan: org.plan } : o)))
      setToast({ open: true, message: 'Could not update plan', severity: 'error' })
    } else {
      // Invalidate the cached detail so a re-open reflects the new plan
      detailCache.current.delete(org.id)
    }
  }

  // ---------- Fetch detail on click ----------
  async function openDrawer(orgId: number, opts: { bustCache?: boolean } = {}) {
    setDrawerOrgId(orgId)

    if (!opts.bustCache) {
      const cached = detailCache.current.get(orgId)
      if (cached) {
        setDetail(cached)
        setLoadingDetail(false)
        return
      }
    }

    setDetail(null)
    setLoadingDetail(true)

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data: OrgDetail = await res.json()
      detailCache.current.set(orgId, data)
      setDetail(data)
    } catch (err) {
      console.error('Failed to load organization details:', err)
      setToast({ open: true, message: 'Could not load organization details', severity: 'error' })
      setDrawerOrgId(null)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function refreshDrawer() {
    if (!drawerOrgId) return
    detailCache.current.delete(drawerOrgId)
    openDrawer(drawerOrgId, { bustCache: true })
  }

  function closeDrawer() {
    setDrawerOrgId(null)
    setDetail(null)
  }

  const drawerOrg = safeOrgs.find((o) => o.id === drawerOrgId) ?? null

  return (
    <Box>
      <Typography variant="h4">Organizations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Every workspace running on this platform.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
        {[
          { label: 'Organizations', value: totals.orgs, icon: BusinessIcon, color: '#2F5DE0' },
          { label: 'Total users', value: totals.users, icon: PeopleAltIcon, color: '#12B886' },
          { label: 'Total tickets', value: totals.tickets, icon: ConfirmationNumberIcon, color: '#E8A63A' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ p: 2, borderColor: '#E2E5EA', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon sx={{ fontSize: 18, color: s.color }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <TextField
        size="small"
        placeholder="Search by name or workspace ID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mt: 3, mb: 2, width: 320, maxWidth: '100%' }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      />

      <Paper variant="outlined" sx={{ borderColor: '#E2E5EA', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {search ? 'No organizations match your search.' : 'No organizations yet.'}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 13, fontWeight: 500, borderColor: '#E2E5EA' } }}>
                <TableCell>Organization</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell align="center">Users</TableCell>
                <TableCell align="center">Tickets</TableCell>
                <TableCell align="right">Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((org) => (
                <TableRow
                  key={org.id}
                  hover
                  onClick={() => openDrawer(org.id)}
                  onMouseEnter={() => {
                    // Optional prefetch: cache details on hover, ignore errors
                    if (detailCache.current.has(org.id)) return
                    fetch(`/api/admin/organizations/${org.id}`)
                      .then((r) => (r.ok ? r.json() : null))
                      .then((data) => data && detailCache.current.set(org.id, data))
                      .catch(() => {})
                  }}
                  sx={{
                    cursor: 'pointer',
                    '& td': { borderColor: '#F1F2F4' },
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#14181F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <BusinessIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{org.name ?? 'Untitled organization'}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{org.slug}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={org.plan}
                      onChange={(e) => changePlan(org, e.target.value)}
                      size="small"
                      sx={{
                        minWidth: 130, fontSize: 13, textTransform: 'capitalize',
                        '& .MuiSelect-select': { py: 0.5 },
                      }}
                      renderValue={(val) => (
                        <Chip
                          label={val as string}
                          size="small"
                          sx={{ bgcolor: PLAN_COLOR[val as string]?.bg ?? '#8A93A314', color: PLAN_COLOR[val as string]?.text ?? 'text.secondary', fontWeight: 500, textTransform: 'capitalize' }}
                        />
                      )}
                    >
                      <MenuItem value="free">Free</MenuItem>
                      <MenuItem value="pro">Pro</MenuItem>
                      <MenuItem value="enterprise">Enterprise</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="center">{org._count?.users ?? 0}</TableCell>
                  <TableCell align="center">{org._count?.tickets ?? 0}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {formatDate(org.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ---------- Organization detail drawer ---------- */}
      <Drawer anchor="right" open={!!drawerOrgId} onClose={closeDrawer}>
        <Box sx={{ width: { xs: 340, sm: 440 }, p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#14181F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <BusinessIcon fontSize="small" />
              </Box>
              <Typography variant="h6">
                {detail?.name ?? drawerOrg?.name ?? 'Loading…'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Reload">
                <IconButton size="small" onClick={refreshDrawer} disabled={loadingDetail}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={closeDrawer}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {(detail || drawerOrg) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 2.5, ml: '48px', fontFamily: 'monospace' }}
            >
              {detail?.slug ?? drawerOrg?.slug} · created{' '}
              {formatDate(detail?.createdAt ?? drawerOrg?.createdAt ?? '')}
            </Typography>
          )}

          {loadingDetail ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={70} />
              <Skeleton variant="rounded" height={70} />
              <Skeleton variant="rounded" height={140} />
              <Skeleton variant="rounded" height={140} />
            </Stack>
          ) : detail ? (
            <>
              {/* Plan */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">Plan</Typography>
                <Chip
                  label={detail.plan}
                  size="small"
                  sx={{
                    bgcolor: PLAN_COLOR[detail.plan]?.bg ?? '#8A93A314',
                    color: PLAN_COLOR[detail.plan]?.text ?? 'text.secondary',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>

              {/* Stats grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                {[
                  { label: 'Users', value: detail.counts.users, icon: PeopleAltIcon, color: '#2F5DE0' },
                  { label: 'Teams', value: detail.counts.teams, icon: GroupsIcon, color: '#E8A63A' },
                  { label: 'Tickets', value: detail.counts.tickets, icon: ConfirmationNumberIcon, color: '#12B886' },
                  { label: 'Tags', value: detail.counts.tags, icon: LocalOfferIcon, color: '#7C3AED' },
                ].map((s) => (
                  <Paper key={s.label} variant="outlined" sx={{ p: 2, borderColor: '#E2E5EA', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon sx={{ fontSize: 16, color: s.color }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* Teams list */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Teams ({detail.teams.length})
              </Typography>
              <Divider sx={{ borderColor: '#E2E5EA', mb: 1 }} />
              {detail.teams.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 2 }}>
                  No teams yet.
                </Typography>
              ) : (
                <List sx={{ py: 0, mb: 3 }}>
                  {detail.teams.map((team) => (
                    <Box
                      key={team.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.25,
                        borderBottom: '1px solid #F1F2F4',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#2F5DE0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                          <GroupsIcon sx={{ fontSize: 16 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{team.name}</Typography>
                          {team.description && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {team.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {typeof team._count?.members === 'number' && (
                          <Chip
                            label={`${team._count.members} member${team._count.members === 1 ? '' : 's'}`}
                            size="small"
                            sx={{ bgcolor: '#8A93A314', color: 'text.secondary', height: 20, fontSize: 11 }}
                          />
                        )}
                        {typeof team._count?.tickets === 'number' && (
                          <Chip
                            label={`${team._count.tickets} ticket${team._count.tickets === 1 ? '' : 's'}`}
                            size="small"
                            sx={{ bgcolor: '#2F5DE014', color: '#2F5DE0', height: 20, fontSize: 11 }}
                          />
                        )}
                      </Stack>
                    </Box>
                  ))}
                </List>
              )}

              {/* Users list */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                Users ({detail.users.length})
              </Typography>
              <Divider sx={{ borderColor: '#E2E5EA', mb: 1 }} />
              {detail.users.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 2 }}>
                  No users yet.
                </Typography>
              ) : (
                <List sx={{ py: 0 }}>
                  {detail.users.map((user) => (
                    <Box
                      key={user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.25,
                        borderBottom: '1px solid #F1F2F4',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: user.isActive ? '#2F5DE0' : '#8A93A3', fontSize: 12 }}>
                          {initials(user.name, user.email)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                            {user.name ?? user.email}
                          </Typography>
                          {user.name && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {user.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {user.role?.role && (
                          <Chip
                            label={user.role.role.replace(/_/g, ' ')}
                            size="small"
                            sx={{ bgcolor: '#7C3AED14', color: '#7C3AED', height: 20, fontSize: 11, textTransform: 'capitalize' }}
                          />
                        )}
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: user.isActive ? '#12B88614' : '#8A93A314',
                            color: user.isActive ? '#0E8F69' : '#5A6272',
                            height: 20,
                            fontSize: 11,
                          }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </List>
              )}
            </>
          ) : null}
        </Box>
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  )
}