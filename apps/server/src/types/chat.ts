export interface ChatRoom {
  id: string;
  name: string;
  password: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  userCount: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
  ipAddress?: string;
}

export interface ChatUser {
  id: string;
  username: string;
  roomId: string;
  joinedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoomLog {
  id: string;
  roomId: string;
  roomName: string;
  createdAt: Date;
  endedAt: Date;
  totalMessages: number;
  totalUsers: number;
  filesCount: number;
  logPath: string;
  filesPath: string;
}

export interface FileUpload {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  roomId: string;
}