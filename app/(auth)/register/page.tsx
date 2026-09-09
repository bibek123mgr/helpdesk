'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleOrgNameChange(value: string) {
    setOrgName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        organization_name: orgName,
        slug,
      }),
    })

    setLoading(false)

    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-white lg:flex">
        <div>
          <span className="font-mono text-xs tracking-widest text-white/50">HELPDESK</span>
          <h1 className="mt-4 max-w-sm font-display text-4xl font-medium">
            Set up your organization in under a minute.
          </h1>
        </div>
        <div className="space-y-4">
          {[
            'One workspace for your whole team',
            'Invite agents and assign roles after setup',
            'Every ticket has a status, an owner, and a history',
          ].map((line) => (
            <div key={line} className="flex items-center gap-3 text-sm text-white/70">
              <span className="status-dot bg-secondary" />
              {line}
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40">You'll be set as the org admin for this workspace.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-medium text-ink">Create your organization</h2>
          <p className="mt-1.5 text-sm text-muted">You'll be the admin — invite your team afterward.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label-text" htmlFor="orgName">Organization name</label>
              <input
                id="orgName"
                className="input-field"
                placeholder="Acme Inc."
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-text" htmlFor="slug">
                Workspace ID
              </label>
              <input
                id="slug"
                className="input-field font-mono text-sm"
                placeholder="acme"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                required
              />
              <p className="mt-1.5 text-xs text-muted">
                A short, unique identifier for your organization. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="h-px bg-border" />

            <div>
              <label className="label-text" htmlFor="name">Your name</label>
              <input
                id="name"
                className="input-field"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-text" htmlFor="email">Work email</label>
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
              {loading ? 'Creating workspace…' : 'Create organization'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have a workspace?{' '}
            <a href="/login" className="font-medium text-primary hover:text-primary-hover">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}