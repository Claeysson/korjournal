import { NextRequest, NextResponse } from 'next/server';
import { updateTrip, deleteTrip } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { category, notes, startPosition, endDestination, duration } = body;

    const success = await updateTrip(tripId, { 
      category, 
      notes, 
      startPosition, 
      endDestination, 
      duration 
    });

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id);

    if (isNaN(tripId)) {
      return NextResponse.json({ error: 'Ogiltigt resa-ID' }, { status: 400 });
    }

    const success = await deleteTrip(tripId);

    if (success) {
      return NextResponse.json({ message: 'Resa borttagen' });
    } else {
      return NextResponse.json({ error: 'Resa inte funnen eller kan inte tas bort' }, { status: 404 });
    }
  } catch (error) {
    console.error('Delete trip error:', error);
    return NextResponse.json({ error: 'Kunde inte ta bort resa' }, { status: 500 });
  }
}