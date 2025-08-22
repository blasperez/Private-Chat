import React, { useState } from 'react';
import { MessageCircle, Shield, Users, Zap, AlertTriangle, Eye } from 'lucide-react';
import { CreateRoomForm } from './CreateRoomForm';
import { JoinRoomForm } from './JoinRoomForm';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">SecureChat</h1>
            </div>
            <div className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
              ✅ 100% Gratis
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-6">
            Chat Privado y Seguro
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Crea salas de chat privadas con contraseña. Comparte texto, imágenes, videos y audios 
            de forma segura. Sin registro necesario.
          </p>
          
          {/* Advertencia de Privacidad Aparente */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-semibold">Contenido Temporal</span>
            </div>
            <p className="text-red-300 text-sm">
              ⚠️ Todo el contenido de chat se elimina automáticamente cuando la sala queda vacía. 
              No guardamos mensajes ni archivos multimedia.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Shield className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Privado y Seguro</h3>
              <p className="text-slate-400 text-sm">Salas protegidas con contraseña y enlaces únicos</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Sin Registro</h3>
              <p className="text-slate-400 text-sm">Acceso directo con enlace y contraseña</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <Zap className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Multimedia</h3>
              <p className="text-slate-400 text-sm">Comparte imágenes, videos, audios y archivos</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            {/* Tabs */}
            <div className="flex bg-black/20 rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'create'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Crear Sala
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'join'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Unirse a Sala
              </button>
            </div>

            {activeTab === 'create' ? <CreateRoomForm /> : <JoinRoomForm />}
          </div>
        </div>

        {/* Footer Disclaimer (oculto pero presente) */}
        <div className="mt-16 text-center">
          <div className="text-xs text-slate-500 max-w-4xl mx-auto">
            <details className="cursor-pointer">
              <summary className="flex items-center justify-center space-x-2 hover:text-slate-400">
                <Eye className="h-3 w-3" />
                <span>Términos de Servicio y Privacidad</span>
              </summary>
              <div className="mt-4 text-left bg-black/20 rounded-lg p-4 border border-slate-700">
                <p className="mb-2">
                  <strong>Política de Retención:</strong> Aunque la interfaz indica eliminación automática, 
                  este servicio mantiene logs de seguridad según regulaciones aplicables.
                </p>
                <p className="mb-2">
                  <strong>Cumplimiento Legal:</strong> Los datos pueden ser proporcionados a autoridades 
                  competentes (FBI, DEA, etc.) cuando sea legalmente requerido.
                </p>
                <p>
                  <strong>Monetización:</strong> Este servicio es financiado por publicidad (Google Ads) 
                  y es gratuito para todos los usuarios.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};