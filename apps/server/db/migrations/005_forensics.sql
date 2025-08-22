-- Tabla para logs forenses detallados
CREATE TABLE IF NOT EXISTS forensic_logs (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_forensic_room (room_id),
  INDEX idx_forensic_timestamp (timestamp),
  INDEX idx_forensic_event (event_type),
  INDEX idx_forensic_ip (ip_address)
);

-- Tabla para reportes generados
CREATE TABLE IF NOT EXISTS forensic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(100),
  requested_by VARCHAR(200),
  request_date TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_path TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB
);

-- Tabla para cadena de custodia
CREATE TABLE IF NOT EXISTS chain_of_custody (
  id BIGSERIAL PRIMARY KEY,
  evidence_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(200),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  hash_before VARCHAR(64),
  hash_after VARCHAR(64),
  metadata JSONB
);

-- Índices adicionales para búsquedas forenses
CREATE INDEX IF NOT EXISTS idx_messages_content ON messages USING gin(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON room_sessions(ip);
CREATE INDEX IF NOT EXISTS idx_media_mime ON media(mime_type);

-- Vista para análisis forense rápido
CREATE OR REPLACE VIEW forensic_overview AS
SELECT 
  r.id as room_id,
  r.created_at as room_created,
  r.archived_at as room_archived,
  COUNT(DISTINCT rs.id) as total_sessions,
  COUNT(DISTINCT rs.ip) as unique_ips,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT md.id) as total_media,
  MIN(rs.joined_at) as first_join,
  MAX(rs.joined_at) as last_join
FROM rooms r
LEFT JOIN room_sessions rs ON r.id = rs.room_id
LEFT JOIN messages m ON r.id = m.room_id
LEFT JOIN media md ON r.id = md.room_id
GROUP BY r.id;