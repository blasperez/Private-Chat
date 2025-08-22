import React, { useState, useRef } from 'react';
import { Upload, X, Image, Video, Music, File, AlertCircle } from 'lucide-react';

interface MediaUploadProps {
  onUpload: (mediaUrl: string, mediaType: string, filename: string) => void;
  onClose: () => void;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({ onUpload, onClose }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/mov'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  };

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const getFileType = (file: File): string => {
    if (allowedTypes.image.includes(file.type)) return 'image';
    if (allowedTypes.video.includes(file.type)) return 'video';
    if (allowedTypes.audio.includes(file.type)) return 'audio';
    return 'file';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return 'El archivo es demasiado grande. Máximo 50MB.';
    }

    const fileType = getFileType(file);
    if (fileType === 'file' && !file.type) {
      return 'Tipo de archivo no soportado.';
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Simular upload del archivo
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const result = e.target?.result as string;
        const fileType = getFileType(file);
        
        // En producción, esto subiría el archivo a un servicio de almacenamiento
        // Por ahora, usamos el data URL directamente
        onUpload(result, fileType, file.name);
        
        console.log('📎 [SECURITY LOG] Archivo multimedia subido:', {
          filename: file.name,
          type: file.type,
          size: file.size,
          timestamp: new Date().toISOString()
        });
      };
      
      fileReader.readAsDataURL(file);
    } catch (error) {
      setError('Error al subir el archivo. Inténtalo de nuevo.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-8 w-8 text-blue-400" />;
      case 'video': return <Video className="h-8 w-8 text-purple-400" />;
      case 'audio': return <Music className="h-8 w-8 text-green-400" />;
      default: return <File className="h-8 w-8 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Subir Archivo</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-slate-600 hover:border-slate-500'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 rounded-full bg-slate-700">
              <Upload className="h-8 w-8 text-slate-300" />
            </div>
            
            <div>
              <p className="text-white font-medium">Arrastra un archivo aquí</p>
              <p className="text-slate-400 text-sm">o haz clic para seleccionar</p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mt-6 space-y-3">
          <p className="text-slate-300 text-sm font-medium">Tipos de archivo soportados:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              {getFileIcon('image')}
              <span>Imágenes (JPG, PNG, GIF)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              {getFileIcon('video')}
              <span>Videos (MP4, WebM)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              {getFileIcon('audio')}
              <span>Audios (MP3, WAV)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              {getFileIcon('file')}
              <span>Archivos (Máx. 50MB)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-400 text-xs">
            ⚠️ Los archivos se eliminarán cuando la sala quede vacía
          </p>
        </div>
      </div>
    </div>
  );
};