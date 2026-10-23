import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Users,
  XCircle
} from 'lucide-react';

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

  const [docStatusForm, setDocStatusForm] = useState({
    status: 'AVAILABLE',
    delayMinutes: 0
  });

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
        className="max-w-md mx-auto bg-surface border-2 border-border-strong rounded-xl p-6 shadow-card space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary text-white">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="staff-login-heading" className="text-xl font-bold text-ink-primary">
              {t.staff.loginTitle}
            </h2>
            <p className="text-xs text-ink-secondary">{t.staff.loginDesc}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-subtle border border-border-strong text-xs font-mono font-bold text-brand-primary">
          {t.staff.demoHint}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="staff-pin-input"
              className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
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
              className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-lg font-bold tracking-widest"
            />
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-status-emergency text-status-emergency text-xs font-bold"
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading || !pin.trim()}
            className="touch-target w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-5 py-3 text-sm sm:text-base disabled:opacity-60"
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
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

  return (
    <section
      aria-labelledby="staff-desk-heading"
      className="bg-surface border-2 border-border-strong rounded-xl p-5 sm:p-7 shadow-card space-y-6"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border-strong pb-4">
        <div>
          <h2 id="staff-desk-heading" className="text-xl sm:text-2xl font-bold text-ink-primary">
            {t.staff.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.staff.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchStaffDashboard(selectedDeptSlug)}
            disabled={loadingQueue}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold px-3.5 py-2 text-xs sm:text-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingQueue ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{t.home.boardRefresh}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border-2 border-status-emergency bg-red-50 text-status-emergency font-bold px-3.5 py-2 text-xs sm:text-sm"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>{t.staff.logoutBtn}</span>
          </button>
        </div>
      </div>

      {/* Conflict / Action Feedback Banner */}
      {actionBanner && (
        <div
          role="alert"
          data-testid="staff-action-banner"
          className={`p-4 rounded-xl border-2 font-bold text-sm flex items-center justify-between gap-3 ${
            actionBanner.type === 'error'
              ? 'bg-red-50 border-status-emergency text-status-emergency'
              : 'bg-green-50 border-status-serving text-status-serving'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionBanner.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {actionBanner.code ? `[${actionBanner.code}] ` : ''}
              {actionBanner.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-xs underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Urgent Help & Triage Requests Panel */}
      <div className="p-4 rounded-xl bg-red-50/70 border-2 border-status-emergency space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm sm:text-base text-status-emergency flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.staff.urgentHeading}</span>
          </h3>
          <span className="font-token text-xs font-bold px-2.5 py-0.5 rounded bg-status-emergency text-white">
            {urgentFlags.filter((f) => f.status !== 'RESOLVED').length} Open
          </span>
        </div>

        {urgentFlags.length === 0 ? (
          <p className="text-xs text-ink-secondary">{t.staff.urgentEmpty}</p>
        ) : (
          <div className="space-y-2">
            {urgentFlags.slice(0, 5).map((flag) => (
              <div
                key={flag.id}
                className="p-3 rounded-lg bg-surface border border-border-strong flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
              >
                <div>
                  <span className="font-token font-bold px-2 py-0.5 rounded bg-subtle border border-border-strong mr-2">
                    {flag.status}
                  </span>
                  <strong>{flag.location_label}</strong> ·{' '}
                  <span className="text-ink-secondary">{flag.request_type}</span>
                  {flag.public_code && (
                    <span className="ml-2 font-token font-bold text-brand-primary">
                      ({flag.public_code})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {flag.status === 'NEW' && (
                    <button
                      type="button"
                      onClick={() =>
                        executeStaffMutation(
                          `/api/staff/urgent-flags/${flag.id}/acknowledge`
                        )
                      }
                      className="touch-target px-3 py-1.5 rounded-lg bg-brand-primary text-white font-bold text-xs"
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
                      className="touch-target px-3 py-1.5 rounded-lg bg-status-serving text-white font-bold text-xs"
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

      {/* Department Selector & Doctor Status Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-subtle border-2 border-border-strong space-y-2">
          <label
            htmlFor="staff-dept-select"
            className="block text-xs sm:text-sm font-bold text-ink-primary"
          >
            {t.staff.selectDept}
          </label>
          <select
            id="staff-dept-select"
            value={selectedDeptSlug}
            onChange={(e) => setSelectedDeptSlug(e.target.value)}
            className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3 py-2 text-sm font-bold"
          >
            {departments.map((dept) => (
              <option key={dept.slug} value={dept.slug}>
                [{dept.token_prefix}] {lang === 'hi' ? dept.name_hi : dept.name_en} (
                {dept.room_label})
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-xl bg-subtle border-2 border-border-strong space-y-2">
          <div className="text-xs sm:text-sm font-bold text-ink-primary flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-teal" aria-hidden="true" />
            <span>{t.staff.doctorStatusHeading}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t.staff.doctorStatusHeading}
              value={docStatusForm.status}
              onChange={(e) =>
                setDocStatusForm((prev) => ({ ...prev, status: e.target.value }))
              }
              className="touch-target flex-1 min-w-[150px] rounded-lg border-2 border-border-strong bg-surface px-3 py-2 text-xs sm:text-sm font-bold"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="DELAYED">DELAYED</option>
              <option value="ON_BREAK">ON_BREAK</option>
              <option value="UNAVAILABLE">UNAVAILABLE</option>
            </select>

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
              className="touch-target w-24 rounded-lg border-2 border-border-strong bg-surface px-3 py-2 font-token text-xs sm:text-sm font-bold"
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
              className="touch-target px-4 py-2 rounded-lg bg-brand-teal text-white font-bold text-xs sm:text-sm"
            >
              {t.staff.saveDocStatusBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Active Patient Card & Call Next Button */}
      <div className="p-5 rounded-xl bg-canvas border-2 border-border-strong space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-base sm:text-lg text-ink-primary">
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
            className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-5 py-3 text-sm sm:text-base shadow-sm disabled:opacity-50"
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
            className="p-4 rounded-xl bg-green-50 border-2 border-status-serving flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <div className="font-token text-2xl sm:text-3xl font-bold text-ink-primary">
                {activeTicket.public_code}
              </div>
              <div className="text-xs sm:text-sm font-bold text-status-serving mt-0.5">
                Status: {activeTicket.status} · {activeTicket.visit_type}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                    className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-brand-teal text-white font-bold px-4 py-2.5 text-xs sm:text-sm"
                  >
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
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
                    className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-status-next text-white font-bold px-4 py-2.5 text-xs sm:text-sm"
                  >
                    <UserMinus className="w-4 h-4" aria-hidden="true" />
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
                  className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-status-serving text-white font-bold px-4 py-2.5 text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t.staff.completeBtn}</span>
                </button>
              )}

              <button
                type="button"
                data-testid="staff-cancel-btn"
                onClick={() =>
                  executeStaffMutation(
                    `/api/staff/tickets/${activeTicket.id}/cancel`,
                    'POST',
                    { cancelReason: 'PATIENT_LEFT' }
                  )
                }
                className="touch-target inline-flex items-center gap-1.5 rounded-lg border-2 border-status-emergency bg-surface text-status-emergency font-bold px-3.5 py-2 text-xs sm:text-sm"
              >
                <XCircle className="w-4 h-4" aria-hidden="true" />
                <span>{t.staff.cancelBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-subtle border border-border-strong text-sm text-ink-secondary">
            {t.staff.noActivePatient}
          </div>
        )}
      </div>

      {/* Waiting Queue & Recent History Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <h3 className="font-bold text-sm sm:text-base text-ink-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            <span>
              {t.staff.waitingHeading} ({waitingTickets.length})
            </span>
          </h3>

          {waitingTickets.length === 0 ? (
            <div className="p-4 rounded-xl bg-subtle border border-border-strong text-xs text-ink-secondary">
              No waiting patients in this department.
            </div>
          ) : (
            <ul className="space-y-2">
              {waitingTickets.map((ticket, index) => (
                <li
                  key={ticket.id}
                  className="p-3.5 rounded-xl bg-canvas border-2 border-border-strong flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-token text-xs font-bold px-2 py-0.5 rounded bg-brand-primary text-white mr-2">
                      #{index + 1}
                    </span>
                    <span className="font-token font-bold text-base text-ink-primary">
                      {ticket.public_code}
                    </span>
                    <div className="text-xs text-ink-secondary mt-0.5">
                      {ticket.visit_type} · Sort #{ticket.queue_sort_order}
                      {ticket.requeued_count > 0
                        ? ` · Requeued (${ticket.requeued_count})`
                        : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      executeStaffMutation(
                        `/api/staff/tickets/${ticket.id}/cancel`,
                        'POST',
                        { cancelReason: 'PATIENT_LEFT' }
                      )
                    }
                    className="touch-target px-3 py-1.5 rounded-lg border border-status-emergency text-status-emergency font-bold text-xs"
                  >
                    {t.staff.cancelBtn}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-sm sm:text-base text-ink-primary flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-brand-teal" aria-hidden="true" />
            <span>
              {t.staff.historyHeading} ({historyTickets.length})
            </span>
          </h3>

          {historyTickets.length === 0 ? (
            <div className="p-4 rounded-xl bg-subtle border border-border-strong text-xs text-ink-secondary">
              No completed, no-show, or cancelled tickets yet today.
            </div>
          ) : (
            <ul className="space-y-2">
              {historyTickets.slice(0, 10).map((ticket) => (
                <li
                  key={ticket.id}
                  className="p-3.5 rounded-xl bg-canvas border-2 border-border-strong flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-token font-bold text-base text-ink-primary mr-2">
                      {ticket.public_code}
                    </span>
                    <span className="font-token text-xs font-bold px-2 py-0.5 rounded bg-subtle border border-border-strong">
                      {ticket.status}
                    </span>
                    <div className="text-xs text-ink-secondary mt-0.5">
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
                      className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-brand-teal text-white font-bold px-3.5 py-2 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
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
