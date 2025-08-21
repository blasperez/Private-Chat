import React, { useState, useEffect } from 'react';
import { Users, Lock, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface JoinRoomProps {
  onJoinRoom: (roomId: string, password: string, username: string) => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  // Extraer roomId de la URL si existe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    if (roomIdFromUrl) {
      setRoomId(roomIdFromUrl);
      verifyRoom(roomIdFromUrl);
    }
  }, []);

  const verifyRoom = async (id: string) => {
    if (!id.trim()) return;

    setIsVerifying(true);
    try {
      const response = await apiService.verifyRoom(id);
      setRoomInfo(response.room);
    } catch (error) {
      console.error('Error verifying room:', error);
      toast.error('Sala no encontrada o inactiva');
      setRoomInfo(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRoomIdChange = (value: string) => {
    setRoomId(value);
    if (value.trim() && value.length >= 36) {
      verifyRoom(value);
    } else {
      setRoomInfo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId.trim() || !password.trim() || !username.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (username.length < 2) {
      toast.error('El nombre de usuario debe tener al menos 2 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      onJoinRoom(roomId.trim(), password, username.trim());
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Error al unirse a la sala');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unirse a Sala</h2>
        <p className="text-gray-600">Ingresa los datos para acceder a la sala privada</p>
      </div>

      {roomInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="font-medium text-blue-900">{roomInfo.name}</p>
              <p className="text-sm text-blue-700">
                {roomInfo.userCount} usuario{roomInfo.userCount !== 1 ? 's' : ''} conectado{roomInfo.userCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
            ID de la sala
          </label>
          <input
            type="text"
            id="roomId"
            value={roomId}
            onChange={(e) => handleRoomIdChange(e.target.value)}
            placeholder="Pega el ID de la sala aquí"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          {isVerifying && (
            <p className="text-sm text-blue-600 mt-1">Verificando sala...</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la contraseña de la sala"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Tu nombre
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="¿Cómo te llamas?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={30}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !roomInfo}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Conectando...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Unirse a la Sala
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          ¿Quieres crear una sala?{' '}
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Crear nueva sala
          </button>
        </p>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </button>
      </div>
    </div>
  );
};