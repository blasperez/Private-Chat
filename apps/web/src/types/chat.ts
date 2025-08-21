export interface ChatRoom {
  id: string;
  name: string;
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

export interface FileUpload {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  roomId: string;
}

export interface CreateRoomRequest {
  name: string;
  password: string;
}

export interface JoinRoomRequest {
  roomId: string;
  password: string;
  username: string;
}

export interface RoomResponse {
  success: boolean;
  room: {
    id: string;
    name: string;
    createdAt: Date;
    expiresAt: Date;
  };
  joinUrl: string;
}

export interface VerifyRoomResponse {
  success: boolean;
  room: {
    id: string;
    name: string;
    userCount: number;
    createdAt: Date;
    expiresAt: Date;
  };
}