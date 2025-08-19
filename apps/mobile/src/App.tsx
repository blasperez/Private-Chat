import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SafeAreaView, View, Text, TextInput, Button, FlatList, TouchableOpacity, Image } from 'react-native'
import Constants from 'expo-constants'
import * as DocumentPicker from 'expo-document-picker'
import { io, Socket } from 'socket.io-client'

const API_BASE = (Constants.expoConfig?.extra as any)?.API_BASE || ''

type Message = { text: string; sender?: string; ts: number }

export default function App() {
  const [phase, setPhase] = useState<'create' | 'resolve' | 'join' | 'room'>('create')
  const [password, setPassword] = useState('')
  const [capacity, setCapacity] = useState('10')
  const [magicLink, setMagicLink] = useState('')
  const [roomId, setRoomId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [presence, setPresence] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const [joinToken, setJoinToken] = useState('')
  const [displayName, setDisplayName] = useState('')

  const token = useMemo(() => {
    const m = magicLink.match(/\/r\/([^/]+)/)
    return m ? m[1] : ''
  }, [magicLink])

  useEffect(() => {
    if (phase === 'room' && roomId && joinToken) {
      const s = io(API_BASE, { auth: { token: joinToken } })
      socketRef.current = s
      s.emit('join', { roomId })
      s.on('message', (m: Message) => setMessages((prev) => [...prev, m]))
      s.on('media', (m: any) => setMessages((prev) => [...prev, { text: JSON.stringify({ media: m }), ts: Date.now() }]))
      s.on('presence', (p: any) => setPresence(p.count))
      return () => { s.emit('leave', { roomId }); s.disconnect() }
    }
  }, [phase, roomId, joinToken])

  async function createRoom() {
    const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, capacity: Number(capacity) }) })
    const json = await res.json()
    if (res.ok) setMagicLink(json.magicLink)
  }

  async function resolveLink() {
    if (!token) return
    const res = await fetch(`${API_BASE}/api/resolve/${token}`)
    const json = await res.json()
    if (res.ok) { setRoomId(json.roomId); setPhase('join') }
  }

  async function joinRoom() {
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, name: displayName }) })
    if (res.ok) { const json = await res.json(); setJoinToken(json.token); setPhase('room') }
  }

  function sendMessage() {
    if (!socketRef.current || !text.trim()) return
    socketRef.current.emit('message', { roomId, text, sender: displayName })
    setText('')
  }

  async function onUpload() {
    const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (pick.canceled || !pick.assets?.[0]) return
    const asset = pick.assets[0]
    const fd = new FormData()
    // @ts-expect-error RN File
    fd.append('file', { uri: asset.uri, name: asset.name || 'file', type: asset.mimeType || 'application/octet-stream' })
    await fetch(`${API_BASE}/api/rooms/${roomId}/upload`, { method: 'POST', body: fd as any })
  }

  const renderItem = ({ item }: { item: Message }) => {
    try {
      const parsed = JSON.parse(item.text)
      if (parsed && parsed.media) {
        const m = parsed.media
        if ((m.mime||'').startsWith('image/')) return <Image source={{ uri: `${API_BASE}${m.url}` }} style={{ width: 240, height: 240, borderRadius: 8 }} />
        return <Text>{m.fileName}</Text>
      }
    } catch {}
    return <Text>{item.sender ? `${item.sender}: ` : ''}{item.text}</Text>
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0b10' }}>
      <View style={{ padding: 12 }}>
        <Text style={{ color: '#e5e7eb', fontSize: 20, fontWeight: '700' }}>ShadowRooms</Text>
        <Text style={{ color: '#9ca3af' }}>Privado • Temporal • Multimedia</Text>
      </View>
      {phase === 'create' && (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#e5e7eb' }}>Contraseña</Text>
          <TextInput secureTextEntry value={password} onChangeText={setPassword} style={{ backgroundColor: '#13131a', color: '#e5e7eb', padding: 8, borderRadius: 8 }} />
          <Text style={{ color: '#e5e7eb', marginTop: 8 }}>Capacidad</Text>
          <TextInput keyboardType='number-pad' value={capacity} onChangeText={setCapacity} style={{ backgroundColor: '#13131a', color: '#e5e7eb', padding: 8, borderRadius: 8 }} />
          <Button title='Crear' onPress={createRoom} />
          {magicLink ? (
            <>
              <Text style={{ color: '#9ca3af', marginTop: 8 }}>Comparte este enlace</Text>
              <Text selectable style={{ color: '#e5e7eb' }}>{magicLink}</Text>
              <Button title='Ir al enlace' onPress={() => setPhase('resolve')} />
            </>
          ) : null}
        </View>
      )}
      {phase === 'resolve' && (
        <View style={{ padding: 12 }}>
          <Button title='Continuar' onPress={resolveLink} />
        </View>
      )}
      {phase === 'join' && (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#9ca3af' }}>La sala requiere contraseña</Text>
          <TextInput secureTextEntry value={password} onChangeText={setPassword} style={{ backgroundColor: '#13131a', color: '#e5e7eb', padding: 8, borderRadius: 8, marginBottom: 8 }} />
          <TextInput placeholder='Tu nombre (opcional)' placeholderTextColor={'#6b7280'} value={displayName} onChangeText={setDisplayName} style={{ backgroundColor: '#13131a', color: '#e5e7eb', padding: 8, borderRadius: 8 }} />
          <Button title='Entrar' onPress={joinRoom} />
        </View>
      )}
      {phase === 'room' && (
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={{ color: '#9ca3af' }}>Conectados: {presence}</Text>
          <FlatList data={messages} keyExtractor={(it, idx) => `${idx}`} renderItem={renderItem} style={{ flex: 1, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput placeholder='Escribe…' placeholderTextColor={'#6b7280'} value={text} onChangeText={setText} style={{ flex: 1, backgroundColor: '#13131a', color: '#e5e7eb', padding: 8, borderRadius: 8 }} />
            <TouchableOpacity onPress={sendMessage} style={{ backgroundColor: '#ef4444', padding: 10, borderRadius: 8 }}><Text style={{ color: 'white' }}>Enviar</Text></TouchableOpacity>
            <TouchableOpacity onPress={onUpload} style={{ backgroundColor: '#8b5cf6', padding: 10, borderRadius: 8 }}><Text style={{ color: 'white' }}>Subir</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}


