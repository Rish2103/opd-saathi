import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Languages,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserPlus,
  X
} from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';
import EmergencyModal from './EmergencyModal.jsx';
import {
  getKioskTranslations,
  getLocalizedDepartment
} from '../i18n/kioskTranslations.js';
import { findAccessibleRoute } from '../../shared/navigation/pathfinder.js';
import '../styles/kiosk.css';

export const KIOSK_PENDING_REG_KEY = 'opd_kiosk_pending_registration_v1';
export const DEFAULT_KIOSK_TIMEOUT_SEC = 180; // 3 minutes default
export const DEFAULT_KIOSK_WARNING_SEC = 30;

function generateKioskRequestUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeKioskPhone(rawPhone) {
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

export function validateKioskPatientInput({ patientName = '', phone = '', age = '' }, t) {
  const errors = {};
  const trimmedName = String(patientName || '').trim().replace(/\s+/g, ' ');
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    errors.patientName = t.register.validationNameRequired;
  }

  const normalizedPhone = normalizeKioskPhone(phone);
  if (!normalizedPhone) {
    errors.phone = t.register.validationPhoneInvalid;
  }

  const parsedAge = Number(age);
  if (
    age === '' ||
    age === null ||
    age === undefined ||
    !Number.isInteger(parsedAge) ||
    parsedAge < 0 ||
    parsedAge > 120
  ) {
    errors.age = t.register.validationAgeInvalid;
  }

  return errors;
}

