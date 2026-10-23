import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Navigation,
  PhoneCall,
  Send,
  ShieldAlert,
  X
} from 'lucide-react';

export default function EmergencyModal({
  dialogRef,
  lang,
  t,
  nodes = [],
  activeSlip = null,
  onClose,
  onNavigateToEmergency
}) {
  const [locationLabel, setLocationLabel] = useState('Main Entrance & Ramp');
  const [requestType, setRequestType] = useState('URGENT_ASSESSMENT_REQUEST');
  const [submitting, setSubmitting] = useState(false);
  const [submittedFlag, setSubmittedFlag] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleHelpSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        locationLabel,
        requestType,
        ticketId: activeSlip?.id || null,
        publicCode: activeSlip?.publicCode || null,
        departmentId: activeSlip?.department?.id || null
      };

      const res = await fetch('/api/help-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Could not submit help request.');
      }

      setSubmittedFlag(data.helpRequest);
    } catch (err) {
      setErrorMsg(err.message || 'Network error while alerting staff.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="emergency-dialog-title"
      className="w-full max-w-2xl rounded-xl border-4 border-status-emergency bg-surface p-0 text-ink-primary shadow-2xl"
    >
      <div className="bg-status-emergency text-white px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 shrink-0" aria-hidden="true" />
          <h2 id="emergency-dialog-title" className="text-lg sm:text-xl font-bold">
            {t.emergency.modalTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target inline-flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-sm font-bold"
          aria-label={t.emergency.closeBtn}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
        {/* Critical Warning & Immediate Direction */}
        <div className="p-4 rounded-lg bg-red-50 border-2 border-status-emergency space-y-2">
          <div className="flex items-start gap-2.5 text-status-emergency font-bold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t.emergency.warningBanner}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-ink-primary">
            {t.emergency.casualtyDirection}
          </p>
        </div>

        {/* Direct Call & Route Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="tel:108"
            className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-status-emergency text-white font-bold px-4 py-3 text-center shadow-sm"
          >
            <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.emergency.call108}</span>
          </a>

          <a
            href="tel:112"
            className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-4 py-3 text-center shadow-sm"
          >
            <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.emergency.call112}</span>
          </a>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToEmergency();
            }}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-lg border-2 border-brand-teal bg-subtle text-brand-teal font-bold px-4 py-3 text-center"
          >
            <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.emergency.routeToEmergencyBtn}</span>
          </button>
        </div>

        {/* Pre-Registration Staff Help Request Form */}
        <div className="border-t-2 border-border-strong pt-4 space-y-3">
          <h3 className="font-bold text-base sm:text-lg text-ink-primary">
            {t.emergency.requestHelpHeading}
          </h3>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            {t.emergency.disclaimer}
          </p>

          {submittedFlag ? (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-lg bg-green-50 border-2 border-status-serving space-y-2"
            >
              <div className="flex items-center gap-2 text-status-serving font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{t.emergency.helpSentTitle}</span>
              </div>
              <p className="text-sm text-ink-primary">{t.emergency.helpSentDesc}</p>
              <div className="text-xs font-mono text-ink-secondary">
                Location: {submittedFlag.location_label} · Status: {submittedFlag.status}
              </div>
              <button
                type="button"
                onClick={() => setSubmittedFlag(null)}
                className="touch-target mt-2 px-4 py-2 rounded-lg border border-border-strong bg-surface text-xs font-bold"
              >
                Send Another Alert
              </button>
            </div>
          ) : (
            <form onSubmit={handleHelpSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="emergency-location-select"
                    className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                  >
                    {t.emergency.locationLabel}
                  </label>
                  <select
                    id="emergency-location-select"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3 py-2 text-sm font-medium"
                  >
                    {nodes.length > 0 ? (
                      nodes.map((node) => (
                        <option key={node.id} value={node.name_en}>
                          {lang === 'hi' ? `${node.name_hi} (${node.name_en})` : node.name_en}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Main Entrance & Ramp">Main Entrance & Ramp</option>
                        <option value="Registration & Help Desk">Registration & Help Desk</option>
                        <option value="Ground Floor Waiting Area">Ground Floor Waiting Area</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="emergency-type-select"
                    className="block text-xs sm:text-sm font-bold text-ink-primary mb-1"
                  >
                    {t.emergency.requestTypeLabel}
                  </label>
                  <select
                    id="emergency-type-select"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="touch-target w-full rounded-lg border-2 border-border-strong bg-surface px-3 py-2 text-sm font-medium"
                  >
                    <option value="URGENT_ASSESSMENT_REQUEST">{t.emergency.typeUrgent}</option>
                    <option value="STAFF_HELP">{t.emergency.typeMobility}</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-status-emergency text-status-emergency text-xs sm:text-sm font-semibold"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="touch-target inline-flex items-center gap-2 rounded-lg bg-status-emergency text-white font-bold px-5 py-2.5 text-sm shadow-sm disabled:opacity-60"
                >
                  <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {submitting ? t.emergency.sendingHelpBtn : t.emergency.sendHelpBtn}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="touch-target px-5 py-2.5 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold text-sm"
                >
                  {t.emergency.closeBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
