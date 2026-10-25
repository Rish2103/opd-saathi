import React, { useState, useEffect } from 'react';
import { speakTextAloud, stopAllSpeech } from '../utils/soundAlerts.js';

const LISTEN_LABELS = {
  en: {
    listen: 'Listen',
    stop: 'Stop Audio',
    ariaListen: 'Listen to this information in English',
    ariaStop: 'Stop voice readout'
  },
  hi: {
    listen: 'सुनें',
    stop: 'आवाज़ रोकें',
    ariaListen: 'यह जानकारी हिन्दी में सुनें',
    ariaStop: 'आवाज़ बंद करें'
  },
  ta: {
    listen: 'கேளுங்கள்',
    stop: 'நிறுத்து',
    ariaListen: 'இந்த தகவலை தமிழில் கேளுங்கள்',
    ariaStop: 'குரலை நிறுத்து'
  }
};

export default function VoiceListenButton({
  text,
  lang = 'en',
  label,
  stopLabel,
  variant = 'pill',
  className = '',
  testId
}) {
  const [speaking, setSpeaking] = useState(false);
  const copy = LISTEN_LABELS[lang] || LISTEN_LABELS.en;
  const displayListen = label || copy.listen;
  const displayStop = stopLabel || copy.stop;

  useEffect(() => {
    return () => {
      if (speaking) {
        stopAllSpeech();
      }
    };
  }, [speaking]);

  const handleToggleSpeech = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (speaking) {
      stopAllSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakTextAloud(text, lang, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
  };

  const baseStyles =
    variant === 'header'
      ? speaking
        ? 'bg-brand-teal text-white border-brand-teal shadow-sm'
        : 'bg-subtle/80 text-ink-secondary border-border-strong/70 hover:bg-surface hover:text-brand-primary'
      : variant === 'inverse'
        ? speaking
          ? 'bg-amber-500 text-[#1E1915] border-amber-300 shadow-sm'
          : 'bg-[#120E0C]/55 hover:bg-[#120E0C]/80 text-[#FFFDF9] border-[#E59838]/45'
        : speaking
          ? 'bg-brand-teal text-white border-brand-teal shadow-sm'
          : 'bg-subtle hover:bg-brand-tealSoft text-brand-primary border-border-strong/80 hover:border-brand-teal';

  return (
    <button
      type="button"
      onClick={handleToggleSpeech}
      data-testid={testId}
      aria-pressed={speaking}
      aria-label={speaking ? copy.ariaStop : `${copy.ariaListen}: ${displayListen}`}
      title={speaking ? displayStop : displayListen}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors shrink-0 ${baseStyles} ${className}`}
    >
      {speaking ? (
        <svg className="w-3.5 h-3.5 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
      <span>{speaking ? displayStop : displayListen}</span>
    </button>
  );
}
