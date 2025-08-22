import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { RoomEntry } from './components/RoomEntry';
import { ChatRoom } from './components/ChatRoom';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        {/* Google Ads Integration Placeholder */}
        <div className="hidden">
          {/* 
            Aquí se integrarían los anuncios de Google AdSense
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossOrigin="anonymous"></script>
          */}
        </div>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomEntry />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
        </Routes>

        {/* Footer Ad Space */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-sm border-t border-white/10 flex items-center justify-center text-slate-400 text-sm z-40">
          <div className="text-center">
            <p>📢 Espacio publicitario - SecureChat es gratuito gracias a la publicidad</p>
            <p className="text-xs opacity-75">Este servicio se mantiene con Google Ads</p>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;