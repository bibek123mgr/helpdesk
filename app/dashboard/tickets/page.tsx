'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  Autocomplete, ToggleButtonGroup, ToggleButton, Divider, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Popover, List, ListItem, ListItemText, ListItemIcon, ListItemButton,
  Tooltip, Stack,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import AddIcon from '@mui/icons-material/Add'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PeopleIcon from '@mui/icons-material/People'
import PersonIcon from '@mui/icons-material/Person'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

// ---------- Types ----------

type OrgUser = {
  id: number
  name: string | null
  email: string
}

type Team = {
  id: number
  name: string
}

type Tag = {
  id: number
  orgId: number
  name: string
  color: string | null
  createdAt: string
}

type TicketTag = {
  ticketId: number
  tagId: number
  tag: Tag
}

type Ticket = {
  id: number
  orgId: number
  ticketNumber: number
  subject: string
  description: string
  status: string
  priority: string
  category: string | null
  channel: string | null
  requesterId: number
  assigneeId: number | null
  teamId: number | null
  requester: OrgUser
  assignee: OrgUser | null
  team: Team | null
  tags: TicketTag[]
  createdAt: string
  updatedAt: string
}

type TicketStats = {
  total: number
  open: number
  pending: number
  resolved: number
  closed: number
}

const STAT_KEYS = ['total', 'open', 'pending', 'resolved', 'closed'] as const
type StatKey = (typeof STAT_KEYS)[number]

const EMPTY_STATS: TicketStats = {
  total: 0,
  open: 0,
  pending: 0,
  resolved: 0,
  closed: 0,
}

// ---------- Constants ----------

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#8A93A3' },
  { value: 'medium', label: 'Medium', color: '#2F5DE0' },
  { value: 'high', label: 'High', color: '#E8A63A' },
  { value: 'urgent', label: 'Urgent', color: '#E24C4C' },
]

const CATEGORIES = ['General', 'Billing', 'Technical', 'Account Access', 'Feature Request']

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open: { bg: '#2F5DE014', text: '#2F5DE0' },
  pending: { bg: '#E8A63A14', text: '#B4791F' },
  resolved: { bg: '#12B88614', text: '#0E8F69' },
  closed: { bg: '#8A93A314', text: '#5A6272' },
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#8A93A3',
  medium: '#2F5DE0',
  high: '#E8A63A',
  urgent: '#E24C4C',
}

const FALLBACK_TAG_COLOR = '#5A6272'

