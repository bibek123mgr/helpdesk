'use client'
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: { main: '#2F5DE0', dark: '#2649B8', contrastText: '#FFFFFF' },
    secondary: { main: '#12B886', contrastText: '#FFFFFF' },
    warning: { main: '#E8A63A' },
    error: { main: '#E24C4C' },
    background: { default: '#F7F8FA', paper: '#FFFFFF' },
    text: { primary: '#14181F', secondary: '#8A93A3' },
    divider: '#E2E5EA',
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    h1: { fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 500 },
    h2: { fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 500 },
    h3: { fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 500 },
    h4: { fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, paddingTop: 10, paddingBottom: 10 } },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
})

export default theme