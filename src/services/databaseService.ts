import { supabase, supabaseAdmin } from '../config/supabase';
import { Room, Message, ChatUser, ChatLog } from '../types/chat';

export class DatabaseService {
  // Crear sala en base de datos
  static async createRoom(name: string, passwordHash: string, creatorIP?: string, userAgent?: string): Promise<Room> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name,
        password_hash: passwordHash,
        creator_ip: creatorIP,
        creator_user_agent: userAgent
      })
      .select()
      .single();

    if (error) throw error;

    // Log de seguridad
    await this.logSecurityEvent('room_created', {
      room_id: data.id,
      room_name: name,
      creator_ip: creatorIP
    });

    return {
      id: data.id,
      name: data.name,
      password_hash: data.password_hash,
      created_at: data.created_at,
      updated_at: data.updated_at,
      active_users: data.active_users,
      is_active: data.is_active
    };
  }

  // Obtener sala por magic link
  static async getRoomByMagicLink(magicLinkId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('magic_link_id', magicLinkId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      password_hash: data.password_hash,
      created_at: data.created_at,
      updated_at: data.updated_at,
      active_users: data.active_users,
      is_active: data.is_active
    };
  }

  // Agregar usuario a sala
  static async addUserToRoom(roomId: string, username: string, sessionId: string, ipAddress?: string, userAgent?: string): Promise<ChatUser> {
    const { data, error } = await supabase
      .from('chat_users')
      .insert({
        room_id: roomId,
        username,
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar contador de usuarios activos
    await supabase
      .from('chat_rooms')
      .update({ 
        active_users: supabase.raw('active_users + 1'),
        last_activity: new Date().toISOString()
      })
      .eq('id', roomId);

    // Log de seguridad
    await this.logSecurityEvent('user_joined', {
      room_id: roomId,
      user_id: data.id,
      username,
      ip_address: ipAddress
    });

    return {
      id: data.id,
      username: data.username,
      joined_at: data.joined_at,
      is_active: data.is_active
    };
  }

  // Remover usuario de sala
  static async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    await supabase
      .from('chat_users')
      .update({ is_active: false, last_seen: new Date().toISOString() })
      .eq('id', userId);

    // Actualizar contador de usuarios activos
    const { data: activeUsers } = await supabase
      .from('chat_users')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_active', true);

    const activeCount = activeUsers?.length || 0;

    await supabase
      .from('chat_rooms')
      .update({ 
        active_users: activeCount,
        last_activity: new Date().toISOString()
      })
      .eq('id', roomId);

    // Si no quedan usuarios, "destruir" la sala
    if (activeCount === 0) {
      await this.archiveRoom(roomId);
    }

    // Log de seguridad
    await this.logSecurityEvent('user_left', {
      room_id: roomId,
      user_id: userId,
      remaining_users: activeCount
    });
  }

  // Guardar mensaje
  static async saveMessage(message: Message, ipAddress?: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: message.id,
        room_id: message.room_id,
        user_id: message.user_id,
        username: message.username,
        content: message.content,
        message_type: message.message_type,
        media_url: message.media_url,
        media_filename: message.media_filename,
        created_at: message.created_at,
        ip_address: ipAddress
      });

    if (error) throw error;

    // Actualizar contador de mensajes en la sala
    await supabase
      .from('chat_rooms')
      .update({ 
        total_messages: supabase.raw('total_messages + 1'),
        last_activity: new Date().toISOString()
      })
      .eq('id', message.room_id);

    // Log de seguridad para multimedia
    if (message.media_url) {
      await this.logSecurityEvent('media_shared', {
        room_id: message.room_id,
        user_id: message.user_id,
        message_id: message.id,
        media_type: message.message_type,
        filename: message.media_filename
      });
    }
  }

  // Archivar sala (aparenta destrucción pero guarda todo)
  static async archiveRoom(roomId: string): Promise<void> {
    // Obtener datos de la sala
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) return;

    // Obtener todos los mensajes
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at');

    // Obtener todos los usuarios
    const { data: users } = await supabase
      .from('chat_users')
      .select('*')
      .eq('room_id', roomId);

    // Obtener archivos multimedia
    const { data: mediaFiles } = await supabase
      .from('media_files')
      .select('*')
      .eq('room_id', roomId);

    // Crear log de sesión usando service role
    await supabaseAdmin
      .from('chat_sessions')
      .insert({
        room_id: roomId,
        session_start: room.created_at,
        session_end: new Date().toISOString(),
        total_messages: messages?.length || 0,
        total_media_files: mediaFiles?.length || 0,
        total_users: users?.length || 0,
        archived_at: new Date().toISOString(),
        compliance_notes: 'Sesión archivada automáticamente para cumplimiento legal'
      });

    // Marcar sala como inactiva (no eliminar)
    await supabase
      .from('chat_rooms')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    // Log de seguridad
    await this.logSecurityEvent('room_archived', {
      room_id: roomId,
      total_messages: messages?.length || 0,
      total_users: users?.length || 0,
      total_media: mediaFiles?.length || 0
    });

    console.log('🔒 [SECURITY] Sala archivada para cumplimiento legal:', {
      room_id: roomId,
      messages: messages?.length || 0,
      users: users?.length || 0,
      media: mediaFiles?.length || 0
    });
  }

  // Log de eventos de seguridad
  static async logSecurityEvent(eventType: string, eventData: any, severity: string = 'info'): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          event_type: eventType,
          event_data: eventData,
          severity,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Obtener mensajes de una sala
  static async getRoomMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data.map(msg => ({
      id: msg.id,
      room_id: msg.room_id,
      user_id: msg.user_id,
      username: msg.username,
      content: msg.content,
      message_type: msg.message_type,
      media_url: msg.media_url,
      media_filename: msg.media_filename,
      created_at: msg.created_at
    }));
  }

  // Obtener usuarios activos de una sala
  static async getRoomUsers(roomId: string): Promise<ChatUser[]> {
    const { data, error } = await supabase
      .from('chat_users')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('joined_at');

    if (error) throw error;

    return data.map(user => ({
      id: user.id,
      username: user.username,
      joined_at: user.joined_at,
      is_active: user.is_active
    }));
  }
}