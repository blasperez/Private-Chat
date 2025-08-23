"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForensicsService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class ForensicsService {
    constructor(db, baseDir = process.cwd()) {
        this.db = db;
        this.logDir = path_1.default.join(baseDir, 'data', 'forensics');
        this.ensureDirectories();
    }
    ensureDirectories() {
        const dirs = [
            this.logDir,
            path_1.default.join(this.logDir, 'daily'),
            path_1.default.join(this.logDir, 'reports'),
            path_1.default.join(this.logDir, 'evidence')
        ];
        dirs.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Log de eventos forenses con estructura estandarizada
     */
    async logEvent(event) {
        try {
            // Guardar en base de datos
            await this.db.query(`INSERT INTO forensic_logs (room_id, event_type, timestamp, ip_address, user_agent, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6)`, [event.roomId, event.eventType, event.timestamp, event.ipAddress, event.userAgent, JSON.stringify(event.metadata)]);
            // Guardar en archivo diario
            const dateStr = event.timestamp.toISOString().split('T')[0];
            const logFile = path_1.default.join(this.logDir, 'daily', `${dateStr}.jsonl`);
            const logEntry = {
                ...event,
                hash: this.generateHash(event),
                serverTime: new Date().toISOString()
            };
            fs_1.default.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        }
        catch (error) {
            console.error('Forensic logging error:', error);
            // Fallback: escribir en archivo de emergencia
            const emergencyLog = path_1.default.join(this.logDir, 'emergency.log');
            fs_1.default.appendFileSync(emergencyLog, `${new Date().toISOString()} - ERROR: ${error}\n${JSON.stringify(event)}\n\n`);
        }
    }
    /**
     * Generar hash para integridad de datos
     */
    generateHash(data) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }
    /**
     * Generar reporte forense para autoridades
     */
    async generateForensicReport(request) {
        const reportId = crypto_1.default.randomUUID();
        const reportPath = path_1.default.join(this.logDir, 'reports', `${reportId}.json`);
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
            const logs = await this.db.query(`SELECT * FROM forensic_logs 
         WHERE room_id = ANY($1) 
         AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp ASC`, [request.roomIds, request.dateRange.start, request.dateRange.end]);
            report.data.logs = logs.rows;
            // Guardar reporte
            fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            // Crear archivo ZIP con evidencia si se solicita
            if (request.includeMedia) {
                await this.createEvidencePackage(reportId, request.roomIds);
            }
            return reportPath;
        }
        catch (error) {
            console.error('Error generating forensic report:', error);
            throw error;
        }
    }
    /**
     * Obtener datos forenses completos de una sala
     */
    async getRoomForensicData(roomId, request) {
        const roomData = {
            roomId,
            details: {},
            messages: [],
            media: [],
            sessions: []
        };
        // Información de la sala
        const room = await this.db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
        roomData.details = room.rows[0];
        // Mensajes si se solicitan
        if (request.includeMessages) {
            const messages = await this.db.query('SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC', [roomId]);
            roomData.messages = messages.rows;
        }
        // Archivos multimedia si se solicitan
        if (request.includeMedia) {
            const media = await this.db.query('SELECT * FROM media WHERE room_id = $1 ORDER BY uploaded_at ASC', [roomId]);
            roomData.media = media.rows;
        }
        // Sesiones de usuarios
        if (request.includeMetadata) {
            const sessions = await this.db.query('SELECT * FROM room_sessions WHERE room_id = $1 ORDER BY joined_at ASC', [roomId]);
            roomData.sessions = sessions.rows;
        }
        return roomData;
    }
    /**
     * Crear paquete de evidencia con archivos multimedia
     */
    async createEvidencePackage(reportId, roomIds) {
        const evidenceDir = path_1.default.join(this.logDir, 'evidence', reportId);
        fs_1.default.mkdirSync(evidenceDir, { recursive: true });
        for (const roomId of roomIds) {
            const roomDir = path_1.default.join(evidenceDir, roomId);
            fs_1.default.mkdirSync(roomDir, { recursive: true });
            // Copiar archivos multimedia de la sala
            const mediaDir = path_1.default.join(process.cwd(), 'data', roomId);
            if (fs_1.default.existsSync(mediaDir)) {
                const files = fs_1.default.readdirSync(mediaDir);
                files.forEach(file => {
                    const src = path_1.default.join(mediaDir, file);
                    const dest = path_1.default.join(roomDir, file);
                    fs_1.default.copyFileSync(src, dest);
                });
            }
            // Crear archivo de metadatos
            const metadata = {
                roomId,
                collectedAt: new Date(),
                files: fs_1.default.readdirSync(roomDir),
                hash: this.generateDirectoryHash(roomDir)
            };
            fs_1.default.writeFileSync(path_1.default.join(roomDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        }
    }
    /**
     * Generar hash de integridad para un directorio
     */
    generateDirectoryHash(dir) {
        const hash = crypto_1.default.createHash('sha256');
        const files = fs_1.default.readdirSync(dir).sort();
        files.forEach(file => {
            const filePath = path_1.default.join(dir, file);
            const stats = fs_1.default.statSync(filePath);
            if (stats.isFile()) {
                const content = fs_1.default.readFileSync(filePath);
                hash.update(content);
            }
        });
        return hash.digest('hex');
    }
    /**
     * Búsqueda de contenido para investigaciones
     */
    async searchContent(criteria) {
        let query = 'SELECT * FROM messages WHERE 1=1';
        const params = [];
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
            return results.rows.filter((msg) => {
                const text = msg.text.toLowerCase();
                return criteria.keywords.some(keyword => text.includes(keyword.toLowerCase()));
            });
        }
        return results.rows;
    }
    /**
     * Exportar datos para cumplimiento legal
     */
    async exportForLegalCompliance(requestId, format = 'json') {
        const exportPath = path_1.default.join(this.logDir, 'exports', `${requestId}.${format}`);
        // Implementar exportación según formato requerido
        // Este es un placeholder para la implementación completa
        return exportPath;
    }
}
exports.ForensicsService = ForensicsService;
