import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileUpload } from '../types/chat';

export class FileService {
  private static instance: FileService;
  private uploadsDir = path.join(__dirname, '../../uploads');
  private maxFileSize = 50 * 1024 * 1024; // 50MB
  private allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    file: ['application/pdf', 'text/plain', 'application/zip']
  };

  constructor() {
    this.ensureUploadsDirectory();
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, roomId: string): Promise<FileUpload> {
    // Validar tamaño
    if (file.size > this.maxFileSize) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    // Validar tipo
    const isValidType = this.isValidFileType(file.mimetype);
    if (!isValidType) {
      throw new Error('File type not allowed.');
    }

    // Crear directorio para la sala si no existe
    const roomDir = path.join(this.uploadsDir, roomId);
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(roomDir, uniqueFilename);

    // Mover archivo
    fs.copyFileSync(file.path, filePath);
    fs.unlinkSync(file.path); // Eliminar archivo temporal

    const fileUpload: FileUpload = {
      originalname: file.originalname,
      filename: uniqueFilename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
      roomId
    };

    return fileUpload;
  }

  private isValidFileType(mimetype: string): boolean {
    const allTypes = [
      ...this.allowedTypes.image,
      ...this.allowedTypes.video,
      ...this.allowedTypes.audio,
      ...this.allowedTypes.file
    ];
    return allTypes.includes(mimetype);
  }

  getFileType(mimetype: string): 'image' | 'video' | 'audio' | 'file' {
    if (this.allowedTypes.image.includes(mimetype)) return 'image';
    if (this.allowedTypes.video.includes(mimetype)) return 'video';
    if (this.allowedTypes.audio.includes(mimetype)) return 'audio';
    return 'file';
  }

  getFileUrl(roomId: string, filename: string): string {
    return `/uploads/${roomId}/${filename}`;
  }

  async deleteRoomFiles(roomId: string): Promise<void> {
    const roomDir = path.join(this.uploadsDir, roomId);
    if (fs.existsSync(roomDir)) {
      fs.rmSync(roomDir, { recursive: true, force: true });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimetype: string): string {
    if (this.allowedTypes.image.includes(mimetype)) return '🖼️';
    if (this.allowedTypes.video.includes(mimetype)) return '🎥';
    if (this.allowedTypes.audio.includes(mimetype)) return '🎵';
    return '📎';
  }
}