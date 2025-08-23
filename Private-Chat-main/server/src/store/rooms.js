'use strict';

const path = require('path');
const fs = require('fs-extra');
const dayjs = require('dayjs');
const { nanoid } = require('nanoid');
const { encryptJson } = require('../utils/crypto');
const { insertRoomLogPg } = require('../utils/pg');

const STORAGE_DIR = path.resolve(__dirname, '../../storage');

class RoomStore {
  constructor() {
    this.rooms = new Map();
    this.socketIdToRooms = new Map();
  }

  createRoom(passwordHash, creatorIp) {
    const id = nanoid(12);
    const createdAt = new Date().toISOString();
    const room = {
      id,
      passwordHash,
      createdAt,
      creatorIp,
      participants: new Map(),
      participantsHistory: [],
      messages: [],
      uploadsDir: path.join(STORAGE_DIR, id),
    };
    this.rooms.set(id, room);
    return room;
  }

  verifyRoomAccess(roomId, passwordHash) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.passwordHash === passwordHash;
  }

  addParticipant(roomId, socketId, ip, userAgent) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const joinedAt = new Date().toISOString();
    room.participants.set(socketId, { ip, userAgent, joinedAt });
    room.participantsHistory.push({ socketId, ip, userAgent, joinedAt, leftAt: null });
    const list = this.socketIdToRooms.get(socketId) || new Set();
    list.add(roomId);
    this.socketIdToRooms.set(socketId, list);
  }

  removeParticipant(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants.delete(socketId);
    // mark leave time in history
    for (let i = room.participantsHistory.length - 1; i >= 0; i--) {
      const rec = room.participantsHistory[i];
      if (rec.socketId === socketId && !rec.leftAt) {
        rec.leftAt = new Date().toISOString();
        break;
      }
    }
    const list = this.socketIdToRooms.get(socketId);
    if (list) {
      list.delete(roomId);
      if (list.size === 0) this.socketIdToRooms.delete(socketId);
    }
  }

  isParticipant(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.participants.has(socketId);
  }

  getParticipantCount(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    return room.participants.size;
  }

  addMessage(roomId, { kind, content, senderId }) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const message = {
      id: nanoid(10),
      kind,
      content,
      senderId,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(message);
    return message;
  }

  getRoomsByParticipant(socketId) {
    const list = this.socketIdToRooms.get(socketId);
    if (!list) return [];
    return Array.from(list.values());
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  async persistRoomToDisk(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const dir = path.join(STORAGE_DIR, roomId);
    await fs.ensureDir(dir);
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const logPath = path.join(dir, `log_${timestamp}.enc.json`);
    const metaPath = path.join(dir, `meta_${timestamp}.json`);
    const enc = encryptJson({ messages: room.messages });
    await fs.writeJSON(logPath, enc, { spaces: 0 });
    const meta = {
      roomId,
      createdAt: room.createdAt,
      closedAt: new Date().toISOString(),
      participants: room.participantsHistory,
      uploadsDir: `storage/${roomId}/media`,
      encryption: { algorithm: enc.algorithm },
    };
    await fs.writeJSON(metaPath, meta, { spaces: 2 });
  }

  async persistRoomToSupabase(roomId, supabase) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    try {
      const enc = encryptJson({ messages: room.messages });
      const participants = room.participantsHistory;
      const createdAtIso = room.createdAt;
      const closedAtIso = new Date().toISOString();
      // Try Postgres direct first if DATABASE_URL present
      const wrotePg = await insertRoomLogPg({
        roomId,
        createdAtIso,
        closedAtIso,
        messagesEncrypted: enc,
        participants,
      });
      if (!wrotePg) {
        const { error } = await supabase.from('rooms').insert({
          room_id: roomId,
          created_at_iso: createdAtIso,
          closed_at_iso: closedAtIso,
          messages_encrypted: enc,
          participants,
        });
        if (error) throw error;
      }
    } catch (e) {
      // Swallow to avoid blocking cleanup
    }
  }
}

const roomStore = new RoomStore();

module.exports = { roomStore };


