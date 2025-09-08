import csv from 'csv-parser';
import { Readable } from 'stream';
import { Trip } from './database';

function cleanText(text: string): string {
  if (!text) return '';
  // Clean text but preserve Swedish characters
  return text
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\u0000/g, '') // Remove null characters
    .trim();
}

function getColumnValue(row: any, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return cleanText(String(row[key]));
    }
  }
  return '';
}

interface ParseResult {
  trips: Omit<Trip, 'id'>[];
  errors: string[];
  skippedLines: number;
}

export function parseCSVData(csvContent: string, mapOkategoriseratToPrivat: boolean = false): Promise<Omit<Trip, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const results: Omit<Trip, 'id'>[] = [];
    const errors: string[] = [];
    let skippedLines = 0;
    
    console.log('CSV content length:', csvContent.length);
    
    // Clean the content and remove BOM
    let cleanedContent = csvContent
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/\u00A0/g, ' '); // Replace non-breaking spaces

    console.log('Cleaned content first 200 chars:', cleanedContent.substring(0, 200));

    // Check if this is a properly formatted CSV with line breaks
    const lines = cleanedContent.split(/\r?\n/);
    console.log('Number of lines found:', lines.length);
    
    if (lines.length > 2) {
      // This looks like a proper CSV with line breaks
      console.log('Detected standard CSV format with line breaks');
      
      // Skip header line and process data lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        console.log(`Processing line ${i}:`, line.substring(0, 100) + '...');
        
        const values = line.split(';');
        console.log(`Line ${i} has ${values.length} values`);
        
        if (values.length >= 14) {
          try {
            let category = cleanText(values[0] || '');
            
            // Apply category mapping if enabled
            if (mapOkategoriseratToPrivat && category === 'Okategoriserat') {
              category = 'Privat';
              console.log('Mapped "Okategoriserat" to "Privat"');
            }
            
            const trip: Omit<Trip, 'id'> = {
              category: category,
              startDate: cleanText(values[1] || ''),
              odometerStart: parseInt(cleanText(values[2] || '0')),
              startPosition: cleanText(values[3] || ''),
              endDate: cleanText(values[4] || ''),
              odometerEnd: parseInt(cleanText(values[5] || '0')),
              endDestination: cleanText(values[6] || ''),
              duration: cleanText(values[7] || ''),
              distance: parseFloat(cleanText(values[8] || '0').replace(',', '.')),
              fuelConsumption: cleanText(values[9] || ''),
              title: cleanText(values[10] || ''),
              batteryConsumption: cleanText(values[11] || ''),
              batteryRegeneration: cleanText(values[12] || ''),
              notes: cleanText(values[13] || '')
            };

            console.log('Parsed trip:', {
              category: trip.category,
              startDate: trip.startDate,
              odometerStart: trip.odometerStart,
              odometerEnd: trip.odometerEnd
            });

            // Validate required fields
            if (!trip.category || !trip.startDate || !trip.odometerStart || !trip.odometerEnd) {
              errors.push(`Line ${i}: Missing required fields (category: ${trip.category}, startDate: ${trip.startDate}, odometerStart: ${trip.odometerStart}, odometerEnd: ${trip.odometerEnd})`);
              skippedLines++;
            } else if (trip.odometerStart >= trip.odometerEnd) {
              errors.push(`Line ${i}: Invalid odometer values (start: ${trip.odometerStart} >= end: ${trip.odometerEnd})`);
              skippedLines++;
            } else {
              results.push(trip);
            }
          } catch (error) {
            const errorMsg = `Line ${i}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            skippedLines++;
          }
        }
      }
    } else {
      // This is the old Volvo format - all on one line
      console.log('Detected Volvo single-line CSV format');
      
      const content = cleanedContent;
      
      // Find all occurrences of patterns that look like category names at the start of rows
      const categoryPattern = /(Privat|Arbete|Okategoriserat);/g;
      
      // First, extract the header (everything before the first category)
      const firstCategoryMatch = content.search(categoryPattern);
      if (firstCategoryMatch === -1) {
        console.log('No categories found in CSV');
        resolve(results);
        return;
      }
      
      const header = content.substring(0, firstCategoryMatch).trim();
      console.log('Extracted header:', header);
      
      // Now find all the data rows
      const dataContent = content.substring(firstCategoryMatch);
      console.log('Data content length:', dataContent.length);
      
      // Split by category patterns to get individual rows
      const rows = dataContent.split(/(?=(?:Privat|Arbete|Okategoriserat);)/);
      console.log('Found rows:', rows.length);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        console.log(`Processing row ${i}:`, row.substring(0, 100) + '...');
        
        const values = row.split(';');
        console.log(`Row ${i} has ${values.length} values`);
        
        if (values.length >= 14) {
          try {
            let category = cleanText(values[0] || '');
            
            // Apply category mapping if enabled
            if (mapOkategoriseratToPrivat && category === 'Okategoriserat') {
              category = 'Privat';
              console.log('Mapped "Okategoriserad" to "Privat"');
            }
            
            const trip: Omit<Trip, 'id'> = {
              category: category,
              startDate: cleanText(values[1] || ''),
              odometerStart: parseInt(cleanText(values[2] || '0')),
              startPosition: cleanText(values[3] || ''),
              endDate: cleanText(values[4] || ''),
              odometerEnd: parseInt(cleanText(values[5] || '0')),
              endDestination: cleanText(values[6] || ''),
              duration: cleanText(values[7] || ''),
              distance: parseFloat(cleanText(values[8] || '0').replace(',', '.')),
              fuelConsumption: cleanText(values[9] || ''),
              title: cleanText(values[10] || ''),
              batteryConsumption: cleanText(values[11] || ''),
              batteryRegeneration: cleanText(values[12] || ''),
              notes: cleanText(values[13] || '')
            };

            console.log('Parsed trip:', {
              category: trip.category,
              startDate: trip.startDate,
              odometerStart: trip.odometerStart,
              odometerEnd: trip.odometerEnd
            });

            // Validate required fields
            if (!trip.category || !trip.startDate || !trip.odometerStart || !trip.odometerEnd) {
              errors.push(`Row ${i}: Missing required fields (category: ${trip.category}, startDate: ${trip.startDate}, odometerStart: ${trip.odometerStart}, odometerEnd: ${trip.odometerEnd})`);
              skippedLines++;
            } else if (trip.odometerStart >= trip.odometerEnd) {
              errors.push(`Row ${i}: Invalid odometer values (start: ${trip.odometerStart} >= end: ${trip.odometerEnd})`);
              skippedLines++;
            } else {
              results.push(trip);
            }
          } catch (error) {
            const errorMsg = `Row ${i}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            skippedLines++;
          }
        }
      }
    }

    console.log(`Final parsed ${results.length} trips, ${skippedLines} skipped, ${errors.length} errors`);
    if (errors.length > 0) {
      console.warn('CSV parsing errors:', errors.slice(0, 10)); // Log first 10 errors
    }
    resolve(results);
  });
}