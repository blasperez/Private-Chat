import React, { useState } from 'react';
import { Plus, Copy, Check, Lock, Users } from 'lucide-react';
import { ChatService } from '../services/chatService';
import { SecurityService } from '../services/securityService';

export const CreateRoomForm: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      const room = await ChatService.createRoom(roomName.trim(), password);
      const magicLink = SecurityService.generateMagicLink(room.id);
      
      setCreatedRoom({ id: room.id, link: magicLink });
      
      // Reset form
      setRoomName('');
      setPassword('');
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!createdRoom) return;
    
    try {
      await navigator.clipboard.writeText(createdRoom.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleJoinCreatedRoom = () => {
    if (createdRoom) {
      window.location.href = `/chat/${createdRoom.id}`;
    }
  };

  if (createdRoom) {
    return (
      <div className="text-center">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <Users className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-400 mb-2">¡Sala Creada!</h3>
          <p className="text-green-300 text-sm mb-4">
            Tu sala privada está lista. Comparte este enlace con las personas que quieres invitar.
          </p>
          <div className="bg-black/30 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={createdRoom.link}
                readOnly
                className="flex-1 bg-transparent text-white text-sm border-none outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-md bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleJoinCreatedRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Entrar a la Sala
            </button>
            <button
              onClick={() => setCreatedRoom(null)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Crear Otra Sala
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateRoom} className="space-y-4">
      <div>
        <label htmlFor="roomName" className="block text-sm font-medium text-slate-300 mb-2">
          Nombre de la Sala
        </label>
        <input
          id="roomName"
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Ej: Reunión de Trabajo"
          maxLength={50}
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
            placeholder="Contraseña segura"
            minLength={6}
            className="w-full px-4 py-3 pr-10 bg-black/20 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
            required
          />
          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Mínimo 6 caracteres. Esta contraseña será requerida para unirse.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !roomName.trim() || !password.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Creando sala...</span>
          </>
        ) : (
          <>
            <Plus className="h-5 w-5" />
            <span>Crear Sala Privada</span>
          </>
        )}
      </button>

      <div className="text-xs text-slate-400 text-center">
        💡 Tip: Guarda la contraseña en un lugar seguro. La necesitarás para entrar.
      </div>
    </form>
  );
};