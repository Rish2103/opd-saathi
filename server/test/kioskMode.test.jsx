import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import http from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { createQueueService } from '../services/queueService.js';
import {
  KIOSK_TRANSLATIONS,
  getKioskTranslations
} from '../../src/i18n/kioskTranslations.js';
import KioskModeView, {
  DEFAULT_KIOSK_TIMEOUT_SEC,
  KIOSK_PENDING_REG_KEY,
  normalizeKioskPhone,
  validateKioskPatientInput
} from '../../src/components/KioskModeView.jsx';
import App, { STORAGE_SAVED_SLIPS_KEY } from '../../src/App.jsx';

describe('Phase 2.7 — Self-Service Patient Kiosk Mode (/kiosk)', () => {
  let server;
  let baseUrl;
  let queueService;
  let realDepartments = [];
  let realNodes = [];

  beforeEach(async () => {
    queueService = createQueueService({ forceInMemory: true });
    const app = createApp({
      queueService,
      disableRateLimits: true
    });
    server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const [deptRes, nodesRes] = await Promise.all([
      fetch(`${baseUrl}/api/departments`),
      fetch(`${baseUrl}/api/routes/nodes`)
    ]);
    const deptData = await deptRes.json();
    const nodesData = await nodesRes.json();
    realDepartments = deptData.departments;
    realNodes = nodesData.nodes;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Kiosk route rendering
  it('1. renders dedicated /kiosk entry point via App routing while keeping normal application intact', () => {
    const kioskHtml = renderToStaticMarkup(
      <App
        disableSockets={true}
        initialView="kiosk"
        initialDepartments={realDepartments}
      />
    );
    expect(kioskHtml).toContain('data-testid="kiosk-mode-root"');
    expect(kioskHtml).toContain('data-testid="kiosk-welcome-screen"');
    expect(kioskHtml).toContain('Welcome to OPD Saathi');
    expect(kioskHtml).toContain('Start OPD Registration');

    // Verify normal OPD Saathi application continues to work identically
    const normalHtml = renderToStaticMarkup(
      <App
        disableSockets={true}
        initialView="home"
        initialDepartments={realDepartments}
      />
    );
    expect(normalHtml).toContain('data-testid="persistent-emergency-btn"');
    expect(normalHtml).toContain('data-testid="assisted-mode-toggle"');
    expect(normalHtml).not.toContain('data-testid="kiosk-mode-root"');
  });

  // 2. Welcome screen elements
  it('2. renders Kiosk Welcome Screen with brand logo, native language cards, primary Start Registration CTA, secondary Check Token action, accessibility control, and Emergency Help without staff dashboard clutter', () => {
    const html = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="welcome"
        initialDepartments={realDepartments}
        initialNodes={realNodes}
        onExitKiosk={() => {}}
      />
    );

    // Brand Logo & Wordmark + Friendly Welcome Heading
    expect(html).toContain('data-testid="kiosk-brand-header"');
    expect(html).toContain('OPD Saathi');
    expect(html).toContain('Welcome to OPD Saathi');

    // Prominent native-script language selection controls
    expect(html).toContain('data-testid="kiosk-welcome-lang-en"');
    expect(html).toContain('data-testid="kiosk-welcome-lang-hi"');
    expect(html).toContain('data-testid="kiosk-welcome-lang-ta"');
    expect(html).toContain('English');
    expect(html).toContain('हिन्दी');
    expect(html).toContain('தமிழ்');

    // Primary & secondary actions
    expect(html).toContain('data-testid="kiosk-start-registration-btn"');
    expect(html).toContain('Start OPD Registration');
    expect(html).toContain('data-testid="kiosk-check-token-btn"');
    expect(html).toContain('Check Existing Token Status');

    // Permanently accessible Emergency Help & unobtrusive accessibility toggle
    expect(html).toContain('data-testid="kiosk-emergency-btn"');
    expect(html).toContain('data-testid="kiosk-assisted-toggle"');

    // Authorised staff exit button & browser kiosk limitation note
    expect(html).toContain('data-testid="kiosk-staff-exit-btn"');
    expect(html).toContain(
      'Browser Kiosk Notice: This web terminal automatically clears session memory'
    );
  });

  // 3. Language switching across English, Hindi and Tamil
  it('3. supports full trilingual rendering across English (en), Hindi (hi), and Tamil (ta) in native scripts', () => {
    expect(Object.keys(KIOSK_TRANSLATIONS)).toEqual(['en', 'hi', 'ta']);

    const enHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="welcome"
        initialDepartments={realDepartments}
      />
    );
    expect(enHtml).toContain('Welcome to OPD Saathi');
    expect(enHtml).toContain('Start OPD Registration');

    const hiHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="hi"
        initialScreen="welcome"
        initialDepartments={realDepartments}
      />
    );
    expect(hiHtml).toContain('ओपीडी साथी (OPD Saathi) में आपका स्वागत है');
    expect(hiHtml).toContain('ओपीडी पंजीकरण शुरू करें');
    expect(hiHtml).toContain('font-devanagari');

    const taHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="ta"
        initialScreen="welcome"
        initialDepartments={realDepartments}
      />
    );
    expect(taHtml).toContain('ஓபிடி சாத்தி (OPD Saathi)-க்கு வரவேற்கிறோம்');
    expect(taHtml).toContain('ஓபிடி பதிவைத் தொடங்குக');
    expect(taHtml).toContain('font-tamil');
  });

  // 4. Department selection cards
  it('4. displays Step 1 Department Selection cards using actual active departments from the API with department name, doctor, room, floor, and landmark in all 3 languages', () => {
    expect(realDepartments.length).toBeGreaterThanOrEqual(4);
    const genDept = realDepartments.find((d) => d.slug === 'general-medicine');
    expect(genDept).toBeTruthy();

    const step1EnHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="register"
        initialRegStep={1}
        initialDepartments={realDepartments}
      />
    );
    expect(step1EnHtml).toContain('data-testid="kiosk-step-1"');
    expect(step1EnHtml).toContain('data-testid="kiosk-dept-card-general-medicine"');
    expect(step1EnHtml).toContain(genDept.name_en);
    expect(step1EnHtml).toContain(genDept.doctor_name_en);
    expect(step1EnHtml).toContain(genDept.room_label);
    expect(step1EnHtml).toContain('Floor 2');
    expect(step1EnHtml).toContain(genDept.landmark_en);
    expect(step1EnHtml).toContain('data-testid="kiosk-step1-continue-btn"');

    const step1TaHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="ta"
        initialScreen="register"
        initialRegStep={1}
        initialDepartments={realDepartments}
      />
    );
    expect(step1TaHtml).toContain('பொது மருத்துவம் (General Medicine)');
    expect(step1TaHtml).toContain('டாக்டர் ஏ. கே. வர்மா (முதுநிலை மருத்துவர்)');
    expect(step1TaHtml).toContain('Room 204');
  });

  // 5. Patient details form validation
  it('5. validates Step 2 Patient Details inputs (full name, Indian mobile normalization, age, gender with decline option, visit type, optional UHID, avoid stairs)', () => {
    const tEn = getKioskTranslations('en');
    const tHi = getKioskTranslations('hi');
    const tTa = getKioskTranslations('ta');

    // Phone normalization
    expect(normalizeKioskPhone('9876543210')).toBe('9876543210');
    expect(normalizeKioskPhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizeKioskPhone('09876543210')).toBe('9876543210');
    expect(normalizeKioskPhone('12345')).toBeNull();

    // Invalid inputs produce localized errors in en, hi, ta
    const invalidEn = validateKioskPatientInput(
      { patientName: 'A', phone: '123', age: '150' },
      tEn
    );
    expect(invalidEn.patientName).toBeTruthy();
    expect(invalidEn.phone).toBeTruthy();
    expect(invalidEn.age).toBeTruthy();

    const invalidHi = validateKioskPatientInput(
      { patientName: '', phone: 'bad', age: '-5' },
      tHi
    );
    expect(invalidHi.patientName).toContain('मरीज का पूरा नाम');

    const invalidTa = validateKioskPatientInput(
      { patientName: '', phone: 'bad', age: '' },
      tTa
    );
    expect(invalidTa.patientName).toContain('நோயாளியின் முழுப் பெயரை');

    // Valid inputs pass without errors
    const valid = validateKioskPatientInput(
      { patientName: 'Lakshmi Narayanan', phone: '9876543210', age: '58' },
      tEn
    );
    expect(Object.keys(valid)).toHaveLength(0);

    // Render Step 2 with validation error alerts and all required fields
    const step2Html = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="register"
        initialRegStep={2}
        initialDepartments={realDepartments}
        initialFieldErrors={invalidEn}
      />
    );
    expect(step2Html).toContain('data-testid="kiosk-step-2"');
    expect(step2Html).toContain('data-testid="kiosk-patient-name-input"');
    expect(step2Html).toContain('data-testid="kiosk-phone-input"');
    expect(step2Html).toContain('data-testid="kiosk-age-input"');
    expect(step2Html).toContain('data-testid="kiosk-gender-select"');
    expect(step2Html).toContain(tEn.register.genderDecline);
    expect(step2Html).toContain('data-testid="kiosk-visit-type-FIRST_VISIT"');
    expect(step2Html).toContain('data-testid="kiosk-visit-type-FOLLOW_UP"');
    expect(step2Html).toContain('data-testid="kiosk-uhid-input"');
    expect(step2Html).toContain('data-testid="kiosk-avoid-stairs-checkbox"');
    expect(step2Html).toContain('data-testid="kiosk-error-patient-name"');
    expect(step2Html).toContain('data-testid="kiosk-error-phone"');
    expect(step2Html).toContain('data-testid="kiosk-error-age"');
  });

  // 6. Review and confirmation flow
  it('6. renders Step 3 Review & Confirmation summary with masked phone, department, doctor, room, visit type, accessibility preference, and Confirm & Generate OPD Slip button', () => {
    const tEn = getKioskTranslations('en');
    const genDept = realDepartments.find((d) => d.slug === 'general-medicine');
    const step3Html = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="register"
        initialRegStep={3}
        initialDepartments={realDepartments}
        initialPatientName="Meenakshi Sundaram"
        initialPhone="9876543210"
        initialAge="64"
        initialGender="FEMALE"
        initialVisitType="FOLLOW_UP"
        initialAvoidStairs={true}
      />
    );

    expect(step3Html).toContain('data-testid="kiosk-step-3"');
    expect(step3Html).toContain('data-testid="kiosk-review-summary"');
    expect(step3Html).toContain('Meenakshi Sundaram');
    expect(step3Html).toContain('******3210');
    expect(step3Html).toContain('64 yrs');
    expect(step3Html).toContain(genDept.name_en);
    expect(step3Html).toContain(genDept.doctor_name_en);
    expect(step3Html).toContain(genDept.room_label);
    expect(step3Html).toContain('Follow-Up Visit');
    expect(step3Html).toContain(tEn.slip.routeAvoidStairs);
    expect(step3Html).toContain('data-testid="kiosk-confirm-submit-btn"');
    expect(step3Html).toContain('Confirm &amp; Generate OPD Slip');
  });

  // 7 & 8. Successful registration using the real backend API + Duplicate active-ticket handling
  it('7 & 8. registers a patient through the real POST /api/tickets endpoint and handles 409 DUPLICATE_ACTIVE_TICKET by offering to reopen the existing ticket', async () => {
    const createRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777701',
        departmentId: 'general-medicine',
        patientName: 'Anwar Hussain',
        phone: '9876501234',
        age: 49,
        gender: 'MALE',
        visitType: 'FIRST_VISIT',
        preferredLang: 'hi',
        avoidStairs: true
      })
    });
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    expect(createdBody.ticket.publicCode).toBe('OPD-GEN-001');
    expect(createdBody.ticket.patientSummary.fullName).toBe('Anwar Hussain');

    // Attempt a second registration with same patient + department + new requestId -> 409 DUPLICATE_ACTIVE_TICKET
    const dupRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777702',
        departmentId: 'general-medicine',
        patientName: 'Anwar Hussain',
        phone: '9876501234',
        age: 49,
        gender: 'MALE',
        visitType: 'FIRST_VISIT',
        preferredLang: 'hi',
        avoidStairs: true
      })
    });
    expect(dupRes.status).toBe(409);
    const dupBody = await dupRes.json();
    expect(dupBody.error.code).toBe('DUPLICATE_ACTIVE_TICKET');
    const existingTicket = dupBody.error.details.existingTicket;
    expect(existingTicket.publicCode).toBe('OPD-GEN-001');

    // Render Kiosk Step 3 with the real duplicate ticket info -> offers to reopen existing ticket
    const dupBannerHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="register"
        initialRegStep={3}
        initialDepartments={realDepartments}
        initialPatientName="Anwar Hussain"
        initialPhone="9876501234"
        initialAge="49"
        initialDuplicateTicket={existingTicket}
      />
    );
    expect(dupBannerHtml).toContain('data-testid="kiosk-duplicate-banner"');
    expect(dupBannerHtml).toContain('data-testid="kiosk-open-duplicate-btn"');
    expect(dupBannerHtml).toContain('OPD-GEN-001');
  });

  // 9 & 10. Confirmed slip rendering, QR payload safety, and Print action trigger
  it('9 & 10. renders the confirmed OPD slip from a real backend ticket with QR payload containing only the public lookup URL (zero capability token / zero PII) and Print Slip action', async () => {
    const createRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777703',
        departmentId: 'orthopaedics',
        patientName: 'Kavitha Krishnan',
        phone: '9444012345',
        age: 52,
        gender: 'FEMALE',
        visitType: 'FIRST_VISIT',
        preferredLang: 'ta',
        avoidStairs: true
      })
    });
    expect(createRes.status).toBe(201);
    const { ticket, accessToken } = await createRes.json();
    expect(ticket.publicCode).toBe('OPD-ORT-001');
    expect(accessToken).toBeTruthy();

    const slipHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="ta"
        initialScreen="slip"
        initialDepartments={realDepartments}
        initialSlip={ticket}
      />
    );

    // Genuine token number, private kiosk patient name, department, doctor, room, queue metrics
    expect(slipHtml).toContain('data-testid="kiosk-slip-screen"');
    expect(slipHtml).toContain('data-testid="kiosk-slip-public-code"');
    expect(slipHtml).toContain('OPD-ORT-001');
    expect(slipHtml).toContain('data-testid="kiosk-slip-patient-name"');
    expect(slipHtml).toContain('Kavitha Krishnan');
    expect(slipHtml).toContain('எலும்பு மற்றும் மூட்டு சிகிச்சை (Orthopaedics)');
    expect(slipHtml).toContain(ticket.department.room_label);
    expect(slipHtml).toContain('data-testid="kiosk-slip-qr"');
    expect(slipHtml).toContain('<svg');
    expect(slipHtml).toContain('/?code=OPD-ORT-001');

    // Print and Finish buttons
    expect(slipHtml).toContain('data-testid="kiosk-print-slip-btn"');
    expect(slipHtml).toContain('data-testid="kiosk-finish-session-btn"');
    expect(slipHtml).toContain('data-testid="kiosk-new-registration-btn"');

    // Critical privacy guarantee: capability token and phone number never appear in rendered slip or QR
    expect(slipHtml).not.toContain(accessToken);
    expect(slipHtml).not.toContain('9444012345');
    expect(ticket.qrLookupPath).toBe('/my-turn?code=OPD-ORT-001');
  });

  // 11, 12 & 13. Manual session finish, idle timeout warning & reset, and preservation of server ticket
  it('11, 12 & 13. displays inactivity timeout warning with Continue Session and Reset Now actions, isolates kiosk from localStorage, and preserves server-generated ticket after kiosk reset', async () => {
    expect(DEFAULT_KIOSK_TIMEOUT_SEC).toBe(180); // 3 minutes default
    expect(KIOSK_PENDING_REG_KEY).not.toBe(STORAGE_SAVED_SLIPS_KEY);

    // Create a real ticket on the server
    const createRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777704',
        departmentId: 'general-medicine',
        patientName: 'Suresh Nair',
        phone: '9811122233',
        age: 67,
        gender: 'MALE',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true
      })
    });
    expect(createRes.status).toBe(201);
    const { ticket } = await createRes.json();

    // Render Kiosk with active timeout warning modal
    const warningHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="slip"
        initialDepartments={realDepartments}
        initialSlip={ticket}
        initialTimeoutWarning={true}
      />
    );
    expect(warningHtml).toContain('data-testid="kiosk-timeout-warning"');
    expect(warningHtml).toContain('Are You Still Using the Kiosk?');
    expect(warningHtml).toContain('data-testid="kiosk-timeout-continue-btn"');
    expect(warningHtml).toContain('Continue My Session');
    expect(warningHtml).toContain('data-testid="kiosk-timeout-reset-now-btn"');

    // Render Kiosk after session reset -> returns to clean welcome screen with privacy reset banner and zero patient data
    const afterResetHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="welcome"
        initialDepartments={realDepartments}
        initialSessionResetNotice={true}
      />
    );
    expect(afterResetHtml).toContain('data-testid="kiosk-welcome-screen"');
    expect(afterResetHtml).toContain('data-testid="kiosk-session-reset-notice"');
    expect(afterResetHtml).not.toContain('Suresh Nair');
    expect(afterResetHtml).not.toContain('OPD-GEN-001');

    // Verify that the server-generated ticket remains 100% intact and active after kiosk reset
    const verifySlipRes = await fetch(
      `${baseUrl}/api/slips/${encodeURIComponent(ticket.publicCode)}`
    );
    expect(verifySlipRes.status).toBe(200);
    const verifySlipBody = await verifySlipRes.json();
    expect(verifySlipBody.slip.publicCode).toBe(ticket.publicCode);
    expect(verifySlipBody.slip.status).toBe('WAITING');
    expect(verifySlipBody.slip.patientSummary).toBeUndefined(); // Public endpoint never leaks PII
  });

  // 14. Emergency Help accessibility across all kiosk screens + pre-registration help request API
  it('14. keeps Emergency Help permanently accessible on all kiosk screens and allows pre-registration staff help requests without completing registration', async () => {
    const screens = [
      { initialScreen: 'welcome', initialRegStep: 1 },
      { initialScreen: 'register', initialRegStep: 1 },
      { initialScreen: 'register', initialRegStep: 2 },
      {
        initialScreen: 'register',
        initialRegStep: 3,
        initialPatientName: 'Test Patient',
        initialPhone: '9876543210',
        initialAge: '40'
      },
      {
        initialScreen: 'slip',
        initialSlip: {
          id: '11111111-1111-4111-8111-111111111199',
          publicCode: 'OPD-GEN-099',
          queueDate: '2026-10-25',
          status: 'WAITING',
          visitType: 'FIRST_VISIT',
          department: realDepartments[0],
          queue: { peopleAheadWaiting: 0, estimatedWaitMinutes: 0 }
        }
      },
      { initialScreen: 'lookup' }
    ];

    for (const cfg of screens) {
      const html = renderToStaticMarkup(
        <KioskModeView
          initialLang="en"
          initialDepartments={realDepartments}
          initialNodes={realNodes}
          {...cfg}
        />
      );
      // Persistent Emergency button in header + native EmergencyModal with 108, 112, Room 101 route, and Request Staff Help Now
      expect(html).toContain('data-testid="kiosk-emergency-btn"');
      expect(html).toContain('href="tel:108"');
      expect(html).toContain('href="tel:112"');
      expect(html).toContain('Show Route to Emergency (Room 101)');
      expect(html).toContain('Request Staff Help Now');
    }

    // Verify pre-registration help request works via real backend API without a ticketId
    const helpRes = await fetch(`${baseUrl}/api/help-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationLabel: 'Registration & Token Counter (Ground Floor)',
        requestType: 'URGENT_ASSESSMENT_REQUEST'
      })
    });
    expect(helpRes.status).toBe(201);
    const helpData = await helpRes.json();
    expect(helpData.helpRequest.status).toBe('NEW');
    expect(helpData.helpRequest.ticket_id).toBeNull();
  });

  // 15. Secondary Token Lookup & Authorised Staff Exit verification
  it('15. supports secondary token lookup on the kiosk and requires valid staff authentication to exit kiosk mode', async () => {
    const createRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: '77777777-7777-4777-8777-777777777705',
        departmentId: 'paediatrics',
        patientName: 'Aarav Sharma',
        phone: '9898989898',
        age: 7,
        gender: 'MALE',
        visitType: 'FIRST_VISIT',
        preferredLang: 'en',
        avoidStairs: true
      })
    });
    expect(createRes.status).toBe(201);
    const { ticket } = await createRes.json();

    const lookupRes = await fetch(
      `${baseUrl}/api/slips/${encodeURIComponent(ticket.publicCode)}`
    );
    expect(lookupRes.status).toBe(200);
    const { slip } = await lookupRes.json();

    const lookupHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="lookup"
        initialDepartments={realDepartments}
        initialLookupSlip={slip}
      />
    );
    expect(lookupHtml).toContain('data-testid="kiosk-lookup-screen"');
    expect(lookupHtml).toContain('data-testid="kiosk-lookup-result"');
    expect(lookupHtml).toContain(ticket.publicCode);

    // Render Staff Exit PIN modal and verify backend staff authentication endpoint
    const staffExitHtml = renderToStaticMarkup(
      <KioskModeView
        initialLang="en"
        initialScreen="welcome"
        initialDepartments={realDepartments}
        initialStaffExitModalOpen={true}
        onExitKiosk={() => {}}
      />
    );
    expect(staffExitHtml).toContain('data-testid="kiosk-staff-exit-modal"');
    expect(staffExitHtml).toContain('data-testid="kiosk-staff-pin-input"');
    expect(staffExitHtml).toContain('data-testid="kiosk-staff-verify-exit-btn"');

    const badPinRes = await fetch(`${baseUrl}/api/staff/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '9999' })
    });
    expect(badPinRes.status).toBe(401);

    const validPinRes = await fetch(`${baseUrl}/api/staff/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    expect(validPinRes.status).toBe(200);
    const validPinBody = await validPinRes.json();
    expect(validPinBody.authenticated).toBe(true);
  });
});
