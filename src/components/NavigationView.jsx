import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  Clock,
  Layers,
  MapPin,
  Navigation,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  findAccessibleRoute,
  getAllHospitalNodes
} from '../../shared/navigation/pathfinder.js';

export default function NavigationView({
  lang,
  t,
  nodes: propNodes = [],
  routeQuery = {
    fromNodeId: 'registration_desk',
    toNodeId: 'room_204_med',
    avoidStairs: true
  },
  setRouteQuery = () => {}
}) {
  const nodes = propNodes.length > 0 ? propNodes : getAllHospitalNodes();
  const computedLocalRoute = useMemo(
    () =>
      findAccessibleRoute({
        fromNodeId: routeQuery.fromNodeId || 'registration_desk',
        toNodeId: routeQuery.toNodeId || 'room_204_med',
        avoidStairs: Boolean(routeQuery.avoidStairs)
      }),
    [routeQuery.fromNodeId, routeQuery.toNodeId, routeQuery.avoidStairs]
  );

  const [apiRouteResult, setApiRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const routeResult = apiRouteResult || computedLocalRoute;

  useEffect(() => {
    let active = true;
    async function loadRoute() {
      if (!routeQuery.toNodeId || typeof fetch === 'undefined') return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: routeQuery.fromNodeId || 'registration_desk',
          to: routeQuery.toNodeId,
          avoidStairs: String(Boolean(routeQuery.avoidStairs))
        });
        const res = await fetch(`/api/routes?${params.toString()}`, {
          headers: { Accept: 'application/json' }
        });
        const data = await res.json();
        if (active && data.route) {
          setApiRouteResult(data.route);
        }
      } catch {
        // Offline / local computed route retained
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRoute();
    return () => {
      active = false;
    };
  }, [routeQuery.fromNodeId, routeQuery.toNodeId, routeQuery.avoidStairs]);

  function handleReadDirections() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !routeResult?.steps) {
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const stepsText = routeResult.steps
      .map(
        (step) =>
          `${lang === 'hi' ? 'चरण' : 'Step'} ${step.stepNumber}: ${
            lang === 'hi' ? step.instruction_hi : step.instruction_en
          }`
      )
      .join(' ');

    const utterance = new SpeechSynthesisUtterance(stepsText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const quickDestinations = [
    { id: 'room_204_med', label_en: 'Rm 204 General Med (F2)', label_hi: 'कमरा 204 सामान्य चिकित्सा' },
    { id: 'room_208_ped', label_en: 'Rm 208 Paediatrics (F2)', label_hi: 'कमरा 208 बाल रोग' },
    { id: 'room_302_ort', label_en: 'Rm 302 Orthopaedics (F3)', label_hi: 'कमरा 302 हड्डी रोग' },
    { id: 'room_305_eye', label_en: 'Rm 305 Eye OPD (F3)', label_hi: 'कमरा 305 नेत्र रोग' },
    { id: 'pharmacy_f1', label_en: 'Pharmacy Counter 4 (F1)', label_hi: 'फार्मेसी काउंटर 4 (भूतल)' },
    { id: 'lab_f2', label_en: 'Rm 212 Pathology Lab (F2)', label_hi: 'कमरा 212 पैथोलॉजी लैब' },
    { id: 'emergency_casualty', label_en: 'Rm 101 Emergency (F1)', label_hi: 'कमरा 101 आपातकालीन' }
  ];

  return (
    <section
      aria-labelledby="navigate-heading"
      className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-7 shadow-card space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="space-y-1">
          <h2 id="navigate-heading" className="text-xl sm:text-2xl font-extrabold text-ink-primary tracking-tight">
            {t.navigate.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.navigate.subtitle}</p>
        </div>

        {routeResult?.found && (
          <button
            type="button"
            onClick={handleReadDirections}
            className="btn-secondary px-4 py-2 text-xs sm:text-sm"
          >
            {speaking ? (
              <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {speaking ? t.slip.stopReadingBtn : t.navigate.readRouteBtn}
            </span>
          </button>
        )}
      </div>

      {/* Quick Destination Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2">
        {quickDestinations.map((dest) => {
          const isSelected = routeQuery.toNodeId === dest.id;
          return (
            <button
              key={dest.id}
              type="button"
              onClick={() =>
                setRouteQuery((prev) => ({
                  ...prev,
                  toNodeId: dest.id
                }))
              }
              className={`touch-target px-3.5 py-2 rounded-xl text-xs font-bold border transition-all text-left lg:text-center ${
                isSelected
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-canvas text-ink-primary border-border-subtle hover:border-brand-teal/50 hover:bg-subtle'
              }`}
            >
              {lang === 'hi' ? dest.label_hi : dest.label_en}
            </button>
          );
        })}
      </div>

      {/* Origin, Destination & Avoid Stairs Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-subtle/80 border border-border-subtle space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="nav-from-select"
              className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
            >
              {t.navigate.fromLabel}
            </label>
            <select
              id="nav-from-select"
              value={routeQuery.fromNodeId}
              onChange={(e) =>
                setRouteQuery((prev) => ({ ...prev, fromNodeId: e.target.value }))
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  [F{node.floor}] {lang === 'hi' ? node.name_hi : node.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="nav-to-select"
              className="block text-xs sm:text-sm font-bold text-ink-primary mb-1.5"
            >
              {t.navigate.toLabel}
            </label>
            <select
              id="nav-to-select"
              value={routeQuery.toNodeId}
              onChange={(e) =>
                setRouteQuery((prev) => ({ ...prev, toNodeId: e.target.value }))
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  [F{node.floor}] {lang === 'hi' ? node.name_hi : node.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Avoid Stairs Accessibility Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(routeQuery.avoidStairs)}
              onChange={(e) =>
                setRouteQuery((prev) => ({ ...prev, avoidStairs: e.target.checked }))
              }
              className="w-5 h-5 accent-brand-teal rounded"
            />
            <span className="font-bold text-sm sm:text-base text-ink-primary flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
              <span>{t.navigate.avoidStairsToggle}</span>
            </span>
          </label>

          <span className="text-xs font-semibold text-ink-secondary px-2.5 py-1 rounded-full bg-surface border border-border-subtle">
            {routeQuery.avoidStairs
              ? t.navigate.liftOnlyNote
              : t.navigate.stairsAllowedNote}
          </span>
        </div>
      </div>

      {/* Route Summary & Step-by-Step Cards */}
      {loading && (
        <div className="p-6 text-center font-semibold text-sm text-ink-secondary">
          Computing optimal hospital route…
        </div>
      )}

      {!loading && routeResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {t.navigate.distanceLabel}
              </div>
              <div className="font-token text-xl sm:text-2xl font-extrabold text-ink-primary mt-1">
                {routeResult.totalDistanceMeters} {t.navigate.meters}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                <span>{t.navigate.walkTimeLabel}</span>
              </div>
              <div className="font-token text-xl sm:text-2xl font-extrabold text-brand-teal mt-1">
                ~{Math.max(1, Math.round(routeResult.estimatedWalkSeconds / 60))}{' '}
                {t.home.mins} ({routeResult.estimatedWalkSeconds} {t.navigate.seconds})
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Layers className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
                <span>{t.navigate.floorsLabel}</span>
              </div>
              <div className="font-token text-xl sm:text-2xl font-extrabold text-brand-primary mt-1">
                {routeResult.floorsTraversed?.map((f) => `F${f}`).join(' → ') || 'F1'}
              </div>
            </div>
          </div>

          {routeResult.found ? (
            <ol data-testid="route-steps-list" className="space-y-3">
              {routeResult.steps.map((step) => (
                <li
                  key={step.stepNumber}
                  className="p-4 sm:p-5 rounded-2xl bg-canvas border border-border-subtle hover:border-brand-teal/40 transition-colors flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-primary text-white font-token font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-surface text-brand-primary border border-border-subtle">
                        <Navigation className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                        <span>
                          {step.mode.toUpperCase()} · {t.floors[step.floor] || `Floor ${step.floor}`}
                        </span>
                      </span>
                      <span className="font-token text-xs font-bold text-ink-muted">
                        {step.distanceMeters}m · ~{step.durationSeconds}s
                      </span>
                    </div>

                    <p className="font-bold text-sm sm:text-base text-ink-primary leading-relaxed">
                      {lang === 'hi' ? step.instruction_hi : step.instruction_en}
                    </p>

                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary bg-surface px-2.5 py-1 rounded-lg border border-border-subtle">
                      <MapPin className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                      <span>
                        Landmark: {lang === 'hi' ? step.landmark_hi : step.landmark_en}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50 border border-status-next text-ink-primary font-semibold text-sm">
              {lang === 'hi'
                ? routeResult.fallbackMessage_hi
                : routeResult.fallbackMessage_en}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
