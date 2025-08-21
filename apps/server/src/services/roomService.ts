import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatMessage, ChatUser, RoomLog } from '../types/chat';
import { supabase } from '../supabase';
import * as fs from 'fs';
import * as path from 'path';

export class RoomService {
  private static instance: RoomService;
  private activeRooms: Map<string, ChatRoom> = new Map();
  private roomUsers: Map<string, Set<string>> = new Map();
  private logsDir = path.join(__dirname, '../../logs');
  private filesDir = path.join(__dirname, '../../uploads');

  constructor() {
    this.ensureDirectories();
  }

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }
  }

  async createRoom(name: string, password: string): Promise<ChatRoom> {
    const roomId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const room: ChatRoom = {
      id: roomId,
      name,
      password,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      userCount: 0
    };

    // Guardar en base de datos
    const { error } = await supabase
      .from('chat_rooms')
      .insert({
        id: room.id,
        name: room.name,
        password_hash: await this.hashPassword(password),
        created_at: room.createdAt.toISOString(),
        expires_at: room.expiresAt.toISOString(),
        is_active: room.isActive
      });

    if (error) {
      throw new Error(`Error creating room: ${error.message}`);
    }

    this.activeRooms.set(roomId, room);
    this.roomUsers.set(roomId, new Set());

    return room;
  }

  async joinRoom(roomId: string, password: string, username: string, ipAddress?: string): Promise<ChatRoom> {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.isActive) {
      throw new Error('Room is not active');
    }

    // Verificar contraseña
    const { data: roomData, error } = await supabase
      .from('chat_rooms')
      .select('password_hash')
      .eq('id', roomId)
      .single();

    if (error || !roomData) {
      throw new Error('Room not found in database');
    }

    const isValidPassword = await this.verifyPassword(password, roomData.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Incrementar contador de usuarios
    room.userCount++;
    this.activeRooms.set(roomId, room);

    // Registrar usuario
    const userId = uuidv4();
    const user: ChatUser = {
      id: userId,
      username,
      roomId,
      joinedAt: new Date(),
      ipAddress,
      userAgent: ''
    };

    const { error: userError } = await supabase
      .from('chat_users')
      .insert({
        id: user.id,
        username: user.username,
        room_id: user.roomId,
        joined_at: user.joinedAt.toISOString(),
        ip_address: user.ipAddress,
        user_agent: user.userAgent
      });

    if (userError) {
      console.error('Error saving user:', userError);
    }

    return room;
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    room.userCount = Math.max(0, room.userCount - 1);
    this.activeRooms.set(roomId, room);

    // Eliminar usuario de la base de datos
    await supabase
      .from('chat_users')
      .delete()
      .eq('id', userId);

    // Si la sala está vacía, cerrarla
    if (room.userCount === 0) {
      await this.closeRoom(roomId);
    }
  }

  private async closeRoom(roomId: string): Promise<void> {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    room.isActive = false;
    this.activeRooms.set(roomId, room);

    // Actualizar en base de datos
    await supabase
      .from('chat_rooms')
      .update({ is_active: false })
      .eq('id', roomId);

    // Crear log de la sala
    await this.createRoomLog(roomId);

    // Limpiar memoria
    this.activeRooms.delete(roomId);
    this.roomUsers.delete(roomId);
  }

  private async createRoomLog(roomId: string): Promise<void> {
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    // Obtener estadísticas de la sala
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId);

    const { data: users } = await supabase
      .from('chat_users')
      .select('*')
      .eq('room_id', roomId);

    const logId = uuidv4();
    const logPath = path.join(this.logsDir, `${roomId}_${Date.now()}.json`);
    const filesPath = path.join(this.filesDir, roomId);

    const roomLog: RoomLog = {
      id: logId,
      roomId,
      roomName: room.name,
      createdAt: room.createdAt,
      endedAt: new Date(),
      totalMessages: messages?.length || 0,
      totalUsers: users?.length || 0,
      filesCount: 0, // Se calculará después
      logPath,
      filesPath
    };

    // Guardar log en archivo
    const logData = {
      room: roomLog,
      messages: messages || [],
      users: users || []
    };

    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));

    // Guardar en base de datos
    await supabase
      .from('room_logs')
      .insert({
        id: roomLog.id,
        room_id: roomLog.roomId,
        room_name: roomLog.roomName,
        created_at: roomLog.createdAt.toISOString(),
        ended_at: roomLog.endedAt.toISOString(),
        total_messages: roomLog.totalMessages,
        total_users: roomLog.totalUsers,
        files_count: roomLog.filesCount,
        log_path: roomLog.logPath,
        files_path: roomLog.filesPath
      });
  }

  async saveMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = uuidv4();
    const fullMessage: ChatMessage = { ...message, id };

    // Guardar en base de datos
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: fullMessage.id,
        room_id: fullMessage.roomId,
        user_id: fullMessage.userId,
        username: fullMessage.username,
        type: fullMessage.type,
        content: fullMessage.content,
        file_url: fullMessage.fileUrl,
        file_name: fullMessage.fileName,
        file_size: fullMessage.fileSize,
        timestamp: fullMessage.timestamp.toISOString(),
        ip_address: fullMessage.ipAddress
      });

    if (error) {
      console.error('Error saving message:', error);
    }

    return fullMessage;
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return this.activeRooms.get(roomId) || null;
  }

  async getRoomMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data?.map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      userId: msg.user_id,
      username: msg.username,
      type: msg.type,
      content: msg.content,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      timestamp: new Date(msg.timestamp),
      ipAddress: msg.ip_address
    })) || [];
  }

  private async hashPassword(password: string): Promise<string> {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(password).digest('hex');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const { createHash } = await import('crypto');
    const passwordHash = createHash('sha256').update(password).digest('hex');
    return passwordHash === hash;
  }
}