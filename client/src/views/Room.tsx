import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import dayjs from 'dayjs';
import { AdSlot } from '../components/AdSlot';
import { sha256Base64 } from '../lib/hash';

const socket: Socket = io('/', { autoConnect: true, transports: ['websocket'] });

type Message = {
  id: string;
  kind: 'text' | 'media';
  content: any;
  senderId: string;
  timestamp: string;
};

export function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');

  const [passwordHash, setPasswordHash] = useState('');

  useEffect(() => {
    function onNewMessage({ message }: any) {
      setMessages((prev) => [...prev, message]);
    }
    function onParticipants(payload: any) {
      setParticipants(payload.count);
    }
    socket.on('message:new', onNewMessage);
    socket.on('room:participants', onParticipants);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('room:participants', onParticipants);
    };
  }, []);

  function joinRoom() {
    socket.emit('room:join', { roomId, passwordHash }, (resp: any) => {
      if (resp?.ok) setJoined(true);
      else alert('Contraseña incorrecta o sala no encontrada');
    });
  }

  function leaveRoom() {
    socket.emit('room:leave', { roomId });
    setJoined(false);
    navigate('/');
  }

  function sendText() {
    if (!text.trim()) return;
    socket.emit('message:text', { roomId, content: text, tempId: Date.now() });
    setText('');
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    const form = new FormData();
    form.append('file', file);
    form.append('socketId', socket.id);
    const resp = await fetch(`/api/rooms/${roomId}/upload`, { method: 'POST', body: form });
    const data = await resp.json();
    if (data?.ok) {
      socket.emit('message:media', { roomId, fileInfo: data.file, tempId: Date.now() });
    } else {
      alert('Fallo la subida');
    }
  }

  if (!joined) {
    return (
      <div className="container py-10 space-y-4">
        <h2 className="text-xl font-semibold">Ingresar a la sala</h2>
        <input
          ref={inputRef}
          className="input"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={async (e) => { setPassword(e.target.value); setPasswordHash(await sha256Base64(e.target.value)); }}
        />
        <div className="flex gap-2">
          <button className="btn" onClick={joinRoom} disabled={!password}>Entrar</button>
          <button className="btn bg-gray-600 hover:bg-gray-700" onClick={() => navigate('/')}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Sala {roomId}</h2>
          <p className="text-xs text-gray-500">Participantes: {participants}</p>
          <p className="text-xs text-red-600 mt-1">Todo el contenido se eliminará al finalizar la sala.</p>
        </div>
        <button className="btn bg-red-600 hover:bg-red-700" onClick={leaveRoom}>Salir</button>
      </div>

      <div className="border rounded p-3 h-[60vh] overflow-y-auto bg-white dark:bg-gray-800">
        {messages.map((m) => (
          <div key={m.id} className="mb-2">
            <div className="text-xs text-gray-500">{dayjs(m.timestamp).format('HH:mm:ss')}</div>
            {m.kind === 'text' ? (
              <div className="whitespace-pre-wrap">{m.content}</div>
            ) : (
              <div>
                {m.content?.type?.startsWith('image/') ? (
                  <img src={`/${m.content.path}`} alt={m.content.name} className="max-h-60 rounded" />
                ) : m.content?.type?.startsWith('video/') ? (
                  <video src={`/${m.content.path}`} controls className="max-h-60 rounded" />
                ) : m.content?.type?.startsWith('audio/') ? (
                  <audio src={`/${m.content.path}`} controls />
                ) : (
                  <a className="text-indigo-600 underline" href={`/${m.content.path}`} target="_blank" rel="noreferrer">{m.content.name}</a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="Escribe un mensaje..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendText()} />
        <button className="btn" onClick={sendText}>Enviar</button>
        <label className="btn cursor-pointer">
          Subir
          <input type="file" className="hidden" onChange={onFileSelected} />
        </label>
      </div>

      <div className="mt-6">
        <AdSlot />
      </div>
    </div>
  );
}