function tagChipStyle(color: string | null) {
  const c = color || FALLBACK_TAG_COLOR
  return {
    bgcolor: `${c}1A`,
    color: c,
    borderColor: `${c}55`,
    fontSize: 11,
    height: 22,
    fontWeight: 500,
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ---------- Component ----------

export default function TicketsPage() {
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [loadingContext, setLoadingContext] = useState(true)

  // Create / Edit dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('General')
  const [onBehalfOf, setOnBehalfOf] = useState<OrgUser | null>(null)
  const [teamId, setTeamId] = useState<number | ''>('')
  const [assignee, setAssignee] = useState<OrgUser | null>(null)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null)
  const [deleting, setDeleting] = useState(false)

  // List + stats
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats>(EMPTY_STATS)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Team assignment popover
  const [teamAnchorEl, setTeamAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [assigningTeam, setAssigningTeam] = useState(false)

  // User assignment popover
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedUserTicketId, setSelectedUserTicketId] = useState<number | null>(null)
  const [assigningUser, setAssigningUser] = useState(false)

  // ---------- Data loading ----------

  function normaliseStats(raw: any): TicketStats {
    const out: TicketStats = { ...EMPTY_STATS }
    for (const key of STAT_KEYS) {
      out[key] = Number(raw?.[key] ?? 0)
    }
    if (!out.total) {
      out.total = out.open + out.pending + out.resolved + out.closed
    }
    return out
  }

  function loadTickets(status = statusFilter) {
    setLoadingTickets(true)
    fetch(`/api/tickets?scope=${status}`)
      .then((res) => res.json())
      .then((data) => {
        const ticketsData = Array.isArray(data) ? data : data.tickets || []
        setTickets(
          ticketsData.map((ticket: any) => ({
            ...ticket,
            ticketNumber:
              typeof ticket.ticketNumber === 'number' ? ticket.ticketNumber : 0,
            team: ticket.team || null,
            assignee: ticket.assignee || null,
            tags: Array.isArray(ticket.tags) ? ticket.tags : [],
          }))
        )
        if (data.stats) setStats(normaliseStats(data.stats))
      })
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/teams').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/tags').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([usersData, teamsData, tagsData]) => {
        if (Array.isArray(usersData)) setOrgUsers(usersData)
        if (Array.isArray(teamsData)) setTeams(teamsData)

        // Handle both response shapes: { tags: [...] } and [...]
        if (Array.isArray(tagsData)) {
          setAllTags(tagsData)
        } else if (tagsData && Array.isArray(tagsData.tags)) {
          setAllTags(tagsData.tags)
        } else {
          console.warn('Unexpected /api/tags response:', tagsData)
          setAllTags([])
        }
      })
      .catch((err) => {
        console.error('Failed to load context data:', err)
        setAllTags([])
      })
      .finally(() => setLoadingContext(false))

    loadTickets('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    newStatus: string | null
  ) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus)
      loadTickets(newStatus)
    }
  }

  // ---------- Team assignment ----------

  const handleTeamAssignClick = (
    event: React.MouseEvent<HTMLElement>,
    ticketId: number
  ) => {
    event.stopPropagation()
    setTeamAnchorEl(event.currentTarget)
    setSelectedTicketId(ticketId)
  }
  const handleTeamAssignClose = () => {
    setTeamAnchorEl(null)
    setSelectedTicketId(null)
  }
  const handleTeamAssign = async (teamIdValue: number | null) => {
    if (!selectedTicketId) return
    setAssigningTeam(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamIdValue }),
      })
      if (res.ok) loadTickets(statusFilter)
    } catch (err) {
      console.error('Failed to assign team:', err)
    } finally {
      setAssigningTeam(false)
      handleTeamAssignClose()
    }
  }

  // ---------- User assignment ----------

  const handleUserAssignClick = (
    event: React.MouseEvent<HTMLElement>,
    ticketId: number
  ) => {
    event.stopPropagation()
    setUserAnchorEl(event.currentTarget)
    setSelectedUserTicketId(ticketId)
  }
  const handleUserAssignClose = () => {
    setUserAnchorEl(null)
    setSelectedUserTicketId(null)
  }
  const handleUserAssign = async (userId: number | null) => {
    if (!selectedUserTicketId) return
    setAssigningUser(true)
    try {
      const res = await fetch(`/api/tickets/${selectedUserTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: userId }),
      })
      if (res.ok) loadTickets(statusFilter)
    } catch (err) {
      console.error('Failed to assign user:', err)
    } finally {
      setAssigningUser(false)
      handleUserAssignClose()
    }
  }

  // ---------- Create / Edit ----------

  function resetForm() {
    setSubject('')
    setDescription('')
    setPriority('medium')
    setCategory('General')
    setOnBehalfOf(null)
    setTeamId('')
    setAssignee(null)
    setSelectedTags([])
    setError('')
    setEditingTicket(null)
  }

  function openCreateDialog() {
    resetForm()
    setCreateOpen(true)
  }

  function handleEditClick(ticket: Ticket) {
    setEditingTicket(ticket)
    setSubject(ticket.subject)
    setDescription(ticket.description ?? '')
    setPriority(ticket.priority ?? 'medium')
    setCategory(ticket.category ?? 'General')
    setOnBehalfOf(ticket.requester ?? null)
    setTeamId(ticket.teamId ?? '')
    setAssignee(ticket.assignee ?? null)

    const ticketTags = (ticket.tags ?? []).map((tt) => tt.tag)
    setSelectedTags(ticketTags)

    // Ensure the ticket's tags exist in the options list so chips render
    setAllTags((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]))
      ticketTags.forEach((t) => map.set(t.id, t))
      return Array.from(map.values())
    })

    setError('')
    setCreateOpen(true)
  }

  function handleDeleteClick(ticket: Ticket) {
    setDeleteTarget(ticket)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tickets/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteTarget(null)
        loadTickets(statusFilter)
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Failed to delete ticket:', data.error ?? res.statusText)
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) return
    setSubmitting(true)
    setError('')

    const isEdit = Boolean(editingTicket)
    const url = isEdit ? `/api/tickets/${editingTicket!.id}` : '/api/tickets'
    const method = isEdit ? 'PATCH' : 'POST'

    const payload: Record<string, any> = {
      subject: subject.trim(),
      description: description.trim(),
      priority,
      category,
      teamId: teamId || null,
      assigneeId: assignee?.id ?? null,
      tagIds: selectedTags.map((t) => t.id),
    }
    if (!isEdit) payload.requesterId = onBehalfOf?.id

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSubmitting(false)

    if (res.ok) {
      resetForm()
      setCreateOpen(false)
      loadTickets(statusFilter)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(
        data.error ??
        (isEdit
          ? 'Could not update the ticket. Please try again.'
          : 'Could not create the ticket. Please try again.')
      )
    }
  }

  const filtered = Array.isArray(tickets) ? tickets : []
  const isEditing = Boolean(editingTicket)

  const statCards: { key: StatKey; label: string; icon: any; color: string }[] = [
    { key: 'total',    label: 'Total Tickets',    icon: ConfirmationNumberIcon, color: '#2F5DE0' },
    { key: 'open',     label: 'Open Tickets',     icon: ConfirmationNumberIcon, color: '#2F5DE0' },
    { key: 'pending',  label: 'Pending Tickets',  icon: ScheduleIcon,           color: '#E8A63A' },
    { key: 'resolved', label: 'Resolved Tickets', icon: CheckCircleIcon,        color: '#12B886' },
    { key: 'closed',   label: 'Closed Tickets',   icon: CheckCircleIcon,        color: '#8A93A3' },
  ]

  return (
    <Box>
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
          <Typography variant="h4">Tickets</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track and manage all your support tickets
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          New ticket
        </Button>
      </Box>

      {/* Quick stats — org-wide, unaffected by status filter */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' },
          gap: 2,
          mt: 3,
        }}
      >
        {statCards.map((s) => (
          <Paper
            key={s.key}
            variant="outlined"
            sx={{
              p: 2,
              borderColor: '#E2E5EA',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: `${s.color}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <s.icon sx={{ fontSize: 18, color: s.color }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                {loadingTickets ? <Skeleton width={28} /> : stats[s.key]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        onChange={handleStatusFilterChange}
        size="small"
        sx={{ mt: 3, mb: 2 }}
      >
        <ToggleButton value="all" sx={{ textTransform: 'none' }}>All</ToggleButton>
        <ToggleButton value="open" sx={{ textTransform: 'none' }}>Open</ToggleButton>
        <ToggleButton value="pending" sx={{ textTransform: 'none' }}>Pending</ToggleButton>
        <ToggleButton value="resolved" sx={{ textTransform: 'none' }}>Resolved</ToggleButton>
        <ToggleButton value="closed" sx={{ textTransform: 'none' }}>Closed</ToggleButton>
      </ToggleButtonGroup>

      <Paper variant="outlined" sx={{ borderColor: '#E2E5EA', overflow: 'hidden' }}>
        {loadingTickets ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={48} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {statusFilter === 'all'
                ? 'No tickets yet.'
                : `No ${statusFilter} tickets.`}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    color: 'text.secondary',
                    fontSize: 13,
                    fontWeight: 500,
                    borderColor: '#E2E5EA',
                  },
                }}
              >
                <TableCell sx={{ fontFamily: 'monospace' }}>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((ticket) => {
                const goToTicket = () =>
                  (window.location.href = `/dashboard/tickets/${ticket.id}`)
                const ticketTags = ticket.tags ?? []

                return (
                  <TableRow
                    key={ticket.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: 'text.secondary',
                      }}
                      onClick={goToTicket}
                    >
                      HD-{String(ticket.ticketNumber).padStart(2, '0')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }} onClick={goToTicket}>
                      {ticket.subject}
                    </TableCell>

                    <TableCell onClick={goToTicket}>
                      {ticketTags.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {ticketTags.slice(0, 3).map((tt) => (
                            <Chip
                              key={tt.tagId}
                              label={tt.tag.name}
                              size="small"
                              variant="outlined"
                              sx={tagChipStyle(tt.tag.color)}
                            />
                          ))}
                          {ticketTags.length > 3 && (
                            <Tooltip
                              title={ticketTags
                                .slice(3)
                                .map((tt) => tt.tag.name)
                                .join(', ')}
                            >
                              <Chip
                                label={`+${ticketTags.length - 3}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 11, height: 22 }}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </TableCell>

                    <TableCell sx={{ color: 'text.secondary' }} onClick={goToTicket}>
                      {ticket.requester?.name ?? ticket.requester?.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {ticket.team ? (
                          <Chip label={ticket.team.name} size="small" variant="outlined" sx={{ fontSize: 12 }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                        )}
                        <Tooltip title="Assign team">
                          <IconButton size="small" onClick={(e) => handleTeamAssignClick(e, ticket.id)} sx={{ p: 0.5 }}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {ticket.assignee ? (
                          <Chip
                            label={ticket.assignee.name ?? ticket.assignee.email}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 12 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                        )}
                        <Tooltip title="Assign user">
                          <IconButton size="small" onClick={(e) => handleUserAssignClick(e, ticket.id)} sx={{ p: 0.5 }}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell onClick={goToTicket}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box
                          sx={{
                            width: 7, height: 7, borderRadius: '50%',
                            bgcolor: PRIORITY_COLOR[ticket.priority] || '#8A93A3',
                          }}
                        />
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {ticket.priority}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell onClick={goToTicket}>
                      <Chip
                        label={ticket.status}
                        size="small"
                        sx={{
                          bgcolor: STATUS_COLOR[ticket.status]?.bg || '#E2E5EA',
                          color: STATUS_COLOR[ticket.status]?.text || '#5A6272',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontSize: 13 }}
                      onClick={goToTicket}
                    >
                      {timeAgo(ticket.updatedAt)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditClick(ticket)} sx={{ p: 0.5 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteClick(ticket)} sx={{ p: 0.5, color: 'error.main' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Team Assignment Popover */}
      <Popover
        open={Boolean(teamAnchorEl)}
        anchorEl={teamAnchorEl}
        onClose={handleTeamAssignClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
            Assign to team
          </Typography>
          <Divider />
          <List dense>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleTeamAssign(null)} disabled={assigningTeam}>
                <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Unassigned" />
              </ListItemButton>
            </ListItem>
            {teams.map((team) => (
              <ListItem key={team.id} disablePadding>
                <ListItemButton onClick={() => handleTeamAssign(team.id)} disabled={assigningTeam}>
                  <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={team.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>

      {/* User Assignment Popover */}
      <Popover
        open={Boolean(userAnchorEl)}
        anchorEl={userAnchorEl}
        onClose={handleUserAssignClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
            Assign to user
          </Typography>
          <Divider />
          <List dense>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleUserAssign(null)} disabled={assigningUser}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Unassigned" />
              </ListItemButton>
            </ListItem>
            {orgUsers.map((user) => (
              <ListItem key={user.id} disablePadding>
                <ListItemButton onClick={() => handleUserAssign(user.id)} disabled={assigningUser}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={user.name ?? user.email} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>

      {/* Create / Edit ticket dialog */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          resetForm()
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{isEditing ? 'Edit ticket' : 'New ticket'}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E2E5EA' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 260px' },
              gap: 3,
            }}
          >
            <Box>
              <TextField
                label="Subject"
                placeholder="Briefly describe the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                fullWidth
                autoFocus
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                    CATEGORY
                  </Typography>
                  <Select value={category} onChange={(e) => setCategory(e.target.value)} size="small" sx={{ minWidth: 180 }}>
                    {CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                    PRIORITY
                  </Typography>
                  <ToggleButtonGroup
                    value={priority}
                    exclusive
                    onChange={(_, val) => val && setPriority(val)}
                    size="small"
                  >
                    {PRIORITIES.map((p) => (
                      <ToggleButton key={p.value} value={p.value} sx={{ textTransform: 'none', px: 1.5, gap: 0.75 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.color }} />
                        {p.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {/* Tags */}
              <Box sx={{ mt: 2.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500, mb: 1, display: 'block' }}
                >
                  TAGS
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={allTags}
                  getOptionLabel={(t) => t.name}
                  value={selectedTags}
                  onChange={(_, val) => setSelectedTags(val)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props as any
                    return (
                      <li key={key} {...rest}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: option.color || FALLBACK_TAG_COLOR,
                            }}
                          />
                          <span>{option.name}</span>
                        </Box>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={selectedTags.length === 0 ? 'Add tags…' : ''}
                    />
                  )}
                  noOptionsText={
                    loadingContext ? 'Loading tags…' : 'No tags defined'
                  }
                  sx={{
                    '& .MuiChip-root': {
                      bgcolor: '#5A62721A',
                      color: '#5A6272',
                      borderColor: '#5A627255',
                      height: 22,
                      fontSize: 11,
                      fontWeight: 500,
                    },
                    '& .MuiChip-deleteIcon': {
                      color: '#5A6272',
                      fontSize: 14,
                      '&:hover': {
                        color: '#2F3A4A',
                      },
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 2.5, borderColor: '#E2E5EA' }} />

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                DESCRIPTION
              </Typography>
              <TextField
                placeholder="Include as much detail as you can — what happened, what you expected, and any steps to reproduce it."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={6}
              />

              {error && (
                <Alert severity="error" icon={<ErrorIcon fontSize="small" />} sx={{ mt: 2.5 }}>
                  {error}
                </Alert>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Submitting for
              </Typography>
              <Autocomplete
                size="small"
                options={orgUsers}
                getOptionLabel={(u) => u.name ?? u.email}
                value={onBehalfOf}
                onChange={(_, val) => setOnBehalfOf(val)}
                disabled={isEditing}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Yourself (default)" />
                )}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {isEditing
                  ? 'The requester cannot be changed after creation.'
                  : 'Leave blank to file this under your own name.'}
              </Typography>

              <Divider sx={{ my: 2.5, borderColor: '#E2E5EA' }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Route to team
              </Typography>
              <Select
                size="small"
                fullWidth
                value={teamId}
                onChange={(e) => setTeamId(e.target.value as number)}
                displayEmpty
              >
                <MenuItem value="">No team — unassigned</MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>

              <Divider sx={{ my: 2.5, borderColor: '#E2E5EA' }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Assign to
              </Typography>
              <Autocomplete
                size="small"
                options={orgUsers}
                getOptionLabel={(u) => u.name ?? u.email}
                value={assignee}
                onChange={(_, val) => setAssignee(val)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Unassigned" />
                )}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Optional — leave unassigned to route it into the team queue instead.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setCreateOpen(false)
              resetForm()
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !description.trim()}
          >
            {submitting
              ? isEditing ? 'Saving…' : 'Submitting…'
              : isEditing ? 'Save changes' : 'Submit ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete ticket</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E2E5EA' }}>
          <Typography variant="body2">
            Are you sure you want to delete{' '}
            <strong>HD-{String(deleteTarget?.ticketNumber ?? 0).padStart(2, '0')}</strong>{' '}
            — "{deleteTarget?.subject}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}