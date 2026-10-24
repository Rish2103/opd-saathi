/**
 * Web Audio API sound synthesizer and SpeechSynthesis helper for OPD Saathi.
 * Respects browser autoplay restrictions and degrades gracefully in SSR / test environments.
 */

let sharedAudioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function isWebAudioSupported() {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean(window.AudioContext || window.webkitAudioContext);
}

/**
 * Plays a pleasant two-tone hospital chime when a patient's token transitions to CALLED.
 * Returns true if audio playback succeeded, false if blocked or unsupported.
 */
export function playPatientCalledChime() {
  const ctx = getAudioContext();
  if (!ctx) {
    return false;
  }
  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, start: 0, duration: 0.22 }, // C5
      { freq: 659.25, start: 0.24, duration: 0.22 }, // E5
      { freq: 783.99, start: 0.48, duration: 0.38 } // G5
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + note.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a distinct double-pulse attention chime for staff when a new urgent help request arrives.
 * Returns true if audio playback succeeded, false if blocked or unsupported.
 */
export function playStaffUrgentChime() {
  const ctx = getAudioContext();
  if (!ctx) {
    return false;
  }
  try {
    const now = ctx.currentTime;
    const pulses = [
      { freq: 880, start: 0, duration: 0.16 },
      { freq: 698.46, start: 0.18, duration: 0.16 },
      { freq: 880, start: 0.4, duration: 0.24 }
    ];

    for (const pulse of pulses) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pulse.freq, now + pulse.start);

      gain.gain.setValueAtTime(0.001, now + pulse.start);
      gain.gain.exponentialRampToValueAtTime(0.22, now + pulse.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + pulse.start + pulse.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + pulse.start);
      osc.stop(now + pulse.start + pulse.duration + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects whether browser speechSynthesis is available and selects an installed voice
 * for the requested language ('en', 'hi', 'ta') if present.
 * Never claims a voice is installed when none is detected.
 */
export function getSpeechCapabilities(lang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
    return {
      supported: false,
      voiceFound: false,
      voice: null,
      targetBcp47: lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN'
    };
  }

  const targetBcp47 = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN';
  const langPrefix = lang === 'hi' ? 'hi' : lang === 'ta' ? 'ta' : 'en';

  let voices = [];
  try {
    voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
  } catch {
    voices = [];
  }

  const exactMatch = voices.find(
    (v) => v.lang && v.lang.toLowerCase().replace('_', '-') === targetBcp47.toLowerCase()
  );
  const prefixMatch = voices.find(
    (v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)
  );
  const selectedVoice = exactMatch || prefixMatch || null;

  return {
    supported: true,
    voiceFound: Boolean(selectedVoice),
    voice: selectedVoice,
    voicesLoadedCount: voices.length,
    targetBcp47
  };
}
