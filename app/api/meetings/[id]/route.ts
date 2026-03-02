import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        agendaItems: { orderBy: { order: 'asc' } },
        minutes: true,
        reports: { orderBy: { version: 'desc' } },
        user: { select: { name: true, email: true } }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('GET meeting error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch meeting',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Prepare update data
  const updateData: any = {};
  
  if (body.title !== undefined) updateData.title = body.title;
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.location !== undefined) updateData.location = body.location;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.meetingMode !== undefined) updateData.meetingMode = body.meetingMode;
  if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink;
  if (body.participants !== undefined) updateData.attendees = body.participants;

  // Handle agenda items if provided
  if (body.agendaItems !== undefined) {
    // Delete existing agenda items
    await prisma.agendaItem.deleteMany({
      where: { meetingId: id }
    });

    // Create new agenda items
    if (body.agendaItems.length > 0) {
      updateData.agendaItems = {
        create: body.agendaItems.map((item: any, index: number) => ({
          title: item.title,
          description: item.description || '',
          presenter: item.presenter || '',
          duration: item.duration || 15,
          order: item.order || index + 1
        }))
      };
    }
  }

  const meeting = await prisma.meeting.update({
    where: { id },
    data: updateData,
    include: { 
      agendaItems: { orderBy: { order: 'asc' } }, 
      minutes: true 
    }
  });

  return NextResponse.json(meeting);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete related records first (in case cascade doesn't work)
    await prisma.agendaItem.deleteMany({
      where: { meetingId: id }
    });

    await prisma.minutes.deleteMany({
      where: { meetingId: id }
    });

    await prisma.report.deleteMany({
      where: { meetingId: id }
    });

    // Now delete the meeting
    await prisma.meeting.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Meeting deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete meeting',
      details: error.message 
    }, { status: 500 });
  }
}
