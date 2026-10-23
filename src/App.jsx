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
  Trash2,
  UserPlus
} from 'lucide-react';
import { TRANSLATIONS } from './i18n/translations.js';
import EmergencyModal from './components/EmergencyModal.jsx';
import SlipView from './components/SlipView.jsx';
import MyTurnView from './components/MyTurnView.jsx';
import NavigationView from './components/NavigationView.jsx';
import StaffView from './components/StaffView.jsx';

export const STORAGE_SAVED_SLIPS_KEY = 'opd_saved_slips_v1';
export const STORAGE_ACTIVE_TICKET_KEY = 'opd_active_ticket_v1';
export const SESSION_PENDING_REG_KEY = 'opd_pending_registration_v1';

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

export function normalizeClientPhone(rawPhone) {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') {
    return null;
  }
  let cleaned = String(rawPhone)
    .trim()
    .replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function buildSavedSlipEntry(bundle, existingEntry = null) {
  if (!bundle || !bundle.ticket) return null;
  const ticket = bundle.ticket;
  const preservedPatientSummary =
    ticket.patientSummary || existingEntry?.patientSummary || existingEntry?.ticket?.patientSummary || null;
  const preservedAccessToken =
    bundle.accessToken ?? existingEntry?.accessToken ?? null;
  const avoidStairs = Boolean(
    ticket.avoidStairs ?? existingEntry?.avoidStairs ?? true
  );

  const mergedTicket = {
    ...existingEntry?.ticket,
    ...ticket,
    avoidStairs,
    ...(preservedPatientSummary ? { patientSummary: preservedPatientSummary } : {})
  };

  return {
    ticketId: mergedTicket.id,
    publicCode: mergedTicket.publicCode,
    departmentSlug:
      mergedTicket.department?.slug || existingEntry?.departmentSlug || '',
    departmentName_en:
      mergedTicket.department?.name_en || existingEntry?.departmentName_en || '',
    departmentName_hi:
      mergedTicket.department?.name_hi || existingEntry?.departmentName_hi || '',
    roomLabel:
      mergedTicket.department?.room_label || existingEntry?.roomLabel || '',
    floorNumber:
      mergedTicket.department?.floor_number ?? existingEntry?.floorNumber ?? 1,
    destinationNodeId:
      mergedTicket.department?.destination_node_id ||
      existingEntry?.destinationNodeId ||
      'room_204_med',
    status: mergedTicket.status || 'WAITING',
    queueDate: mergedTicket.queueDate || existingEntry?.queueDate || '',
    avoidStairs,
    createdAt:
      mergedTicket.createdAt || existingEntry?.createdAt || new Date().toISOString(),
    accessToken: preservedAccessToken,
    patientSummary: preservedPatientSummary,
    idempotentReplay: Boolean(
      bundle.idempotentReplay ?? existingEntry?.idempotentReplay ?? false
    ),
    ticket: mergedTicket
  };
}

export function loadSavedSlipsFromStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const rawList = window.localStorage.getItem(STORAGE_SAVED_SLIPS_KEY);
    let parsedList = [];
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        parsedList = parsed
          .map((item) =>
            item?.ticket ? buildSavedSlipEntry(item, item) : null
          )
          .filter(Boolean);
      }
    }

    // Migrate legacy single-slip storage if present
    const legacyRaw = window.localStorage.getItem(STORAGE_ACTIVE_TICKET_KEY);
    if (legacyRaw) {
      try {
        const legacyBundle = JSON.parse(legacyRaw);
        const migrated = buildSavedSlipEntry(legacyBundle);
        if (
          migrated &&
          !parsedList.some(
            (e) =>
              e.ticketId === migrated.ticketId ||
              e.publicCode === migrated.publicCode
          )
        ) {
          parsedList = [migrated, ...parsedList];
        }
      } catch {
        // ignore malformed legacy entry
      }
    }

    return parsedList;
  } catch {
    return [];
  }
}

