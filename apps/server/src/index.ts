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
const ORIGIN_LIST = process.env.ORIGIN?.split(',').map((s)=>s.trim()).filter(Boolean);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes base64/hex
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// DB pool (force SSL for managed providers like Supabase)
const rawDbUrl = process.env.DATABASE_URL;
const isLocalDb = !!rawDbUrl && /localhost|127\.0\.0\.1/i.test(rawDbUrl);
const connWithSsl = rawDbUrl && !/sslmode=/i.test(rawDbUrl) ? `${rawDbUrl}${rawDbUrl.includes('?') ? '&' : '?'}sslmode=require` : rawDbUrl;
const pool = new Pool({
  connectionString: connWithSsl,
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false }
});

// Storage
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Multer storage per room temporary folder
const upload = multer({ dest: path.join(DATA_DIR, 'tmp'), limits: { fileSize: 100 * 1024 * 1024 } });

const app = express();
app.use(helmet());
app.use(cors({ origin: ORIGIN_LIST && ORIGIN_LIST.length > 0 ? ORIGIN_LIST : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve built frontend if exists
const WEB_DIST = path.resolve(process.cwd(), 'apps/web/dist');
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get(['/','/r/:token'], (_req, res) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}
else {
  app.get(['/','/r/:token'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>ShadowRooms</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:24px;background:#0b0b10;color:#e5e7eb"><h1>ShadowRooms</h1><p>No se encontró frontend compilado en <code>apps/web/dist</code>.</p><p>En producción el build del cliente se ejecuta automáticamente antes de iniciar. Si ves este mensaje, revisa permisos de escritura o errores de build.</p></body></html>`);
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN_LIST && ORIGIN_LIST.length > 0 ? ORIGIN_LIST : '*' } });

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

// --- Admin auth middleware ---
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    // Token via header or query
    const token = (req.headers['x-admin-token'] as string) || (req.query.token as string) || '';
    if (ADMIN_TOKEN && token) {
      const a = Buffer.from(ADMIN_TOKEN);
      const b = Buffer.from(token);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
    }
    // Basic auth
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Basic ') && ADMIN_USER && ADMIN_PASS) {
      const creds = Buffer.from(auth.slice(6), 'base64').toString();
      const [user, pass] = creds.split(':');
      const uOk = crypto.timingSafeEqual(Buffer.from(user || ''), Buffer.from(ADMIN_USER));
      const pOk = crypto.timingSafeEqual(Buffer.from(pass || ''), Buffer.from(ADMIN_PASS));
      if (uOk && pOk) return next();
    }
  } catch {}
  res.status(401).json({ error: 'UNAUTHORIZED' });
}

// Create room
app.post('/api/rooms', async (req, res) => {
  try {
    const { password, capacity } = req.body as { password: string; capacity?: number };
    if (!password) return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
    const cap = Math.min(Math.max(Number(capacity || 10), 2), 50);
    const roomId = uuidv4();
    const passwordHash = await argon2.hash(password);
    const magicToken = uuidv4();
    const mediaDir = path.join(DATA_DIR, roomId);
    fs.mkdirSync(mediaDir, { recursive: true });
    const { rows } = await pool.query(
      'insert into rooms (id, password_hash, magic_token, media_dir, max_participants) values ($1, $2, $3, $4, $5) returning id, magic_token',
      [roomId, passwordHash, magicToken, mediaDir, cap]
    );
    res.json({ roomId: rows[0].id, magicLink: `${req.protocol}://${req.get('host')}/r/${rows[0].magic_token}` });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('CREATE_ROOM_FAILED', e);
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
    const { password, name } = req.body as { password: string; name?: string };
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const room = await pool.query('select id, password_hash, archived_at, max_participants from rooms where id=$1', [roomId]);
    if (!room.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    if (room.rows[0].archived_at) return res.status(410).json({ error: 'ROOM_ARCHIVED' });
    const ok = await argon2.verify(room.rows[0].password_hash, password);
    if (!ok) return res.status(401).json({ error: 'INVALID_PASSWORD' });
    // capacity check
    const p = presence.get(roomId) || { roomId, count: 0 };
    if (room.rows[0].max_participants && p.count >= Number(room.rows[0].max_participants)) {
      return res.status(429).json({ error: 'ROOM_FULL' });
    }
    const safeName = (name || '').toString().trim().slice(0, 32) || undefined;
    await pool.query('insert into room_sessions (room_id, joined_at, ip, user_agent, display_name) values ($1, now(), $2, $3, $4)', [roomId, ip, ua, safeName]);
    const token = jwt.sign({ roomId, name: safeName }, SESSION_SECRET, { expiresIn: '2h' });
    res.json({ ok: true, token, name: safeName });
  } catch (e) {
    res.status(500).json({ error: 'JOIN_FAILED' });
  }
});

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/\\|\//g, '');
  // keep letters, numbers, space, dash, underscore, dot
  const cleaned = base.normalize('NFKD').replace(/[^A-Za-z0-9._ -]+/g, '');
  return cleaned.length ? cleaned : `file_${Date.now()}`;
}

