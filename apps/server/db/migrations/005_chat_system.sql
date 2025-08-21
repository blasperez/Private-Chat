-- Crear tabla de salas de chat
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    user_count INTEGER DEFAULT 0
);

-- Crear tabla de usuarios de chat
CREATE TABLE IF NOT EXISTS chat_users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'video', 'audio', 'file')),
    content TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de logs de salas
CREATE TABLE IF NOT EXISTS room_logs (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    files_count INTEGER DEFAULT 0,
    log_path TEXT NOT NULL,
    files_path TEXT NOT NULL,
    created_at_log TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_expires ON chat_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_users_room ON chat_users(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_room_logs_room ON room_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_room_logs_ended ON room_logs(ended_at);

-- Crear función para limpiar salas expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    UPDATE chat_rooms 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar user_count automáticamente
CREATE OR REPLACE FUNCTION update_room_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET user_count = user_count + 1 
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_rooms 
        SET user_count = GREATEST(user_count - 1, 0) 
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para chat_users
CREATE TRIGGER trigger_update_room_user_count
    AFTER INSERT OR DELETE ON chat_users
    FOR EACH ROW
    EXECUTE FUNCTION update_room_user_count();

-- Crear función para obtener estadísticas de sala
CREATE OR REPLACE FUNCTION get_room_stats(room_uuid UUID)
RETURNS TABLE(
    room_id UUID,
    room_name VARCHAR(100),
    user_count INTEGER,
    message_count BIGINT,
    file_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.name,
        cr.user_count,
        COUNT(cm.id),
        COUNT(CASE WHEN cm.type != 'text' THEN 1 END),
        cr.created_at,
        cr.is_active
    FROM chat_rooms cr
    LEFT JOIN chat_messages cm ON cr.id = cm.room_id
    WHERE cr.id = room_uuid
    GROUP BY cr.id, cr.name, cr.user_count, cr.created_at, cr.is_active;
END;
$$ LANGUAGE plpgsql;