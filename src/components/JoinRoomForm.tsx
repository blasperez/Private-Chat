import React, { useState } from 'react';
import { LogIn, Users, AlertCircle } from 'lucide-react';

export const JoinRoomForm: React.FC = () => {
  const [magicLink, setMagicLink] = useState('');
  const [extractedRoomId, setExtractedRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const extractRoomId = (link: string) => {
    try {
      const url = new URL(link);
      const pathParts = url.pathname.split('/');
      const roomIndex = pathParts.indexOf('room');
      if (roomIndex !== -1 && pathParts[roomIndex + 1]) {
        return pathParts[roomIndex + 1];
      }
    } catch (e) {
      // URL inválida
    }
    return null;
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    setMagicLink(link);
    setError('');
    
    if (link.trim()) {
      const roomId = extractRoomId(link);
      if (roomId) {
        setExtractedRoomId(roomId);
      } else {
        setExtractedRoomId('');
        if (link.includes('http')) {
          setError('El enlace no parece ser válido. Verifica que sea correcto.');
        }
      }
    } else {
      setExtractedRoomId('');
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedRoomId) {
      setError('Por favor ingresa un enlace válido de sala.');
      return;
    }

    setIsLoading(true);
    // Redirigir a la sala para pedir contraseña
    window.location.href = `/room/${extractedRoomId}`;
  };

  return (
    <form onSubmit={handleJoinRoom} className="space-y-4">
      <div>
        <label htmlFor="magicLink" className="block text-sm font-medium text-slate-300 mb-2">
          Enlace de Invitación
        </label>
        <input
          id="magicLink"
          type="text"
          value={magicLink}
          onChange={handleLinkChange}
          placeholder="https://securechat.app/room/abc123"
          className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
          required
        />
        {error && (
          <div className="flex items-center space-x-2 mt-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">{error}</span>
          </div>
        )}
        {extractedRoomId && (
          <div className="flex items-center space-x-2 mt-2 text-green-400">
            <Users className="h-4 w-4" />
            <span className="text-xs">Sala detectada: {extractedRoomId}</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !extractedRoomId}
        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Conectando...</span>
          </>
        ) : (
          <>
            <LogIn className="h-5 w-5" />
            <span>Unirse a la Sala</span>
          </>
        )}
      </button>

      <div className="text-xs text-slate-400 text-center">
        🔗 Pega el enlace completo que te compartieron
      </div>
    </form>
  );
};