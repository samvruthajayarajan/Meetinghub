import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const meetings = await prisma.meeting.findMany({
      where: {
        ...(user.role === 'ADMIN' ? {} : { createdBy: user.id }),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        agendaItems: { orderBy: { order: 'asc' } },
        minutes: true,
        reports: { orderBy: { generatedAt: 'desc' } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    
    const meeting = await prisma.meeting.create({
      data: {
        title: body.title,
        date: new Date(body.date),
        location: body.location,
        description: body.description,
        meetingMode: body.meetingMode || 'offline',
        meetingLink: body.meetingLink || null,
        status: body.status || 'scheduled',
        attendees: body.participants || [],
        createdBy: user.id,
        agendaItems: {
          create: body.agendaItems?.map((item: any, index: number) => ({
            title: item.title,
            description: item.description,
            duration: item.duration,
            order: index
          })) || []
        }
      },
      include: { agendaItems: true }
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
