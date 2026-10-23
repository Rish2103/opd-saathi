import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Printer,
  QrCode,
  Stethoscope,
  UserPlus,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function SlipView({
  lang,
  t,
  slip,
  idempotentReplay = false,
  onOpenMyTurn,
  onOpenDirections,
  onRegisterNew
}) {
  const [speaking, setSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState(null);

  if (!slip) {
    return (
      <section className="bg-surface border-2 border-border-strong rounded-xl p-6 sm:p-8 shadow-card text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink-primary">
          {t.slip.noSlipTitle}
        </h2>
        <p className="text-sm sm:text-base text-ink-secondary max-w-xl mx-auto">
          {t.slip.noSlipDesc}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRegisterNew}
            className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-5 py-3 text-sm sm:text-base"
          >
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            <span>{t.slip.goRegister}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMyTurn('')}
            className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold px-5 py-3 text-sm sm:text-base"
          >
            <Activity className="w-5 h-5" aria-hidden="true" />
            <span>{t.slip.goLookup}</span>
          </button>
        </div>
      </section>
    );
  }

  const dept = slip.department || {};
  const queue = slip.queue || {};
  const deptName = lang === 'hi' ? dept.name_hi : dept.name_en;
  const doctorName = lang === 'hi' ? dept.doctor_name_hi : dept.doctor_name_en;
  const landmark = lang === 'hi' ? dept.landmark_hi : dept.landmark_en;
  const floorLabel = t.floors[dept.floor_number] || `Floor ${dept.floor_number}`;
  const statusText = t.statuses[slip.status] || slip.status;
  const docStatusText = t.doctorStatuses[queue.doctorStatus] || queue.doctorStatus;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${origin}/my-turn?code=${encodeURIComponent(
    slip.publicCode
  )}`;

  function handleReadAloud() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechNotice(
        lang === 'hi'
          ? 'इस ब्राउज़र में ऑडियो सुविधा उपलब्ध नहीं है।'
          : 'Audio read-aloud is not supported in this browser.'
      );
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const firstStep =
      slip.route?.steps?.[0]?.[lang === 'hi' ? 'instruction_hi' : 'instruction_en'] || '';

    const textToRead =
      lang === 'hi'
        ? `आपका ओपीडी टोकन नंबर ${slip.publicCode} है। विभाग: ${deptName}। डॉक्टर: ${doctorName}। कमरा: ${dept.room_label}, ${floorLabel}, ${landmark}। वर्तमान स्थिति: ${statusText}। आपसे आगे प्रतीक्षा कर रहे मरीज: ${queue.peopleAheadWaiting ?? 0}। ${firstStep}`
        : `Your OPD token number is ${slip.publicCode}. Department: ${deptName}. Doctor: ${doctorName}. Destination: ${dept.room_label}, ${floorLabel}, ${landmark}. Current status: ${statusText}. Patients waiting ahead of you: ${queue.peopleAheadWaiting ?? 0}. ${firstStep}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    setSpeechNotice(null);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section
      aria-labelledby="slip-heading"
      className="bg-surface border-2 border-border-strong rounded-xl p-5 sm:p-7 shadow-card space-y-6"
    >
      {/* Top Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border-strong pb-4">
        <div>
          <h2 id="slip-heading" className="text-xl sm:text-2xl font-bold text-ink-primary">
            {t.slip.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Queue Date (IST): <span className="font-token font-bold">{slip.queueDate}</span> ·{' '}
            {t.visitTypes[slip.visitType] || slip.visitType}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReadAloud}
            className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold px-3.5 py-2 text-xs sm:text-sm"
          >
            {speaking ? (
              <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{speaking ? t.slip.stopReadingBtn : t.slip.readAloudBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-3.5 py-2 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.slip.printBtn}</span>
          </button>
        </div>
      </div>

      {speechNotice && (
        <div className="no-print p-3 rounded-lg bg-subtle border border-border-strong text-xs font-semibold text-ink-secondary">
          {speechNotice}
        </div>
      )}

      {idempotentReplay && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-green-50 border-2 border-status-serving text-status-serving font-bold text-xs sm:text-sm flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{t.slip.recoveredBadge}</span>
        </div>
      )}

      {/* Prominent Token Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2 bg-brand-primary text-white rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t.slip.tokenLabel}
              </div>
              <div
                data-testid="slip-public-code"
                className="font-token text-4xl sm:text-5xl font-bold tracking-wider mt-1"
              >
                {slip.publicCode}
              </div>
            </div>

            <div className="bg-white/15 border border-white/25 rounded-lg px-3.5 py-2 text-right">
              <div className="text-[11px] uppercase text-slate-200 font-semibold">
                {t.slip.statusLabel}
              </div>
              <div
                data-testid="slip-status-badge"
                className="font-bold text-sm sm:text-base text-white mt-0.5"
              >
                {statusText}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/20 text-sm">
            <div>
              <div className="text-xs text-slate-300 font-medium">{t.slip.deptAndDoctor}</div>
              <div className="font-bold text-base mt-0.5">{deptName}</div>
              <div className="flex items-center gap-1.5 text-slate-200 text-xs mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{doctorName}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-300 font-medium">{t.slip.destinationRoom}</div>
              <div className="font-token font-bold text-base mt-0.5">
                {dept.room_label} · {floorLabel}
              </div>
              <div className="flex items-center gap-1.5 text-slate-200 text-xs mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{landmark}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Non-Secret QR Code Card */}
        <div className="bg-subtle border-2 border-border-strong rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink-primary">
            <QrCode className="w-4 h-4 text-brand-teal" aria-hidden="true" />
            <span>{t.slip.qrTitle}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-border-strong shadow-sm">
            <QRCodeSVG value={qrUrl} size={132} level="M" includeMargin={false} />
          </div>
          <div className="font-token text-xs font-bold text-brand-primary">
            /my-turn?code={slip.publicCode}
          </div>
          <p className="text-[11px] text-ink-muted max-w-xs">{t.slip.qrCaption}</p>
        </div>
      </div>

      {/* Live Queue Position & Clearly Labelled Estimated Wait */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
          <div className="text-xs font-bold uppercase text-ink-muted">
            {t.slip.peopleAhead}
          </div>
          <div
            data-testid="slip-people-ahead"
            className="font-token text-2xl sm:text-3xl font-bold text-ink-primary mt-1"
          >
            {queue.peopleAheadWaiting ?? 0}
          </div>
          <div className="text-xs text-ink-secondary mt-1">{docStatusText}</div>
        </div>

        <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
          <div className="text-xs font-bold uppercase text-ink-muted">
            {t.slip.nowServing}
          </div>
          <div className="font-token text-2xl sm:text-3xl font-bold text-status-serving mt-1">
            {queue.nowServingCode || t.home.noActiveToken}
          </div>
          <div className="text-xs text-ink-secondary mt-1">
            {dept.room_label} ({floorLabel})
          </div>
        </div>

        <div className="p-4 rounded-xl bg-canvas border-2 border-border-strong">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-ink-muted">
            <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
            <span>{t.slip.estWaitLabel}</span>
          </div>
          <div className="font-token text-2xl sm:text-3xl font-bold text-brand-teal mt-1">
            {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK'
              ? '—'
              : queue.estimatedWaitMinutes !== null && queue.estimatedWaitMinutes !== undefined
                ? `~${queue.estimatedWaitMinutes} ${t.home.mins}`
                : '—'}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            {queue.etaStatus === 'UNAVAILABLE_ASK_HELP_DESK'
              ? t.slip.etaUnavailable
              : t.slip.etaDisclaimer}
          </div>
        </div>
      </div>

      {/* Quick Route Summary on Slip */}
      {slip.route?.found && (
        <div className="p-4 rounded-xl bg-subtle border-2 border-border-strong space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm sm:text-base text-ink-primary flex items-center gap-2">
              <Navigation className="w-4 h-4 text-brand-teal" aria-hidden="true" />
              <span>
                {lang === 'hi'
                  ? `पंजीकरण काउंटर से ${dept.room_label} तक का सुगम रास्ता`
                  : `Route from Registration Desk to ${dept.room_label}`}
              </span>
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-surface border border-border-strong">
              {slip.avoidStairs
                ? lang === 'hi'
                  ? 'लिफ्ट / रैंप (बिना सीढ़ी)'
                  : 'Lift / Ramp Only (No Stairs)'
                : lang === 'hi'
                  ? 'मानक मार्ग'
                  : 'Standard Route'}
            </span>
          </div>

          <ol className="space-y-1.5 text-xs sm:text-sm text-ink-primary list-decimal list-inside">
            {slip.route.steps.map((step) => (
              <li key={step.stepNumber} className="leading-relaxed">
                <span className="font-medium">
                  {lang === 'hi' ? step.instruction_hi : step.instruction_en}
                </span>{' '}
                <span className="text-ink-muted font-mono text-xs">
                  ({step.distanceMeters}m)
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-strong">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenMyTurn(slip.publicCode)}
            className="touch-target inline-flex items-center gap-2 rounded-lg bg-brand-teal text-white font-bold px-5 py-3 text-sm sm:text-base shadow-sm"
          >
            <Activity className="w-5 h-5" aria-hidden="true" />
            <span>{t.slip.trackTurnBtn}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenDirections({
                fromNodeId: 'registration_desk',
                toNodeId: dept.destination_node_id,
                avoidStairs: slip.avoidStairs
              })
            }
            className="touch-target inline-flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-surface text-brand-primary font-bold px-5 py-3 text-sm sm:text-base"
          >
            <Navigation className="w-5 h-5" aria-hidden="true" />
            <span>{t.slip.directionsBtn}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRegisterNew}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border-strong bg-subtle text-ink-secondary font-bold px-4 py-2.5 text-xs sm:text-sm"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          <span>{t.slip.newRegBtn}</span>
        </button>
      </div>
    </section>
  );
}
