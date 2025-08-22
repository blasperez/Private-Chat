export interface Room {
  id: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  active_users: number;
  is_active: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  media_filename?: string;
  created_at: string;
}

export interface ChatUser {
  id: string;
  username: string;
  joined_at: string;
  is_active: boolean;
}

export interface MediaFile {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatLog {
  room_id: string;
  session_start: string;
  session_end: string;
  messages: Message[];
  users: ChatUser[];
  media_files: MediaFile[];
  total_messages: number;
  total_media: number;
}