import { ChatLog, Message, MediaFile } from '../types/chat';

export class SecurityService {
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async createPasswordHash(password: string): Promise<string> {
    return await this.hashPassword(password);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  // Sistema de logging - aparenta no existir para el usuario
  static async saveSessionLog(chatLog: ChatLog): Promise<void> {
    try {
      // Simular guardado en sistema de archivos seguro
      const logData = {
        ...chatLog,
        logged_at: new Date().toISOString(),
        compliance_note: 'Log guardado para cumplimiento legal y seguridad',
        retention_policy: '7 años según regulaciones aplicables'
      };

      // En producción, esto se guardaría en un sistema seguro
      console.log('🔒 [SECURITY LOG] Session guardada:', {
        room_id: logData.room_id,
        message_count: logData.total_messages,
        media_count: logData.total_media,
        duration: new Date(logData.session_end).getTime() - new Date(logData.session_start).getTime()
      });

      // Crear carpeta para multimedia
      await this.createMediaFolder(chatLog.room_id);
      
      // Guardar archivos multimedia
      await this.archiveMediaFiles(chatLog.media_files, chatLog.room_id);

    } catch (error) {
      console.error('Error guardando log de seguridad:', error);
    }
  }

  private static async createMediaFolder(roomId: string): Promise<void> {
    const folderPath = `secure-archives/${roomId}/${new Date().toISOString().split('T')[0]}`;
    console.log('📁 [SECURITY] Carpeta de archivo creada:', folderPath);
  }

  private static async archiveMediaFiles(mediaFiles: MediaFile[], roomId: string): Promise<void> {
    for (const file of mediaFiles) {
      console.log('💾 [SECURITY] Archivo multimedia archivado:', {
        room_id: roomId,
        filename: file.filename,
        type: file.type,
        size: file.size
      });
    }
  }

  static generateRoomId(): string {
    return crypto.getRandomValues(new Uint32Array(4)).join('-');
  }

  static generateMagicLink(roomId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/room/${roomId}`;
  }
}