import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ShieldCheck, Square, Volume2, VolumeX } from 'lucide-react';

export const REGISTRATION_SPEECH_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN'
};

/**
 * Predefined, strictly non-sensitive voice instructions for each registration step.
 * Never includes patient names, phone numbers, ages, UHIDs, token codes, or clinical data.
 */
export const REGISTRATION_VOICE_SCRIPTS = {
  en: {
    1: 'Step 1 of 3: Choose OPD Department. This step selects which clinic you need to visit today. Tap one of the department cards below, such as General Medicine, Orthopaedics, Paediatrics, or Eye and ENT. After selecting a department, you will move to Step 2 to enter patient details.',
    2: 'Step 2 of 3: Patient Details and Accessibility. This step prepares your OPD slip and prevents duplicate tokens. Please enter the patient full name, ten-digit mobile number, and age in years. Gender and hospital registration number are optional. Choose whether this is a first visit or follow-up, and keep Avoid Stairs checked if you need a lift and ramp route. Then press Continue to review before submitting.',
    3: 'Step 3 of 3: Review and Confirm Registration. Please check the selected department, consultation room, visit type, and accessibility preference shown on screen. For your privacy, personal details are never read aloud. Press Confirm and Get OPD Token to generate your sequential token slip, or press Back to edit any field.'
  },
  hi: {
    1: 'चरण 1 (कुल 3 में से): ओपीडी विभाग चुनें। इस चरण में चुनें कि आज आप किस विभाग में दिखाना चाहते हैं। नीचे दिए गए विभाग कार्ड में से किसी एक को चुनें, जैसे सामान्य चिकित्सा, हड्डी रोग, बाल रोग, या नेत्र एवं ईएनटी। विभाग चुनने के बाद आप चरण 2 में मरीज का विवरण भरेंगे।',
    2: 'चरण 2 (कुल 3 में से): मरीज का विवरण और सुगम रास्ता। यह चरण आपकी ओपीडी पर्ची बनाने और दोहरे टोकन रोकने के लिए है। कृपया मरीज का पूरा नाम, दस अंकों का मोबाइल नंबर, और आयु वर्षों में दर्ज करें। लिंग और पुराना अस्पताल नंबर वैकल्पिक हैं। पहली बार या फॉलो-अप चुनें, और लिफ्ट व रैंप के रास्ते के लिए सीढ़ियों से बचें विकल्प चुना रहने दें। इसके बाद आगे बढ़ें बटन दबाएं।',
    3: 'चरण 3 (कुल 3 में से): जांच करें और टोकन की पुष्टि करें। कृपया स्क्रीन पर दिखाए गए विभाग, कमरा नंबर, दिखाने का प्रकार और रास्ते की प्राथमिकता की जांच कर लें। आपकी गोपनीयता की सुरक्षा के लिए व्यक्तिगत जानकारी आवाज़ में नहीं बोली जाती है। अपना टोकन प्राप्त करने के लिए पुष्टि करें और ओपीडी टोकन लें बटन दबाएं, या बदलाव के लिए पीछे जाएं दबाएं।'
  },
  ta: {
    1: 'படி 1 (மொத்தம் 3 படிகளில்): ஓபிடி துறையைத் தேர்ந்தெடுக்கவும். இன்று நீங்கள் பார்க்க வேண்டிய மருத்துவத் துறையை இதில் தேர்வு செய்யவும். பொது மருத்துவம், எலும்பியல், குழந்தைகள் நலம் அல்லது கண் மற்றும் காது-மூக்கு-தொண்டை ஆகிய துறை அட்டைகளில் ஒன்றைத் தொடவும். துறையைத் தேர்ந்தெடுத்த பிறகு, படி 2 இல் நோயாளி விவரங்களை உள்ளிடலாம்.',
    2: 'படி 2 (மொத்தம் 3 படிகளில்): நோயாளி விவரங்கள் மற்றும் வழி வசதி. இந்தப் படி உங்கள் ஓபிடி சீட்டை உருவாக்கவும் இரட்டை டோக்கன்களைத் தடுக்கவும் உதவுகிறது. நோயாளியின் முழுப் பெயர், பத்து இலக்க கைபேசி எண் மற்றும் வயதை உள்ளிடவும். பாலினம் மற்றும் பழைய பதிவு எண் விருப்பத்தேர்வாகும். முதல் வருகையா அல்லது தொடர் சிகிச்சையா என்பதைத் தேர்ந்தெடுத்து, லிஃப்ட் மற்றும் சாய்வுதள வழியைப் பயன்படுத்த படிக்கட்டுகளைத் தவிர்க்கவும் என்பதைத் தேர்வு செய்யவும். பின்னர் தொடரவும் பொத்தானை அழுத்தவும்.',
    3: 'படி 3 (மொத்தம் 3 படிகளில்): சரிபார்த்து டோக்கனை உறுதிப்படுத்தவும். திரையில் காட்டப்பட்டுள்ள துறை, ஆலோசனை அறை, வருகையின் வகை மற்றும் வழி முன்னுரிமையைச் சரிபார்க்கவும். உங்கள் தனியுரிமைக்காக தனிப்பட்ட விவரங்கள் குரலில் வாசிக்கப்படமாட்டாது. உங்கள் ஓபிடி டோக்கன் சீட்டைப் பெற உறுதிப்படுத்தி ஓபிடி டோக்கன் பெறுக பொத்தானை அழுத்தவும், அல்லது திருத்த பின்னால் பொத்தானை அழுத்தவும்.'
  }
};

