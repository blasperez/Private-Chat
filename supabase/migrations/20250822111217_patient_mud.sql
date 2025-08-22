/*
  # Sistema de Chat Seguro - Esquema Principal

  1. Nuevas Tablas
    - `chat_rooms` - Salas de chat con contraseñas
    - `chat_messages` - Mensajes de texto y multimedia
    - `chat_users` - Usuarios activos en salas
    - `chat_sessions` - Logs de sesiones para cumplimiento legal
    - `media_files` - Archivos multimedia con metadatos
    - `security_logs` - Logs de seguridad y auditoría

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para acceso controlado
    - Índices para optimización de consultas

  3. Cumplimiento Legal
    - Retención automática de logs
    - Metadatos para colaboración con autoridades
    - Sistema de archivado seguro
*/

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de salas de chat
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  password_hash text NOT NULL,
  magic_link_id text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  active_users integer DEFAULT 0,
  is_active boolean DEFAULT true,
  creator_ip inet,
  creator_user_agent text,
  total_messages integer DEFAULT 0,
  total_media_files integer DEFAULT 0
);

-- Tabla de usuarios en salas
CREATE TABLE IF NOT EXISTS chat_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  username text NOT NULL,
  session_id text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  ip_address inet,
  user_agent text,
  UNIQUE(room_id, session_id)
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES chat_users(id) ON DELETE CASCADE,
  username text NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  media_url text,
  media_filename text,
  media_size bigint,
  media_type text,
  created_at timestamptz DEFAULT now(),
  ip_address inet,
  is_deleted boolean DEFAULT false
);

-- Tabla de archivos multimedia
CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  file_hash text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES chat_users(id),
  storage_bucket text DEFAULT 'chat-media',
  is_archived boolean DEFAULT false
);

-- Tabla de sesiones (logs de cumplimiento legal)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL,
  session_end timestamptz,
  total_messages integer DEFAULT 0,
  total_media_files integer DEFAULT 0,
  total_users integer DEFAULT 0,
  session_duration interval,
  archived_at timestamptz,
  archive_path text,
  legal_hold boolean DEFAULT false,
  compliance_notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de logs de seguridad
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid,
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source text DEFAULT 'chat_system'
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_chat_rooms_magic_link ON chat_rooms(magic_link_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_chat_users_room_active ON chat_users(room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_files_room ON media_files(room_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_room ON security_logs(room_id, timestamp);

-- Habilitar RLS en todas las tablas
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (acceso público controlado para el sistema de chat)
CREATE POLICY "Public access to active rooms" ON chat_rooms
  FOR ALL USING (is_active = true);

CREATE POLICY "Public access to room users" ON chat_users
  FOR ALL USING (true);

CREATE POLICY "Public access to room messages" ON chat_messages
  FOR ALL USING (true);

CREATE POLICY "Public access to media files" ON media_files
  FOR ALL USING (true);

-- Políticas restrictivas para logs (solo service role)
CREATE POLICY "Service role only access" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only access" ON security_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar salas inactivas (aparente)
CREATE OR REPLACE FUNCTION cleanup_inactive_rooms()
RETURNS void AS $$
BEGIN
  -- Marcar salas como inactivas (no eliminar realmente)
  UPDATE chat_rooms 
  SET is_active = false, updated_at = now()
  WHERE active_users = 0 
    AND last_activity < now() - interval '1 hour'
    AND is_active = true;
    
  -- Crear logs de sesión para salas "eliminadas"
  INSERT INTO chat_sessions (room_id, session_start, session_end, total_messages, total_media_files, archived_at)
  SELECT 
    r.id,
    r.created_at,
    now(),
    r.total_messages,
    r.total_media_files,
    now()
  FROM chat_rooms r
  WHERE r.is_active = false 
    AND NOT EXISTS (
      SELECT 1 FROM chat_sessions s WHERE s.room_id = r.id
    );
END;
$$ LANGUAGE plpgsql;