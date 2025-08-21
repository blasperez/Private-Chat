import { Router } from 'express';
import multer from 'multer';
import { RoomService } from '../services/roomService';
import { FileService } from '../services/fileService';
import path from 'path';

const router = Router();
const roomService = RoomService.getInstance();
const fileService = FileService.getInstance();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Crear nueva sala
router.post('/create', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    if (name.length < 3 || name.length > 50) {
      return res.status(400).json({ error: 'Room name must be between 3 and 50 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const room = await roomService.createRoom(name, password);
    
    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt
      },
      joinUrl: `${req.protocol}://${req.get('host')}/room/${room.id}`
    });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verificar sala
router.get('/verify/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: 'Room is not active' });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        userCount: room.userCount,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt
      }
    });

  } catch (error) {
    console.error('Error verifying room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subir archivo
router.post('/upload/:roomId', upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const room = await roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const fileUpload = await fileService.saveFile(file, roomId);
    const fileUrl = fileService.getFileUrl(roomId, fileUpload.filename);

    res.json({
      success: true,
      file: {
        url: fileUrl,
        name: fileUpload.originalname,
        size: fileUpload.size,
        type: fileService.getFileType(fileUpload.mimetype)
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Servir archivos estáticos
router.get('/uploads/:roomId/:filename', (req, res) => {
  const { roomId, filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads', roomId, filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Obtener estadísticas de sala (solo para administración)
router.get('/stats/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = await roomService.getRoomMessages(roomId);

    res.json({
      success: true,
      stats: {
        roomId: room.id,
        roomName: room.name,
        userCount: room.userCount,
        messageCount: messages.length,
        createdAt: room.createdAt,
        isActive: room.isActive
      }
    });

  } catch (error) {
    console.error('Error getting room stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;