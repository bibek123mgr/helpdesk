import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  const { email, password, name, organization_name, slug } = await request.json()

  if (!email || !password || !name || !organization_name || !slug) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }
  const hashed = await hashPassword(password)
  const userRole = await prisma.role.findFirst({ where: { role: 'org_admin' } })
  if (!userRole) {
    return NextResponse.json({ error: 'User role not found' }, { status: 500 })
  }
  try {
    const user = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organization_name,
          slug: slug,
        },
      })

      await tx.ticketIndex.create({
        data: {
          orgId: organization.id,
          index: 0,
        },
      })

      return tx.user.create({
        data: {
          email,
          password: hashed,
          name,
          orgId: organization.id,
          roleId: userRole.id,
        },
      })
    })

    return NextResponse.json({ id: user.id,org_id:user.orgId, name, organization_name, email }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
  }
}