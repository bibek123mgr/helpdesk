import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  const auth = await requirePermission('tickets', 'create')
  const requestUser = auth.user
  
  if (!requestUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const ticketId = Number(id)
    
    if (isNaN(ticketId)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { message, isInternal } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const reply = await prisma.comment.create({
      data: {
        ticketId: ticketId,
        body: message,
        isInternal: isInternal,
        authorId: requestUser.id,
      }
    })

    return NextResponse.json(reply, { status: 201 })

  } catch (error) {
    console.error('Error creating reply:', error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error creating reply' },
      { status: 500 }
    )
  }
}