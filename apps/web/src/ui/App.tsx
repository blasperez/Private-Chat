import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { CreateRoom } from '../components/CreateRoom';
import { JoinRoom } from '../components/JoinRoom';
import { ChatRoom } from '../components/ChatRoom';

type AppState = 'create' | 'join' | 'chat';

interface ChatSession {
  roomId: string;
  password: string;
  username: string;
}

function App() {
  const [currentState, setCurrentState] = useState<AppState>('create');
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);

  // Google Ads Script
  useEffect(() => {
    // Cargar Google AdSense
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleRoomCreated = (roomId: string, joinUrl: string) => {
    // Aquí podrías redirigir automáticamente a la sala o mostrar el enlace
    console.log('Room created:', roomId, joinUrl);
  };

  const handleJoinRoom = (roomId: string, password: string, username: string) => {
    setChatSession({ roomId, password, username });
    setCurrentState('chat');
  };

  const handleLeaveChat = () => {
    setChatSession(null);
    setCurrentState('create');
  };

  const renderContent = () => {
    switch (currentState) {
      case 'create':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Chat Privado Temporal
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Crea salas de chat seguras y temporales. Sin registro, sin rastro. 
                  Todo el contenido se elimina automáticamente cuando la sala se cierra.
                </p>
              </div>

              {/* Google Ad Banner */}
              <div className="max-w-md mx-auto mb-8">
                <ins
                  className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                  data-ad-slot="XXXXXXXXXX"
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              </div>

              <CreateRoom onRoomCreated={handleRoomCreated} />

              <div className="mt-8 text-center">
                <button
                  onClick={() => setCurrentState('join')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ¿Ya tienes un enlace? Únete a una sala existente
                </button>
              </div>
            </div>
          </div>
        );

      case 'join':
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Unirse a Sala
                </h1>
                <p className="text-lg text-gray-600">
                  Ingresa los datos para acceder a la sala privada
                </p>
              </div>

              <JoinRoom onJoinRoom={handleJoinRoom} />
            </div>
          </div>
        );

      case 'chat':
        if (!chatSession) {
          setCurrentState('create');
          return null;
        }
        return (
          <ChatRoom
            roomId={chatSession.roomId}
            password={chatSession.password}
            username={chatSession.username}
            onLeave={handleLeaveChat}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderContent()}
      
      {/* Google AdSense */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;


