import { CreateRoomRequest, RoomResponse, VerifyRoomResponse } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiService {
  private static instance: ApiService;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createRoom(data: CreateRoomRequest): Promise<RoomResponse> {
    return this.request<RoomResponse>('/rooms/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyRoom(roomId: string): Promise<VerifyRoomResponse> {
    return this.request<VerifyRoomResponse>(`/rooms/verify/${roomId}`);
  }

  async uploadFile(roomId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/rooms/upload/${roomId}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  getFileUrl(roomId: string, filename: string): string {
    return `${API_BASE_URL.replace('/api', '')}/uploads/${roomId}/${filename}`;
  }
}

export const apiService = ApiService.getInstance();