import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  Languages,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  ServerCrash,
  Stethoscope
} from 'lucide-react';

const COPY = {
  en: {
    skipLink: 'Skip to main content',
    emergencyBtn: 'Emergency Help',
    emergencySub: 'Immediate Casualty Guidance',
    brandTitle: 'OPD Saathi',
    brandSubtitle: 'Government Hospital Outpatient Queue & Indoor Navigation',
    phaseBadge: 'Phase 0 Foundation Verified',
    langToggle: 'हिन्दी (HI)',
    assistedOn: 'Assisted Mode: ON',
    assistedOff: 'Assisted Mode: OFF',
    healthHeading: 'System & Database Health Telemetry',
    healthRefresh: 'Re-check /api/health',
    dbConnected: 'PostgreSQL Connected (TLS Verified)',
    dbDegraded: 'Degraded Mode (Awaiting Cloud DB Credentials)',
    deptHeading: 'Canonical 3-Floor Hospital OPD Directory (Seeded Schema Preview)',
    deptSub:
      'Floor 1 (Ground): Registration, Emergency Triage & Pharmacy · Floor 2: General Medicine & Paediatrics · Floor 3: Orthopaedics & Ophthalmology.',
    floorLabels: {
      1: 'Floor 1 (Ground)',
      2: 'Floor 2 (First Floor)',
      3: 'Floor 3 (Second Floor)'
    },
    consultLabel: 'Avg Consult',
    mins: 'mins',
    emergencyModalTitle: 'Medical Emergency Guidance & Triage Notice',
    emergencyWarning:
      'Proceed IMMEDIATELY to Floor 1 (Ground) Emergency & Trauma Triage Desk (Near Main Gate) or call 112 / 108.',
    emergencyDisclaimer:
      'Important: Requesting staff assistance notifies the triage desk for human assessment but does NOT replace immediate physical attendance or clinical triage.',
    emergencyCall108: 'Call 108 Ambulance',
    emergencyCall112: 'Call 112 Emergency',
    emergencyClose: 'Close Window'
  },
  hi: {
    skipLink: 'मुख्य सामग्री पर जाएं',
    emergencyBtn: 'आपातकालीन सहायता',
    emergencySub: 'तत्काल कैजुअल्टी मार्गदर्शन',
    brandTitle: 'ओपीडी साथी (OPD Saathi)',
    brandSubtitle: 'सरकारी अस्पताल ओपीडी कतार और सुगम नेविगेशन प्रणाली',
    phaseBadge: 'चरण 0 (Phase 0) आधार सत्यापित',
    langToggle: 'English (EN)',
    assistedOn: 'सहायक मोड: चालू',
    assistedOff: 'सहायक मोड: बंद',
    healthHeading: 'सिस्टम और डेटाबेस स्वास्थ्य स्थिति (/api/health)',
    healthRefresh: 'पुनः जांचें',
    dbConnected: 'PostgreSQL जुड़ा हुआ है (TLS सत्यापित)',
    dbDegraded: 'डीग्रेडेड मोड (क्लाउड डेटाबेस क्रेडेंशियल प्रतीक्षित)',
    deptHeading: 'अस्पताल के 3-मंज़िला ओपीडी विभाग (सीडेड डेटा पूर्वावलोकन)',
    deptSub:
      'तल 1 (भूतल): पंजीकरण, आपातकालीन ट्रायज और फार्मेसी · तल 2: सामान्य चिकित्सा और बाल रोग · तल 3: हड्डी रोग और नेत्र रोग।',
    floorLabels: {
      1: 'तल 1 (भूतल / Ground)',
      2: 'तल 2 (प्रथम तल)',
      3: 'तल 3 (द्वितीय तल)'
    },
    consultLabel: 'औसत समय',
    mins: 'मिनट',
    emergencyModalTitle: 'आपातकालीन चिकित्सा मार्गदर्शन और सूचना',
    emergencyWarning:
      'कृपया तुरंत तल 1 (भूतल) पर आपातकालीन ट्रायज कक्ष (मुख्य द्वार के पास) में जाएं या 112 / 108 पर कॉल करें।',
    emergencyDisclaimer:
      'महत्वपूर्ण: डिजिटल अलर्ट केवल सहायता डेस्क को मानवीय जांच हेतु सूचित करता है, यह तत्काल डॉक्टर की जांच का विकल्प नहीं है।',
    emergencyCall108: '108 एम्बुलेंस कॉल करें',
    emergencyCall112: '112 आपातकालीन कॉल',
    emergencyClose: 'बंद करें'
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [assistedMode, setAssistedMode] = useState(false);
  const [health, setHealth] = useState({
    loading: true,
    httpStatus: null,
    data: null,
    error: null
  });
  const [departments, setDepartments] = useState([]);
  const [deptSource, setDeptSource] = useState('loading');

  const emergencyDialogRef = useRef(null);
  const t = COPY[lang];

  async function fetchSystemStatus() {
    setHealth((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [healthRes, deptRes] = await Promise.all([
        fetch('/api/health', { headers: { Accept: 'application/json' } }),
        fetch('/api/departments', { headers: { Accept: 'application/json' } })
      ]);

      const healthJson = await healthRes.json();
      const deptJson = await deptRes.json();

      setHealth({
        loading: false,
        httpStatus: healthRes.status,
        data: healthJson,
        error: null
      });

      if (Array.isArray(deptJson.departments)) {
        setDepartments(deptJson.departments);
        setDeptSource(deptJson.source || 'unknown');
      }
    } catch (err) {
      setHealth({
        loading: false,
        httpStatus: 0,
        data: null,
        error: err.message || 'Failed to reach Express backend'
      });
    }
  }

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  function openEmergencyModal() {
    if (emergencyDialogRef.current && !emergencyDialogRef.current.open) {
      emergencyDialogRef.current.showModal();
    }
  }

  function closeEmergencyModal() {
    if (emergencyDialogRef.current && emergencyDialogRef.current.open) {
      emergencyDialogRef.current.close();
    }
  }

  return (
    <div
      data-assisted={assistedMode ? 'true' : 'false'}
      lang={lang}
      className={
        lang === 'hi' ? 'font-devanagari min-h-screen flex flex-col' : 'min-h-screen flex flex-col'
      }
    >
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-primary focus:text-white focus:px-4 focus:py-3 focus:rounded-md"
      >
        {t.skipLink}
      </a>

      {/* Persistent Pre-Registration Top Emergency Action Bar */}
      <header className="bg-surface border-b-2 border-border-strong sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={openEmergencyModal}
            className="touch-target inline-flex items-center gap-2.5 bg-status-emergency text-white font-bold px-4 py-2.5 rounded-lg shadow-sm hover:opacity-95 transition"
            aria-haspopup="dialog"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div className="text-left leading-tight">
              <span className="block text-sm sm:text-base">{t.emergencyBtn}</span>
              <span className="block text-xs font-normal opacity-90 hidden sm:inline">
                {t.emergencySub}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAssistedMode((prev) => !prev)}
              aria-pressed={assistedMode}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-semibold text-xs sm:text-sm"
            >
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{assistedMode ? t.assistedOn : t.assistedOff}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'en' ? 'hi' : 'en'))}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary text-white font-semibold text-xs sm:text-sm"
            >
              <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.langToggle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Hero Banner */}
        <section className="bg-brand-primary text-white rounded-xl p-5 sm:p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-brand-teal px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>{t.phaseBadge}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t.brandTitle}</h1>
              <p className="text-sm sm:text-base text-slate-200 max-w-2xl">{t.brandSubtitle}</p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-xs sm:text-sm">
              <div className="text-slate-200 font-medium">Sample Token Typography</div>
              <div className="font-token text-xl sm:text-2xl font-bold tracking-wider text-white mt-0.5">
                OPD-GEN-001 · Rm 204
              </div>
            </div>
          </div>
        </section>

        {/* Live /api/health Telemetry Verification Card */}
        <section
          aria-labelledby="health-heading"
          className="bg-surface border-2 border-border-strong rounded-xl p-4 sm:p-6 shadow-card space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-brand-teal shrink-0" aria-hidden="true" />
              <h2 id="health-heading" className="text-lg sm:text-xl font-bold text-ink-primary">
                {t.healthHeading}
              </h2>
            </div>

            <button
              type="button"
              onClick={fetchSystemStatus}
              disabled={health.loading}
              className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-brand-primary bg-surface hover:bg-subtle text-brand-primary font-semibold text-sm disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${health.loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{t.healthRefresh}</span>
            </button>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4"
          >
            <div className="p-4 rounded-lg bg-subtle border border-border-strong">
              <div className="text-xs font-semibold uppercase text-ink-muted">
                HTTP Endpoint Status
              </div>
              <div className="mt-1 flex items-center gap-2">
                {health.httpStatus === 200 ? (
                  <CheckCircle2 className="w-5 h-5 text-status-serving shrink-0" />
                ) : (
                  <ServerCrash className="w-5 h-5 text-status-next shrink-0" />
                )}
                <span className="font-token font-bold text-base sm:text-lg">
                  {health.loading
                    ? 'Checking...'
                    : `HTTP ${health.httpStatus ?? 'ERR'} (${health.data?.status ?? 'unreachable'})`}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-subtle border border-border-strong">
              <div className="text-xs font-semibold uppercase text-ink-muted">
                PostgreSQL & Strict TLS State
              </div>
              <div className="mt-1 font-semibold text-sm sm:text-base">
                {health.data?.db?.connected ? t.dbConnected : t.dbDegraded}
              </div>
              {health.data?.db?.message && (
                <p className="mt-1 text-xs text-ink-secondary break-words">
                  {health.data.db.message}
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-subtle border border-border-strong">
              <div className="text-xs font-semibold uppercase text-ink-muted">
                Hospital Queue Date (IST)
              </div>
              <div className="mt-1 font-token font-bold text-base sm:text-lg">
                {health.data?.db?.hospitalDateIST ?? 'Pending DB Connection'}
              </div>
              <div className="mt-1 text-xs text-ink-secondary">
                Data Source: <span className="font-mono font-semibold">{deptSource}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Canonical 4 OPD Departments Directory across Floors 2 & 3 (Floor 1 = Registration/Emergency/Pharmacy) */}
        <section
          aria-labelledby="dept-heading"
          className="bg-surface border-2 border-border-strong rounded-xl p-4 sm:p-6 shadow-card space-y-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-primary shrink-0" aria-hidden="true" />
              <h2 id="dept-heading" className="text-lg sm:text-xl font-bold text-ink-primary">
                {t.deptHeading}
              </h2>
            </div>
            <p className="text-sm text-ink-secondary">{t.deptSub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {departments.map((dept) => (
              <article
                key={dept.slug}
                className="rounded-lg border-2 border-border-strong bg-canvas p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-token text-xs font-bold px-2.5 py-1 rounded bg-brand-primary text-white">
                      {dept.token_prefix}
                    </span>
                    <span className="font-token text-xs font-semibold px-2 py-0.5 rounded bg-subtle text-ink-secondary border border-border-strong">
                      {dept.room_label}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-ink-primary">
                    {lang === 'hi' ? dept.name_hi : dept.name_en}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-ink-secondary font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>{lang === 'hi' ? dept.doctor_name_hi : dept.doctor_name_en}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-strong/60 text-xs text-ink-secondary space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                    <span>{t.floorLabels[dept.floor_number]}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    {lang === 'hi' ? dept.landmark_hi : dept.landmark_en}
                  </p>
                  <div className="flex items-center justify-between text-ink-muted pt-1">
                    <span>
                      {t.consultLabel}: <strong>{dept.average_consult_minutes}</strong> {t.mins}
                    </span>
                    <span className="font-token text-[11px]">{dept.destination_node_id}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Native HTML <dialog> Emergency Modal (Accessible Focus Trap & Esc Support) */}
      <dialog
        ref={emergencyDialogRef}
        aria-labelledby="emergency-dialog-title"
        className="w-full max-w-lg rounded-xl border-4 border-status-emergency bg-surface p-0 text-ink-primary shadow-2xl"
      >
        <div className="bg-status-emergency text-white px-5 py-4 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 shrink-0" aria-hidden="true" />
          <h2 id="emergency-dialog-title" className="text-lg sm:text-xl font-bold">
            {t.emergencyModalTitle}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 rounded-lg bg-red-50 border-2 border-status-emergency text-ink-primary font-semibold text-sm sm:text-base">
            {t.emergencyWarning}
          </div>

          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            {t.emergencyDisclaimer}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href="tel:108"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-status-emergency text-white font-bold px-4 py-3 text-center"
            >
              <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.emergencyCall108}</span>
            </a>

            <a
              href="tel:112"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary text-white font-bold px-4 py-3 text-center"
            >
              <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t.emergencyCall112}</span>
            </a>
          </div>

          <div className="pt-2 flex justify-end border-t border-border-strong">
            <button
              type="button"
              onClick={closeEmergencyModal}
              className="touch-target px-5 py-2.5 rounded-lg border-2 border-brand-primary bg-subtle text-brand-primary font-bold text-sm"
            >
              {t.emergencyClose}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
