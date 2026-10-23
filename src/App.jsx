import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io as createSocketClient } from 'socket.io-client';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  Home,
  Languages,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserPlus
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations.js';
import EmergencyModal from './components/EmergencyModal.jsx';
import SlipView from './components/SlipView.jsx';
import MyTurnView from './components/MyTurnView.jsx';
import NavigationView from './components/NavigationView.jsx';
import StaffView from './components/StaffView.jsx';

const STORAGE_ACTIVE_TICKET_KEY = 'opd_active_ticket_v1';
const SESSION_PENDING_REG_KEY = 'opd_pending_registration_v1';

function generateClientUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getInitialViewFromLocation() {
  if (typeof window === 'undefined') return { view: 'home', code: '' };
  const params = new URLSearchParams(window.location.search);
  const codeParam = (params.get('code') || '').trim().toUpperCase();
  const pathname = window.location.pathname.toLowerCase();

  if (codeParam || pathname.startsWith('/my-turn')) {
    return { view: 'my-turn', code: codeParam };
  }
  if (pathname.startsWith('/staff')) {
    return { view: 'staff', code: '' };
  }
  if (pathname.startsWith('/navigate')) {
    return { view: 'navigate', code: '' };
  }
  if (pathname.startsWith('/slip')) {
    return { view: 'slip', code: '' };
  }
  if (pathname.startsWith('/register')) {
    return { view: 'register', code: '' };
  }
  return { view: 'home', code: '' };
}

