import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await requirePermission('tags', 'create');
    const requestUser = auth.user;
    if (!requestUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { name, color } = body;

        if (!name || !color) {
            return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
        }

        const tag = await prisma.tag.create({
            data: {
                name,
                color,
                orgId: requestUser.orgId,
            },
        });
        return NextResponse.json({ tag, message: 'Tag created successfully' }, { status: 201 });
    }catch (error) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    
}

export async function GET(request: Request) {
    const auth = await requirePermission('tags', 'view');
    const requestUser = auth.user;
    if (!requestUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const tags = await prisma.tag.findMany({
            where: {
                orgId: requestUser.orgId,
            },
        });
        return NextResponse.json({ tags }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}