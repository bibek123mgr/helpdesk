// app/api/roles/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/requirePermission'

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const auth = await requirePermission('roles', 'update')
  const requestUser = auth.user;
  if (!requestUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  // if (!auth.authorized) return auth.response

  const {id} = await context.params;

  const { permissions } = await request.json()

  const role = await prisma.role.update({
    where: { id: Number(id) }, // scoped to their own org
    data: { permissions },
  })

  return NextResponse.json(role)
}

