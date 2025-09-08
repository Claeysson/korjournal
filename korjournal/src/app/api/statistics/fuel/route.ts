import { NextRequest, NextResponse } from 'next/server';
import { getFuelStatistics } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    const statistics = await getFuelStatistics(category, dateFrom, dateTo);
    
    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Get fuel statistics error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch fuel statistics' 
    }, { status: 500 });
  }
}