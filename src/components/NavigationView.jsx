import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Info,
  Layers,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Play,
  Plus,
  RotateCcw,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  findAccessibleRoute,
  getAllHospitalEdges,
  getAllHospitalNodes,
  getHospitalFloors
} from '../../shared/navigation/pathfinder.js';
import { getSpeechCapabilities } from '../utils/soundAlerts.js';
import VoiceListenButton from './VoiceListenButton.jsx';

function getNodeName(node, lang) {
  if (!node) return '';
  if (lang === 'hi') return node.name_hi || node.name_en;
  if (lang === 'ta') return node.name_ta || node.name_en;
  return node.name_en;
}

function getNodeShort(node, lang) {
  if (!node) return '';
  if (lang === 'hi') return node.short_hi || node.short_en || node.name_hi;
  if (lang === 'ta') return node.short_ta || node.short_en || node.name_ta || node.name_en;
  return node.short_en || node.name_en;
}

function getNodeLandmark(node, lang) {
  if (!node) return '';
  if (lang === 'hi') return node.landmark_hi || node.landmark_en;
  if (lang === 'ta') return node.landmark_ta || node.landmark_en;
  return node.landmark_en;
}

function getStepInstruction(step, lang) {
  if (!step) return '';
  if (lang === 'hi') return step.instruction_hi || step.instruction_en;
  if (lang === 'ta') return step.instruction_ta || step.instruction_en;
  return step.instruction_en;
}

function getStepLandmark(step, lang) {
  if (!step) return '';
  if (lang === 'hi') return step.landmark_hi || step.landmark_en;
  if (lang === 'ta') return step.landmark_ta || step.landmark_en;
  return step.landmark_en;
}

