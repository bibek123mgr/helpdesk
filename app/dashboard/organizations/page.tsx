'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, TextField, InputAdornment, Select, MenuItem, Skeleton, Snackbar, Alert,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'

type Org = {
  id: number
  name: string | null
  slug: string
  plan: string
  createdAt: string
  _count: { users: number; tickets: number }
}

const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  free: { bg: '#8A93A314', text: '#5A6272' },
  pro: { bg: '#2F5DE014', text: '#2F5DE0' },
  enterprise: { bg: '#12B88614', text: '#0E8F69' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

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
    }
  }

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
                <TableRow key={org.id} sx={{ '& td': { borderColor: '#F1F2F4' } }}>
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
                  <TableCell>
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