export default function App({ disableSockets = false }) {
  const initialNav = getInitialViewFromLocation();

  const [lang, setLang] = useState('en');
  const [assistedMode, setAssistedMode] = useState(false);
  const [activeView, setActiveView] = useState(initialNav.view);

  const [departments, setDepartments] = useState([]);
  const [hospitalNodes, setHospitalNodes] = useState([]);
  const [publicBoard, setPublicBoard] = useState({ queues: [], queueDate: null });
  const [boardLoading, setBoardLoading] = useState(false);

  // Active ticket saved on this device ({ ticket, accessToken, idempotentReplay })
  const [savedTicketState, setSavedTicketState] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_ACTIVE_TICKET_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Registration Wizard State
  const [regStep, setRegStep] = useState(1);
  const [regDeptSlug, setRegDeptSlug] = useState('general-medicine');
  const [regVisitType, setRegVisitType] = useState('FIRST_VISIT');
  const [regAvoidStairs, setRegAvoidStairs] = useState(true);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState(null);
  const [pendingRetryRequestId, setPendingRetryRequestId] = useState(null);

  // My Turn Live Tracker State
  const [lookupCode, setLookupCode] = useState(
    initialNav.code || savedTicketState?.ticket?.publicCode || ''
  );
  const [trackedSlip, setTrackedSlip] = useState(savedTicketState?.ticket || null);
  const [myTurnLoading, setMyTurnLoading] = useState(false);
  const [myTurnError, setMyTurnError] = useState(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);
  const [connectionState, setConnectionState] = useState('live');

  // Navigation Route Query State
  const [routeQuery, setRouteQuery] = useState({
    fromNodeId: 'registration_desk',
    toNodeId:
      savedTicketState?.ticket?.department?.destination_node_id || 'room_204_med',
    avoidStairs: true
  });

  // Staff Session State
  const [staffAuth, setStaffAuth] = useState({
    authenticated: false,
    loginAt: null
  });

  const emergencyDialogRef = useRef(null);
  const socketRef = useRef(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Fetch initial metadata (departments, navigation nodes, public board, staff session)
  const fetchInitialData = useCallback(async () => {
    setBoardLoading(true);
    try {
      const [deptRes, nodesRes, boardRes, staffRes] = await Promise.all([
        fetch('/api/departments', { headers: { Accept: 'application/json' } }),
        fetch('/api/routes/nodes', { headers: { Accept: 'application/json' } }),
        fetch('/api/queues/public-board', { headers: { Accept: 'application/json' } }),
        fetch('/api/staff/session', {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        })
      ]);

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        if (Array.isArray(deptJson.departments) && deptJson.departments.length > 0) {
          setDepartments(deptJson.departments);
        }
      }
      if (nodesRes.ok) {
        const nodesJson = await nodesRes.json();
        if (Array.isArray(nodesJson.nodes)) {
          setHospitalNodes(nodesJson.nodes);
        }
      }
      if (boardRes.ok) {
        const boardJson = await boardRes.json();
        setPublicBoard(boardJson);
      }
      if (staffRes.ok) {
        const staffJson = await staffRes.json();
        setStaffAuth({
          authenticated: Boolean(staffJson.authenticated),
          loginAt: staffJson.loginAt || null
        });
      }
    } catch {
      // Offline / degraded handled gracefully
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Refresh public board
  const refreshPublicBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const res = await fetch('/api/queues/public-board', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setPublicBoard(data);
      }
    } catch {
      // Keep last board state
    } finally {
      setBoardLoading(false);
    }
  }, []);

  // Canonical Public Lookup or Capability Lookup for My Turn / Active Slip
  const handleLookupCode = useCallback(
    async (codeToFetch) => {
      const normalized = String(codeToFetch || '')
        .trim()
        .toUpperCase();
      if (!normalized) return;

      setMyTurnLoading(true);
      setMyTurnError(null);

      try {
        // If this matches our saved device ticket and we have its capability token,
        // we can also verify via /api/tickets/:id or /api/slips/:publicCode
        const res = await fetch(`/api/slips/${encodeURIComponent(normalized)}`, {
          headers: { Accept: 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data?.error?.message || `Could not find token ${normalized}.`
          );
        }

        setTrackedSlip(data.slip);
        setLastVerifiedAt(new Date().toLocaleTimeString());

        // If this is the same ticket saved on our device, keep savedTicketState.ticket fresh too
        setSavedTicketState((prev) => {
          if (prev?.ticket?.publicCode === data.slip.publicCode) {
            const updated = { ...prev, ticket: data.slip };
            try {
              window.localStorage.setItem(
                STORAGE_ACTIVE_TICKET_KEY,
                JSON.stringify(updated)
              );
            } catch {
              // ignore storage quota errors
            }
            return updated;
          }
          return prev;
        });
      } catch (err) {
        setMyTurnError(err.message || 'Failed to look up token status.');
      } finally {
        setMyTurnLoading(false);
      }
    },
    []
  );

  // Auto-load initial code if URL had ?code=OPD-...
  useEffect(() => {
    if (initialNav.code) {
      handleLookupCode(initialNav.code);
    } else if (savedTicketState?.ticket?.publicCode) {
      handleLookupCode(savedTicketState.ticket.publicCode);
    }
  }, [initialNav.code, handleLookupCode]);

  // Socket.IO connection & authoritative invalidation re-fetch
  useEffect(() => {
    if (disableSockets || typeof window === 'undefined') return undefined;

    const socket = createSocketClient(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('live');
      socket.emit('subscribe:public-board');

      if (trackedSlip?.department?.id) {
        socket.emit('subscribe:queue', {
          departmentId: trackedSlip.department.id
        });
      }
      if (
        savedTicketState?.ticket?.id &&
        savedTicketState?.accessToken
      ) {
        socket.emit('subscribe:ticket', {
          ticketId: savedTicketState.ticket.id,
          accessToken: savedTicketState.accessToken
        });
      }
    });

    socket.on('reconnecting', () => {
      setConnectionState('reconnecting');
    });

    socket.on('disconnect', () => {
      setConnectionState('offline');
    });

    socket.on('connect_error', () => {
      setConnectionState('offline');
    });

    const handleRealtimeInvalidate = () => {
      refreshPublicBoard();
      const codeToRefresh =
        trackedSlip?.publicCode || savedTicketState?.ticket?.publicCode;
      if (codeToRefresh) {
        handleLookupCode(codeToRefresh);
      }
    };

    socket.on('queue.updated', handleRealtimeInvalidate);
    socket.on('ticket.updated', handleRealtimeInvalidate);
    socket.on('doctor.updated', handleRealtimeInvalidate);
    socket.on('doctor_status.updated', handleRealtimeInvalidate);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    disableSockets,
    trackedSlip?.department?.id,
    trackedSlip?.publicCode,
    savedTicketState?.ticket?.id,
    savedTicketState?.ticket?.publicCode,
    savedTicketState?.accessToken,
    refreshPublicBoard,
    handleLookupCode
  ]);

  // Check if there is a pending registration in sessionStorage for lost-response recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(SESSION_PENDING_REG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed?.requestId &&
        parsed?.payload &&
        Date.now() - Number(parsed.createdAt || 0) < 10 * 60 * 1000
      ) {
        setPendingRetryRequestId(parsed.requestId);
        setRegDeptSlug(parsed.payload.departmentId);
        setRegVisitType(parsed.payload.visitType);
        setRegAvoidStairs(Boolean(parsed.payload.avoidStairs));
      } else {
        window.sessionStorage.removeItem(SESSION_PENDING_REG_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleConfirmRegistration() {
    setRegSubmitting(true);
    setRegError(null);

    try {
      // Reuse existing pending requestId if retrying identical payload, otherwise create fresh UUID
      let requestId = pendingRetryRequestId;
      const payload = {
        departmentId: regDeptSlug,
        visitType: regVisitType,
        preferredLang: lang,
        avoidStairs: Boolean(regAvoidStairs)
      };

      if (typeof window !== 'undefined') {
        try {
          const existingRaw = window.sessionStorage.getItem(SESSION_PENDING_REG_KEY);
          if (existingRaw) {
            const existing = JSON.parse(existingRaw);
            const p = existing?.payload || {};
            const samePayload =
              p.departmentId === payload.departmentId &&
              p.visitType === payload.visitType &&
              p.preferredLang === payload.preferredLang &&
              Boolean(p.avoidStairs) === Boolean(payload.avoidStairs);
            if (samePayload && existing.requestId) {
              requestId = existing.requestId;
            } else {
              requestId = generateClientUuid();
            }
          } else if (!requestId) {
            requestId = generateClientUuid();
          }

          window.sessionStorage.setItem(
            SESSION_PENDING_REG_KEY,
            JSON.stringify({
              requestId,
              payload,
              createdAt: Date.now()
            })
          );
          setPendingRetryRequestId(requestId);
        } catch {
          if (!requestId) requestId = generateClientUuid();
        }
      } else if (!requestId) {
        requestId = generateClientUuid();
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          requestId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message || 'Could not complete OPD token registration.'
        );
      }

      // Clear pending sessionStorage key after confirmed response
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(SESSION_PENDING_REG_KEY);
        } catch {
          // ignore
        }
      }
      setPendingRetryRequestId(null);

      const newTicketBundle = {
        ticket: data.ticket,
        accessToken: data.accessToken,
        idempotentReplay: Boolean(data.idempotentReplay)
      };

      setSavedTicketState(newTicketBundle);
      setTrackedSlip(data.ticket);
      setLookupCode(data.ticket.publicCode);
      setLastVerifiedAt(new Date().toLocaleTimeString());

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            STORAGE_ACTIVE_TICKET_KEY,
            JSON.stringify(newTicketBundle)
          );
        } catch {
          // ignore
        }
      }

      refreshPublicBoard();
      setActiveView('slip');
    } catch (err) {
      setRegError(
        err.message ||
          'Network connection interrupted. Click Confirm again to safely recover your token without creating a duplicate.'
      );
    } finally {
      setRegSubmitting(false);
    }
  }

  function openEmergencyModal() {
    if (emergencyDialogRef.current) {
      if (typeof emergencyDialogRef.current.showModal === 'function') {
        if (!emergencyDialogRef.current.open) {
          emergencyDialogRef.current.showModal();
        }
      } else {
        emergencyDialogRef.current.setAttribute('open', 'true');
      }
    }
  }

  function closeEmergencyModal() {
    if (emergencyDialogRef.current) {
      if (typeof emergencyDialogRef.current.close === 'function') {
        if (emergencyDialogRef.current.open) {
          emergencyDialogRef.current.close();
        }
      } else {
        emergencyDialogRef.current.removeAttribute('open');
      }
    }
  }

  const selectedRegDept =
    departments.find((d) => d.slug === regDeptSlug) || departments[0] || null;

  return (
    <div
      data-assisted={assistedMode ? 'true' : 'false'}
      lang={lang}
      className={
        lang === 'hi'
          ? 'font-devanagari min-h-screen flex flex-col'
          : 'min-h-screen flex flex-col'
      }
    >
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-primary focus:text-white focus:px-4 focus:py-3 focus:rounded-md"
      >
        {t.skipLink}
      </a>

      {/* Persistent Pre-Registration Top Bar (Emergency Help + Assisted Mode + Language + Nav) */}
      <header className="no-print bg-surface border-b-2 border-border-strong sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Persistent Pre-Registration Emergency Help Button */}
            <button
              type="button"
              data-testid="persistent-emergency-btn"
              onClick={openEmergencyModal}
              className="touch-target inline-flex items-center gap-2.5 bg-status-emergency text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:opacity-95 transition"
              aria-haspopup="dialog"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div className="text-left leading-tight">
                <span className="block text-sm sm:text-base">{t.emergencyBtn}</span>
                <span className="block text-[11px] font-normal opacity-90 hidden sm:inline">
                  {t.emergencySub}
                </span>
              </div>
            </button>

            {/* Brand Title */}
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="text-left hidden md:block focus:outline-none"
            >
              <div className="font-bold text-lg text-brand-primary leading-tight">
                {t.brandTitle}
              </div>
              <div className="text-xs text-ink-secondary">{t.brandSubtitle}</div>
            </button>

            {/* Accessibility & Language Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="assisted-mode-toggle"
                onClick={() => setAssistedMode((prev) => !prev)}
                aria-pressed={assistedMode}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold text-xs sm:text-sm"
              >
                <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{assistedMode ? t.assistedOn : t.assistedOff}</span>
              </button>

              <button
                type="button"
                data-testid="language-toggle-btn"
                onClick={() => setLang((prev) => (prev === 'en' ? 'hi' : 'en'))}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary text-white font-bold text-xs sm:text-sm"
              >
                <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.langToggle}</span>
              </button>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {[
              { id: 'home', label: t.nav.home, icon: Home },
              { id: 'register', label: t.nav.register, icon: UserPlus },
              {
                id: 'slip',
                label: savedTicketState?.ticket
                  ? `${t.nav.slip} (${savedTicketState.ticket.publicCode})`
                  : t.nav.slip,
                icon: FileText
              },
              { id: 'my-turn', label: t.nav.myTurn, icon: Activity },
              { id: 'navigate', label: t.nav.navigate, icon: Navigation },
              { id: 'staff', label: t.nav.staff, icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;
              const isCurrent = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-tab-${item.id}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => setActiveView(item.id)}
                  className={`touch-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition border-2 ${
                    isCurrent
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-canvas text-ink-primary border-border-strong hover:bg-subtle'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="main-content"
        className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 space-y-6"
      >
        {/* =================================================================
            VIEW 1: HOME & LIVE WAITING ROOM BOARD
           ================================================================= */}
        {activeView === 'home' && (
          <div className="space-y-6">
            {/* Hero Action Banner */}
            <section className="bg-brand-primary text-white rounded-xl p-5 sm:p-7 shadow-card space-y-5">
              <div className="space-y-2 max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-bold">{t.home.heroTitle}</h1>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {t.home.heroDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  data-testid="home-cta-register"
                  onClick={() => {
                    setRegStep(1);
                    setActiveView('register');
                  }}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-primary font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm"
                >
                  <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaRegister}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-my-turn"
                  onClick={() => setActiveView('my-turn')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal text-white font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm"
                >
                  <Activity className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaMyTurn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('navigate')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-4 py-3.5 text-sm sm:text-base"
                >
                  <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaRoute}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('staff')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-4 py-3.5 text-sm sm:text-base"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaStaff}</span>
                </button>
              </div>
            </section>

            {/* Saved Active Slip Banner */}
            {savedTicketState?.ticket && (
              <section className="p-4 sm:p-5 rounded-xl bg-green-50 border-2 border-status-serving flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase text-status-serving">
                    {t.home.activeSlipBanner}
                  </div>
                  <div className="font-token text-xl sm:text-2xl font-bold text-ink-primary mt-0.5">
                    {savedTicketState.ticket.publicCode} ·{' '}
                    {lang === 'hi'
                      ? savedTicketState.ticket.department?.name_hi
                      : savedTicketState.ticket.department?.name_en}{' '}
                    ({savedTicketState.ticket.department?.room_label})
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveView('slip')}
                    className="touch-target px-4 py-2.5 rounded-lg bg-brand-primary text-white font-bold text-xs sm:text-sm"
                  >
                    {t.home.viewActiveSlip}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLookupCode(savedTicketState.ticket.publicCode);
                      handleLookupCode(savedTicketState.ticket.publicCode);
                      setActiveView('my-turn');
                    }}
                    className="touch-target px-4 py-2.5 rounded-lg bg-status-serving text-white font-bold text-xs sm:text-sm"
                  >
                    {t.nav.myTurn}
                  </button>
                </div>
              </section>
            )}

            {/* Live Multi-Department Waiting Room Board */}
            <section
              aria-labelledby="public-board-heading"
              className="bg-surface border-2 border-border-strong rounded-xl p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Building2
                    className="w-6 h-6 text-brand-primary shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h2
                      id="public-board-heading"
                      className="text-lg sm:text-xl font-bold text-ink-primary"
                    >
                      {t.home.boardTitle}
                    </h2>
                    {publicBoard.queueDate && (
                      <p className="text-xs text-ink-secondary">
                        Hospital Queue Date (IST):{' '}
                        <span className="font-token font-bold">
                          {publicBoard.queueDate}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={refreshPublicBoard}
                  disabled={boardLoading}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold text-xs sm:text-sm"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${boardLoading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{t.home.boardRefresh}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(publicBoard.queues?.length > 0
                  ? publicBoard.queues
                  : departments
                ).map((item) => {
                  const slug = item.slug;
                  const prefix = item.tokenPrefix || item.token_prefix;
                  const roomLabel = item.room_label;
                  const floorNum = item.floor_number;
                  const name = lang === 'hi' ? item.name_hi : item.name_en;
                  const nowServing = item.nowServingCode || t.home.noActiveToken;
                  const waiting = item.waitingCount ?? 0;

                  return (
                    <article
                      key={slug}
                      className="rounded-xl border-2 border-border-strong bg-canvas p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-token text-xs font-bold px-2.5 py-1 rounded bg-brand-primary text-white">
                            {prefix}
                          </span>
                          <span className="font-token text-xs font-bold px-2.5 py-0.5 rounded bg-subtle text-ink-primary border border-border-strong">
                            {roomLabel} · F{floorNum}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-ink-primary">{name}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface border border-border-strong text-center">
                        <div>
                          <div className="text-[11px] font-bold uppercase text-ink-muted">
                            {t.home.nowServing}
                          </div>
                          <div className="font-token font-bold text-base text-status-serving mt-0.5">
                            {nowServing}
                          </div>
                        </div>
                        <div className="border-l border-border-strong">
                          <div className="text-[11px] font-bold uppercase text-ink-muted">
                            {t.home.waitingCount}
                          </div>
                          <div className="font-token font-bold text-base text-ink-primary mt-0.5">
                            {waiting}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRegDeptSlug(slug);
                          setRegStep(2);
                          setActiveView('register');
                        }}
                        className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-teal text-white font-bold px-3 py-2.5 text-xs sm:text-sm"
                      >
                        <span>{t.home.registerHere}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* =================================================================
            VIEW 2: STEP-BY-STEP PATIENT REGISTRATION WIZARD
           ================================================================= */}
        {activeView === 'register' && (
          <section
            aria-labelledby="register-heading"
            className="bg-surface border-2 border-border-strong rounded-xl p-5 sm:p-7 shadow-card space-y-6"
          >
            <div className="border-b-2 border-border-strong pb-4 space-y-2">
              <h2
                id="register-heading"
                className="text-xl sm:text-2xl font-bold text-ink-primary"
              >
                {t.register.title}
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary">
                {t.register.subtitle}
              </p>

              {/* Step Progress Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { num: 1, label: t.register.step1 },
                  { num: 2, label: t.register.step2 },
                  { num: 3, label: t.register.step3 }
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setRegStep(s.num)}
                    className={`touch-target rounded-lg px-3 py-2 text-xs sm:text-sm font-bold border-2 text-left transition ${
                      regStep === s.num
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : regStep > s.num
                          ? 'bg-green-50 text-status-serving border-status-serving'
                          : 'bg-subtle text-ink-secondary border-border-strong'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {pendingRetryRequestId && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-amber-50 border-2 border-status-next text-ink-primary text-xs sm:text-sm font-semibold"
              >
                {t.register.retryNotice}
              </div>
            )}

            {/* Step 1: Select Department */}
            {regStep === 1 && (
              <div className="space-y-4">
                <p className="font-bold text-sm sm:text-base text-ink-primary">
                  {t.register.selectDeptPrompt}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const isSelected = regDeptSlug === dept.slug;
                    return (
                      <button
                        key={dept.slug}
                        type="button"
                        data-testid={`dept-card-${dept.slug}`}
                        onClick={() => {
                          setRegDeptSlug(dept.slug);
                          setRegStep(2);
                        }}
                        className={`text-left rounded-xl p-4 sm:p-5 border-2 transition flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-brand-primary/5 border-brand-primary ring-2 ring-brand-primary'
                            : 'bg-canvas border-border-strong hover:bg-subtle'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-token text-xs font-bold px-2.5 py-1 rounded bg-brand-primary text-white">
                              {dept.token_prefix}
                            </span>
                            <span className="font-token text-xs font-bold px-2.5 py-1 rounded bg-surface border border-border-strong text-ink-primary">
                              {dept.room_label} · {t.floors[dept.floor_number]}
                            </span>
                          </div>
                          <div className="font-bold text-base sm:text-lg text-ink-primary">
                            {lang === 'hi' ? dept.name_hi : dept.name_en}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-secondary font-medium">
                            <Stethoscope
                              className="w-4 h-4 text-brand-teal shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              {lang === 'hi'
                                ? dept.doctor_name_hi
                                : dept.doctor_name_en}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border-strong/60 text-xs text-ink-secondary flex items-center gap-1.5">
                          <MapPin
                            className="w-4 h-4 text-brand-teal shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {lang === 'hi' ? dept.landmark_hi : dept.landmark_en}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Visit Type & Avoid Stairs Accessibility Preference */}
            {regStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block font-bold text-sm sm:text-base text-ink-primary">
                    {t.register.visitTypeLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['FIRST_VISIT', 'FOLLOW_UP'].map((vt) => (
                      <button
                        key={vt}
                        type="button"
                        data-testid={`visit-type-${vt}`}
                        onClick={() => setRegVisitType(vt)}
                        className={`touch-target rounded-xl p-4 border-2 text-left font-bold text-sm sm:text-base transition ${
                          regVisitType === vt
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-canvas text-ink-primary border-border-strong'
                        }`}
                      >
                        {t.visitTypes[vt]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-subtle border-2 border-border-strong space-y-2">
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="reg-avoid-stairs-checkbox"
                      checked={regAvoidStairs}
                      onChange={(e) => setRegAvoidStairs(e.target.checked)}
                      className="w-5 h-5 accent-brand-teal rounded"
                    />
                    <span className="font-bold text-sm sm:text-base text-ink-primary flex items-center gap-2">
                      <Accessibility
                        className="w-5 h-5 text-brand-teal shrink-0"
                        aria-hidden="true"
                      />
                      <span>{t.register.avoidStairsLabel}</span>
                    </span>
                  </label>
                  <p className="text-xs sm:text-sm text-ink-secondary pl-8">
                    {t.register.avoidStairsHint}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-surface text-brand-primary font-bold px-5 py-2.5 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.register.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="reg-step2-continue"
                    onClick={() => setRegStep(3)}
                    className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-6 py-2.5 text-sm sm:text-base"
                  >
                    <span>{t.register.nextBtn}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {regStep === 3 && selectedRegDept && (
              <div className="space-y-5">
                <div className="p-5 rounded-xl bg-canvas border-2 border-border-strong space-y-3">
                  <h3 className="font-bold text-base sm:text-lg text-ink-primary border-b border-border-strong pb-2">
                    {t.register.summaryHeading}
                  </h3>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.deptLabel}
                      </dt>
                      <dd className="font-bold text-base text-ink-primary mt-0.5">
                        {lang === 'hi'
                          ? selectedRegDept.name_hi
                          : selectedRegDept.name_en}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.doctorLabel}
                      </dt>
                      <dd className="font-bold text-base text-ink-primary mt-0.5">
                        {lang === 'hi'
                          ? selectedRegDept.doctor_name_hi
                          : selectedRegDept.doctor_name_en}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.roomLabel}
                      </dt>
                      <dd className="font-token font-bold text-base text-brand-primary mt-0.5">
                        {selectedRegDept.room_label} ·{' '}
                        {t.floors[selectedRegDept.floor_number]}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.visitTypeLabel}
                      </dt>
                      <dd className="font-bold text-sm text-ink-primary mt-0.5">
                        {t.visitTypes[regVisitType]} ·{' '}
                        {regAvoidStairs ? 'Lift / Ramp Route' : 'Standard Route'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {regError && (
                  <div
                    role="alert"
                    className="p-4 rounded-xl bg-red-50 border-2 border-status-emergency text-status-emergency font-bold text-sm"
                  >
                    {regError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-surface text-brand-primary font-bold px-5 py-3 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.register.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="reg-confirm-submit-btn"
                    disabled={regSubmitting}
                    onClick={handleConfirmRegistration}
                    className="touch-target inline-flex items-center gap-2 rounded-xl bg-status-serving text-white font-bold px-6 py-3.5 text-sm sm:text-base shadow-sm disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    <span>
                      {regSubmitting
                        ? t.register.submittingBtn
                        : t.register.submitBtn}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================================
            VIEW 3: DIGITAL OPD TOKEN SLIP
           ================================================================= */}
        {activeView === 'slip' && (
          <SlipView
            lang={lang}
            t={t}
            slip={savedTicketState?.ticket || trackedSlip}
            idempotentReplay={Boolean(savedTicketState?.idempotentReplay)}
            onOpenMyTurn={(code) => {
              if (code) {
                setLookupCode(code);
                handleLookupCode(code);
              }
              setActiveView('my-turn');
            }}
            onOpenDirections={({ fromNodeId, toNodeId, avoidStairs }) => {
              setRouteQuery({
                fromNodeId: fromNodeId || 'registration_desk',
                toNodeId: toNodeId || 'room_204_med',
                avoidStairs: Boolean(avoidStairs)
              });
              setActiveView('navigate');
            }}
            onRegisterNew={() => {
              setRegStep(1);
              setActiveView('register');
            }}
          />
        )}

        {/* =================================================================
            VIEW 4: MY TURN — LIVE QUEUE TRACKER
           ================================================================= */}
        {activeView === 'my-turn' && (
          <MyTurnView
            lang={lang}
            t={t}
            lookupCode={lookupCode}
            setLookupCode={setLookupCode}
            trackedSlip={trackedSlip}
            loading={myTurnLoading}
            error={myTurnError}
            lastVerifiedAt={lastVerifiedAt}
            connectionState={connectionState}
            savedLocalSlip={savedTicketState?.ticket || null}
            onLookupCode={handleLookupCode}
            onOpenDirections={({ fromNodeId, toNodeId, avoidStairs }) => {
              setRouteQuery({
                fromNodeId: fromNodeId || 'registration_desk',
                toNodeId: toNodeId || 'room_204_med',
                avoidStairs: Boolean(avoidStairs)
              });
              setActiveView('navigate');
            }}
          />
        )}

        {/* =================================================================
            VIEW 5: INDOOR HOSPITAL DIRECTIONS (3 FLOORS)
           ================================================================= */}
        {activeView === 'navigate' && (
          <NavigationView
            lang={lang}
            t={t}
            nodes={hospitalNodes}
            routeQuery={routeQuery}
            setRouteQuery={setRouteQuery}
          />
        )}

        {/* =================================================================
            VIEW 6: STAFF QUEUE & TRIAGE DESK
           ================================================================= */}
        {activeView === 'staff' && (
          <StaffView
            lang={lang}
            t={t}
            departments={departments}
            staffAuth={staffAuth}
            setStaffAuth={setStaffAuth}
            socketRef={socketRef}
          />
        )}
      </main>

      {/* Persistent Pre-Registration Native <dialog> Emergency Modal */}
      <EmergencyModal
        dialogRef={emergencyDialogRef}
        lang={lang}
        t={t}
        nodes={hospitalNodes}
        activeSlip={savedTicketState?.ticket || trackedSlip}
        onClose={closeEmergencyModal}
        onNavigateToEmergency={() => {
          setRouteQuery({
            fromNodeId: 'main_entrance',
            toNodeId: 'emergency_casualty',
            avoidStairs: true
          });
          setActiveView('navigate');
        }}
      />
    </div>
  );
}
