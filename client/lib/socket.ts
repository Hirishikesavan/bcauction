import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_SOCKET_URL ||
   process.env.NEXT_PUBLIC_API_URL    ||
   (typeof window !== 'undefined' && window.location.hostname.includes('railway.app') 
    ? 'https://beast-cricket-backend-production.up.railway.app' 
    : 'http://localhost:5000')).replace(/\/api$/, '');

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const getSocket = (): Socket => {
  // FIX: this used to destroy and recreate the socket (wiping every
  // listener every page/component had attached) any time getSocket() was
  // called while the socket existed but wasn't *currently* connected —
  // which includes the few hundred ms during the initial handshake, and
  // every moment during socket.io's own automatic reconnection attempts.
  // Multiple pages/components calling getSocket() (very normal — a layout
  // connection badge, the page itself, etc.) raced against each other:
  // whichever called it during that window nuked the in-flight socket and
  // every other component's listeners with it. That's why pages would
  // show "Connected" (the badge reflects the *new* socket's own connect
  // event) while never receiving auction events again — their listeners
  // were registered on a socket instance that no longer existed.
  // Socket.IO already has robust built-in reconnection (configured below)
  // — we only need to create a new instance if one doesn't exist yet, or
  // if it was explicitly torn down via disconnectSocket().
  if (socket) return socket;

  console.log(' Connecting to socket at:', SOCKET_URL);

  socket = io(SOCKET_URL, {
    withCredentials:      true,   // sends Better Auth session cookie
    transports:           ['websocket', 'polling'],
    reconnection:         true,
    reconnectionAttempts: 20,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 5000,
    timeout:              20000,
    forceNew:             false,
  });

  socket.on('connect', () => {
    console.log(' Socket connected:', socket?.id);
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  });

  socket.on('disconnect', (reason) => {
    console.log(' Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      reconnectTimer = setTimeout(() => { socket?.connect(); }, 2000);
    }
  });

  socket.on('connect_error', (err) => {
    console.error(' Socket error:', err.message);
  });

  return socket;
};

export const emit = (event: string, data?: any) => {
  const s = getSocket();
  if (s.connected) s.emit(event, data);
};

export const disconnectSocket = () => {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }
};
