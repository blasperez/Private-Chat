import React from 'react';
import { Message } from '../types/chat';
import { Image, Video, Music, File, Download } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMediaContent = () => {
    if (!message.media_url) return null;

    switch (message.message_type) {
      case 'image':
        return (
          <div className="mt-2">
            <img
              src={message.media_url}
              alt={message.media_filename}
              className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media_url, '_blank')}
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="mt-2">
            <video
              controls
              className="max-w-xs max-h-64 rounded-lg"
              src={message.media_url}
            >
              Tu navegador no soporta video HTML5.
            </video>
          </div>
        );
      
      case 'audio':
        return (
          <div className="mt-2">
            <audio controls className="w-64">
              <source src={message.media_url} />
              Tu navegador no soporta audio HTML5.
            </audio>
          </div>
        );
      
      default:
        return (
          <div className="mt-2 flex items-center space-x-2 p-2 bg-black/20 rounded-lg">
            <File className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300 flex-1">{message.media_filename}</span>
            <a
              href={message.media_url}
              download={message.media_filename}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Download className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        );
    }
  };

  const getMediaIcon = () => {
    switch (message.message_type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
        {!isOwn && (
          <div className="text-xs text-slate-400 mb-1 px-1">
            {message.username}
          </div>
        )}
        
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwn
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
          }`}
        >
          {message.message_type !== 'text' && (
            <div className={`flex items-center space-x-1 text-xs mb-2 ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
              {getMediaIcon()}
              <span>Multimedia</span>
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          {renderMediaContent()}
          
          <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
};