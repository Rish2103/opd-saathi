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
      className="w-[calc(100%-1.5rem)] sm:w-full max-w-2xl rounded-2xl border-2 border-status-emergency bg-surface p-0 text-ink-primary shadow-2xl overflow-hidden"
    >
      <div className="bg-status-emergency text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden="true" />
          </div>
          <h2 id="emergency-dialog-title" className="text-base sm:text-xl font-extrabold truncate">
            {t.emergency.modalTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target inline-flex items-center justify-center gap-1 rounded-xl bg-[#8f1515] hover:bg-[#731010] border border-white/40 text-white px-3 py-1.5 text-xs sm:text-sm font-bold shrink-0"
          aria-label={t.emergency.closeBtn}
        >
          <X className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.emergency.closeBtn}</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        {/* Critical Warning & Immediate Direction */}
        <div className="p-4 rounded-2xl bg-red-50 border border-status-emergency space-y-2">
          <div className="flex items-start gap-2.5 text-status-emergency font-extrabold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t.emergency.warningBanner}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-ink-primary">
            {t.emergency.casualtyDirection}
          </p>
        </div>

        {/* Direct Call & Route Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href="tel:108"
            className="btn-danger px-4 py-3 text-center text-sm"
          >
            <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.emergency.call108}</span>
          </a>

          <a
            href="tel:112"
            className="btn-primary px-4 py-3 text-center text-sm"
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
            className="btn-secondary border-brand-teal text-brand-teal px-4 py-3 text-center text-sm"
          >
            <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t.emergency.routeToEmergencyBtn}</span>
          </button>
        </div>

        {/* Pre-Registration Staff Help Request Form */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <h3 className="font-extrabold text-base sm:text-lg text-ink-primary">
            {t.emergency.requestHelpHeading}
          </h3>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            {t.emergency.disclaimer}
          </p>

          {submittedFlag ? (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-2xl bg-emerald-50 border border-status-serving space-y-2.5"
            >
              <div className="flex items-center gap-2 text-status-serving font-extrabold">
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
                className="btn-secondary mt-2 px-4 py-2 text-xs"
              >
                Send Another Alert
              </button>
            </div>
          ) : (
            <form onSubmit={handleHelpSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="emergency-location-select"
                    className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
                  >
                    {t.emergency.locationLabel}
                  </label>
                  <select
                    id="emergency-location-select"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
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
                    className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
                  >
                    {t.emergency.requestTypeLabel}
                  </label>
                  <select
                    id="emergency-type-select"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
                  >
                    <option value="URGENT_ASSESSMENT_REQUEST">{t.emergency.typeUrgent}</option>
                    <option value="STAFF_HELP">{t.emergency.typeMobility}</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-status-emergency text-status-emergency text-xs sm:text-sm font-bold"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-danger w-full sm:w-auto px-5 py-2.5 text-sm"
                >
                  <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {submitting ? t.emergency.sendingHelpBtn : t.emergency.sendHelpBtn}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary w-full sm:w-auto px-5 py-2.5 text-sm"
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
