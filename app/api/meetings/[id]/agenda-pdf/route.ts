import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAgendaPDF } from '@/lib/pdfGenerator';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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
    console.log('Generating agenda PDF for meeting:', id);

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        agendaItems: {
          orderBy: { order: 'asc' }
        },
        user: { select: { name: true, email: true } }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    console.log('Generating PDF with PDFKit...');
    
    // Use agenda items from database
    const agendaData = {
      objectives: '',
      preparationRequired: [],
      agendaItems: meeting.agendaItems.map((item: any) => ({
        topic: item.title,
        description: item.description,
        presenter: item.presenter,
        duration: item.duration
      })),
      actionItems: []
    };
    
    const pdfBuffer = await generateAgendaPDF(meeting, agendaData);
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Save to reports automatically
    try {
      const existingReports = await prisma.report.findMany({
        where: { meetingId: id },
        orderBy: { version: 'desc' },
        take: 1
      });

      const nextVersion = existingReports.length > 0 ? existingReports[0].version + 1 : 1;

      await prisma.report.create({
        data: {
          meetingId: id,
          version: nextVersion,
          emailedTo: []
        }
      });

      console.log(`Agenda PDF saved to reports as version ${nextVersion}`);
    } catch (reportError) {
      console.error('Error saving to reports:', reportError);
    }

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="agenda-${meeting.title.replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error in agenda PDF generation:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      error: 'Failed to generate agenda PDF',
      details: errorMessage,
      errorType: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}
