import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
  XCircle
} from 'lucide-react';
import { playStaffUrgentChime } from '../utils/soundAlerts.js';
import { getLocalizedDepartment } from '../i18n/translations.js';

const STAFF_SOUND_KEY = 'opd_staff_urgent_sound_enabled';

function formatShortTimestamp(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function StaffView({
  lang,
  t,
  departments = [],
  staffAuth,
  setStaffAuth,
  socketRef
}) {
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [selectedDeptSlug, setSelectedDeptSlug] = useState(
    departments[0]?.slug || 'general-medicine'
  );
  const [queueData, setQueueData] = useState(null);
  const [urgentFlags, setUrgentFlags] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionBanner, setActionBanner] = useState(null);

  // Checkpoint 3: Staff Urgent Audio Chime Mute/Unmute
  const [urgentSoundEnabled, setUrgentSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(STAFF_SOUND_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Checkpoint 4: Command Centre Search, Filter Tabs & Destructive Action Confirmation
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState(null);

  const [docStatusForm, setDocStatusForm] = useState({
    status: 'AVAILABLE',
    delayMinutes: 0
  });

  function handleToggleUrgentSound() {
    const nextValue = !urgentSoundEnabled;
    setUrgentSoundEnabled(nextValue);
    try {
      window.localStorage.setItem(STAFF_SOUND_KEY, String(nextValue));
    } catch {
      // ignore storage errors
    }
    if (nextValue) {
      playStaffUrgentChime();
    }
  }

  // Deduplicated chime when genuinely new urgent help requests arrive
  useEffect(() => {
    if (!urgentFlags.length) return;
    const newFlags = urgentFlags.filter((f) => f.status === 'NEW');
    if (!newFlags.length) return;

    let hasGenuinelyNewFlag = false;
    for (const flag of newFlags) {
      const storageKey = `opd_staff_alerted_flag_${flag.id}`;
      try {
        if (!window.localStorage.getItem(storageKey)) {
          window.localStorage.setItem(storageKey, 'NEW');
          hasGenuinelyNewFlag = true;
        }
      } catch {
        hasGenuinelyNewFlag = true;
      }
    }

    if (hasGenuinelyNewFlag && urgentSoundEnabled) {
      playStaffUrgentChime();
    }
  }, [urgentFlags, urgentSoundEnabled]);

  const fetchStaffDashboard = useCallback(
    async (deptSlug = selectedDeptSlug) => {
      if (!staffAuth.authenticated) return;
      setLoadingQueue(true);
      try {
        const [qRes, uRes] = await Promise.all([
          fetch(`/api/staff/queues/${encodeURIComponent(deptSlug)}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
          }),
          fetch('/api/staff/urgent-flags', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
          })
        ]);

        if (qRes.status === 401) {
          setStaffAuth({ authenticated: false, loginAt: null });
          return;
        }

        const qJson = await qRes.json();
        const uJson = await uRes.json();

        if (qRes.ok) {
          setQueueData(qJson);
          if (qJson.doctorStatus) {
            setDocStatusForm({
              status: qJson.doctorStatus.status || 'AVAILABLE',
              delayMinutes: Number(qJson.doctorStatus.delay_minutes ?? 0)
            });
          }
        }
        if (uRes.ok && Array.isArray(uJson.urgentFlags)) {
          setUrgentFlags(uJson.urgentFlags);
        }
      } catch (err) {
        setActionBanner({
          type: 'error',
          message: err.message || 'Failed to load staff queue.'
        });
      } finally {
        setLoadingQueue(false);
      }
    },
    [selectedDeptSlug, setStaffAuth, staffAuth.authenticated]
  );

  useEffect(() => {
    if (staffAuth.authenticated) {
      fetchStaffDashboard(selectedDeptSlug);
      if (socketRef?.current) {
        socketRef.current.emit('subscribe:staff', {
          departmentId: selectedDeptSlug
        });
      }
    }
  }, [staffAuth.authenticated, selectedDeptSlug, fetchStaffDashboard, socketRef]);

  // Listen for realtime staff & urgent flag events
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !staffAuth.authenticated) return undefined;

    const handleRefresh = () => {
      fetchStaffDashboard(selectedDeptSlug);
    };

    socket.on('queue.updated', handleRefresh);
    socket.on('doctor.updated', handleRefresh);
    socket.on('doctor_status.updated', handleRefresh);
    socket.on('urgent.created', handleRefresh);
    socket.on('urgent_flag.created', handleRefresh);
    socket.on('urgent.updated', handleRefresh);
    socket.on('urgent_flag.updated', handleRefresh);

    return () => {
      socket.off('queue.updated', handleRefresh);
      socket.off('doctor.updated', handleRefresh);
      socket.off('doctor_status.updated', handleRefresh);
      socket.off('urgent.created', handleRefresh);
      socket.off('urgent_flag.created', handleRefresh);
      socket.off('urgent.updated', handleRefresh);
      socket.off('urgent_flag.updated', handleRefresh);
    };
  }, [socketRef, staffAuth.authenticated, selectedDeptSlug, fetchStaffDashboard]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/staff/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Staff PIN authentication failed.');
      }
      setPin('');
      setStaffAuth({ authenticated: true, loginAt: data.loginAt });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/staff/session', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({})
      });
    } finally {
      setStaffAuth({ authenticated: false, loginAt: null });
      setQueueData(null);
    }
  }

  async function executeStaffMutation(url, method = 'POST', body = {}) {
    setActionBanner(null);
    setPendingDestructiveAction(null);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setActionBanner({
          type: 'error',
          code: data?.error?.code || `HTTP_${res.status}`,
          message:
            data?.error?.message ||
            'Queue action was rejected due to a state conflict.'
        });
      } else {
        setActionBanner({
          type: 'success',
          message:
            data?.ticket?.publicCode
              ? `Updated ${data.ticket.publicCode} → ${data.ticket.status}`
              : 'Staff update applied.'
        });
      }
      await fetchStaffDashboard(selectedDeptSlug);
    } catch (err) {
      setActionBanner({
        type: 'error',
        message: err.message || 'Network error while executing staff action.'
      });
    }
  }

  if (!staffAuth.authenticated) {
    return (
      <section
        aria-labelledby="staff-login-heading"
        className="max-w-md mx-auto bg-surface border border-border-subtle rounded-2xl p-5 sm:p-7 shadow-card space-y-5"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-hero-gradient text-white flex items-center justify-center shadow-sm shrink-0">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="staff-login-heading"
              className="text-xl font-extrabold text-ink-primary tracking-tight"
            >
              {t.staff.loginTitle}
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary">{t.staff.loginDesc}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle text-xs font-mono font-bold text-brand-primary">
          {t.staff.demoHint}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="staff-pin-input"
              className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
            >
              {t.staff.pinLabel}
            </label>
            <input
              id="staff-pin-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-4 py-3 font-token text-lg font-extrabold tracking-widest shadow-xs"
            />
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-status-emergency text-status-emergency text-xs font-bold"
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading || !pin.trim()}
            className="btn-primary w-full px-5 py-3 text-sm sm:text-base"
          >
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.staff.loginBtn}</span>
          </button>
        </form>
      </section>
    );
  }

  const activeTicket = queueData?.activeTicket || null;
  const waitingTickets = queueData?.waitingTickets || [];
  const historyTickets = queueData?.historyTickets || [];
  const deptInfo = queueData?.department || {};

  // Department Summary Counters
  const completedCount = historyTickets.filter((x) => x.status === 'COMPLETED').length;
  const noShowCount = historyTickets.filter((x) => x.status === 'NO_SHOW').length;
  const cancelledCount = historyTickets.filter((x) => x.status === 'CANCELLED').length;

  const normalizedQuery = searchQuery.trim().toUpperCase();

  const filteredWaitingTickets = waitingTickets.filter((ticket) => {
    if (statusFilter !== 'ALL' && statusFilter !== 'WAITING') {
      return false;
    }
    if (normalizedQuery && !String(ticket.public_code).toUpperCase().includes(normalizedQuery)) {
      return false;
    }
    return true;
  });

  const filteredHistoryTickets = historyTickets.filter((ticket) => {
    if (
      statusFilter !== 'ALL' &&
      statusFilter !== 'COMPLETED' &&
      statusFilter !== 'NO_SHOW' &&
      statusFilter !== 'CANCELLED'
    ) {
      return false;
    }
    if (
      statusFilter === 'COMPLETED' ||
      statusFilter === 'NO_SHOW' ||
      statusFilter === 'CANCELLED'
    ) {
      if (ticket.status !== statusFilter) return false;
    }
    if (normalizedQuery && !String(ticket.public_code).toUpperCase().includes(normalizedQuery)) {
      return false;
    }
    return true;
  });

  const filterTabs = [
    {
      id: 'ALL',
      label: t.staff.filterAll || 'All Tickets',
      count: waitingTickets.length + (activeTicket ? 1 : 0) + historyTickets.length
    },
    {
      id: 'WAITING',
      label: t.staff.filterWaiting || 'Waiting',
      count: waitingTickets.length
    },
    {
      id: 'ACTIVE',
      label: t.staff.filterActive || 'Called / Active',
      count: activeTicket ? 1 : 0
    },
    {
      id: 'COMPLETED',
      label: t.staff.filterCompleted || 'Completed',
      count: completedCount
    },
    {
      id: 'NO_SHOW',
      label: t.staff.filterNoShow || 'No-Show',
      count: noShowCount
    },
    {
      id: 'CANCELLED',
      label: t.staff.filterCancelled || 'Cancelled',
      count: cancelledCount
    }
  ];

  return (
    <section
      aria-labelledby="staff-desk-heading"
      className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-7 shadow-card space-y-6"
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h2
            id="staff-desk-heading"
            className="text-xl sm:text-2xl font-extrabold text-ink-primary tracking-tight"
          >
            {t.staff.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.staff.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 sm:flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="staff-sound-toggle-btn"
            aria-pressed={urgentSoundEnabled}
            onClick={handleToggleUrgentSound}
            className={`touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border font-bold px-3.5 py-2 text-xs sm:text-sm transition-colors ${
              urgentSoundEnabled
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-canvas text-ink-primary border-border-strong hover:bg-subtle'
            }`}
          >
            {urgentSoundEnabled ? (
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {urgentSoundEnabled
                ? t.staff.soundOnBtn || 'Urgent Chime: ON'
                : t.staff.soundMutedBtn || 'Urgent Chime: Muted'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => fetchStaffDashboard(selectedDeptSlug)}
            disabled={loadingQueue}
            className="btn-secondary px-3.5 py-2 text-xs sm:text-sm"
          >
            <RefreshCw
              className={`w-4 h-4 shrink-0 ${loadingQueue ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{t.home.boardRefresh}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="touch-target col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-status-emergency bg-red-50 text-status-emergency font-bold px-3.5 py-2 text-xs sm:text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.staff.logoutBtn}</span>
          </button>
        </div>
      </div>

      {/* Conflict / Action Feedback Banner */}
      {actionBanner && (
        <div
          role="alert"
          data-testid="staff-action-banner"
          className={`p-4 rounded-2xl border font-bold text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            actionBanner.type === 'error'
              ? 'bg-red-50 border-status-emergency text-status-emergency'
              : 'bg-emerald-50 border-status-serving text-status-serving'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {actionBanner.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <span className="break-words">
              {actionBanner.code ? `[${actionBanner.code}] ` : ''}
              {actionBanner.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="touch-target px-2.5 py-1 rounded-lg bg-surface/80 border border-border-subtle text-xs font-bold shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Destructive Action Confirmation Modal/Bar (Checkpoint 4) */}
      {pendingDestructiveAction && (
        <div
          role="alertdialog"
          aria-labelledby="staff-confirm-heading"
          data-testid="staff-destructive-confirm-bar"
          className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-status-next flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="space-y-1">
            <h3
              id="staff-confirm-heading"
              className="font-extrabold text-sm sm:text-base text-ink-primary flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-status-next shrink-0" aria-hidden="true" />
              <span>
                {t.staff.confirmActionTitle || 'Confirm Status Change'}:{' '}
                <span className="font-token">{pendingDestructiveAction.publicCode}</span>
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary">
              {pendingDestructiveAction.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="staff-confirm-destructive-btn"
              onClick={() =>
                executeStaffMutation(
                  pendingDestructiveAction.url,
                  pendingDestructiveAction.method,
                  pendingDestructiveAction.body
                )
              }
              className="touch-target px-4 py-2 rounded-xl bg-status-emergency text-white font-bold text-xs sm:text-sm shadow-xs"
            >
              {t.staff.confirmYesBtn || 'Confirm Action'}
            </button>
            <button
              type="button"
              data-testid="staff-cancel-destructive-btn"
              onClick={() => setPendingDestructiveAction(null)}
              className="btn-secondary px-3.5 py-2 text-xs sm:text-sm"
            >
              {t.staff.confirmCancelBtn || 'Keep Current Status'}
            </button>
          </div>
        </div>
      )}

      {/* Urgent Help & Triage Requests Panel */}
      <div
        data-testid="staff-urgent-panel"
        className="p-4 sm:p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-sm sm:text-base text-status-emergency flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.staff.urgentHeading}</span>
          </h3>
          <span className="font-token text-xs font-extrabold px-2.5 py-1 rounded-full bg-status-emergency text-white">
            {urgentFlags.filter((f) => f.status !== 'RESOLVED').length} Open
          </span>
        </div>

        {urgentFlags.length === 0 ? (
          <p className="text-xs font-medium text-ink-secondary">{t.staff.urgentEmpty}</p>
        ) : (
          <div className="space-y-2.5">
            {urgentFlags.slice(0, 5).map((flag) => (
              <div
                key={flag.id}
                data-testid={`urgent-flag-card-${flag.id}`}
                className={`p-3.5 rounded-xl bg-surface border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs ${
                  flag.status === 'NEW'
                    ? 'border-status-emergency ring-2 ring-status-emergency/20'
                    : 'border-border-subtle'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-token font-extrabold px-2 py-0.5 rounded-md text-xs ${
                        flag.status === 'NEW'
                          ? 'bg-status-emergency text-white'
                          : 'bg-subtle border border-border-strong text-ink-primary'
                      }`}
                    >
                      {flag.status}
                    </span>
                    <strong className="text-ink-primary">{flag.location_label}</strong>
                    {flag.public_code && (
                      <span className="font-token font-extrabold text-brand-primary">
                        ({flag.public_code})
                      </span>
                    )}
                    {flag.created_at && (
                      <span className="text-[11px] font-mono text-ink-muted">
                        {formatShortTimestamp(flag.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-secondary font-medium">
                    {flag.request_type}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                  {flag.status === 'NEW' && (
                    <button
                      type="button"
                      onClick={() =>
                        executeStaffMutation(
                          `/api/staff/urgent-flags/${flag.id}/acknowledge`
                        )
                      }
                      className="btn-primary px-3 py-2 text-xs"
                    >
                      {t.staff.ackBtn}
                    </button>
                  )}
                  {flag.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() =>
                        executeStaffMutation(
                          `/api/staff/urgent-flags/${flag.id}/resolve`
                        )
                      }
                      className="touch-target inline-flex items-center justify-center px-3 py-2 rounded-xl bg-status-serving text-white font-bold text-xs shadow-xs"
                    >
                      {t.staff.resolveBtn}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Department Selector (2-Column Mobile Grid + Accessible Select) & Doctor Status Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-subtle/80 border border-border-subtle space-y-3">
          <label
            htmlFor="staff-dept-select"
            className="block text-xs sm:text-sm font-extrabold text-ink-primary"
          >
            {t.staff.selectDept}
          </label>

          {/* 2-Column Mobile Quick Department Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {departments.map((dept) => {
              const isSelected = selectedDeptSlug === dept.slug;
              return (
                <button
                  key={dept.slug}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDeptSlug(dept.slug)}
                  className={`touch-target p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-surface text-ink-primary border-border-subtle hover:border-brand-teal/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`font-token text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-subtle text-brand-primary'
                      }`}
                    >
                      {dept.token_prefix}
                    </span>
                    <span
                      className={`text-[10px] font-semibold truncate ${
                        isSelected ? 'text-[#F5A623]' : 'text-ink-muted'
                      }`}
                    >
                      {dept.room_label}
                    </span>
                  </div>
                  <span className="text-xs font-bold leading-snug line-clamp-1">
                    {getLocalizedDepartment(dept, lang, t).name}
                  </span>
                </button>
              );
            })}
          </div>

          <select
            id="staff-dept-select"
            value={selectedDeptSlug}
            onChange={(e) => setSelectedDeptSlug(e.target.value)}
            className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-xs sm:text-sm font-bold shadow-xs"
          >
            {departments.map((dept) => (
              <option key={dept.slug} value={dept.slug}>
                [{dept.token_prefix}] {getLocalizedDepartment(dept, lang, t).name} (
                {dept.room_label})
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-subtle/80 border border-border-subtle space-y-3 flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-extrabold text-ink-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
            <span>{t.staff.doctorStatusHeading}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-stretch sm:items-center gap-2.5">
            <select
              aria-label={t.staff.doctorStatusHeading}
              value={docStatusForm.status}
              onChange={(e) =>
                setDocStatusForm((prev) => ({ ...prev, status: e.target.value }))
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-xs sm:text-sm font-bold shadow-xs"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="DELAYED">DELAYED</option>
              <option value="ON_BREAK">ON_BREAK</option>
              <option value="UNAVAILABLE">UNAVAILABLE</option>
            </select>

            <div className="grid grid-cols-2 sm:contents gap-2">
              <input
                type="number"
                min="0"
                max="240"
                aria-label={t.staff.delayMinsLabel}
                value={docStatusForm.delayMinutes}
                onChange={(e) =>
                  setDocStatusForm((prev) => ({
                    ...prev,
                    delayMinutes: Number(e.target.value || 0)
                  }))
                }
                className="touch-target w-full sm:w-24 rounded-xl border border-border-strong bg-surface px-3 py-2.5 font-token text-xs sm:text-sm font-extrabold shadow-xs"
              />

              <button
                type="button"
                onClick={() =>
                  executeStaffMutation(
                    `/api/staff/departments/${encodeURIComponent(
                      deptInfo.id || selectedDeptSlug
                    )}/doctor-status`,
                    'PATCH',
                    docStatusForm
                  )
                }
                className="btn-teal w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm"
              >
                {t.staff.saveDocStatusBtn}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKPOINT 4: Department Summary Counters, Search by Token Code & Filter Tabs */}
      <div
        data-testid="staff-summary-counters"
        className="grid grid-cols-2 sm:grid-cols-5 gap-2.5"
      >
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
          <div className="text-[11px] font-bold uppercase text-ink-muted">
            {t.staff.filterWaiting || 'Waiting'}
          </div>
          <div className="font-token text-xl font-extrabold text-brand-primary mt-0.5">
            {waitingTickets.length}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
          <div className="text-[11px] font-bold uppercase text-ink-muted">
            {t.staff.filterActive || 'Called / Active'}
          </div>
          <div className="font-token text-xl font-extrabold text-status-serving mt-0.5">
            {activeTicket ? 1 : 0}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
          <div className="text-[11px] font-bold uppercase text-ink-muted">
            {t.staff.filterCompleted || 'Completed'}
          </div>
          <div className="font-token text-xl font-extrabold text-brand-teal mt-0.5">
            {completedCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
          <div className="text-[11px] font-bold uppercase text-ink-muted">
            {t.staff.filterNoShow || 'No-Show'}
          </div>
          <div className="font-token text-xl font-extrabold text-status-next mt-0.5">
            {noShowCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-canvas border border-border-subtle col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase text-ink-muted">
            {t.staff.filterCancelled || 'Cancelled'}
          </div>
          <div className="font-token text-xl font-extrabold text-status-emergency mt-0.5">
            {cancelledCount}
          </div>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-subtle/70 border border-border-subtle space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              data-testid="staff-token-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                t.staff.searchPlaceholder || 'Search by token code (e.g. OPD-GEN-001)…'
              }
              aria-label={
                t.staff.searchPlaceholder || 'Search by token code (e.g. OPD-GEN-001)…'
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface pl-10 pr-4 py-2 text-xs sm:text-sm font-token font-bold uppercase"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              data-testid="staff-token-search-clear"
              onClick={() => setSearchQuery('')}
              className="btn-secondary px-3 py-2 text-xs"
            >
              {t.staff.clearSearchBtn || 'Clear Search'}
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Queue Status Filter"
          className="flex flex-wrap items-center gap-1.5"
        >
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`staff-filter-tab-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`touch-target px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-surface text-ink-primary border-border-subtle hover:bg-canvas'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-token px-1.5 py-0.5 rounded text-[11px] ${
                    active ? 'bg-white/20 text-white' : 'bg-subtle text-ink-secondary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Patient Card & Full-Width Mobile Call Next Button */}
      <div className="p-4 sm:p-5 rounded-2xl bg-canvas border border-border-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-base sm:text-lg text-ink-primary">
            {t.staff.activeCardTitle}
          </h3>

          <button
            type="button"
            data-testid="staff-call-next-btn"
            disabled={Boolean(activeTicket) || waitingTickets.length === 0}
            onClick={() =>
              executeStaffMutation(
                `/api/staff/queues/${encodeURIComponent(selectedDeptSlug)}/call-next`
              )
            }
            className="btn-primary w-full sm:w-auto px-5 py-3 text-sm sm:text-base"
          >
            <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {t.staff.callNextBtn} ({waitingTickets.length})
            </span>
          </button>
        </div>

        {activeTicket ? (
          <div
            data-testid="staff-active-ticket-card"
            className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border-2 border-status-serving space-y-4"
          >
            {/* Row 1: Token Identity & Status Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="font-token text-2xl sm:text-3xl font-extrabold text-ink-primary">
                  {activeTicket.public_code}
                </div>
                <span className="font-token text-xs font-extrabold px-2.5 py-1 rounded-full bg-status-serving text-white">
                  {activeTicket.status}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-ink-secondary">
                Status: {activeTicket.status} · {activeTicket.visit_type}
                {activeTicket.called_at && (
                  <span className="ml-2 font-mono text-xs">
                    · Called {formatShortTimestamp(activeTicket.called_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Full-Width Multi-Column Action Footer */}
            <div
              className={`grid gap-2.5 ${
                activeTicket.status === 'CALLED'
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {activeTicket.status === 'CALLED' && (
                <>
                  <button
                    type="button"
                    data-testid="staff-start-btn"
                    onClick={() =>
                      executeStaffMutation(
                        `/api/staff/tickets/${activeTicket.id}/start`
                      )
                    }
                    className="btn-teal w-full px-4 py-2.5 text-xs sm:text-sm"
                  >
                    <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.staff.startConsultBtn}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="staff-noshow-btn"
                    onClick={() =>
                      executeStaffMutation(
                        `/api/staff/tickets/${activeTicket.id}/no-show`
                      )
                    }
                    className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-status-next text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-xs"
                  >
                    <UserMinus className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.staff.noShowBtn}</span>
                  </button>
                </>
              )}

              {activeTicket.status === 'IN_CONSULTATION' && (
                <button
                  type="button"
                  data-testid="staff-complete-btn"
                  onClick={() =>
                    executeStaffMutation(
                      `/api/staff/tickets/${activeTicket.id}/complete`
                    )
                  }
                  className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-status-serving text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.staff.completeBtn}</span>
                </button>
              )}

              <button
                type="button"
                data-testid="staff-cancel-btn"
                onClick={() =>
                  setPendingDestructiveAction({
                    publicCode: activeTicket.public_code,
                    url: `/api/staff/tickets/${activeTicket.id}/cancel`,
                    method: 'POST',
                    body: { cancelReason: 'PATIENT_LEFT' },
                    description: `Cancel active token ${activeTicket.public_code}? You can still requeue it from History later if needed.`
                  })
                }
                className="touch-target w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-status-emergency bg-surface text-status-emergency font-bold px-3.5 py-2.5 text-xs sm:text-sm hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.staff.cancelBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-subtle border border-border-subtle text-sm font-medium text-ink-secondary">
            {t.staff.noActivePatient}
          </div>
        )}
      </div>

      {/* Waiting Queue & Recent History Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm sm:text-base text-ink-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-primary shrink-0" aria-hidden="true" />
            <span>
              {t.staff.waitingHeading} ({filteredWaitingTickets.length})
            </span>
          </h3>

          {filteredWaitingTickets.length === 0 ? (
            <div className="p-4 rounded-2xl bg-subtle border border-border-subtle text-xs font-medium text-ink-secondary">
              No waiting patients match the current filter.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filteredWaitingTickets.map((ticket, index) => (
                <li
                  key={ticket.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-canvas border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-token text-xs font-extrabold px-2 py-0.5 rounded-md bg-brand-primary text-white">
                        #{index + 1}
                      </span>
                      <span className="font-token font-extrabold text-base text-ink-primary">
                        {ticket.public_code}
                      </span>
                      {ticket.created_at && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {formatShortTimestamp(ticket.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-ink-secondary mt-1">
                      {ticket.visit_type} · Sort #{ticket.queue_sort_order}
                      {ticket.requeued_count > 0
                        ? ` · Requeued (${ticket.requeued_count})`
                        : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`waiting-cancel-btn-${ticket.public_code}`}
                    onClick={() =>
                      setPendingDestructiveAction({
                        publicCode: ticket.public_code,
                        url: `/api/staff/tickets/${ticket.id}/cancel`,
                        method: 'POST',
                        body: { cancelReason: 'PATIENT_LEFT' },
                        description: `Cancel waiting token ${ticket.public_code}?`
                      })
                    }
                    className="touch-target w-full sm:w-auto px-3.5 py-2 rounded-xl border border-status-emergency bg-surface text-status-emergency font-bold text-xs hover:bg-red-50 transition-colors"
                  >
                    {t.staff.cancelBtn}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-extrabold text-sm sm:text-base text-ink-primary flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
            <span>
              {t.staff.historyHeading} ({filteredHistoryTickets.length})
            </span>
          </h3>

          {filteredHistoryTickets.length === 0 ? (
            <div className="p-4 rounded-2xl bg-subtle border border-border-subtle text-xs font-medium text-ink-secondary">
              No completed, no-show, or cancelled tickets match the current filter.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filteredHistoryTickets.slice(0, 15).map((ticket) => (
                <li
                  key={ticket.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-canvas border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-token font-extrabold text-base text-ink-primary">
                        {ticket.public_code}
                      </span>
                      <span
                        className={`font-token text-xs font-bold px-2 py-0.5 rounded-md border ${
                          ticket.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-status-serving border-emerald-200'
                            : ticket.status === 'NO_SHOW'
                            ? 'bg-amber-50 text-status-next border-amber-200'
                            : 'bg-red-50 text-status-emergency border-red-200'
                        }`}
                      >
                        {ticket.status}
                      </span>
                      {(ticket.completed_at || ticket.cancelled_at || ticket.no_show_at) && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {formatShortTimestamp(
                            ticket.completed_at || ticket.cancelled_at || ticket.no_show_at
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-ink-secondary mt-1">
                      Sort #{ticket.queue_sort_order} · Requeued: {ticket.requeued_count}
                    </div>
                  </div>

                  {['NO_SHOW', 'CANCELLED'].includes(ticket.status) && (
                    <button
                      type="button"
                      data-testid={`requeue-btn-${ticket.public_code}`}
                      onClick={() =>
                        executeStaffMutation(
                          `/api/staff/tickets/${ticket.id}/requeue`
                        )
                      }
                      className="btn-teal w-full sm:w-auto px-3.5 py-2 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.staff.requeueBtn}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