async function ensureUniqueFsName(dir: string, desired: string): Promise<string> {
  const ext = path.extname(desired);
  const base = path.basename(desired, ext);
  let candidate = desired;
  let index = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${index})${ext}`;
    index += 1;
  }
  return candidate;
}

async function ensureUniqueStorageName(roomId: string, desired: string): Promise<string> {
  if (!SUPABASE_BUCKET) return desired;
  const ext = path.extname(desired);
  const base = path.basename(desired, ext);
  let candidate = desired;
  let index = 1;
  // try to list names and ensure uniqueness
  try {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(`rooms/${roomId}`, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    const names = new Set((data || []).map((o: any) => o.name));
    while (names.has(candidate)) {
      candidate = `${base} (${index})${ext}`;
      index += 1;
    }
  } catch {
    // fallback: optimistic
  }
  return candidate;
}

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
    const orig = sanitizeFilename(file.originalname || 'file');
    const guessedExt = path.extname(orig) || ({
      'image/jpeg': '.jpg', 'image/png': '.png', 'video/mp4': '.mp4', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a'
    } as Record<string, string>)[mime] || '';
    const baseNoExt = path.basename(orig, path.extname(orig) || guessedExt);
    let targetName = `${baseNoExt}${guessedExt}`;
    let storageKey: string | null = null;
    if (SUPABASE_BUCKET) {
      targetName = await ensureUniqueStorageName(roomId, targetName);
      const key = `rooms/${roomId}/${targetName}`;
      const buffer = fs.readFileSync(file.path);
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(key, buffer, { contentType: mime, upsert: false });
      fs.unlinkSync(file.path);
      if (error) return res.status(500).json({ error: 'STORAGE_UPLOAD_FAILED' });
      storageKey = key;
      await pool.query(
        'insert into media (room_id, file_path, mime_type, size_bytes, uploaded_at) values ($1, $2, $3, $4, now())',
        [roomId, storageKey, mime, file.size]
      );
      io.to(roomId).emit('media', { fileName: targetName, mime, url: `/api/rooms/${roomId}/media/${targetName}` });
      res.json({ ok: true, file: targetName });
    } else {
      targetName = await ensureUniqueFsName(mediaDir, targetName);
      const destPath = path.join(mediaDir, targetName);
      fs.renameSync(file.path, destPath);
      await pool.query(
        'insert into media (room_id, file_path, mime_type, size_bytes, uploaded_at) values ($1, $2, $3, $4, now())',
        [roomId, destPath, mime, file.size]
      );
      io.to(roomId).emit('media', { fileName: targetName, mime, url: `/api/rooms/${roomId}/media/${targetName}` });
      res.json({ ok: true, file: targetName });
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

// --- Admin API ---
app.get('/admin/api/overview', adminAuth, async (_req, res) => {
  const connectedRooms = [...presence.values()].filter((p) => p.count > 0).length;
  const totalConnected = [...presence.values()].reduce((a, b) => a + b.count, 0);
  const [{ rows: act } , { rows: arc }, { rows: media }] = await Promise.all([
    pool.query('select count(*)::int as c from rooms where archived_at is null'),
    pool.query('select count(*)::int as c from rooms where archived_at is not null'),
    pool.query('select count(*)::int as c from media')
  ]);
  res.json({ connectedRooms, totalConnected, roomsActive: act[0].c, roomsArchived: arc[0].c, mediaCount: media[0].c });
});

app.get('/admin/api/rooms', adminAuth, async (req, res) => {
  const archived = req.query.archived === '1';
  const { rows } = await pool.query(
    archived ? 'select id, created_at, archived_at from rooms where archived_at is not null order by archived_at desc limit 200' :
               'select id, created_at from rooms where archived_at is null order by created_at desc limit 200'
  );
  const withPresence = rows.map((r: any) => ({ ...r, presence: presence.get(r.id)?.count || 0 }));
  res.json(withPresence);
});

app.get('/admin/api/rooms/:roomId/media', adminAuth, async (req, res) => {
  const { roomId } = req.params;
  const { rows } = await pool.query('select file_path as path, mime_type as mime, size_bytes as size, uploaded_at from media where room_id=$1 order by uploaded_at desc', [roomId]);
  const items = rows.map((r: any) => {
    const name = SUPABASE_BUCKET ? path.basename(r.path) : path.basename(r.path);
    return { fileName: name, mime: r.mime, size: Number(r.size || 0), url: `/api/rooms/${roomId}/media/${name}`, uploaded_at: r.uploaded_at };
  });
  res.json(items);
});

// Simple Admin UI
app.get('/admin', adminAuth, (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Admin — ShadowRooms</title>
<style>
body{font-family:Segoe UI,system-ui,Roboto,Arial,sans-serif;background:#0b0b10;color:#e5e7eb;margin:0;padding:16px}
.row{display:flex;gap:8px;align-items:center}
.card{background:#13131a;border:1px solid #1f2937;border-radius:12px;padding:12px;margin-bottom:12px}
.btn{background:#ef4444;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
.input{background:#13131a;border:1px solid #1f2937;color:#e5e7eb;padding:8px;border-radius:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.thumb{background:#0f0f14;border:1px solid #1f2937;border-radius:10px;padding:8px}
img,video{max-width:100%;border-radius:8px}
</style></head>
<body>
  <div class="card"><div class="row"><h2 style="margin:0">Panel Admin</h2>
    <button class="btn" onclick="loadOverview()">Resumen</button>
    <button class="btn" onclick="loadRooms(0)">Salas Activas</button>
    <button class="btn" onclick="loadRooms(1)">Salas Archivadas</button>
    <input id="roomId" class="input" placeholder="roomId"/> <button class="btn" onclick="loadMedia()">Ver Media</button>
  </div></div>
  <div id="out" class="card"></div>
  <div id="media" class="grid"></div>
<script>
async function loadOverview(){
  const r = await fetch('./api/overview',{headers: adminHeaders()}); const j = await r.json();
  document.getElementById('out').innerText = JSON.stringify(j,null,2);
}
async function loadRooms(archived){
  const r = await fetch('./api/rooms?archived='+archived,{headers: adminHeaders()}); const j = await r.json();
  document.getElementById('out').innerText = JSON.stringify(j,null,2);
}
async function loadMedia(){
  const id = (document.getElementById('roomId')||{}).value; if(!id) return;
  const r = await fetch('./api/rooms/'+id+'/media',{headers: adminHeaders()}); const j = await r.json();
  const grid = document.getElementById('media'); grid.innerHTML='';
  j.forEach(it=>{
    const d = document.createElement('div'); d.className='thumb';
    if((it.mime||'').startsWith('image/')){ d.innerHTML = '<img src="'+it.url+'" alt="'+it.fileName+'"/>'; }
    else if((it.mime||'').startsWith('video/')){ d.innerHTML = '<video src="'+it.url+'" controls></video>'; }
    else if((it.mime||'').startsWith('audio/')){ d.innerHTML = '<audio src="'+it.url+'" controls></audio>'; }
    else { d.innerHTML = '<a href="'+it.url+'" target="_blank">'+it.fileName+'</a>'; }
    grid.appendChild(d);
  });
}
function adminHeaders(){
  const t = new URLSearchParams(window.location.search).get('token');
  const h = {}; if(t) h['x-admin-token']=t; return h;
}
</script>
</body></html>`);
});

// Socket.IO events
// Socket auth middleware
io.use((socket, next) => {
  const token = (socket.handshake.auth as any)?.token as string | undefined;
  if (!token) return next(new Error('NO_TOKEN'));
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as { roomId: string; name?: string };
    (socket.data as any).roomId = payload.roomId;
    (socket.data as any).name = payload.name;
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
    const sender = payload.sender || (socket as any)?.data?.name;
    io.to(payload.roomId).emit('message', { text: payload.text, sender, ts: Date.now() });
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


