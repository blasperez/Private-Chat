import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Users, ArrowLeft, AlertTriangle } from 'lucide-react';
import { ChatService } from '../services/chatService';

export const RoomEntry: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !password.trim() || !username.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await ChatService.joinRoom(roomId, password, username.trim());
      
      if (result.success && result.room && result.user) {
        // Guardar datos de usuario en localStorage
        localStorage.setItem('chatUser', JSON.stringify(result.user));
        localStorage.setItem('currentRoom', JSON.stringify(result.room));
        
        // Redirigir al chat
        navigate(`/chat/${roomId}`);
      } else {
        setError('Contraseña incorrecta o sala no encontrada.');
      }
    } catch (error) {
      setError('Error al conectar con la sala. Inténtalo de nuevo.');
      console.error('Error joining room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-blue-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unirse a la Sala</h1>
            <p className="text-slate-300 text-sm">Sala ID: {roomId}</p>
          </div>

          {/* Advertencia */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">Contenido Temporal</span>
            </div>
            <p className="text-amber-300 text-xs">
              El contenido se elimina al salir todos los usuarios
            </p>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Tu Nombre
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: Juan Pérez"
                maxLength={30}
                className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña de la Sala
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña proporcionada por el creador"
                  className="w-full px-4 py-3 pr-10 bg-black/20 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                  required
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || !password.trim() || !username.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    <span>Entrar al Chat</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Volver al Inicio</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};