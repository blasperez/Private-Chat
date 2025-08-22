import React from 'react';
import { ChatUser } from '../types/chat';
import { Users, Crown, User } from 'lucide-react';

interface UserListProps {
  users: ChatUser[];
  currentUserId: string;
}

export const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-slate-300" />
          <h3 className="text-lg font-semibold text-white">
            Usuarios ({users.length})
          </h3>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {users.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay usuarios conectados</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center space-x-3 p-3 rounded-lg ${
                user.id === currentUserId
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10'
              } transition-colors`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                user.id === currentUserId
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-600 text-slate-300'
              }`}>
                {user.id === currentUserId ? (
                  <Crown className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">
                    {user.username}
                  </span>
                  {user.id === currentUserId && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                      Tú
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Conectado desde {new Date(user.joined_at).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className={`w-2 h-2 rounded-full ${
                user.is_active ? 'bg-green-400' : 'bg-red-400'
              }`} />
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-slate-400 text-center">
          <p>🔒 Sala privada y segura</p>
          <p>Los usuarios pueden unirse y salir libremente</p>
        </div>
      </div>
    </div>
  );
};