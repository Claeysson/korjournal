import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseCorruptionError } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    const database = await getDatabase();
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (dateFrom) {
      conditions.push('startDate >= ?');
      params.push(dateFrom);
    }
    
    if (dateTo) {
      conditions.push('startDate < ?');
      // Add one day to include the entire selected date
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      params.push(nextDay.toISOString().split('T')[0]);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get aggregated summary data with single query
    const summary = await database.get(`
      SELECT 
        COUNT(*) as totalTrips,
        COALESCE(SUM(distance), 0) as totalDistance,
        COALESCE(SUM(
          CASE WHEN duration LIKE '%h%' 
          THEN CAST(substr(duration, 1, instr(duration, 'h') - 1) AS INTEGER) * 60 
          ELSE 0 END +
          CASE WHEN duration LIKE '%m%'
          THEN CAST(substr(duration, instr(duration, 'h') + 2, instr(duration, 'm') - instr(duration, 'h') - 2) AS INTEGER)
          WHEN duration LIKE '%m%' AND duration NOT LIKE '%h%'
          THEN CAST(substr(duration, 1, instr(duration, 'm') - 1) AS INTEGER)
          ELSE 0 END
        ), 0) as totalMinutes
      FROM trips
      ${whereClause}
    `, params);
    
    const totalMinutes = summary?.totalMinutes || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTime = `${hours}h ${minutes}m`;
    
    return NextResponse.json({
      totalTrips: summary?.totalTrips || 0,
      totalDistance: summary?.totalDistance || 0,
      totalTime
    });
  } catch (error) {
    console.error('Summary API error:', error);
    
    if (error instanceof DatabaseCorruptionError) {
      return NextResponse.json({ 
        error: 'Databasen är skadad och har återställts. Var vänlig importera dina CSV-filer igen.',
        isCorruption: true 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Kunde inte hämta sammanfattning' }, { status: 500 });
  }
}