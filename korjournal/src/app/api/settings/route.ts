import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key parameter required' }, { status: 400 });
    }
    
    const value = await getSetting(key);
    
    return NextResponse.json({ value });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Kunde inte hämta inställning' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 });
    }
    
    const success = await setSetting(key, value);
    
    if (success) {
      return NextResponse.json({ message: 'Inställning sparad' });
    } else {
      return NextResponse.json({ error: 'Kunde inte spara inställning' }, { status: 500 });
    }
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Kunde inte spara inställning' }, { status: 500 });
  }
}