import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import type { Database } from 'sqlite';
import fs from 'fs';
import path from 'path';

export interface Trip {
  id?: number;
  category: string;
  startDate: string;
  odometerStart: number;
  startPosition: string;
  endDate: string;
  odometerEnd: number;
  endDestination: string;
  duration: string;
  distance: number;
  fuelConsumption: string;
  title: string;
  batteryConsumption: string;
  batteryRegeneration: string;
  notes: string;
}

let db: Database | null = null;

// Custom error class for database corruption
export class DatabaseCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseCorruptionError';
  }
}

// Helper function to check if error is SQLite corruption
function isSQLiteCorruptionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  
  const errorObj = error as { code?: string; message?: string };
  const corruptionCodes = ['SQLITE_CORRUPT', 'SQLITE_NOTADB', 'SQLITE_CANTOPEN'];
  
  return corruptionCodes.some(code => 
    errorObj.code === code || 
    errorObj.message?.includes(code) || 
    errorObj.message?.includes('database disk image is malformed') ||
    errorObj.message?.includes('file is not a database')
  );
}

// Database health check function
async function validateDatabase(database: Database, fileExistedBefore: boolean): Promise<{ isHealthy: boolean; isFreshDatabase: boolean }> {
  try {
    // Test basic connection
    await database.get('SELECT 1');
    
    // Run integrity check
    const result = await database.get<{integrity_check: string}>('PRAGMA integrity_check');
    if (result?.integrity_check !== 'ok') {
      console.error('Database integrity check failed:', result?.integrity_check);
      return { isHealthy: false, isFreshDatabase: false };
    }
    
    // Verify required tables exist
    const tables = await database.all<{name: string}[]>(`
      SELECT name FROM sqlite_master WHERE type='table' AND name IN ('trips', 'settings')
    `);
    
    if (tables.length < 2) {
      if (!fileExistedBefore) {
        // Database file didn't exist before - this is a fresh installation, not corruption
        console.log('Fresh database detected (file did not exist before), tables will be created');
        return { isHealthy: true, isFreshDatabase: true };
      } else {
        // Database file existed but tables are missing - this indicates corruption
        console.error('Database corruption detected: file existed but required tables are missing');
        return { isHealthy: false, isFreshDatabase: false };
      }
    }
    
    return { isHealthy: true, isFreshDatabase: false };
  } catch (error) {
    console.error('Database validation failed:', error);
    return { isHealthy: false, isFreshDatabase: false };
  }
}

// Database recovery function
async function recoverDatabase(): Promise<Database | null> {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'trips.db');
    const backupPath = path.join(process.cwd(), 'data', `trips.corrupted.${Date.now()}.db`);
    
    // Backup corrupted database if it exists
    if (fs.existsSync(dbPath)) {
      console.log('Backing up corrupted database to:', backupPath);
      fs.renameSync(dbPath, backupPath);
    }
    
    // Create fresh database
    console.log('Creating fresh database...');
    const freshDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create tables
    await freshDb.exec(`
      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        startDate TEXT NOT NULL,
        odometerStart INTEGER NOT NULL,
        startPosition TEXT NOT NULL,
        endDate TEXT NOT NULL,
        odometerEnd INTEGER NOT NULL,
        endDestination TEXT NOT NULL,
        duration TEXT NOT NULL,
        distance REAL NOT NULL,
        fuelConsumption TEXT NOT NULL,
        title TEXT NOT NULL,
        batteryConsumption TEXT NOT NULL,
        batteryRegeneration TEXT NOT NULL,
        notes TEXT NOT NULL,
        UNIQUE(startDate, odometerStart, odometerEnd)
      )
    `);

    await freshDb.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    console.log('Fresh database created successfully');
    return freshDb;
  } catch (error) {
    console.error('Database recovery failed:', error);
    return null;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'trips.db');
    
    try {
      // Check if database file exists before opening
      const fileExistedBefore = fs.existsSync(dbPath);
      
      // Ensure data directory exists
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Validate database health
      const validation = await validateDatabase(db, fileExistedBefore);
      
      if (!validation.isHealthy) {
        console.warn('Database corruption detected, attempting recovery...');
        await db.close();
        db = await recoverDatabase();
        
        if (!db) {
          throw new Error('Database recovery failed');
        }
      } else if (validation.isFreshDatabase) {
        // Fresh database - create tables without showing corruption warning
        console.log('Initializing fresh database with required tables...');
        await createTables(db);
      } else {
        // Existing healthy database - ensure tables exist (for backwards compatibility)
        await createTables(db);
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      
      // Final fallback: try to recover
      if (db) {
        try {
          await db.close();
        } catch (closeError) {
          console.error('Error closing corrupted database:', closeError);
        }
      }
      
      db = await recoverDatabase();
      if (!db) {
        throw new Error('Database initialization and recovery both failed');
      }
    }
  }
  return db;
}

