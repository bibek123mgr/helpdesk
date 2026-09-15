'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  Autocomplete, ToggleButtonGroup, ToggleButton, Divider, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Popover, List, ListItem, ListItemText, ListItemIcon, ListItemButton,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import AddIcon from '@mui/icons-material/Add'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { useUser } from '@/lib/user-context'
import { moduleEnabled } from '@/lib/permissions'

type Tag = {
  id: number
  name: string
  color: string
  createdAt: string
  updatedAt: string
  ticketCount?: number
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          border: '1px solid #E2E5EA',
          borderRadius: 1.5,
          cursor: 'pointer',
          width: 'fit-content',
          '&:hover': { borderColor: '#c7cbd3' },
        }}
      >
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color, border: '1px solid rgba(0,0,0,0.1)' }} />
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          {color.toUpperCase()}
        </Typography>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2 }}>
          <HexColorPicker color={color} onChange={onChange} style={{ width: 200, height: 150 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>#</Typography>
            <HexColorInput
              color={color}
              onChange={onChange}
              prefixed={false}
              style={{
                flex: 1,
                border: '1px solid #E2E5EA',
                borderRadius: 6,
                padding: '6px 8px',
                fontFamily: 'monospace',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </Box>
        </Box>
      </Popover>
    </>
  )
}

export default function TagsPage() {
  const router = useRouter()
  const { can, user } = useUser()

  const canView = can('tags', 'view')
  const canCreate = can('tags', 'create')
  const canUpdate = can('tags', 'update')
  const canDelete = can('tags', 'delete')

  const hasAnyTagsPermission = moduleEnabled(user.role.permissions, 'tags')

  const [tags, setTags] = useState<Tag[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2F5DE0')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#2F5DE0')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)

  const totalTags = tags.length
  const usedTags = tags.filter(t => (t.ticketCount || 0) > 0).length

  function loadTags() {
    setLoadingTags(true)
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        const tagsData = Array.isArray(data) ? data : data.tags || []
        setTags(tagsData)
      })
      .catch(() => setTags([]))
      .finally(() => setLoadingTags(false))
  }

  // Redirect away if the user has zero tags permissions
  useEffect(() => {
    if (!hasAnyTagsPermission) {
      router.replace('/dashboard')
    }
  }, [hasAnyTagsPermission, router])

  useEffect(() => {
    if (!canView) {
      setLoadingTags(false)
      return
    }
    loadTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView])

  function resetCreateForm() {
    setName('')
    setColor('#2F5DE0')
    setError('')
  }

  async function handleCreateSubmit() {
    if (!name.trim() || !canCreate) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })

      if (res.ok) {
        resetCreateForm()
        setCreateOpen(false)
        loadTags()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not create the tag. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditClick(tag: Tag) {
    if (!canUpdate) return
    setEditingTag(tag)
    setEditName(tag.name)
    setEditColor(tag.color)
    setEditError('')
    setEditOpen(true)
  }

  async function handleEditSubmit() {
    if (!editName.trim() || !editingTag || !canUpdate) return
    setEditSubmitting(true)
    setEditError('')

    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      })

      if (res.ok) {
        setEditOpen(false)
        setEditingTag(null)
        loadTags()
      } else {
        const data = await res.json().catch(() => ({}))
        setEditError(data.error ?? 'Could not update the tag. Please try again.')
      }
    } catch {
      setEditError('An error occurred. Please try again.')
    } finally {
      setEditSubmitting(false)
    }
  }

  function handleDeleteClick(tag: Tag) {
    if (!canDelete) return
    setDeletingTag(tag)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deletingTag || !canDelete) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/tags/${deletingTag.id}`, { method: 'DELETE' })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingTag(null)
        loadTags()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Could not delete the tag. Please try again.')
      }
    } catch {
      alert('An error occurred. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // If the user has no tags permission at all, render nothing while the redirect runs
  if (!hasAnyTagsPermission) {
    return null
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Tags</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage and organize your support tags
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New tag
          </Button>
        )}
      </Box>

      {canView ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
            {[
              { label: 'Total Tags', value: totalTags, icon: LocalOfferIcon, color: '#2F5DE0' },
              { label: 'Used Tags', value: usedTags, icon: DoneAllIcon, color: '#12B886' },
              { label: 'Unused Tags', value: totalTags - usedTags, icon: TrendingUpIcon, color: '#E8A63A' },
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

          <Paper variant="outlined" sx={{ borderColor: '#E2E5EA', overflow: 'hidden', mt: 3 }}>
            {loadingTags ? (
              <Box sx={{ p: 2 }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height={48} />)}
              </Box>
            ) : tags.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No tags yet. Create your first tag to get started.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 13, fontWeight: 500, borderColor: '#E2E5EA' } }}>
                    <TableCell>Tag</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>Created</TableCell>
                    {(canUpdate || canDelete) && <TableCell align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        <Chip label={tag.name} size="small" sx={{ bgcolor: `${tag.color}1A`, color: tag.color, fontWeight: 500 }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: tag.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {tag.color.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tag.ticketCount || 0} tickets</Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {new Date(tag.createdAt).toLocaleDateString()}
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {canUpdate && (
                              <IconButton size="small" onClick={() => handleEditClick(tag)} sx={{ p: 0.5 }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                            {canDelete && (
                              <IconButton size="small" onClick={() => handleDeleteClick(tag)} sx={{ p: 0.5, color: 'error.main' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      ) : (
        <Box sx={{ p: 5, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary">
            You don't have permission to view tags.
          </Typography>
        </Box>
      )}

      {/* Create Tag Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm() }} maxWidth="sm" fullWidth>
        <DialogTitle>Create new tag</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E2E5EA' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Tag Name" placeholder="Enter tag name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Tag Color</Typography>
              <ColorPicker color={color} onChange={setColor} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Preview</Typography>
              <Chip label={name.trim() || 'tag-name'} sx={{ bgcolor: `${color}1A`, color, fontWeight: 500 }} />
            </Box>
            {error && <Alert severity="error" icon={<ErrorIcon fontSize="small" />}>{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setCreateOpen(false); resetCreateForm() }} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Create tag'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditingTag(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit tag</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#E2E5EA' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Tag Name" placeholder="Enter tag name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Tag Color</Typography>
              <ColorPicker color={editColor} onChange={setEditColor} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Preview</Typography>
              <Chip label={editName.trim() || 'tag-name'} sx={{ bgcolor: `${editColor}1A`, color: editColor, fontWeight: 500 }} />
            </Box>
            {editError && <Alert severity="error" icon={<ErrorIcon fontSize="small" />}>{editError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setEditOpen(false); setEditingTag(null) }} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={editSubmitting || !editName.trim()}>
            {editSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setDeletingTag(null) }}>
        <DialogTitle>Delete tag</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the tag "{deletingTag?.name}"?
            {deletingTag?.ticketCount && deletingTag.ticketCount > 0 && (
              <Typography component="span" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                This tag is currently used on {deletingTag.ticketCount} ticket(s).
              </Typography>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeletingTag(null) }} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}