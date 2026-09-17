import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { orgId, email, password, isSuperAdmin } = body as {
    orgId?: number | string
    email?: string
    password?: string
    isSuperAdmin?: boolean
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Normal user path requires an org
  if (!isSuperAdmin && !orgId) {
    return NextResponse.json(
      { error: 'Organization is required' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Verify the user actually has super admin rights when they claim them
  if (isSuperAdmin) {
    const isActuallySuperAdmin =
      user.role?.role === 'super_admin' && user.role?.orgId === null
    if (!isActuallySuperAdmin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
  } else {
    // Normal user — must belong to the requested org
    if (user.orgId !== Number(orgId)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
  }

  if (!user.isActive) {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    orgId: user.orgId,
  })

  const response = NextResponse.json({ id: user.id, email: user.email })
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}