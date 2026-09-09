'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Select,
  MenuItem,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Avatar,
  Skeleton,
  Snackbar,
  Alert,
  ButtonGroup,
  IconButton,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Replay as ReplayIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Lightbulb as LightbulbIcon,
  SmartToy as SmartToyIcon,
  Group as GroupIcon,
  AccessTime as AccessTimeIcon,
  Schedule as ScheduleIcon,
  FileCopy as FileCopyIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Link as LinkIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Phone as PhoneIcon,
  Web as WebIcon,
  Api as ApiIcon,
} from '@mui/icons-material'

type User = {
  id: string | number
  email: string
  name: string | null
  avatar?: string
  role: 'super_admin' | 'org_admin' | 'agent' | 'customer'
  isActive: boolean
}

type Team = {
  id: string | number
  name: string
  description?: string
  members?: User[]
}

type Attachment = {
  id: string | number
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: User
  uploadedAt: string
}

type Reply = {
  id: string | number
  message?: string
  body?: string
  isInternalNote?: boolean
  isInternal?: boolean
  isAISuggested?: boolean
  isAiSuggested?: boolean
  author: User
  createdAt: string
  updatedAt: string
  attachments: Attachment[]
}

type HistoryEntry = {
  id: string | number
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changedBy: User
  createdAt: string
}

type CSATResponse = {
  id: string | number
  rating: number
  comment: string | null
  createdAt: string
}

type Ticket = {
  id: string | number
  ticketNumber: string
  subject: string
  description: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string | null
  channel: 'email' | 'chat' | 'phone' | 'web' | 'api' | null
  requester: User
  assignee: User | null
  team: Team | null
  attachments: Attachment[]
  replies: Reply[]
  history: HistoryEntry[]
  csat: CSATResponse | null
  createdAt: string
  updatedAt: string
  slaResponseDueAt: string | null
  slaResolveDueAt: string | null
  isBookmarked: boolean
  tags: string[]
  aiSuggestedSolutions?: string[]
  relatedKnowledgeBase?: Array<{
    id: string
    title: string
    body: string
  }>
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open: { bg: '#2F5DE014', text: '#2F5DE0' },
  pending: { bg: '#E8A63A14', text: '#B4791F' },
  resolved: { bg: '#12B88614', text: '#0E8F69' },
  closed: { bg: '#8A93A314', text: '#5A6272' },
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#8A93A3' },
  { value: 'medium', label: 'Medium', color: '#2F5DE0' },
  { value: 'high', label: 'High', color: '#E8A63A' },
  { value: 'urgent', label: 'Urgent', color: '#E24C4C' },
]

const CATEGORIES = ['General', 'Billing', 'Technical', 'Account Access', 'Feature Request', 'Bug Report', 'Question']

const CHANNEL_ICONS: Record<string, React.ReactElement> = {
  email: <EmailIcon sx={{ fontSize: 16 }} />,
  chat: <ChatIcon sx={{ fontSize: 16 }} />,
  phone: <PhoneIcon sx={{ fontSize: 16 }} />,
  web: <WebIcon sx={{ fontSize: 16 }} />,
  api: <ApiIcon sx={{ fontSize: 16 }} />,
}

const FIELD_LABEL: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  category: 'Category',
  assignee: 'Assignee',
  team: 'Team',
  subject: 'Subject',
  description: 'Description',
  tags: 'Tags',
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return 'Unknown'
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDistanceToNow(dateStr: string) {
  if (!dateStr) return 'Unknown'
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''}`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''}`
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email || 'U'
  return source.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getPriorityColor(priority: string) {
  const found = PRIORITIES.find(p => p.value === priority)
  return found?.color || '#8A93A3'
}

