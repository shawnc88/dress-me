import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  // If token changed (user logged out/in), disconnect old socket first
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }

  if (socket?.connected) return socket;

  currentToken = token;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
