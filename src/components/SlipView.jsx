import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Volume2,
  VolumeX,
  Printer,
  Navigation,
  Clock,
  MapPin,
  Stethoscope,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
  FileText,
  Info
} from 'lucide-react';
import { findAccessibleRoute } from '../../shared/navigation/pathfinder.js';
import { getSpeechCapabilities } from '../utils/soundAlerts.js';
import { getLocalizedDepartment } from '../i18n/translations.js';

function getSlipCategoryTag(status, t) {
  if (['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(status)) {
    return {
      label: t.slip?.mySlipsActiveTag || 'Active',
      className: 'bg-emerald-100 text-status-serving border-emerald-300'
    };
  }
  if (status === 'COMPLETED') {
    return {
      label: t.slip?.mySlipsCompletedTag || 'Completed',
      className: 'bg-blue-100 text-brand-primary border-blue-300'
    };
  }
  return {
    label: t.slip?.mySlipsInactiveTag || 'Closed',
    className: 'bg-slate-200 text-ink-secondary border-slate-300'
  };
}

export default function SlipView({
  lang,
  t,
  slip,
  idempotentReplay = false,
  savedSlips = [],
  activeAccessToken = null,
  canCancelSlip = false,
  onSelectSavedSlip,
  onRemoveSavedSlip,
  onCancelActiveSlip,
  onCancelSlip,
  onOpenMyTurn,
  onOpenDirections,
  onRegisterNew
}) {
  const [speaking, setSpeaking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const effectiveCancelHandler = onCancelActiveSlip || onCancelSlip || null;
  const effectiveCanCancel = Boolean(activeAccessToken || canCancelSlip);

  const dept = slip?.department || {};
  const avoidStairsFlag = Boolean(slip?.avoidStairs ?? true);

  const slipRoute = useMemo(() => {
    if (!slip) return null;
    const toNodeId = dept.destination_node_id || 'room_204_med';
    return findAccessibleRoute({
      fromNodeId: 'registration_desk',
      toNodeId,
      avoidStairs: avoidStairsFlag
    });
  }, [slip, dept.destination_node_id, avoidStairsFlag]);

  const renderSavedSlipsSwitcher = () => {
    if (!savedSlips || savedSlips.length === 0) {
      return null;
    }

    return (
      <section
        aria-label={t.slip.mySlipsSwitcherTitle}
        data-testid="my-slips-switcher"
        className="card-surface p-4 sm:p-6 border-2 border-brand-primary/20 no-print"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-brand-primary">
              {t.slip.mySlipsSwitcherTitle} ({savedSlips.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onRegisterNew}
            className="btn-teal text-xs sm:text-sm py-2 px-4"
          >
            <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.slip.newRegBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {savedSlips.map((entry) => {
            const isSelected = slip && entry.ticketId === slip.id;
            const entrySlip = entry.ticket || {};
            const deptName =
              getLocalizedDepartment(entrySlip.department || entry, lang, t).name ||
              entry.departmentName_en ||
              entrySlip.department?.name_en;
            const status = entry.status || entrySlip.status || 'WAITING';
            const tag = getSlipCategoryTag(status, t);
            const patientName =
              entry.patientSummary?.fullName ||
              entrySlip.patientSummary?.fullName ||
              null;

            return (
              <div
                key={entry.ticketId || entry.publicCode}
                data-testid={`saved-slip-item-${entry.publicCode}`}
                className={`rounded-2xl p-4 border-2 transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-brand-primary bg-blue-50/70 shadow-sm ring-2 ring-brand-primary/10'
                    : 'border-border-subtle bg-subtle/70 hover:border-brand-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-token text-lg sm:text-xl font-black text-brand-primary block tracking-wider">
                      {entry.publicCode}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-ink-primary block mt-0.5">
                      {deptName}
                    </span>
                    {patientName && (
                      <span className="text-xs font-medium text-ink-secondary block mt-0.5">
                        {patientName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tag.className}`}
                    >
                      {tag.label} · {t.statuses?.[status] || status}
                    </span>
                    <span className="font-token text-[11px] text-ink-muted font-semibold">
                      {entry.roomLabel || entrySlip.department?.room_label || ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border-subtle">
                  {onSelectSavedSlip && (
                    <button
                      type="button"
                      data-testid={`open-saved-slip-${entry.publicCode}`}
                      onClick={() => onSelectSavedSlip(entry)}
                      className={`touch-target inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-colors ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                          : 'bg-surface text-brand-primary border-brand-primary hover:bg-blue-50'
                      }`}
                    >
                      <span className="truncate">
                        {isSelected
                          ? lang === 'hi'
                            ? 'अभी खुली है'
                            : lang === 'ta'
                            ? 'திறந்துள்ளது'
                            : 'Currently Viewing'
                          : lang === 'hi'
                          ? 'पर्ची खोलें'
                          : lang === 'ta'
                          ? 'சீட்டைத் திற'
                          : 'Open Slip'}
                      </span>
                    </button>
                  )}

                  {onRemoveSavedSlip && (
                    <button
                      type="button"
                      data-testid={`remove-saved-slip-${entry.publicCode}`}
                      onClick={() => onRemoveSavedSlip(entry.ticketId || entry.publicCode)}
                      title={t.slip.removeFromDeviceBtn}
                      className="touch-target px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-border-strong bg-surface text-ink-secondary hover:text-status-emergency hover:border-status-emergency hover:bg-red-50 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t.slip.removeFromDeviceBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-ink-secondary mt-3.5 flex items-start gap-2 bg-subtle p-3 rounded-xl border border-border-subtle">
          <Info className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.slip.recoveryNote}</span>
        </p>
      </section>
    );
  };

  if (!slip) {
    return (
      <div className="space-y-6">
        {renderSavedSlipsSwitcher()}
        <div className="card-surface p-8 text-center space-y-5">
          <h2 className="text-2xl font-bold text-brand-primary">{t.slip.noSlipTitle}</h2>
          <p className="text-ink-secondary max-w-md mx-auto">{t.slip.noSlipDesc}</p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button type="button" onClick={onRegisterNew} className="btn-primary">
              <UserPlus className="w-5 h-5" aria-hidden="true" />
              {t.slip.goRegister}
            </button>
            <button type="button" onClick={() => onOpenMyTurn('')} className="btn-secondary">
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              {t.slip.goLookup}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const queue = slip.queue || {};
  const patientSummary = slip.patientSummary || null;
  const localizedDept = getLocalizedDepartment(dept, lang, t);
  const deptName = localizedDept.name;
  const docName = localizedDept.doctor;
  const landmark = localizedDept.landmark;
  const floorLabel = t.floors[dept.floor_number] || `Floor ${dept.floor_number}`;

  // QR contains only the safe public lookup URL or publicCode, never accessToken
  const qrValue =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?code=${encodeURIComponent(slip.publicCode)}`
      : `/my-turn?code=${encodeURIComponent(slip.publicCode)}`;

  const handleReadAloud = () => {
    const caps = getSpeechCapabilities(lang);
    if (!caps.supported) {
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const spokenText =
      lang === 'hi'
        ? `आपका ओपीडी टोकन नंबर ${slip.publicCode} है। विभाग: ${dept.name_hi}। डॉक्टर: ${dept.doctor_name_hi}। कमरा नंबर: ${dept.room_label}, ${floorLabel}। पहचान चिह्न: ${dept.landmark_hi}। आपसे आगे ${queue.peopleAheadWaiting ?? 0} मरीज प्रतीक्षा में हैं।`
        : lang === 'ta'
        ? `உங்கள் ஓபிடி டோக்கன் எண் ${slip.publicCode}. துறை: ${deptName}. மருத்துவர்: ${docName}. அறை: ${dept.room_label}, ${floorLabel}. உங்களுக்கு முன் ${queue.peopleAheadWaiting ?? 0} நோயாளிகள் காத்திருக்கின்றனர்.`
        : `Your OPD token number is ${slip.publicCode}. Department: ${dept.name_en}. Doctor: ${dept.doctor_name_en}. Proceed to ${dept.room_label} on ${floorLabel}, ${dept.landmark_en}. People waiting ahead of you: ${queue.peopleAheadWaiting ?? 0}.`;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = caps.targetBcp47;
    if (caps.voice) {
      utterance.voice = caps.voice;
    }
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCancelToken = async () => {
    if (!effectiveCancelHandler || !slip?.id || cancelling) return;
    setCancelling(true);
    try {
      await effectiveCancelHandler(slip.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {renderSavedSlipsSwitcher()}

      {/* Main Digital OPD Slip Card */}
      <article
        aria-label={t.slip.title}
        className="card-surface print-slip-card overflow-hidden border-2 border-brand-primary shadow-elevated"
      >
        {/* Top Boarding-Pass Banner */}
        <div className="print-slip-header bg-gradient-to-r from-[#07192f] via-[#0B2545] to-[#0f3d5e] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-200 block mb-1">
              {t.slip.tokenLabel}
            </span>
            <div
              data-testid="slip-public-code"
              className="token-code-display text-white tracking-wider"
            >
              {slip.publicCode}
            </div>
            {(idempotentReplay || slip.idempotentReplay) && (
              <span className="inline-flex items-center gap-1.5 mt-2 bg-teal-800/90 border border-teal-400/40 text-teal-100 text-xs font-semibold px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.slip.recoveredBadge}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-xs uppercase tracking-wider text-blue-200">
              {t.slip.statusLabel}
            </span>
            <span
              data-testid="slip-status-badge"
              className={`px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wide shadow-sm ${
                slip.status === 'CALLED' || slip.status === 'IN_CONSULTATION'
                  ? 'bg-emerald-500 text-white'
                  : slip.status === 'WAITING'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-200 text-slate-900'
              }`}
            >
              {t.statuses?.[slip.status] || slip.status}
            </span>
            <span
              data-testid="slip-route-preference"
              className="text-xs text-blue-200"
            >
              {t.visitTypes[slip.visitType] || slip.visitType} ·{' '}
              {(slip.avoidStairs ?? true)
                ? t.slip?.routeAvoidStairs ||
                  (lang === 'hi'
                    ? 'केवल लिफ्ट और रैंप (No Stairs)'
                    : 'Avoid Stairs (Lift / Ramp Only)')
                : t.slip?.routeStandard ||
                  (lang === 'hi'
                    ? 'सामान्य मार्ग (Standard Route)'
                    : 'Shortest Route (Stairs OK)')}{' '}
              · {slip.queueDate}
            </span>
          </div>
        </div>

        {/* Perforated Ticket Divider */}
        <div className="ticket-perforation px-6 bg-surface" aria-hidden="true" />

        {/* Body Grid */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Clinical & Queue Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Protected Patient Identity Summary (Visible on Holder's Device Only) */}
            {patientSummary && (
              <div
                data-testid="slip-patient-summary"
                className="p-4 rounded-2xl bg-blue-50/70 border border-brand-primary/25 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>{t.slip.patientSummaryTitle}</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {t.slip.phoneUnverifiedTag ||
                      t.slip.unverifiedPhoneBadge ||
                      'Unverified (self-entered)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-1">
                  <div>
                    <span className="text-xs text-ink-secondary block">
                      {t.register?.patientLabel || 'Patient'}
                    </span>
                    <span className="font-bold text-ink-primary">
                      {patientSummary.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-secondary block">
                      {t.register?.ageGenderLabel || 'Age / Gender'}
                    </span>
                    <span className="font-bold text-ink-primary">
                      {patientSummary.ageYears} yrs
                      {patientSummary.gender &&
                      patientSummary.gender !== 'PREFER_NOT_TO_SAY'
                        ? ` · ${patientSummary.gender}`
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-secondary block">
                      {t.register?.mobileLabel || 'Mobile'}
                    </span>
                    <span className="font-token font-bold text-ink-primary">
                      {patientSummary.phoneMasked}
                    </span>
                  </div>
                </div>
                {patientSummary.registrationNumber && (
                  <p className="text-xs text-ink-secondary pt-1">
                    <strong>UHID / Reg No:</strong> {patientSummary.registrationNumber}
                  </p>
                )}
                <p className="text-[11px] text-ink-secondary pt-1 border-t border-blue-200/70">
                  {t.slip.privacyNote}
                </p>
              </div>
            )}

            {/* Queue Position & ETA Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.peopleAhead}
                </span>
                <span
                  data-testid="slip-people-ahead"
                  className="font-token text-3xl font-black text-brand-primary mt-1 block"
                >
                  {queue.peopleAheadWaiting ?? 0}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.nowServing}
                </span>
                <span className="text-2xl font-black text-status-serving font-token mt-1 block">
                  {queue.nowServingCode || '—'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.estWaitLabel}
                </span>
                {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK' ? (
                  <span className="text-xs font-bold text-status-emergency mt-1 block">
                    {t.slip.etaUnavailable}
                  </span>
                ) : (
                  <span className="font-token text-2xl font-black text-ink-primary mt-1 flex items-center gap-1.5">
                    <Clock className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>
                      {queue.estimatedWaitMinutes !== null &&
                      queue.estimatedWaitMinutes !== undefined
                        ? `~${queue.estimatedWaitMinutes} ${t.home.mins}`
                        : '—'}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-ink-secondary italic bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
              {t.slip.etaDisclaimer}
            </p>

            {/* Department & Destination Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-border-subtle bg-white space-y-1">
                <div className="flex items-center gap-2 text-brand-teal font-bold text-xs uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.slip.deptAndDoctor}</span>
                </div>
                <p className="text-lg font-extrabold text-ink-primary">{deptName}</p>
                <p className="text-sm font-medium text-ink-secondary">{docName}</p>
              </div>

              <div className="p-4 rounded-2xl border border-border-subtle bg-white space-y-1">
                <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.slip.destinationRoom}</span>
                </div>
                <p className="text-lg font-extrabold text-brand-primary">
                  {dept.room_label} · {floorLabel}
                </p>
                <p className="text-sm font-medium text-ink-secondary">{landmark}</p>
              </div>
            </div>

            {/* Checkpoint 5: Printable Step-by-Step Route Summary Respecting Avoid Stairs */}
            {slipRoute?.found && slipRoute.steps?.length > 0 && (
              <div
                data-testid="slip-printable-route-steps"
                className="p-4 rounded-2xl bg-subtle/80 border border-border-subtle space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>
                      {t.slip.printRouteHeading ||
                        'Step-by-Step Route from Ground Floor Registration Desk'}
                    </span>
                  </span>
                  <span className="font-token text-xs font-bold text-ink-secondary">
                    {slipRoute.totalDistanceMeters}m · ~
                    {Math.max(1, Math.round(slipRoute.estimatedWalkSeconds / 60))}{' '}
                    {t.home.mins}
                  </span>
                </div>
                <ol className="space-y-1.5 text-xs sm:text-sm text-ink-primary list-decimal list-inside">
                  {slipRoute.steps.map((step) => (
                    <li key={step.stepNumber} className="font-medium leading-snug">
                      {lang === 'hi'
                        ? step.instruction_hi
                        : lang === 'ta'
                        ? step.instruction_ta || step.instruction_en
                        : step.instruction_en}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Right Column: QR Code for Cross-Device Lookup */}
          <div className="print-qr-box flex flex-col items-center justify-center p-5 rounded-2xl bg-subtle border border-border-subtle text-center space-y-3">
            <span className="text-sm font-bold text-ink-primary">{t.slip.qrTitle}</span>
            <div className="bg-white p-4 rounded-2xl border border-border-strong shadow-sm">
              <QRCodeSVG
                value={qrValue}
                size={164}
                level="M"
                includeMargin={false}
                title={`OPD Token ${slip.publicCode}`}
              />
            </div>
            <span className="font-token text-sm font-bold text-brand-primary">
              {slip.publicCode}
            </span>
            <p className="text-xs text-ink-secondary max-w-[220px]">{t.slip.qrCaption}</p>
          </div>
        </div>

        {/* Action Bar (Hidden in Print) */}
        <div className="bg-subtle px-4 sm:px-6 py-4 border-t border-border-strong/70 space-y-3 no-print">
          {/* Primary Navigation & Queue Tracking Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                onOpenDirections({
                  fromNodeId: 'registration_desk',
                  toNodeId: dept.destination_node_id,
                  avoidStairs: Boolean(slip.avoidStairs ?? true)
                })
              }
              className="btn-teal w-full"
              data-testid="slip-directions-btn"
            >
              <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.slip.directionsBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenMyTurn(slip.publicCode)}
              className="btn-primary w-full"
              data-testid="slip-my-turn-btn"
            >
              <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.slip.trackTurnBtn}</span>
            </button>
          </div>

          {/* Utility & Slip Management Actions (2-col on mobile, flex on tablet+) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-border-strong/50">
            <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
              <button
                type="button"
                onClick={handleReadAloud}
                className="btn-secondary text-xs sm:text-sm px-3 py-2.5"
                data-testid="read-slip-aloud-btn"
              >
                {speaking ? (
                  <>
                    <VolumeX
                      className="w-4 h-4 sm:w-5 sm:h-5 text-status-emergency shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{t.slip.stopReadingBtn}</span>
                  </>
                ) : (
                  <>
                    <Volume2
                      className="w-4 h-4 sm:w-5 sm:h-5 text-brand-teal shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{t.slip.readAloudBtn}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-secondary text-xs sm:text-sm px-3 py-2.5"
                data-testid="print-slip-btn"
              >
                <Printer
                  className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{t.slip.printBtn}</span>
              </button>
            </div>

            <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
              {effectiveCanCancel &&
                ['WAITING', 'CALLED'].includes(slip.status) &&
                effectiveCancelHandler && (
                  <button
                    type="button"
                    onClick={handleCancelToken}
                    disabled={cancelling}
                    data-testid="cancel-slip-btn"
                    className="btn-danger text-xs sm:text-sm px-3 py-2.5"
                  >
                    <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {cancelling ? t.slip.cancellingTokenBtn : t.slip.cancelTokenBtn}
                    </span>
                  </button>
                )}

              {onRemoveSavedSlip && (
                <button
                  type="button"
                  onClick={() => onRemoveSavedSlip(slip.id || slip.publicCode)}
                  data-testid="remove-slip-local-btn"
                  className="btn-neutral text-xs sm:text-sm px-3 py-2.5"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.slip.removeFromDeviceBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