export const REGISTRATION_VOICE_UI = {
  en: {
    badge: 'Voice Registration Guide',
    listenLabel: 'Listen to instructions',
    playBtn: 'Listen to instructions',
    playingLabel: 'Speaking step instructions…',
    stopBtn: 'Stop',
    replayBtn: 'Replay',
    stepIndicator: (step) => `Step ${step} of 3 Audio Guide`,
    privacyNote:
      'Privacy safe: Speaks only general step instructions. Never reads your name, phone number, or token aloud.',
    unavailableMsg:
      'Voice guidance is unavailable on this browser or device. Written step-by-step instructions remain active below.',
    errorMsg:
      'Could not play voice audio on this device. Please follow the written instructions on screen.',
    fallbackVoiceNotice:
      'Using default device voice for this language.'
  },
  hi: {
    badge: 'आवाज़ पंजीकरण मार्गदर्शिका',
    listenLabel: 'निर्देश सुनें (Listen to instructions)',
    playBtn: 'निर्देश सुनें',
    playingLabel: 'चरण के निर्देश बोले जा रहे हैं…',
    stopBtn: 'रोकें',
    replayBtn: 'फिर से सुनें',
    stepIndicator: (step) => `चरण ${step} / 3 ऑडियो सहायता`,
    privacyNote:
      'गोपनीयता सुरक्षित: केवल सामान्य निर्देश बोले जाते हैं। आपका नाम, फ़ोन नंबर या टोकन कभी नहीं बोला जाता।',
    unavailableMsg:
      'इस ब्राउज़र या डिवाइस पर आवाज़ सुविधा उपलब्ध नहीं है। नीचे लिखित निर्देश सक्रिय हैं।',
    errorMsg:
      'इस डिवाइस पर आवाज़ चलाने में समस्या हुई। कृपया स्क्रीन पर दिए गए लिखित निर्देशों का पालन करें।',
    fallbackVoiceNotice:
      'इस भाषा के लिए डिवाइस की डिफ़ॉल्ट आवाज़ का उपयोग किया जा रहा है।'
  },
  ta: {
    badge: 'குரல் பதிவு வழிகாட்டி',
    listenLabel: 'வழிமுறைகளைக் கேட்க (Listen to instructions)',
    playBtn: 'வழிமுறைகளைக் கேட்க',
    playingLabel: 'படி வழிமுறைகள் வாசிக்கப்படுகின்றன…',
    stopBtn: 'நிறுத்து',
    replayBtn: 'மீண்டும் கேட்க',
    stepIndicator: (step) => `படி ${step} / 3 குரல் உதவி`,
    privacyNote:
      'தனியுரிமை பாதுகாப்பு: பொதுவான வழிமுறைகள் மட்டுமே வாசிக்கப்படும். உங்கள் பெயர், கைபேசி எண் அல்லது டோக்கன் ஒருபோதும் வாசிக்கப்படாது.',
    unavailableMsg:
      'இந்த உலாவி அல்லது சாதனத்தில் குரல் வழிகாட்டி வசதி இல்லை. கீழே உள்ள எழுத்து வழிமுறைகளைப் பின்பற்றவும்.',
    errorMsg:
      'இந்த சாதனத்தில் குரல் ஒலியை இயக்க முடியவில்லை. திரையில் உள்ள எழுத்து வழிமுறைகளைப் பின்பற்றவும்.',
    fallbackVoiceNotice:
      'இந்த மொழிக்கு சாதனத்தின் இயல்புநிலைக் குரல் பயன்படுத்தப்படுகிறது.'
  }
};

