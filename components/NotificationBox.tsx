'use client'

import { useState, useTransition } from 'react'
import {
  Menu,
  MenuItem,
  IconButton,
  Typography,
  Box,
} from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'

type Notification = {
  id: number
  ticketId: number | null
  message: string
  type: 'success' | 'error' | 'info'
  createdAt: string
}

export default function NotificationBox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isPending, startTransition] = useTransition()

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notification', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Error fetching notifications: ${response.statusText}`
        )
      }

      const data = await response.json()

      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  async function handleNotificationClick(
    event: React.MouseEvent<HTMLElement>
  ) {
    setAnchorEl(event.currentTarget)

    startTransition(() => {
      fetchNotifications()
    })
  }

  return (
    <>
      <IconButton
        onClick={handleNotificationClick}
        disabled={isPending}
      >
        <NotificationsNoneIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>
            No notifications
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => setAnchorEl(null)}
            >
              <Box>
                <Typography variant="body2">
                  {notification.message}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {notification.type} •{' '}
                  {new Date(notification.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  )
}