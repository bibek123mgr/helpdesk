import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/requirePermission";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

// export async function GET(request: Request, context: Context) {    //   const auth = await requirePermission('roles', 'read')
//   //   if (!auth.authorized) return auth.response
//   const { id } = await context.params;
//   console.log("id", id)

//   const ticket = await prisma.ticket.findUnique({
//     where: { id: Number(id) },
//     include: {
//       comments: {select: { 
//         id: true,
//         body: true, 
//         isInternal: true, 
//         createdAt: true, 
//         authorId: true,
//         author: { select: { id: true, name: true } } 
//        }},
//       requester: { select: { id: true, name: true, email: true } },
//       assignee: { select: { id: true, name: true, email: true } },
//       team: { select: { id: true, name: true } },
//     }
//   });

//   if (!ticket) {
//     return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
//   }

//   return NextResponse.json(ticket);
// }

// export async function PATCH(request: Request, context: Context) {
//   const auth = await requirePermission('tickets', 'create');
//   const requestUser = auth.user;

//   if (!requestUser) {
//     return NextResponse.json(
//       { error: 'Not authenticated' },
//       { status: 401 }
//     );
//   }

//   const { id } = await context.params;

//   const {
//     teamId,
//     assigneeId,
//     status,
//     priority,
//     category,
//   } = await request.json();

//   if (
//     teamId === undefined &&
//     assigneeId === undefined &&
//     status === undefined &&
//     priority === undefined &&
//     category === undefined
//   ) {
//     return NextResponse.json(
//       { error: 'At least one field is required' },
//       { status: 400 }
//     );
//   }

//   const dataToUpdate: {
//     teamId?: number;
//     assigneeId?: number;
//     status?: string;
//     priority?: string;
//     category?: string;
//   } = {};

//   if (teamId !== undefined) {
//     dataToUpdate.teamId = Number(teamId);
//   }

//   if (assigneeId !== undefined) {
//     dataToUpdate.assigneeId = Number(assigneeId);
//   }

//   if (status !== undefined) {
//     dataToUpdate.status = status;
//   }

//   if (priority !== undefined) {
//     dataToUpdate.priority = priority;
//   }

//   if (category !== undefined) {
//     dataToUpdate.category = category;
//   }

//   try {
//     const ticket = await prisma.$transaction(async (tx) => {
//       const oldTicket = await tx.ticket.findUnique({
//         where: {
//           id: Number(id),
//         },
//       });

//       if (!oldTicket) {
//         throw new Error('TICKET_NOT_FOUND');
//       }

//       const updatedTicket = await tx.ticket.update({
//         where: {
//           id: Number(id),
//         },
//         data: dataToUpdate,
//       });

//       for (const [field, newValue] of Object.entries(dataToUpdate)) {
//         const oldValue =
//           oldTicket[field as keyof typeof oldTicket];

//         if (String(oldValue) !== String(newValue)) {
//           await tx.ticketHistory.create({
//             data: {
//               ticketId: updatedTicket.id,
//               fieldChanged: field,
//               oldValue: oldValue?.toString() ?? '',
//               newValue: newValue?.toString() ?? '',
//               changedById: requestUser.id,
//             },
//           });
//         }
//       }

//       if (
//         assigneeId !== undefined &&
//         Number(assigneeId) !== Number(oldTicket.assigneeId)
//       ) {
//         await tx.notification.create({
//           data: {
//             userId: Number(assigneeId),
//             ticketId: updatedTicket.id,
//             message: `Ticket #${updatedTicket.ticketNumber} assigned to you.`,
//             type: 'success',
//             isRead: false,
//           },
//         });
//       }

//       if(oldTicket.status === 'open' || oldTicket.status === 'close') {
//        await tx.notification.create({
//           data: {
//             userId: Number(updatedTicket.requesterId),
//             ticketId: updatedTicket.id,
//             message: `Your ticket #${updatedTicket.ticketNumber} on Working Progress.`,
//             type: 'info',
//             isRead: false,
//           },
//         });
//       }else if((oldTicket.status === 'pending' || oldTicket.status === 'resolved' || oldTicket.status === 're-opened') && updatedTicket.status === 'close') {
//         await tx.notification.create({
//           data: {
//             userId: Number(updatedTicket.requesterId),
//             ticketId: updatedTicket.id,
//             message: `Your ticket #${updatedTicket.ticketNumber} has been solved successfully.`,
//             type: 'info',
//             isRead: false,
//           },
//         });
//       }

