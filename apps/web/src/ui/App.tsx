import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

type Message = { text: string; sender?: string; ts: number }

export default function App() {
  const [phase, setPhase] = useState<'create' | 'resolve' | 'join' | 'room'>('create')
  const [password, setPassword] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [roomId, setRoomId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [presence, setPresence] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const [joinToken, setJoinToken] = useState('')

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
    const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    const json = await res.json()
    if (res.ok) {
      setMagicLink(json.magicLink)
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
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (res.ok) {
      const json = await res.json()
      setJoinToken(json.token)
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
        <p className="subtitle">Todo el contenido se eliminará al finalizar la sala. Acceso gratuito con anuncios.</p>
        <div className="banner">Por seguridad, se conserva un respaldo cifrado temporal y metadatos mínimos para colaborar con autoridades cuando lo requiera la ley.</div>
      </div>

      {phase === 'create' && (
        <div className="card">
          <div className="col">
            <label>Crear sala (contraseña)</label>
            <input className="password" placeholder="••••••" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" />
            <div className="row">
              <button className="btn" onClick={createRoom}>Crear</button>
            </div>
            {magicLink && (
              <div className="col">
                <span className="subtitle">Comparte este enlace</span>
                <input className="input" value={magicLink} readOnly />
              </div>
            )}
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
            <div className="row">
              <button className="btn" onClick={joinRoom}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'room' && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>Sala: {roomId.slice(0,8)}…</div>
            <div className="subtitle">Conectados: {presence}</div>
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
          <div className="row">
            <input className="input" placeholder="Escribe un mensaje" value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && sendMessage()} />
            <button className="btn" onClick={sendMessage}>Enviar</button>
            <input type="file" onChange={onUpload} />
          </div>
        </div>
      )}

      {import.meta.env.VITE_ADSENSE_CLIENT && (
        <>
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${import.meta.env.VITE_ADSENSE_CLIENT}`} crossOrigin="anonymous"></script>
          <ins className="adsbygoogle" style={{ display: 'block', marginTop: 16 }} data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT} data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_TOP} data-ad-format="auto" data-full-width-responsive="true"></ins>
          <script dangerouslySetInnerHTML={{ __html: `
            (adsbygoogle = window.adsbygoogle || []).push({});
          `}} />
        </>
      )}
    </div>
  )
}