/**
 * Pure helper that returns the normalized language key, BCP-47 speech locale,
 * and predefined non-sensitive instruction script for a registration step.
 */
export function getRegistrationStepSpeech(regStep = 1, lang = 'en') {
  const normalizedLang = ['en', 'hi', 'ta'].includes(lang) ? lang : 'en';
  const normalizedStep = [1, 2, 3].includes(Number(regStep)) ? Number(regStep) : 1;
  const speechLang = REGISTRATION_SPEECH_LANG_MAP[normalizedLang] || 'en-IN';
  const text =
    REGISTRATION_VOICE_SCRIPTS[normalizedLang]?.[normalizedStep] ||
    REGISTRATION_VOICE_SCRIPTS.en[normalizedStep];

  return {
    lang: normalizedLang,
    step: normalizedStep,
    speechLang,
    text
  };
}

/**
 * Inspects browser speechSynthesis support and selects the best available voice
 * for the requested language without failing when language-specific voices are absent.
 */
export function resolveRegistrationSpeechVoice(lang = 'en') {
  const normalizedLang = ['en', 'hi', 'ta'].includes(lang) ? lang : 'en';
  const speechLang = REGISTRATION_SPEECH_LANG_MAP[normalizedLang] || 'en-IN';
  const langPrefix = normalizedLang;

  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    !window.speechSynthesis ||
    typeof window.SpeechSynthesisUtterance === 'undefined'
  ) {
    return {
      supported: false,
      speechLang,
      voice: null,
      exactLocaleMatch: false,
      languageMatch: false,
      voicesCount: 0
    };
  }

  let voices = [];
  try {
    if (typeof window.speechSynthesis.getVoices === 'function') {
      const rawVoices = window.speechSynthesis.getVoices();
      if (Array.isArray(rawVoices)) {
        voices = rawVoices;
      }
    }
  } catch {
    voices = [];
  }

  const normalizedTarget = speechLang.toLowerCase();
  const exactVoice =
    voices.find(
      (v) =>
        v &&
        typeof v.lang === 'string' &&
        v.lang.toLowerCase().replace('_', '-') === normalizedTarget
    ) || null;

  const prefixVoice =
    exactVoice ||
    voices.find(
      (v) =>
        v &&
        typeof v.lang === 'string' &&
        v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
    ) ||
    null;

  const defaultVoice =
    prefixVoice || voices.find((v) => v && v.default) || voices[0] || null;

  return {
    supported: true,
    speechLang,
    voice: prefixVoice || defaultVoice || null,
    exactLocaleMatch: Boolean(exactVoice),
    languageMatch: Boolean(prefixVoice),
    voicesCount: voices.length
  };
}

/**
 * Stateful controller managing Web Speech API playback, cancellation, replay,
 * step transitions, language transitions, and async voice loading.
 */
