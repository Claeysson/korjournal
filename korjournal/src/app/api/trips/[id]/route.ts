import { NextRequest, NextResponse } from 'next/server';
import { updateTrip } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { category, notes } = body;

    const success = await updateTrip(tripId, { category, notes });

    if (success) {
      return NextResponse.json({ message: 'Resa uppdaterad' });
    } else {
      return NextResponse.json({ error: 'Resa inte funnen' }, { status: 404 });
    }
  } catch (error) {
    console.error('Update trip error:', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera resa' }, { status: 500 });
  }
}