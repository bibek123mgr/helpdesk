import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
    const { userId } = await request.json();

    const { id } = await context.params;

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    console.log("userId", userId)
    console.log("teamId", id)

    const auth = await requirePermission('team', 'create')
    const requestUser = auth.user;

    if (!requestUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const team = await prisma.teamMember.create({
            data: {
                userId,
                teamId: Number(id),
                orgId: requestUser.orgId,
            },
        });
        return NextResponse.json(team, { status: 201 })
    } catch (error) {
        console.error('Error creating team:', error)
        return NextResponse.json({ error: 'Error creating team' }, { status: 500 })
    }
}