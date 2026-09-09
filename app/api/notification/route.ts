import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

export async function GET(request:Request){
    const auth = await requirePermission('notifications', 'view')
    const requestUser = auth.user;
    if (!requestUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = requestUser.id;
    try{
        const notifications = await prisma.notification.findMany({
        where: { userId },
        })
        return NextResponse.json(notifications, { status: 200 })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 })
    }
}