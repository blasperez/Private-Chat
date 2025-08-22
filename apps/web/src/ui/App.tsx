import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '') || ''

type Message = { text: string; sender?: string; ts: number }

export default function App() {
  const [phase, setPhase] = useState<'create' | 'resolve' | 'join' | 'room'>('create')
  const [password, setPassword] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [capacity, setCapacity] = useState(10)
  const [roomId, setRoomId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [presence, setPresence] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const [joinToken, setJoinToken] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const token = useMemo(() => {
    const m = window.location.pathname.match(/^\/r\/(.+)$/)
    return m ? m[1] : ''
  }, [])

  useEffect(() => {
    if (token) setPhase('resolve')
  }, [token])

  useEffect(() => {
    if (phase === 'room' && roomId && joinToken) {
      const s = io(API_BASE, { auth: { token: joinToken } })
      socketRef.current = s
      s.emit('join', { roomId })
      s.on('message', (m: Message) => setMessages((prev) => [...prev, m]))
      s.on('media', (m: any) => setMessages((prev) => [...prev, { text: JSON.stringify({ media: m }), ts: Date.now() }]))
      s.on('presence', (p: any) => setPresence(p.count))
      return () => {
        s.emit('leave', { roomId })
        s.disconnect()
      }
    }
  }, [phase, roomId, joinToken])

  async function createRoom() {
    try {
      setError('')
      setCreating(true)
      const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, capacity }) })
      const json = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(json?.error || 'ERROR')
      setMagicLink(json.magicLink)
    } catch (e:any) {
      setError('No se pudo crear la sala')
    } finally {
      setCreating(false)
    }
  }

  async function resolveToken() {
    const res = await fetch(`${API_BASE}/api/resolve/${token}`)
    const json = await res.json()
    if (res.ok) {
      setRoomId(json.roomId)
      setPhase('join')
    }
  }

  async function joinRoom() {
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, name: displayName }) })
    if (res.ok) {
      const json = await res.json()
      setJoinToken(json.token)
      if (displayName) localStorage.setItem('sr_name', displayName)
      setPhase('room')
    }
  }

  function sendMessage() {
    if (!socketRef.current || !text.trim()) return
    socketRef.current.emit('message', { roomId, text })
    setText('')
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.append('file', f)
    await fetch(`${API_BASE}/api/rooms/${roomId}/upload`, { method: 'POST', body: fd })
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="title">ShadowRooms</div>
          <span className="badge">Privado • Temporal • Multimedia</span>
        </div>
        <p className="subtitle">Plataforma de chat seguro con salas privadas temporales</p>
        <div className="info-banner">
          <strong>⚠️ Aviso Importante:</strong> Todo el contenido se eliminará automáticamente cuando la sala quede vacía. 
          Sin registro de usuarios. Acceso completamente gratuito.
        </div>
        <div className="banner">
          🔒 Chat anónimo • 🎭 Sin registro • 🗑️ Contenido temporal • 📱 Multimedia
        </div>
      </div>

      {phase === 'create' && (
        <div className="card">
          <div className="col">
            <label>Crear sala (contraseña)</label>
            <input className="password" placeholder="••••••" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" />
            <label>Capacidad (2-50)</label>
            <input className="input" type="number" min={2} max={50} value={capacity} onChange={(e)=> setCapacity(Math.min(50, Math.max(2, Number(e.target.value||10))))} />
            <div className="row">
              <button className="btn" onClick={createRoom} disabled={creating}>{creating ? 'Creando…' : 'Crear'}</button>
            </div>
            {magicLink && (
              <div className="col">
                <span className="subtitle">Comparte este enlace</span>
                <input className="input" value={magicLink} readOnly />
              </div>
            )}
            {error && <span className="warning">{error}</span>}
          </div>
        </div>
      )}

      {phase === 'resolve' && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>Resolviendo enlace…</div>
            <button className="btn secondary" onClick={resolveToken}>Continuar</button>
          </div>
        </div>
      )}

      {phase === 'join' && (
        <div className="card">
          <div className="col">
            <div className="subtitle">La sala requiere contraseña</div>
            <input className="password" placeholder="••••••" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" />
            <input className="input" placeholder="Tu nombre (opcional)" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
            <div className="row">
              <button className="btn" onClick={joinRoom}>Entrar</button>
            </div>
          </div>
        </div>
      )}

              {phase === 'room' && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Sala ID:</strong> {roomId.slice(0,8)}...
              <button 
                className="btn secondary" 
                style={{ marginLeft: '10px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                📋 Copiar enlace
              </button>
            </div>
            <div className="presence-indicator">
              {presence} {presence === 1 ? 'usuario' : 'usuarios'} conectado{presence !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="chat-box">
            {messages.map((m,i)=> {
              try {
                const parsed = JSON.parse(m.text)
                if (parsed && parsed.media) {
                  const med = parsed.media
                  if ((med.mime as string).startsWith('image/')) {
                    return (
                      <div key={i} className="bubble">
                        <img src={`${API_BASE}${med.url}`} alt={med.fileName} style={{ maxWidth: '240px', borderRadius: 8 }} />
                      </div>
                    )
                  }
                  if ((med.mime as string).startsWith('video/')) {
                    return (
                      <div key={i} className="bubble">
                        <video src={`${API_BASE}${med.url}`} controls style={{ maxWidth: '280px', borderRadius: 8 }} />
                      </div>
                    )
                  }
                  if ((med.mime as string).startsWith('audio/')) {
                    return (
                      <div key={i} className="bubble">
                        <audio src={`${API_BASE}${med.url}`} controls />
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="bubble">
                      <a href={`${API_BASE}${med.url}`} target="_blank" rel="noreferrer">{med.fileName}</a>
                    </div>
                  )
                }
              } catch {}
              return (
                <div key={i} className="bubble">{m.text}</div>
              )
            })}
          </div>
          <div className="col">
            <div className="row">
              <input 
                className="input" 
                placeholder="Escribe un mensaje..." 
                value={text} 
                onChange={(e)=>setText(e.target.value)} 
                onKeyDown={(e)=> e.key==='Enter' && sendMessage()} 
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={sendMessage}>📤 Enviar</button>
            </div>
            <div className="row">
              <label className="file-label">
                📎 Adjuntar archivo
                <input 
                  type="file" 
                  onChange={onUpload} 
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />
              </label>
              <span className="subtitle" style={{ fontSize: '0.85rem' }}>
                Soporta: Imágenes, Videos, Audio, Documentos (máx. 100MB)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Google Ads - Top Banner */}
      {import.meta.env.VITE_ADSENSE_CLIENT && (
        <div className="ad-container">
          <ins 
            className="adsbygoogle" 
            style={{ display: 'block', width: '100%', height: 'auto' }} 
            data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT} 
            data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_TOP} 
            data-ad-format="auto" 
            data-full-width-responsive="true"
          />
        </div>
      )}
      
      {/* Google Ads - Bottom Banner */}
      {import.meta.env.VITE_ADSENSE_CLIENT && import.meta.env.VITE_ADSENSE_SLOT_BOTTOM && (
        <div className="ad-container">
          <ins 
            className="adsbygoogle" 
            style={{ display: 'block', width: '100%', height: 'auto' }} 
            data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT} 
            data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_BOTTOM} 
            data-ad-format="auto" 
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  )
}


