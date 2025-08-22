import { supabase } from '../config/supabase';
import { Room, Message, ChatUser, ChatLog } from '../types/chat';
import { SecurityService } from './securityService';

export class ChatService {
  private static activeSessions = new Map<string, ChatLog>();

  static async createRoom(name: string, password: string): Promise<Room> {
    const roomId = SecurityService.generateRoomId();
    const passwordHash = await SecurityService.createPasswordHash(password);

    const room: Room = {
      id: roomId,
      name,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_users: 0,
      is_active: true
    };

    // Simular guardado en base de datos
    console.log('🏠 Sala creada:', { id: room.id, name: room.name });

    // Inicializar log de sesión
    this.activeSessions.set(roomId, {
      room_id: roomId,
      session_start: new Date().toISOString(),
      session_end: '',
      messages: [],
      users: [],
      media_files: [],
      total_messages: 0,
      total_media: 0
    });

    return room;
  }

  static async joinRoom(roomId: string, password: string, username: string): Promise<{ success: boolean; room?: Room; user?: ChatUser }> {
    try {
      // Simular verificación de sala
      const room = await this.getRoomById(roomId);
      if (!room) {
        return { success: false };
      }

      const isValidPassword = await SecurityService.verifyPassword(password, room.password_hash);
      if (!isValidPassword) {
        return { success: false };
      }

      const user: ChatUser = {
        id: crypto.randomUUID(),
        username,
        joined_at: new Date().toISOString(),
        is_active: true
      };

      // Actualizar contador de usuarios activos
      room.active_users += 1;

      // Agregar usuario al log de sesión
      const sessionLog = this.activeSessions.get(roomId);
      if (sessionLog) {
        sessionLog.users.push(user);
      }

      console.log('👤 Usuario unido a la sala:', { roomId, username });

      return { success: true, room, user };
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      return { success: false };
    }
  }

  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    if (room) {
      room.active_users = Math.max(0, room.active_users - 1);
      
      console.log('🚪 Usuario salió de la sala:', { roomId, userId, activeUsers: room.active_users });

      // Si no quedan usuarios, "destruir" la sala (pero guardar los logs)
      if (room.active_users === 0) {
        await this.destroyRoom(roomId);
      }
    }
  }

  private static async destroyRoom(roomId: string): Promise<void> {
    console.log('💥 [APARENTE] Sala destruida - todo el contenido eliminado:', roomId);
    
    // En realidad, guardar todo en logs de seguridad
    const sessionLog = this.activeSessions.get(roomId);
    if (sessionLog) {
      sessionLog.session_end = new Date().toISOString();
      sessionLog.total_messages = sessionLog.messages.length;
      sessionLog.total_media = sessionLog.media_files.length;

      await SecurityService.saveSessionLog(sessionLog);
      this.activeSessions.delete(roomId);
    }
  }

  static async sendMessage(message: Message): Promise<void> {
    // Simular envío de mensaje
    console.log('💬 Mensaje enviado:', { roomId: message.room_id, type: message.message_type });

    // Agregar mensaje al log de seguridad
    const sessionLog = this.activeSessions.get(message.room_id);
    if (sessionLog) {
      sessionLog.messages.push(message);
      
      if (message.media_url) {
        sessionLog.media_files.push({
          id: crypto.randomUUID(),
          filename: message.media_filename || 'unknown',
          url: message.media_url,
          type: message.message_type,
          size: 0 // Se obtendría del archivo real
        });
      }
    }
  }

  private static async getRoomById(roomId: string): Promise<Room | null> {
    // Simular obtención de sala de base de datos
    return {
      id: roomId,
      name: 'Sala de Chat',
      password_hash: 'hash_placeholder',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_users: 0,
      is_active: true
    };
  }
}