//       return updatedTicket;
//     });

//     return NextResponse.json(ticket, { status: 200 });
//   } catch (error) {
//     console.error('Error updating ticket:', error);

//     if (error instanceof Error && error.message === 'TICKET_NOT_FOUND') {
//       return NextResponse.json(
//         { error: 'Ticket not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
      
//       { error: 'Error updating ticket' },
//       { status: 500 }
//     );
//   }
// }

export async function GET(request: Request, context: Context) {
  const auth = await requirePermission('tickets', 'view');
  if (!auth.authorized) return auth.response;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      comments: {
        select: {
          id: true,
          body: true,
          isInternal: true,
          createdAt: true,
          authorId: true,
          author: { select: { id: true, name: true } },
        },
      },
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requirePermission('tickets', 'update');
  const requestUser = auth.user;

  if (!auth.authorized || !requestUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const { teamId, assigneeId, status, priority, category } = await request.json();

  if (
    teamId === undefined &&
    assigneeId === undefined &&
    status === undefined &&
    priority === undefined &&
    category === undefined
  ) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  const dataToUpdate: {
    teamId?: number;
    assigneeId?: number;
    status?: string;
    priority?: string;
    category?: string;
  } = {};

  if (teamId !== undefined) {
    const parsedTeamId = Number(teamId);
    if (!Number.isInteger(parsedTeamId)) {
      return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
    }
    dataToUpdate.teamId = parsedTeamId;
  }

  if (assigneeId !== undefined) {
    const parsedAssigneeId = Number(assigneeId);
    if (!Number.isInteger(parsedAssigneeId)) {
      return NextResponse.json({ error: 'Invalid assigneeId' }, { status: 400 });
    }
    dataToUpdate.assigneeId = parsedAssigneeId;
  }

  if (status !== undefined) dataToUpdate.status = status;
  if (priority !== undefined) dataToUpdate.priority = priority;
  if (category !== undefined) dataToUpdate.category = category;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const oldTicket = await tx.ticket.findUnique({ where: { id } });

      if (!oldTicket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      const updatedTicket = await tx.ticket.update({
        where: { id },
        data: dataToUpdate,
      });

      for (const [field, newValue] of Object.entries(dataToUpdate)) {
        const oldValue = oldTicket[field as keyof typeof oldTicket];

        if (String(oldValue) !== String(newValue)) {
          await tx.ticketHistory.create({
            data: {
              ticketId: updatedTicket.id,
              fieldChanged: field,
              oldValue: oldValue?.toString() ?? '',
              newValue: newValue?.toString() ?? '',
              changedById: requestUser.id,
            },
          });
        }
      }

      if (
        dataToUpdate.assigneeId !== undefined &&
        dataToUpdate.assigneeId !== oldTicket.assigneeId
      ) {
        await tx.notification.create({
          data: {
            userId: dataToUpdate.assigneeId,
            ticketId: updatedTicket.id,
            message: `Ticket #${updatedTicket.ticketNumber} assigned to you.`,
            type: 'success',
            isRead: false,
          },
        });
      }

      // Only notify about status transitions when status was actually
      // part of this update AND it actually changed.
      if (dataToUpdate.status !== undefined && oldTicket.status !== updatedTicket.status) {
        if (oldTicket.status === 'open' || oldTicket.status === 'closed') {
          await tx.notification.create({
            data: {
              userId: updatedTicket.requesterId,
              ticketId: updatedTicket.id,
              message: `Your ticket #${updatedTicket.ticketNumber} is now in progress.`,
              type: 'info',
              isRead: false,
            },
          });
        } else if (
          (oldTicket.status === 'pending' ||
            oldTicket.status === 'resolved' ||
            oldTicket.status === 're-opened') &&
          updatedTicket.status === 'closed'
        ) {
          await tx.notification.create({
            data: {
              userId: updatedTicket.requesterId,
              ticketId: updatedTicket.id,
              message: `Your ticket #${updatedTicket.ticketNumber} has been solved successfully.`,
              type: 'info',
              isRead: false,
            },
          });
        }
      }

      return updatedTicket;
    });

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    console.error('Error updating ticket:', error);

    if (error instanceof Error && error.message === 'TICKET_NOT_FOUND') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Error updating ticket' }, { status: 500 });
  }
}
