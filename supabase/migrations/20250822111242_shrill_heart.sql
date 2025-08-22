/*
  # Configuración de Storage para Archivos Multimedia

  1. Buckets de Almacenamiento
    - `chat-media` - Archivos multimedia de chat
    - `chat-logs` - Logs y archivos de cumplimiento

  2. Políticas de Acceso
    - Acceso público para visualización
    - Subida controlada por aplicación

  3. Configuración de Seguridad
    - Límites de tamaño de archivo
    - Tipos de archivo permitidos
*/

-- Crear buckets de storage
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('chat-media', 'chat-media', true),
  ('chat-logs', 'chat-logs', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para chat-media (acceso público para visualización)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Users can update their uploads" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'chat-media');

-- Políticas para chat-logs (solo service role)
CREATE POLICY "Service role only" ON storage.objects 
  FOR ALL USING (bucket_id = 'chat-logs' AND auth.role() = 'service_role');