// Helper function to create database tables
async function createTables(database: Database): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      startDate TEXT NOT NULL,
      odometerStart INTEGER NOT NULL,
      startPosition TEXT NOT NULL,
      endDate TEXT NOT NULL,
      odometerEnd INTEGER NOT NULL,
      endDestination TEXT NOT NULL,
      duration TEXT NOT NULL,
      distance REAL NOT NULL,
      fuelConsumption TEXT NOT NULL,
      title TEXT NOT NULL,
      batteryConsumption TEXT NOT NULL,
      batteryRegeneration TEXT NOT NULL,
      notes TEXT NOT NULL,
      UNIQUE(startDate, odometerStart, odometerEnd)
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function insertTrip(trip: Omit<Trip, 'id'>): Promise<number | false> {
  const database = await getDatabase();
  
  try {
    console.log('Inserting trip:', {
      startDate: trip.startDate,
      odometerStart: trip.odometerStart,
      odometerEnd: trip.odometerEnd,
      category: trip.category
    });
    
    // Use transaction for data integrity
    await database.exec('BEGIN TRANSACTION');
    
    const result = await database.run(`
      INSERT INTO trips (
        category, startDate, odometerStart, startPosition, endDate, 
        odometerEnd, endDestination, duration, distance, fuelConsumption,
        title, batteryConsumption, batteryRegeneration, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      trip.category, trip.startDate, trip.odometerStart, trip.startPosition,
      trip.endDate, trip.odometerEnd, trip.endDestination, trip.duration,
      trip.distance, trip.fuelConsumption, trip.title, trip.batteryConsumption,
      trip.batteryRegeneration, trip.notes
    ]);
    
    await database.exec('COMMIT');
    console.log('Trip inserted successfully with ID:', result.lastID);
    return result.lastID!;
  } catch (error) {
    // Rollback transaction on error
    try {
      await database.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    const errorObj = error as { code?: string; errno?: number; message?: string };
    console.log('Database error details:', {
      code: errorObj.code,
      errno: errorObj.errno,
      message: errorObj.message
    });
    
    // Check for database corruption
    if (isSQLiteCorruptionError(error)) {
      throw new DatabaseCorruptionError('Database corruption detected during trip insertion');
    }
    
    if (errorObj.code === 'SQLITE_CONSTRAINT_UNIQUE' || 
        errorObj.code === 'SQLITE_CONSTRAINT' || 
        errorObj.errno === 19) {
      console.log('Duplicate trip found, skipping:', {
        startDate: trip.startDate,
        odometerStart: trip.odometerStart,
        odometerEnd: trip.odometerEnd
      });
      return false; // Duplicate found
    }
    
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getTrips(
  page: number = 1, 
  limit: number = 20, 
  category: string = '', 
  dateFrom: string = '', 
  dateTo: string = '',
  sortOrder: string = 'desc'
): Promise<{trips: Trip[], total: number}> {
  const database = await getDatabase();
  const offset = (page - 1) * limit;
  
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
  const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  const trips = await database.all<Trip[]>(`
    SELECT * FROM trips 
    ${whereClause}
    ORDER BY startDate ${orderDirection}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  
  const totalResult = await database.get<{count: number}>(`
    SELECT COUNT(*) as count FROM trips
    ${whereClause}
  `, params);
  
  return {
    trips,
    total: totalResult?.count || 0
  };
}

export async function updateTrip(id: number, updates: { category?: string; notes?: string }): Promise<boolean> {
  try {
    const database = await getDatabase();
    const setClauses = [];
    const params = [];
    
    if (updates.category !== undefined) {
      setClauses.push('category = ?');
      params.push(updates.category);
    }
    
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(updates.notes);
    }
    
    if (setClauses.length === 0) {
      return false;
    }
    
    params.push(id);
    
    const result = await database.run(`
      UPDATE trips 
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `, params);
    
    return result.changes! > 0;
  } catch (error) {
    console.error('Update trip error:', error);
    return false;
  }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const database = await getDatabase();
    const result = await database.get<{value: string}>(`
      SELECT value FROM settings WHERE key = ?
    `, [key]);
    
    return result?.value || null;
  } catch (error) {
    console.error('Get setting error:', error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    const database = await getDatabase();
    await database.run(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `, [key, value]);
    
    return true;
  } catch (error) {
    console.error('Set setting error:', error);
    return false;
  }
}

export async function getMultipleSettings(keys: string[]): Promise<{ [key: string]: string }> {
  try {
    const database = await getDatabase();
    const placeholders = keys.map(() => '?').join(',');
    const results = await database.all<{ key: string; value: string }[]>(`
      SELECT key, value FROM settings WHERE key IN (${placeholders})
    `, keys);
    
    const settings: { [key: string]: string } = {};
    results.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return settings;
  } catch (error) {
    console.error('Get multiple settings error:', error);
    return {};
  }
}


export async function getFuelStatistics(
  category: string = '', 
  dateFrom: string = '', 
  dateTo: string = ''
): Promise<{
  totalTrips: number;
  totalDistance: number;
  totalFuelConsumption: number;
  totalElectricConsumption: number;
  averageFuelPer100km: number;
  averageElectricPer100km: number;
  categoryStats: Array<{
    category: string;
    trips: number;
    distance: number;
    fuelConsumption: number;
    electricConsumption: number;
  }>;
  monthlyStats: Array<{
    month: string;
    trips: number;
    distance: number;
    fuelConsumption: number;
    electricConsumption: number;
  }>;
}> {
  try {
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
    
    // Get basic statistics
    const basicStats = await database.get(`
      SELECT 
        COUNT(*) as totalTrips,
        SUM(distance) as totalDistance,
        SUM(CASE 
          WHEN fuelConsumption != '' AND fuelConsumption != '0 l' 
          THEN CAST(REPLACE(REPLACE(fuelConsumption, ' l', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as totalFuelConsumption,
        SUM(CASE 
          WHEN batteryConsumption != '' AND batteryConsumption != '0 kWh' 
          THEN CAST(REPLACE(REPLACE(batteryConsumption, ' kWh', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as totalElectricConsumption
      FROM trips
      ${whereClause}
    `, params);
    
    // Get category statistics
    const categoryStats = await database.all(`
      SELECT 
        category,
        COUNT(*) as trips,
        SUM(distance) as distance,
        SUM(CASE 
          WHEN fuelConsumption != '' AND fuelConsumption != '0 l' 
          THEN CAST(REPLACE(REPLACE(fuelConsumption, ' l', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as fuelConsumption,
        SUM(CASE 
          WHEN batteryConsumption != '' AND batteryConsumption != '0 kWh' 
          THEN CAST(REPLACE(REPLACE(batteryConsumption, ' kWh', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as electricConsumption
      FROM trips
      ${whereClause}
      GROUP BY category
      ORDER BY distance DESC
    `, params);
    
    // Get monthly statistics
    const monthlyStats = await database.all(`
      SELECT 
        strftime('%Y-%m', startDate) as month,
        COUNT(*) as trips,
        SUM(distance) as distance,
        SUM(CASE 
          WHEN fuelConsumption != '' AND fuelConsumption != '0 l' 
          THEN CAST(REPLACE(REPLACE(fuelConsumption, ' l', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as fuelConsumption,
        SUM(CASE 
          WHEN batteryConsumption != '' AND batteryConsumption != '0 kWh' 
          THEN CAST(REPLACE(REPLACE(batteryConsumption, ' kWh', ''), ',', '.') AS REAL) 
          ELSE 0 
        END) as electricConsumption
      FROM trips
      ${whereClause}
      GROUP BY strftime('%Y-%m', startDate)
      ORDER BY month DESC
      LIMIT 12
    `, params);
    
    const totalDistance = basicStats?.totalDistance || 0;
    const totalFuelConsumption = basicStats?.totalFuelConsumption || 0;
    const totalElectricConsumption = basicStats?.totalElectricConsumption || 0;
    
    return {
      totalTrips: basicStats?.totalTrips || 0,
      totalDistance,
      totalFuelConsumption,
      totalElectricConsumption,
      averageFuelPer100km: totalDistance > 0 ? (totalFuelConsumption / totalDistance) * 100 : 0,
      averageElectricPer100km: totalDistance > 0 ? (totalElectricConsumption / totalDistance) * 100 : 0,
      categoryStats: categoryStats || [],
      monthlyStats: monthlyStats || []
    };
  } catch (error) {
    console.error('Get fuel statistics error:', error);
    return {
      totalTrips: 0,
      totalDistance: 0,
      totalFuelConsumption: 0,
      totalElectricConsumption: 0,
      averageFuelPer100km: 0,
      averageElectricPer100km: 0,
      categoryStats: [],
      monthlyStats: []
    };
  }
}