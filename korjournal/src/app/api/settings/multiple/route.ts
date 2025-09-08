import { NextRequest, NextResponse } from 'next/server';
import { getMultipleSettings, setSetting } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get('keys')?.split(',') || [];
    
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No keys provided' }, { status: 400 });
    }
    
    const settings = await getMultipleSettings(keys);
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get multiple settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch settings' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings object' }, { status: 400 });
    }
    
    // Save all settings
    const promises = Object.entries(settings).map(([key, value]) => 
      setSetting(key, String(value))
    );
    
    await Promise.all(promises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save multiple settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to save settings' 
    }, { status: 500 });
  }
}