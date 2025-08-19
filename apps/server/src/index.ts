import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import argon2 from 'argon2';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

const PORT = Number(process.env.PORT || 8080);
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes base64/hex
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// DB pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Storage
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Multer storage per room temporary folder
const upload = multer({ dest: path.join(DATA_DIR, 'tmp'), limits: { fileSize: 100 * 1024 * 1024 } });

const app = express();
app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve built frontend if exists
const WEB_DIST = path.resolve(process.cwd(), 'apps/web/dist');
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get(['/','/r/:token'], (_req, res) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN } });

type RoomPresence = {
  roomId: string;
  count: number;
  timeout?: NodeJS.Timeout;
};

const presence = new Map<string, RoomPresence>();

function getCipher() {
  if (!ENCRYPTION_KEY) return null;
  const key = Buffer.from(ENCRYPTION_KEY, ENCRYPTION_KEY.length === 64 ? 'hex' : 'base64');
  return {
    encrypt: (plaintext: string) => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, enc]).toString('base64');
    },
    decrypt: (payload: string) => {
      const raw = Buffer.from(payload, 'base64');
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const enc = raw.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return dec.toString('utf8');
    }
  };
}

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Create room
app.post('/api/rooms', async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password) return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
    const roomId = uuidv4();
    const passwordHash = await argon2.hash(password);
    const magicToken = uuidv4();
    const mediaDir = path.join(DATA_DIR, roomId);
    fs.mkdirSync(mediaDir, { recursive: true });
    const { rows } = await pool.query(
      'insert into rooms (id, password_hash, magic_token, media_dir) values ($1, $2, $3, $4) returning id, magic_token',
      [roomId, passwordHash, magicToken, mediaDir]
    );
    res.json({ roomId: rows[0].id, magicLink: `${req.protocol}://${req.get('host')}/r/${rows[0].magic_token}` });
  } catch (e) {
    res.status(500).json({ error: 'CREATE_ROOM_FAILED' });
  }
});

// Resolve magic link -> room id
app.get('/api/resolve/:token', async (req, res) => {
  const token = req.params.token;
  const { rows } = await pool.query('select id from rooms where magic_token=$1', [token]);
  if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ roomId: rows[0].id });
});

// Join room with password
app.post('/api/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body as { password: string };
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const room = await pool.query('select id, password_hash, archived_at from rooms where id=$1', [roomId]);
    if (!room.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    if (room.rows[0].archived_at) return res.status(410).json({ error: 'ROOM_ARCHIVED' });
    const ok = await argon2.verify(room.rows[0].password_hash, password);
    if (!ok) return res.status(401).json({ error: 'INVALID_PASSWORD' });
    await pool.query('insert into room_sessions (room_id, joined_at, ip, user_agent) values ($1, now(), $2, $3)', [roomId, ip, ua]);
    const token = jwt.sign({ roomId }, SESSION_SECRET, { expiresIn: '2h' });
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ error: 'JOIN_FAILED' });
  }
});

