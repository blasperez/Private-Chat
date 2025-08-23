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

    // Guardar en Supabase
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert([room])
      .select()
      .single();

    if (error) {
      console.error('Error al crear sala en Supabase:', error);
      throw new Error('No se pudo crear la sala');
    }

    console.log('🏠 Sala creada en Supabase:', { id: data.id, name: data.name });

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

    return data;
  }

  static async joinRoom(roomId: string, password: string, username: string): Promise<{ success: boolean; room?: Room; user?: ChatUser }> {
    try {
      // Obtener sala de Supabase
      const room = await this.getRoomById(roomId);
      if (!room) {
        console.log('Sala no encontrada:', roomId);
        return { success: false };
      }

      const isValidPassword = await SecurityService.verifyPassword(password, room.password_hash);
      if (!isValidPassword) {
        console.log('Contraseña incorrecta para sala:', roomId);
        return { success: false };
      }

      const user: ChatUser = {
        id: crypto.randomUUID(),
        username,
        joined_at: new Date().toISOString(),
        is_active: true
      };

      // Guardar usuario en Supabase
      const { error: userError } = await supabase
        .from('chat_users')
        .insert([{
          id: user.id,
          room_id: roomId,
          username: user.username,
          joined_at: user.joined_at,
          is_active: true
        }]);

      if (userError) {
        console.error('Error al guardar usuario:', userError);
      }

      // Actualizar contador de usuarios activos
      const { error: updateError } = await supabase
        .from('chat_rooms')
        .update({ 
          active_users: room.active_users + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);

      if (updateError) {
        console.error('Error al actualizar sala:', updateError);
      }

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
    // Guardar mensaje en Supabase
    const { error } = await supabase
      .from('chat_messages')
      .insert([message]);

    if (error) {
      console.error('Error al guardar mensaje:', error);
      throw new Error('No se pudo enviar el mensaje');
    }

    console.log('💬 Mensaje guardado en Supabase:', { roomId: message.room_id, type: message.message_type });

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

    // Guardar en security_logs
    await supabase
      .from('security_logs')
      .insert([{
        event_type: 'message_sent',
        room_id: message.room_id,
        user_id: message.user_id,
        metadata: {
          message_type: message.message_type,
          has_media: !!message.media_url
        }
      }]);
  }

  private static async getRoomById(roomId: string): Promise<Room | null> {
    // Obtener sala de Supabase
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error al obtener sala:', error);
      return null;
    }

    return data;
  }
}