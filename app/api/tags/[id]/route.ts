import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";
type Context = {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: Context) {

    const auth = await requirePermission('tags', 'update');
    const requestUser = auth.user;
    if (!requestUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { name, color } = body;

        const { id } = await context.params;

        if (!id || !name || !color) {
            return NextResponse.json({ error: 'ID, name and color are required' }, { status: 400 });
        }

        const tag = await prisma.tag.update({
            where: {
                id: Number(id),
            },
            data: {
                name,
                color,
            },
        });
        return NextResponse.json({ tag, message: 'Tag updated successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON or failed to update tag' }, { status: 400 });
    }
}