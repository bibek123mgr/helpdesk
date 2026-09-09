'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, MenuItem, IconButton } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'np', label: 'नेपाली' },
]

export default function LanguageSwitcher() {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSelect(code: string) {
    setAnchorEl(null)
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: code }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} disabled={isPending}>
        <LanguageIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {LANGUAGES.map((lang) => (
          <MenuItem key={lang.code} onClick={() => handleSelect(lang.code)}>
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}