const FLOOR_WING_BLUEPRINTS = {
  1: [
    {
      id: 'f1-west',
      x: 42,
      y: 56,
      w: 185,
      h: 344,
      title_en: 'MAIN ENTRANCE & RAMP BAY',
      title_hi: 'मुख्य प्रवेश एवं रैंप ज़ोन',
      title_ta: 'பிரதான வாயில் & சாய்வுதளம்',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    },
    {
      id: 'f1-central',
      x: 238,
      y: 56,
      w: 230,
      h: 344,
      title_en: 'ATRIUM · TRIAGE & WAITING',
      title_hi: 'केंद्रीय हॉल · पंजीकरण व प्रतीक्षालय',
      title_ta: 'மத்திய கூடம் · பதிவு & காத்திருப்பு',
      fill: '#F8FAFC',
      stroke: '#CBD5E1'
    },
    {
      id: 'f1-east',
      x: 480,
      y: 56,
      w: 400,
      h: 344,
      title_en: 'PHARMACY & VERTICAL TRANSIT CORE',
      title_hi: 'फार्मेसी एवं लिफ्ट / सीढ़ी कोर',
      title_ta: 'மருந்தகம் & லிஃப்ட் / படிக்கட்டு',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    }
  ],
  2: [
    {
      id: 'f2-west',
      x: 42,
      y: 56,
      w: 280,
      h: 344,
      title_en: 'WEST CLINICAL WING (OPD 204 & 208)',
      title_hi: 'पश्चिमी ओपीडी विंग (कमरा 204 व 208)',
      title_ta: 'மேற்கு ஓபிடி பிரிவு (அறை 204 & 208)',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    },
    {
      id: 'f2-central',
      x: 334,
      y: 56,
      w: 215,
      h: 344,
      title_en: 'CENTRAL WAITING & PATHOLOGY LAB',
      title_hi: 'प्रतीक्षालय एवं पैथोलॉजी लैब',
      title_ta: 'காத்திருப்பு கூடம் & இரத்தப் பரிசோதனை',
      fill: '#F8FAFC',
      stroke: '#CBD5E1'
    },
    {
      id: 'f2-east',
      x: 560,
      y: 56,
      w: 320,
      h: 344,
      title_en: 'RADIOLOGY & LIFT / STAIR CORE',
      title_hi: 'एक्स-रे एवं लिफ्ट / सीढ़ी कोर',
      title_ta: 'எக்ஸ்-ரே & லிஃப்ட் / படிக்கட்டு',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    }
  ],
  3: [
    {
      id: 'f3-west',
      x: 42,
      y: 56,
      w: 280,
      h: 344,
      title_en: 'SPECIALTY OPD WING (RM 302 & 305)',
      title_hi: 'विशेषज्ञ ओपीडी विंग (कमरा 302 व 305)',
      title_ta: 'சிறப்பு ஓபிடி பிரிவு (அறை 302 & 305)',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    },
    {
      id: 'f3-central',
      x: 334,
      y: 56,
      w: 215,
      h: 344,
      title_en: 'FLOOR 3 WAITING & OPTOMETRY HALL',
      title_hi: 'तल 3 प्रतीक्षालय एवं नेत्र जांच हॉल',
      title_ta: 'தளம் 3 காத்திருப்பு கூடம்',
      fill: '#F8FAFC',
      stroke: '#CBD5E1'
    },
    {
      id: 'f3-east',
      x: 560,
      y: 56,
      w: 320,
      h: 344,
      title_en: 'VERTICAL TRANSIT CORE (LIFT & STAIRS)',
      title_hi: 'लिफ्ट एवं सीढ़ी ट्रांजिट कोर',
      title_ta: 'லிஃப்ட் & படிக்கட்டு மையம்',
      fill: '#F1F5F9',
      stroke: '#CBD5E1'
    }
  ]
};

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
  const canonicalNodes = useMemo(() => getAllHospitalNodes(), []);
  const canonicalEdges = useMemo(() => getAllHospitalEdges(), []);
  const canonicalFloors = useMemo(() => getHospitalFloors(), []);

  // Merge coordinate metadata from canonical graph in case propNodes came from a slim API payload
  const nodes = useMemo(() => {
    const baseList = propNodes.length > 0 ? propNodes : canonicalNodes;
    const canonicalById = new Map(canonicalNodes.map((n) => [n.id, n]));
    return baseList.map((n) => ({
      ...(canonicalById.get(n.id) || {}),
      ...n,
      x: n.x ?? canonicalById.get(n.id)?.x ?? 460,
      y: n.y ?? canonicalById.get(n.id)?.y ?? 220
    }));
  }, [propNodes, canonicalNodes]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

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
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const startNode = nodeMap.get(routeQuery.fromNodeId || 'registration_desk');
    return startNode?.floor || 1;
  });
  const [inspectedNodeId, setInspectedNodeId] = useState(
    routeQuery.toNodeId || 'room_204_med'
  );
  const [speechNotice, setSpeechNotice] = useState('');

  // Interactive Leaflet-style Zoom & Pan state for the schematic floor map
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);

  // Prefer local computed route when avoidStairs or nodes change immediately so UI never lags
  const routeResult = useMemo(() => {
    if (
      apiRouteResult &&
      apiRouteResult.fromNode?.id === (routeQuery.fromNodeId || 'registration_desk') &&
      apiRouteResult.toNode?.id === (routeQuery.toNodeId || 'room_204_med') &&
      Boolean(apiRouteResult.avoidStairs) === Boolean(routeQuery.avoidStairs)
    ) {
      return {
        ...computedLocalRoute,
        ...apiRouteResult,
        steps: computedLocalRoute.steps
      };
    }
    return computedLocalRoute;
  }, [apiRouteResult, computedLocalRoute, routeQuery.fromNodeId, routeQuery.toNodeId, routeQuery.avoidStairs]);

  // Reset active step & sync inspected node when route endpoints change
  useEffect(() => {
    setActiveStepIndex(0);
    setInspectedNodeId(routeQuery.toNodeId || 'room_204_med');
    const originFloor = nodeMap.get(routeQuery.fromNodeId || 'registration_desk')?.floor || 1;
    setSelectedFloor(originFloor);
    setMapPan({ x: 0, y: 0 });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [routeQuery.fromNodeId, routeQuery.toNodeId, routeQuery.avoidStairs, nodeMap]);

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

  const totalSteps = routeResult?.steps?.length || 0;
  const boundedStepIndex =
    totalSteps > 0 ? Math.min(Math.max(0, activeStepIndex), totalSteps - 1) : 0;
  const currentActiveStep =
    totalSteps > 0 ? routeResult.steps[boundedStepIndex] : null;

  function speakSingleStep(stepIndex) {
    if (!routeResult?.steps?.length) return;
    const clamped = Math.min(Math.max(0, stepIndex), routeResult.steps.length - 1);
    const step = routeResult.steps[clamped];
    setActiveStepIndex(clamped);

    const stepFloor = step.fromFloor || step.floor || 1;
    setSelectedFloor(stepFloor);

    const caps = getSpeechCapabilities(lang);
    if (!caps.supported) {
      setSpeechNotice(
        t.register?.voiceUnavailable ||
          'Browser speech synthesis is unavailable on this device. Visual step highlighting is active.'
      );
      setSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const stepPrefix =
        lang === 'hi' ? 'चरण' : lang === 'ta' ? 'படி' : 'Step';
      const text = `${stepPrefix} ${step.stepNumber}: ${getStepInstruction(step, lang)}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = caps.targetBcp47;
      if (caps.voice) {
        utterance.voice = caps.voice;
      }
      utterance.rate = 0.95;
      utterance.onend = () => {
        setSpeaking(false);
        if (step.toFloor && step.toFloor !== step.fromFloor) {
          setSelectedFloor(step.toFloor);
        }
      };
      utterance.onerror = () => setSpeaking(false);
      setSpeechNotice('');
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  function handleReadDirections() {
    if (!routeResult?.steps?.length) return;
    const caps = getSpeechCapabilities(lang);
    if (!caps.supported) {
      setSpeechNotice(
        t.register?.voiceUnavailable ||
          'Browser speech synthesis is unavailable on this device. Visual step highlighting is active.'
      );
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const stepPrefix =
        lang === 'hi' ? 'चरण' : lang === 'ta' ? 'படி' : 'Step';
      const stepsText = routeResult.steps
        .map((step) => `${stepPrefix} ${step.stepNumber}: ${getStepInstruction(step, lang)}`)
        .join(' ');

      const utterance = new SpeechSynthesisUtterance(stepsText);
      utterance.lang = caps.targetBcp47;
      if (caps.voice) {
        utterance.voice = caps.voice;
      }
      utterance.rate = 0.95;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeechNotice('');
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  function handleStopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function handleStepSelect(idx, speakNow = false) {
    if (!routeResult?.steps?.length) return;
    const clamped = Math.min(Math.max(0, idx), routeResult.steps.length - 1);
    setActiveStepIndex(clamped);
    const step = routeResult.steps[clamped];
    if (step) {
      setSelectedFloor(step.toFloor || step.floor || 1);
      setInspectedNodeId(step.toNodeId);
    }
    if (speakNow) {
      speakSingleStep(clamped);
    }
  }

  function handleZoomIn() {
    setMapZoom((z) => Math.min(1.8, Number((z + 0.2).toFixed(2))));
  }

  function handleZoomOut() {
    setMapZoom((z) => {
      const next = Math.max(1, Number((z - 0.2).toFixed(2)));
      if (next === 1) setMapPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleResetMapView() {
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
  }

  function handleFocusActiveStep() {
    if (!currentActiveStep) {
      handleResetMapView();
      return;
    }
    const targetFloor = currentActiveStep.toFloor || currentActiveStep.floor || 1;
    setSelectedFloor(targetFloor);
    const targetNode = nodeMap.get(currentActiveStep.toNodeId);
    if (targetNode) {
      setInspectedNodeId(targetNode.id);
      setMapZoom(1.3);
      setMapPan({
        x: Math.max(-180, Math.min(180, (460 - targetNode.x) * 0.45)),
        y: Math.max(-90, Math.min(90, (220 - targetNode.y) * 0.45))
      });
    }
  }

  // Compute route nodes, same-floor route segments, and vertical floor transitions
  const routeNodeIds = useMemo(() => {
    const set = new Set();
    if (routeResult?.fromNode?.id) set.add(routeResult.fromNode.id);
    if (routeResult?.toNode?.id) set.add(routeResult.toNode.id);
    for (const s of routeResult?.steps || []) {
      set.add(s.fromNodeId);
      set.add(s.toNodeId);
    }
    return set;
  }, [routeResult]);

  const floorNodes = useMemo(
    () => nodes.filter((n) => n.floor === selectedFloor),
    [nodes, selectedFloor]
  );

  const floorBaseEdges = useMemo(() => {
    return canonicalEdges
      .map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        if (fromNode.floor !== selectedFloor || toNode.floor !== selectedFloor) {
          return null;
        }
        return {
          ...edge,
          fromNode,
          toNode
        };
      })
      .filter(Boolean);
  }, [canonicalEdges, nodeMap, selectedFloor]);

  const floorRouteSegments = useMemo(() => {
    if (!routeResult?.found || !routeResult?.steps) return [];
    return routeResult.steps
      .map((step, idx) => {
        const fromNode = nodeMap.get(step.fromNodeId);
        const toNode = nodeMap.get(step.toNodeId);
        if (!fromNode || !toNode) return null;
        if (fromNode.floor !== selectedFloor || toNode.floor !== selectedFloor) {
          return null;
        }
        return {
          step,
          stepIndex: idx,
          fromNode,
          toNode,
          isCurrentStep: idx === boundedStepIndex
        };
      })
      .filter(Boolean);
  }, [routeResult, nodeMap, selectedFloor, boundedStepIndex]);

  const floorVerticalTransitions = useMemo(() => {
    if (!routeResult?.found || !routeResult?.steps) return [];
    return routeResult.steps
      .map((step, idx) => {
        const fromNode = nodeMap.get(step.fromNodeId);
        const toNode = nodeMap.get(step.toNodeId);
        if (!fromNode || !toNode) return null;
        if (fromNode.floor === toNode.floor) return null;
        if (fromNode.floor !== selectedFloor && toNode.floor !== selectedFloor) {
          return null;
        }
        const anchorNode = fromNode.floor === selectedFloor ? fromNode : toNode;
        const targetFloor =
          fromNode.floor === selectedFloor ? toNode.floor : fromNode.floor;
        return {
          step,
          stepIndex: idx,
          anchorNode,
          fromFloor: fromNode.floor,
          toFloor: toNode.floor,
          targetFloor,
          isCurrentStep: idx === boundedStepIndex
        };
      })
      .filter(Boolean);
  }, [routeResult, nodeMap, selectedFloor, boundedStepIndex]);

  const inspectedNode = nodeMap.get(inspectedNodeId) || nodeMap.get(routeQuery.toNodeId);
  const activeWingBlueprints = FLOOR_WING_BLUEPRINTS[selectedFloor] || FLOOR_WING_BLUEPRINTS[1];

  const quickDestinations = [
    {
      id: 'room_204_med',
      label_en: 'Rm 204 General Med (F2)',
      label_hi: 'कमरा 204 सामान्य चिकित्सा',
      label_ta: 'அறை 204 பொது மருத்துவம் (F2)'
    },
    {
      id: 'room_208_ped',
      label_en: 'Rm 208 Paediatrics (F2)',
      label_hi: 'कमरा 208 बाल रोग',
      label_ta: 'அறை 208 குழந்தைகள் நலம் (F2)'
    },
    {
      id: 'room_302_ort',
      label_en: 'Rm 302 Orthopaedics (F3)',
      label_hi: 'कमरा 302 हड्डी रोग',
      label_ta: 'அறை 302 எலும்பு சிகிச்சை (F3)'
    },
    {
      id: 'room_305_eye',
      label_en: 'Rm 305 Eye OPD (F3)',
      label_hi: 'कमरा 305 नेत्र रोग',
      label_ta: 'அறை 305 கண் & ENT (F3)'
    },
    {
      id: 'pharmacy_f1',
      label_en: 'Pharmacy Counter 4 (F1)',
      label_hi: 'फार्मेसी काउंटर 4 (भूतल)',
      label_ta: 'மருந்தகம் கவுண்டர் 4 (F1)'
    },
    {
      id: 'lab_f2',
      label_en: 'Rm 212 Pathology Lab (F2)',
      label_hi: 'कमरा 212 पैथोलॉजी लैब',
      label_ta: 'அறை 212 இரத்தப் பரிசோதனை (F2)'
    },
    {
      id: 'emergency_casualty',
      label_en: 'Rm 101 Emergency (F1)',
      label_hi: 'कमरा 101 आपातकालीन',
      label_ta: 'அறை 101 அவசர சிகிச்சை (F1)'
    }
  ];

  return (
    <section
      aria-labelledby="navigate-heading"
      className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-7 shadow-card space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="space-y-1">
          <h2
            id="navigate-heading"
            className="text-xl sm:text-2xl font-extrabold text-ink-primary tracking-tight"
          >
            {t.navigate.title}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary">{t.navigate.subtitle}</p>
        </div>

        {routeResult?.found && (
          <button
            type="button"
            data-testid="read-directions-btn"
            onClick={handleReadDirections}
            className="btn-secondary px-4 py-2 text-xs sm:text-sm"
          >
            {speaking ? (
              <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{speaking ? t.slip.stopReadingBtn : t.navigate.readRouteBtn}</span>
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
              onClick={() => {
                setRouteQuery((prev) => ({
                  ...prev,
                  toNodeId: dest.id
                }));
                const targetFloor = nodeMap.get(dest.id)?.floor;
                if (targetFloor) setSelectedFloor(targetFloor);
              }}
              className={`touch-target px-3.5 py-2 rounded-xl text-xs font-bold border transition-all text-left lg:text-center ${
                isSelected
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-canvas text-ink-primary border-border-subtle hover:border-brand-teal/50 hover:bg-subtle'
              }`}
            >
              {lang === 'hi'
                ? dest.label_hi
                : lang === 'ta'
                ? dest.label_ta
                : dest.label_en}
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
              data-testid="nav-from-select"
              value={routeQuery.fromNodeId}
              onChange={(e) =>
                setRouteQuery((prev) => ({ ...prev, fromNodeId: e.target.value }))
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  [F{node.floor}] {getNodeName(node, lang)}
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
              data-testid="nav-to-select"
              value={routeQuery.toNodeId}
              onChange={(e) =>
                setRouteQuery((prev) => ({ ...prev, toNodeId: e.target.value }))
              }
              className="touch-target w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm font-semibold shadow-xs"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  [F{node.floor}] {getNodeName(node, lang)}
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
              data-testid="nav-avoid-stairs-checkbox"
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
            {routeQuery.avoidStairs ? t.navigate.liftOnlyNote : t.navigate.stairsAllowedNote}
          </span>
        </div>
      </div>

      {/* CHECKPOINT 1: INTERACTIVE THREE-FLOOR SCHEMATIC HOSPITAL MAP */}
      <div
        data-testid="interactive-floor-map-card"
        className="rounded-2xl border border-border-strong bg-canvas p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-teal shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-ink-primary">
                {lang === 'hi'
                  ? 'इंटरैक्टिव 3-तल अस्पताल मानचित्र (Interactive Floor Map)'
                  : lang === 'ta'
                  ? 'ஊடாடும் 3-தள மருத்துவமனை வரைபடம்'
                  : 'Interactive 3-Floor Hospital Schematic Map'}
              </h3>
              <p className="text-xs text-ink-secondary">
                {t.navigate.schematicHint ||
                  'Tap any room or facility on the floor map to inspect it, listen to audio guidance, or set it as Start / Destination.'}
              </p>
            </div>
          </div>

          <span
            data-testid="schematic-disclaimer-badge"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-surface text-ink-secondary border border-border-subtle"
          >
            <Info className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
            <span>
              {t.navigate.schematicBadge ||
                'Illustrative Schematic Map — Not to Architectural Scale'}
            </span>
          </span>
        </div>

        {/* Selectable Floor 1, Floor 2, Floor 3 Tabs */}
        <div
          role="tablist"
          aria-label="Hospital Floor Selector"
          className="grid grid-cols-3 gap-2"
        >
          {[1, 2, 3].map((floorNum) => {
            const isSelectedFloor = selectedFloor === floorNum;
            const hasStart = routeResult?.fromNode?.floor === floorNum;
            const hasDest = routeResult?.toNode?.floor === floorNum;
            const isTraversed = routeResult?.floorsTraversed?.includes(floorNum);
            const floorMeta = canonicalFloors.find((f) => f.floor === floorNum);

            return (
              <button
                key={floorNum}
                type="button"
                role="tab"
                aria-selected={isSelectedFloor}
                data-testid={`map-floor-tab-${floorNum}`}
                onClick={() => {
                  setSelectedFloor(floorNum);
                  setMapPan({ x: 0, y: 0 });
                }}
                className={`touch-target px-3 py-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                  isSelectedFloor
                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                    : isTraversed
                    ? 'bg-surface text-ink-primary border-brand-teal/60 hover:bg-subtle'
                    : 'bg-surface text-ink-secondary border-border-subtle hover:bg-subtle'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-token text-xs sm:text-sm font-extrabold">
                    {t.navigate.floorTabPrefix || 'Floor'} {floorNum}
                  </span>
                  <div className="flex items-center gap-1">
                    {hasStart && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-700 text-white">
                        START
                      </span>
                    )}
                    {hasDest && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-600 text-white">
                        DEST
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium truncate ${
                    isSelectedFloor ? 'text-slate-100' : 'text-ink-muted'
                  }`}
                >
                  {lang === 'hi'
                    ? floorMeta?.name_hi
                    : lang === 'ta'
                    ? floorMeta?.name_ta
                    : floorMeta?.name_en || t.floors[floorNum]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leaflet-Style Map Toolbar & Interactive Floorplan Canvas */}
        <div className="relative rounded-2xl border-2 border-border-strong/80 bg-slate-900/5 overflow-hidden shadow-inner">
          {/* Top-Right Interactive Map Controls (Zoom In, Zoom Out, Reset, Focus Step) */}
          <div
            data-testid="schematic-map-controls"
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-surface/95 border-b border-border-subtle text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-ink-secondary">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-subtle text-brand-primary font-token font-extrabold">
                F{selectedFloor}
              </span>
              <span>
                {lang === 'hi'
                  ? 'कक्ष चुनने के लिए मानचित्र पर टैप करें • ज़ूम और पैन नियंत्रण'
                  : lang === 'ta'
                  ? 'அறையைத் தேர்வுசெய்ய வரைபடத்தைத் தொடவும் • பெரிதாக்கு नियंत्रण'
                  : 'Click any room block to inspect • Use Zoom & Focus controls'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="map-zoom-out-btn"
                onClick={handleZoomOut}
                disabled={mapZoom <= 1}
                aria-label="Zoom out floor map"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-strong bg-canvas hover:bg-subtle text-ink-primary font-bold text-xs disabled:opacity-45 transition-colors"
              >
                <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{lang === 'hi' ? 'छोटा' : lang === 'ta' ? 'சுருக்கு' : 'Zoom Out'}</span>
              </button>

              <button
                type="button"
                data-testid="map-zoom-reset-btn"
                onClick={handleResetMapView}
                aria-label="Reset map zoom to 100 percent"
                className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface hover:bg-subtle font-token font-extrabold text-xs text-brand-primary transition-colors"
              >
                <span>{Math.round(mapZoom * 100)}%</span>
              </button>

              <button
                type="button"
                data-testid="map-zoom-in-btn"
                onClick={handleZoomIn}
                disabled={mapZoom >= 1.8}
                aria-label="Zoom in floor map"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-strong bg-canvas hover:bg-subtle text-ink-primary font-bold text-xs disabled:opacity-45 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{lang === 'hi' ? 'बड़ा' : lang === 'ta' ? 'பெரிதாக்கு' : 'Zoom In'}</span>
              </button>

              <button
                type="button"
                data-testid="map-focus-step-btn"
                onClick={handleFocusActiveStep}
                aria-label="Center map on active route step"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-teal/50 bg-brand-tealSoft/60 hover:bg-brand-tealSoft text-brand-primary font-bold text-xs transition-colors"
              >
                <LocateFixed className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'hi'
                    ? 'सक्रिय चरण देखें'
                    : lang === 'ta'
                    ? 'தற்போதைய படி'
                    : 'Focus Step'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive SVG Floorplan Viewport */}
          <div
            onMouseDown={(e) => {
              if (mapZoom > 1) {
                setDragStart({ x: e.clientX - mapPan.x, y: e.clientY - mapPan.y });
              }
            }}
            onMouseMove={(e) => {
              if (dragStart && mapZoom > 1) {
                setMapPan({
                  x: Math.max(-240, Math.min(240, e.clientX - dragStart.x)),
                  y: Math.max(-130, Math.min(130, e.clientY - dragStart.y))
                });
              }
            }}
            onMouseUp={() => setDragStart(null)}
            onMouseLeave={() => setDragStart(null)}
            className={`w-full overflow-hidden bg-slate-50 ${
              mapZoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <svg
              data-testid="hospital-schematic-svg"
              viewBox="0 0 920 440"
              role="img"
              aria-label={`Floor ${selectedFloor} Schematic Hospital Map`}
              className="w-full h-auto max-h-[430px] select-none block transition-transform duration-200 ease-out"
              style={{
                transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                transformOrigin: 'center center'
              }}
            >
              <defs>
                <pattern
                  id="schematic-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                </pattern>
                <marker
                  id="route-arrow-active"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
                </marker>
                <marker
                  id="route-arrow-normal"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0F4C81" />
                </marker>
              </defs>

              {/* Blueprint Subtle Grid & Building Floorplate Perimeter */}
              <rect x="0" y="0" width="920" height="440" fill="url(#schematic-grid)" />
              <rect
                x="24"
                y="18"
                width="872"
                height="402"
                rx="18"
                fill="#FFFFFF"
                stroke="#94A3B8"
                strokeWidth="2.5"
              />

              {/* Top Architectural Title Strip */}
              <rect
                x="26"
                y="20"
                width="868"
                height="28"
                rx="14"
                fill="#0F172A"
              />
              <text
                x="44"
                y="38"
                fill="#F8FAFC"
                fontSize="11"
                fontWeight="800"
                letterSpacing="1"
              >
                {`FLOOR ${selectedFloor} ARCHITECTURAL WAYFINDING BLUEPRINT · CITY DISTRICT HOSPITAL`}
              </text>
              <text
                x="874"
                y="38"
                textAnchor="end"
                fill="#5EEAD4"
                fontSize="11"
                fontWeight="800"
                letterSpacing="0.8"
              >
                {routeQuery.avoidStairs
                  ? 'STEP-FREE LIFT & RAMP MODE'
                  : 'STANDARD CORRIDOR & STAIR MODE'}
              </text>

              {/* Architectural Wing Zones for Selected Floor */}
              {activeWingBlueprints.map((wing) => (
                <g key={wing.id}>
                  <rect
                    x={wing.x}
                    y={wing.y}
                    width={wing.w}
                    height={wing.h}
                    rx="14"
                    fill={wing.fill}
                    stroke={wing.stroke}
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={wing.x + 12}
                    y={wing.y + 18}
                    fill="#475569"
                    fontSize="10"
                    fontWeight="800"
                    letterSpacing="0.8"
                  >
                    {lang === 'hi'
                      ? wing.title_hi
                      : lang === 'ta'
                      ? wing.title_ta
                      : wing.title_en}
                  </text>
                </g>
              ))}

              {/* Main Walkable Corridor Spine & Cross-Corridors */}
              <rect
                x="64"
                y="192"
                width="770"
                height="56"
                rx="14"
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text
                x="455"
                y="224"
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontWeight="800"
                letterSpacing="2"
                opacity="0.65"
              >
                MAIN ACCESSIBLE HOSPITAL CORRIDOR SPINE
              </text>

              {/* Base Corridor Edges on Selected Floor */}
              {floorBaseEdges.map((edge, idx) => {
                const isStairEdge = edge.mode === 'stairs' || !edge.accessible;
                const isExcluded = Boolean(routeQuery.avoidStairs) && isStairEdge;
                return (
                  <g key={`${edge.from}-${edge.to}-${idx}`}>
                    <line
                      x1={edge.fromNode.x}
                      y1={edge.fromNode.y}
                      x2={edge.toNode.x}
                      y2={edge.toNode.y}
                      stroke={isExcluded ? '#CBD5E1' : '#94A3B8'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity={isExcluded ? 0.25 : 0.35}
                    />
                    <line
                      x1={edge.fromNode.x}
                      y1={edge.fromNode.y}
                      x2={edge.toNode.x}
                      y2={edge.toNode.y}
                      stroke={isExcluded ? '#CBD5E1' : '#64748B'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={
                        edge.mode === 'ramp'
                          ? '8 4'
                          : isStairEdge
                          ? '3 6'
                          : undefined
                      }
                      opacity={isExcluded ? 0.35 : 0.65}
                    />
                  </g>
                );
              })}

              {/* Highlighted Computed Route Segments on Selected Floor */}
              {floorRouteSegments.map((seg) => {
                const midX = (seg.fromNode.x + seg.toNode.x) / 2;
                const midY = (seg.fromNode.y + seg.toNode.y) / 2;
                return (
                  <g key={`route-seg-${seg.step.stepNumber}`}>
                    {/* Outer Glow Corridor Path */}
                    <line
                      x1={seg.fromNode.x}
                      y1={seg.fromNode.y}
                      x2={seg.toNode.x}
                      y2={seg.toNode.y}
                      stroke={seg.isCurrentStep ? '#F59E0B' : '#0D9488'}
                      strokeWidth={seg.isCurrentStep ? '18' : '14'}
                      strokeLinecap="round"
                      opacity="0.26"
                    />
                    {/* Main Animated Route Line with Directional Arrow */}
                    <line
                      data-testid="schematic-active-route-edge"
                      x1={seg.fromNode.x}
                      y1={seg.fromNode.y}
                      x2={seg.toNode.x}
                      y2={seg.toNode.y}
                      stroke={seg.isCurrentStep ? '#D97706' : '#0F4C81'}
                      strokeWidth={seg.isCurrentStep ? '7' : '5.5'}
                      strokeLinecap="round"
                      strokeDasharray={seg.isCurrentStep ? '12 6' : undefined}
                      markerEnd={
                        seg.isCurrentStep
                          ? 'url(#route-arrow-active)'
                          : 'url(#route-arrow-normal)'
                      }
                      className="schematic-route-line"
                    />
                    {/* Midpoint Step Number + Distance Pill */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-28"
                        y="-13"
                        width="56"
                        height="24"
                        rx="12"
                        fill={seg.isCurrentStep ? '#D97706' : '#0F4C81'}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        fill="#FFFFFF"
                        fontSize="10.5"
                        fontWeight="800"
                      >
                        {`#${seg.step.stepNumber} · ${seg.step.distanceMeters}m`}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Vertical Connector Transition Callouts (Lift / Stairs between floors) */}
              {floorVerticalTransitions.map((vt) => (
                <g
                  key={`vt-${vt.step.stepNumber}`}
                  data-testid="schematic-floor-transition-badge"
                  transform={`translate(${vt.anchorNode.x}, ${vt.anchorNode.y - 54})`}
                  onClick={() => setSelectedFloor(vt.targetFloor)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="-80"
                    y="-16"
                    width="160"
                    height="28"
                    rx="14"
                    fill={vt.step.mode === 'lift' ? '#0D9488' : '#D97706'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    textAnchor="middle"
                    dy="3"
                    fill="#FFFFFF"
                    fontSize="10.5"
                    fontWeight="800"
                  >
                    {`${vt.step.mode.toUpperCase()} · F${vt.fromFloor} → F${vt.toFloor} (Tap)`}
                  </text>
                </g>
              ))}

              {/* Hospital Rooms & Connector Nodes on Selected Floor */}
              {floorNodes.map((node) => {
                const isStart = routeQuery.fromNodeId === node.id;
                const isDest = routeQuery.toNodeId === node.id;
                const isOnRoute = routeNodeIds.has(node.id);
                const isInspected = inspectedNodeId === node.id;
                const isStairNode = node.type === 'stairs';
                const isLiftNode = node.type === 'lift';
                const isEmergency = node.type === 'emergency';

                let fillColor = '#FFFFFF';
                let headerBandColor = '#E2E8F0';
                let headerTextColor = '#334155';
                let strokeColor = '#64748B';
                let textColor = '#0F172A';

                if (isStart) {
                  fillColor = '#15803D';
                  headerBandColor = '#14532D';
                  headerTextColor = '#DCFCE7';
                  strokeColor = '#14532D';
                  textColor = '#FFFFFF';
                } else if (isDest) {
                  fillColor = '#0F4C81';
                  headerBandColor = '#072F54';
                  headerTextColor = '#E0F2FE';
                  strokeColor = '#0D9488';
                  textColor = '#FFFFFF';
                } else if (isOnRoute) {
                  fillColor = '#F0FDFA';
                  headerBandColor = '#CCFBF1';
                  headerTextColor = '#0F766E';
                  strokeColor = '#0D9488';
                  textColor = '#0F172A';
                } else if (isEmergency) {
                  fillColor = '#FEF2F2';
                  headerBandColor = '#FEE2E2';
                  headerTextColor = '#991B1B';
                  strokeColor = '#B91C1C';
                  textColor = '#991B1B';
                } else if (isLiftNode) {
                  fillColor = '#F0F9FF';
                  headerBandColor = '#E0F2FE';
                  headerTextColor = '#0369A1';
                  strokeColor = '#0284C7';
                  textColor = '#0F172A';
                } else if (isStairNode && routeQuery.avoidStairs) {
                  fillColor = '#F8FAFC';
                  headerBandColor = '#E2E8F0';
                  headerTextColor = '#64748B';
                  strokeColor = '#CBD5E1';
                  textColor = '#64748B';
                }

                const badgeLabel = isStart
                  ? '● YOU ARE HERE (START)'
                  : isDest
                  ? '★ DESTINATION ROOM'
                  : isLiftNode
                  ? '⇅ ACCESSIBLE LIFT'
                  : isStairNode
                  ? routeQuery.avoidStairs
                    ? '✕ STAIRS (AVOIDED)'
                    : '▤ STAIRCASE'
                  : isEmergency
                  ? '✚ 24×7 EMERGENCY'
                  : `ROOM / ZONE · F${node.floor}`;

                return (
                  <g
                    key={node.id}
                    data-testid={`map-node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setInspectedNodeId(node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Start / Destination Outer Pulse Beacon */}
                    {(isStart || isDest) && (
                      <rect
                        x="-78"
                        y="-40"
                        width="156"
                        height="80"
                        rx="16"
                        fill="none"
                        stroke={isStart ? '#16A34A' : '#0284C7'}
                        strokeWidth="2.5"
                        opacity="0.45"
                      />
                    )}

                    {/* Inspected Selection Outline */}
                    {isInspected && (
                      <rect
                        x="-75"
                        y="-37"
                        width="150"
                        height="74"
                        rx="15"
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="3"
                        strokeDasharray="6 3"
                      />
                    )}

                    {/* Room Card Footprint */}
                    <rect
                      x="-70"
                      y="-32"
                      width="140"
                      height="64"
                      rx="12"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isStart || isDest || isOnRoute ? '2.8' : '1.8'}
                    />

                    {/* Architectural Header Band */}
                    <rect
                      x="-68.5"
                      y="-30.5"
                      width="137"
                      height="20"
                      rx="10"
                      fill={headerBandColor}
                    />
                    <text
                      textAnchor="middle"
                      y="-17"
                      fill={headerTextColor}
                      fontSize="9"
                      fontWeight="800"
                      letterSpacing="0.5"
                    >
                      {badgeLabel}
                    </text>

                    {/* Primary Room Name */}
                    <text
                      textAnchor="middle"
                      y="7"
                      fill={textColor}
                      fontSize="11.5"
                      fontWeight="800"
                    >
                      {getNodeShort(node, lang)}
                    </text>

                    {/* Landmark / Floor Sub-caption */}
                    <text
                      textAnchor="middle"
                      y="22"
                      fill={isStart || isDest ? '#E2E8F0' : '#475569'}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {`Floor ${node.floor} · Tap to inspect`}
                    </text>
                  </g>
                );
              })}

              {/* Compass Rose & Scale Indicator in Bottom-Left Corner */}
              <g transform="translate(58, 394)">
                <circle r="16" fill="#0F172A" stroke="#CBD5E1" strokeWidth="1.5" />
                <text
                  textAnchor="middle"
                  y="-3"
                  fill="#5EEAD4"
                  fontSize="9"
                  fontWeight="800"
                >
                  ▲ N
                </text>
                <text
                  textAnchor="middle"
                  y="8"
                  fill="#F8FAFC"
                  fontSize="7.5"
                  fontWeight="700"
                >
                  MAP
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Selected Room Inspector Bar + Voice Listen + Quick Start/Destination Setters */}
        {inspectedNode && (
          <div
            data-testid="map-inspected-node-bar"
            className="p-3.5 rounded-xl bg-surface border border-border-subtle flex flex-wrap items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-token text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-brand-primary text-white">
                  F{inspectedNode.floor}
                </span>
                <span className="font-extrabold text-sm text-ink-primary">
                  {getNodeName(inspectedNode, lang)}
                </span>
              </div>
              <p className="text-xs text-ink-secondary truncate">
                {getNodeLandmark(inspectedNode, lang)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <VoiceListenButton
                lang={lang}
                size="sm"
                testId="voice-listen-inspected-node"
                text={`${getNodeName(inspectedNode, lang)}. ${t.floors[inspectedNode.floor] || `Floor ${inspectedNode.floor}`}. ${getNodeLandmark(inspectedNode, lang)}.`}
              />
              <button
                type="button"
                data-testid="map-set-start-btn"
                onClick={() =>
                  setRouteQuery((prev) => ({
                    ...prev,
                    fromNodeId: inspectedNode.id
                  }))
                }
                disabled={routeQuery.fromNodeId === inspectedNode.id}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {t.navigate.setAsStartBtn || 'Set as Start'}
              </button>
              <button
                type="button"
                data-testid="map-set-dest-btn"
                onClick={() =>
                  setRouteQuery((prev) => ({
                    ...prev,
                    toNodeId: inspectedNode.id
                  }))
                }
                disabled={routeQuery.toNodeId === inspectedNode.id}
                className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {t.navigate.setAsDestBtn || 'Set as Destination'}
              </button>
            </div>
          </div>
        )}

        {/* Schematic Map Legend */}
        <div
          data-testid="schematic-map-legend"
          className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-subtle text-xs font-semibold text-ink-secondary"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-700 inline-block" />
            <span>{t.navigate.legendStart || 'Start Point'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-primary inline-block" />
            <span>{t.navigate.legendDest || 'Destination'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-1.5 rounded bg-brand-primary inline-block" />
            <span>{t.navigate.legendActiveRoute || 'Highlighted Route'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-1.5 rounded bg-amber-600 inline-block" />
            <span>{t.navigate.legendNextSegment || 'Current / Next Step'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
            <span>{t.navigate.legendLift || 'Patient Lift (Accessible)'}</span>
          </span>
        </div>
      </div>

      {/* CHECKPOINT 2: VOICE-GUIDED STEP-BY-STEP NAVIGATION CONTROLLER */}
      {routeResult?.found && totalSteps > 0 && (
        <div
          data-testid="voice-navigation-panel"
          className="p-4 rounded-2xl bg-subtle/90 border border-border-subtle space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-extrabold text-ink-primary">
                {t.navigate.voicePanelTitle || 'Voice-Guided Step-by-Step Navigation'}
              </span>
            </div>

            <span
              data-testid="voice-active-step-indicator"
              className="font-token text-xs font-extrabold px-2.5 py-1 rounded-full bg-brand-primary text-white"
            >
              {t.navigate.voiceActiveStepLabel || 'Active Step'}: {boundedStepIndex + 1} /{' '}
              {totalSteps}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="voice-play-route-btn"
              onClick={handleReadDirections}
              className="btn-primary px-3.5 py-2 text-xs"
            >
              <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.navigate.voicePlayAllBtn || 'Play Route'}</span>
            </button>

            <button
              type="button"
              data-testid="voice-stop-btn"
              onClick={handleStopSpeech}
              className="btn-secondary px-3 py-2 text-xs"
            >
              <Square className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.navigate.voicePauseBtn || 'Stop Speech'}</span>
            </button>

            <button
              type="button"
              data-testid="voice-prev-step-btn"
              onClick={() => speakSingleStep(Math.max(0, boundedStepIndex - 1))}
              disabled={boundedStepIndex <= 0}
              className="btn-secondary px-3 py-2 text-xs disabled:opacity-50"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.navigate.voicePrevStepBtn || 'Previous Step'}</span>
            </button>

            <button
              type="button"
              data-testid="voice-repeat-step-btn"
              onClick={() => speakSingleStep(boundedStepIndex)}
              className="btn-secondary px-3 py-2 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.navigate.voiceRepeatStepBtn || 'Repeat Current Step'}</span>
            </button>

            <button
              type="button"
              data-testid="voice-next-step-btn"
              onClick={() =>
                speakSingleStep(Math.min(totalSteps - 1, boundedStepIndex + 1))
              }
              disabled={boundedStepIndex >= totalSteps - 1}
              className="btn-secondary px-3 py-2 text-xs disabled:opacity-50"
            >
              <span>{t.navigate.voiceNextStepBtn || 'Next Step'}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {currentActiveStep && (
            <div className="p-3 rounded-xl bg-surface border border-brand-teal/40 text-xs sm:text-sm font-semibold text-ink-primary flex items-start justify-between gap-3">
              <div>
                <span className="font-token font-extrabold text-brand-primary mr-2">
                  #{currentActiveStep.stepNumber}
                </span>
                <span>{getStepInstruction(currentActiveStep, lang)}</span>
              </div>
              <span className="font-token text-xs font-bold text-ink-muted shrink-0">
                F{currentActiveStep.floor}
              </span>
            </div>
          )}

          {speechNotice && (
            <p
              data-testid="voice-fallback-notice"
              className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2"
            >
              {speechNotice}
            </p>
          )}
        </div>
      )}

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
              {routeResult.steps.map((step, idx) => {
                const isActiveStep = idx === boundedStepIndex;
                return (
                  <li
                    key={step.stepNumber}
                    data-testid={`route-step-item-${step.stepNumber}`}
                    onClick={() => handleStepSelect(idx, false)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isActiveStep
                        ? 'bg-surface border-brand-teal ring-2 ring-brand-teal/20 shadow-sm'
                        : 'bg-canvas border-border-subtle hover:border-brand-teal/40'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full font-token font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                        isActiveStep
                          ? 'bg-amber-600 text-white'
                          : 'bg-brand-primary text-white'
                      }`}
                    >
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-surface text-brand-primary border border-border-subtle">
                          <Navigation
                            className="w-3.5 h-3.5 text-brand-teal"
                            aria-hidden="true"
                          />
                          <span>
                            {step.mode.toUpperCase()} ·{' '}
                            {t.floors[step.floor] || `Floor ${step.floor}`}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-token text-xs font-bold text-ink-muted">
                            {step.distanceMeters}m · ~{step.durationSeconds}s
                          </span>
                          <VoiceListenButton
                            lang={lang}
                            size="sm"
                            testId={`voice-listen-route-step-${step.stepNumber}`}
                            text={`${getStepInstruction(step, lang)}. ${getStepLandmark(step, lang)}.`}
                          />
                        </div>
                      </div>

                      <p className="font-bold text-sm sm:text-base text-ink-primary leading-relaxed">
                        {getStepInstruction(step, lang)}
                      </p>

                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary bg-surface px-2.5 py-1 rounded-lg border border-border-subtle">
                        <MapPin
                          className="w-3.5 h-3.5 text-brand-teal shrink-0"
                          aria-hidden="true"
                        />
                        <span>Landmark: {getStepLandmark(step, lang)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div
              data-testid="no-accessible-route-banner"
              className="p-5 rounded-2xl bg-amber-50 border border-status-next text-ink-primary font-semibold text-sm"
            >
              {lang === 'hi'
                ? routeResult.fallbackMessage_hi
                : lang === 'ta'
                ? routeResult.fallbackMessage_ta || routeResult.fallbackMessage_en
                : routeResult.fallbackMessage_en}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
