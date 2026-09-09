import { Box, Grid, Paper, Typography } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ErrorIcon from '@mui/icons-material/Error'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

const stats = [
  { label: 'Open', value: 12, icon: InboxIcon, color: '#2F5DE0' },
  { label: 'Pending', value: 5, icon: ScheduleIcon, color: '#E8A63A' },
  { label: 'Urgent', value: 2, icon: ErrorIcon, color: '#E24C4C' },
  { label: 'Resolved this week', value: 34, icon: CheckCircleIcon, color: '#12B886' },
]

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        An overview of what's happening in your workspace.
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#E2E5EA' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                <stat.icon sx={{ color: stat.color, fontSize: 20 }} />
              </Box>
              <Typography variant="h4" sx={{ mt: 1.5 }}>{stat.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ mt: 4, p: 5, textAlign: 'center', borderColor: '#E2E5EA' }}>
        <Typography variant="body2" color="text.secondary">
          Ticket list goes here once your <code>Ticket</code> model is set up.
        </Typography>
      </Paper>
    </Box>
  )
}