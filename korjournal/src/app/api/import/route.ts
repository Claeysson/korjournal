import { NextRequest, NextResponse } from 'next/server';
import { parseCSVData } from '@/lib/csvParser';
import { insertTrip, getSetting, getDatabase, DatabaseCorruptionError } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read as ArrayBuffer first to handle encoding properly
    const arrayBuffer = await file.arrayBuffer();
    
    // Save original file with timestamp - sanitize filename for security
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const filename = `upload_${timestamp}_${originalName}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Validate file extension for security
    const allowedExtensions = ['.csv', '.CSV'];
    const fileExtension = path.extname(originalName);
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Endast CSV-filer är tillåtna' }, { status: 400 });
    }
    
    // Ensure filename doesn't escape the uploads directory
    const filePath = path.resolve(path.join(uploadsDir, filename));
    if (!filePath.startsWith(path.resolve(uploadsDir))) {
      return NextResponse.json({ error: 'Ogiltigt filnamn' }, { status: 400 });
    }
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save original file content
    const fileBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, fileBuffer);
    
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check for BOM and decode accordingly
    let csvContent: string;
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
      // UTF-16 LE with BOM - this is what the volvo.csv file uses
      console.log('Detected UTF-16 LE encoding with BOM');
      csvContent = new TextDecoder('utf-16le').decode(uint8Array.slice(2));
    } else if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
      // UTF-16 BE with BOM
      console.log('Detected UTF-16 BE encoding with BOM');
      csvContent = new TextDecoder('utf-16be').decode(uint8Array.slice(2));
    } else if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
      // UTF-8 with BOM
      console.log('Detected UTF-8 encoding with BOM');
      csvContent = new TextDecoder('utf-8').decode(uint8Array.slice(3));
    } else {
      // Try UTF-8 first, then fallback to other encodings
      console.log('No BOM detected, trying UTF-8');
      try {
        csvContent = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
      } catch {
        console.log('UTF-8 failed, trying ISO-8859-1');
        try {
          csvContent = new TextDecoder('iso-8859-1').decode(uint8Array);
        } catch {
          console.log('ISO-8859-1 failed, trying Windows-1252');
          csvContent = new TextDecoder('windows-1252').decode(uint8Array);
        }
      }
    }
    
    console.log('Decoded CSV content sample:', csvContent.substring(0, 200));
    
    // Get the auto-mapping setting
    const mapOkategoriseratToPrivat = (await getSetting('mapOkategoriseratToPrivat')) === 'true';
    console.log('Auto-mapping enabled:', mapOkategoriseratToPrivat);
    
    const trips = await parseCSVData(csvContent, mapOkategoriseratToPrivat);
    
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (const trip of trips) {
      try {
        const result = await insertTrip(trip);
        if (result !== false) {
          imported++;
        } else {
          duplicates++;
        }
      } catch (error) {
        console.error('Error processing trip:', error);
        errors++;
      }
    }
    
    let message = `Import slutförd: ${imported} nya resor importerade, ${duplicates} dubbletter hoppades över`;
    if (errors > 0) {
      message += `, ${errors} fel uppstod`;
    }
    
    return NextResponse.json({ 
      message,
      imported,
      duplicates,
      errors
    });
  } catch (error) {
    console.error('Import error:', error);
    
    if (error instanceof DatabaseCorruptionError) {
      return NextResponse.json({ 
        error: 'Databasen var skadad men har återställts. Försök importera igen.',
        isCorruption: true 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Import misslyckades' }, { status: 500 });
  }
}