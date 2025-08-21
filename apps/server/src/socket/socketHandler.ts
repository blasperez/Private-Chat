import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/roomService';
import { FileService } from '../services/fileService';
import { ChatMessage } from '../types/chat';

interface SocketUser {
  id: string;
  username: string;
  roomId: string;
}

export class SocketHandler {
  private io: Server;
  private roomService: RoomService;
  private fileService: FileService;
  private users: Map<string, SocketUser> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.roomService = RoomService.getInstance();
    this.fileService = FileService.getInstance();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      // Unirse a una sala
      socket.on('join_room', async (data: { roomId: string; password: string; username: string }) => {
        try {
          const ipAddress = socket.handshake.address;
          const room = await this.roomService.joinRoom(data.roomId, data.password, data.username, ipAddress);
          
          socket.join(data.roomId);
          
          const user: SocketUser = {
            id: socket.id,
            username: data.username,
            roomId: data.roomId
          };
          
          this.users.set(socket.id, user);

          // Enviar mensaje de bienvenida
          const welcomeMessage: Omit<ChatMessage, 'id'> = {
            roomId: data.roomId,
            userId: 'system',
            username: 'Sistema',
            type: 'text',
            content: `${data.username} se ha unido a la sala`,
            timestamp: new Date(),
            ipAddress
          };

          const savedMessage = await this.roomService.saveMessage(welcomeMessage);
          
          this.io.to(data.roomId).emit('message', savedMessage);
          this.io.to(data.roomId).emit('user_joined', {
            username: data.username,
            userCount: room.userCount
          });

          // Enviar historial de mensajes
          const messages = await this.roomService.getRoomMessages(data.roomId);
          socket.emit('message_history', messages.reverse());

        } catch (error) {
          socket.emit('error', { message: error instanceof Error ? error.message : 'Error joining room' });
        }
      });

      // Enviar mensaje de texto
      socket.on('send_message', async (data: { content: string }) => {
        const user = this.users.get(socket.id);
        if (!user) return;

        try {
          const message: Omit<ChatMessage, 'id'> = {
            roomId: user.roomId,
            userId: socket.id,
            username: user.username,
            type: 'text',
            content: data.content,
            timestamp: new Date(),
            ipAddress: socket.handshake.address
          };

          const savedMessage = await this.roomService.saveMessage(message);
          this.io.to(user.roomId).emit('message', savedMessage);

        } catch (error) {
          socket.emit('error', { message: 'Error sending message' });
        }
      });

      // Subir archivo
      socket.on('upload_file', async (data: { file: Buffer; filename: string; mimetype: string }) => {
        const user = this.users.get(socket.id);
        if (!user) return;

        try {
          // Crear archivo temporal
          const tempPath = `/tmp/${Date.now()}_${data.filename}`;
          require('fs').writeFileSync(tempPath, data.file);

          const file = {
            originalname: data.filename,
            filename: data.filename,
            path: tempPath,
            size: data.file.length,
            mimetype: data.mimetype
          } as Express.Multer.File;

          const fileUpload = await this.fileService.saveFile(file, user.roomId);
          const fileType = this.fileService.getFileType(data.mimetype);
          const fileUrl = this.fileService.getFileUrl(user.roomId, fileUpload.filename);

          const message: Omit<ChatMessage, 'id'> = {
            roomId: user.roomId,
            userId: socket.id,
            username: user.username,
            type: fileType,
            content: `${this.fileService.getFileIcon(data.mimetype)} ${data.filename}`,
            fileUrl,
            fileName: data.filename,
            fileSize: data.file.length,
            timestamp: new Date(),
            ipAddress: socket.handshake.address
          };

          const savedMessage = await this.roomService.saveMessage(message);
          this.io.to(user.roomId).emit('message', savedMessage);

        } catch (error) {
          socket.emit('error', { message: 'Error uploading file' });
        }
      });

      // Escribiendo...
      socket.on('typing', (data: { isTyping: boolean }) => {
        const user = this.users.get(socket.id);
        if (!user) return;

        socket.to(user.roomId).emit('user_typing', {
          username: user.username,
          isTyping: data.isTyping
        });
      });

      // Desconexión
      socket.on('disconnect', async () => {
        const user = this.users.get(socket.id);
        if (user) {
          try {
            await this.roomService.leaveRoom(user.roomId, socket.id);
            
            const leaveMessage: Omit<ChatMessage, 'id'> = {
              roomId: user.roomId,
              userId: 'system',
              username: 'Sistema',
              type: 'text',
              content: `${user.username} ha abandonado la sala`,
              timestamp: new Date(),
              ipAddress: socket.handshake.address
            };

            const savedMessage = await this.roomService.saveMessage(leaveMessage);
            this.io.to(user.roomId).emit('message', savedMessage);

            const room = await this.roomService.getRoom(user.roomId);
            if (room) {
              this.io.to(user.roomId).emit('user_left', {
                username: user.username,
                userCount: room.userCount
              });
            }

            this.users.delete(socket.id);
          } catch (error) {
            console.error('Error handling disconnect:', error);
          }
        }

        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }
}