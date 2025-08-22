import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseAdapter } from './database';

export interface ForensicLog {
  roomId: string;
  timestamp: Date;
  eventType: 'room_created' | 'user_joined' | 'message_sent' | 'media_uploaded' | 'user_left' | 'room_archived';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface ForensicReport {
  caseId: string;
  requestedBy: string;
  requestDate: Date;
  roomIds: string[];
  dateRange: { start: Date; end: Date };
  includeMedia: boolean;
  includeMessages: boolean;
  includeMetadata: boolean;
}

export class ForensicsService {
  private logDir: string;
  private db: DatabaseAdapter;

  constructor(db: DatabaseAdapter, baseDir: string = process.cwd()) {
    this.db = db;
    this.logDir = path.join(baseDir, 'data', 'forensics');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      this.logDir,
      path.join(this.logDir, 'daily'),
      path.join(this.logDir, 'reports'),
      path.join(this.logDir, 'evidence')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Log de eventos forenses con estructura estandarizada
   */
  async logEvent(event: ForensicLog): Promise<void> {
    try {
      // Guardar en base de datos
      await this.db.query(
        `INSERT INTO forensic_logs (room_id, event_type, timestamp, ip_address, user_agent, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [event.roomId, event.eventType, event.timestamp, event.ipAddress, event.userAgent, JSON.stringify(event.metadata)]
      );

      // Guardar en archivo diario
      const dateStr = event.timestamp.toISOString().split('T')[0];
      const logFile = path.join(this.logDir, 'daily', `${dateStr}.jsonl`);
      
      const logEntry = {
        ...event,
        hash: this.generateHash(event),
        serverTime: new Date().toISOString()
      };

      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Forensic logging error:', error);
      // Fallback: escribir en archivo de emergencia
      const emergencyLog = path.join(this.logDir, 'emergency.log');
      fs.appendFileSync(emergencyLog, `${new Date().toISOString()} - ERROR: ${error}\n${JSON.stringify(event)}\n\n`);
    }
  }

  /**
   * Generar hash para integridad de datos
   */
  private generateHash(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Generar reporte forense para autoridades
   */
  async generateForensicReport(request: ForensicReport): Promise<string> {
    const reportId = crypto.randomUUID();
    const reportPath = path.join(this.logDir, 'reports', `${reportId}.json`);
    
    const report = {
      reportId,
      generatedAt: new Date(),
      request,
      data: {
        rooms: [],
        messages: [],
        media: [],
        sessions: [],
        logs: []
      }
    };

    try {
      // Recopilar datos de salas
      for (const roomId of request.roomIds) {
        const roomData = await this.getRoomForensicData(roomId, request);
        report.data.rooms.push(roomData);
      }

      // Recopilar logs forenses
      const logs = await this.db.query(
        `SELECT * FROM forensic_logs 
         WHERE room_id = ANY($1) 
         AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp ASC`,
        [request.roomIds, request.dateRange.start, request.dateRange.end]
      );
      report.data.logs = logs.rows;

      // Guardar reporte
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // Crear archivo ZIP con evidencia si se solicita
      if (request.includeMedia) {
        await this.createEvidencePackage(reportId, request.roomIds);
      }

      return reportPath;
    } catch (error) {
      console.error('Error generating forensic report:', error);
      throw error;
    }
  }

  /**
   * Obtener datos forenses completos de una sala
   */
  private async getRoomForensicData(roomId: string, request: ForensicReport): Promise<any> {
    const roomData: any = {
      roomId,
      details: {},
      messages: [],
      media: [],
      sessions: []
    };

    // Información de la sala
    const room = await this.db.query(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );
    roomData.details = room.rows[0];

    // Mensajes si se solicitan
    if (request.includeMessages) {
      const messages = await this.db.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC',
        [roomId]
      );
      roomData.messages = messages.rows;
    }

    // Archivos multimedia si se solicitan
    if (request.includeMedia) {
      const media = await this.db.query(
        'SELECT * FROM media WHERE room_id = $1 ORDER BY uploaded_at ASC',
        [roomId]
      );
      roomData.media = media.rows;
    }

    // Sesiones de usuarios
    if (request.includeMetadata) {
      const sessions = await this.db.query(
        'SELECT * FROM room_sessions WHERE room_id = $1 ORDER BY joined_at ASC',
        [roomId]
      );
      roomData.sessions = sessions.rows;
    }

    return roomData;
  }

  /**
   * Crear paquete de evidencia con archivos multimedia
   */
  private async createEvidencePackage(reportId: string, roomIds: string[]): Promise<void> {
    const evidenceDir = path.join(this.logDir, 'evidence', reportId);
    fs.mkdirSync(evidenceDir, { recursive: true });

    for (const roomId of roomIds) {
      const roomDir = path.join(evidenceDir, roomId);
      fs.mkdirSync(roomDir, { recursive: true });

      // Copiar archivos multimedia de la sala
      const mediaDir = path.join(process.cwd(), 'data', roomId);
      if (fs.existsSync(mediaDir)) {
        const files = fs.readdirSync(mediaDir);
        files.forEach(file => {
          const src = path.join(mediaDir, file);
          const dest = path.join(roomDir, file);
          fs.copyFileSync(src, dest);
        });
      }

      // Crear archivo de metadatos
      const metadata = {
        roomId,
        collectedAt: new Date(),
        files: fs.readdirSync(roomDir),
        hash: this.generateDirectoryHash(roomDir)
      };
      fs.writeFileSync(
        path.join(roomDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    }
  }

  /**
   * Generar hash de integridad para un directorio
   */
  private generateDirectoryHash(dir: string): string {
    const hash = crypto.createHash('sha256');
    const files = fs.readdirSync(dir).sort();
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const content = fs.readFileSync(filePath);
        hash.update(content);
      }
    });
    
    return hash.digest('hex');
  }

  /**
   * Búsqueda de contenido para investigaciones
   */
  async searchContent(criteria: {
    keywords?: string[];
    ipAddress?: string;
    dateRange?: { start: Date; end: Date };
    roomIds?: string[];
  }): Promise<any[]> {
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.roomIds && criteria.roomIds.length > 0) {
      query += ` AND room_id = ANY($${paramIndex})`;
      params.push(criteria.roomIds);
      paramIndex++;
    }

    if (criteria.dateRange) {
      query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(criteria.dateRange.start, criteria.dateRange.end);
      paramIndex += 2;
    }

    const results = await this.db.query(query, params);
    
    // Filtrar por palabras clave si se proporcionan
    if (criteria.keywords && criteria.keywords.length > 0) {
      return results.rows.filter((msg: any) => {
        const text = msg.text.toLowerCase();
        return criteria.keywords!.some(keyword => 
          text.includes(keyword.toLowerCase())
        );
      });
    }

    return results.rows;
  }

  /**
   * Exportar datos para cumplimiento legal
   */
  async exportForLegalCompliance(requestId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const exportPath = path.join(this.logDir, 'exports', `${requestId}.${format}`);
    
    // Implementar exportación según formato requerido
    // Este es un placeholder para la implementación completa
    
    return exportPath;
  }
}