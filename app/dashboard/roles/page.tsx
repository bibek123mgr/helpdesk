// app/dashboard/team/roles/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow,
  Switch, Button, IconButton, Skeleton, Snackbar, Alert, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { MODULES, ACTIONS, PermissionMap, ModuleName, Action } from '@/lib/permissions'

type Role = { id: number; role: string; permissions: PermissionMap | null }

const MODULE_LABEL: Record<ModuleName, string> = {
  tickets: 'Tickets',
  tags: 'Tags',
  team: 'Team',
  organization: 'Organization',
  roles: 'Roles',
  notifications: 'Notifications',
  reports: 'Reports',
}

const ACTION_LABEL: Record<Action, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [original, setOriginal] = useState<PermissionMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  useEffect(() => {
    fetch('/api/roles')
      .then((res) => res.json())
      .then((data: Role[]) => {
        setRoles(data)
        if (data[0]) {
          setSelectedId(data[0].id)
          setPermissions(data[0].permissions ?? {})
          setOriginal(data[0].permissions ?? {})
        }
        setLoading(false)
      })
      .catch(() => {
        setToast({ open: true, message: 'Could not load roles', severity: 'error' })
        setLoading(false)
      })
  }, [])

  function selectRole(id: number) {
    const role = roles.find((r) => r.id === id)
    setSelectedId(id)
    setPermissions(role?.permissions ?? {})
    setOriginal(role?.permissions ?? {})
  }

  function toggle(mod: ModuleName, action: Action) {
    setPermissions((prev) => ({ ...prev, [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] } }))
  }

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(original)
  const selectedRole = roles.find((r) => r.id === selectedId)

  async function save() {
    if (!selectedId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (!res.ok) throw new Error()
      setOriginal(permissions)
      setRoles((prev) => prev.map((r) => (r.id === selectedId ? { ...r, permissions } : r)))
      setToast({ open: true, message: 'Saved', severity: 'success' })
    } catch {
      setToast({ open: true, message: 'Could not save', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function createRole() {
    if (!newRoleName.trim()) return
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRoleName.trim() }),
    })
    if (res.ok) {
      const created: Role = await res.json()
      setRoles((prev) => [...prev, created])
      selectRole(created.id)
    }
    setNewRoleName('')
    setAddingRole(false)
  }

  return (
    <Box>
      <Typography variant="h4">Roles & Permissions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Control what each role can access.
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <>
          {/* Role selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Select
              value={selectedId ?? ''}
              onChange={(e) => selectRole(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 220, textTransform: 'capitalize' }}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id} sx={{ textTransform: 'capitalize' }}>
                  {r.role.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>

            {addingRole ? (
              <>
                <TextField
                  size="small"
                  autoFocus
                  placeholder="role_name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createRole()}
                  sx={{ width: 160 }}
                />
                <Button size="small" onClick={createRole} disabled={!newRoleName.trim()}>Add</Button>
                <Button size="small" color="inherit" onClick={() => { setAddingRole(false); setNewRoleName('') }}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setAddingRole(true)}>
                New role
              </Button>
            )}
          </Box>

          {/* Permission matrix */}
          {selectedRole && (
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E2E5EA', color: 'text.secondary', fontSize: 13, fontWeight: 500 } }}>
                  <TableCell>Module</TableCell>
                  {ACTIONS.map((a) => (
                    <TableCell key={a} align="center">{ACTION_LABEL[a]}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {MODULES.map((mod) => (
                  <TableRow key={mod} sx={{ '& td': { borderColor: '#F1F2F4' } }}>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500 }}>{MODULE_LABEL[mod]}</TableCell>
                    {ACTIONS.map((action) => (
                      <TableCell key={action} align="center">
                        <Switch
                          size="small"
                          checked={permissions[mod]?.[action] === true}
                          onChange={() => toggle(mod, action)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Save bar */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            {hasChanges && (
              <Button size="small" color="inherit" onClick={() => setPermissions(original)}>
                Discard
              </Button>
            )}
            <Button size="small" variant="contained" onClick={save} disabled={!hasChanges || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </>
      )}

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