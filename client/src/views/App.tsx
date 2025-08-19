import React, { useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { AdSlot } from '../components/AdSlot';
import { sha256Base64 } from '../lib/hash';

const socket = io('/', { autoConnect: true, transports: ['websocket'] });

export function App() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [passwordHash, setPasswordHash] = useState('');
  async function updateHash(pw: string) {
    if (!pw) return setPasswordHash('');
    setPasswordHash(await sha256Base64(pw));
  }

  const [lastMagicLink, setLastMagicLink] = useState<string | null>(null);

  async function createRoom() {
    setLoading(true);
    socket.emit('room:create', { passwordHash }, (resp: any) => {
      setLoading(false);
      if (resp?.ok) {
        setLastMagicLink(resp.magicLink || `${window.location.origin}/r/${resp.roomId}`);
        navigate(`/r/${resp.roomId}`);
      } else {
        alert('No se pudo crear la sala');
      }
    });
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-2">Chat Anónimo con Salas Privadas</h1>
      <p className="text-sm mb-6 text-gray-600 dark:text-gray-300">Todo el contenido se eliminará al finalizar la sala. Acceso por enlace y contraseña.</p>
      <div className="space-y-3 max-w-md">
        <input
          className="input"
          type="password"
          placeholder="Contraseña de la sala"
          value={password}
          onChange={(e) => { setPassword(e.target.value); updateHash(e.target.value); }}
        />
        <button className="btn" onClick={createRoom} disabled={!password || loading}>
          {loading ? 'Creando...' : 'Crear sala'}
        </button>
      </div>

      {lastMagicLink && (
        <div className="mt-6 p-3 rounded border border-red-800 bg-gray-900 text-gray-200">
          <div className="text-xs mb-1">Comparte este enlace con la contraseña para ingresar:</div>
          <div className="flex items-center gap-2">
            <input readOnly className="input flex-1" value={lastMagicLink} />
            <button
              className="btn bg-red-700 hover:bg-red-800"
              onClick={() => navigator.clipboard.writeText(lastMagicLink)}
            >Copiar</button>
          </div>
        </div>
      )}

      <div className="mt-10 text-xs text-gray-500">
        <p>
          Al finalizar la sala, el contenido se eliminará de la interfaz. Para seguridad y cumplimiento legal, se conserva un registro cifrado temporalmente.
        </p>
      </div>

      <div className="mt-10">
        <AdSlot />
      </div>
    </div>
  );
}


