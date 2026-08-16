import { NextRequest, NextResponse } from 'next/server';
import { getTrips, insertTrip, DatabaseCorruptionError } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sort = searchParams.get('sort') || 'desc';
    
    const result = await getTrips(page, limit, category, dateFrom, dateTo, sort);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Trips API error:', error);
    
    if (error instanceof DatabaseCorruptionError) {
      return NextResponse.json({ 
        error: 'Databasen är skadad och har återställts. Var vänlig importera dina CSV-filer igen.',
        isCorruption: true 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Kunde inte hämta resor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      category,
      startDate,
      odometerStart,
      startPosition,
      endDate,
      odometerEnd,
      endDestination,
      duration,
      distance,
      fuelConsumption,
      title,
      batteryConsumption,
      batteryRegeneration,
      notes
    } = body;

    // Validate required fields
    if (!category || !startDate || !startPosition || !endDate || !endDestination) {
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 });
    }

    if (odometerStart === undefined || odometerEnd === undefined) {
      return NextResponse.json({ error: 'Mätarställningar måste anges' }, { status: 400 });
    }

    // Calculate distance if not provided
    const calculatedDistance = distance !== undefined ? distance : Math.max(0, odometerEnd - odometerStart);

    const trip = {
      category,
      startDate,
      odometerStart: Number(odometerStart),
      startPosition,
      endDate,
      odometerEnd: Number(odometerEnd),
      endDestination,
      duration: duration || '',
      distance: Number(calculatedDistance),
      fuelConsumption: fuelConsumption || '',
      title: title || '',
      batteryConsumption: batteryConsumption || '',
      batteryRegeneration: batteryRegeneration || '',
      notes: notes || ''
    };

    const result = await insertTrip(trip, true); // isManual = true

    if (result !== false) {
      return NextResponse.json({ 
        message: 'Resa skapad', 
        id: result 
      }, { status: 201 });
    } else {
      return NextResponse.json({ error: 'Kunde inte skapa resa' }, { status: 400 });
    }
  } catch (error) {
    console.error('Create trip error:', error);
    
    if (error instanceof DatabaseCorruptionError) {
      return NextResponse.json({ 
        error: 'Databasen är skadad och har återställts. Försök igen.',
        isCorruption: true 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Kunde inte skapa resa' }, { status: 500 });
  }
}