export default function KioskModeView({
  initialLang = 'en',
  initialScreen = 'welcome',
  initialRegStep = 1,
  initialDepartments = [],
  initialNodes = [],
  initialSlip = null,
  initialDuplicateTicket = null,
  initialTimeoutWarning = false,
  initialPatientName = '',
  initialPhone = '',
  initialAge = '',
  initialGender = 'PREFER_NOT_TO_SAY',
  initialRegistrationNumber = '',
  initialVisitType = 'FIRST_VISIT',
  initialAvoidStairs = true,
  initialFieldErrors = {},
  initialLookupSlip = null,
  initialStaffExitModalOpen = false,
  initialSessionResetNotice = false,
  inactivityTimeoutSec = DEFAULT_KIOSK_TIMEOUT_SEC,
  warningLeadSec = DEFAULT_KIOSK_WARNING_SEC,
  staffAuth = { authenticated: false, loginAt: null },
  setStaffAuth = null,
  onExitKiosk = null
}) {
  const [lang, setLang] = useState(
    ['en', 'hi', 'ta'].includes(initialLang) ? initialLang : 'en'
  );
  const [assistedMode, setAssistedMode] = useState(false);
  const [kioskScreen, setKioskScreen] = useState(initialScreen);
  const [regStep, setRegStep] = useState(initialRegStep);

  const [departments, setDepartments] = useState(() =>
    Array.isArray(initialDepartments) ? initialDepartments : []
  );
  const [hospitalNodes, setHospitalNodes] = useState(() =>
    Array.isArray(initialNodes) ? initialNodes : []
  );

  // Registration Form State (Held strictly in temporary React state; never in localStorage)
  const [selectedDeptSlug, setSelectedDeptSlug] = useState(
    () => initialDepartments?.[0]?.slug || 'general-medicine'
  );
  const [patientName, setPatientName] = useState(initialPatientName);
  const [phone, setPhone] = useState(initialPhone);
  const [age, setAge] = useState(initialAge);
  const [gender, setGender] = useState(initialGender);
  const [registrationNumber, setRegistrationNumber] = useState(initialRegistrationNumber);
  const [visitType, setVisitType] = useState(initialVisitType);
  const [avoidStairs, setAvoidStairs] = useState(initialAvoidStairs);

  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors || {});
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState(null);
  const [duplicateTicketInfo, setDuplicateTicketInfo] = useState(
    initialDuplicateTicket
  );
  const [pendingRetryRequestId, setPendingRetryRequestId] = useState(null);

  // Confirmed Kiosk Slip State (Current private kiosk interaction only)
  const [kioskSlip, setKioskSlip] = useState(initialSlip);
  const [printedNotice, setPrintedNotice] = useState(false);

  // Existing Token Lookup State (Secondary welcome screen action)
  const [lookupCode, setLookupCode] = useState('');
  const [lookupSlip, setLookupSlip] = useState(initialLookupSlip);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Emergency Route Inline Display & Emergency Modal Ref
  const [emergencyRouteOpen, setEmergencyRouteOpen] = useState(false);
  const emergencyDialogRef = useRef(null);

  // Optional Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenUnsupported, setFullscreenUnsupported] = useState(false);

  // Authorised Staff Exit Modal State
  const [staffExitModalOpen, setStaffExitModalOpen] = useState(initialStaffExitModalOpen);
  const [staffPinInput, setStaffPinInput] = useState('');
  const [staffPinError, setStaffPinError] = useState(null);
  const [staffVerifying, setStaffVerifying] = useState(false);

  // Adjustable Inactivity Timer & Privacy Reset State
  const [configuredTimeoutSec, setConfiguredTimeoutSec] = useState(() =>
    Math.max(10, Number(inactivityTimeoutSec) || DEFAULT_KIOSK_TIMEOUT_SEC)
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    initialTimeoutWarning
      ? Math.min(15, Math.max(5, Number(warningLeadSec) || 15))
      : Math.max(10, Number(inactivityTimeoutSec) || DEFAULT_KIOSK_TIMEOUT_SEC)
  );
  const [sessionResetNotice, setSessionResetNotice] = useState(initialSessionResetNotice);

  const t = useMemo(() => getKioskTranslations(lang), [lang]);

  const effectiveWarningLead = useMemo(
    () =>
      Math.min(
        Math.max(5, Number(warningLeadSec) || DEFAULT_KIOSK_WARNING_SEC),
        Math.max(5, Math.floor(configuredTimeoutSec / 2))
      ),
    [warningLeadSec, configuredTimeoutSec]
  );

  // Determine if the kiosk currently holds any active interaction or patient data
  const hasActiveSessionData =
    kioskScreen !== 'welcome' ||
    Boolean(patientName.trim()) ||
    Boolean(phone.trim()) ||
    Boolean(age.trim()) ||
    Boolean(registrationNumber.trim()) ||
    Boolean(kioskSlip) ||
    Boolean(lookupSlip) ||
    Boolean(lookupCode.trim()) ||
    emergencyRouteOpen ||
    staffExitModalOpen ||
    initialTimeoutWarning;

  const isApiRequestPending = regSubmitting || lookupLoading || staffVerifying;

  const showTimeoutWarning =
    hasActiveSessionData &&
    !isApiRequestPending &&
    (initialTimeoutWarning ||
      (remainingSeconds > 0 && remainingSeconds <= effectiveWarningLead));

  // Clear temporary pending sessionStorage helper
  const clearKioskPendingSessionStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(KIOSK_PENDING_REG_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Complete Privacy-Safe Session Reset (Does NOT cancel the server ticket)
  const resetKioskSession = useCallback(
    ({ showResetBanner = false } = {}) => {
      clearKioskPendingSessionStorage();
      setPendingRetryRequestId(null);
      setPatientName('');
      setPhone('');
      setAge('');
      setGender('PREFER_NOT_TO_SAY');
      setRegistrationNumber('');
      setVisitType('FIRST_VISIT');
      setAvoidStairs(true);
      setFieldErrors({});
      setRegError(null);
      setDuplicateTicketInfo(null);
      setKioskSlip(null);
      setPrintedNotice(false);
      setLookupCode('');
      setLookupSlip(null);
      setLookupError(null);
      setEmergencyRouteOpen(false);
      setStaffExitModalOpen(false);
      setStaffPinInput('');
      setStaffPinError(null);
      setRegStep(1);
      setKioskScreen('welcome');
      setRemainingSeconds(configuredTimeoutSec);
      setSessionResetNotice(Boolean(showResetBanner));
    },
    [clearKioskPendingSessionStorage, configuredTimeoutSec]
  );

  // Record user activity and reset inactivity countdown
  const recordUserActivity = useCallback(() => {
    setRemainingSeconds(configuredTimeoutSec);
  }, [configuredTimeoutSec]);

  // Fetch active departments and hospital nodes if not preloaded
  useEffect(() => {
    if (typeof fetch !== 'function') return;
    let cancelled = false;

    async function loadKioskMetadata() {
      try {
        const requests = [];
        if (departments.length === 0) {
          requests.push(
            fetch('/api/departments', { headers: { Accept: 'application/json' } })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (!cancelled && Array.isArray(data?.departments) && data.departments.length > 0) {
                  setDepartments(data.departments);
                  setSelectedDeptSlug((prev) => prev || data.departments[0].slug);
                }
              })
              .catch(() => {})
          );
        }
        if (hospitalNodes.length === 0) {
          requests.push(
            fetch('/api/routes/nodes', { headers: { Accept: 'application/json' } })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (!cancelled && Array.isArray(data?.nodes)) {
                  setHospitalNodes(data.nodes);
                }
              })
              .catch(() => {})
          );
        }
        await Promise.all(requests);
      } catch {
        // gracefully degrade
      }
    }

    loadKioskMetadata();
    return () => {
      cancelled = true;
    };
  }, [departments.length, hospitalNodes.length]);

  // Clear any stale kiosk pending sessionStorage on initial mount if older than 5 minutes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(KIOSK_PENDING_REG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        !parsed?.requestId ||
        !parsed?.payload ||
        Date.now() - Number(parsed.createdAt || 0) > 5 * 60 * 1000
      ) {
        window.sessionStorage.removeItem(KIOSK_PENDING_REG_KEY);
      }
    } catch {
      clearKioskPendingSessionStorage();
    }
  }, [clearKioskPendingSessionStorage]);

  // Inactivity countdown interval (paused while any API request is pending)
  useEffect(() => {
    if (!hasActiveSessionData || isApiRequestPending) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          resetKioskSession({ showResetBanner: true });
          return configuredTimeoutSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    hasActiveSessionData,
    isApiRequestPending,
    configuredTimeoutSec,
    resetKioskSession
  ]);

  // Sync fullscreen change events
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const selectedDept = useMemo(
    () =>
      departments.find((d) => d.slug === selectedDeptSlug) ||
      departments[0] ||
      null,
    [departments, selectedDeptSlug]
  );

  const emergencyRoute = useMemo(
    () =>
      findAccessibleRoute({
        fromNodeId: 'registration_desk',
        toNodeId: 'emergency_casualty',
        avoidStairs: true
      }),
    []
  );

  const slipRoute = useMemo(() => {
    const targetSlip = kioskSlip || lookupSlip;
    if (!targetSlip) return null;
    const destNodeId =
      targetSlip.department?.destination_node_id || 'room_204_med';
    return findAccessibleRoute({
      fromNodeId: 'registration_desk',
      toNodeId: destNodeId,
      avoidStairs: Boolean(targetSlip.avoidStairs ?? avoidStairs ?? true)
    });
  }, [kioskSlip, lookupSlip, avoidStairs]);

  // Optional Fullscreen Toggle with graceful browser fallback
  async function handleToggleFullscreen() {
    recordUserActivity();
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
        setIsFullscreen(false);
        return;
      }
      const rootEl = document.documentElement;
      if (
        document.fullscreenEnabled === false ||
        typeof rootEl?.requestFullscreen !== 'function'
      ) {
        setFullscreenUnsupported(true);
        return;
      }
      await rootEl.requestFullscreen();
      setIsFullscreen(true);
      setFullscreenUnsupported(false);
    } catch {
      setFullscreenUnsupported(true);
    }
  }

  // Emergency Modal Controls
  function openEmergencyModal() {
    recordUserActivity();
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
    recordUserActivity();
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

  // Step 2 Validation (reuses identical rules to main application & server schema)
  function validatePatientFields() {
    const errors = {};
    const trimmedName = patientName.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      errors.patientName = t.register.validationNameRequired;
    }

    const normalizedPhone = normalizeKioskPhone(phone);
    if (!normalizedPhone) {
      errors.phone = t.register.validationPhoneInvalid;
    }

    const parsedAge = Number(age);
    if (
      age === '' ||
      !Number.isInteger(parsedAge) ||
      parsedAge < 0 ||
      parsedAge > 120
    ) {
      errors.age = t.register.validationAgeInvalid;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinueFromStep2() {
    recordUserActivity();
    setDuplicateTicketInfo(null);
    setRegError(null);
    if (validatePatientFields()) {
      setRegStep(3);
    }
  }

  // Submit Registration to Real Backend API (`POST /api/tickets`)
  async function handleConfirmKioskRegistration() {
    recordUserActivity();
    if (regSubmitting) return;

    if (!validatePatientFields()) {
      setRegStep(2);
      return;
    }

    setRegSubmitting(true);
    setRegError(null);
    setDuplicateTicketInfo(null);

    try {
      const normalizedPhone = normalizeKioskPhone(phone) || phone.trim();
      const trimmedName = patientName.trim().replace(/\s+/g, ' ');
      const numericAge = Number(age);
      const trimmedRegNo = registrationNumber.trim();

      const payload = {
        departmentId: selectedDeptSlug,
        patientName: trimmedName,
        phone: normalizedPhone,
        age: numericAge,
        gender: gender || 'PREFER_NOT_TO_SAY',
        ...(trimmedRegNo ? { registrationNumber: trimmedRegNo } : {}),
        visitType,
        preferredLang: lang,
        avoidStairs: Boolean(avoidStairs)
      };

      // Reuse existing pending requestId ONLY for an unacknowledged retry with identical payload
      let requestId = pendingRetryRequestId;
      if (typeof window !== 'undefined') {
        try {
          const existingRaw = window.sessionStorage.getItem(KIOSK_PENDING_REG_KEY);
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
              requestId = generateKioskRequestUuid();
            }
          } else {
            requestId = generateKioskRequestUuid();
          }

          window.sessionStorage.setItem(
            KIOSK_PENDING_REG_KEY,
            JSON.stringify({
              requestId,
              payload,
              createdAt: Date.now()
            })
          );
          setPendingRetryRequestId(requestId);
        } catch {
          if (!requestId) requestId = generateKioskRequestUuid();
        }
      } else if (!requestId) {
        requestId = generateKioskRequestUuid();
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

      // Clear temporary pending sessionStorage once server responds definitively
      clearKioskPendingSessionStorage();
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

      // Store the genuine server-generated ticket in temporary kiosk state ONLY (never localStorage)
      setKioskSlip(data.ticket);
      setPrintedNotice(false);
      setKioskScreen('slip');
      setRemainingSeconds(configuredTimeoutSec);
    } catch (err) {
      setRegError(
        err.message ||
          'Network connection interrupted. Tap Confirm again to safely recover your token without creating a duplicate.'
      );
    } finally {
      setRegSubmitting(false);
    }
  }

  // Reopen an existing duplicate ticket via public lookup (`GET /api/slips/:publicCode`)
  async function handleReopenDuplicateTicket() {
    recordUserActivity();
    if (!duplicateTicketInfo?.publicCode) return;

    setRegSubmitting(true);
    setRegError(null);
    try {
      const res = await fetch(
        `/api/slips/${encodeURIComponent(duplicateTicketInfo.publicCode)}`,
        {
          headers: { Accept: 'application/json' }
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.slip) {
        throw new Error(
          data?.error?.message ||
            `Could not load existing slip ${duplicateTicketInfo.publicCode}.`
        );
      }
      setKioskSlip(data.slip);
      setDuplicateTicketInfo(null);
      setPrintedNotice(false);
      setKioskScreen('slip');
    } catch (err) {
      setRegError(err.message || 'Could not load existing token slip.');
    } finally {
      setRegSubmitting(false);
    }
  }

  // Secondary Welcome Action: Look up existing token status (`GET /api/slips/:publicCode`)
  async function handleLookupExistingToken(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    recordUserActivity();
    const code = String(lookupCode || '')
      .trim()
      .toUpperCase();
    if (!code) return;

    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/slips/${encodeURIComponent(code)}`, {
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data?.slip) {
        throw new Error(
          data?.error?.message || `Could not find token ${code}.`
        );
      }
      setLookupSlip(data.slip);
    } catch (err) {
      setLookupSlip(null);
      setLookupError(err.message || 'Failed to look up token status.');
    } finally {
      setLookupLoading(false);
    }
  }

  // Authorised Staff Exit Handler (Always requires fresh Staff PIN entry to exit public kiosk mode)
  function handleRequestStaffExit() {
    recordUserActivity();
    setStaffPinInput('');
    setStaffPinError(null);
    setStaffExitModalOpen(true);
  }

  async function handleVerifyStaffPinAndExit(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    recordUserActivity();
    if (!staffPinInput.trim() || staffVerifying) return;

    setStaffVerifying(true);
    setStaffPinError(null);
    try {
      const res = await fetch('/api/staff/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ pin: staffPinInput.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data?.authenticated) {
        setStaffPinError(data?.error?.message || t.kiosk.staffInvalidPinError);
        return;
      }
      if (typeof setStaffAuth === 'function') {
        setStaffAuth({
          authenticated: true,
          loginAt: data.loginAt || new Date().toISOString()
        });
      }
      resetKioskSession({ showResetBanner: false });
      if (typeof onExitKiosk === 'function') {
        onExitKiosk();
      }
    } catch {
      setStaffPinError(t.kiosk.staffInvalidPinError);
    } finally {
      setStaffVerifying(false);
    }
  }

  const normalizedPreviewPhone = normalizeKioskPhone(phone);
  const maskedPreviewPhone = normalizedPreviewPhone
    ? `******${normalizedPreviewPhone.slice(-4)}`
    : phone;

  return (
    <div
      data-testid="kiosk-mode-root"
      data-assisted={assistedMode ? 'true' : 'false'}
      lang={lang}
      onPointerDown={recordUserActivity}
      onKeyDown={recordUserActivity}
      onTouchStart={recordUserActivity}
      className={`kiosk-shell ${
        lang === 'hi'
          ? 'font-devanagari'
          : lang === 'ta'
            ? 'font-tamil'
            : ''
      }`}
    >
      {/* =====================================================================
          PERSISTENT KIOSK TERMINAL TOP HEADER (Available on every screen)
         ===================================================================== */}
      <header className="kiosk-no-print sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b-2 border-border-strong px-3 sm:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Wordmark */}
          <div
            data-testid="kiosk-brand-header"
            className="flex items-center gap-3 min-w-0"
          >
            <BrandLogo
              title={t.brandTitle}
              subtitle={t.kiosk.badge}
              compact={false}
              onClick={() => {
                if (kioskScreen !== 'welcome') {
                  resetKioskSession({ showResetBanner: false });
                }
              }}
            />
          </div>

          {/* Persistent Language, Accessibility, Fullscreen, Staff Exit & Emergency Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Trilingual Selector (Native Scripts) */}
            <div
              role="group"
              aria-label="Kiosk Language Selector"
              data-testid="kiosk-language-selector"
              className="inline-flex items-center rounded-xl bg-subtle border-2 border-brand-primary/30 p-1 gap-1"
            >
              <Languages
                className="w-4 h-4 text-brand-primary ml-1.5 hidden sm:inline shrink-0"
                aria-hidden="true"
              />
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'ta', label: 'தமிழ்' }
              ].map((opt) => {
                const isActive = lang === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    data-testid={`kiosk-lang-${opt.code}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      recordUserActivity();
                      setLang(opt.code);
                    }}
                    className={`min-h-[42px] px-3 py-1.5 rounded-lg font-extrabold text-xs sm:text-sm transition ${
                      isActive
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-brand-primary hover:bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Small Unobtrusive Accessibility Control (Large Text / High Contrast) */}
            <button
              type="button"
              data-testid="kiosk-assisted-toggle"
              aria-pressed={assistedMode}
              onClick={() => {
                recordUserActivity();
                setAssistedMode((prev) => !prev);
              }}
              className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition ${
                assistedMode
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-surface text-brand-primary border-border-strong'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{assistedMode ? t.assistedOn : t.assistedOff}</span>
            </button>

            {/* Optional Fullscreen Toggle */}
            <button
              type="button"
              data-testid="kiosk-fullscreen-btn"
              onClick={handleToggleFullscreen}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-border-strong bg-surface text-ink-primary text-xs sm:text-sm font-bold"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {isFullscreen
                  ? t.kiosk.fullscreenExitBtn
                  : t.kiosk.fullscreenEnterBtn}
              </span>
            </button>

            {/* Permanently Accessible Emergency Help Action */}
            <button
              type="button"
              data-testid="kiosk-emergency-btn"
              onClick={openEmergencyModal}
              className="kiosk-btn-emergency text-xs sm:text-sm"
              aria-haspopup="dialog"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.emergencyBtn}</span>
            </button>
          </div>
        </div>

        {/* Optional Fullscreen Fallback Banner */}
        {fullscreenUnsupported && (
          <div
            role="status"
            data-testid="kiosk-fullscreen-fallback"
            className="max-w-7xl mx-auto mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between gap-2"
          >
            <span>{t.kiosk.fullscreenUnsupportedNote}</span>
            <button
              type="button"
              onClick={() => setFullscreenUnsupported(false)}
              className="px-2 py-0.5 rounded bg-amber-200/70 text-amber-950 font-extrabold"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* =====================================================================
          INACTIVITY TIMEOUT WARNING BANNER / DIALOG (Before Session Expires)
         ===================================================================== */}
      {showTimeoutWarning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="kiosk-timeout-warning-title"
          data-testid="kiosk-timeout-warning"
          className="kiosk-no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-xl rounded-3xl bg-surface border-4 border-status-next p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-status-next mx-auto flex items-center justify-center">
              <Timer className="w-9 h-9" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2
                id="kiosk-timeout-warning-title"
                className="text-xl sm:text-2xl font-extrabold text-ink-primary"
              >
                {t.kiosk.inactivityWarningTitle}
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
                {t.kiosk.inactivityWarningDesc}
              </p>
              <div
                data-testid="kiosk-timeout-countdown"
                className="font-token text-4xl sm:text-5xl font-black text-status-next pt-2"
              >
                {remainingSeconds}s
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                data-testid="kiosk-timeout-continue-btn"
                onClick={() => {
                  setRemainingSeconds(configuredTimeoutSec);
                }}
                className="kiosk-btn-primary w-full text-base sm:text-lg"
              >
                <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.continueSessionBtn}</span>
              </button>

              <button
                type="button"
                data-testid="kiosk-timeout-reset-now-btn"
                onClick={() => resetKioskSession({ showResetBanner: true })}
                className="kiosk-btn-secondary w-full text-sm sm:text-base"
              >
                <RefreshCw className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.resetNowBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INLINE EMERGENCY ROUTE BANNER (When Route to Room 101 is Requested)
         ===================================================================== */}
      {emergencyRouteOpen && (
        <section
          role="region"
          aria-label={t.kiosk.emergencyRouteBannerTitle}
          data-testid="kiosk-emergency-route-banner"
          className="kiosk-no-print max-w-6xl w-full mx-auto mt-4 px-3 sm:px-6"
        >
          <div className="rounded-2xl bg-red-50 border-2 border-status-emergency p-4 sm:p-6 space-y-4 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-status-emergency font-extrabold text-base sm:text-lg">
                  <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span>{t.kiosk.emergencyRouteBannerTitle}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-ink-primary">
                  {t.kiosk.emergencyRouteBannerSub}
                </p>
              </div>
              <button
                type="button"
                data-testid="kiosk-close-emergency-route-btn"
                onClick={() => setEmergencyRouteOpen(false)}
                className="kiosk-btn-secondary text-xs sm:text-sm min-h-[48px] px-4 py-2"
              >
                <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.closeEmergencyRouteBtn}</span>
              </button>
            </div>

            {emergencyRoute?.steps?.length > 0 && (
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {emergencyRoute.steps.map((step) => (
                  <li
                    key={step.stepNumber}
                    className="p-3.5 rounded-xl bg-white border border-red-200 flex items-start gap-3"
                  >
                    <span className="w-7 h-7 rounded-full bg-status-emergency text-white font-token font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {step.stepNumber}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-ink-primary leading-snug">
                      {lang === 'hi'
                        ? step.instruction_hi
                        : lang === 'ta'
                          ? step.instruction_ta || step.instruction_en
                          : step.instruction_en}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          MAIN KIOSK WORKSPACE
         ===================================================================== */}
      <main
        id="kiosk-main-content"
        className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 flex flex-col justify-between gap-6"
      >
        {/* Session Reset Privacy Notification */}
        {sessionResetNotice && kioskScreen === 'welcome' && (
          <div
            role="status"
            data-testid="kiosk-session-reset-notice"
            className="kiosk-no-print p-4 rounded-2xl bg-emerald-50 border-2 border-status-serving text-status-serving font-extrabold text-sm sm:text-base flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.kiosk.sessionResetBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSessionResetNotice(false)}
              className="px-3 py-1 rounded-lg bg-emerald-100 text-status-serving font-bold text-xs"
            >
              OK
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 1: KIOSK WELCOME SCREEN
           =================================================================== */}
        {kioskScreen === 'welcome' && (
          <section
            aria-labelledby="kiosk-welcome-heading"
            data-testid="kiosk-welcome-screen"
            className="space-y-6"
          >
            {/* Hero Welcome Card */}
            <div className="mastercard-3d-hero text-white rounded-3xl p-6 sm:p-10 shadow-elevated border border-white/15 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F5A623] text-xs sm:text-sm font-extrabold tracking-wide">
                <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.badge}</span>
              </div>

              <div className="space-y-3 max-w-3xl">
                <h1
                  id="kiosk-welcome-heading"
                  className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
                >
                  {t.kiosk.welcomeTitle}
                </h1>
                <p className="text-base sm:text-xl text-slate-200 leading-relaxed">
                  {t.kiosk.welcomeSubtitle}
                </p>
              </div>

              {/* Prominent Language Selection Cards (Native Scripts) */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/15 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#F5A623] uppercase tracking-wider flex items-center gap-2">
                    <Languages className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{t.kiosk.selectLanguageHeading}</span>
                  </h2>
                  <span className="text-xs sm:text-sm text-slate-200">
                    {t.kiosk.selectLanguageHint}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    {
                      code: 'en',
                      nativeName: 'English',
                      sub: 'Register in English'
                    },
                    {
                      code: 'hi',
                      nativeName: 'हिन्दी',
                      sub: 'हिन्दी में पंजीकरण करें'
                    },
                    {
                      code: 'ta',
                      nativeName: 'தமிழ்',
                      sub: 'தமிழில் பதிவு செய்யவும்'
                    }
                  ].map((item) => {
                    const isSelected = lang === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        data-testid={`kiosk-welcome-lang-${item.code}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          recordUserActivity();
                          setLang(item.code);
                        }}
                        className={`min-h-[72px] rounded-2xl p-4 text-left border-2 transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-white text-brand-primary border-[#E59838] shadow-lg ring-4 ring-[#E59838]/30'
                            : 'bg-[#2D251E]/80 text-white border-white/25 hover:bg-[#3A3028]'
                        }`}
                      >
                        <div>
                          <div className="text-xl sm:text-2xl font-extrabold leading-snug">
                            {item.nativeName}
                          </div>
                          <div
                            className={`text-xs sm:text-sm font-semibold mt-0.5 ${
                              isSelected ? 'text-brand-teal' : 'text-slate-300'
                            }`}
                          >
                            {item.sub}
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-brand-teal text-white'
                              : 'border-2 border-white/40 text-transparent'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary & Secondary Touch Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                {/* Primary CTA: Start OPD Registration */}
                <button
                  type="button"
                  data-testid="kiosk-start-registration-btn"
                  onClick={() => {
                    recordUserActivity();
                    setSessionResetNotice(false);
                    setDuplicateTicketInfo(null);
                    setRegError(null);
                    setRegStep(1);
                    setKioskScreen('register');
                  }}
                  className="lg:col-span-2 min-h-[76px] w-full rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-brand-primary border-4 border-[#E59838] px-6 py-4 shadow-xl flex items-center justify-between gap-4 text-left transition"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center shrink-0">
                      <UserPlus className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-black text-brand-primary leading-tight">
                        {t.kiosk.startRegistrationBtn}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-ink-secondary mt-1">
                        {t.kiosk.startRegistrationSub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-7 h-7 text-brand-teal shrink-0"
                    aria-hidden="true"
                  />
                </button>

                {/* Secondary Action: Check Existing Token Status */}
                <button
                  type="button"
                  data-testid="kiosk-check-token-btn"
                  onClick={() => {
                    recordUserActivity();
                    setSessionResetNotice(false);
                    setLookupError(null);
                    setLookupSlip(null);
                    setKioskScreen('lookup');
                  }}
                  className="min-h-[76px] w-full rounded-2xl bg-brand-teal hover:bg-brand-tealHover active:scale-[0.99] text-white border-2 border-[#E59838]/50 px-5 py-4 shadow-lg flex items-center justify-between gap-3 text-left transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <Search className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-extrabold leading-snug">
                        {t.kiosk.checkExistingTokenBtn}
                      </div>
                      <div className="text-xs text-[#EAE0D5] mt-0.5 line-clamp-2">
                        {t.kiosk.checkExistingTokenSub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* 3 Simple Steps Visual Guide */}
            <div className="card-surface p-5 sm:p-6 space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-brand-primary">
                {t.kiosk.quickStepsTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: t.kiosk.quickStep1Title,
                    desc: t.kiosk.quickStep1Desc,
                    icon: Stethoscope
                  },
                  {
                    title: t.kiosk.quickStep2Title,
                    desc: t.kiosk.quickStep2Desc,
                    icon: UserPlus
                  },
                  {
                    title: t.kiosk.quickStep3Title,
                    desc: t.kiosk.quickStep3Desc,
                    icon: Printer
                  }
                ].map((stepCard, idx) => {
                  const Icon = stepCard.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-canvas border border-border-strong/70 flex items-start gap-3.5"
                    >
                      <div className="w-11 h-11 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm sm:text-base text-ink-primary">
                          {stepCard.title}
                        </div>
                        <p className="text-xs sm:text-sm text-ink-secondary mt-1 leading-relaxed">
                          {stepCard.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            SCREEN 2: 3-STEP KIOSK REGISTRATION FLOW
           =================================================================== */}
        {kioskScreen === 'register' && (
          <section
            aria-labelledby="kiosk-register-heading"
            data-testid="kiosk-register-screen"
            className="card-surface p-5 sm:p-8 space-y-6"
          >
            {/* Top Step Progress Indicator */}
            <div className="border-b-2 border-border-subtle pb-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1
                    id="kiosk-register-heading"
                    className="text-xl sm:text-3xl font-extrabold text-brand-primary"
                  >
                    {t.register.title}
                  </h1>
                  <p className="text-sm sm:text-base text-ink-secondary mt-1">
                    {t.register.subtitle}
                  </p>
                </div>
                <span className="font-token text-xs font-bold px-3 py-1.5 rounded-full bg-subtle border border-border-strong text-ink-secondary">
                  {t.kiosk.inactivityTimerLabel}: {remainingSeconds}s
                </span>
              </div>

              <div
                role="group"
                aria-label={t.kiosk.stepProgressLabel}
                className="grid grid-cols-3 gap-2 sm:gap-4"
              >
                {[
                  { num: 1, label: t.kiosk.step1Short },
                  { num: 2, label: t.kiosk.step2Short },
                  { num: 3, label: t.kiosk.step3Short }
                ].map((stepObj) => {
                  const isCurrent = regStep === stepObj.num;
                  const isCompleted = regStep > stepObj.num;
                  return (
                    <button
                      key={stepObj.num}
                      type="button"
                      data-testid={`kiosk-progress-step-${stepObj.num}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => {
                        recordUserActivity();
                        if (stepObj.num === 3 && !validatePatientFields()) {
                          setRegStep(2);
                          return;
                        }
                        setRegStep(stepObj.num);
                      }}
                      className={`min-h-[56px] rounded-2xl px-3 sm:px-4 py-2.5 font-extrabold text-xs sm:text-base border-2 text-left flex items-center gap-2.5 transition ${
                        isCurrent
                          ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                          : isCompleted
                            ? 'bg-emerald-50 text-status-serving border-status-serving'
                            : 'bg-subtle text-ink-secondary border-border-strong'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full font-token text-xs sm:text-sm font-black inline-flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-white text-brand-primary'
                            : isCompleted
                              ? 'bg-status-serving text-white'
                              : 'bg-surface text-ink-secondary border border-border-strong'
                        }`}
                      >
                        {stepObj.num}
                      </span>
                      <span className="truncate">{stepObj.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 1: DEPARTMENT SELECTION
               --------------------------------------------------------------- */}
            {regStep === 1 && (
              <div data-testid="kiosk-step-1" className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-2xl font-extrabold text-ink-primary">
                    {t.kiosk.step1Heading}
                  </h2>
                  <p className="text-sm sm:text-base text-ink-secondary">
                    {t.kiosk.step1Instruction}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptSlug === dept.slug;
                    const localized = getLocalizedDepartment(dept, lang, t);
                    const floorText =
                      t.floors[dept.floor_number] || `Floor ${dept.floor_number}`;

                    return (
                      <button
                        key={dept.slug}
                        type="button"
                        data-testid={`kiosk-dept-card-${dept.slug}`}
                        data-selected={isSelected ? 'true' : 'false'}
                        aria-pressed={isSelected}
                        onClick={() => {
                          recordUserActivity();
                          setSelectedDeptSlug(dept.slug);
                          setDuplicateTicketInfo(null);
                          setRegError(null);
                        }}
                        className="kiosk-select-card flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-token text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg bg-brand-primary text-white">
                              {dept.token_prefix || dept.tokenPrefix}
                            </span>
                            <span
                              className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                                isSelected
                                  ? 'bg-brand-teal text-white border-brand-teal'
                                  : 'bg-subtle text-ink-secondary border-border-strong'
                              }`}
                            >
                              {isSelected
                                ? t.kiosk.selectedBadge
                                : t.kiosk.tapToSelectBadge}
                            </span>
                          </div>

                          <div className="text-lg sm:text-xl font-extrabold text-ink-primary leading-snug">
                            {localized.name}
                          </div>

                          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-ink-secondary">
                            <Stethoscope
                              className="w-5 h-5 text-brand-teal shrink-0"
                              aria-hidden="true"
                            />
                            <span>{localized.doctor}</span>
                          </div>
                        </div>

                        <div className="w-full pt-3 border-t border-border-subtle space-y-1.5 text-xs sm:text-sm">
                          <div className="font-token font-extrabold text-brand-primary">
                            {dept.room_label} · {floorText}
                          </div>
                          <div className="text-ink-secondary flex items-start gap-1.5">
                            <MapPin
                              className="w-4 h-4 text-brand-teal shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{localized.landmark}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    data-testid="kiosk-step1-back-btn"
                    onClick={() => resetKioskSession({ showResetBanner: false })}
                    className="kiosk-btn-secondary w-full sm:w-auto text-sm sm:text-base"
                  >
                    <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{t.kiosk.backToWelcomeBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="kiosk-step1-continue-btn"
                    disabled={!selectedDept}
                    onClick={() => {
                      recordUserActivity();
                      setRegStep(2);
                    }}
                    className="kiosk-btn-primary w-full sm:w-auto text-base sm:text-lg"
                  >
                    <span>{t.kiosk.continueWithDeptBtn}</span>
                    <ArrowRight className="w-6 h-6 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------
                STEP 2: PATIENT DETAILS (Single-Column Touchscreen Form)
               --------------------------------------------------------------- */}
            {regStep === 2 && (
              <div
                data-testid="kiosk-step-2"
                className="max-w-2xl mx-auto w-full space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-2xl font-extrabold text-ink-primary">
                    {t.kiosk.step2Heading}
                  </h2>
                  <p className="text-sm sm:text-base text-ink-secondary">
                    {t.kiosk.step2Instruction}
                  </p>
                </div>

                {/* Single-column form layout for touchscreen clarity */}
                <div className="space-y-5 p-4 sm:p-6 rounded-2xl bg-canvas border-2 border-border-strong/80">
                  {/* 1. Patient Full Name */}
                  <div>
                    <label
                      htmlFor="kiosk-patient-name"
                      className="block text-sm sm:text-base font-extrabold text-ink-primary mb-2"
                    >
                      {t.register.patientNameLabel}
                    </label>
                    <input
                      id="kiosk-patient-name"
                      data-testid="kiosk-patient-name-input"
                      type="text"
                      required
                      maxLength={80}
                      value={patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        if (fieldErrors.patientName) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            patientName: null
                          }));
                        }
                      }}
                      placeholder={t.register.patientNamePlaceholder}
                      className="kiosk-input"
                    />
                    {fieldErrors.patientName && (
                      <p
                        role="alert"
                        data-testid="kiosk-error-patient-name"
                        className="text-xs sm:text-sm font-extrabold text-status-emergency mt-1.5"
                      >
                        {fieldErrors.patientName}
                      </p>
                    )}
                  </div>

                  {/* 2. Mobile Number */}
                  <div>
                    <label
                      htmlFor="kiosk-patient-phone"
                      className="block text-sm sm:text-base font-extrabold text-ink-primary mb-2"
                    >
                      {t.register.phoneLabel}
                    </label>
                    <input
                      id="kiosk-patient-phone"
                      data-testid="kiosk-phone-input"
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={16}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => ({ ...prev, phone: null }));
                        }
                      }}
                      placeholder={t.register.phonePlaceholder}
                      className="kiosk-input font-token"
                    />
                    <p className="text-xs text-ink-secondary mt-1.5">
                      {t.register.phoneUnverifiedNote}
                    </p>
                    {fieldErrors.phone && (
                      <p
                        role="alert"
                        data-testid="kiosk-error-phone"
                        className="text-xs sm:text-sm font-extrabold text-status-emergency mt-1.5"
                      >
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* 3. Age (Years) */}
                  <div>
                    <label
                      htmlFor="kiosk-patient-age"
                      className="block text-sm sm:text-base font-extrabold text-ink-primary mb-2"
                    >
                      {t.register.ageLabel}
                    </label>
                    <input
                      id="kiosk-patient-age"
                      data-testid="kiosk-age-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={120}
                      required
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        if (fieldErrors.age) {
                          setFieldErrors((prev) => ({ ...prev, age: null }));
                        }
                      }}
                      placeholder={t.register.agePlaceholder}
                      className="kiosk-input font-token"
                    />
                    {fieldErrors.age && (
                      <p
                        role="alert"
                        data-testid="kiosk-error-age"
                        className="text-xs sm:text-sm font-extrabold text-status-emergency mt-1.5"
                      >
                        {fieldErrors.age}
                      </p>
                    )}
                  </div>

                  {/* 4. Gender (With Decline to Specify option) */}
                  <div>
                    <label
                      htmlFor="kiosk-patient-gender"
                      className="block text-sm sm:text-base font-extrabold text-ink-primary mb-2"
                    >
                      {t.register.genderLabel}
                    </label>
                    <select
                      id="kiosk-patient-gender"
                      data-testid="kiosk-gender-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="kiosk-input"
                    >
                      <option value="PREFER_NOT_TO_SAY">
                        {t.register.genderDecline}
                      </option>
                      <option value="FEMALE">{t.register.genderFemale}</option>
                      <option value="MALE">{t.register.genderMale}</option>
                      <option value="OTHER">{t.register.genderOther}</option>
                    </select>
                  </div>

                  {/* 5. Visit Type (First Visit vs Follow-Up) */}
                  <div className="space-y-2">
                    <span className="block text-sm sm:text-base font-extrabold text-ink-primary">
                      {t.register.visitTypeLabel}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['FIRST_VISIT', 'FOLLOW_UP'].map((vt) => {
                        const active = visitType === vt;
                        return (
                          <button
                            key={vt}
                            type="button"
                            data-testid={`kiosk-visit-type-${vt}`}
                            aria-pressed={active}
                            onClick={() => {
                              recordUserActivity();
                              setVisitType(vt);
                            }}
                            className={`min-h-[60px] rounded-xl p-4 border-2 text-left font-extrabold text-sm sm:text-base transition ${
                              active
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                                : 'bg-surface text-ink-primary border-border-strong'
                            }`}
                          >
                            {t.visitTypes[vt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 6. Existing Registration / UHID Number (Optional) */}
                  <div>
                    <label
                      htmlFor="kiosk-uhid-input"
                      className="block text-sm sm:text-base font-extrabold text-ink-primary mb-2"
                    >
                      {t.register.regNoLabel}
                    </label>
                    <input
                      id="kiosk-uhid-input"
                      data-testid="kiosk-uhid-input"
                      type="text"
                      maxLength={40}
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder={t.register.regNoPlaceholder}
                      className="kiosk-input font-mono text-base"
                    />
                    <p className="text-xs text-ink-secondary mt-1">
                      {t.register.regNoHint}
                    </p>
                  </div>

                  {/* 7. Avoid Stairs Accessibility Preference */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-brand-tealSoft/80 border-2 border-brand-teal">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="kiosk-avoid-stairs-checkbox"
                        checked={avoidStairs}
                        onChange={(e) => setAvoidStairs(e.target.checked)}
                        className="w-6 h-6 mt-0.5 accent-brand-teal rounded shrink-0"
                      />
                      <div className="space-y-1">
                        <span className="font-extrabold text-sm sm:text-base text-ink-primary flex items-center gap-2">
                          <Accessibility
                            className="w-5 h-5 text-brand-teal shrink-0"
                            aria-hidden="true"
                          />
                          <span>{t.register.avoidStairsLabel}</span>
                        </span>
                        <p className="text-xs sm:text-sm text-ink-secondary">
                          {t.register.avoidStairsHint}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    data-testid="kiosk-step2-back-btn"
                    onClick={() => {
                      recordUserActivity();
                      setRegStep(1);
                    }}
                    className="kiosk-btn-secondary w-full sm:w-auto text-sm sm:text-base"
                  >
                    <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{t.register.backBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="kiosk-step2-continue-btn"
                    onClick={handleContinueFromStep2}
                    className="kiosk-btn-primary w-full sm:w-auto text-base sm:text-lg"
                  >
                    <span>{t.register.nextBtn}</span>
                    <ArrowRight className="w-6 h-6 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------
                STEP 3: REVIEW & CONFIRMATION
               --------------------------------------------------------------- */}
            {regStep === 3 && selectedDept && (
              <div
                data-testid="kiosk-step-3"
                className="max-w-3xl mx-auto w-full space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-2xl font-extrabold text-ink-primary">
                    {t.kiosk.step3Heading}
                  </h2>
                  <p className="text-sm sm:text-base text-ink-secondary">
                    {t.kiosk.step3Instruction}
                  </p>
                </div>

                {pendingRetryRequestId && (
                  <div
                    role="status"
                    data-testid="kiosk-retry-notice"
                    className="p-4 rounded-2xl bg-amber-50 border-2 border-status-next text-ink-primary text-xs sm:text-sm font-bold"
                  >
                    {t.register.retryNotice}
                  </div>
                )}

                {/* Review Summary Card */}
                <div
                  data-testid="kiosk-review-summary"
                  className="p-5 sm:p-7 rounded-2xl bg-canvas border-2 border-brand-primary/40 space-y-4 shadow-sm"
                >
                  <h3 className="font-extrabold text-base sm:text-lg text-brand-primary border-b border-border-subtle pb-3">
                    {t.register.summaryHeading}
                  </h3>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.patientLabel}
                      </dt>
                      <dd
                        data-testid="kiosk-summary-patient-name"
                        className="font-extrabold text-lg text-ink-primary mt-0.5"
                      >
                        {patientName.trim()}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.mobileLabel} · {t.register.ageGenderLabel}
                      </dt>
                      <dd
                        data-testid="kiosk-summary-patient-meta"
                        className="font-token font-bold text-base text-ink-primary mt-0.5"
                      >
                        {maskedPreviewPhone} · {age} yrs
                        {gender && gender !== 'PREFER_NOT_TO_SAY'
                          ? ` · ${gender}`
                          : ''}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.deptLabel}
                      </dt>
                      <dd
                        data-testid="kiosk-summary-department"
                        className="font-extrabold text-base text-ink-primary mt-0.5"
                      >
                        {getLocalizedDepartment(selectedDept, lang, t).name}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.doctorLabel}
                      </dt>
                      <dd className="font-bold text-base text-ink-primary mt-0.5">
                        {getLocalizedDepartment(selectedDept, lang, t).doctor}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.roomLabel}
                      </dt>
                      <dd
                        data-testid="kiosk-summary-room"
                        className="font-token font-extrabold text-base text-brand-primary mt-0.5"
                      >
                        {selectedDept.room_label} ·{' '}
                        {t.floors[selectedDept.floor_number]}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.register.visitTypeLabel}
                      </dt>
                      <dd
                        data-testid="kiosk-summary-visit-type"
                        className="font-bold text-sm sm:text-base text-ink-primary mt-0.5"
                      >
                        {t.visitTypes[visitType]} ·{' '}
                        {avoidStairs
                          ? t.slip.routeAvoidStairs
                          : t.slip.routeStandard}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Duplicate Active Ticket Banner */}
                {duplicateTicketInfo && (
                  <div
                    role="alert"
                    data-testid="kiosk-duplicate-banner"
                    className="p-5 sm:p-6 rounded-2xl bg-amber-50 border-2 border-status-next text-ink-primary space-y-3"
                  >
                    <div className="font-extrabold text-base sm:text-lg text-status-next">
                      {t.register.duplicateTitle}:{' '}
                      <span className="font-token font-black text-brand-primary">
                        {duplicateTicketInfo.publicCode}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-primary leading-relaxed">
                      {t.register.duplicateDesc}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        data-testid="kiosk-open-duplicate-btn"
                        disabled={regSubmitting}
                        onClick={handleReopenDuplicateTicket}
                        className="kiosk-btn-primary text-xs sm:text-sm"
                      >
                        <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>
                          {t.register.duplicateOpenBtn} (
                          {duplicateTicketInfo.publicCode})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="kiosk-duplicate-change-dept-btn"
                        onClick={() => {
                          setDuplicateTicketInfo(null);
                          setRegError(null);
                          setRegStep(1);
                        }}
                        className="kiosk-btn-secondary text-xs sm:text-sm"
                      >
                        <span>{t.register.duplicateChangeDeptBtn}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Registration / Network Error Alert */}
                {regError && !duplicateTicketInfo && (
                  <div
                    role="alert"
                    data-testid="kiosk-reg-error"
                    className="p-4 rounded-2xl bg-red-50 border-2 border-status-emergency text-status-emergency font-extrabold text-sm sm:text-base"
                  >
                    {regError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    data-testid="kiosk-step3-back-btn"
                    disabled={regSubmitting}
                    onClick={() => {
                      recordUserActivity();
                      setRegStep(2);
                    }}
                    className="kiosk-btn-secondary w-full sm:w-auto text-sm sm:text-base"
                  >
                    <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{t.kiosk.editDetailsBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="kiosk-confirm-submit-btn"
                    disabled={regSubmitting}
                    onClick={handleConfirmKioskRegistration}
                    className="kiosk-btn-confirm w-full sm:w-auto text-base sm:text-lg"
                  >
                    <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span>
                      {regSubmitting
                        ? t.kiosk.generatingTokenBtn
                        : t.kiosk.confirmAndGenerateBtn}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            SCREEN 3: CONFIRMED OPD SLIP & COMPLETION SCREEN
           =================================================================== */}
        {kioskScreen === 'slip' && kioskSlip && (
          <section
            aria-label={t.slip.title}
            data-testid="kiosk-slip-screen"
            className="space-y-6"
          >
            {/* Confirmation Banner (Hidden in Print) */}
            <div className="kiosk-no-print p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-status-serving flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-serving text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-status-serving">
                    {t.kiosk.confirmedSlipHeading}
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-secondary">
                    {t.kiosk.confirmedSlipSub}
                  </p>
                </div>
              </div>
              <span className="font-token text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-status-serving/40 text-status-serving">
                {t.kiosk.inactivityTimerLabel}: {remainingSeconds}s
              </span>
            </div>

            {/* Printable Official OPD Slip Card */}
            <article className="card-surface print-slip-card overflow-hidden border-2 border-brand-primary shadow-elevated">
              {/* Top Token Header */}
              <div className="print-slip-header mastercard-3d-hero text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#F5A623] block mb-1">
                    {t.slip.tokenLabel}
                  </span>
                  <div
                    data-testid="kiosk-slip-public-code"
                    className="kiosk-token-giant kiosk-selectable text-white"
                  >
                    {kioskSlip.publicCode}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className="px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wide bg-amber-400 text-slate-950">
                    {t.statuses?.[kioskSlip.status] || kioskSlip.status}
                  </span>
                  <span className="text-xs sm:text-sm text-[#EAE0D5] font-semibold">
                    {t.visitTypes[kioskSlip.visitType] || kioskSlip.visitType} ·{' '}
                    {kioskSlip.queueDate}
                  </span>
                </div>
              </div>

              <div
                className="ticket-perforation px-6 bg-surface"
                aria-hidden="true"
              />

              {/* Slip Body */}
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Patient, Department, Room & Queue Metrics */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Patient Name (Displayed only within active private kiosk session) */}
                  {(kioskSlip.patientSummary?.fullName || patientName.trim()) && (
                    <div
                      data-testid="kiosk-slip-patient-summary"
                      className="p-4 rounded-2xl bg-[#FAF6F0] border border-brand-primary/30 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-primary block">
                          {t.kiosk.kioskPatientNameLabel}
                        </span>
                        <span
                          data-testid="kiosk-slip-patient-name"
                          className="text-lg sm:text-xl font-extrabold text-ink-primary"
                        >
                          {kioskSlip.patientSummary?.fullName || patientName.trim()}
                        </span>
                      </div>
                      {kioskSlip.patientSummary?.ageYears !== undefined && (
                        <span className="font-token text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-white border border-brand-primary/20 text-ink-primary">
                          {kioskSlip.patientSummary.ageYears} yrs
                        </span>
                      )}
                    </div>
                  )}

                  {/* Department, Doctor, Room & Floor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-canvas border border-border-strong/70 space-y-1">
                      <span className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.slip.deptAndDoctor}
                      </span>
                      <div
                        data-testid="kiosk-slip-department"
                        className="text-lg font-extrabold text-ink-primary"
                      >
                        {
                          getLocalizedDepartment(
                            kioskSlip.department,
                            lang,
                            t
                          ).name
                        }
                      </div>
                      <div
                        data-testid="kiosk-slip-doctor"
                        className="text-sm font-bold text-brand-teal flex items-center gap-1.5"
                      >
                        <Stethoscope className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {
                            getLocalizedDepartment(
                              kioskSlip.department,
                              lang,
                              t
                            ).doctor
                          }
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-canvas border border-border-strong/70 space-y-1">
                      <span className="text-xs font-extrabold uppercase text-ink-muted">
                        {t.slip.destinationRoom}
                      </span>
                      <div
                        data-testid="kiosk-slip-room"
                        className="font-token text-lg font-extrabold text-brand-primary"
                      >
                        {kioskSlip.department?.room_label} ·{' '}
                        {t.floors[kioskSlip.department?.floor_number] ||
                          `Floor ${kioskSlip.department?.floor_number}`}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-ink-secondary flex items-start gap-1.5">
                        <MapPin
                          className="w-4 h-4 text-brand-teal shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          {
                            getLocalizedDepartment(
                              kioskSlip.department,
                              lang,
                              t
                            ).landmark
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Queue Position & Approximate Waiting Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-subtle border border-border-strong flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold uppercase text-ink-muted block">
                          {t.kiosk.queuePositionLabel}
                        </span>
                        <span
                          data-testid="kiosk-slip-queue-ahead"
                          className="font-token text-2xl sm:text-3xl font-black text-brand-primary"
                        >
                          {kioskSlip.queue?.peopleAheadWaiting ?? 0}
                        </span>
                      </div>
                      <Activity
                        className="w-8 h-8 text-brand-teal opacity-80"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-subtle border border-border-strong flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold uppercase text-ink-muted block">
                          {t.kiosk.approxWaitLabel}
                        </span>
                        <span
                          data-testid="kiosk-slip-est-wait"
                          className="font-token text-2xl sm:text-3xl font-black text-brand-teal"
                        >
                          ~{kioskSlip.queue?.estimatedWaitMinutes ?? 0}{' '}
                          {t.home.mins}
                        </span>
                      </div>
                      <Clock
                        className="w-8 h-8 text-brand-teal opacity-80"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Step-by-Step Accessible Route Summary */}
                  {slipRoute?.steps?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-2.5">
                      <div className="text-xs font-extrabold uppercase text-brand-primary flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-brand-teal" aria-hidden="true" />
                        <span>{t.slip.printRouteHeading}</span>
                      </div>
                      <ol className="space-y-1.5 text-xs sm:text-sm font-semibold text-ink-primary">
                        {slipRoute.steps.map((s) => (
                          <li key={s.stepNumber} className="flex items-start gap-2">
                            <span className="font-token font-extrabold text-brand-teal">
                              {s.stepNumber}.
                            </span>
                            <span>
                              {lang === 'hi'
                                ? s.instruction_hi
                                : lang === 'ta'
                                  ? s.instruction_ta || s.instruction_en
                                  : s.instruction_en}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Right Column: Approved Public Lookup QR Code (Zero PII / Zero Capability Token) */}
                <div className="p-5 rounded-2xl bg-canvas border-2 border-border-strong flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-xs sm:text-sm font-extrabold text-brand-primary">
                    {t.slip.qrTitle}
                  </div>
                  <div
                    data-testid="kiosk-slip-qr"
                    className="p-3 bg-white rounded-2xl border border-border-subtle shadow-xs"
                  >
                    <QRCodeSVG
                      value={
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/?code=${encodeURIComponent(
                              kioskSlip.publicCode
                            )}`
                          : `/my-turn?code=${encodeURIComponent(
                              kioskSlip.publicCode
                            )}`
                      }
                      size={164}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <div className="font-token text-xs font-bold text-ink-secondary">
                    /?code={kioskSlip.publicCode}
                  </div>
                  <p className="text-[11px] text-ink-muted leading-snug max-w-xs">
                    {t.slip.qrCaption}
                  </p>
                </div>
              </div>
            </article>

            {/* Print Notice */}
            {printedNotice && (
              <div
                role="status"
                data-testid="kiosk-printed-notice"
                className="kiosk-no-print p-4 rounded-2xl bg-[#FAF6F0] border-2 border-brand-primary text-brand-primary font-bold text-sm sm:text-base"
              >
                {t.kiosk.printedSuccessNote}
              </div>
            )}

            {/* Slip Completion & Print Touch Actions */}
            <div className="kiosk-no-print grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                data-testid="kiosk-print-slip-btn"
                onClick={() => {
                  recordUserActivity();
                  setPrintedNotice(true);
                  if (typeof window !== 'undefined' && typeof window.print === 'function') {
                    window.print();
                  }
                }}
                className="kiosk-btn-primary w-full text-base sm:text-lg"
              >
                <Printer className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.printSlipBtn}</span>
              </button>

              <button
                type="button"
                data-testid="kiosk-finish-session-btn"
                onClick={() => resetKioskSession({ showResetBanner: true })}
                className="kiosk-btn-confirm w-full text-base sm:text-lg"
              >
                <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.finishSessionBtn}</span>
              </button>

              <button
                type="button"
                data-testid="kiosk-new-registration-btn"
                onClick={() => {
                  resetKioskSession({ showResetBanner: false });
                  setKioskScreen('register');
                  setRegStep(1);
                }}
                className="kiosk-btn-secondary w-full text-sm sm:text-base"
              >
                <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.startNewRegBtn}</span>
              </button>
            </div>
          </section>
        )}

        {/* ===================================================================
            SCREEN 4: EXISTING TOKEN LOOKUP SCREEN (`GET /api/slips/:publicCode`)
           =================================================================== */}
        {kioskScreen === 'lookup' && (
          <section
            aria-labelledby="kiosk-lookup-heading"
            data-testid="kiosk-lookup-screen"
            className="card-surface p-5 sm:p-8 max-w-3xl mx-auto w-full space-y-6"
          >
            <div className="space-y-1">
              <h1
                id="kiosk-lookup-heading"
                className="text-xl sm:text-3xl font-extrabold text-brand-primary"
              >
                {t.kiosk.lookupHeading}
              </h1>
              <p className="text-sm sm:text-base text-ink-secondary">
                {t.kiosk.lookupSubtitle}
              </p>
            </div>

            <form
              onSubmit={handleLookupExistingToken}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                data-testid="kiosk-lookup-input"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder={t.kiosk.lookupInputPlaceholder}
                className="kiosk-input font-token uppercase flex-1"
              />
              <button
                type="submit"
                data-testid="kiosk-lookup-submit-btn"
                disabled={lookupLoading}
                className="kiosk-btn-teal shrink-0 text-base"
              >
                <Search className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>
                  {lookupLoading
                    ? t.kiosk.lookupSearchingBtn
                    : t.kiosk.lookupSearchBtn}
                </span>
              </button>
            </form>

            {lookupError && (
              <div
                role="alert"
                data-testid="kiosk-lookup-error"
                className="p-4 rounded-2xl bg-red-50 border-2 border-status-emergency text-status-emergency font-bold text-sm sm:text-base"
              >
                {lookupError}
              </div>
            )}

            {lookupSlip && (
              <div
                data-testid="kiosk-lookup-result"
                className="p-5 sm:p-6 rounded-2xl bg-canvas border-2 border-brand-primary space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div className="font-token text-2xl sm:text-3xl font-black text-brand-primary">
                    {lookupSlip.publicCode}
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-status-serving font-extrabold text-xs sm:text-sm">
                    {t.statuses?.[lookupSlip.status] || lookupSlip.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
                    <span className="text-xs font-bold text-ink-muted block">
                      {t.register.deptLabel}
                    </span>
                    <span className="font-extrabold text-ink-primary">
                      {
                        getLocalizedDepartment(
                          lookupSlip.department,
                          lang,
                          t
                        ).name
                      }
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
                    <span className="text-xs font-bold text-ink-muted block">
                      {t.register.roomLabel}
                    </span>
                    <span className="font-token font-extrabold text-brand-primary">
                      {lookupSlip.department?.room_label} ·{' '}
                      {t.floors[lookupSlip.department?.floor_number]}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
                    <span className="text-xs font-bold text-ink-muted block">
                      {t.kiosk.queuePositionLabel}
                    </span>
                    <span className="font-token font-extrabold text-lg text-brand-teal">
                      {lookupSlip.queue?.peopleAheadWaiting ?? 0} (
                      ~{lookupSlip.queue?.estimatedWaitMinutes ?? 0}{' '}
                      {t.home.mins})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                data-testid="kiosk-lookup-back-btn"
                onClick={() => resetKioskSession({ showResetBanner: false })}
                className="kiosk-btn-secondary w-full sm:w-auto"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.lookupClearBtn}</span>
              </button>
            </div>
          </section>
        )}

        {/* ===================================================================
            KIOSK PRIVACY FOOTER & AUTHORISED STAFF EXIT BAR
           =================================================================== */}
        <footer
          data-testid="kiosk-privacy-banner"
          className="kiosk-no-print rounded-2xl bg-surface border border-border-strong p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs sm:text-sm text-ink-secondary"
        >
          <div className="space-y-1 max-w-3xl">
            <div className="font-extrabold text-brand-primary flex items-center gap-2">
              <ShieldCheck
                className="w-4 h-4 text-brand-teal shrink-0"
                aria-hidden="true"
              />
              <span>{t.kiosk.privacyGuaranteeBanner}</span>
            </div>
            <p className="text-xs text-ink-muted">{t.kiosk.browserKioskLimitNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-secondary">
              <Timer className="w-4 h-4 text-brand-teal" aria-hidden="true" />
              <span>{t.kiosk.inactivityTimerLabel}:</span>
              <select
                data-testid="kiosk-timeout-select"
                value={configuredTimeoutSec}
                onChange={(e) => {
                  const nextSec = Number(e.target.value) || DEFAULT_KIOSK_TIMEOUT_SEC;
                  setConfiguredTimeoutSec(nextSec);
                  setRemainingSeconds(nextSec);
                }}
                className="rounded-lg border border-border-strong bg-subtle px-2 py-1 font-token font-bold text-ink-primary"
              >
                <option value={60}>1 min (60s)</option>
                <option value={180}>3 min (180s)</option>
                <option value={300}>5 min (300s)</option>
              </select>
            </label>

            {onExitKiosk && (
              <button
                type="button"
                data-testid="kiosk-staff-exit-btn"
                onClick={handleRequestStaffExit}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-strong bg-subtle hover:bg-slate-200 text-ink-primary font-bold text-xs transition"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.kiosk.staffExitBtn}</span>
              </button>
            )}
          </div>
        </footer>
      </main>

      {/* =====================================================================
          AUTHORISED STAFF EXIT PIN MODAL
         ===================================================================== */}
      {staffExitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kiosk-staff-exit-title"
          data-testid="kiosk-staff-exit-modal"
          className="kiosk-no-print fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border-2 border-brand-primary p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="kiosk-staff-exit-title"
                className="text-lg font-extrabold text-brand-primary flex items-center gap-2"
              >
                <Lock className="w-5 h-5 text-brand-teal" aria-hidden="true" />
                <span>{t.kiosk.staffExitModalTitle}</span>
              </h2>
              <button
                type="button"
                onClick={() => setStaffExitModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-secondary hover:bg-subtle"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-ink-secondary">
              {t.kiosk.staffExitModalDesc}
            </p>

            <form onSubmit={handleVerifyStaffPinAndExit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                data-testid="kiosk-staff-pin-input"
                value={staffPinInput}
                onChange={(e) => setStaffPinInput(e.target.value)}
                placeholder={t.kiosk.staffPinPlaceholder}
                className="kiosk-input font-token"
              />

              {staffPinError && (
                <p
                  role="alert"
                  data-testid="kiosk-staff-pin-error"
                  className="text-xs font-extrabold text-status-emergency"
                >
                  {staffPinError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  data-testid="kiosk-staff-verify-exit-btn"
                  disabled={staffVerifying}
                  className="kiosk-btn-primary flex-1 text-sm"
                >
                  <span>{t.kiosk.staffVerifyAndExitBtn}</span>
                </button>
                <button
                  type="button"
                  data-testid="kiosk-staff-cancel-exit-btn"
                  onClick={() => setStaffExitModalOpen(false)}
                  className="kiosk-btn-secondary text-sm"
                >
                  <span>{t.kiosk.staffCancelBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          PERSISTENT NATIVE <dialog> EMERGENCY MODAL (Reused across all steps)
         ===================================================================== */}
      <EmergencyModal
        dialogRef={emergencyDialogRef}
        lang={lang}
        t={t}
        nodes={hospitalNodes}
        activeSlip={kioskSlip}
        onClose={closeEmergencyModal}
        onNavigateToEmergency={() => {
          setEmergencyRouteOpen(true);
        }}
      />
    </div>
  );
}
