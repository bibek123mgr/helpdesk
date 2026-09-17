'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Org = { id: number; name: string; slug: string }

const ledger = [
  { id: 'HD-2841', label: 'Checkout fails on mobile', status: 'urgent' },
  { id: 'HD-2839', label: 'Reset password email delayed', status: 'pending' },
  { id: 'HD-2836', label: 'Invoice PDF export', status: 'resolved' },
  { id: 'HD-2834', label: 'SSO login redirect loop', status: 'pending' },
]

const statusColor: Record<string, string> = {
  urgent: 'bg-danger',
  pending: 'bg-warning',
  resolved: 'bg-secondary',
}

type LoginMode = 'user' | 'super_admin'

export default function LoginPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [mode, setMode] = useState<LoginMode>('user')
  const [orgId, setOrgId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/organizations')
      .then((res) => res.json())
      .then(setOrgs)
      .catch(() => setError('Could not load organizations'))
  }, [])

  function switchMode(next: LoginMode) {
    setMode(next)
    setError('')
    if (next === 'super_admin') {
      setOrgId('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const isSuperAdmin = mode === 'super_admin'

    const body = isSuperAdmin
      ? { email, password, isSuperAdmin: true }
      : { orgId, email, password, isSuperAdmin: false }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Signature panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-white lg:flex">
        <div className="relative z-10">
          <span className="font-mono text-xs tracking-widest text-white/50">HELPDESK</span>
          <h1 className="mt-4 max-w-sm font-display text-4xl font-medium">
            Every issue, tracked from first message to resolved.
          </h1>
        </div>

        <div className="relative z-10 rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <p className="mb-4 font-mono text-xs text-white/40">LIVE QUEUE</p>
          <ul className="space-y-3">
            {ledger.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-3">
                  <span className={`status-dot ${statusColor[t.status]}`} />
                  <span className="text-white/80">{t.label}</span>
                </span>
                <span className="font-mono text-xs text-white/40">{t.id}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          Organizations, roles, and permissions — all in one place.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-medium">Log in</h2>
          <p className="mt-1.5 text-sm text-muted">
            {mode === 'super_admin'
              ? 'Sign in to the platform administration console.'
              : 'Enter your workspace to continue.'}
          </p>

          {/* Role toggle */}
          <div
            role="tablist"
            aria-label="Login type"
            className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'user'}
              onClick={() => switchMode('user')}
              className={
                mode === 'user'
                  ? 'rounded-md bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm'
                  : 'rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink'
              }
            >
              User
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'super_admin'}
              onClick={() => switchMode('super_admin')}
              className={
                mode === 'super_admin'
                  ? 'rounded-md bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm'
                  : 'rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink'
              }
            >
              Super Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === 'user' && (
              <div>
                <label className="label-text" htmlFor="org">Organization</label>
                <select
                  id="org"
                  className="input-field"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select your organization</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">
                  Applies to org admins, agents, and end users.
                </p>
              </div>
            )}

            <div>
              <label className="label-text" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-text" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? 'Logging in…'
                : mode === 'super_admin'
                  ? 'Log in as Super Admin'
                  : 'Log in'}
            </button>
          </form>

          {mode === 'user' && (
            <p className="mt-6 text-center text-sm text-muted">
              Setting up a new organization?{' '}
              <a href="/register" className="font-medium text-primary hover:text-primary-hover">
                Register here
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}