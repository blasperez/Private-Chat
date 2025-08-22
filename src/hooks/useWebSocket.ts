import { useEffect, useRef, useState } from 'react';
import { Message } from '../types/chat';

interface UseWebSocketProps {
  roomId?: string;
  userId?: string;
  onMessage?: (message: Message) => void;
  onUserJoined?: (username: string) => void;
  onUserLeft?: (username: string) => void;
}

export const useWebSocket = ({ roomId, userId, onMessage, onUserJoined, onUserLeft }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    // Simular conexión WebSocket
    setConnectionStatus('connecting');
    
    const timer = setTimeout(() => {
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('🔌 WebSocket conectado (simulado):', { roomId, userId });
    }, 1000);

    return () => {
      clearTimeout(timer);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [roomId, userId]);

  const sendMessage = (message: Omit<Message, 'id' | 'created_at'>) => {
    if (!isConnected) return;

    const fullMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    // Simular envío y recepción inmediata
    setTimeout(() => {
      onMessage?.(fullMessage);
    }, 100);

    console.log('📤 Mensaje enviado:', fullMessage);
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    disconnect
  };
};