// Upload media
app.post('/api/rooms/:roomId/upload', upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'NO_FILE' });
    const { rows } = await pool.query('select media_dir, archived_at from rooms where id=$1', [roomId]);
    if (!rows[0]) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    if (rows[0].archived_at) return res.status(410).json({ error: 'ROOM_ARCHIVED' });
    const mediaDir = rows[0].media_dir as string;
    const mime = file.mimetype;
    const ext = path.extname(file.originalname) || ({
      'image/jpeg': '.jpg', 'image/png': '.png', 'video/mp4': '.mp4', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a'
    } as Record<string, string>)[mime] || '';
    const destName = `${Date.now()}_${uuidv4()}${ext}`;
    const destPath = path.join(mediaDir, destName);
    let storageKey: string | null = null;
    if (SUPABASE_BUCKET) {
      const key = `rooms/${roomId}/${destName}`;
      const buffer = fs.readFileSync(file.path);
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(key, buffer, { contentType: mime, upsert: false });
      fs.unlinkSync(file.path);
      if (error) return res.status(500).json({ error: 'STORAGE_UPLOAD_FAILED' });
      storageKey = key;
      await pool.query(
        'insert into media (room_id, file_path, mime_type, size_bytes, uploaded_at) values ($1, $2, $3, $4, now())',
        [roomId, storageKey, mime, file.size]
      );
      io.to(roomId).emit('media', { fileName: destName, mime, url: `/api/rooms/${roomId}/media/${destName}` });
      res.json({ ok: true, file: destName });
    } else {
      fs.renameSync(file.path, destPath);
      await pool.query(
        'insert into media (room_id, file_path, mime_type, size_bytes, uploaded_at) values ($1, $2, $3, $4, now())',
        [roomId, destPath, mime, file.size]
      );
      io.to(roomId).emit('media', { fileName: destName, mime, url: `/api/rooms/${roomId}/media/${destName}` });
      res.json({ ok: true, file: destName });
    }
  } catch (e) {
    res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

// Serve media
app.get('/api/rooms/:roomId/media/:name', async (req, res) => {
  const { roomId, name } = req.params;
  const { rows } = await pool.query('select media_dir from rooms where id=$1', [roomId]);
  if (!rows[0]) return res.status(404).end();
  if (SUPABASE_BUCKET) {
    const key = `rooms/${roomId}/${name}`;
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(key, 60);
    if (error || !data) return res.status(404).end();
    return res.redirect(data.signedUrl);
  }
  const filePath = path.join(rows[0].media_dir, name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// Socket.IO events
// Socket auth middleware
io.use((socket, next) => {
  const token = (socket.handshake.auth as any)?.token as string | undefined;
  if (!token) return next(new Error('NO_TOKEN'));
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as { roomId: string };
    (socket.data as any).roomId = payload.roomId;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', async ({ roomId }: { roomId: string }) => {
    if ((socket.data as any).roomId !== roomId) return;
    const room = await pool.query('select archived_at from rooms where id=$1', [roomId]);
    if (room.rows[0]?.archived_at) return;
    socket.join(roomId);
    const p = presence.get(roomId) || { roomId, count: 0 };
    p.count += 1;
    if (p.timeout) clearTimeout(p.timeout);
    presence.set(roomId, p);
    io.to(roomId).emit('presence', { count: p.count });
  });

  socket.on('message', async (payload: { roomId: string; text: string; sender?: string }) => {
    if ((socket.data as any).roomId !== payload.roomId) return;
    const room = await pool.query('select archived_at from rooms where id=$1', [payload.roomId]);
    if (room.rows[0]?.archived_at) return;
    const cipher = getCipher();
    const safeText = cipher ? cipher.encrypt(payload.text) : payload.text;
    await pool.query('insert into messages (room_id, text, created_at) values ($1, $2, now())', [payload.roomId, safeText]);
    io.to(payload.roomId).emit('message', { text: payload.text, sender: payload.sender, ts: Date.now() });
  });

  socket.on('leave', ({ roomId }: { roomId: string }) => {
    socket.leave(roomId);
    handleLeave(roomId);
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((rid) => handleLeave(rid));
  });
});

async function handleLeave(roomId: string) {
  const p = presence.get(roomId);
  if (!p) return;
  p.count = Math.max(0, p.count - 1);
  io.to(roomId).emit('presence', { count: p.count });
  if (p.count === 0) {
    // grace period to avoid flapping
    p.timeout = setTimeout(async () => {
      const finalPresence = presence.get(roomId);
      if (!finalPresence || finalPresence.count !== 0) return;
      await archiveRoom(roomId);
      presence.delete(roomId);
    }, 5000);
  }
}

async function archiveRoom(roomId: string) {
  try {
    const logDir = path.join(DATA_DIR, 'archives');
    fs.mkdirSync(logDir, { recursive: true });
    const ts = Date.now();
    const logPath = path.join(logDir, `${roomId}_${ts}.log.jsonl`);
    const { rows: msgs } = await pool.query('select text, created_at from messages where room_id=$1 order by created_at asc', [roomId]);
    const cipher = getCipher();
    const write = fs.createWriteStream(logPath);
    for (const m of msgs) {
      const text = cipher ? ((): string => {
        try { return cipher.decrypt(m.text); } catch { return '[unreadable]'; }
      })() : m.text;
      write.write(JSON.stringify({ ts: m.created_at, text }) + '\n');
    }
    await new Promise<void>((resolve) => { write.end(resolve); });

    // Optionally encrypt the archive file at rest
    let finalArchivePath = logPath;
    if (cipher) {
      try {
        const raw = fs.readFileSync(logPath, 'utf8');
        const encPayload = cipher.encrypt(raw);
        const encPath = path.join(logDir, `${roomId}_${ts}.log.enc`);
        fs.writeFileSync(encPath, encPayload, 'utf8');
        fs.unlinkSync(logPath);
        finalArchivePath = encPath;
      } catch {}
    }

    await pool.query('update rooms set archived_at=now(), archive_path=$2 where id=$1', [roomId, finalArchivePath]);
  } catch (e) {
    // Best-effort
  }
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening on :${PORT}`);
});