function persistSavedSlipsToStorage(slips) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_SAVED_SLIPS_KEY, JSON.stringify(slips));
    if (slips.length > 0) {
      window.localStorage.setItem(
        STORAGE_ACTIVE_TICKET_KEY,
        JSON.stringify({
          ticket: slips[0].ticket,
          accessToken: slips[0].accessToken,
          idempotentReplay: slips[0].idempotentReplay
        })
      );
    } else {
      window.localStorage.removeItem(STORAGE_ACTIVE_TICKET_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
}

function getInitialViewFromLocation(overrideView = null) {
  if (overrideView) return { view: overrideView, code: '' };
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

export default function App({
  disableSockets = false,
  initialView = null,
  initialSavedSlips = null,
  initialRegStep = 1
}) {
  const initialNav = getInitialViewFromLocation(initialView);

  const [lang, setLang] = useState('en');
  const [assistedMode, setAssistedMode] = useState(false);
  const [activeView, setActiveView] = useState(initialNav.view);

  const [departments, setDepartments] = useState([]);
  const [hospitalNodes, setHospitalNodes] = useState([]);
  const [publicBoard, setPublicBoard] = useState({ queues: [], queueDate: null });
  const [boardLoading, setBoardLoading] = useState(false);

  // Persistent list of saved OPD slips on this device
  const [savedSlips, setSavedSlips] = useState(() => {
    if (Array.isArray(initialSavedSlips)) {
      return initialSavedSlips
        .map((item) => (item?.ticket ? buildSavedSlipEntry(item, item) : null))
        .filter(Boolean);
    }
    return loadSavedSlipsFromStorage();
  });

  const [selectedSlipId, setSelectedSlipId] = useState(() => {
    const initialList = Array.isArray(initialSavedSlips)
      ? initialSavedSlips
      : loadSavedSlipsFromStorage();
    return initialList[0]?.ticketId || initialList[0]?.ticket?.id || null;
  });

  const activeSavedEntry =
    savedSlips.find(
      (entry) =>
        entry.ticketId === selectedSlipId || entry.publicCode === selectedSlipId
    ) ||
    savedSlips[0] ||
    null;

  // Registration Wizard State (Preserved across steps & back navigation)
  const [regStep, setRegStep] = useState(initialRegStep);
  const [regDeptSlug, setRegDeptSlug] = useState('general-medicine');
  const [regPatientName, setRegPatientName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('PREFER_NOT_TO_SAY');
  const [regRegistrationNumber, setRegRegistrationNumber] = useState('');
  const [regVisitType, setRegVisitType] = useState('FIRST_VISIT');
  const [regAvoidStairs, setRegAvoidStairs] = useState(true);
  const [regFieldErrors, setRegFieldErrors] = useState({});
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState(null);
  const [duplicateTicketInfo, setDuplicateTicketInfo] = useState(null);
  const [pendingRetryRequestId, setPendingRetryRequestId] = useState(null);

  // My Turn Live Tracker State
  const [lookupCode, setLookupCode] = useState(
    initialNav.code || activeSavedEntry?.publicCode || ''
  );
  const [trackedSlip, setTrackedSlip] = useState(
    activeSavedEntry?.ticket || null
  );
  const [myTurnLoading, setMyTurnLoading] = useState(false);
  const [myTurnError, setMyTurnError] = useState(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);
  const [connectionState, setConnectionState] = useState('live');

  // Navigation Route Query State
  const [routeQuery, setRouteQuery] = useState({
    fromNodeId: 'registration_desk',
    toNodeId:
      activeSavedEntry?.destinationNodeId ||
      activeSavedEntry?.ticket?.department?.destination_node_id ||
      'room_204_med',
    avoidStairs: Boolean(activeSavedEntry?.avoidStairs ?? true)
  });

  // Staff Session State
  const [staffAuth, setStaffAuth] = useState({
    authenticated: false,
    loginAt: null
  });

  const emergencyDialogRef = useRef(null);
  const socketRef = useRef(null);
  const savedSlipsRef = useRef(savedSlips);
  savedSlipsRef.current = savedSlips;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Upsert a slip into savedSlips without overwriting other saved slips
  const upsertSavedSlip = useCallback((bundle, selectAsActive = true) => {
    if (!bundle?.ticket) return;
    setSavedSlips((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.ticketId === bundle.ticket.id ||
          item.publicCode === bundle.ticket.publicCode
      );
      let next;
      if (idx >= 0) {
        const merged = buildSavedSlipEntry(bundle, prev[idx]);
        next = [...prev];
        next[idx] = merged;
      } else {
        const created = buildSavedSlipEntry(bundle, null);
        next = [created, ...prev];
      }
      persistSavedSlipsToStorage(next);
      return next;
    });

    if (selectAsActive) {
      setSelectedSlipId(bundle.ticket.id || bundle.ticket.publicCode);
    }
  }, []);

  // Remove a saved slip from local browser storage only (does NOT cancel server ticket)
  const handleRemoveSavedSlip = useCallback(
    (ticketIdOrCode) => {
      setSavedSlips((prev) => {
        const next = prev.filter(
          (item) =>
            item.ticketId !== ticketIdOrCode &&
            item.publicCode !== ticketIdOrCode
        );
        persistSavedSlipsToStorage(next);

        if (
          selectedSlipId === ticketIdOrCode ||
          !next.some(
            (item) =>
              item.ticketId === selectedSlipId ||
              item.publicCode === selectedSlipId
          )
        ) {
          const fallback = next[0] || null;
          setSelectedSlipId(fallback ? fallback.ticketId : null);
          setTrackedSlip(fallback ? fallback.ticket : null);
          setLookupCode(fallback ? fallback.publicCode : '');
        }
        return next;
      });
    },
    [selectedSlipId]
  );

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

  // Canonical Public Lookup or Capability Lookup for My Turn / Saved Slips
  const handleLookupCode = useCallback(
    async (codeToFetch) => {
      const normalized = String(codeToFetch || '')
        .trim()
        .toUpperCase();
      if (!normalized) return;

      setMyTurnLoading(true);
      setMyTurnError(null);

      try {
        // Check if this code matches a saved slip with a capability token on this device
        const matchingSaved = savedSlipsRef.current.find(
          (item) => item.publicCode === normalized
        );

        let slipData = null;
        if (matchingSaved?.ticketId && matchingSaved?.accessToken) {
          const capRes = await fetch(
            `/api/tickets/${encodeURIComponent(matchingSaved.ticketId)}`,
            {
              headers: {
                Accept: 'application/json',
                'X-Ticket-Token': matchingSaved.accessToken
              }
            }
          );
          if (capRes.ok) {
            const capJson = await capRes.json();
            slipData = capJson.ticket;
          }
        }

        if (!slipData) {
          const res = await fetch(`/api/slips/${encodeURIComponent(normalized)}`, {
            headers: { Accept: 'application/json' }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(
              data?.error?.message || `Could not find token ${normalized}.`
            );
          }
          slipData = data.slip;
        }

        setTrackedSlip(slipData);
        setLastVerifiedAt(new Date().toLocaleTimeString());

        // If this ticket exists in savedSlips, update it in place without overwriting other slips
        if (
          savedSlipsRef.current.some(
            (item) =>
              item.publicCode === slipData.publicCode ||
              item.ticketId === slipData.id
          )
        ) {
          upsertSavedSlip({ ticket: slipData }, false);
        }
      } catch (err) {
        setMyTurnError(err.message || 'Failed to look up token status.');
      } finally {
        setMyTurnLoading(false);
      }
    },
    [upsertSavedSlip]
  );

  // Select a saved slip from the switcher
  const handleSelectSavedSlip = useCallback(
    (entry) => {
      if (!entry) return;
      setSelectedSlipId(entry.ticketId || entry.publicCode);
      if (entry.ticket) {
        setTrackedSlip(entry.ticket);
      }
      if (entry.publicCode) {
        setLookupCode(entry.publicCode);
        handleLookupCode(entry.publicCode);
      }
      setRouteQuery((prev) => ({
        ...prev,
        toNodeId:
          entry.destinationNodeId ||
          entry.ticket?.department?.destination_node_id ||
          prev.toNodeId,
        avoidStairs: Boolean(
          entry.avoidStairs ?? entry.ticket?.avoidStairs ?? true
        )
      }));
    },
    [handleLookupCode]
  );

  // Self-cancel an active ticket using its capability token
  const handleCancelActiveSlip = useCallback(
    async (ticketId) => {
      const targetEntry = savedSlipsRef.current.find(
        (item) => item.ticketId === ticketId
      );
      if (!targetEntry?.accessToken) return;

      const res = await fetch(
        `/api/tickets/${encodeURIComponent(ticketId)}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Ticket-Token': targetEntry.accessToken
          },
          body: JSON.stringify({})
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          upsertSavedSlip(
            {
              ticket: data.ticket,
              accessToken: targetEntry.accessToken,
              idempotentReplay: false
            },
            true
          );
          setTrackedSlip(data.ticket);
          refreshPublicBoard();
        }
      }
    },
    [upsertSavedSlip, refreshPublicBoard]
  );

  // Auto-load initial code if URL had ?code=OPD-...
  useEffect(() => {
    if (initialNav.code) {
      handleLookupCode(initialNav.code);
    } else if (activeSavedEntry?.publicCode) {
      handleLookupCode(activeSavedEntry.publicCode);
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
      // Subscribe to all active saved tickets on this device that have capability tokens
      for (const entry of savedSlipsRef.current) {
        if (entry.ticketId && entry.accessToken) {
          socket.emit('subscribe:ticket', {
            ticketId: entry.ticketId,
            accessToken: entry.accessToken
          });
        }
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
        trackedSlip?.publicCode || activeSavedEntry?.publicCode;
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
    activeSavedEntry?.ticketId,
    activeSavedEntry?.publicCode,
    activeSavedEntry?.accessToken,
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
        if (parsed.payload.departmentId) setRegDeptSlug(parsed.payload.departmentId);
        if (parsed.payload.patientName) setRegPatientName(parsed.payload.patientName);
        if (parsed.payload.phone) setRegPhone(parsed.payload.phone);
        if (parsed.payload.age !== undefined) setRegAge(String(parsed.payload.age));
        if (parsed.payload.gender) setRegGender(parsed.payload.gender);
        if (parsed.payload.registrationNumber) {
          setRegRegistrationNumber(parsed.payload.registrationNumber);
        }
        if (parsed.payload.visitType) setRegVisitType(parsed.payload.visitType);
        setRegAvoidStairs(Boolean(parsed.payload.avoidStairs ?? true));
      } else {
        window.sessionStorage.removeItem(SESSION_PENDING_REG_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  function validateStep2Fields() {
    const errors = {};
    const trimmedName = regPatientName.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      errors.patientName = t.register.validationNameRequired;
    }

    const normalizedPhone = normalizeClientPhone(regPhone);
    if (!normalizedPhone) {
      errors.phone = t.register.validationPhoneInvalid;
    }

    const parsedAge = Number(regAge);
    if (
      regAge === '' ||
      !Number.isInteger(parsedAge) ||
      parsedAge < 0 ||
      parsedAge > 120
    ) {
      errors.age = t.register.validationAgeInvalid;
    }

    setRegFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinueFromStep2() {
    setDuplicateTicketInfo(null);
    setRegError(null);
    if (validateStep2Fields()) {
      setRegStep(3);
    }
  }

  async function handleConfirmRegistration() {
    if (!validateStep2Fields()) {
      setRegStep(2);
      return;
    }

    setRegSubmitting(true);
    setRegError(null);
    setDuplicateTicketInfo(null);

    try {
      const normalizedPhone = normalizeClientPhone(regPhone) || regPhone.trim();
      const trimmedName = regPatientName.trim().replace(/\s+/g, ' ');
      const numericAge = Number(regAge);
      const trimmedRegNo = regRegistrationNumber.trim();

      const payload = {
        departmentId: regDeptSlug,
        patientName: trimmedName,
        phone: normalizedPhone,
        age: numericAge,
        gender: regGender || 'PREFER_NOT_TO_SAY',
        ...(trimmedRegNo ? { registrationNumber: trimmedRegNo } : {}),
        visitType: regVisitType,
        preferredLang: lang,
        avoidStairs: Boolean(regAvoidStairs)
      };

      // Reuse existing pending requestId ONLY if retrying an unacknowledged request with identical payload
      let requestId = pendingRetryRequestId;
      if (typeof window !== 'undefined') {
        try {
          const existingRaw = window.sessionStorage.getItem(SESSION_PENDING_REG_KEY);
          if (existingRaw) {
            const existing = JSON.parse(existingRaw);
            const p = existing?.payload || {};
            const samePayload =
              p.departmentId === payload.departmentId &&
              p.patientName === payload.patientName &&
              p.phone === payload.phone &&
              Number(p.age) === Number(payload.age) &&
              p.visitType === payload.visitType &&
              p.preferredLang === payload.preferredLang &&
              Boolean(p.avoidStairs) === Boolean(payload.avoidStairs);
            if (samePayload && existing.requestId) {
              requestId = existing.requestId;
            } else {
              requestId = generateClientUuid();
            }
          } else {
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

      // Clear pending sessionStorage key once server responds with a definitive outcome
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(SESSION_PENDING_REG_KEY);
        } catch {
          // ignore
        }
      }
      setPendingRetryRequestId(null);

      if (!res.ok) {
        if (
          res.status === 409 &&
          data?.error?.code === 'DUPLICATE_ACTIVE_TICKET'
        ) {
          setDuplicateTicketInfo(data.error.details?.existingTicket || null);
          setRegError(data.error.message);
          return;
        }
        throw new Error(
          data?.error?.message || 'Could not complete OPD token registration.'
        );
      }

      const newTicketBundle = {
        ticket: data.ticket,
        accessToken: data.accessToken,
        idempotentReplay: Boolean(data.idempotentReplay)
      };

      upsertSavedSlip(newTicketBundle, true);
      setTrackedSlip(data.ticket);
      setLookupCode(data.ticket.publicCode);
      setRouteQuery({
        fromNodeId: 'registration_desk',
        toNodeId:
          data.ticket.department?.destination_node_id || 'room_204_med',
        avoidStairs: Boolean(data.ticket.avoidStairs ?? regAvoidStairs ?? true)
      });
      setLastVerifiedAt(new Date().toLocaleTimeString());

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

  async function handleOpenDuplicateExistingSlip() {
    if (!duplicateTicketInfo) return;
    const existingSaved = savedSlips.find(
      (item) =>
        item.ticketId === duplicateTicketInfo.id ||
        item.publicCode === duplicateTicketInfo.publicCode
    );
    if (existingSaved) {
      handleSelectSavedSlip(existingSaved);
      setDuplicateTicketInfo(null);
      setRegError(null);
      setActiveView('slip');
      return;
    }

    if (duplicateTicketInfo.publicCode) {
      await handleLookupCode(duplicateTicketInfo.publicCode);
      setDuplicateTicketInfo(null);
      setRegError(null);
      setActiveView('slip');
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

  const boardItems =
    publicBoard.queues?.length > 0 ? publicBoard.queues : departments;
  const totalWaitingAcrossHospital = boardItems.reduce(
    (sum, item) => sum + Number(item.waitingCount ?? 0),
    0
  );
  const anyServingAcrossHospital = boardItems.some((item) =>
    Boolean(item.nowServingCode)
  );
  const isHospitalQueueEmpty =
    boardItems.length > 0 &&
    totalWaitingAcrossHospital === 0 &&
    !anyServingAcrossHospital;

  const normalizedPreviewPhone = normalizeClientPhone(regPhone);
  const maskedPreviewPhone = normalizedPreviewPhone
    ? `******${normalizedPreviewPhone.slice(-4)}`
    : regPhone;

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
              className="text-left focus:outline-none px-1"
            >
              <div className="font-bold text-base sm:text-lg text-brand-primary leading-tight">
                {t.brandTitle}
              </div>
              <div className="text-xs text-ink-secondary hidden sm:block">
                {t.brandSubtitle}
              </div>
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
                label:
                  savedSlips.length > 1
                    ? `${t.nav.slip} (${savedSlips.length})`
                    : activeSavedEntry?.publicCode
                      ? `${t.nav.slip} (${activeSavedEntry.publicCode})`
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
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-white text-brand-primary font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm transition"
                >
                  <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaRegister}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-my-turn"
                  onClick={() => setActiveView('my-turn')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal hover:bg-brand-tealHover border-2 border-white/40 text-white font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm transition"
                >
                  <Activity className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaMyTurn}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-navigate"
                  onClick={() => setActiveView('navigate')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-[#133863] hover:bg-[#1b497d] border-2 border-slate-300 text-white font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm transition"
                >
                  <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaRoute}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-staff"
                  onClick={() => setActiveView('staff')}
                  className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-[#133863] hover:bg-[#1b497d] border-2 border-slate-300 text-white font-bold px-4 py-3.5 text-sm sm:text-base shadow-sm transition"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{t.home.ctaStaff}</span>
                </button>
              </div>
            </section>

            {/* Persistent Multi-Slip Manager on Home Screen */}
            {savedSlips.length > 0 && (
              <section
                aria-label={t.slip.mySlipsSwitcherTitle}
                data-testid="home-saved-slips-section"
                className="p-4 sm:p-5 rounded-xl bg-green-50 border-2 border-status-serving space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-status-serving">
                      {t.home.activeSlipBanner} ({savedSlips.length})
                    </div>
                    <div className="font-bold text-base sm:text-lg text-ink-primary">
                      {t.slip.mySlipsSwitcherTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('slip')}
                    className="touch-target px-4 py-2 rounded-lg bg-brand-primary text-white font-bold text-xs sm:text-sm"
                  >
                    {t.home.viewActiveSlip}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savedSlips.map((entry) => {
                    const isSelected =
                      activeSavedEntry?.ticketId === entry.ticketId &&
                      activeSavedEntry?.publicCode === entry.publicCode;
                    const deptName =
                      lang === 'hi'
                        ? entry.departmentName_hi || entry.departmentName_en
                        : entry.departmentName_en;
                    const isActiveStatus = [
                      'WAITING',
                      'CALLED',
                      'IN_CONSULTATION'
                    ].includes(entry.status);
                    const categoryLabel = isActiveStatus
                      ? t.slip.mySlipsActiveTag
                      : entry.status === 'COMPLETED'
                        ? t.slip.mySlipsCompletedTag
                        : t.slip.mySlipsInactiveTag;

                    return (
                      <div
                        key={entry.ticketId || entry.publicCode}
                        data-testid={`home-saved-slip-${entry.publicCode}`}
                        className={`p-3.5 rounded-xl bg-surface border-2 flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-brand-primary shadow-sm'
                            : 'border-border-strong'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-token text-xl font-bold text-brand-primary">
                              {entry.publicCode}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-ink-primary">
                              {deptName} ({entry.roomLabel})
                            </div>
                            {entry.patientSummary?.fullName && (
                              <div className="text-xs text-ink-secondary mt-0.5">
                                {entry.patientSummary.fullName}
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              isActiveStatus
                                ? 'bg-green-50 text-status-serving border-status-serving'
                                : 'bg-subtle text-ink-secondary border-border-strong'
                            }`}
                          >
                            {categoryLabel} · {t.statuses?.[entry.status] || entry.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-strong/60">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-testid={`home-open-slip-${entry.publicCode}`}
                              onClick={() => {
                                handleSelectSavedSlip(entry);
                                setActiveView('slip');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-primary text-white font-bold text-xs"
                            >
                              {t.nav.slip}
                            </button>
                            <button
                              type="button"
                              data-testid={`home-track-slip-${entry.publicCode}`}
                              onClick={() => {
                                handleSelectSavedSlip(entry);
                                setActiveView('my-turn');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-status-serving text-white font-bold text-xs"
                            >
                              {t.nav.myTurn}
                            </button>
                          </div>

                          <button
                            type="button"
                            data-testid={`home-remove-slip-${entry.publicCode}`}
                            onClick={() =>
                              handleRemoveSavedSlip(entry.ticketId || entry.publicCode)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-subtle text-ink-secondary hover:text-status-emergency font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.slip.removeFromDeviceBtn}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
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

              {isHospitalQueueEmpty && (
                <div
                  data-testid="empty-queue-banner"
                  className="p-4 sm:p-5 rounded-xl bg-brand-tealSoft border-2 border-brand-teal flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-serving text-white text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.home.emptyQueueBadge}</span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-brand-primary pt-0.5">
                      {t.home.emptyQueueTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-secondary">
                      {t.home.emptyQueueDesc}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid="empty-queue-register-btn"
                    onClick={() => {
                      setRegStep(1);
                      setActiveView('register');
                    }}
                    className="touch-target inline-flex items-center gap-2 rounded-xl bg-brand-primary text-white font-bold px-4 py-3 text-xs sm:text-sm shadow-sm"
                  >
                    <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.home.emptyQueueCta}</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {boardItems.map((item) => {
                  const slug = item.slug;
                  const prefix = item.tokenPrefix || item.token_prefix;
                  const roomLabel = item.room_label;
                  const floorNum = item.floor_number;
                  const name = lang === 'hi' ? item.name_hi : item.name_en;
                  const nowServing = item.nowServingCode || t.home.noActiveToken;
                  const waiting = item.waitingCount ?? 0;
                  const isDeptEmpty = waiting === 0 && !item.nowServingCode;

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

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface border border-border-strong text-center">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-ink-muted">
                              {t.home.nowServing}
                            </div>
                            <div className="font-token font-bold text-sm sm:text-base text-status-serving mt-0.5">
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

                        {isDeptEmpty ? (
                          <div
                            data-testid={`dept-empty-status-${slug}`}
                            className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-status-serving text-status-serving text-xs font-bold text-center"
                          >
                            {t.home.deptOpenImmediate}
                          </div>
                        ) : (
                          <div className="px-2.5 py-1.5 rounded-lg bg-subtle border border-border-strong text-ink-secondary text-xs font-bold text-center">
                            {t.home.estWait}: ~{item.estimatedWaitMinutes ?? waiting * 7}{' '}
                            {t.home.mins}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRegDeptSlug(slug);
                          setDuplicateTicketInfo(null);
                          setRegError(null);
                          setRegStep(2);
                          setActiveView('register');
                        }}
                        className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-teal hover:bg-brand-tealHover text-white font-bold px-3 py-2.5 text-xs sm:text-sm transition"
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
                    onClick={() => {
                      if (s.num === 3 && !validateStep2Fields()) {
                        setRegStep(2);
                        return;
                      }
                      setRegStep(s.num);
                    }}
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
                          setDuplicateTicketInfo(null);
                          setRegError(null);
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

            {/* Step 2: Patient Details, Visit Type & Avoid Stairs Accessibility Preference */}
            {regStep === 2 && (
              <div className="space-y-6">
                {/* Patient Identity Details Section */}
                <div className="p-4 sm:p-5 rounded-xl bg-canvas border-2 border-border-strong space-y-4">
                  <div className="space-y-1 border-b border-border-strong pb-3">
                    <h3 className="font-bold text-base sm:text-lg text-brand-primary flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
                      <span>{t.register.patientSectionTitle}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-secondary">
                      {t.register.patientSectionSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="reg-patient-name"
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                      >
                        {t.register.patientNameLabel}
                      </label>
                      <input
                        id="reg-patient-name"
                        data-testid="reg-patient-name-input"
                        type="text"
                        required
                        maxLength={80}
                        value={regPatientName}
                        onChange={(e) => {
                          setRegPatientName(e.target.value);
                          if (regFieldErrors.patientName) {
                            setRegFieldErrors((prev) => ({ ...prev, patientName: null }));
                          }
                        }}
                        placeholder={t.register.patientNamePlaceholder}
                        className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:text-base font-semibold text-ink-primary"
                      />
                      {regFieldErrors.patientName && (
                        <p
                          role="alert"
                          data-testid="reg-error-patient-name"
                          className="text-xs font-bold text-status-emergency mt-1"
                        >
                          {regFieldErrors.patientName}
                        </p>
                      )}
                    </div>

                    {/* 10-Digit Mobile Number */}
                    <div>
                      <label
                        htmlFor="reg-patient-phone"
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                      >
                        {t.register.phoneLabel}
                      </label>
                      <input
                        id="reg-patient-phone"
                        data-testid="reg-phone-input"
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={16}
                        value={regPhone}
                        onChange={(e) => {
                          setRegPhone(e.target.value);
                          if (regFieldErrors.phone) {
                            setRegFieldErrors((prev) => ({ ...prev, phone: null }));
                          }
                        }}
                        placeholder={t.register.phonePlaceholder}
                        className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-sm sm:text-base font-bold text-ink-primary"
                      />
                      <p className="text-[11px] text-ink-secondary mt-1">
                        {t.register.phoneUnverifiedNote}
                      </p>
                      {regFieldErrors.phone && (
                        <p
                          role="alert"
                          data-testid="reg-error-phone"
                          className="text-xs font-bold text-status-emergency mt-1"
                        >
                          {regFieldErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Age (Years) */}
                    <div>
                      <label
                        htmlFor="reg-patient-age"
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                      >
                        {t.register.ageLabel}
                      </label>
                      <input
                        id="reg-patient-age"
                        data-testid="reg-age-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={120}
                        required
                        value={regAge}
                        onChange={(e) => {
                          setRegAge(e.target.value);
                          if (regFieldErrors.age) {
                            setRegFieldErrors((prev) => ({ ...prev, age: null }));
                          }
                        }}
                        placeholder={t.register.agePlaceholder}
                        className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-sm sm:text-base font-bold text-ink-primary"
                      />
                      {regFieldErrors.age && (
                        <p
                          role="alert"
                          data-testid="reg-error-age"
                          className="text-xs font-bold text-status-emergency mt-1"
                        >
                          {regFieldErrors.age}
                        </p>
                      )}
                    </div>

                    {/* Gender (Optional) */}
                    <div>
                      <label
                        htmlFor="reg-patient-gender"
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                      >
                        {t.register.genderLabel}
                      </label>
                      <select
                        id="reg-patient-gender"
                        data-testid="reg-gender-select"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:text-base font-semibold text-ink-primary"
                      >
                        <option value="PREFER_NOT_TO_SAY">{t.register.genderDecline}</option>
                        <option value="FEMALE">{t.register.genderFemale}</option>
                        <option value="MALE">{t.register.genderMale}</option>
                        <option value="OTHER">{t.register.genderOther}</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Hospital Registration / UHID Number */}
                  <div>
                    <label
                      htmlFor="reg-hospital-uhid"
                      className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                    >
                      {t.register.regNoLabel}
                    </label>
                    <input
                      id="reg-hospital-uhid"
                      data-testid="reg-uhid-input"
                      type="text"
                      maxLength={40}
                      value={regRegistrationNumber}
                      onChange={(e) => setRegRegistrationNumber(e.target.value)}
                      placeholder={t.register.regNoPlaceholder}
                      className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2 text-sm font-mono text-ink-primary"
                    />
                    <p className="text-[11px] text-ink-secondary mt-1">
                      {t.register.regNoHint}
                    </p>
                  </div>
                </div>

                {/* Visit Type */}
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

                {/* Avoid Stairs Accessibility Preference */}
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
                    onClick={handleContinueFromStep2}
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
                        {t.register.patientLabel}
                      </dt>
                      <dd
                        data-testid="reg-summary-patient-name"
                        className="font-bold text-base text-ink-primary mt-0.5"
                      >
                        {regPatientName.trim()}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.mobileLabel} · {t.register.ageGenderLabel}
                      </dt>
                      <dd className="font-token font-bold text-sm text-ink-primary mt-0.5">
                        {maskedPreviewPhone} · {regAge} yrs
                        {regGender && regGender !== 'PREFER_NOT_TO_SAY'
                          ? ` · ${regGender}`
                          : ''}
                      </dd>
                    </div>

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

                {/* Friendly Duplicate Active Ticket Banner */}
                {duplicateTicketInfo && (
                  <div
                    role="alert"
                    data-testid="duplicate-ticket-banner"
                    className="p-5 rounded-xl bg-amber-50 border-2 border-status-next text-ink-primary space-y-3"
                  >
                    <div className="font-bold text-base sm:text-lg text-status-next">
                      {t.register.duplicateTitle}:{' '}
                      <span className="font-token font-black text-brand-primary">
                        {duplicateTicketInfo.publicCode}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-primary">
                      {t.register.duplicateDesc}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        data-testid="open-existing-duplicate-slip-btn"
                        onClick={handleOpenDuplicateExistingSlip}
                        className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-4 py-2.5 text-xs sm:text-sm"
                      >
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {t.register.duplicateOpenBtn} ({duplicateTicketInfo.publicCode})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="duplicate-change-dept-btn"
                        onClick={() => {
                          setDuplicateTicketInfo(null);
                          setRegError(null);
                          setRegStep(1);
                        }}
                        className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-surface text-brand-primary font-bold px-4 py-2.5 text-xs sm:text-sm"
                      >
                        <span>{t.register.duplicateChangeDeptBtn}</span>
                      </button>
                    </div>
                  </div>
                )}

                {regError && !duplicateTicketInfo && (
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
            slip={activeSavedEntry?.ticket || trackedSlip}
            idempotentReplay={Boolean(activeSavedEntry?.idempotentReplay)}
            savedSlips={savedSlips}
            activeAccessToken={activeSavedEntry?.accessToken || null}
            onSelectSavedSlip={handleSelectSavedSlip}
            onRemoveSavedSlip={handleRemoveSavedSlip}
            onCancelActiveSlip={handleCancelActiveSlip}
            onOpenMyTurn={(code) => {
              if (code) {
                setLookupCode(code);
                handleLookupCode(code);
              }
              setActiveView('my-turn');
            }}
            onOpenDirections={(arg1, arg2) => {
              if (arg1 && typeof arg1 === 'object') {
                setRouteQuery({
                  fromNodeId: arg1.fromNodeId || 'registration_desk',
                  toNodeId: arg1.toNodeId || 'room_204_med',
                  avoidStairs: Boolean(arg1.avoidStairs ?? true)
                });
              } else {
                setRouteQuery({
                  fromNodeId: 'registration_desk',
                  toNodeId: arg1 || 'room_204_med',
                  avoidStairs: Boolean(arg2 ?? true)
                });
              }
              setActiveView('navigate');
            }}
            onRegisterNew={() => {
              setDuplicateTicketInfo(null);
              setRegError(null);
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
            savedLocalSlip={activeSavedEntry?.ticket || null}
            savedSlips={savedSlips}
            onSelectSavedSlip={handleSelectSavedSlip}
            onLookupCode={handleLookupCode}
            onRegisterNew={() => {
              setDuplicateTicketInfo(null);
              setRegError(null);
              setRegStep(1);
              setActiveView('register');
            }}
            onOpenDirections={({ fromNodeId, toNodeId, avoidStairs }) => {
              setRouteQuery({
                fromNodeId: fromNodeId || 'registration_desk',
                toNodeId: toNodeId || 'room_204_med',
                avoidStairs: Boolean(avoidStairs ?? true)
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
        activeSlip={activeSavedEntry?.ticket || trackedSlip}
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
