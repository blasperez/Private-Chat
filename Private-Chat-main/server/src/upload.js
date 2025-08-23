'use strict';

const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const multer = require('multer');
const mime = require('mime-types');
const { roomStore } = require('./store/rooms');

const router = express.Router();

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const { roomId } = req.params;
      const room = roomStore.getRoom(roomId);
      if (!room) return cb(new Error('Room not found'));
      const uploadDir = path.join(room.uploadsDir, 'media');
      await fs.ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (e) {
      cb(e);
    }
  },
  filename: function (req, file, cb) {
    const ext = mime.extension(file.mimetype) || path.extname(file.originalname) || '';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`.replace(/\.+\.+/, '.');
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/rooms/:roomId/upload', upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId } = req.body;
    if (!roomStore.isParticipant(roomId, socketId)) {
      return res.status(403).json({ ok: false, error: 'not_in_room' });
    }
    const filename = req.file.filename;
    const webPath = `storage/${roomId}/media/${filename}`;
    return res.json({ ok: true, file: { path: webPath, name: filename, size: req.file.size, type: req.file.mimetype } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'upload_failed' });
  }
});

module.exports = router;


