import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Users, LogOut, AlertTriangle, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import { ChatMessage } from '../types/chat';
import toast from 'react-hot-toast';

interface ChatRoomProps {
  roomId: string;
  password: string;
  username: string;
  onLeave: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, password, username, onLeave }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Conectar al socket
    socketService.connect();

    // Unirse a la sala
    try {
      socketService.joinRoom(roomId, password, username);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Error al unirse a la sala');
      onLeave();
      return;
    }

    // Configurar event listeners
    socketService.onMessage((message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.onMessageHistory((messageHistory: ChatMessage[]) => {
      setMessages(messageHistory);
    });

    socketService.onUserJoined((data) => {
      setUserCount(data.userCount);
      toast.success(`${data.username} se unió a la sala`);
    });

    socketService.onUserLeft((data) => {
      setUserCount(data.userCount);
      toast(`${data.username} abandonó la sala`, { icon: '👋' });
    });

    socketService.onUserTyping((data) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    socketService.onError((error) => {
      toast.error(error.message);
      if (error.message.includes('password') || error.message.includes('not found')) {
        onLeave();
      }
    });

    socketService.on('socket_connected', () => {
      setIsConnected(true);
    });

    socketService.on('socket_disconnected', () => {
      setIsConnected(false);
      toast.error('Conexión perdida. Intentando reconectar...');
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, password, username, onLeave]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    try {
      socketService.sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socketService.setTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.setTyping(false);
    }, 1000);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!isConnected) return;

    setIsUploading(true);
    
    for (const file of acceptedFiles) {
      try {
        // Subir archivo al servidor
        await apiService.uploadFile(roomId, file);
        
        // Enviar mensaje con el archivo
        socketService.uploadFile(file);
        
        toast.success(`${file.name} subido exitosamente`);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Error al subir ${file.name}`);
      }
    }
    
    setIsUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.username === username;
    const isSystemMessage = message.username === 'Sistema';

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isSystemMessage
              ? 'bg-gray-100 text-gray-600 text-center mx-auto'
              : isOwnMessage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          {!isSystemMessage && !isOwnMessage && (
            <div className="text-xs font-medium mb-1 text-gray-600">
              {message.username}
            </div>
          )}
          
          {message.type === 'text' ? (
            <div className="break-words">{message.content}</div>
          ) : (
            <div className="space-y-2">
              <div className="break-words">{message.content}</div>
              {message.fileUrl && (
                <div className="mt-2">
                  {message.type === 'image' && (
                    <img
                      src={message.fileUrl}
                      alt={message.fileName || 'Imagen'}
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(message.fileUrl, '_blank')}
                    />
                  )}
                  {message.type === 'video' && (
                    <video
                      src={message.fileUrl}
                      controls
                      className="max-w-full rounded-lg"
                    />
                  )}
                  {message.type === 'audio' && (
                    <audio
                      src={message.fileUrl}
                      controls
                      className="w-full"
                    />
                  )}
                  {message.type === 'file' && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                      <Download className="w-4 h-4" />
                      <a
                        href={message.fileUrl}
                        download={message.fileName}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {message.fileName}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className={`text-xs mt-1 ${
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Sala de Chat</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{userCount} usuario{userCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onLeave}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> Esta sala se eliminará automáticamente cuando todos los usuarios se desconecten. 
            Todo el contenido se guarda temporalmente por seguridad.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(renderMessage)}
        
        {typingUsers.length > 0 && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
              {typingUsers.join(', ')} está{typingUsers.length === 1 ? '' : 'n'} escribiendo...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`mx-4 mb-2 p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Paperclip className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? 'Suelta los archivos aquí...'
            : 'Arrastra archivos aquí o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Imágenes, videos, audio y documentos (máx. 50MB)
        </p>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected || isUploading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};