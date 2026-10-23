/**
 * Configures Socket.IO room subscriptions with strict capability and session authorisation.
 *
 * @param {import('socket.io').Server} io
 * @param {object} options
 * @param {object} options.queueService
 * @param {Function} [options.sessionMiddleware]
 */
export function configureSocketIo(io, { queueService, sessionMiddleware }) {
  if (sessionMiddleware) {
    io.engine.use(sessionMiddleware);
  }

  queueService.setIoEmitter(io);

  io.on('connection', (socket) => {
    /**
     * Public room for department queue invalidation hints (`queue:<departmentId>`)
     */
    socket.on('subscribe:queue', (payload = {}, ack) => {
      const departmentId =
        typeof payload === 'string' ? payload : payload?.departmentId;
      if (
        !departmentId ||
        typeof departmentId !== 'string' ||
        !/^[a-z0-9-]{2,64}$/i.test(departmentId.trim())
      ) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'INVALID_DEPARTMENT_ID' });
        }
        return;
      }
      const room = `queue:${departmentId.trim()}`;
      socket.join(room);
      if (typeof ack === 'function') {
        ack({ ok: true, room });
      }
    });

    /**
     * Public room for multi-department waiting board (`queue:all`)
     */
    socket.on('subscribe:public-board', (_payload, ack) => {
      socket.join('queue:all');
      if (typeof ack === 'function') {
        ack({ ok: true, room: 'queue:all' });
      }
    });

    /**
     * Capability-protected ticket room (`ticket:<ticketId>`).
     * Knowing ticketId alone is rejected; requires constant-time HMAC capability verification.
     */
    socket.on('subscribe:ticket', async (payload = {}, ack) => {
      try {
        const { ticketId, accessToken } = payload || {};
        if (!ticketId || !accessToken) {
          if (typeof ack === 'function') {
            ack({ ok: false, error: 'INVALID_TICKET_TOKEN' });
          }
          return;
        }

        const isAllowed = await queueService.verifyTicketCapability(
          String(ticketId).trim(),
          String(accessToken).trim()
        );

        if (!isAllowed) {
          if (typeof ack === 'function') {
            ack({ ok: false, error: 'INVALID_TICKET_TOKEN' });
          }
          return;
        }

        const room = `ticket:${String(ticketId).trim()}`;
        socket.join(room);
        if (typeof ack === 'function') {
          ack({ ok: true, room });
        }
      } catch {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'INTERNAL_ERROR' });
        }
      }
    });

    /**
     * Staff-only room (`staff:all` and optional `staff:<departmentId>`).
     * Requires a verified server-side staff session (`socket.request.session.isStaff === true`).
     */
    socket.on('subscribe:staff', (payload = {}, ack) => {
      const isStaff = Boolean(socket.request?.session?.isStaff === true);
      if (!isStaff) {
        socket.emit('unauthorized', {
          code: 'STAFF_AUTH_REQUIRED',
          message: 'Active staff session required to join staff rooms.'
        });
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'STAFF_AUTH_REQUIRED' });
        }
        return;
      }

      socket.join('staff:all');
      if (payload?.departmentId && typeof payload.departmentId === 'string') {
        socket.join(`staff:${payload.departmentId.trim()}`);
      }

      if (typeof ack === 'function') {
        ack({ ok: true, room: 'staff:all' });
      }
    });
  });

  return io;
}
