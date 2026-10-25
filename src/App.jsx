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
  ChevronDown,
  ChevronUp,
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
import { TRANSLATIONS, getLocalizedDepartment, resolveDepartmentCode } from './i18n/translations.js';
import KioskModeView from './components/KioskModeView.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import EmergencyModal from './components/EmergencyModal.jsx';
import SlipView from './components/SlipView.jsx';
import MyTurnView from './components/MyTurnView.jsx';
import NavigationView from './components/NavigationView.jsx';
import RegistrationVoiceGuide from './components/RegistrationVoiceGuide.jsx';
import StaffView from './components/StaffView.jsx';
import VoiceListenButton from './components/VoiceListenButton.jsx';
import PatientHelpChatbot from './components/PatientHelpChatbot.jsx';
import {
  AboutPageView,
  ClinicalFooter,
  FaqSection,
  NotFoundPageView,
  PrivacyPolicyView,
  TermsPageView,
  ThankYouPageView,
  getUniquePageTitle,
  sanitizeUiErrorMessage
} from './components/InfoPagesView.jsx';

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

  const deptCode = resolveDepartmentCode(mergedTicket.department || existingEntry);
  const taDeptName =
    mergedTicket.department?.name_ta ||
    (deptCode && TRANSLATIONS.ta?.departments?.[deptCode]?.name) ||
    existingEntry?.departmentName_ta ||
    '';

  return {
    ticketId: mergedTicket.id,
    publicCode: mergedTicket.publicCode,
    departmentCode: deptCode,
    departmentSlug:
      mergedTicket.department?.slug || existingEntry?.departmentSlug || '',
    departmentName_en:
      mergedTicket.department?.name_en || existingEntry?.departmentName_en || '',
    departmentName_hi:
      mergedTicket.department?.name_hi || existingEntry?.departmentName_hi || '',
    departmentName_ta: taDeptName,
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

const VIEW_PATH_MAP = {
  home: '/',
  register: '/register',
  slip: '/slip',
  'my-turn': '/my-turn',
  navigate: '/navigate',
  staff: '/staff',
  kiosk: '/kiosk',
  about: '/about',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
  'thank-you': '/thank-you',
  'not-found': '/404'
};

function getPathForView(view) {
  return VIEW_PATH_MAP[view] || '/';
}

function getInitialViewFromLocation(overrideView = null) {
  if (overrideView) return { view: overrideView, code: '' };
  if (typeof window === 'undefined') return { view: 'home', code: '' };
  const params = new URLSearchParams(window.location.search);
  const codeParam = (params.get('code') || '').trim().toUpperCase();
  const pathname = window.location.pathname.toLowerCase();

  if (pathname.startsWith('/kiosk')) {
    return { view: 'kiosk', code: codeParam };
  }
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
  if (pathname.startsWith('/about')) {
    return { view: 'about', code: '' };
  }
  if (pathname.startsWith('/faq')) {
    return { view: 'faq', code: '' };
  }
  if (pathname.startsWith('/privacy')) {
    return { view: 'privacy', code: '' };
  }
  if (pathname.startsWith('/terms')) {
    return { view: 'terms', code: '' };
  }
  if (pathname.startsWith('/thank-you')) {
    return { view: 'thank-you', code: '' };
  }
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    return { view: 'home', code: '' };
  }
  return { view: 'not-found', code: '' };
}

