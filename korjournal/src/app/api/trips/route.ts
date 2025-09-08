import { NextRequest, NextResponse } from 'next/server';
import { getTrips, DatabaseCorruptionError } from '@/lib/database';

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