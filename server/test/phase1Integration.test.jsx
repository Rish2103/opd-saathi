import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server as SocketIoServer } from 'socket.io';
import { io as createClientSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { configureSocketIo } from '../sockets/index.js';
import { createQueueService } from '../services/queueService.js';
import { TRANSLATIONS } from '../../src/i18n/translations.js';
import tailwindConfig from '../../tailwind.config.js';
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

  it('renders MyTurnView empty state when no token is loaded yet', () => {
    const htmlEmpty = renderToStaticMarkup(
      <MyTurnView
        lang="en"
        t={TRANSLATIONS.en}
        lookupCode=""
        setLookupCode={() => {}}
        trackedSlip={null}
        loading={false}
        error={null}
        lastVerifiedAt={null}
        connectionState="live"
        savedLocalSlip={null}
        onLookupCode={() => {}}
        onRegisterNew={() => {}}
        onOpenDirections={() => {}}
      />
    );
    expect(htmlEmpty).toContain('data-testid="my-turn-empty-state"');
    expect(htmlEmpty).toContain('No OPD Token Loaded Yet');
    expect(htmlEmpty).toContain('data-testid="my-turn-empty-register-btn"');
  });

  it('prevents white-on-white or blank buttons across all views and defines all Tailwind design tokens', () => {
    const colors = tailwindConfig?.theme?.extend?.colors || {};
    expect(colors.brand?.primary).toBe('#0B2545');
    expect(colors.brand?.teal).toBe('#0D6E6E');
    expect(colors.status?.serving).toBe('#15803D');
    expect(colors.status?.next).toBe('#B45309');
    expect(colors.status?.emergency).toBe('#B91C1C');
    expect(colors['border-strong']).toBe('#94A3B8');
    expect(tailwindConfig?.theme?.extend?.boxShadow?.card).toBeTruthy();

    // Check compiled CSS bundle if dist/assets exists
    const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const cssFiles = fs
        .readdirSync(distAssetsDir)
        .filter((file) => file.endsWith('.css'));
      if (cssFiles.length > 0) {
        const cssContent = fs.readFileSync(
          path.join(distAssetsDir, cssFiles[0]),
          'utf8'
        );
        expect(cssContent).toContain('.bg-brand-primary{');
        expect(cssContent).toContain('.text-brand-primary{');
        expect(cssContent).toContain('.border-brand-primary{');
        expect(cssContent).toContain('.bg-status-serving{');
        expect(cssContent).toContain('.text-status-serving{');
        expect(cssContent).toContain('.bg-status-next{');
        expect(cssContent).toContain('.border-border-strong{');
        expect(cssContent).toContain('.shadow-card{');
      }
    }

    // Render all major views in EN & HI and verify every <button> has visible text and valid contrast classes
    const viewsHtml = [
      renderToStaticMarkup(<App disableSockets={true} />),
      renderToStaticMarkup(
        <SlipView
          lang="en"
          t={TRANSLATIONS.en}
          slip={sampleSlip}
          onOpenMyTurn={() => {}}
          onOpenDirections={() => {}}
          onRegisterNew={() => {}}
        />
      ),
      renderToStaticMarkup(
        <MyTurnView
          lang="hi"
          t={TRANSLATIONS.hi}
          lookupCode="OPD-GEN-001"
          setLookupCode={() => {}}
          trackedSlip={sampleSlip}
          loading={false}
          error={null}
          lastVerifiedAt="10:30:00 AM"
          connectionState="live"
          savedLocalSlip={sampleSlip}
          onLookupCode={() => {}}
          onRegisterNew={() => {}}
          onOpenDirections={() => {}}
        />
      ),
      renderToStaticMarkup(
        <NavigationView
          lang="hi"
          t={TRANSLATIONS.hi}
          routeQuery={{
            fromNodeId: 'registration_desk',
            toNodeId: 'room_204_med',
            avoidStairs: true
          }}
          setRouteQuery={() => {}}
        />
      ),
      renderToStaticMarkup(
        <StaffView
          lang="en"
          t={TRANSLATIONS.en}
          departments={[sampleSlip.department]}
          staffAuth={{ authenticated: true, loginAt: '2026-10-24T00:00:00.000Z' }}
          setStaffAuth={() => {}}
          socketRef={{ current: null }}
        />
      ),
      renderToStaticMarkup(
        <EmergencyModal
          dialogRef={{ current: null }}
          lang="hi"
          t={TRANSLATIONS.hi}
          onClose={() => {}}
          onNavigateToEmergency={() => {}}
        />
      )
    ];

    const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    for (const html of viewsHtml) {
      let match;
      while ((match = buttonRegex.exec(html)) !== null) {
        const attrs = match[1] || '';
        const innerHtml = match[2] || '';
        const textContent = innerHtml.replace(/<[^>]+>/g, '').trim();
        expect(textContent.length).toBeGreaterThan(0);

        // Ensure no button has a light surface background paired with white text
        const hasLightBg = /\bbg-(white|surface|canvas|subtle)\b/.test(attrs);
        const hasWhiteText = /\btext-white\b/.test(attrs);
        expect(hasLightBg && hasWhiteText).toBe(false);
      }
    }
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

  it('completes the full 12-step patient, staff, emergency, navigation, and edge-case workflow', async () => {
    const socket = await connectSocket();

    // Step 10 (Pre-Registration): Patient triggers Emergency Help BEFORE registering a ticket
    const preRegHelpRes = await fetch(`${baseUrl}/api/help-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationLabel: 'Main Entrance & Ramp',
        requestType: 'URGENT_ASSESSMENT_REQUEST'
      })
    });
    expect(preRegHelpRes.status).toBe(201);
    const preRegHelpBody = await preRegHelpRes.json();
    expect(preRegHelpBody.helpRequest.status).toBe('NEW');
    expect(preRegHelpBody.helpRequest.ticket_id).toBeNull();

    // Step 1: Check initial public board (empty queue state)
    const initialBoardRes = await fetch(`${baseUrl}/api/queues/public-board`);
    expect(initialBoardRes.status).toBe(200);
    const initialBoard = await initialBoardRes.json();
    expect(initialBoard.queues.every((q) => q.waitingCount === 0)).toBe(true);

    // Step 3 & 4: Register two patients in General Medicine
    const p1Res = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '88888888-8888-4888-8888-888888888801',
        departmentId: 'general-medicine',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true
      })
    });
    expect(p1Res.status).toBe(201);
    const p1 = await p1Res.json();
    expect(p1.ticket.publicCode).toBe('OPD-GEN-001');

    const p2Res = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '88888888-8888-4888-8888-888888888802',
        departmentId: 'general-medicine',
        visitType: 'FOLLOW_UP',
        preferredLang: 'hi',
        avoidStairs: false
      })
    });
    expect(p2Res.status).toBe(201);
    const p2 = await p2Res.json();
    expect(p2.ticket.publicCode).toBe('OPD-GEN-002');

    // Step 5: Verify QR lookup path contains only publicCode and never leaks accessToken
    expect(p1.ticket.qrLookupPath).toBe('/my-turn?code=OPD-GEN-001');
    expect(p1.ticket.qrLookupPath).not.toContain(p1.accessToken);

    // Step 6 & 7: Separate-session public lookup without cookies or capability headers
    const slipLookupRes = await fetch(`${baseUrl}/api/slips/OPD-GEN-002`);
    expect(slipLookupRes.status).toBe(200);
    const slipLookup = await slipLookupRes.json();
    expect(slipLookup.slip.publicCode).toBe('OPD-GEN-002');
    expect(slipLookup.slip.queue.peopleAheadWaiting).toBe(1);
    expect(slipLookup.slip.queue.estimatedWaitMinutes).toBeGreaterThan(0);
    expect(slipLookup.slip.route.found).toBe(true);
    expect(slipLookup.slip.accessToken).toBeUndefined();

    // Step 11: Toggle Avoid Stairs in navigation and verify route changes between stairs and lift
    const routeStairsRes = await fetch(
      `${baseUrl}/api/routes?from=registration_desk&to=room_204_med&avoidStairs=false`
    );
    const routeStairs = await routeStairsRes.json();
    expect(routeStairs.route.found).toBe(true);
    expect(routeStairs.route.steps.some((s) => s.mode === 'stairs')).toBe(true);

    const routeLiftRes = await fetch(
      `${baseUrl}/api/routes?from=registration_desk&to=room_204_med&avoidStairs=true`
    );
    const routeLift = await routeLiftRes.json();
    expect(routeLift.route.found).toBe(true);
    expect(routeLift.route.steps.some((s) => s.mode === 'lift')).toBe(true);
    expect(routeLift.route.steps.some((s) => s.mode === 'stairs')).toBe(false);

    // Step 8 & 9: Staff PIN login, queue state transitions, requeue to tail, and help request resolution
    const badLoginRes = await fetch(`${baseUrl}/api/staff/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000' })
    });
    expect(badLoginRes.status).toBe(401);

    const staffLoginRes = await fetch(`${baseUrl}/api/staff/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    expect(staffLoginRes.status).toBe(200);
    const staffCookie = staffLoginRes.headers.get('set-cookie');

    // Call Next -> calls OPD-GEN-001
    const call1Res = await fetch(
      `${baseUrl}/api/staff/queues/general-medicine/call-next`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(call1Res.status).toBe(200);

    // Mark OPD-GEN-001 as NO_SHOW, then Requeue to Tail (places it behind OPD-GEN-002!)
    const noShowRes = await fetch(
      `${baseUrl}/api/staff/tickets/${p1.ticket.id}/no-show`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(noShowRes.status).toBe(200);

    const requeueRes = await fetch(
      `${baseUrl}/api/staff/tickets/${p1.ticket.id}/requeue`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(requeueRes.status).toBe(200);
    const requeuedTicket = (await requeueRes.json()).ticket;
    expect(requeuedTicket.status).toBe('WAITING');
    expect(requeuedTicket.requeuedCount).toBe(1);
    expect(requeuedTicket.queue.peopleAheadWaiting).toBe(1); // Now behind OPD-GEN-002

    // Call Next -> now calls OPD-GEN-002, then Start Consultation -> Complete
    const call2Res = await fetch(
      `${baseUrl}/api/staff/queues/general-medicine/call-next`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(call2Res.status).toBe(200);
    const called2 = (await call2Res.json()).ticket;
    expect(called2.publicCode).toBe('OPD-GEN-002');

    const startRes = await fetch(
      `${baseUrl}/api/staff/tickets/${p2.ticket.id}/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(startRes.status).toBe(200);

    const completeRes = await fetch(
      `${baseUrl}/api/staff/tickets/${p2.ticket.id}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(completeRes.status).toBe(200);

    // Step 12: Doctor status UNAVAILABLE -> ETA status becomes UNAVAILABLE_ASK_HELP_DESK
    const docStatusRes = await fetch(
      `${baseUrl}/api/staff/departments/general-medicine/doctor-status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({ status: 'UNAVAILABLE', delayMinutes: 0 })
      }
    );
    expect(docStatusRes.status).toBe(200);

    const p1AfterDocUnavailable = await (
      await fetch(`${baseUrl}/api/slips/OPD-GEN-001`)
    ).json();
    expect(p1AfterDocUnavailable.slip.queue.etaStatus).toBe(
      'UNAVAILABLE_ASK_HELP_DESK'
    );
    expect(p1AfterDocUnavailable.slip.queue.estimatedWaitMinutes).toBeNull();

    // Acknowledge and Resolve pre-registration help request
    const ackHelpRes = await fetch(
      `${baseUrl}/api/staff/urgent-flags/${preRegHelpBody.helpRequest.id}/acknowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(ackHelpRes.status).toBe(200);

    const resolveHelpRes = await fetch(
      `${baseUrl}/api/staff/urgent-flags/${preRegHelpBody.helpRequest.id}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
        body: JSON.stringify({})
      }
    );
    expect(resolveHelpRes.status).toBe(200);

    socket.disconnect();
  });
});
