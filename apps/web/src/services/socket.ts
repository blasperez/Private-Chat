import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types/chat';

export class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string = 'http://localhost:3001'): Socket {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('socket_connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.emit('socket_disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('socket_error', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string, password: string, username: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join_room', { roomId, password, username });
  }

  sendMessage(content: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('send_message', { content });
  }

  uploadFile(file: File): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      this.socket!.emit('upload_file', {
        file: Buffer.from(buffer),
        filename: file.name,
        mimetype: file.type,
      });
    };
    reader.readAsArrayBuffer(file);
  }

  setTyping(isTyping: boolean): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('typing', { isTyping });
  }

  // Event listeners
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: Function): void {
    if (callback) {
      const listeners = this.listeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Specific event handlers
  onMessage(callback: (message: ChatMessage) => void): void {
    this.on('message', callback);
  }

  onMessageHistory(callback: (messages: ChatMessage[]) => void): void {
    this.on('message_history', callback);
  }

  onUserJoined(callback: (data: { username: string; userCount: number }) => void): void {
    this.on('user_joined', callback);
  }

  onUserLeft(callback: (data: { username: string; userCount: number }) => void): void {
    this.on('user_left', callback);
  }

  onUserTyping(callback: (data: { username: string; isTyping: boolean }) => void): void {
    this.on('user_typing', callback);
  }

  onError(callback: (error: { message: string }) => void): void {
    this.on('error', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();