function getChannelLabel(channel: string) {
  if (!channel) return 'Unknown'
  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)

  const [replyBody, setReplyBody] = useState('')
  const [replyType, setReplyType] = useState<'public' | 'internal'>('public')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const [csatDialogOpen, setCsatDialogOpen] = useState(false)
  const [csatRating, setCsatRating] = useState<number | null>(null)
  const [csatComment, setCsatComment] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadTicket() {
    const ticketId = params?.id
    if (!ticketId) {
      setLoading(false)
      return
    }

    fetch(`/api/tickets/${ticketId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load ticket')
        return res.json()
      })
      .then((data) => {
        setTicket({
          ...data,
          history: data.history || [],
          replies: data.comments || [],
          attachments: data.attachments || [],
          tags: data.tags || [],
          aiSuggestedSolutions: data.aiSuggestedSolutions || [],
          relatedKnowledgeBase: data.relatedKnowledgeBase || [],
          channel: data.channel || 'email',
          status: data.status || 'open',
          priority: data.priority || 'medium',
        })
      })
      .catch((err) => {
        console.error(err)
        setToast({ open: true, message: 'Failed to load ticket', severity: 'error' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTicket()
  }, [params?.id])

  async function patchTicket(body: Record<string, unknown>, successMessage: string) {
    if (!ticket) return
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        loadTicket()
        setToast({ open: true, message: successMessage, severity: 'success' })
      } else {
        throw new Error('Failed to update')
      }
    } catch {
      setToast({ open: true, message: 'Could not update the ticket', severity: 'error' })
    }
  }

  async function sendReply() {
    if (!ticket || !replyBody.trim()) return

    setSending(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: replyBody,
          isInternal: replyType === 'internal',
        }),
      })

      if (response.ok) {
        setReplyBody('')
        setAttachments([])
        loadTicket()
        setToast({ open: true, message: 'Reply sent successfully', severity: 'success' })
      } else {
        throw new Error('Failed to send reply')
      }
    } catch {
      setToast({ open: true, message: 'Could not send reply', severity: 'error' })
    } finally {
      setSending(false)
    }
  }

  async function submitCSAT() {
    if (!ticket || csatRating === null) return

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/csat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: csatRating, comment: csatComment }),
      })

      if (res.ok) {
        setCsatDialogOpen(false)
        setCsatRating(null)
        setCsatComment('')
        loadTicket()
        setToast({ open: true, message: 'Thank you for your feedback!', severity: 'success' })
      } else {
        throw new Error('Failed to submit CSAT')
      }
    } catch {
      setToast({ open: true, message: 'Could not submit feedback', severity: 'error' })
    }
  }

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={40} width={300} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
      </Box>
    )
  }

  if (!ticket) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography color="text.secondary">Ticket not found.</Typography>
      </Box>
    )
  }

  const safeHistory = ticket.history || []
  const safeReplies = ticket.replies || []
  const safeAttachments = ticket.attachments || []

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {ticket.ticketNumber || 'N/A'}
            </Typography>
            <Chip
              label={STATUS_LABELS[ticket.status] || ticket.status || 'Unknown'}
              size="small"
              sx={{
                bgcolor: STATUS_COLOR[ticket.status]?.bg || '#E2E5EA',
                color: STATUS_COLOR[ticket.status]?.text || '#5A6272',
                fontWeight: 500,
                textTransform: 'capitalize',
                height: 20,
              }}
            />
            <Chip
              label={ticket.priority || 'medium'}
              size="small"
              sx={{
                bgcolor: `${getPriorityColor(ticket.priority)}20`,
                color: getPriorityColor(ticket.priority),
                fontWeight: 500,
                textTransform: 'capitalize',
                height: 20,
              }}
            />
            {ticket.category && (
              <Chip label={ticket.category} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}
            {ticket.tags && ticket.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
            ))}
            {ticket.channel && CHANNEL_ICONS[ticket.channel] ? (
              <Chip
                icon={CHANNEL_ICONS[ticket.channel]}
                label={getChannelLabel(ticket.channel)}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: 10 }}
              />
            ) : null}
          </Box>
          <Typography variant="h4" sx={{ mt: 1 }}>{ticket.subject || 'Untitled'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Created {formatTimeAgo(ticket.createdAt)}
            </Typography>
            {ticket.slaResponseDueAt && (
              <Tooltip title="SLA Response Due">
                <Chip
                  icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                  label={formatDistanceToNow(ticket.slaResponseDueAt)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 10 }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 2, md: 0 } }}>
          <Tooltip title="Bookmark">
            <IconButton size="small" onClick={() => patchTicket({ isBookmarked: !ticket.isBookmarked }, 'Bookmark toggled')}>
              {ticket.isBookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadTicket}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print">
            <IconButton size="small" onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3 }}>
        <Box>
          <ButtonGroup size="small" sx={{ mb: 2 }}>
            <Button
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={() => patchTicket({ status: 'resolved' }, 'Marked as resolved')}
              disabled={ticket.status === 'resolved'}
            >
              Resolve
            </Button>
            <Button
              startIcon={<LockIcon fontSize="small" />}
              onClick={() => patchTicket({ status: 'closed' }, 'Ticket closed')}
              disabled={ticket.status === 'closed'}
            >
              Close
            </Button>
            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
              <Button
                startIcon={<ReplayIcon fontSize="small" />}
                onClick={() => patchTicket({ status: 'open' }, 'Ticket reopened')}
              >
                Reopen
              </Button>
            )}
          </ButtonGroup>

          <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#2F5DE0', fontSize: 13 }}>
                {initials(ticket.requester?.name, ticket.requester?.email)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {ticket.requester?.name ?? ticket.requester?.email ?? 'Unknown'}
                </Typography>
                {safeAttachments.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {safeAttachments.map((att) => (
                      <Chip
                        key={att.id}
                        icon={<AttachFileIcon fontSize="small" />}
                        label={att.fileName}
                        size="small"
                        variant="outlined"
                        onClick={() => window.open(att.fileUrl, '_blank')}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {ticket.description || 'No description provided.'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {safeReplies.map((reply) => (
              <Paper
                key={reply.id}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderColor: (reply.isInternalNote || reply.isInternal) ? '#E8A63A33' : '#E2E5EA',
                  bgcolor: (reply.isInternalNote || reply.isInternal) ? '#E8A63A08' : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: (reply.isInternalNote || reply.isInternal) ? '#E8A63A' : '#12B886', fontSize: 13 }}>
                    {initials(reply.author?.name, reply.author?.email)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {reply.author?.name ?? reply.author?.email ?? 'Unknown'}
                      </Typography>
                      {(reply.isInternalNote || reply.isInternal) && (
                        <Chip label="Internal note" size="small" sx={{ bgcolor: '#E8A63A22', color: '#B4791F', fontWeight: 500, height: 20, fontSize: 11 }} />
                      )}
                      {(reply.isAISuggested || reply.isAiSuggested) && (
                        <Chip label="AI Suggested" size="small" sx={{ bgcolor: '#7C3AED22', color: '#7C3AED', fontWeight: 500, height: 20, fontSize: 11 }} />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {formatTimeAgo(reply.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {reply.message || reply.body || 'Empty reply'}
                    </Typography>
                    {reply.attachments && reply.attachments.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {reply.attachments.map((att) => (
                          <Chip
                            key={att.id}
                            icon={<AttachFileIcon fontSize="small" />}
                            label={att.fileName}
                            size="small"
                            variant="outlined"
                            onClick={() => window.open(att.fileUrl, '_blank')}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={{ mt: 2, p: 2.5, borderColor: '#E2E5EA' }}>
            <ToggleButtonGroup
              value={replyType}
              exclusive
              onChange={(_, v) => v && setReplyType(v)}
              size="small"
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="public" sx={{ textTransform: 'none' }}>Reply</ToggleButton>
              <ToggleButton value="internal" sx={{ textTransform: 'none' }}>Internal note</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={replyType === 'internal' ? 'Note visible only to your team…' : 'Write a reply…'}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAFBFC' } }}
            />

            {attachments.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {attachments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => removeAttachment(index)}
                    size="small"
                  />
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Box>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileAttach}
                  style={{ display: 'none' }}
                />
                <Button
                  size="small"
                  startIcon={<AttachFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Attach
                </Button>
                <Button
                  size="small"
                  startIcon={<SmartToyIcon />}
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  color="secondary"
                >
                  AI Help
                </Button>
              </Box>
              <Button
                variant="contained"
                onClick={sendReply}
                disabled={sending || !replyBody.trim()}
                endIcon={sending ? undefined : <SendIcon />}
              >
                {sending ? 'Sending…' : replyType === 'internal' ? 'Add note' : 'Send reply'}
              </Button>
            </Box>

            <Collapse in={showAISuggestions}>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#7C3AED08', borderRadius: 1, border: '1px solid #7C3AED33' }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7C3AED' }}>
                  <SmartToyIcon fontSize="small" />
                  AI Suggested Responses
                </Typography>
                {ticket.aiSuggestedSolutions && ticket.aiSuggestedSolutions.length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    {ticket.aiSuggestedSolutions.map((suggestion, index) => (
                      <Paper
                        key={index}
                        variant="outlined"
                        sx={{ p: 1.5, mt: 1, cursor: 'pointer', '&:hover': { bgcolor: '#7C3AED08' } }}
                        onClick={() => setReplyBody(suggestion)}
                      >
                        <Typography variant="body2">{suggestion}</Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No AI suggestions available. The AI feature will be available soon.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>

          {ticket.relatedKnowledgeBase && ticket.relatedKnowledgeBase.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LightbulbIcon fontSize="small" />
                Related Knowledge Base Articles
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ticket.relatedKnowledgeBase.map((article) => (
                  <Paper
                    key={article.id}
                    variant="outlined"
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: '#F1F2F4' } }}
                    onClick={() => window.open(`/kb/${article.id}`, '_blank')}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{article.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {article.body.substring(0, 150)}...
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {safeHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                startIcon={<HistoryIcon fontSize="small" />}
                onClick={() => setShowHistory((v) => !v)}
                sx={{ color: 'text.secondary', textTransform: 'none' }}
              >
                {showHistory ? 'Hide' : 'Show'} Activity Log ({safeHistory.length})
              </Button>
              <Collapse in={showHistory}>
                <Paper variant="outlined" sx={{ mt: 1, p: 2, borderColor: '#E2E5EA', maxHeight: 300, overflow: 'auto' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Details</TableCell>
                          <TableCell align="right">Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {safeHistory.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell>
                              <Typography variant="body2">
                                <strong>{h.changedBy?.name ?? h.changedBy?.email ?? 'Unknown'}</strong>
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                changed {FIELD_LABEL[h.fieldChanged] ?? h.fieldChanged}
                                {h.oldValue && h.newValue ? ` from "${h.oldValue}" to "${h.newValue}"` : h.newValue ? ` to "${h.newValue}"` : ''}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(h.createdAt)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Collapse>
            </Box>
          )}

          {ticket.status === 'resolved' && !ticket.csat && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#12B88608', border: '1px solid #12B88633', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ color: '#12B886' }} fontSize="small" />
                How satisfied are you with the resolution?
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => setCsatDialogOpen(true)}
              >
                Submit Feedback
              </Button>
            </Box>
          )}

          {ticket.csat && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#12B88608', border: '1px solid #12B88633', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ color: '#12B886' }} fontSize="small" />
                CSAT: {ticket.csat.rating}/5
                {ticket.csat.comment && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    "{ticket.csat.comment}"
                  </Typography>
                )}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Status
            </Typography>
            <Select
              fullWidth
              size="small"
              value={ticket.status}
              onChange={(e) => patchTicket({ status: e.target.value }, 'Status updated')}
              sx={{ mt: 1 }}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>

            <Divider sx={{ my: 2, borderColor: '#E2E5EA' }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Priority
            </Typography>
            <Select
              fullWidth
              size="small"
              value={ticket.priority}
              onChange={(e) => patchTicket({ priority: e.target.value }, 'Priority updated')}
              sx={{ mt: 1 }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.color }} />
                    {p.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>

            <Divider sx={{ my: 2, borderColor: '#E2E5EA' }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Category
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={ticket.category ?? ''}
              onChange={(e) => patchTicket({ category: e.target.value || null }, 'Category updated')}
              sx={{ mt: 1 }}
            >
              <MenuItem value="">No category</MenuItem>
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>

            <Divider sx={{ my: 2, borderColor: '#E2E5EA' }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Channel
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {ticket.channel ? CHANNEL_ICONS[ticket.channel] : null}
              {getChannelLabel(ticket.channel || '')}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Assigned To
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {ticket.assignee ? (
                <>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#2F5DE0', fontSize: 12 }}>
                    {initials(ticket.assignee.name, ticket.assignee.email)}
                  </Avatar>
                  <Typography variant="body2">
                    {ticket.assignee.name ?? ticket.assignee.email}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Not yet assigned</Typography>
              )}
            </Box>

            <Divider sx={{ my: 2, borderColor: '#E2E5EA' }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Team
            </Typography>
            <Box sx={{ mt: 1 }}>
              {ticket.team ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{ticket.team.name}</Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Not assigned to a team
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2, borderColor: '#E2E5EA' }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Requester
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: '#12B886', fontSize: 12 }}>
                {initials(ticket.requester?.name, ticket.requester?.email)}
              </Avatar>
              <Typography variant="body2">
                {ticket.requester?.name ?? ticket.requester?.email ?? 'Unknown'}
              </Typography>
            </Box>
          </Paper>

          {(ticket.slaResponseDueAt || ticket.slaResolveDueAt) && (
            <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
                SLA
              </Typography>
              {ticket.slaResponseDueAt && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Response due: {formatDistanceToNow(ticket.slaResponseDueAt)}
                  </Typography>
                </Box>
              )}
              {ticket.slaResolveDueAt && (
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Resolve due: {formatDistanceToNow(ticket.slaResolveDueAt)}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
              Quick Actions
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                Copy Link
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileCopyIcon />}
                onClick={() => patchTicket({ status: 'open' }, 'Ticket duplicated')}
              >
                Duplicate Ticket
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Dialog open={csatDialogOpen} onClose={() => setCsatDialogOpen(false)}>
        <DialogTitle>Rate Your Experience</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              How satisfied are you with the resolution of your ticket?
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Rating
                size="large"
                value={csatRating}
                onChange={(_, value) => setCsatRating(value)}
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarBorderIcon fontSize="inherit" />}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Additional comments (optional)"
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsatDialogOpen(false)}>Skip</Button>
          <Button
            variant="contained"
            onClick={submitCSAT}
            disabled={csatRating === null}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}