'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Avatar, AvatarGroup, Button, Switch, IconButton, Select, MenuItem,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Skeleton, Snackbar, Alert, InputAdornment,
  Drawer, List, Divider, Autocomplete, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1'
import GroupsIcon from '@mui/icons-material/Groups'
import CloseIcon from '@mui/icons-material/Close'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'

type Role = { id: number; role: string }
type OrgUser = {
  id: number; name: string | null; email: string
  isActive: boolean; createdAt: string; role: Role
}
type Member = { user: OrgUser }
type Team = {
  id: number; orgId: number; name: string; description: string | null
  createdAt: string; members: Member[]; _count: { tickets: number }
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  return source.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TeamAndUsersPage() {
  const [tab, setTab] = useState<'users' | 'teams'>('users')
  const [users, setUsers] = useState<OrgUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  // Users create dialog
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(generatePassword())
  const [showPassword, setShowPassword] = useState(false)
  const [roleId, setRoleId] = useState<number | ''>('')
  const [creatingUser, setCreatingUser] = useState(false)

  // Teams
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [drawerTeamId, setDrawerTeamId] = useState<number | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [pickedUser, setPickedUser] = useState<OrgUser | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then((r) => r.json()).catch(() => []),
      fetch('/api/roles').then((r) => r.json()).catch(() => []),
      fetch('/api/teams').then((r) => r.json()).catch(() => []),
    ]).then(([u, r, t]) => {
      setUsers(Array.isArray(u) ? u : [])
      setRoles(Array.isArray(r) ? r : [])
      setTeams(Array.isArray(t) ? t : [])
      if (Array.isArray(r) && r.length > 0) setRoleId(r[0].id)
      setLoading(false)
    })
  }, [])

  const safeUsers = Array.isArray(users) ? users : []
  const safeRoles = Array.isArray(roles) ? roles : []
  const safeRolesForUserCreation = Array.isArray(roles)
  ? roles.filter((role) => role.role !== "super_admin" && role.role !== "org_admin")
  : []  
  const safeTeams = Array.isArray(teams) ? teams : []
  const drawerTeam = safeTeams.find((t) => t.id === drawerTeamId) ?? null
  const drawerMembers = drawerTeam && Array.isArray(drawerTeam.members) ? drawerTeam.members : []

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return safeUsers
    const q = search.toLowerCase()
    return safeUsers.filter((u) => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [safeUsers, search])

  const activeCount = safeUsers.filter((u) => u.isActive).length

  // ---------- Users ----------
  async function createUser() {
    if (!name.trim() || !email.trim() || !password || !roleId) return
    setCreatingUser(true)
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, roleId }),
    })
    setCreatingUser(false)
    if (res.ok) {
      const user: OrgUser = await res.json()
      setUsers((prev) => [user, ...(Array.isArray(prev) ? prev : [])])
      setToast({ open: true, message: `${user.name} added — share their temporary password separately`, severity: 'success' })
      setCreateUserOpen(false)
      setName(''); setEmail(''); setPassword(generatePassword())
    } else {
      const data = await res.json().catch(() => ({}))
      setToast({ open: true, message: data.error ?? 'Could not create user', severity: 'error' })
    }
  }

  async function toggleActive(user: OrgUser) {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)))
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
  }

  async function changeRole(user: OrgUser, newRoleId: number) {
    const newRole = safeRoles.find((r) => r.id === newRoleId)
    if (!newRole) return
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: newRoleId }),
    })
  }

  async function removeUser(user: OrgUser) {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setToast({ open: true, message: 'User removed', severity: 'success' })
    } else {
      const data = await res.json().catch(() => ({}))
      setToast({ open: true, message: data.error ?? 'Could not remove user', severity: 'error' })
    }
  }

  // ---------- Teams ----------
  async function createTeam() {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    const res = await fetch('/api/teams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName.trim(), description: newTeamDesc.trim() || undefined }),
    })
    setCreatingTeam(false)
    if (res.ok) {
      const team: Team = await res.json()
      setTeams((prev) => [team, ...(Array.isArray(prev) ? prev : [])])
      setToast({ open: true, message: 'Team created', severity: 'success' })
      setCreateTeamOpen(false)
      setNewTeamName(''); setNewTeamDesc('')
    } else {
      setToast({ open: true, message: 'Could not create team', severity: 'error' })
    }
  }

  function openDrawer(id: number) {
    const team = safeTeams.find((t) => t.id === id)
    setDrawerTeamId(id)
    setDescDraft(team?.description ?? '')
    setAddingMember(false)
  }

  async function saveDescription() {
    if (!drawerTeam) return
    await fetch(`/api/teams/${drawerTeam.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descDraft }),
    })
    setTeams((prev) => prev.map((t) => (t.id === drawerTeam.id ? { ...t, description: descDraft } : t)))
  }

  async function addMember() {
    if (!drawerTeam || !pickedUser) return
    const res = await fetch(`/api/teams/${drawerTeam.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pickedUser.id }),
    })
    if (res.ok) {
      const user: OrgUser = await res.json()
      setTeams((prev) =>
        prev.map((t) => (t.id === drawerTeam.id ? { ...t, members: [...(Array.isArray(t.members) ? t.members : []), { user }] } : t))
      )
      setToast({ open: true, message: `${user.name ?? user.email} added`, severity: 'success' })
    } else {
      setToast({ open: true, message: 'Could not add member', severity: 'error' })
    }
    setPickedUser(null)
    setAddingMember(false)
  }

  async function removeMember(userId: number) {
    if (!drawerTeam) return
    await fetch(`/api/teams/${drawerTeam.id}/members/${userId}`, { method: 'DELETE' })
    setTeams((prev) =>
      prev.map((t) =>
        t.id === drawerTeam.id
          ? { ...t, members: (Array.isArray(t.members) ? t.members : []).filter((m) => m.user.id !== userId) }
          : t
      )
    )
  }

  const availableUsers = useMemo(() => {
    if (!drawerTeam) return safeUsers
    const ids = new Set(drawerMembers.map((m) => m.user.id))
    return safeUsers.filter((u) => !ids.has(u.id))
  }, [safeUsers, drawerTeam, drawerMembers])

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Team</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your organization's people and teams.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => (tab === 'users' ? setCreateUserOpen(true) : setCreateTeamOpen(true))}
        >
          {tab === 'users' ? 'New user' : 'New team'}
        </Button>
      </Box>

      {/* Quick stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
        {[
          { label: 'Total users', value: safeUsers.length, icon: PeopleAltIcon, color: '#2F5DE0' },
          { label: 'Active', value: activeCount, icon: CheckCircleIcon, color: '#12B886' },
          { label: 'Teams', value: safeTeams.length, icon: GroupsIcon, color: '#E8A63A' },
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

      <ToggleButtonGroup
        value={tab}
        exclusive
        onChange={(_, v) => v && setTab(v)}
        size="small"
        sx={{ mt: 3, mb: 2.5, '& .MuiToggleButton-root': { textTransform: 'none', px: 2.5 } }}
      >
        <ToggleButton value="users">Users</ToggleButton>
        <ToggleButton value="teams">Teams</ToggleButton>
      </ToggleButtonGroup>

      {loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : tab === 'users' ? (
        // ================= USERS =================
        <Box>
          <TextField
            size="small"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2, width: 320, maxWidth: '100%' }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
          />

          <Paper variant="outlined" sx={{ borderColor: '#E2E5EA', overflow: 'hidden' }}>
            {filteredUsers.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {search ? 'No users match your search.' : 'No users yet.'}
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 13, fontWeight: 500, borderColor: '#E2E5EA' } }}>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="center">Active</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover sx={{ '& td': { borderColor: '#F1F2F4' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2F5DE0', fontSize: 13 }}>
                            {initials(user.name, user.email)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.name ?? user.email}</Typography>
                            {user.name && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role?.id ?? ''}
                          onChange={(e) => changeRole(user, Number(e.target.value))}
                          size="small"
                          sx={{ minWidth: 140, textTransform: 'capitalize', fontSize: 13 }}
                        >
                          {safeRoles.map((r) => (
                            <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                              {r.role.replace(/_/g, ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="center">
                        <Switch size="small" checked={user.isActive} onChange={() => toggleActive(user)} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => removeUser(user)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Box>
      ) : (
        // ================= TEAMS =================
        <Box>
          {safeTeams.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderColor: '#E2E5EA' }}>
              <GroupsIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1.5 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>No teams yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                Create a team to start grouping agents and routing tickets.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateTeamOpen(true)}>
                New team
              </Button>
            </Paper>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
              {safeTeams.map((team) => {
                const members = Array.isArray(team.members) ? team.members : []
                const ticketCount = team._count?.tickets ?? 0
                return (
                  <Paper
                    key={team.id}
                    variant="outlined"
                    onClick={() => openDrawer(team.id)}
                    sx={{
                      p: 2.5, borderColor: '#E2E5EA', cursor: 'pointer',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      '&:hover': { borderColor: '#2F5DE0', boxShadow: '0 1px 8px rgba(47,93,224,0.08)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: '#2F5DE0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <GroupsIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{team.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Created {formatDate(team.createdAt)}</Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }}>
                      {team.description || 'No description'}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip
                        icon={<ConfirmationNumberIcon sx={{ fontSize: 14 }} />}
                        label={`${ticketCount} ticket${ticketCount === 1 ? '' : 's'}`}
                        size="small"
                        sx={{ bgcolor: '#2F5DE014', color: '#2F5DE0', fontWeight: 500 }}
                      />
                      {members.length === 0 ? (
                        <Chip label="No members" size="small" sx={{ bgcolor: '#8A93A314', color: 'text.secondary' }} />
                      ) : (
                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 10.5 } }}>
                          {members.map((m) => (
                            <Avatar key={m.user.id} sx={{ bgcolor: '#2F5DE0' }}>
                              {initials(m.user.name, m.user.email)}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      )}
                    </Box>
                  </Paper>
                )
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Team detail drawer */}
      <Drawer anchor="right" open={!!drawerTeam} onClose={() => setDrawerTeamId(null)}>
        {drawerTeam && (
          <Box sx={{ width: 380, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#2F5DE0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <GroupsIcon fontSize="small" />
                </Box>
                <Typography variant="h6">{drawerTeam.name}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerTeamId(null)}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5, ml: '48px' }}>
              Created {formatDate(drawerTeam.createdAt)} · {drawerTeam._count?.tickets ?? 0} ticket{(drawerTeam._count?.tickets ?? 0) === 1 ? '' : 's'} handled
            </Typography>

            <TextField
              fullWidth size="small" label="Description"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDescription}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Members ({drawerMembers.length})
              </Typography>
              {!addingMember && (
                <Button size="small" startIcon={<PersonAddIcon fontSize="small" />} onClick={() => setAddingMember(true)}>
                  Add
                </Button>
              )}
            </Box>

            {addingMember && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Autocomplete
                  size="small" fullWidth
                  options={availableUsers}
                  getOptionLabel={(u) => u.name ?? u.email}
                  value={pickedUser}
                  onChange={(_, val) => setPickedUser(val)}
                  renderInput={(params) => <TextField {...params} placeholder="Search people…" autoFocus />}
                />
                <Button variant="contained" size="small" onClick={addMember} disabled={!pickedUser}>Add</Button>
              </Box>
            )}

            <Divider sx={{ borderColor: '#E2E5EA', mb: 1 }} />

            <List sx={{ py: 0 }}>
              {drawerMembers.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No members yet.</Typography>
                </Box>
              ) : (
                drawerMembers.map(({ user }) => (
                  <Box key={user.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, borderBottom: '1px solid #F1F2F4' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: '#2F5DE0', fontSize: 12 }}>
                        {initials(user.name, user.email)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.name ?? user.email}</Typography>
                        {user.name && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => removeMember(user.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </List>
          </Box>
        )}
      </Drawer>

      {/* Create user dialog */}
      <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New user</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <TextField type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            type={showPassword ? 'text' : 'password'}
            helperText="Share this with them directly — they can change it after logging in."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setPassword(generatePassword())}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Select value={safeRolesForUserCreation[0]?.id} onChange={(e) => setRoleId(Number(e.target.value))} size="small">
            {safeRolesForUserCreation.map((r) => (
              <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                {r.role.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createUser} disabled={creatingUser || !name.trim() || !email.trim() || !password || !roleId}>
            {creatingUser ? 'Creating…' : 'Create user'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create team dialog */}
      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New team</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField label="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} fullWidth autoFocus />
          <TextField label="Description (optional)" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createTeam} disabled={creatingTeam || !newTeamName.trim()}>
            {creatingTeam ? 'Creating…' : 'Create team'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  )
}