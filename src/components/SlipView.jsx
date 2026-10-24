import React, { useState } from 'react';
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

  const renderSavedSlipsSwitcher = () => {
    if (!savedSlips || savedSlips.length === 0) {
      return null;
    }

    return (
      <section
        aria-label={t.slip.mySlipsSwitcherTitle}
        data-testid="my-slips-switcher"
        className="card-surface p-5 border-2 border-brand-primary/20 no-print"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-primary" aria-hidden="true" />
            <h3 className="text-lg font-extrabold text-brand-primary">
              {t.slip.mySlipsSwitcherTitle} ({savedSlips.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onRegisterNew}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal hover:bg-brand-tealHover text-white font-bold px-4 py-2 text-xs sm:text-sm border-2 border-brand-teal shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.slip.newRegBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedSlips.map((entry) => {
            const isSelected = slip && entry.ticketId === slip.id;
            const entrySlip = entry.ticket || {};
            const deptName =
              lang === 'hi'
                ? entry.departmentName_hi || entrySlip.department?.name_hi || entry.departmentName_en
                : entry.departmentName_en || entrySlip.department?.name_en;
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
                className={`rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-brand-primary bg-blue-50/70 shadow-sm'
                    : 'border-border-subtle bg-subtle hover:border-brand-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-lg font-black text-brand-primary block">
                      {entry.publicCode}
                    </span>
                    <span className="text-xs font-bold text-ink-primary block">
                      {deptName}
                    </span>
                    {patientName && (
                      <span className="text-xs text-ink-secondary block mt-0.5">
                        {patientName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tag.className}`}
                    >
                      {tag.label} · {t.statuses?.[status] || status}
                    </span>
                    <span className="text-[11px] text-ink-muted font-medium">
                      {entry.roomLabel || entrySlip.department?.room_label || ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border-subtle">
                  {onSelectSavedSlip && (
                    <button
                      type="button"
                      data-testid={`open-saved-slip-${entry.publicCode}`}
                      onClick={() => onSelectSavedSlip(entry)}
                      className={`touch-target inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border-2 transition-colors ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                          : 'bg-surface text-brand-primary border-brand-primary hover:bg-blue-50'
                      }`}
                    >
                      {isSelected
                        ? lang === 'hi'
                          ? 'अभी खुली है'
                          : 'Currently Viewing'
                        : lang === 'hi'
                          ? 'पर्ची खोलें'
                          : 'Open Slip'}
                    </button>
                  )}

                  {onRemoveSavedSlip && (
                    <button
                      type="button"
                      data-testid={`remove-saved-slip-${entry.publicCode}`}
                      onClick={() => onRemoveSavedSlip(entry.ticketId || entry.publicCode)}
                      title={t.slip.removeFromDeviceBtn}
                      className="touch-target px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border-2 border-border-strong bg-surface text-ink-secondary hover:text-status-emergency hover:border-status-emergency hover:bg-red-50 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t.slip.removeFromDeviceBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-ink-secondary mt-3 flex items-start gap-1.5 bg-subtle p-2.5 rounded-lg border border-border-subtle">
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

  const dept = slip.department || {};
  const queue = slip.queue || {};
  const patientSummary = slip.patientSummary || null;
  const deptName = lang === 'hi' ? dept.name_hi : dept.name_en;
  const docName = lang === 'hi' ? dept.doctor_name_hi : dept.doctor_name_en;
  const landmark = lang === 'hi' ? dept.landmark_hi : dept.landmark_en;
  const floorLabel = t.floors[dept.floor_number] || `Floor ${dept.floor_number}`;

  // QR contains only the safe public lookup URL or publicCode, never accessToken
  const qrValue =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?code=${encodeURIComponent(slip.publicCode)}`
      : `/my-turn?code=${encodeURIComponent(slip.publicCode)}`;

  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
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
        : `Your OPD token number is ${slip.publicCode}. Department: ${dept.name_en}. Doctor: ${dept.doctor_name_en}. Proceed to ${dept.room_label} on ${floorLabel}, ${dept.landmark_en}. People waiting ahead of you: ${queue.peopleAheadWaiting ?? 0}.`;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
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
        className="card-surface overflow-hidden border-2 border-brand-primary"
      >
        {/* Top Banner */}
        <div className="bg-brand-primary text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <span className="inline-flex items-center gap-1.5 mt-2 bg-teal-800 text-teal-100 text-xs font-semibold px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {t.slip.recoveredBadge}
              </span>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-xs uppercase tracking-wider text-blue-200">
              {t.slip.statusLabel}
            </span>
            <span
              data-testid="slip-status-badge"
              className={`px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wide ${
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

        {/* Body Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Clinical & Queue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Protected Patient Identity Summary (Visible on Holder's Device Only) */}
            {patientSummary && (
              <div
                data-testid="slip-patient-summary"
                className="p-4 rounded-xl bg-blue-50/70 border border-brand-primary/25 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-teal" aria-hidden="true" />
                    {t.slip.patientSummaryTitle}
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
                    <span className="font-mono font-bold text-ink-primary">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.peopleAhead}
                </span>
                <span
                  data-testid="slip-people-ahead"
                  className="text-3xl font-black text-brand-primary mt-1 block"
                >
                  {queue.peopleAheadWaiting ?? 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.nowServing}
                </span>
                <span className="text-2xl font-black text-status-serving font-mono mt-1 block">
                  {queue.nowServingCode || '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-xs font-bold uppercase text-ink-secondary block">
                  {t.slip.estWaitLabel}
                </span>
                {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK' ? (
                  <span className="text-xs font-bold text-status-emergency mt-1 block">
                    {t.slip.etaUnavailable}
                  </span>
                ) : (
                  <span className="text-2xl font-black text-ink-primary mt-1 flex items-center gap-1.5">
                    <Clock className="w-5 h-5 text-brand-teal" aria-hidden="true" />
                    {queue.estimatedWaitMinutes !== null &&
                    queue.estimatedWaitMinutes !== undefined
                      ? `~${queue.estimatedWaitMinutes} ${t.home.mins}`
                      : '—'}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-ink-secondary italic bg-amber-50/70 border border-amber-200 p-3 rounded-lg">
              {t.slip.etaDisclaimer}
            </p>

            {/* Department & Destination Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-white space-y-1">
                <div className="flex items-center gap-2 text-brand-teal font-bold text-xs uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4" aria-hidden="true" />
                  {t.slip.deptAndDoctor}
                </div>
                <p className="text-lg font-extrabold text-ink-primary">{deptName}</p>
                <p className="text-sm font-medium text-ink-secondary">{docName}</p>
              </div>

              <div className="p-4 rounded-xl border border-border-subtle bg-white space-y-1">
                <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {t.slip.destinationRoom}
                </div>
                <p className="text-lg font-extrabold text-brand-primary">
                  {dept.room_label} · {floorLabel}
                </p>
                <p className="text-sm font-medium text-ink-secondary">{landmark}</p>
              </div>
            </div>
          </div>

          {/* Right Column: QR Code for Cross-Device Lookup */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-subtle border border-border-subtle text-center space-y-3">
            <span className="text-sm font-bold text-ink-primary">{t.slip.qrTitle}</span>
            <div className="bg-white p-4 rounded-xl border border-border-strong shadow-sm">
              <QRCodeSVG
                value={qrValue}
                size={164}
                level="M"
                includeMargin={false}
                title={`OPD Token ${slip.publicCode}`}
              />
            </div>
            <span className="font-mono text-sm font-bold text-brand-primary">
              {slip.publicCode}
            </span>
            <p className="text-xs text-ink-secondary max-w-[220px]">{t.slip.qrCaption}</p>
          </div>
        </div>

        {/* Action Bar (Hidden in Print) */}
        <div className="bg-subtle px-5 sm:px-6 py-4 border-t-2 border-border-strong space-y-3 no-print">
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

          {/* Utility & Slip Management Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-strong/60">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleReadAloud}
                className="btn-secondary"
                data-testid="read-slip-aloud-btn"
              >
                {speaking ? (
                  <>
                    <VolumeX className="w-5 h-5 text-status-emergency shrink-0" aria-hidden="true" />
                    <span>{t.slip.stopReadingBtn}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>{t.slip.readAloudBtn}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-secondary"
                data-testid="print-slip-btn"
              >
                <Printer className="w-5 h-5 text-brand-primary shrink-0" aria-hidden="true" />
                <span>{t.slip.printBtn}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {effectiveCanCancel &&
                ['WAITING', 'CALLED'].includes(slip.status) &&
                effectiveCancelHandler && (
                  <button
                    type="button"
                    onClick={handleCancelToken}
                    disabled={cancelling}
                    data-testid="cancel-slip-btn"
                    className="btn-danger"
                  >
                    <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {cancelling ? t.slip.cancellingTokenBtn : t.slip.cancelTokenBtn}
                    </span>
                  </button>
                )}

              {onRemoveSavedSlip && (
                <button
                  type="button"
                  onClick={() => onRemoveSavedSlip(slip.id || slip.publicCode)}
                  data-testid="remove-slip-local-btn"
                  className="btn-neutral"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.slip.removeFromDeviceBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
