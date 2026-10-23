import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { app } from './app.js';
import { configureSocketIo } from './sockets/index.js';

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin:
      env.nodeEnv === 'production'
        ? false
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }
});

configureSocketIo(io, {
  queueService: app.locals.queueService,
  sessionMiddleware: app.locals.sessionMiddleware
});

server.listen(env.port, () => {
  console.log(
    `[opd-saathi] Server listening on http://localhost:${env.port} (env: ${env.nodeEnv})`
  );
});
