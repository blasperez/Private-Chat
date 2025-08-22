import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Paperclip, Users, LogOut, AlertTriangle, Shield } from 'lucide-react';
import { ChatService } from '../services/chatService';
import { useWebSocket } from '../hooks/useWebSocket';
import { Message, ChatUser, Room } from '../types/chat';
import { MessageBubble } from './MessageBubble';
import { MediaUpload } from './MediaUpload';
import { UserList } from './UserList';

export const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [isRoomActive, setIsRoomActive] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState<ChatUser[]>([]);

  // WebSocket connection
  const { isConnected, sendMessage, disconnect } = useWebSocket({
    roomId,
    userId: currentUser?.id,
    onMessage: (message) => {
      setMessages(prev => [...prev, message]);
      ChatService.sendMessage(message);
    },
    onUserJoined: (username) => {
      console.log(`${username} se unió a la sala`);
    },
    onUserLeft: (username) => {
      console.log(`${username} salió de la sala`);
    }
  });

  useEffect(() => {
    // Cargar datos del usuario y sala desde localStorage
    const userData = localStorage.getItem('chatUser');
    const roomData = localStorage.getItem('currentRoom');
    
    if (userData && roomData) {
      setCurrentUser(JSON.parse(userData));
      setCurrentRoom(JSON.parse(roomData));
    } else {
      // Si no hay datos, redirigir a la entrada de la sala
      navigate(`/room/${roomId}`);
    }
  }, [roomId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser || !roomId) return;

    const message: Omit<Message, 'id' | 'created_at'> = {
      room_id: roomId,
      user_id: currentUser.id,
      username: currentUser.username,
      content: messageText.trim(),
      message_type: 'text'
    };

    sendMessage(message);
    setMessageText('');
  };

  const handleMediaUpload = (mediaUrl: string, mediaType: string, filename: string) => {
    if (!currentUser || !roomId) return;

    const message: Omit<Message, 'id' | 'created_at'> = {
      room_id: roomId,
      user_id: currentUser.id,
      username: currentUser.username,
      content: `Compartió un archivo: ${filename}`,
      message_type: mediaType as any,
      media_url: mediaUrl,
      media_filename: filename
    };

    sendMessage(message);
    setShowMediaUpload(false);
  };

  const handleLeaveRoom = async () => {
    if (currentUser && roomId) {
      await ChatService.leaveRoom(roomId, currentUser.id);
      localStorage.removeItem('chatUser');
      localStorage.removeItem('currentRoom');
      disconnect();
      navigate('/');
    }
  };

  if (!currentUser || !currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>Cargando sala de chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 rounded-lg p-2">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{currentRoom.name}</h1>
              <div className="flex items-center space-x-4 text-sm">
                <span className={`flex items-center space-x-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
                </span>
                <span className="text-slate-300">
                  {connectedUsers.length} usuarios conectados
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
        <div className="flex items-center space-x-2 text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            ⚠️ Contenido temporal - Se eliminará automáticamente cuando todos salgan
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Sala de Chat Segura</p>
                <p className="text-sm">Este es el inicio de tu conversación privada.</p>
                <p className="text-xs mt-2">Todo el contenido se eliminará al finalizar la sesión.</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isOwn={message.user_id === currentUser.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowMediaUpload(true)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                disabled={!isConnected}
              />
              
              <button
                type="submit"
                disabled={!messageText.trim() || !isConnected}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        {/* User List Sidebar */}
        {showUserList && (
          <div className="w-64 bg-black/20 backdrop-blur-sm border-l border-white/10">
            <UserList users={connectedUsers} currentUserId={currentUser.id} />
          </div>
        )}
      </div>

      {/* Media Upload Modal */}
      {showMediaUpload && (
        <MediaUpload 
          onUpload={handleMediaUpload}
          onClose={() => setShowMediaUpload(false)}
        />
      )}
    </div>
  );
};