export default function App({
  disableSockets = false,
  initialView = null,
  initialSavedSlips = null,
  initialRegStep = 1,
  initialLang = 'en',
  initialDepartments = null
}) {
  const initialNav = getInitialViewFromLocation(initialView);

  const [lang, setLang] = useState(
    ['en', 'hi', 'ta'].includes(initialLang) ? initialLang : 'en'
  );
  const [assistedMode, setAssistedMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState(initialNav.view);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [departments, setDepartments] = useState(() =>
    Array.isArray(initialDepartments) ? initialDepartments : []
  );
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

  const isPopStateRef = useRef(false);
  const [navHistory, setNavHistory] = useState(() => ({
    stack: [{ view: initialNav.view, regStep: initialRegStep }],
    index: 0
  }));

  const navigateToView = useCallback(
    (nextView, options = {}) => {
      const targetStep =
        options.regStep !== undefined ? options.regStep : regStep;
      setActiveView(nextView);
      if (options.regStep !== undefined) {
        setRegStep(options.regStep);
      }
      setMobileNavOpen(false);

      setNavHistory((prev) => {
        const currentEntry = prev.stack[prev.index];
        if (
          currentEntry &&
          currentEntry.view === nextView &&
          currentEntry.regStep === targetStep
        ) {
          return prev;
        }
        const nextStack = [
          ...prev.stack.slice(0, prev.index + 1),
          { view: nextView, regStep: targetStep }
        ];
        const nextIndex = nextStack.length - 1;
        if (
          typeof window !== 'undefined' &&
          window.history &&
          typeof window.history.pushState === 'function' &&
          !isPopStateRef.current
        ) {
          try {
            window.history.pushState(
              { view: nextView, regStep: targetStep, historyIndex: nextIndex },
              '',
              getPathForView(nextView)
            );
          } catch {
            // ignore pushState errors in restricted test sandboxes
          }
        }
        return { stack: nextStack, index: nextIndex };
      });

      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    },
    [regStep]
  );

  // Synchronize initial history entry and listen to Browser Back / Forward (popstate) buttons
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return undefined;
    try {
      if (typeof window.history.replaceState === 'function') {
        window.history.replaceState(
          { view: initialNav.view, regStep: initialRegStep, historyIndex: 0 },
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {
      // ignore replaceState errors
    }

    const handlePopState = (event) => {
      isPopStateRef.current = true;
      const stateView = event.state?.view;
      const stateStep = event.state?.regStep;
      const stateIndex = event.state?.historyIndex;
      const resolvedView =
        stateView || getInitialViewFromLocation().view || 'home';
      setActiveView(resolvedView);
      if (typeof stateStep === 'number' && stateStep >= 1 && stateStep <= 3) {
        setRegStep(stateStep);
      }
      if (typeof stateIndex === 'number') {
        setNavHistory((prev) => ({
          ...prev,
          index: Math.max(0, Math.min(prev.stack.length - 1, stateIndex))
        }));
      }
      setMobileNavOpen(false);
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialNav.view, initialRegStep]);

  const canGoBack = navHistory.index > 0;
  const canGoForward = navHistory.index < navHistory.stack.length - 1;

  const handleHistoryBack = useCallback(() => {
    if (!canGoBack) return;
    if (
      typeof window !== 'undefined' &&
      window.history &&
      typeof window.history.back === 'function'
    ) {
      const targetIndex = navHistory.index - 1;
      const targetEntry = navHistory.stack[targetIndex];
      if (targetEntry) {
        setActiveView(targetEntry.view);
        if (targetEntry.regStep) setRegStep(targetEntry.regStep);
        setNavHistory((prev) => ({ ...prev, index: targetIndex }));
      }
      try {
        window.history.back();
      } catch {
        // fallback handled by state update above
      }
    }
  }, [canGoBack, navHistory]);

  const handleHistoryForward = useCallback(() => {
    if (!canGoForward) return;
    if (
      typeof window !== 'undefined' &&
      window.history &&
      typeof window.history.forward === 'function'
    ) {
      const targetIndex = navHistory.index + 1;
      const targetEntry = navHistory.stack[targetIndex];
      if (targetEntry) {
        setActiveView(targetEntry.view);
        if (targetEntry.regStep) setRegStep(targetEntry.regStep);
        setNavHistory((prev) => ({ ...prev, index: targetIndex }));
      }
      try {
        window.history.forward();
      } catch {
        // fallback handled by state update above
      }
    }
  }, [canGoForward, navHistory]);

  const handleScrollToTop = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  // Dynamically update document.title for unique page titles (Item 17)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = getUniquePageTitle(activeView, lang);
    }
  }, [activeView, lang]);

  // Apply Large Text / Assisted Mode attribute directly on <html> (:root) so rem font scaling applies everywhere
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-assisted',
        assistedMode ? 'true' : 'false'
      );
      return () => {
        document.documentElement.removeAttribute('data-assisted');
      };
    }
    return undefined;
  }, [assistedMode]);

  // Apply optional clinical dark mode attribute (Item 5)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [darkMode]);

  // Scroll progress bar & Back to Top button listener (Items 6 & 8)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        (document.documentElement.scrollHeight || 0) -
        (document.documentElement.clientHeight || 0);
      const ratio = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
      setScrollProgress(ratio);
      setShowBackToTop(scrollTop > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleStaffTicketMutated = useCallback(
    (mutatedTicket) => {
      if (!mutatedTicket) return;
      const matchesSaved = savedSlipsRef.current.some(
        (item) =>
          item.publicCode === mutatedTicket.publicCode ||
          item.ticketId === mutatedTicket.id
      );
      if (matchesSaved) {
        upsertSavedSlip({ ticket: mutatedTicket }, false);
      }
      refreshPublicBoard();
    },
    [upsertSavedSlip, refreshPublicBoard]
  );

  const handleStaffSyncSavedSlips = useCallback(
    (syncedTickets = []) => {
      for (const ticket of syncedTickets) {
        const existingSaved = savedSlipsRef.current.find(
          (item) =>
            item.publicCode === ticket.publicCode ||
            item.ticketId === ticket.id
        );
        if (
          existingSaved &&
          (existingSaved.status !== ticket.status ||
            existingSaved.ticket?.status !== ticket.status)
        ) {
          upsertSavedSlip({ ticket }, false);
        }
      }
    },
    [upsertSavedSlip]
  );

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
        setMyTurnError(
          sanitizeUiErrorMessage(
            err.message,
            'Could not verify token status right now. Please check your token code and try again.'
          )
        );
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
      navigateToView('slip');
    } catch (err) {
      setRegError(
        sanitizeUiErrorMessage(
          err.message,
          'Network connection interrupted. Click Confirm again to safely recover your token without creating a duplicate.'
        )
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
      navigateToView('slip');
      return;
    }

    if (duplicateTicketInfo.publicCode) {
      await handleLookupCode(duplicateTicketInfo.publicCode);
      setDuplicateTicketInfo(null);
      setRegError(null);
      navigateToView('slip');
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

  if (activeView === 'kiosk') {
    return (
      <KioskModeView
        initialLang={lang}
        initialDepartments={departments}
        initialNodes={hospitalNodes}
        staffAuth={staffAuth}
        setStaffAuth={setStaffAuth}
        onExitKiosk={() => {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState({}, '', '/');
          }
          setActiveView('home');
        }}
      />
    );
  }

  return (
    <div
      data-assisted={assistedMode ? 'true' : 'false'}
      data-theme={darkMode ? 'dark' : 'light'}
      lang={lang}
      className={
        lang === 'hi'
          ? 'font-devanagari min-h-screen flex flex-col'
          : lang === 'ta'
            ? 'font-tamil min-h-screen flex flex-col'
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

      {/* Structured Institutional Navigation Header (shadcn / HeroUI / 21st.dev / Apple SKILL.md §1, §12, §16) */}
      <header className="no-print sticky top-0 z-40 apple-nav-bar shadow-sm">
        {/* Top Scroll Progress Indicator (Item 8) */}
        <div
          data-testid="scroll-progress-bar"
          aria-hidden="true"
          className="h-[3px] w-full bg-transparent overflow-hidden"
        >
          <div
            className="h-full bg-brand-teal origin-left transition-transform duration-100"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>

        {/* Tier 1: Institutional Utility Bar (Hospital Status, Voice Readout, Language, Large Text & Theme) */}
        <div className="border-b border-border-subtle/80 bg-subtle/85">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 min-h-[40px] py-1.5 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Hospital Operational Status & Kiosk Quick Link */}
            <div className="hidden md:flex items-center gap-2.5 text-xs font-medium text-ink-secondary">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface border border-border-subtle text-ink-primary font-semibold shadow-sm">
                <span className="h-2 w-2 rounded-full bg-status-serving" aria-hidden="true" />
                <span>
                  {lang === 'hi'
                    ? 'ओपीडी समय: सोम–शनि 08:00–16:00 IST'
                    : lang === 'ta'
                      ? 'ஓபிடி நேரம்: திங்கள்–சனி 08:00–16:00 IST'
                      : 'OPD Hours: Mon–Sat 08:00–16:00 IST'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50/90 border border-red-200 text-status-emergency font-bold">
                <span>
                  {lang === 'hi'
                    ? 'आपातकालीन कक्ष 101 (24×7)'
                    : lang === 'ta'
                      ? 'அவசர சிகிச்சை அறை 101 (24×7)'
                      : 'Casualty Room 101 (24×7)'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => navigateToView('kiosk')}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-tealSoft border border-brand-teal/40 font-bold text-brand-teal hover:bg-brand-teal hover:text-white transition-colors"
              >
                <span>
                  {lang === 'hi'
                    ? 'स्वयं-सेवा कियोस्क (/kiosk)'
                    : lang === 'ta'
                      ? 'சுய-சேவை கியோஸ்க் (/kiosk)'
                      : 'Self-Service Kiosk (/kiosk)'}
                </span>
              </button>
            </div>

            {/* Right: Voice Page Reader, Trilingual Switcher, Large Text (A+) & Dark Mode */}
            <div className="flex flex-wrap items-center justify-between md:justify-end w-full md:w-auto gap-1.5 sm:gap-2">
              {/* Voice Readout for Current Active Tab */}
              <VoiceListenButton
                lang={lang}
                variant="header"
                testId="navbar-voice-listen-btn"
                label={
                  lang === 'hi'
                    ? 'पेज सुनें'
                    : lang === 'ta'
                      ? 'பக்கத்தைக் கேளுங்கள்'
                      : 'Listen to Page'
                }
                text={
                  activeView === 'home'
                    ? `${t.home.heroTitle}. ${t.home.heroDesc}. ${t.home.boardTitle}.`
                    : activeView === 'register'
                      ? `${t.register.title}. ${t.register.subtitle}. ${
                          regStep === 1
                            ? t.register.selectDeptPrompt
                            : regStep === 2
                              ? t.register.patientSectionSubtitle
                              : t.register.summaryHeading
                        }`
                      : activeView === 'slip'
                        ? `${t.slip.title}. ${
                            (activeSavedEntry?.ticket || trackedSlip)?.publicCode
                              ? `${t.slip.tokenLabel}: ${(activeSavedEntry?.ticket || trackedSlip).publicCode}`
                              : t.slip.noSlipTitle
                          }`
                        : activeView === 'my-turn'
                          ? `${t.myTurn.title}. ${t.myTurn.subtitle}.`
                          : activeView === 'navigate'
                            ? `${t.navigate.title}. ${t.navigate.subtitle}.`
                            : `${t.brandTitle}. ${t.brandSubtitle}.`
                }
              />

              {/* Trilingual Native Script Selector */}
              <div
                role="group"
                aria-label="Language Selector"
                data-testid="language-selector"
                className="inline-flex items-center rounded-lg bg-surface border border-border-strong/60 p-0.5 gap-0.5 shadow-sm"
              >
                {[
                  { code: 'en', label: 'EN', fullLabel: 'English (EN)' },
                  { code: 'hi', label: 'हिन्दी', fullLabel: 'हिन्दी (HI)' },
                  { code: 'ta', label: 'தமிழ்', fullLabel: 'தமிழ் (TA)' }
                ].map((opt) => {
                  const isActive = lang === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      data-testid={`lang-select-${opt.code}`}
                      aria-pressed={isActive}
                      aria-label={opt.fullLabel}
                      onClick={() => setLang(opt.code)}
                      className={`h-7 inline-flex items-center justify-center px-2.5 rounded-md font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-ink-secondary hover:text-ink-primary hover:bg-subtle/70'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Large Text (A+) / Assisted Mode Toggle */}
                <button
                  type="button"
                  data-testid="assisted-mode-toggle"
                  onClick={() => setAssistedMode((prev) => !prev)}
                  aria-pressed={assistedMode}
                  title="Toggle Large Text (+19% font size across all screens)"
                  className={`h-7 inline-flex items-center justify-center gap-1 px-2.5 rounded-lg border text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                    assistedMode
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm ring-2 ring-brand-primary/20'
                      : 'bg-surface text-ink-secondary hover:text-ink-primary border-border-strong/60 hover:bg-subtle'
                  }`}
                >
                  <span className="font-token text-[11px] font-black" aria-hidden="true">
                    A+
                  </span>
                  <span>{assistedMode ? t.assistedOn : t.assistedOff}</span>
                </button>

                {/* Optional Restrained Clinical Dark Mode Toggle (Item 5) */}
                <button
                  type="button"
                  data-testid="dark-mode-toggle"
                  onClick={() => setDarkMode((prev) => !prev)}
                  aria-pressed={darkMode}
                  className={`h-7 inline-flex items-center justify-center px-2.5 rounded-lg border text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all ${
                    darkMode
                      ? 'bg-brand-teal text-white border-brand-teal shadow-sm'
                      : 'bg-surface text-ink-secondary hover:text-ink-primary border-border-strong/60 hover:bg-subtle'
                  }`}
                >
                  <span>
                    {darkMode
                      ? lang === 'hi'
                        ? 'लाइट मोड'
                        : lang === 'ta'
                          ? 'ஒளி முறை'
                          : 'Light Mode'
                      : lang === 'hi'
                        ? 'डार्क मोड'
                        : lang === 'ta'
                          ? 'இருள் முறை'
                          : 'Dark Mode'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Main Navigation Dock (Brand + History Left — HeroUI Pill Dock Center — Emergency CTA Right) */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2.5 lg:py-2 lg:min-h-[68px] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          {/* Left: Clickable Brand Identity */}
          <div className="flex items-center gap-2 lg:order-1 shrink-0">
            <button
              type="button"
              data-testid="brand-logo-home-btn"
              onClick={() => navigateToView('home')}
              className="text-left focus:outline-none rounded-xl px-1.5 py-1 hover:bg-subtle/70 transition shrink-0"
            >
              <BrandLogo
                title={t.brandTitle}
                subtitle=""
                compact={false}
              />
            </button>
          </div>

          {/* Right: Persistent Emergency Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2 lg:order-3 shrink-0">
            <button
              type="button"
              data-testid="persistent-emergency-btn"
              onClick={openEmergencyModal}
              className="h-9 sm:h-10 inline-flex items-center justify-center gap-1.5 bg-status-emergency hover:bg-[#991b1b] active:scale-[0.97] text-white font-bold px-3.5 sm:px-4 rounded-xl shadow-sm transition shrink-0 whitespace-nowrap text-xs sm:text-[13px]"
              aria-haspopup="dialog"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.emergencyBtn}</span>
            </button>

            <button
              type="button"
              data-testid="mobile-nav-toggle-btn"
              aria-expanded={mobileNavOpen}
              aria-controls="primary-navigation-links"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="lg:hidden h-9 sm:h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-border-strong bg-surface hover:bg-subtle text-ink-primary font-semibold text-xs"
            >
              <span>
                {lang === 'hi'
                  ? 'मेनू'
                  : lang === 'ta'
                    ? 'பட்டியல்'
                    : 'Menu'}
              </span>
              {mobileNavOpen ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Center (Desktop lg+) / Collapsible Drawer (<lg): HeroUI / shadcn Segmented Navigation Dock */}
          <nav
            id="primary-navigation-links"
            aria-label="Primary Navigation"
            className={`${
              mobileNavOpen ? 'grid' : 'hidden lg:flex'
            } w-full lg:w-auto lg:order-2 grid-cols-2 sm:grid-cols-3 lg:flex-nowrap items-center gap-1 bg-subtle/90 p-1.5 rounded-2xl border border-border-strong/60 shadow-inner`}
          >
            {[
              { id: 'home', label: t.nav.home, Icon: Home },
              { id: 'register', label: t.nav.register, Icon: UserPlus },
              {
                id: 'slip',
                label:
                  savedSlips.length > 0
                    ? `${t.nav.slip} (${savedSlips.length})`
                    : activeSavedEntry?.publicCode
                      ? `${t.nav.slip} (1)`
                      : t.nav.slip,
                Icon: FileText
              },
              { id: 'my-turn', label: t.nav.myTurn, Icon: Activity },
              { id: 'navigate', label: t.nav.navigate, Icon: Navigation },
              { id: 'staff', label: t.nav.staff, Icon: ShieldCheck }
            ].map((item) => {
              const isCurrent = activeView === item.id;
              const NavIcon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-tab-${item.id}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => navigateToView(item.id)}
                  className={`relative h-9 inline-flex items-center justify-center gap-1.5 px-3 xl:px-3.5 rounded-xl font-bold text-xs xl:text-[13px] text-center leading-tight whitespace-nowrap transition-all duration-150 active:scale-[0.97] ${
                    isCurrent
                      ? 'bg-brand-primary text-white shadow-sm ring-1 ring-brand-primary'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-surface/90'
                  }`}
                >
                  <NavIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCurrent ? 'text-[#F5A623]' : 'text-brand-teal'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8"
      >
        {/* =================================================================
            VIEW 1: HOME & LIVE WAITING ROOM BOARD
           ================================================================= */}
        {activeView === 'home' && (
          <div className="space-y-8">
            {/* Tactile 3D Warm Espresso & Terracotta-Gold Hero Banner */}
            <section className="mastercard-3d-hero text-white rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3 max-w-3xl">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#F5A623]">
                    {lang === 'hi'
                      ? 'सरकारी अस्पताल डिजिटल ओपीडी सहायता'
                      : lang === 'ta'
                        ? 'அரசு மருத்துவமனை டிஜிட்டல் ஓபிடி வழிகாட்டி'
                        : 'PUBLIC HOSPITAL DIGITAL OPD COMPANION'}
                  </div>
                  <h1
                    className={`font-extrabold text-white ${
                      lang === 'ta'
                        ? 'text-xl sm:text-2xl lg:text-[30px] leading-[1.4] tracking-normal'
                        : lang === 'hi'
                          ? 'text-2xl sm:text-3xl lg:text-[34px] leading-[1.35] tracking-normal'
                          : 'text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight'
                    }`}
                  >
                    {t.home.heroTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-[#EAE0D5] leading-relaxed max-w-2xl">
                    {t.home.heroDesc}
                  </p>
                </div>

                <VoiceListenButton
                  lang={lang}
                  variant="inverse"
                  testId="hero-voice-listen-btn"
                  text={`${t.home.heroTitle}. ${t.home.heroDesc}. ${t.home.ctaRegister}. ${t.home.ctaMyTurn}. ${t.home.ctaRoute}.`}
                />
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 items-stretch">
                <button
                  type="button"
                  data-testid="home-cta-register"
                  onClick={() => {
                    setRegStep(1);
                    navigateToView('register');
                  }}
                  className="touch-target h-full min-h-[54px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFFDF9] hover:bg-[#F2EAE0] border-2 border-[#E2D5C4] border-b-[4px] border-b-[#CBB9A3] text-brand-primary font-extrabold px-4 py-3 text-xs sm:text-sm xl:text-[14.5px] leading-snug text-center shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <UserPlus className="w-5 h-5 shrink-0 text-[#C84B31]" aria-hidden="true" />
                  <span className="leading-snug">{t.home.ctaRegister}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-my-turn"
                  onClick={() => navigateToView('my-turn')}
                  className="touch-target h-full min-h-[54px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal hover:bg-brand-tealHover border-2 border-[#E06D53]/50 border-b-[4px] border-b-[#8C2D19] text-white font-bold px-4 py-3 text-xs sm:text-sm xl:text-[14.5px] leading-snug text-center shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <Activity className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="leading-snug">{t.home.ctaMyTurn}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-navigate"
                  onClick={() => navigateToView('navigate')}
                  className="touch-target h-full min-h-[54px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D251E] hover:bg-[#3A3028] border-2 border-[#E59838]/45 border-b-[4px] border-b-[#120E0C] text-white font-bold px-4 py-3 text-xs sm:text-sm xl:text-[14.5px] leading-snug text-center shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <Navigation className="w-5 h-5 shrink-0 text-[#F5A623]" aria-hidden="true" />
                  <span className="leading-snug">{t.home.ctaRoute}</span>
                </button>

                <button
                  type="button"
                  data-testid="home-cta-staff"
                  onClick={() => navigateToView('staff')}
                  className="touch-target h-full min-h-[54px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D251E] hover:bg-[#3A3028] border-2 border-[#D6C7B2]/35 border-b-[4px] border-b-[#120E0C] text-white font-bold px-4 py-3 text-xs sm:text-sm xl:text-[14.5px] leading-snug text-center shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 text-[#E59838]" aria-hidden="true" />
                  <span className="leading-snug">{t.home.ctaStaff}</span>
                </button>
              </div>
            </section>

            {/* Persistent Multi-Slip Manager on Home Screen */}
            {savedSlips.length > 0 && (
              <section
                aria-label={t.slip.mySlipsSwitcherTitle}
                data-testid="home-saved-slips-section"
                className="p-4 sm:p-6 rounded-2xl bg-emerald-50/90 border-2 border-status-serving/40 shadow-card space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-status-serving">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {t.home.activeSlipBanner} ({savedSlips.length})
                      </span>
                    </div>
                    <div className="font-extrabold text-base sm:text-lg text-ink-primary mt-0.5">
                      {t.slip.mySlipsSwitcherTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToView('slip')}
                    className="btn-primary text-xs sm:text-sm"
                  >
                    <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.home.viewActiveSlip}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {savedSlips.map((entry) => {
                    const isSelected =
                      activeSavedEntry?.ticketId === entry.ticketId &&
                      activeSavedEntry?.publicCode === entry.publicCode;
                    const deptName =
                      getLocalizedDepartment(entry.ticket?.department || entry, lang, t).name ||
                      entry.departmentName_en;
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
                        className={`p-4 rounded-2xl bg-surface border-2 flex flex-col justify-between gap-3.5 transition-all ${
                          isSelected
                            ? 'border-brand-primary shadow-md ring-2 ring-brand-primary/10'
                            : 'border-border-subtle hover:border-brand-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-token text-xl sm:text-2xl font-extrabold text-brand-primary tracking-wider">
                              {entry.publicCode}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-ink-primary mt-0.5">
                              {deptName} ({entry.roomLabel})
                            </div>
                            {entry.patientSummary?.fullName && (
                              <div className="text-xs font-medium text-ink-secondary mt-0.5">
                                {entry.patientSummary.fullName}
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                              isActiveStatus
                                ? 'bg-green-50 text-status-serving border-status-serving/40'
                                : 'bg-subtle text-ink-secondary border-border-strong'
                            }`}
                          >
                            {categoryLabel} · {t.statuses?.[entry.status] || entry.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-border-subtle">
                          <button
                            type="button"
                            data-testid={`home-open-slip-${entry.publicCode}`}
                            onClick={() => {
                              handleSelectSavedSlip(entry);
                              navigateToView('slip');
                            }}
                            className="touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-bold text-xs sm:text-sm border border-brand-primary shadow-sm transition-colors text-center"
                          >
                            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span className="leading-snug">{t.nav.slip}</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`home-track-slip-${entry.publicCode}`}
                            onClick={() => {
                              handleSelectSavedSlip(entry);
                              navigateToView('my-turn');
                            }}
                            className="touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-brand-teal hover:bg-brand-tealHover text-white font-bold text-xs sm:text-sm border border-brand-teal shadow-sm transition-colors text-center"
                          >
                            <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span className="leading-snug">{t.nav.myTurn}</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`home-remove-slip-${entry.publicCode}`}
                            onClick={() =>
                              handleRemoveSavedSlip(entry.ticketId || entry.publicCode)
                            }
                            className="col-span-2 sm:col-span-1 touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-border-strong bg-surface text-ink-secondary hover:text-status-emergency hover:border-status-emergency hover:bg-red-50 font-bold text-xs sm:text-sm transition-colors text-center"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span className="leading-snug">{t.slip.removeFromDeviceBtn}</span>
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
              className="card-surface p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="public-board-heading"
                      className="text-lg sm:text-xl font-extrabold text-ink-primary"
                    >
                      {t.home.boardTitle}
                    </h2>
                    {publicBoard.queueDate && (
                      <p className="text-xs text-ink-secondary">
                        Hospital Queue Date (IST):{' '}
                        <span className="font-token font-bold text-brand-primary">
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
                  className="btn-secondary text-xs sm:text-sm"
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
                  className="p-4 sm:p-5 rounded-2xl bg-brand-tealSoft border-2 border-brand-teal/40 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-serving text-white text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.home.emptyQueueBadge}</span>
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-brand-primary pt-0.5">
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
                      navigateToView('register');
                    }}
                    className="btn-primary text-xs sm:text-sm"
                  >
                    <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.home.emptyQueueCta}</span>
                  </button>
                </div>
              )}

              {/* Skeleton Loading Cards (Item 7) */}
              {boardLoading && boardItems.length === 0 && (
                <div
                  data-testid="board-skeleton-loader"
                  aria-busy="true"
                  aria-label="Loading hospital department queues"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="rounded-2xl border border-border-subtle bg-canvas p-4 space-y-4"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="skeleton-block h-6 w-16" />
                        <div className="skeleton-block h-6 w-20" />
                      </div>
                      <div className="skeleton-block h-6 w-3/4" />
                      <div className="skeleton-block h-16 w-full" />
                      <div className="skeleton-block h-10 w-full" />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                {boardItems.map((item) => {
                  const slug = item.slug;
                  const prefix = item.tokenPrefix || item.token_prefix;
                  const roomLabel = item.room_label;
                  const floorNum = item.floor_number;
                  const name = getLocalizedDepartment(item, lang, t).name;
                  const nowServing = item.nowServingCode || t.home.noActiveToken;
                  const waiting = item.waitingCount ?? 0;
                  const isDeptEmpty = waiting === 0 && !item.nowServingCode;
                  const spokenBoardSummary = `${name}. ${roomLabel}, ${t.floors[floorNum] || `Floor ${floorNum}`}. ${t.home.nowServing}: ${nowServing}. ${t.home.waitingCount}: ${waiting}. ${
                    isDeptEmpty
                      ? t.home.deptOpenImmediate
                      : `${t.home.estWait}: ${item.estimatedWaitMinutes ?? waiting * 7} ${t.home.mins}`
                  }.`;

                  return (
                    <article
                      key={slug}
                      className="card-3d h-full rounded-2xl border border-border-strong/70 bg-canvas p-4 sm:p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-token text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-primary text-white">
                            {prefix}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-token text-xs font-bold px-2 py-1 rounded-lg bg-surface text-ink-primary border border-border-subtle">
                              {roomLabel} · F{floorNum}
                            </span>
                            <VoiceListenButton
                              lang={lang}
                              testId={`board-listen-${slug}`}
                              text={spokenBoardSummary}
                            />
                          </div>
                        </div>
                        <h3 className="font-extrabold text-base text-ink-primary leading-snug min-h-[2.5rem] flex items-start">
                          {name}
                        </h3>
                      </div>

                      <div className="space-y-2.5 mt-auto">
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface border border-border-subtle text-center">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-ink-muted">
                              {t.home.nowServing}
                            </div>
                            <div className="font-token font-extrabold text-sm sm:text-base text-status-serving mt-0.5">
                              {nowServing}
                            </div>
                          </div>
                          <div className="border-l border-border-subtle">
                            <div className="text-[11px] font-bold uppercase text-ink-muted">
                              {t.home.waitingCount}
                            </div>
                            <div className="font-token font-extrabold text-base text-ink-primary mt-0.5">
                              {waiting}
                            </div>
                          </div>
                        </div>

                        {isDeptEmpty ? (
                          <div
                            data-testid={`dept-empty-status-${slug}`}
                            className="px-2.5 py-1.5 rounded-xl bg-green-50 border border-status-serving/40 text-status-serving text-xs font-bold text-center"
                          >
                            {t.home.deptOpenImmediate}
                          </div>
                        ) : (
                          <div className="px-2.5 py-1.5 rounded-xl bg-subtle border border-border-subtle text-ink-secondary text-xs font-bold text-center">
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
                          navigateToView('register', { regStep: 2 });
                        }}
                        className="btn-teal w-full text-xs sm:text-sm py-2.5"
                      >
                        <span>{t.home.registerHere}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 5 Patient FAQs on Home Screen (Item 15) */}
            <FaqSection
              lang={lang}
              standalone={false}
              onNavigate={navigateToView}
            />
          </div>
        )}

        {/* =================================================================
            VIEW 2: STEP-BY-STEP PATIENT REGISTRATION WIZARD
           ================================================================= */}
        {activeView === 'register' && (
          <section
            aria-labelledby="register-heading"
            className="card-surface p-5 sm:p-7 space-y-6"
          >
            <div className="border-b border-border-subtle pb-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2
                    id="register-heading"
                    className="text-xl sm:text-2xl font-extrabold text-ink-primary"
                  >
                    {t.register.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                    {t.register.subtitle}
                  </p>
                </div>

                <VoiceListenButton
                  lang={lang}
                  testId="register-wizard-listen-btn"
                  text={`${t.register.title}. ${t.register.subtitle}. ${
                    regStep === 1
                      ? t.register.selectDeptPrompt
                      : regStep === 2
                        ? `${t.register.patientSectionTitle}. ${t.register.patientSectionSubtitle}.`
                        : t.register.summaryHeading
                  }`}
                />
              </div>

              {/* 3-Step Visual Progress Bar */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                {[
                  { num: 1, label: t.register.step1 },
                  { num: 2, label: t.register.step2 },
                  { num: 3, label: t.register.step3 }
                ].map((s) => {
                  const cleanLabel = String(s.label || '').replace(/^\d+\.\s*/, '');
                  return (
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
                      className={`touch-target rounded-xl px-2.5 sm:px-3.5 py-2.5 text-[11px] sm:text-sm font-bold border-2 text-left transition flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2.5 ${
                        regStep === s.num
                          ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                          : regStep > s.num
                            ? 'bg-green-50 text-status-serving border-status-serving/50'
                            : 'bg-subtle text-ink-secondary border-border-subtle'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-token font-extrabold inline-flex items-center justify-center shrink-0 ${
                          regStep === s.num
                            ? 'bg-white text-brand-primary'
                            : regStep > s.num
                              ? 'bg-status-serving text-white'
                              : 'bg-surface text-ink-secondary border border-border-subtle'
                        }`}
                      >
                        {s.num}
                      </span>
                      <span className="leading-snug break-words">{cleanLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Voice-Assisted Registration Step Guide (Privacy-Safe, Multilingual EN/HI/TA) */}
              <RegistrationVoiceGuide lang={lang} regStep={regStep} />
            </div>

            {pendingRetryRequestId && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-amber-50 border-2 border-status-next text-ink-primary text-xs sm:text-sm font-semibold"
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
                    const locDept = getLocalizedDepartment(dept, lang, t);
                    const spokenDeptText = `${locDept.name}. ${locDept.doctor}. ${dept.room_label}, ${t.floors[dept.floor_number]}. ${locDept.landmark}.`;
                    return (
                      <div
                        key={dept.slug}
                        className={`card-3d rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-brand-primary/5 border-brand-primary ring-2 ring-brand-primary/20 shadow-sm'
                            : 'bg-canvas border-border-subtle hover:border-brand-primary/50 hover:bg-subtle/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-token text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-primary text-white">
                              {dept.token_prefix}
                            </span>
                            <span className="font-token text-xs font-bold px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-ink-primary">
                              {dept.room_label} · {t.floors[dept.floor_number]}
                            </span>
                          </div>
                          <VoiceListenButton
                            lang={lang}
                            testId={`dept-listen-${dept.slug}`}
                            text={spokenDeptText}
                          />
                        </div>

                        <button
                          type="button"
                          data-testid={`dept-card-${dept.slug}`}
                          onClick={() => {
                            setRegDeptSlug(dept.slug);
                            setDuplicateTicketInfo(null);
                            setRegError(null);
                            setRegStep(2);
                          }}
                          className="text-left w-full flex flex-col justify-between gap-3 focus:outline-none"
                        >
                          <div className="space-y-1.5">
                            <div className="font-extrabold text-base sm:text-lg text-ink-primary">
                              {locDept.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-secondary font-medium">
                              <Stethoscope
                                className="w-4 h-4 text-brand-teal shrink-0"
                                aria-hidden="true"
                              />
                              <span>{locDept.doctor}</span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-border-subtle text-xs text-ink-secondary flex items-center justify-between gap-2 w-full">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin
                                className="w-4 h-4 text-brand-teal shrink-0"
                                aria-hidden="true"
                              />
                              <span>{locDept.landmark}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-brand-primary shrink-0">
                              <span>{t.register.nextBtn}</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Patient Details, Visit Type & Avoid Stairs Accessibility Preference */}
            {regStep === 2 && (
              <div className="space-y-6">
                {/* Patient Identity Details Section */}
                <div className="p-4 sm:p-6 rounded-2xl bg-canvas border border-border-strong/70 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-subtle pb-3">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-brand-primary flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{t.register.patientSectionTitle}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-ink-secondary">
                        {t.register.patientSectionSubtitle}
                      </p>
                    </div>
                    <VoiceListenButton
                      lang={lang}
                      size="sm"
                      testId="voice-listen-reg-step2"
                      text={`${t.register.patientSectionTitle}. ${t.register.patientSectionSubtitle}. ${t.register.patientNameLabel}. ${t.register.phoneLabel}. ${t.register.ageLabel}. ${t.register.visitTypeLabel}. ${t.register.avoidStairsLabel}. ${t.register.avoidStairsHint}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="reg-patient-name"
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
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
                        className="touch-target w-full rounded-xl border-2 border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:text-base font-semibold text-ink-primary"
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
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
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
                        className="touch-target w-full rounded-xl border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-sm sm:text-base font-bold text-ink-primary"
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
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
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
                        className="touch-target w-full rounded-xl border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-sm sm:text-base font-bold text-ink-primary"
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
                        className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
                      >
                        {t.register.genderLabel}
                      </label>
                      <select
                        id="reg-patient-gender"
                        data-testid="reg-gender-select"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="touch-target w-full rounded-xl border-2 border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:text-base font-semibold text-ink-primary"
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
                      className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
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
                      className="touch-target w-full rounded-xl border-2 border-border-strong bg-surface px-3.5 py-2 text-sm font-mono text-ink-primary"
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
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                            : 'bg-canvas text-ink-primary border-border-strong'
                        }`}
                      >
                        {t.visitTypes[vt]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avoid Stairs Accessibility Preference */}
                <div className="p-4 sm:p-5 rounded-2xl bg-brand-tealSoft/60 border-2 border-brand-teal/40 space-y-2">
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.register.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="reg-step2-continue"
                    onClick={handleContinueFromStep2}
                    className="btn-primary"
                  >
                    <span>{t.register.nextBtn}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {regStep === 3 && selectedRegDept && (
              <div className="space-y-5">
                <div className="p-5 sm:p-6 rounded-2xl bg-canvas border-2 border-border-strong/70 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <h3 className="font-extrabold text-base sm:text-lg text-ink-primary">
                      {t.register.summaryHeading}
                    </h3>
                    <VoiceListenButton
                      lang={lang}
                      size="sm"
                      testId="voice-listen-reg-step3"
                      text={`${t.register.summaryHeading}. ${t.register.patientLabel}: ${regPatientName.trim()}. ${t.register.deptLabel}: ${getLocalizedDepartment(selectedRegDept, lang, t).name}. ${t.register.doctorLabel}: ${getLocalizedDepartment(selectedRegDept, lang, t).doctor}. ${t.register.roomLabel}: ${selectedRegDept.room_label}, ${t.floors[selectedRegDept.floor_number]}. ${t.register.visitTypeLabel}: ${t.visitTypes[regVisitType]}.`}
                    />
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.patientLabel}
                      </dt>
                      <dd
                        data-testid="reg-summary-patient-name"
                        className="font-extrabold text-base text-ink-primary mt-0.5"
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
                        {getLocalizedDepartment(selectedRegDept, lang, t).name}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-ink-muted">
                        {t.register.doctorLabel}
                      </dt>
                      <dd className="font-bold text-base text-ink-primary mt-0.5">
                        {getLocalizedDepartment(selectedRegDept, lang, t).doctor}
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
                        {regAvoidStairs ? t.slip.routeAvoidStairs : t.slip.routeStandard}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Friendly Duplicate Active Ticket Banner */}
                {duplicateTicketInfo && (
                  <div
                    role="alert"
                    data-testid="duplicate-ticket-banner"
                    className="p-5 rounded-2xl bg-amber-50 border-2 border-status-next text-ink-primary space-y-3"
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
                        className="btn-primary text-xs sm:text-sm"
                      >
                        <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
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
                        className="btn-secondary text-xs sm:text-sm"
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
                    className="btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.register.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="reg-confirm-submit-btn"
                    disabled={regSubmitting}
                    onClick={handleConfirmRegistration}
                    className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-status-serving hover:bg-emerald-800 text-white font-bold px-6 py-3.5 text-sm sm:text-base shadow-sm disabled:opacity-60 transition"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
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
              navigateToView('my-turn');
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
              navigateToView('navigate');
            }}
            onRegisterNew={() => {
              setDuplicateTicketInfo(null);
              setRegError(null);
              setRegStep(1);
              navigateToView('register', { regStep: 1 });
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
              navigateToView('register', { regStep: 1 });
            }}
            onOpenDirections={({ fromNodeId, toNodeId, avoidStairs }) => {
              setRouteQuery({
                fromNodeId: fromNodeId || 'registration_desk',
                toNodeId: toNodeId || 'room_204_med',
                avoidStairs: Boolean(avoidStairs ?? true)
              });
              navigateToView('navigate');
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
            onDepartmentsUpdated={fetchInitialData}
            savedSlips={savedSlips}
            onTicketMutated={handleStaffTicketMutated}
            onSyncSavedSlips={handleStaffSyncSavedSlips}
          />
        )}

        {/* =================================================================
            VIEW 7: ABOUT, FAQ, PRIVACY, TERMS, THANK YOU & 404 PAGES
           ================================================================= */}
        {activeView === 'about' && (
          <AboutPageView
            lang={lang}
            onNavigate={navigateToView}
            onStartRegister={() => {
              setDuplicateTicketInfo(null);
              setRegError(null);
              setRegStep(1);
              navigateToView('register');
            }}
          />
        )}

        {activeView === 'faq' && (
          <div className="space-y-4">
            <FaqSection lang={lang} />
          </div>
        )}

        {activeView === 'privacy' && (
          <PrivacyPolicyView
            lang={lang}
            onNavigate={navigateToView}
          />
        )}

        {activeView === 'terms' && (
          <TermsPageView
            lang={lang}
            onNavigate={navigateToView}
          />
        )}

        {activeView === 'thank-you' && (
          <ThankYouPageView
            lang={lang}
            activeSlip={activeSavedEntry?.ticket || trackedSlip}
            onNavigate={navigateToView}
          />
        )}

        {activeView === 'not-found' && (
          <NotFoundPageView
            lang={lang}
            onNavigate={navigateToView}
          />
        )}
      </main>

      {/* Clinical Footer with Verified Links */}
      <ClinicalFooter
        lang={lang}
        t={t}
        onNavigate={navigateToView}
        onOpenEmergency={openEmergencyModal}
      />

      {/* Back to Top Floating Control */}
      <button
        type="button"
        onClick={handleScrollToTop}
        data-testid="back-to-top-btn"
        aria-label="Scroll back to top"
        className={`fixed bottom-5 right-5 z-30 inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3.5 py-2.5 text-xs font-bold text-text-primary shadow-card transition-all duration-150 hover:bg-subtle active:scale-[0.97] ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <ChevronUp className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        <span>Top</span>
      </button>

      {/* Floating Circular Patient Help Chatbot (Right-Middle of Screen) */}
      <PatientHelpChatbot
        lang={lang}
        t={t}
        activeSlip={activeSavedEntry?.ticket || trackedSlip}
        savedSlips={savedSlips}
        departments={departments}
        boardItems={boardItems}
        onNavigate={navigateToView}
        onOpenDirections={({ fromNodeId, toNodeId, avoidStairs }) => {
          setRouteQuery({
            fromNodeId: fromNodeId || 'registration_desk',
            toNodeId: toNodeId || 'room_204_med',
            avoidStairs: Boolean(avoidStairs ?? true)
          });
          navigateToView('navigate');
        }}
        onOpenEmergency={openEmergencyModal}
        onSelectSavedSlip={handleSelectSavedSlip}
      />

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
