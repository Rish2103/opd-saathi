import React, { useEffect, useState } from 'react';
import {
  Activity,
  BellRing,
  Clock,
  Navigation,
  RefreshCw,
  Search,
  Stethoscope,
  UserPlus,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react';
import { isWebAudioSupported, playPatientCalledChime } from '../utils/soundAlerts.js';
import { getLocalizedDepartment } from '../i18n/translations.js';
import VoiceListenButton from './VoiceListenButton.jsx';

const SOUND_PREF_KEY = 'opd_patient_sound_enabled';

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
  savedSlips = [],
  onSelectSavedSlip,
  onLookupCode,
  onRegisterNew,
  onOpenDirections
}) {
  const [newlyCrossedAlert, setNewlyCrossedAlert] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [audioPlaybackNotice, setAudioPlaybackNotice] = useState('');

  const aheadCount = trackedSlip?.queue?.peopleAheadWaiting ?? 999;
  const thresholdAlertType = !trackedSlip
    ? null
    : trackedSlip.status === 'CALLED' || trackedSlip.status === 'IN_CONSULTATION'
      ? 'CALLED'
      : trackedSlip.status === 'WAITING' && aheadCount <= 3
        ? 'NEAR_TURN'
        : null;

  function handleToggleSound() {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, String(nextValue));
    } catch {
      // ignore storage errors
    }
    if (nextValue) {
      const ok = playPatientCalledChime();
      if (!ok && !isWebAudioSupported()) {
        setAudioPlaybackNotice(
          t.myTurn?.soundFallbackNote ||
            'Audio playback is unavailable in this browser. Visual alerts remain active.'
        );
      } else {
        setAudioPlaybackNotice('');
      }
    }
  }

  // Deduplicated <= 3 people ahead & CALLED notification + sound chime logic
  useEffect(() => {
    if (!trackedSlip || !thresholdAlertType) {
      setNewlyCrossedAlert(false);
      return;
    }

    const stableTicketIdentity =
      trackedSlip.id || trackedSlip.publicCode || 'unknown';
    const alertStorageKey = `opd_alerted_${stableTicketIdentity}_${trackedSlip.requeuedCount ?? 0}`;
    const soundStorageKey = `opd_sound_played_${stableTicketIdentity}_${trackedSlip.requeuedCount ?? 0}`;

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

      if (soundEnabled && trackedSlip.status === 'CALLED') {
        try {
          const alreadyChimed = window.localStorage.getItem(soundStorageKey);
          if (alreadyChimed !== 'CALLED') {
            window.localStorage.setItem(soundStorageKey, 'CALLED');
            playPatientCalledChime();
          }
        } catch {
          playPatientCalledChime();
        }
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
  }, [trackedSlip, thresholdAlertType, soundEnabled]);

  function handleFormSubmit(e) {
    e.preventDefault();
    if (lookupCode.trim()) {
      onLookupCode(lookupCode.trim().toUpperCase());
    }
  }

  const dept = trackedSlip?.department || {};
  const queue = trackedSlip?.queue || {};
  const localizedDept = getLocalizedDepartment(dept, lang, t);
  const deptName = localizedDept.name;
  const doctorName = localizedDept.doctor;
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
      className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-7 shadow-card space-y-6"
    >
      {/* Header, Sound Alert Toggle & Connection Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="space-y-1">
          <h2
            id="my-turn-heading"
            className="text-xl sm:text-2xl font-extrabold text-ink-primary tracking-tight"
          >
            {t.myTurn.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.myTurn.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VoiceListenButton
            lang={lang}
            size="sm"
            testId="voice-listen-my-turn-header"
            text={
              trackedSlip
                ? `${t.myTurn.title}. ${t.slip.tokenLabel}: ${trackedSlip.publicCode}. ${statusText}. ${t.home.nowServing}: ${queue.nowServingCode || t.home.noActiveToken}. ${t.slip.peopleAhead}: ${queue.peopleAheadWaiting ?? 0}. ${deptName}, ${doctorName}, ${dept.room_label}, ${floorLabel}.`
                : `${t.myTurn.title}. ${t.myTurn.subtitle}. ${t.myTurn.emptyDesc}`
            }
          />

          <button
            type="button"
            data-testid="patient-sound-alert-toggle"
            aria-pressed={soundEnabled}
            onClick={handleToggleSound}
            className={`touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
              soundEnabled
                ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                : 'bg-canvas text-ink-primary border-border-strong hover:bg-subtle'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {soundEnabled
                ? t.myTurn.soundEnabledBtn || 'Sound Alerts: ON'
                : t.myTurn.soundMutedBtn || 'Sound Alerts: Muted'}
            </span>
          </button>

          <span
            data-testid="connection-status-badge"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
              connectionState === 'live'
                ? 'bg-emerald-50 text-status-serving border-emerald-200'
                : connectionState === 'reconnecting'
                  ? 'bg-amber-50 text-status-next border-amber-200'
                  : 'bg-slate-100 text-ink-secondary border-border-strong'
            }`}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              {connectionState === 'live' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionState === 'live'
                    ? 'bg-status-serving'
                    : connectionState === 'reconnecting'
                      ? 'bg-status-next'
                      : 'bg-slate-400'
                }`}
              />
            </span>
            {connectionState === 'live' ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{t.conn[connectionState] || t.conn.live}</span>
          </span>
        </div>
      </div>

      {/* Visible Sound Status Fallback Note */}
      <div
        data-testid="patient-sound-fallback-note"
        className="text-xs font-semibold text-ink-secondary bg-subtle/70 border border-border-subtle rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2"
      >
        <span>
          {audioPlaybackNotice ||
            t.myTurn.soundFallbackNote ||
            'Visual banner alerts stay active even when sound is muted or unavailable.'}
        </span>
        {soundEnabled && (
          <button
            type="button"
            data-testid="patient-sound-test-btn"
            onClick={() => playPatientCalledChime()}
            className="text-xs font-extrabold text-brand-primary underline hover:text-brand-teal"
          >
            {t.myTurn.soundTestBtn || 'Test Chime'}
          </button>
        )}
      </div>

      {/* Public Token Code Lookup Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 sm:p-5 rounded-2xl bg-subtle/80 border border-border-subtle flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3"
      >
        <div className="flex-1 min-w-0 sm:min-w-[220px]">
          <label
            htmlFor="my-turn-code-input"
            className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
          >
            {t.myTurn.inputLabel}
          </label>
          <input
            id="my-turn-code-input"
            type="text"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            placeholder={t.myTurn.inputPlaceholder}
            className="touch-target w-full rounded-xl border border-border-strong bg-surface px-4 py-2.5 font-token text-base font-extrabold uppercase tracking-wider shadow-xs"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !lookupCode.trim()}
          className="btn-primary w-full sm:w-auto px-5 py-2.5 text-sm sm:text-base"
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
            className="btn-secondary w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm border-brand-teal text-brand-teal"
          >
            <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {t.myTurn.useSavedBtn} ({savedLocalSlip.publicCode})
            </span>
          </button>
        )}
      </form>

      {Array.isArray(savedSlips) && savedSlips.length > 0 && (
        <div
          data-testid="my-turn-saved-slips-bar"
          className="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-2.5"
        >
          <div className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary">
            {t.slip?.mySlipsSwitcherTitle || 'Saved OPD Slips on This Device'}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {savedSlips.map((entry) => {
              const isCurrent = trackedSlip?.publicCode === entry.publicCode;
              return (
                <button
                  key={entry.ticketId || entry.publicCode}
                  type="button"
                  data-testid={`my-turn-pick-slip-${entry.publicCode}`}
                  onClick={() => {
                    setLookupCode(entry.publicCode);
                    if (onSelectSavedSlip) {
                      onSelectSavedSlip(entry);
                    }
                    onLookupCode(entry.publicCode);
                  }}
                  className={`touch-target inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all text-left ${
                    isCurrent
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-surface text-brand-primary border-border-strong hover:border-brand-teal/50 hover:bg-subtle'
                  }`}
                >
                  <span className="font-token font-extrabold">{entry.publicCode}</span>
                  <span
                    className={`truncate text-xs ${
                      isCurrent ? 'text-[#F5A623]' : 'text-ink-secondary'
                    }`}
                  >
                    {getLocalizedDepartment(entry.ticket?.department || entry, lang, t).name ||
                      entry.departmentName_en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-status-emergency text-status-emergency font-bold text-sm"
        >
          {error}
        </div>
      )}

      {!trackedSlip && !error && (
        <div
          data-testid="my-turn-empty-state"
          className="p-6 sm:p-8 rounded-2xl bg-canvas border border-border-subtle text-center space-y-3"
        >
          <div className="font-extrabold text-base sm:text-lg text-ink-primary">
            {t.myTurn.emptyTitle}
          </div>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-xl mx-auto">
            {t.myTurn.emptyDesc}
          </p>
          {onRegisterNew && (
            <div className="pt-2">
              <button
                type="button"
                data-testid="my-turn-empty-register-btn"
                onClick={onRegisterNew}
                className="btn-primary px-5 py-2.5 text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.myTurn.emptyRegisterBtn}</span>
              </button>
            </div>
          )}
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
              className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-status-serving text-ink-primary flex items-start gap-3.5 shadow-sm"
            >
              <BellRing
                className="w-7 h-7 text-status-serving shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="font-extrabold text-base sm:text-lg text-status-serving">
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
              className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-status-next text-ink-primary flex items-start gap-3.5 shadow-sm"
            >
              <BellRing
                className="w-7 h-7 text-status-next shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="font-extrabold text-base sm:text-lg text-status-next">
                  {t.myTurn.alertNearTitle} ({queue.peopleAheadWaiting} {t.home.waitingCount})
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {t.myTurn.alertNearDesc} ({dept.room_label}, {floorLabel})
                </p>
              </div>
            </div>
          )}

          {/* Main Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl mastercard-3d-hero text-white shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-[#F5A623]">
                {t.slip.tokenLabel}
              </div>
              <div
                data-testid="my-turn-token-code"
                className="font-token text-3xl font-extrabold tracking-wider mt-1"
              >
                {trackedSlip.publicCode}
              </div>
              <div
                data-testid="my-turn-status"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-bold text-white mt-2"
              >
                {statusText}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {t.home.nowServing}
              </div>
              <div
                data-testid="my-turn-now-serving"
                className="font-token text-2xl sm:text-3xl font-extrabold text-status-serving mt-1"
              >
                {queue.nowServingCode || t.home.noActiveToken}
              </div>
              <div className="text-xs font-medium text-ink-secondary mt-1.5">{deptName}</div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {t.slip.peopleAhead}
              </div>
              <div
                data-testid="my-turn-people-ahead"
                className="font-token text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1"
              >
                {queue.peopleAheadWaiting ?? 0}
              </div>
              <div className="text-xs font-medium text-ink-secondary mt-1.5">{docStatusText}</div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                <span>{t.home.estWait}</span>
              </div>
              <div className="font-token text-2xl sm:text-3xl font-extrabold text-brand-teal mt-1">
                {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK'
                  ? '—'
                  : queue.estimatedWaitMinutes !== null &&
                      queue.estimatedWaitMinutes !== undefined
                    ? `~${queue.estimatedWaitMinutes} ${t.home.mins}`
                    : '—'}
              </div>
              <div className="text-xs font-medium text-ink-secondary mt-1.5">
                {dept.room_label} · {floorLabel}
              </div>
            </div>
          </div>

          {/* Department Info & Re-check Footer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-subtle/80 border border-border-subtle flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="font-extrabold text-ink-primary flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                <span>
                  {deptName} — {doctorName} ({dept.room_label}, {floorLabel})
                </span>
              </div>
              <div className="text-ink-secondary flex flex-wrap items-center gap-2">
                <span>
                  {t.myTurn.lastUpdated}{' '}
                  <span className="font-token font-bold text-ink-primary">
                    {lastVerifiedAt || new Date().toLocaleTimeString()}
                  </span>
                </span>
                {trackedSlip.requeuedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border-strong font-mono text-xs font-bold">
                    {t.myTurn.requeuedNote} {trackedSlip.requeuedCount}
                  </span>
                )}
                <span
                  data-testid="my-turn-route-preference"
                  className="px-2.5 py-0.5 rounded-full bg-surface border border-border-strong text-xs font-bold text-brand-teal"
                >
                  {(trackedSlip.avoidStairs ?? true)
                    ? t.slip?.routeAvoidStairs ||
                      (lang === 'hi'
                        ? 'केवल लिफ्ट और रैंप (No Stairs)'
                        : 'Avoid Stairs (Lift / Ramp Only)')
                    : t.slip?.routeStandard ||
                      (lang === 'hi'
                        ? 'सामान्य मार्ग (Standard Route)'
                        : 'Shortest Route (Stairs OK)')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onLookupCode(trackedSlip.publicCode)}
                disabled={loading}
                className="btn-secondary px-3.5 py-2 text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{t.home.boardRefresh}</span>
              </button>

              <button
                type="button"
                data-testid="my-turn-directions-btn"
                onClick={() =>
                  onOpenDirections({
                    fromNodeId: 'registration_desk',
                    toNodeId: dept.destination_node_id,
                    avoidStairs: Boolean(trackedSlip.avoidStairs ?? true)
                  })
                }
                className="btn-teal px-4 py-2 text-xs sm:text-sm"
              >
                <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.slip.directionsBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
