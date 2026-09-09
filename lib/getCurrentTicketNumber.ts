
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

export async function getNextTicketNumber(
  tx: Prisma.TransactionClient,
  orgId: number
): Promise<number> {
  const ticketIndex = await tx.ticketIndex.update({
    where: { orgId },
    data: { index: { increment: 1 } },
    select: { index: true },
  })

  return ticketIndex.index
}