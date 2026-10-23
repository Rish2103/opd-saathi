import React, { useEffect, useState } from 'react';
import {
  Activity,
  BellRing,
  Clock,
  Navigation,
  RefreshCw,
  Search,
  Stethoscope,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function MyTurnView({
  lang,
  t,
  lookupCode,
  setLookupCode,
  trackedSlip,
  loading,
  error,
  lastVerifiedAt,
  connectionState,
  savedLocalSlip,
  onLookupCode,
  onOpenDirections
}) {
  const [newlyCrossedAlert, setNewlyCrossedAlert] = useState(false);

  const aheadCount = trackedSlip?.queue?.peopleAheadWaiting ?? 999;
  const thresholdAlertType = !trackedSlip
    ? null
    : trackedSlip.status === 'CALLED' || trackedSlip.status === 'IN_CONSULTATION'
      ? 'CALLED'
      : trackedSlip.status === 'WAITING' && aheadCount <= 3
        ? 'NEAR_TURN'
        : null;

  // Deduplicated <= 3 people ahead & CALLED notification logic
  useEffect(() => {
    if (!trackedSlip || !thresholdAlertType) {
      setNewlyCrossedAlert(false);
      return;
    }

    const alertStorageKey = `opd_alerted_${trackedSlip.id}_${trackedSlip.requeuedCount ?? 0}`;

    if (thresholdAlertType === 'CALLED') {
      try {
        const prev = window.localStorage.getItem(alertStorageKey);
        if (prev !== 'CALLED') {
          window.localStorage.setItem(alertStorageKey, 'CALLED');
          setNewlyCrossedAlert(true);
        } else {
          setNewlyCrossedAlert(false);
        }
      } catch {
        setNewlyCrossedAlert(true);
      }
      return;
    }

    if (thresholdAlertType === 'NEAR_TURN') {
      try {
        const prev = window.localStorage.getItem(alertStorageKey);
        if (!prev) {
          window.localStorage.setItem(alertStorageKey, 'NEAR_TURN');
          setNewlyCrossedAlert(true);
        } else {
          setNewlyCrossedAlert(false);
        }
      } catch {
        setNewlyCrossedAlert(true);
      }
    }
  }, [trackedSlip, thresholdAlertType]);

  function handleFormSubmit(e) {
    e.preventDefault();
    if (lookupCode.trim()) {
      onLookupCode(lookupCode.trim().toUpperCase());
    }
  }

  const dept = trackedSlip?.department || {};
  const queue = trackedSlip?.queue || {};
  const deptName = lang === 'hi' ? dept.name_hi : dept.name_en;
  const doctorName = lang === 'hi' ? dept.doctor_name_hi : dept.doctor_name_en;
  const floorLabel = t.floors[dept.floor_number] || `Floor ${dept.floor_number}`;
  const statusText = trackedSlip
    ? t.statuses[trackedSlip.status] || trackedSlip.status
    : '';
  const docStatusText = queue.doctorStatus
    ? t.doctorStatuses[queue.doctorStatus] || queue.doctorStatus
    : '';

  return (
    <section
      aria-labelledby="my-turn-heading"
      className="bg-surface border-2 border-border-strong rounded-xl p-5 sm:p-7 shadow-card space-y-6"
    >
      {/* Header & Connection Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border-strong pb-4">
        <div className="space-y-1">
          <h2 id="my-turn-heading" className="text-xl sm:text-2xl font-bold text-ink-primary">
            {t.myTurn.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.myTurn.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="connection-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              connectionState === 'live'
                ? 'bg-green-50 text-status-serving border-status-serving'
                : connectionState === 'reconnecting'
                  ? 'bg-amber-50 text-status-next border-status-next'
                  : 'bg-slate-100 text-ink-secondary border-border-strong'
            }`}
          >
            {connectionState === 'live' ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{t.conn[connectionState] || t.conn.live}</span>
          </span>
        </div>
      </div>

      {/* Public Token Code Lookup Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 rounded-xl bg-subtle border-2 border-border-strong flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="my-turn-code-input"
            className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
          >
            {t.myTurn.inputLabel}
          </label>
          <input
            id="my-turn-code-input"
            type="text"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            placeholder={t.myTurn.inputPlaceholder}
            className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3.5 py-2.5 font-token text-base font-bold uppercase tracking-wider"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !lookupCode.trim()}
          className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-5 py-2.5 text-sm sm:text-base disabled:opacity-60"
        >
          <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.myTurn.searchBtn}</span>
        </button>

        {savedLocalSlip && savedLocalSlip.publicCode !== trackedSlip?.publicCode && (
          <button
            type="button"
            onClick={() => {
              setLookupCode(savedLocalSlip.publicCode);
              onLookupCode(savedLocalSlip.publicCode);
            }}
            className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-teal bg-surface text-brand-teal font-bold px-4 py-2.5 text-xs sm:text-sm"
          >
            <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {t.myTurn.useSavedBtn} ({savedLocalSlip.publicCode})
            </span>
          </button>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border-2 border-status-emergency text-status-emergency font-bold text-sm"
        >
          {error}
        </div>
      )}

      {/* Tracked Slip Live Status Display */}
      {trackedSlip && (
        <div className="space-y-5">
          {/* <= 3 People Ahead or CALLED Alert Banner */}
          {thresholdAlertType === 'CALLED' && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="turn-alert-banner"
              className="p-4 sm:p-5 rounded-xl bg-green-50 border-4 border-status-serving text-ink-primary flex items-start gap-3.5 shadow-sm"
            >
              <BellRing
                className="w-7 h-7 text-status-serving shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="font-bold text-base sm:text-lg text-status-serving">
                  {t.myTurn.alertCalledTitle} ({trackedSlip.publicCode})
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {t.myTurn.alertCalledDesc} — <strong>{dept.room_label}</strong> ({floorLabel})
                </p>
              </div>
            </div>
          )}

          {thresholdAlertType === 'NEAR_TURN' && (
            <div
              role="status"
              aria-live={newlyCrossedAlert ? 'assertive' : 'polite'}
              data-testid="turn-alert-banner"
              className="p-4 sm:p-5 rounded-xl bg-amber-50 border-4 border-status-next text-ink-primary flex items-start gap-3.5 shadow-sm"
            >
              <BellRing
                className="w-7 h-7 text-status-next shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="font-bold text-base sm:text-lg text-status-next">
                  {t.myTurn.alertNearTitle} ({queue.peopleAheadWaiting} {t.home.waitingCount})
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {t.myTurn.alertNearDesc} ({dept.room_label}, {floorLabel})
                </p>
              </div>
            </div>
          )}

          {/* Main Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-brand-primary text-white">
              <div className="text-xs font-bold uppercase text-slate-300">
                {t.slip.tokenLabel}
              </div>
              <div
                data-testid="my-turn-token-code"
                className="font-token text-3xl font-bold tracking-wider mt-1"
              >
                {trackedSlip.publicCode}
              </div>
              <div
                data-testid="my-turn-status"
                className="text-xs font-bold text-slate-200 mt-1.5"
              >
                {statusText}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
              <div className="text-xs font-bold uppercase text-ink-muted">
                {t.home.nowServing}
              </div>
              <div
                data-testid="my-turn-now-serving"
                className="font-token text-2xl sm:text-3xl font-bold text-status-serving mt-1"
              >
                {queue.nowServingCode || t.home.noActiveToken}
              </div>
              <div className="text-xs text-ink-secondary mt-1">{deptName}</div>
            </div>

            <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
              <div className="text-xs font-bold uppercase text-ink-muted">
                {t.slip.peopleAhead}
              </div>
              <div
                data-testid="my-turn-people-ahead"
                className="font-token text-2xl sm:text-3xl font-bold text-ink-primary mt-1"
              >
                {queue.peopleAheadWaiting ?? 0}
              </div>
              <div className="text-xs text-ink-secondary mt-1">{docStatusText}</div>
            </div>

            <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
              <div className="flex items-center gap-1 text-xs font-bold uppercase text-ink-muted">
                <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                <span>{t.home.estWait}</span>
              </div>
              <div className="font-token text-2xl sm:text-3xl font-bold text-brand-teal mt-1">
                {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK'
                  ? '—'
                  : queue.estimatedWaitMinutes !== null &&
                      queue.estimatedWaitMinutes !== undefined
                    ? `~${queue.estimatedWaitMinutes} ${t.home.mins}`
                    : '—'}
              </div>
              <div className="text-xs text-ink-secondary mt-1">
                {dept.room_label} · {floorLabel}
              </div>
            </div>
          </div>

          {/* Department Info & Re-check Footer */}
          <div className="p-4 rounded-xl bg-subtle border border-border-strong flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="font-bold text-ink-primary flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-brand-teal" aria-hidden="true" />
                <span>
                  {deptName} — {doctorName} ({dept.room_label}, {floorLabel})
                </span>
              </div>
              <div className="text-ink-secondary">
                {t.myTurn.lastUpdated}{' '}
                <span className="font-token font-bold">
                  {lastVerifiedAt || new Date().toLocaleTimeString()}
                </span>
                {trackedSlip.requeuedCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-surface border border-border-strong font-mono text-xs">
                    {t.myTurn.requeuedNote} {trackedSlip.requeuedCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onLookupCode(trackedSlip.publicCode)}
                disabled={loading}
                className="touch-target inline-flex items-center gap-1.5 rounded-lg border-2 border-brand-primary bg-surface text-brand-primary font-bold px-3.5 py-2 text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{t.home.boardRefresh}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onOpenDirections({
                    fromNodeId: 'registration_desk',
                    toNodeId: dept.destination_node_id,
                    avoidStairs: trackedSlip.avoidStairs
                  })
                }
                className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-brand-teal text-white font-bold px-4 py-2 text-xs sm:text-sm"
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>{t.slip.directionsBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
