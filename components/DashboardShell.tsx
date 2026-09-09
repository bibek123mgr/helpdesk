'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box, Drawer, AppBar, Toolbar, List, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, IconButton, Divider, useMediaQuery, useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import DashboardIcon from '@mui/icons-material/SpaceDashboard'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InboxIcon from '@mui/icons-material/Inbox'
import GroupIcon from '@mui/icons-material/Group'
import BusinessIcon from '@mui/icons-material/Business'
import PublicIcon from '@mui/icons-material/Public'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { moduleEnabled, PermissionMap } from '@/lib/permissions'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import NotificationBox from './NotificationBox'
import LabelIcon from '@mui/icons-material/Label'


const DRAWER_WIDTH = 260

type CurrentUser = {
  id: number
  name: string | null
  email: string
  organization: { name: string | null }
  role: {
    role: string
    orgId: number | null
    permissions: PermissionMap | null
  }
}

const roleLabel: Record<string, string> = {
  org_admin: 'Org Admin',
  agent: 'Agent',
  user: 'User',
  super_admin: 'Super Admin',
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  return source.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function DashboardShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperAdmin = user.role.role === 'super_admin' && user.role.orgId === null

  const NAV_ITEMS = [
    { label: t('dashboard'), href: '/dashboard', icon: DashboardIcon, module: null },
    { label: t('tickets'), href: '/dashboard/tickets', icon: InboxIcon, module: 'tickets' as const },
    { label: t('tags'), href: '/dashboard/tags', icon: LabelIcon, module: 'tags' as const },
    { label: t('team'), href: '/dashboard/team', icon: GroupIcon, module: 'team' as const },
    { label: t('organization'), href: '/dashboard/organization', icon: BusinessIcon, module: 'organization' as const },
    { label: t('allOrganizations'), href: '/dashboard/organizations', icon: PublicIcon, module: 'super_admin_only' as const },
    { label: t('roles'), href: '/dashboard/roles', icon: AdminPanelSettingsIcon, module: 'roles' as const },

  ]

  const items = NAV_ITEMS.filter((item) => {
    // if (item.module === null) return true
    // if (item.module === 'super_admin_only') return isSuperAdmin
    // return isSuperAdmin || moduleEnabled(user.role.permissions, item.module)
    return true;
  })

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: '#14181F', color: '#fff' }}>
      <Box>
        <Toolbar>
          <Typography variant="caption" sx={{ letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            HELPDESK
          </Typography>
        </Toolbar>
        <List sx={{ px: 1.5 }}>
          {items.map((item) => {
            const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                selected={active}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontSize: 14, fontWeight: active ? 500 : 400 } } }}
                />
              </ListItemButton>
            )
          })}
        </List>
      </Box>

      <Box sx={{ px: 1.5, pb: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2F5DE0', fontSize: 13 }}>
            {initials(user.name, user.email)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: '#fff', fontWeight: 500 }}>
              {user.name ?? user.email}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {roleLabel[user.role.role] ?? user.role.role}
            </Typography>
          </Box>
        </Box>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1.5, color: 'rgba(255,255,255,0.6)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('logout')} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F7F8FA' }}>
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}
      >
        {drawerContent}
      </Drawer>
      

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#FFFFFF', color: '#14181F', borderBottom: '1px solid #E2E5EA' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isDesktop && (
                <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5 }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.organization.name}</Typography>
                <Typography variant="caption" color="text.secondary">{roleLabel[user.role.role] ?? user.role.role}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <NotificationBox />
            <LanguageSwitcher />
              </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, px: { xs: 2, lg: 4 }, py: { xs: 3, lg: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}