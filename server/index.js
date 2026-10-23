import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { app } from './app.js';

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: env.nodeEnv === 'production' ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }
});

/**
 * Socket.IO connection handler with strict room-level authorization.
 * - Public rooms (`dept:<departmentId>`, `display:board`) are allowed for queue status updates.
 * - Privileged rooms (`staff:emergency`, `staff:dept:<departmentId>`) require a verified staff session.
 * - Individual `ticket:<ticketId>` rooms are intentionally disabled unless capability-authenticated.
 */
io.on('connection', (socket) => {
  socket.on('join:department', (departmentId) => {
    if (typeof departmentId === 'string' && /^[a-z0-9_]{2,32}$/.test(departmentId)) {
      socket.join(`dept:${departmentId}`);
    }
  });

  socket.on('join:display-board', () => {
    socket.join('display:board');
  });

  socket.on('join:staff-room', (_payload, ack) => {
    const isStaffAuthenticated = Boolean(socket.request?.session?.staffUser);
    if (!isStaffAuthenticated) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'UNAUTHORIZED_STAFF_ROOM' });
      }
      return;
    }
    socket.join('staff:emergency');
    if (typeof ack === 'function') {
      ack({ ok: true });
    }
  });
});

server.listen(env.port, () => {
  console.log(
    `[opd-saathi] Server listening on http://localhost:${env.port} (env: ${env.nodeEnv})`
  );
});