export function createRegistrationVoiceController({
  initialLang = 'en',
  initialStep = 1,
  onStateChange = null
} = {}) {
  let currentLang = ['en', 'hi', 'ta'].includes(initialLang) ? initialLang : 'en';
  let currentStep = [1, 2, 3].includes(Number(initialStep)) ? Number(initialStep) : 1;
  let isSpeaking = false;
  let statusMessage = '';
  let voiceCapability = resolveRegistrationSpeechVoice(currentLang);
  let activeUtterance = null;
  let detachVoicesListener = null;

  function notify() {
    if (typeof onStateChange === 'function') {
      onStateChange(getState());
    }
  }

  function getState() {
    const script = getRegistrationStepSpeech(currentStep, currentLang);
    return {
      lang: currentLang,
      regStep: currentStep,
      speechLang: script.speechLang,
      text: script.text,
      isSpeaking,
      statusMessage,
      voiceCapability
    };
  }

  function refreshVoices() {
    voiceCapability = resolveRegistrationSpeechVoice(currentLang);
    notify();
    return voiceCapability;
  }

  function stop() {
    activeUtterance = null;
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis &&
      typeof window.speechSynthesis.cancel === 'function'
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser cancel errors
      }
    }
    isSpeaking = false;
    notify();
  }

  function play() {
    const ui = REGISTRATION_VOICE_UI[currentLang] || REGISTRATION_VOICE_UI.en;
    voiceCapability = resolveRegistrationSpeechVoice(currentLang);

    if (!voiceCapability.supported) {
      isSpeaking = false;
      statusMessage = ui.unavailableMsg;
      notify();
      return false;
    }

    const { text, speechLang } = getRegistrationStepSpeech(currentStep, currentLang);

    try {
      // Cancel any prior speech to prevent overlapping utterances
      if (typeof window.speechSynthesis.cancel === 'function') {
        window.speechSynthesis.cancel();
      }

      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      if (voiceCapability.voice) {
        utterance.voice = voiceCapability.voice;
      }
      utterance.rate = 0.95;

      activeUtterance = utterance;

      utterance.onend = () => {
        if (activeUtterance === utterance) {
          activeUtterance = null;
          isSpeaking = false;
          notify();
        }
      };

      utterance.onerror = () => {
        if (activeUtterance === utterance) {
          activeUtterance = null;
        }
        isSpeaking = false;
        const latestUi =
          REGISTRATION_VOICE_UI[currentLang] || REGISTRATION_VOICE_UI.en;
        statusMessage = latestUi.errorMsg;
        notify();
      };

      if (voiceCapability.voicesCount > 0 && !voiceCapability.languageMatch) {
        statusMessage = ui.fallbackVoiceNotice;
      } else {
        statusMessage = '';
      }

      isSpeaking = true;
      window.speechSynthesis.speak(utterance);
      notify();
      return true;
    } catch {
      activeUtterance = null;
      isSpeaking = false;
      statusMessage = ui.errorMsg;
      notify();
      return false;
    }
  }

  function replay() {
    return play();
  }

  function setStep(nextStep) {
    const normalized = [1, 2, 3].includes(Number(nextStep)) ? Number(nextStep) : 1;
    if (normalized !== currentStep) {
      currentStep = normalized;
      statusMessage = '';
      stop();
    }
  }

  function setLang(nextLang) {
    const normalized = ['en', 'hi', 'ta'].includes(nextLang) ? nextLang : 'en';
    if (normalized !== currentLang) {
      currentLang = normalized;
      statusMessage = '';
      voiceCapability = resolveRegistrationSpeechVoice(currentLang);
      stop();
    }
  }

  function attachVoicesChangedListener() {
    if (detachVoicesListener) {
      detachVoicesListener();
      detachVoicesListener = null;
    }

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      !window.speechSynthesis
    ) {
      return () => {};
    }

    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => {
      refreshVoices();
    };

    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', handleVoicesChanged);
      detachVoicesListener = () => {
        if (typeof synth.removeEventListener === 'function') {
          synth.removeEventListener('voiceschanged', handleVoicesChanged);
        }
      };
      return detachVoicesListener;
    }

    const prevHandler = synth.onvoiceschanged;
    synth.onvoiceschanged = handleVoicesChanged;
    detachVoicesListener = () => {
      if (synth.onvoiceschanged === handleVoicesChanged) {
        synth.onvoiceschanged = prevHandler || null;
      }
    };
    return detachVoicesListener;
  }

  function dispose() {
    if (detachVoicesListener) {
      detachVoicesListener();
      detachVoicesListener = null;
    }
    stop();
  }

  return {
    play,
    stop,
    replay,
    setStep,
    setLang,
    refreshVoices,
    attachVoicesChangedListener,
    dispose,
    getState
  };
}

