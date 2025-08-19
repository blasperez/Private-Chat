'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { createServerLogger } = require('./utils/logger');
const { createSupabaseClient } = require('./utils/supabase');
const { roomStore } = require('./store/rooms');
const uploadRoutes = require('./upload');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const STORAGE_DIR = path.resolve(__dirname, '../storage');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Rate limit to protect endpoints
const limiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Static files (built client)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// Serve storage content under authenticated user context; basic static for demo
if (fs.existsSync(STORAGE_DIR)) {
  app.use('/storage', express.static(STORAGE_DIR));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Upload endpoints
app.use('/api', uploadRoutes);

// Fallback to index.html for SPA
app.get('*', (req, res, next) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 5 * 1024 * 1024,
});

const supabase = createSupabaseClient();
const log = createServerLogger();

function broadcastParticipantCount(roomId) {
  const count = roomStore.getParticipantCount(roomId);
  io.to(roomId).emit('room:participants', { roomId, count });
}

async function persistAndCleanupRoom(roomId) {
  try {
    const room = roomStore.getRoom(roomId);
    if (!room) return;

    await roomStore.persistRoomToDisk(roomId);
    await roomStore.persistRoomToSupabase(roomId, supabase);

    roomStore.deleteRoom(roomId);
    log.info({ roomId }, 'Room persisted and cleaned up');
  } catch (error) {
    log.error({ err: error, roomId }, 'Failed to persist/cleanup room');
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', async ({ passwordHash }, callback) => {
    try {
      const room = roomStore.createRoom(passwordHash, socket.handshake.address);
      callback({ ok: true, roomId: room.id, magicLink: `${process.env.PUBLIC_URL || ''}/r/${room.id}` });
    } catch (error) {
      callback({ ok: false, error: 'failed_to_create_room' });
    }
  });

  socket.on('room:join', async ({ roomId, passwordHash }, callback) => {
    try {
      const ok = roomStore.verifyRoomAccess(roomId, passwordHash);
      if (!ok) return callback({ ok: false, error: 'invalid_password_or_room' });
      await socket.join(roomId);
      roomStore.addParticipant(roomId, socket.id, socket.handshake.address);
      broadcastParticipantCount(roomId);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, error: 'failed_to_join_room' });
    }
  });

  socket.on('message:text', ({ roomId, content, tempId }) => {
    if (!roomStore.isParticipant(roomId, socket.id)) return;
    const message = roomStore.addMessage(roomId, {
      kind: 'text',
      content,
      senderId: socket.id,
    });
    io.to(roomId).emit('message:new', { tempId, message });
  });

  socket.on('message:media', ({ roomId, fileInfo, tempId }) => {
    if (!roomStore.isParticipant(roomId, socket.id)) return;
    const message = roomStore.addMessage(roomId, {
      kind: 'media',
      content: fileInfo,
      senderId: socket.id,
    });
    io.to(roomId).emit('message:new', { tempId, message });
  });

  socket.on('room:leave', async ({ roomId }) => {
    try {
      if (roomStore.isParticipant(roomId, socket.id)) {
        await socket.leave(roomId);
        roomStore.removeParticipant(roomId, socket.id);
        broadcastParticipantCount(roomId);
        if (roomStore.getParticipantCount(roomId) === 0) {
          await persistAndCleanupRoom(roomId);
        }
      }
    } catch {}
  });

  socket.on('disconnect', async () => {
    const rooms = roomStore.getRoomsByParticipant(socket.id);
    for (const roomId of rooms) {
      roomStore.removeParticipant(roomId, socket.id);
      broadcastParticipantCount(roomId);
      if (roomStore.getParticipantCount(roomId) === 0) {
        await persistAndCleanupRoom(roomId);
      }
    }
  });
});

server.listen(PORT, async () => {
  await fs.ensureDir(path.resolve(__dirname, '../storage'));
  console.log(`Server listening on :${PORT}`);
});


