'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import EmailIcon from '@mui/icons-material/Email'
import BadgeIcon from '@mui/icons-material/Badge'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import { useUser } from '@/lib/user-context'
import { moduleEnabled } from '@/lib/permissions'

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
function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function TeamAndUsersPage() {
  const router = useRouter()
  const { can, user } = useUser()

  // ---- Teams permissions ----
  const canViewTeams = can('team', 'view')
  const canCreateTeams = can('team', 'create')
  const canUpdateTeams = can('team', 'update')
  const canDeleteTeams = can('team', 'delete')

  // ---- Users permissions (separate module) ----
  const canViewUsers = can('user', 'view')
  const canCreateUsers = can('user', 'create')
  const canUpdateUsers = can('user', 'update')
  const canDeleteUsers = can('user', 'delete')

  const hasAnyTeamPermission = moduleEnabled(user.role.permissions, 'team')
  const hasAnyUserPermission = moduleEnabled(user.role.permissions, 'user')
  const hasAnyPermission = hasAnyTeamPermission || hasAnyUserPermission

  const userSectionAccessible = hasAnyUserPermission
  const teamSectionAccessible = hasAnyTeamPermission

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

  // Teams create dialog
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  // Team drawer
  const [drawerTeamId, setDrawerTeamId] = useState<number | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [pickedUser, setPickedUser] = useState<OrgUser | null>(null)

  // User drawer
  const [drawerUserId, setDrawerUserId] = useState<number | null>(null)

  // Redirect away if no permission on either module
  useEffect(() => {
    if (!hasAnyPermission) {
      router.replace('/dashboard')
    }
  }, [hasAnyPermission, router])

  // Only fetch the section the user is allowed to view
  useEffect(() => {
    const tasks: Promise<any>[] = []

    if (canViewUsers || canViewTeams) {
      tasks.push(fetch('/api/roles').then((r) => r.json()).catch(() => []))
    }
    if (canViewUsers) {
      tasks.push(fetch('/api/users').then((r) => r.json()).catch(() => []))
    }
    if (canViewTeams) {
      tasks.push(fetch('/api/teams').then((r) => r.json()).catch(() => []))
    }

    if (tasks.length === 0) {
      setLoading(false)
      return
    }

    Promise.all(tasks).then((results) => {
      let i = 0
      if (canViewUsers || canViewTeams) {
        const r = results[i++]
        setRoles(Array.isArray(r) ? r : [])
      }
      if (canViewUsers) {
        const u = results[i++]
        setUsers(Array.isArray(u) ? u : [])
      }
      if (canViewTeams) {
        const t = results[i++]
        setTeams(Array.isArray(t) ? t : [])
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewUsers, canViewTeams])

  useEffect(() => {
    if (roles.length > 0 && roleId === '') setRoleId(roles[0].id)
  }, [roles, roleId])

  const safeUsers = Array.isArray(users) ? users : []
  const safeRoles = Array.isArray(roles) ? roles : []
  const safeRolesForUserCreation = safeRoles.filter(
    (role) => role.role !== 'super_admin' && role.role !== 'org_admin'
  )
  const safeTeams = Array.isArray(teams) ? teams : []
  const drawerTeam = safeTeams.find((t) => t.id === drawerTeamId) ?? null
  const drawerMembers = drawerTeam && Array.isArray(drawerTeam.members) ? drawerTeam.members : []

  const drawerUser = safeUsers.find((u) => u.id === drawerUserId) ?? null
  const drawerUserTeams = useMemo(() => {
    if (!drawerUser) return []
    return safeTeams.filter((t) =>
      Array.isArray(t.members) && t.members.some((m) => m.user.id === drawerUser.id)
    )
  }, [drawerUser, safeTeams])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return safeUsers
    const q = search.toLowerCase()
    return safeUsers.filter((u) => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [safeUsers, search])

  const activeCount = safeUsers.filter((u) => u.isActive).length

  // ---------- Users ----------
  async function createUser() {
    if (!canCreateUsers) return
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
    if (!canUpdateUsers) return
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)))
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
  }

  async function changeRole(user: OrgUser, newRoleId: number) {
    if (!canUpdateUsers) return
    const newRole = safeRoles.find((r) => r.id === newRoleId)
    if (!newRole) return
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: newRoleId }),
    })
  }

  async function removeUser(user: OrgUser) {
    if (!canDeleteUsers) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setDrawerUserId(null)
      setToast({ open: true, message: 'User removed', severity: 'success' })
    } else {
      const data = await res.json().catch(() => ({}))
      setToast({ open: true, message: data.error ?? 'Could not remove user', severity: 'error' })
    }
  }

  // ---------- Teams ----------
  async function createTeam() {
    if (!canCreateTeams) return
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

  function openTeamDrawer(id: number) {
    const team = safeTeams.find((t) => t.id === id)
    setDrawerTeamId(id)
    setDescDraft(team?.description ?? '')
    setAddingMember(false)
  }

  async function saveDescription() {
    if (!drawerTeam || !canUpdateTeams) return
    await fetch(`/api/teams/${drawerTeam.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descDraft }),
    })
    setTeams((prev) => prev.map((t) => (t.id === drawerTeam.id ? { ...t, description: descDraft } : t)))
  }

  async function addMember() {
    if (!drawerTeam || !pickedUser || !canUpdateTeams) return
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
    if (!drawerTeam || !canUpdateTeams) return
    await fetch(`/api/teams/${drawerTeam.id}/members/${userId}`, { method: 'DELETE' })
    setTeams((prev) =>
      prev.map((t) =>
        t.id === drawerTeam.id
          ? { ...t, members: (Array.isArray(t.members) ? t.members : []).filter((m) => m.user.id !== userId) }
          : t
      )
    )
  }

  async function deleteTeam(teamId: number) {
    if (!canDeleteTeams) return
    const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== teamId))
      setDrawerTeamId(null)
      setToast({ open: true, message: 'Team deleted', severity: 'success' })
    } else {
      const data = await res.json().catch(() => ({}))
      setToast({ open: true, message: data.error ?? 'Could not delete team', severity: 'error' })
    }
  }

  const availableUsers = useMemo(() => {
    if (!drawerTeam) return safeUsers
    const ids = new Set(drawerMembers.map((m) => m.user.id))
    return safeUsers.filter((u) => !ids.has(u.id))
  }, [safeUsers, drawerTeam, drawerMembers])

  if (!hasAnyPermission) {
    return null
  }

  const showUsersTab = userSectionAccessible
  const showTeamsTab = teamSectionAccessible
  const showTabs = showUsersTab && showTeamsTab

  const effectiveTab: 'users' | 'teams' = showUsersTab && showTeamsTab
    ? tab
    : showUsersTab
      ? 'users'
      : 'teams'

  const canCreateInActiveTab =
    effectiveTab === 'users' ? canCreateUsers : canCreateTeams

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Team</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your organization's people and teams.
          </Typography>
        </Box>
        {canCreateInActiveTab && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => (effectiveTab === 'users' ? setCreateUserOpen(true) : setCreateTeamOpen(true))}
          >
            {effectiveTab === 'users' ? 'New user' : 'New team'}
          </Button>
        )}
      </Box>

      {(showUsersTab || showTeamsTab) ? (
        <>
          {(canViewUsers || canViewTeams) && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
              {canViewUsers && (
                <>
                  <Paper variant="outlined" sx={{ p: 2, borderColor: '#E2E5EA', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: '#2F5DE014', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PeopleAltIcon sx={{ fontSize: 18, color: '#2F5DE0' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{safeUsers.length}</Typography>
                      <Typography variant="caption" color="text.secondary">Total users</Typography>
                    </Box>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderColor: '#E2E5EA', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: '#12B88614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#12B886' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{activeCount}</Typography>
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                    </Box>
                  </Paper>
                </>
              )}
              {canViewTeams && (
                <Paper variant="outlined" sx={{ p: 2, borderColor: '#E2E5EA', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: '#E8A63A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GroupsIcon sx={{ fontSize: 18, color: '#E8A63A' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{safeTeams.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Teams</Typography>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {showTabs && (
            <ToggleButtonGroup
              value={effectiveTab}
              exclusive
              onChange={(_, v) => v && setTab(v)}
              size="small"
              sx={{ mt: 3, mb: 2.5, '& .MuiToggleButton-root': { textTransform: 'none', px: 2.5 } }}
            >
              <ToggleButton value="users">Users</ToggleButton>
              <ToggleButton value="teams">Teams</ToggleButton>
            </ToggleButtonGroup>
          )}

          {loading ? (
            <Skeleton variant="rounded" height={320} />
          ) : effectiveTab === 'users' ? (
            // ================= USERS =================
            <Box sx={{ mt: showTabs ? 0 : 3 }}>
              {canViewUsers ? (
                <>
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
                            <TableRow
                              key={user.id}
                              hover
                              onClick={() => setDrawerUserId(user.id)}
                              sx={{
                                cursor: 'pointer',
                                '& td': { borderColor: '#F1F2F4' },
                                '&:hover': { backgroundColor: 'action.hover' },
                              }}
                            >
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
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={user.role?.id ?? ''}
                                  onChange={(e) => changeRole(user, Number(e.target.value))}
                                  size="small"
                                  disabled={!canUpdateUsers}
                                  sx={{ minWidth: 140, textTransform: 'capitalize', fontSize: 13 }}
                                >
                                  {safeRoles.map((r) => (
                                    <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                                      {r.role.replace(/_/g, ' ')}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                  size="small"
                                  checked={user.isActive}
                                  onChange={() => toggleActive(user)}
                                  disabled={!canUpdateUsers}
                                />
                              </TableCell>
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                {canDeleteUsers && (
                                  <IconButton size="small" onClick={() => removeUser(user)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                </>
              ) : (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    You don't have permission to view users.
                  </Typography>
                  {canCreateUsers && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateUserOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      New user
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            // ================= TEAMS =================
            <Box sx={{ mt: showTabs ? 0 : 3 }}>
              {canViewTeams ? (
                safeTeams.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderColor: '#E2E5EA' }}>
                    <GroupsIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1.5 }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>No teams yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                      Create a team to start grouping agents and routing tickets.
                    </Typography>
                    {canCreateTeams && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateTeamOpen(true)}>
                        New team
                      </Button>
                    )}
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
                          onClick={() => openTeamDrawer(team.id)}
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
                )
              ) : (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    You don't have permission to view teams.
                  </Typography>
                  {canCreateTeams && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateTeamOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      New team
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ p: 5, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary">
            You don't have permission to view team.
          </Typography>
        </Box>
      )}

      {/* ---------- User detail drawer ---------- */}
      <Drawer anchor="right" open={!!drawerUser} onClose={() => setDrawerUserId(null)}>
        {drawerUser && (
          <Box sx={{ width: 380, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="h6">User details</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {canDeleteUsers && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (confirm(`Remove ${drawerUser.name ?? drawerUser.email}? This cannot be undone.`)) {
                        removeUser(drawerUser)
                      }
                    }}
                    sx={{ color: 'error.main', mr: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => setDrawerUserId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: '#2F5DE0', fontSize: 20 }}>
                {initials(drawerUser.name, drawerUser.email)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                  {drawerUser.name ?? drawerUser.email}
                </Typography>
                <Chip
                  label={drawerUser.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: drawerUser.isActive ? '#12B88614' : '#8A93A314',
                    color: drawerUser.isActive ? '#0E8F69' : '#5A6272',
                    fontWeight: 500,
                    height: 20,
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ borderColor: '#E2E5EA', mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 14 }} /> EMAIL
                </Typography>
                <Typography variant="body2">{drawerUser.email}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 14 }} /> ROLE
                </Typography>
                <Select
                  value={drawerUser.role?.id ?? ''}
                  onChange={(e) => changeRole(drawerUser, Number(e.target.value))}
                  size="small"
                  fullWidth
                  disabled={!canUpdateUsers}
                  sx={{ textTransform: 'capitalize', fontSize: 13 }}
                >
                  {safeRoles.map((r) => (
                    <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                      {r.role.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">ACTIVE</Typography>
                  <Typography variant="body2">{drawerUser.isActive ? 'Yes' : 'No'}</Typography>
                </Box>
                <Switch
                  size="small"
                  checked={drawerUser.isActive}
                  onChange={() => toggleActive(drawerUser)}
                  disabled={!canUpdateUsers}
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 14 }} /> CREATED
                </Typography>
                <Typography variant="body2">{formatDate(drawerUser.createdAt)}</Typography>
              </Box>
            </Box>

            <Divider sx={{ borderColor: '#E2E5EA', my: 2.5 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Teams ({drawerUserTeams.length})
            </Typography>

            {drawerUserTeams.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Not a member of any team.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {drawerUserTeams.map((team) => (
                  <Paper
                    key={team.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: '#E2E5EA',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2F5DE0' },
                    }}
                    onClick={() => {
                      setDrawerUserId(null)
                      setTimeout(() => openTeamDrawer(team.id), 150)
                    }}
                  >
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#2F5DE0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <GroupsIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                      {team.name}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* ---------- Team detail drawer ---------- */}
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {canDeleteTeams && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (confirm(`Delete team "${drawerTeam.name}"? This cannot be undone.`)) {
                        deleteTeam(drawerTeam.id)
                      }
                    }}
                    sx={{ color: 'error.main', mr: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => setDrawerTeamId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5, ml: '48px' }}>
              Created {formatDate(drawerTeam.createdAt)} · {drawerTeam._count?.tickets ?? 0} ticket{(drawerTeam._count?.tickets ?? 0) === 1 ? '' : 's'} handled
            </Typography>

            <TextField
              fullWidth size="small" label="Description"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDescription}
              disabled={!canUpdateTeams}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Members ({drawerMembers.length})
              </Typography>
              {canUpdateTeams && !addingMember && (
                <Button size="small" startIcon={<PersonAddIcon fontSize="small" />} onClick={() => setAddingMember(true)}>
                  Add
                </Button>
              )}
            </Box>

            {canUpdateTeams && addingMember && (
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
                  <Box
                    key={user.id}
                    onClick={() => {
                      setDrawerTeamId(null)
                      setTimeout(() => setDrawerUserId(user.id), 150)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1.25,
                      borderBottom: '1px solid #F1F2F4',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: '#2F5DE0', fontSize: 12 }}>
                        {initials(user.name, user.email)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.name ?? user.email}</Typography>
                        {user.name && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
                      </Box>
                    </Box>
                    {canUpdateTeams && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeMember(user.id)
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
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
          <Select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} size="small">
            {safeRolesForUserCreation.map((r) => (
              <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                {r.role.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateUserOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createUser}
            disabled={creatingUser || !name.trim() || !email.trim() || !password || !roleId}
          >
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