export default function RegistrationVoiceGuide({ lang = 'en', regStep = 1 }) {
  const normalizedLang = ['en', 'hi', 'ta'].includes(lang) ? lang : 'en';
  const normalizedStep = [1, 2, 3].includes(Number(regStep)) ? Number(regStep) : 1;
  const ui = REGISTRATION_VOICE_UI[normalizedLang] || REGISTRATION_VOICE_UI.en;

  const [, setTick] = useState(0);
  const controllerRef = useRef(null);

  if (!controllerRef.current) {
    controllerRef.current = createRegistrationVoiceController({
      initialLang: normalizedLang,
      initialStep: normalizedStep,
      onStateChange: () => {
        setTick((n) => n + 1);
      }
    });
  }

  const controller = controllerRef.current;

  // Listen for asynchronous voice list population (voiceschanged) and clean up on unmount
  useEffect(() => {
    controller.refreshVoices();
    const detach = controller.attachVoicesChangedListener();
    return () => {
      detach();
      controller.dispose();
    };
  }, [controller]);

  // Stop speech immediately when registration step or language changes
  useEffect(() => {
    controller.setStep(normalizedStep);
  }, [controller, normalizedStep]);

  useEffect(() => {
    controller.setLang(normalizedLang);
  }, [controller, normalizedLang]);

  const handlePlay = useCallback(() => {
    controller.play();
  }, [controller]);

  const handleReplay = useCallback(() => {
    controller.replay();
  }, [controller]);

  const handleStop = useCallback(() => {
    controller.stop();
  }, [controller]);

  const state = controller.getState();
  const liveCapability = resolveRegistrationSpeechVoice(normalizedLang);
  const isSupported = liveCapability.supported;

  return (
    <div
      role="region"
      aria-label={ui.badge}
      data-testid="registration-voice-guide"
      data-speech-lang={state.speechLang}
      data-reg-step={normalizedStep}
      className="rounded-2xl bg-brand-tealSoft/50 border-2 border-brand-teal/35 p-3.5 sm:p-4 space-y-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-brand-primary">
              <Volume2 className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
              <span>{ui.badge}</span>
            </span>
            <span
              data-testid="reg-voice-step-badge"
              className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-ink-secondary"
            >
              {ui.stepIndicator(normalizedStep)}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-ink-secondary flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
            <span>{ui.privacyNote}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="reg-voice-play-btn"
            aria-label={ui.listenLabel}
            onClick={handlePlay}
            className="touch-target min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-3.5 py-2 text-xs sm:text-sm shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{ui.playBtn}</span>
          </button>

          <button
            type="button"
            data-testid="reg-voice-replay-btn"
            onClick={handleReplay}
            className="touch-target min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface hover:bg-subtle text-ink-primary border border-border-strong font-bold px-3 py-2 text-xs sm:text-sm transition"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{ui.replayBtn}</span>
          </button>

          <button
            type="button"
            data-testid="reg-voice-stop-btn"
            disabled={!state.isSpeaking}
            onClick={handleStop}
            className="touch-target min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface hover:bg-red-50 text-status-emergency border border-status-emergency/40 font-bold px-3 py-2 text-xs sm:text-sm disabled:opacity-50 transition"
          >
            <Square className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{ui.stopBtn}</span>
          </button>
        </div>
      </div>

      {state.isSpeaking && (
        <p
          role="status"
          aria-live="polite"
          data-testid="reg-voice-speaking-status"
          className="text-xs font-bold text-brand-primary flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-brand-teal animate-pulse shrink-0" aria-hidden="true" />
          <span>{ui.playingLabel}</span>
        </p>
      )}

      {(!isSupported || state.statusMessage) && (
        <p
          role="status"
          aria-live="polite"
          data-testid="reg-voice-fallback-msg"
          className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5 bg-surface/90 border border-border-subtle rounded-lg px-2.5 py-1.5"
        >
          <VolumeX className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
          <span>{state.statusMessage || ui.unavailableMsg}</span>
        </p>
      )}
    </div>
  );
}
