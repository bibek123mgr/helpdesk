import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};


export async function GET(request: Request,context: Context) {
    const { id } = await context.params;
    const auth = await requirePermission('team', 'create')
    const requestUser = auth.user;
    if (!requestUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const team = await prisma.team.findUnique({
            where: {
                id: Number(id),
                orgId: requestUser.orgId,
            },
            include: {
                members: true,
            },
        });
        console.log("******************************")
        console.log("team", team)
        console.log("******************************")

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }
        return NextResponse.json(team, { status: 200 })
    } catch (error) {
        console.error('Error fetching teams:', error)
        return NextResponse.json({ error: 'Error fetching teams' }, { status: 500 })
    }
}      