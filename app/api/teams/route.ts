import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

export async function POST(request: Request) {

    const {name,description} = await request.json()

    if (!name || !description) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const auth = await requirePermission('team', 'create')
    const requestUser = auth.user;
    if (!requestUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const team = await prisma.team.create({
            data: {
                name,
                description,
                orgId: requestUser.orgId,
            },
        });
        return NextResponse.json(team, { status: 201 })
    } catch (error) {
        console.error('Error creating team:', error)
        return NextResponse.json({ error: 'Error creating team' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const auth = await requirePermission('team', 'create')
    const requestUser = auth.user;
    if (!requestUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const team = await prisma.team.findMany({
            where: {
                orgId: requestUser.orgId,
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        }
                    }
                },
                _count: {
                    select: {
                        tickets: true,
                    },
                },

            },
        });
        return NextResponse.json(team, { status: 200 })
    } catch (error) {
        console.error('Error fetching teams:', error)
        return NextResponse.json({ error: 'Error fetching teams' }, { status: 500 })
    }
}      