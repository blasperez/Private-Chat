import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface DatabaseAdapter {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
  close(): Promise<void>;
}

class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    const url = new URL(connectionString);
    const port = Number(url.port || 5432);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const user = decodeURIComponent(url.username || '');
    const password = decodeURIComponent(url.password || '');
    const host = url.hostname;
    
    const isLocalDb = /localhost|127\.0\.0\.1/i.test(host);
    
    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false }
    });
  }

  async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
    return this.pool.query(sql, params);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(filename: string) {
    // Create directory if it doesn't exist
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(filename);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize tables
    this.initializeTables();
  }

  private initializeTables() {
    // Create tables with SQLite syntax
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        magic_token TEXT UNIQUE NOT NULL,
        media_dir TEXT NOT NULL,
        archive_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        archived_at DATETIME,
        max_participants INTEGER DEFAULT 10
      );

      CREATE TABLE IF NOT EXISTS room_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip TEXT,
        user_agent TEXT,
        display_name TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_magic_token ON rooms(magic_token);
      CREATE INDEX IF NOT EXISTS idx_rooms_archived_at ON rooms(archived_at);
      CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_media_room_id ON media(room_id);
    `);
  }

  async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
    // Convert PostgreSQL placeholders ($1, $2, etc.) to SQLite placeholders (?)
    let sqliteSQL = sql;
    if (params && params.length > 0) {
      sqliteSQL = sql.replace(/\$(\d+)/g, '?');
    }
    
    // Handle PostgreSQL specific syntax
    sqliteSQL = sqliteSQL
      .replace(/now\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/::int/gi, '')
      .replace(/::bigint/gi, '')
      .replace(/timestamptz/gi, 'DATETIME')
      .replace(/bigserial/gi, 'INTEGER')
      .replace(/uuid/gi, 'TEXT');

    try {
      // Handle INSERT with RETURNING clause specially
      if (sqliteSQL.toLowerCase().includes('insert') && sqliteSQL.toLowerCase().includes('returning')) {
        const returningMatch = sqliteSQL.match(/returning\s+(.*?)$/i);
        const returningColumns = returningMatch ? returningMatch[1].split(',').map(c => c.trim()) : [];
        
        // Remove RETURNING clause for the insert
        const insertSQL = sqliteSQL.replace(/\s+returning\s+.*/i, '');
        const stmt = this.db.prepare(insertSQL);
        const result = params ? stmt.run(...params) : stmt.run();
        
        // Get the values we need to return
        if (returningColumns.length > 0 && result.changes > 0) {
          // For the rooms table, we need to get the actual inserted values
          const tableName = this.extractTableName(sqliteSQL);
          if (tableName === 'rooms' && params && params.length >= 2) {
            // The id and magic_token were passed as parameters
            return { rows: [{ id: params[0], magic_token: params[2] }] };
          }
        }
        
        return { rows: [] };
      }
      
      if (sqliteSQL.toLowerCase().includes('select')) {
        const stmt = this.db.prepare(sqliteSQL);
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows: Array.isArray(rows) ? rows : [rows].filter(Boolean) };
      } else {
        const stmt = this.db.prepare(sqliteSQL);
        const result = params ? stmt.run(...params) : stmt.run();
        return { rows: [] };
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      console.error('SQL:', sqliteSQL);
      console.error('Params:', params);
      throw error;
    }
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/insert\s+into\s+(\w+)/i);
    return match ? match[1] : '';
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  const useSQLite = process.env.USE_SQLITE === 'true' || !databaseUrl || databaseUrl.includes('localhost');
  
  if (useSQLite) {
    console.log('Using SQLite database');
    const dbPath = path.join(process.cwd(), 'data', 'shadowrooms.db');
    return new SQLiteAdapter(dbPath);
  } else {
    console.log('Using PostgreSQL database');
    return new PostgreSQLAdapter(databaseUrl);
  }
}