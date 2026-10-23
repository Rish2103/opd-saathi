import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import http from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server as SocketIoServer } from 'socket.io';
import { io as createClientSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { configureSocketIo } from '../sockets/index.js';
import { createQueueService } from '../services/queueService.js';
import { TRANSLATIONS } from '../../src/i18n/translations.js';
import SlipView from '../../src/components/SlipView.jsx';
import MyTurnView from '../../src/components/MyTurnView.jsx';
import NavigationView from '../../src/components/NavigationView.jsx';
import EmergencyModal from '../../src/components/EmergencyModal.jsx';
import StaffView from '../../src/components/StaffView.jsx';
import App from '../../src/App.jsx';

describe('Phase 1 — Frontend UI Components & Bilingual Rendering', () => {
  const sampleSlip = {
    id: '11111111-1111-4111-8111-111111111111',
    publicCode: 'OPD-GEN-001',
    queueDate: '2026-10-24',
    sequenceNo: 1,
    queueSortOrder: 1,
    status: 'WAITING',
    visitType: 'FIRST_VISIT',
    preferredLang: 'en',
    avoidStairs: true,
    cancelReason: null,
    requeuedCount: 0,
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
    calledAt: null,
    consultationStartedAt: null,
    completedAt: null,
    department: {
      id: '11111111-1111-4111-8111-111111111101',
      slug: 'general-medicine',
      tokenPrefix: 'GEN',
      name_en: 'General Medicine',
      name_hi: 'सामान्य चिकित्सा (General Medicine)',
      doctor_name_en: 'Dr. Rajeshwar Rao',
      doctor_name_hi: 'डॉ. राजेश्वर राव',
      room_label: 'Room 204',
      floor_number: 2,
      destination_node_id: 'room_204_med',
      landmark_en: 'Opposite Second Floor Nursing Station',
      landmark_hi: 'दूसरी मंजिल नर्सिंग स्टेशन के सामने',
      average_consult_minutes: 10
    },
    queue: {
      peopleAheadWaiting: 2,
      nowServingCode: 'OPD-GEN-000',
      estimatedWaitMinutes: 30,
      etaStatus: 'ESTIMATED',
      doctorStatus: 'AVAILABLE',
      delayMinutes: 0
    },
    qrLookupPath: '/my-turn?code=OPD-GEN-001',
    route: {
      found: true,
      fromNodeId: 'registration_desk',
      toNodeId: 'room_204_med',
      avoidStairs: true,
      totalSteps: 4,
      totalDistanceScore: 5,
      steps: []
    }
  };

  it('renders App shell with persistent Emergency access bar and Assisted Mode toggle', () => {
    const html = renderToStaticMarkup(<App disableSockets={true} />);
    expect(html).toContain('OPD Saathi');
    expect(html).toContain('Emergency Help');
    expect(html).toContain('Large Text: OFF');
    expect(html).toContain('data-testid="persistent-emergency-btn"');
    expect(html).toContain('data-testid="assisted-mode-toggle"');
  });

  it('renders Digital OPD Slip (SlipView) in English and Hindi with QR code and actions', () => {
    const htmlEn = renderToStaticMarkup(
      <SlipView
        lang="en"
        t={TRANSLATIONS.en}
        slip={sampleSlip}
        onOpenMyTurn={() => {}}
        onOpenDirections={() => {}}
        onRegisterNew={() => {}}
      />
    );
    expect(htmlEn).toContain('OPD-GEN-001');
    expect(htmlEn).toContain('General Medicine');
    expect(htmlEn).toContain('Room 204');
    expect(htmlEn).toContain('Dr. Rajeshwar Rao');
    expect(htmlEn).toContain('Read Slip Aloud');
    expect(htmlEn).toContain('Print Slip');
    expect(htmlEn).toContain('<svg'); // QRCodeSVG rendered

    const htmlHi = renderToStaticMarkup(
      <SlipView
        lang="hi"
        t={TRANSLATIONS.hi}
        slip={sampleSlip}
        onOpenMyTurn={() => {}}
        onOpenDirections={() => {}}
        onRegisterNew={() => {}}
      />
    );
    expect(htmlHi).toContain('OPD-GEN-001');
    expect(htmlHi).toContain('पर्ची बोलकर सुनाएं');
    expect(htmlHi).toContain('पर्ची प्रिंट करें');
  });

  it('renders MyTurnView with <= 3 people ahead alert banner and CALLED banner', () => {
    const htmlNearTurn = renderToStaticMarkup(
      <MyTurnView
        lang="en"
        t={TRANSLATIONS.en}
        lookupCode="OPD-GEN-001"
        setLookupCode={() => {}}
        trackedSlip={sampleSlip}
        loading={false}
        error={null}
        lastVerifiedAt="10:30:00 AM"
        connectionState="live"
        savedLocalSlip={sampleSlip}
        onLookupCode={() => {}}
        onOpenDirections={() => {}}
      />
    );
    expect(htmlNearTurn).toContain('data-testid="turn-alert-banner"');
    expect(htmlNearTurn).toContain('GET READY — YOUR TURN IS APPROACHING!');
    expect(htmlNearTurn).toContain('Live Updates Active');

    const calledSlip = {
      ...sampleSlip,
      status: 'CALLED',
      queue: { ...sampleSlip.queue, peopleAheadWaiting: 0 }
    };
    const htmlCalled = renderToStaticMarkup(
      <MyTurnView
        lang="en"
        t={TRANSLATIONS.en}
        lookupCode="OPD-GEN-001"
        setLookupCode={() => {}}
        trackedSlip={calledSlip}
        loading={false}
        error={null}
        lastVerifiedAt="10:31:00 AM"
        connectionState="live"
        savedLocalSlip={calledSlip}
        onLookupCode={() => {}}
        onOpenDirections={() => {}}
      />
    );
    expect(htmlCalled).toContain('data-testid="turn-alert-banner"');
    expect(htmlCalled).toContain('IT IS YOUR TURN NOW!');
  });

  it('renders NavigationView with 3-floor accessible pathfinding and Avoid Stairs support', () => {
    const htmlNav = renderToStaticMarkup(
      <NavigationView
        lang="en"
        t={TRANSLATIONS.en}
        routeQuery={{
          fromNodeId: 'registration_desk',
          toNodeId: 'room_204_med',
          avoidStairs: true
        }}
        setRouteQuery={() => {}}
      />
    );
    expect(htmlNav).toContain('Indoor Hospital Directions (3 Floors)');
    expect(htmlNav).toContain('Avoid Stairs — Use Lift &amp; Ramp Only');
    expect(htmlNav).toContain('Take the Main Patient Lift up from Floor 1 (Ground) to Floor 2.');
    expect(htmlNav).toContain('Room 204 (General Medicine OPD)');
    expect(htmlNav).not.toContain('Climb the Central Staircase');
  });

  it('renders EmergencyModal with pre-registration access, 108/112 numbers, and non-diagnostic disclaimer', () => {
    const htmlModal = renderToStaticMarkup(
      <EmergencyModal
        dialogRef={{ current: null }}
        lang="en"
        t={TRANSLATIONS.en}
        onClose={() => {}}
        onNavigateToEmergency={() => {}}
      />
    );
    expect(htmlModal).toContain('Medical Emergency &amp; Immediate Help');
    expect(htmlModal).toContain('tel:108');
    expect(htmlModal).toContain('tel:112');
    expect(htmlModal).toContain('Show Route to Emergency (Room 101)');
    expect(htmlModal).toContain('Request Staff Help Now');
    expect(htmlModal).toContain('does NOT automatically reorder the medical queue');
  });

  it('renders StaffView PIN login screen when unauthenticated and queue controls when authenticated', () => {
    const htmlLogin = renderToStaticMarkup(
      <StaffView
        lang="en"
        t={TRANSLATIONS.en}
        departments={[]}
        staffAuth={{ authenticated: false, loginAt: null }}
        setStaffAuth={() => {}}
        socketRef={{ current: null }}
      />
    );
    expect(htmlLogin).toContain('Staff PIN Authentication');

    const htmlAuthenticated = renderToStaticMarkup(
      <StaffView
        lang="en"
        t={TRANSLATIONS.en}
        departments={[sampleSlip.department]}
        staffAuth={{ authenticated: true, loginAt: '2026-10-24T00:00:00.000Z' }}
        setStaffAuth={() => {}}
        socketRef={{ current: null }}
      />
    );
    expect(htmlAuthenticated).toContain('OPD Staff Queue &amp; Triage Desk');
    expect(htmlAuthenticated).toContain('Call Next Waiting Patient');
    expect(htmlAuthenticated).toContain('Doctor Availability &amp; Delay Broadcast');
  });
});

describe('Phase 1 — End-to-End HTTP + Socket.IO Realtime Verification', () => {
  let server;
  let ioServer;
  let baseUrl;
  let clientSockets = [];

  beforeEach(async () => {
    const queueService = createQueueService({
      getHospitalDateIST: () => '2026-10-24'
    });
    const app = createApp({
      queueService,
      disableRateLimits: true
    });
    server = http.createServer(app);
    ioServer = new SocketIoServer(server, {
      cors: { origin: true, credentials: true }
    });
    configureSocketIo(ioServer, {
      queueService,
      sessionMiddleware: app.locals.sessionMiddleware
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    for (const s of clientSockets) {
      if (s.connected) s.disconnect();
    }
    clientSockets = [];
    if (ioServer) ioServer.close();
    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  function connectSocket() {
    return new Promise((resolve, reject) => {
      const socket = createClientSocket(baseUrl, {
        transports: ['websocket'],
        forceNew: true
      });
      clientSockets.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  }

  it('broadcasts queue.updated and ticket.updated over Socket.IO across the full patient & staff flow', async () => {
    const socket = await connectSocket();

    // 1. Subscribe to General Medicine department room
    const deptId = '11111111-1111-4111-8111-111111111101';
    const deptJoinAck = await new Promise((resolve) => {
      socket.emit('subscribe:queue', { departmentId: deptId }, resolve);
    });
    expect(deptJoinAck.ok).toBe(true);

    // 2. Listen for queue.updated when a patient registers
    const queueCreatedPromise = new Promise((resolve) => {
      socket.once('queue.updated', resolve);
    });

    const regRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777777',
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true
      })
    });
    expect(regRes.status).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.ticket.publicCode).toBe('OPD-GEN-001');

    const createdEvent = await queueCreatedPromise;
    expect(createdEvent.departmentId).toBe(deptId);
    expect(createdEvent.eventType).toBe('TICKET_CREATED');

    // 3. Subscribe to private ticket room with valid capability token
    const goodTicketAck = await new Promise((resolve) => {
      socket.emit(
        'subscribe:ticket',
        { ticketId: regBody.ticket.id, accessToken: regBody.accessToken },
        resolve
      );
    });
    expect(goodTicketAck.ok).toBe(true);

    // 4. Staff logs in and calls next patient -> patient receives ticket.updated
    const loginRes = await fetch(`${baseUrl}/api/staff/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers.get('set-cookie');

    const ticketUpdatedPromise = new Promise((resolve) => {
      socket.once('ticket.updated', resolve);
    });

    const callNextRes = await fetch(
      `${baseUrl}/api/staff/queues/general-medicine/call-next`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader
        },
        body: JSON.stringify({})
      }
    );
    expect(callNextRes.status).toBe(200);

    const updatedEvent = await ticketUpdatedPromise;
    expect(updatedEvent.ticketId).toBe(regBody.ticket.id);
    expect(updatedEvent.status).toBe('CALLED');
  });
});
