import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  MapPin,
  MessageSquare,
  Navigation,
  RefreshCw,
  Send,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { findAccessibleRoute } from '../../shared/navigation/pathfinder.js';
import { TRANSLATIONS, getLocalizedDepartment } from '../i18n/translations.js';
import { speakTextAloud, stopAllSpeech } from '../utils/soundAlerts.js';
import VoiceListenButton from './VoiceListenButton.jsx';

const CHATBOT_COPY = {
  en: {
    launcherLabel: 'Ask Help',
    launcherAria: 'Open OPD Saathi Patient Help Chatbot',
    closeAria: 'Close Patient Help Chatbot',
    closeBtnText: 'Close',
    headerTitle: 'OPD Saathi Patient Help Assistant',
    headerSubtitle: 'Instant Live Turn Time, Room Directions & Hospital Guidance',
    autoVoiceOn: 'Auto-Voice: ON',
    autoVoiceOff: 'Auto-Voice: OFF',
    clearChat: 'Reset Chat',
    activeTokenLabel: 'Your Active OPD Slip',
    departmentRoomLabel: 'Department & Room',
    estimatedWaitLabel: 'Estimated Turn Time',
    noActiveTokenTitle: 'No Active OPD Slip on This Device',
    noActiveTokenDesc:
      'Register for a new OPD token or look up your existing token to see your exact turn countdown.',
    switchSlipLabel: 'Switch Saved Slip:',
    mobileTopicsShow: 'All Topics',
    mobileTopicsHide: 'Hide Topics',
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `Namaste! Your active token ${tokenCode} for ${deptName} (${roomLabel}) is loaded. Currently ${ahead} patient(s) are waiting ahead of you with an estimated wait time of ~${waitMins} minutes. Tap a topic or type your question below.`,
    welcomeWithoutSlip:
      'Namaste! I am your OPD Saathi Assistant. Tap any topic or type a question below to check your turn wait time, find your OPD room route, ask which department to visit for your symptoms, or check hospital timings and pharmacy info.',
    quickPromptsHeading: 'Common Questions (Tap Any Topic)',
    conversationHeading: 'Assistant Answers & Voice Readout',
    inputPlaceholder: 'Ask e.g. "How long for my turn?", "Fever doctor room?", "Pharmacy?"...',
    sendBtn: 'Ask',
    chips: {
      turnTime: 'How much time for my turn?',
      myRoomRoute: 'Where is my OPD room & route?',
      allDeptWait: 'Live wait time in all departments',
      howToRegister: 'How to register for an OPD token?',
      stepFreeLift: 'Wheelchair / Lift step-free route',
      recoverToken: 'How to check or recover my slip?',
      emergencyHelp: '24x7 Emergency medical help'
    },
    actions: {
      openMyTurn: 'Open My Turn Tracker',
      openMySlip: 'View My OPD Slip',
      openFloorMap: 'Open Interactive Floor Map',
      openRegister: 'Go to OPD Registration',
      openEmergency: 'Open 24x7 Emergency Help'
    }
  },
  hi: {
    launcherLabel: 'सहायता चैट',
    launcherAria: 'ओपीडी साथी रोगी सहायता चैटबॉट खोलें',
    closeAria: 'सहायता चैटबॉट बंद करें',
    closeBtnText: 'बंद करें',
    headerTitle: 'ओपीडी साथी रोगी सहायता केंद्र',
    headerSubtitle: 'लाइव कतार समय, टोकन पर्ची और कक्ष मार्ग सहायता',
    autoVoiceOn: 'आवाज़: चालू',
    autoVoiceOff: 'आवाज़: बंद',
    clearChat: 'रीसेट करें',
    activeTokenLabel: 'आपकी सक्रिय पर्ची',
    departmentRoomLabel: 'विभाग और कमरा',
    estimatedWaitLabel: 'अनुमानित प्रतीक्षा समय',
    noActiveTokenTitle: 'इस डिवाइस पर कोई सक्रिय पर्ची नहीं है',
    noActiveTokenDesc:
      'अपनी बारी का सटीक समय जानने के लिए नया ओपीडी टोकन पंजीकृत करें या पुराना टोकन खोजें।',
    switchSlipLabel: 'सहेजी गई पर्ची चुनें:',
    mobileTopicsShow: 'सभी प्रश्न',
    mobileTopicsHide: 'प्रश्न छुपाएं',
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `नमस्ते! आपकी सक्रिय टोकन पर्ची ${tokenCode} (${deptName}, ${roomLabel}) उपलब्ध है। अभी आपसे आगे ${ahead} मरीज़ हैं और अनुमानित प्रतीक्षा समय लगभग ~${waitMins} मिनट है। कोई भी प्रश्न चुनें या नीचे लिखें।`,
    welcomeWithoutSlip:
      'नमस्ते! मैं आपका ओपीडी साथी सहायक हूँ। आप मुझसे अपनी बारी का समय, ओपीडी कमरा खोजने का रास्ता, लक्षणों के अनुसार विभाग, फार्मेसी या नया पंजीकरण करने का तरीका पूछ सकते हैं।',
    quickPromptsHeading: 'सामान्य प्रश्न (पूछने के लिए टैप करें)',
    conversationHeading: 'सहायक उत्तर और ध्वनि सुविधा',
    inputPlaceholder: 'अपना प्रश्न लिखें, जैसे "मेरी बारी में कितना समय है?" या "बुखार के डॉक्टर कहाँ हैं?"...',
    sendBtn: 'पूछें',
    chips: {
      turnTime: 'मेरी बारी आने में कितना समय लगेगा?',
      myRoomRoute: 'मेरा ओपीडी कमरा और रास्ता कहाँ है?',
      allDeptWait: 'सभी विभागों का लाइव प्रतीक्षा समय',
      howToRegister: 'ओपीडी टोकन के लिए पंजीकरण कैसे करें?',
      stepFreeLift: 'व्हीलचेयर / लिफ्ट (बिना सीढ़ी) रास्ता',
      recoverToken: 'पुरानी पर्ची या टोकन कैसे देखें?',
      emergencyHelp: '24x7 आपातकालीन चिकित्सा सहायता'
    },
    actions: {
      openMyTurn: 'मेरी बारी ट्रैकर खोलें',
      openMySlip: 'मेरी ओपीडी पर्ची देखें',
      openFloorMap: 'अस्पताल का नक्शा खोलें',
      openRegister: 'नया पंजीकरण करें',
      openEmergency: '24x7 आपातकालीन सहायता'
    }
  },
  ta: {
    launcherLabel: 'உதவி சாட்',
    launcherAria: 'ஓபிடி சாத்தி நோயாளி உதவி சாட்பாட்டைத் திறக்கவும்',
    closeAria: 'உதவி சாட்பாட்டை மூடு',
    closeBtnText: 'மூடு',
    headerTitle: 'ஓपीடி சாத்தி நோயாளி உதவியாளர்',
    headerSubtitle: 'நேரடி வரிசை நேரம், டோக்கன் மற்றும் வழித்தட உதவி',
    autoVoiceOn: 'குரல்: ஆன்',
    autoVoiceOff: 'குரல்: ஆஃப்',
    clearChat: 'மீட்டமை',
    activeTokenLabel: 'செயலில் உள்ள சீட்டு',
    departmentRoomLabel: 'பிரிவு மற்றும் அறை',
    estimatedWaitLabel: 'தோராயமான காத்திருப்பு',
    noActiveTokenTitle: 'செயலில் உள்ள டோக்கன் சீட்டு இல்லை',
    noActiveTokenDesc:
      'உங்கள் வரிசை நேரத்தை அறிய புதிய ஓபிடி டோக்கன் பதிவு செய்யவும் அல்லது ஏற்கனவே உள்ள எண்ணை உள்ளிடவும்.',
    switchSlipLabel: 'சேமித்த சீட்டை மாற்றவும்:',
    mobileTopicsShow: 'கேள்விகள்',
    mobileTopicsHide: 'மறை',
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `வணக்கம்! உங்கள் டோக்கன் ${tokenCode} (${deptName}, ${roomLabel}) தயாராக உள்ளது. உங்களுக்கு முன் ${ahead} நோயாளிகள் உள்ளனர், தோராயமான காத்திருப்பு நேரம் ~${waitMins} நிமிடங்கள். கேள்வியைத் தேர்ந்தெடுக்கவும்.`,
    welcomeWithoutSlip:
      'வணக்கம்! நான் உங்கள் ஓபிடி சாத்தி உதவியாளர். உங்கள் முறை வர எவ்வளவு நேரம் ஆகும், உங்கள் அறை எங்கே உள்ளது, மருந்தகம் அல்லது வரிசை நிலவரம் குறித்து என்னிடம் கேட்கலாம்.',
    quickPromptsHeading: 'பொதுவான கேள்விகள் (தட்டவும்)',
    conversationHeading: 'பதில்கள் மற்றும் குரல் உதவி',
    inputPlaceholder: 'உங்கள் கேள்வியை உள்ளிடவும் எ.கா. "என் முறைக்கு எவ்வளவு நேரம் ஆகும்?"...',
    sendBtn: 'கேள்',
    chips: {
      turnTime: 'என் முறை வர எவ்வளவு நேரம் ஆகும்?',
      myRoomRoute: 'எனது ஓபிடி அறை மற்றும் வழி எங்கே?',
      allDeptWait: 'அனைத்து பிரிவுகளின் காத்திருப்பு நேரம்',
      howToRegister: 'புதிய டோக்கன் பதிவு செய்வது எப்படி?',
      stepFreeLift: 'சக்கர நாற்காலி / லிப்ட் வழித்தடம்',
      recoverToken: 'டோக்கன் சீட்டை மீண்டும் பார்ப்பது எப்படி?',
      emergencyHelp: '24x7 அவசர மருத்துவ உதவி'
    },
    actions: {
      openMyTurn: 'என் முறை டிராக்கரைத் திற',
      openMySlip: 'எனது ஓபிடி சீட்டைப் பார்',
      openFloorMap: 'தள வரைபடத்தைத் திற',
      openRegister: 'ஓபிடி பதிவுக்குச் செல்',
      openEmergency: '24x7 அவசர உதவி'
    }
  }
};

// Known short medical/hospital abbreviations so short valid queries are never flagged as gibberish
const KNOWN_SHORT_TOKENS = new Set([
  'hi', 'hey', 'hlw', 'hlo', 'ok', 'yes', 'no', 'opd', 'ent', 'ecg', 'ekg',
  'mri', 'ct', 'icu', 'er', 'dr', 'id', 'qr', 'pin', 'bp', 'tb', 'anc',
  'pnc', 'ors', 'iv', 'lab', 'eye', 'ear', 'leg', 'arm', 'jaw', 'hip',
  'fee', 'map', 'way', 'bus', 'car', 'cab', 'age', 'sex', 'gen', 'ped',
  'ort', 'gyn', 'new', 'old', '108', '112', '204', '208', '212', '305'
]);

/**
 * Detects gibberish, keyboard smashes, random symbol/number strings, or meaningless character runs.
 */
export function isGibberishOrInvalidInput(rawQuery) {
  const trimmed = String(rawQuery || '').trim();
  if (!trimmed || trimmed.length < 2) return true;

  const lower = trimmed.toLowerCase();

  // Allow emergency numbers or room numbers directly
  if (/^(108|112|204|208|212|305)$/.test(lower)) return false;

  // Allow valid token patterns like GEN-001, OPD-GEN-001, PED-12
  if (/\b(opd[-\s]?)?(gen|ped|ort|gyn)[-\s]?\d{1,4}\b/i.test(lower)) return false;

  // Check if there are any Indic (Devanagari / Tamil) characters
  const hasIndicChars = /[\u0900-\u097F\u0B80-\u0BFF]/.test(lower);
  if (hasIndicChars) {
    // Reject repeated single Indic character mash like "ककककक"
    if (/(.)\1{3,}/u.test(lower)) return true;
    return false;
  }

  // Must contain at least one ASCII letter if not Indic or emergency/room number
  const asciiLetters = (lower.match(/[a-z]/g) || []).length;
  if (asciiLetters === 0) return true;

  // If symbols/digits heavily outweigh letters (and not a token/room query)
  const nonSpaceLen = lower.replace(/\s+/g, '').length;
  if (asciiLetters / nonSpaceLen < 0.45) return true;

  // Reject 4+ identical consecutive characters (e.g., "aaaa", "zzzzzz", "هههه")
  if (/([a-z])\1{3,}/i.test(lower)) return true;

  // Reject classic QWERTY keyboard row smashes
  if (
    /(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|lkjh|poiu|mnbv|qazw|wsxe)/i.test(
      lower
    )
  ) {
    return true;
  }

  // Split into alphabetic words
  const words = lower.match(/[a-z0-9]+/g) || [];
  if (words.length === 0) return true;

  let validLookingWords = 0;

  for (const word of words) {
    if (KNOWN_SHORT_TOKENS.has(word)) {
      validLookingWords += 1;
      continue;
    }

    // Pure numbers that aren't recognized codes
    if (/^\d+$/.test(word)) {
      continue;
    }

    // 5+ consecutive consonants in English/Hinglish is almost always a keyboard smash (e.g. "bcdfgh", "xkcdw")
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(word)) {
      return true;
    }

    // Words of 4+ letters must have at least one vowel (a, e, i, o, u, y)
    const vowels = (word.match(/[aeiouy]/g) || []).length;
    if (word.length >= 4 && vowels === 0) {
      return true;
    }

    // Reject alternating 2-char mash like "ababab" or "jkjkjk"
    if (/^([a-z]{2})\1{2,}$/i.test(word)) {
      return true;
    }

    // Check vowel-to-length ratio for long single words (e.g. "dfghjklp" or "aeioughjk")
    const ratio = vowels / word.length;
    if (word.length >= 6 && (ratio < 0.15 || ratio > 0.85)) {
      return true;
    }

    if (word.length >= 2 && vowels >= 1) {
      validLookingWords += 1;
    }
  }

  return validLookingWords === 0;
}

export default function PatientHelpChatbot({
  lang = 'en',
  t: passedT = null,
  activeSlip = null,
  savedSlips = [],
  departments = [],
  boardItems = [],
  onNavigate,
  onOpenDirections,
  onOpenEmergency,
  onSelectSavedSlip
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMobileTopics, setShowMobileTopics] = useState(false);
  const messagesEndRef = useRef(null);

  const t = passedT || TRANSLATIONS[lang] || TRANSLATIONS.en;
  const copy = CHATBOT_COPY[lang] || CHATBOT_COPY.en;

  // Lock background page scroll while the chatbot modal is open so scrolling inside never moves the background page
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopAllSpeech();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Resolve primary active slip (either passed activeSlip or most recent savedSlip)
  const resolvedSlip = useMemo(() => {
    if (activeSlip && (activeSlip.publicCode || activeSlip.tokenCode)) {
      return activeSlip;
    }
    if (Array.isArray(savedSlips) && savedSlips.length > 0) {
      const first = savedSlips[0];
      if (first?.ticket && (first.ticket.publicCode || first.ticket.tokenCode)) {
        return first.ticket;
      }
    }
    return null;
  }, [activeSlip, savedSlips]);

  // Enrich slip queue metrics with live boardItems & localized department data
  const liveSlipInfo = useMemo(() => {
    if (!resolvedSlip) return null;

    const tokenCode = resolvedSlip.publicCode || resolvedSlip.tokenCode;
    const deptObj = resolvedSlip.department || {};
    const deptSlug = deptObj.slug || resolvedSlip.departmentSlug || resolvedSlip.departmentId;

    const liveDeptBoard = Array.isArray(boardItems)
      ? boardItems.find(
          (b) =>
            b.slug === deptSlug ||
            b.id === resolvedSlip.departmentId ||
            b.departmentId === resolvedSlip.departmentId
        )
      : null;

    const locDept = getLocalizedDepartment(
      Object.keys(deptObj).length > 0 ? deptObj : liveDeptBoard || { slug: deptSlug },
      lang,
      t
    );

    const status = resolvedSlip.status || 'WAITING';
    const peopleAhead =
      typeof resolvedSlip.queue?.peopleAheadWaiting === 'number'
        ? resolvedSlip.queue.peopleAheadWaiting
        : typeof liveDeptBoard?.waitingCount === 'number'
          ? Math.max(0, liveDeptBoard.waitingCount - 1)
          : 0;

    const estWaitMins =
      typeof resolvedSlip.queue?.estimatedWaitMinutes === 'number'
        ? resolvedSlip.queue.estimatedWaitMinutes
        : typeof liveDeptBoard?.estimatedWaitMinutes === 'number'
          ? liveDeptBoard.estimatedWaitMinutes
          : peopleAhead * 7;

    const nowServing =
      resolvedSlip.queue?.nowServingCode ||
      liveDeptBoard?.nowServingCode ||
      liveDeptBoard?.nowServing?.tokenCode ||
      tokenCode;

    const floorNum = deptObj.floor_number ?? liveDeptBoard?.floor_number ?? 0;
    const floorLabel =
      (t?.floors && t.floors[floorNum]) || deptObj.floor || `Floor ${floorNum}`;

    const roomLabel =
      deptObj.room_label ||
      liveDeptBoard?.room_label ||
      deptObj.room ||
      'OPD Room';

    const destNodeId =
      deptObj.destination_node_id ||
      deptObj.destinationNodeId ||
      liveDeptBoard?.destination_node_id ||
      departments.find((d) => d.slug === deptSlug || d.id === resolvedSlip.departmentId)
        ?.destination_node_id ||
      'room_204_med';

    return {
      id: resolvedSlip.id,
      tokenCode,
      patientName:
        resolvedSlip.patientSummary?.fullName || resolvedSlip.patientName || null,
      status,
      peopleAhead,
      estWaitMins,
      nowServing,
      deptName: locDept.name || deptObj.name_en || 'OPD Department',
      roomLabel,
      floorLabel,
      landmarkLabel: locDept.landmark || deptObj.landmark_en || 'Main Corridor',
      doctorName: locDept.doctor || deptObj.doctor_name_en || 'Duty Medical Officer',
      destNodeId
    };
  }, [resolvedSlip, boardItems, departments, lang, t]);

  // Build initial greeting message whenever language or active token changes
  const initialGreetingMessage = useMemo(() => {
    const text = liveSlipInfo
      ? copy.welcomeWithSlip(
          liveSlipInfo.tokenCode,
          liveSlipInfo.deptName,
          liveSlipInfo.estWaitMins,
          liveSlipInfo.peopleAhead,
          liveSlipInfo.roomLabel
        )
      : copy.welcomeWithoutSlip;

    return {
      id: 'welcome-msg',
      sender: 'bot',
      text,
      actionType: liveSlipInfo ? 'my-turn' : 'register',
      secondaryActionType: liveSlipInfo ? 'slip' : 'my-turn'
    };
  }, [liveSlipInfo, copy]);

  const [messages, setMessages] = useState([initialGreetingMessage]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [initialGreetingMessage];
      }
      return [initialGreetingMessage, ...prev.slice(1)];
    });
  }, [initialGreetingMessage]);

  useEffect(() => {
    if (
      isOpen &&
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen]);

  // Helper to format department queue summary cleanly without blank names
  const formatDepartmentBoardSummary = (maxItems = 6) => {
    const sourceList =
      Array.isArray(boardItems) && boardItems.length > 0 ? boardItems : departments;
    if (!Array.isArray(sourceList) || sourceList.length === 0) {
      return lang === 'hi'
        ? 'सामान्य चिकित्सा, हड्डी रोग, बाल रोग, स्त्री रोग (त्वरित परामर्श उपलब्ध)'
        : lang === 'ta'
          ? 'பொது மருத்துவம், எலும்பியல், குழந்தைகள் நலம் (உடனடி ஆலோசனை)'
          : 'General Medicine, Orthopaedics, Paediatrics, Gynaecology (Open for immediate registration)';
    }

    return sourceList
      .slice(0, maxItems)
      .map((item) => {
        const loc = getLocalizedDepartment(item, lang, t);
        const deptTitle =
          loc.name || item.name_en || item.slug || 'OPD Department';
        const room = item.room_label || item.room || '';
        const waiting = typeof item.waitingCount === 'number' ? item.waitingCount : 0;
        const waitMins =
          typeof item.estimatedWaitMinutes === 'number'
            ? item.estimatedWaitMinutes
            : waiting * 7;
        const serving =
          item.nowServingCode || item.nowServing?.tokenCode || (waiting === 0 ? 'Open' : '--');

        if (lang === 'hi') {
          return `${deptTitle}${room ? ` (${room})` : ''}: ~${waitMins} मिनट (${waiting} प्रतीक्षारत)`;
        }
        if (lang === 'ta') {
          return `${deptTitle}${room ? ` (${room})` : ''}: ~${waitMins} நிமிடம் (${waiting} காத்திருப்பு)`;
        }
        return `${deptTitle}${room ? ` (${room})` : ''}: ~${waitMins} mins (${waiting} waiting, Serving: ${serving})`;
      })
      .join('  •  ');
  };

  // Build deterministic, live-data-driven answer for an intent
  const buildBotResponse = (intentKey, userLabel) => {
    if (intentKey === 'turn_time') {
      if (liveSlipInfo) {
        let answerText = '';
        if (lang === 'hi') {
          if (liveSlipInfo.status === 'CALLED' || liveSlipInfo.status === 'IN_CONSULTATION') {
            answerText = `आपका टोकन ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) अभी बुलाया गया है! कृपया तुरंत ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel}) में ${liveSlipInfo.doctorName} के पास पहुँचें।`;
          } else if (liveSlipInfo.status === 'COMPLETED') {
            answerText = `आपका टोकन ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) का परामर्श पूरा हो चुका है। दवाई के लिए भूतल फार्मेसी काउंटर पर जाएं।`;
          } else {
            answerText = `आपके टोकन ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) की बारी आने में लगभग ~${liveSlipInfo.estWaitMins} मिनट का समय है। अभी कतार में आपसे आगे ${liveSlipInfo.peopleAhead} मरीज़ हैं और वर्तमान में टोकन ${liveSlipInfo.nowServing} देखा जा रहा है। आपका कक्ष: ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel})।`;
          }
        } else if (lang === 'ta') {
          if (liveSlipInfo.status === 'CALLED' || liveSlipInfo.status === 'IN_CONSULTATION') {
            answerText = `உங்கள் டோக்கன் ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) இப்போது அழைக்கப்பட்டுள்ளது! உடனடியாக ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel}) அறைக்குச் செல்லவும்.`;
          } else if (liveSlipInfo.status === 'COMPLETED') {
            answerText = `உங்கள் டோக்கன் ${liveSlipInfo.tokenCode} ஆலோசனை முடிந்தது. மருந்துகளுக்கு தரை தளம் மருந்தகத்திற்குச் செல்லவும்.`;
          } else {
            answerText = `உங்கள் டோக்கன் ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) முறை வர தோராயமாக ~${liveSlipInfo.estWaitMins} நிமிடங்கள் ஆகும். உங்களுக்கு முன் ${liveSlipInfo.peopleAhead} நோயாளிகள் காத்திருக்கின்றனர். தற்போது நடைபெறும் டோக்கன்: ${liveSlipInfo.nowServing}. அறை: ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel}).`;
          }
        } else {
          if (liveSlipInfo.status === 'CALLED' || liveSlipInfo.status === 'IN_CONSULTATION') {
            answerText = `Your token ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) is CALLED NOW! Please proceed immediately to ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel}) to meet ${liveSlipInfo.doctorName}.`;
          } else if (liveSlipInfo.status === 'COMPLETED') {
            answerText = `Consultation for your token ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) is marked COMPLETED. You may proceed to the Ground Floor Pharmacy.`;
          } else {
            answerText = `For your token ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}), the estimated wait time is ~${liveSlipInfo.estWaitMins} minutes. There are currently ${liveSlipInfo.peopleAhead} patient(s) ahead of you, and token ${liveSlipInfo.nowServing} is being served right now at ${liveSlipInfo.roomLabel} (${liveSlipInfo.floorLabel}).`;
          }
        }
        return {
          question: userLabel,
          text: answerText,
          actionType: 'my-turn',
          secondaryActionType: 'slip'
        };
      }

      const summaryLines = formatDepartmentBoardSummary(3);
      const noSlipText =
        lang === 'hi'
          ? `इस डिवाइस पर अभी कोई सक्रिय ओपीडी पर्ची चयनित नहीं है। यदि आपके पास टोकन नंबर या पंजीकृत फ़ोन नंबर है, तो 'मेरी बारी ट्रैकर' में अपना समय देखें, या नया टोकन पंजीकृत करें। वर्तमान विभाग कतार: ${summaryLines}।`
          : lang === 'ta'
            ? `இந்த சாதனத்தில் செயலில் உள்ள ஓபிடி சீட்டு எதுவும் இல்லை. உங்கள் டோக்கன் எண் அல்லது தொலைபேசி எண்ணைக் கொண்டு 'என் முறை' பக்கத்தில் நேரத்தை அறியலாம் அல்லது புதிய டோக்கன் பதிவு செய்யலாம். தற்போதைய வரிசை: ${summaryLines}.`
            : `You do not have an active OPD slip selected on this device right now. If you already have a token code or registered phone number, open 'My Turn Tracker' to check your exact wait time, or register for a new token. Current live queues: ${summaryLines}.`;

      return {
        question: userLabel,
        text: noSlipText,
        actionType: 'my-turn',
        secondaryActionType: 'register'
      };
    }

    if (intentKey === 'my_room_route') {
      const targetNodeId = liveSlipInfo?.destNodeId || 'room_204_med';
      const routeResult = findAccessibleRoute({
        fromNodeId: 'registration_desk',
        toNodeId: targetNodeId,
        avoidStairs: true
      });

      const stepInstructions = (routeResult?.steps || [])
        .slice(0, 3)
        .map((s, idx) => {
          const inst =
            lang === 'hi'
              ? s.instruction_hi || s.instruction_en
              : lang === 'ta'
                ? s.instruction_ta || s.instruction_en
                : s.instruction_en;
          return `${idx + 1}) ${inst}`;
        })
        .join(' ');

      if (liveSlipInfo) {
        const routeText =
          lang === 'hi'
            ? `आपका टोकन ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) कक्ष: ${liveSlipInfo.roomLabel}, मंज़िल: ${liveSlipInfo.floorLabel} (पहचान: ${liveSlipInfo.landmarkLabel}) में है। डॉक्टर: ${liveSlipInfo.doctorName}। रास्ता: ${stepInstructions}`
            : lang === 'ta'
              ? `உங்கள் டோக்கன் ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) அறை: ${liveSlipInfo.roomLabel}, தளம்: ${liveSlipInfo.floorLabel} (அடையாளம்: ${liveSlipInfo.landmarkLabel}). மருத்துவர்: ${liveSlipInfo.doctorName}. வழி: ${stepInstructions}`
              : `Your token ${liveSlipInfo.tokenCode} (${liveSlipInfo.deptName}) is at ${liveSlipInfo.roomLabel} on ${liveSlipInfo.floorLabel} (Landmark: ${liveSlipInfo.landmarkLabel}, Doctor: ${liveSlipInfo.doctorName}). Step-free route from Registration Desk: ${stepInstructions}`;

        return {
          question: userLabel,
          text: routeText,
          actionType: 'navigate',
          destNodeId: targetNodeId
        };
      }

      const fallbackRouteText =
        lang === 'hi'
          ? `भूतल पर पंजीकरण काउंटर 1-3, आपातकालीन कक्ष 1 और फार्मेसी हैं। पहली मंज़िल पर सामान्य चिकित्सा (कमरा 204), बाल रोग (कमरा 208) और हड्डी रोग (कमरा 212) हैं। दूसरी मंज़िल पर स्त्री रोग (कमरा 305) है। इंटरैक्टिव नक्शा खोलने के लिए नीचे बटन दबाएं।`
          : lang === 'ta'
            ? `தரை தளத்தில் பதிவு கவுண்டர் 1-3, அவசர சிகிச்சை அறை 1 மற்றும் மருந்தகம் உள்ளன. முதல் தளத்தில் பொது மருத்துவம் (அறை 204), குழந்தைகள் நலம் (அறை 208), எலும்பியல் (அறை 212) உள்ளன. வரைபடத்தைத் திறக்க கீழே தட்டவும்.`
            : `Ground Floor houses Registration Counters 1-3, Emergency Room 1, and the Pharmacy. First Floor (via Central Ramp or Patient Lift) houses General Medicine (Room 204), Paediatrics (Room 208), and Orthopaedics (Room 212). Second Floor houses Gynaecology (Room 305). Tap below to open the interactive Floor Map.`;

      return {
        question: userLabel,
        text: fallbackRouteText,
        actionType: 'navigate',
        destNodeId: 'room_204_med'
      };
    }

    if (intentKey === 'all_departments_wait') {
      const joined = formatDepartmentBoardSummary(8);
      const header =
        lang === 'hi'
          ? `अस्पताल के सभी ओपीडी विभागों का लाइव प्रतीक्षा समय: ${joined}`
          : lang === 'ta'
            ? `அனைத்து ஓபிடி பிரிவுகளின் நேரடி காத்திருப்பு நேரம்: ${joined}`
            : `Live queue & estimated wait times across all OPD departments: ${joined}`;

      return {
        question: userLabel,
        text: header,
        actionType: 'register',
        secondaryActionType: 'my-turn'
      };
    }

    if (intentKey === 'how_to_register') {
      const regText =
        lang === 'hi'
          ? `ओपीडी टोकन प्राप्त करने के 3 आसान चरण हैं: 1) अपना ओपीडी विभाग चुनें (सामान्य चिकित्सा, बाल रोग, हड्डी रोग या स्त्री रोग)। 2) मरीज़ का नाम, आयु और मोबाइल नंबर दर्ज करें। 3) 'टोकन प्राप्त करें' दबाएं — आपको तुरंत टोकन नंबर, कमरा नंबर और अनुमानित समय वाली पर्ची मिल जाएगी।`
          : lang === 'ta'
            ? `ஓபிடி டோக்கன் பெறுவதற்கு 3 எளிய படிகள்: 1) உங்கள் ஓபிடி பிரிவைத் தேர்ந்தெடுக்கவும். 2) நோயாளியின் பெயர், வயது மற்றும் தொலைபேசி எண்ணை உள்ளிடவும். 3) 'டோக்கன் பெறுக' என்பதைத் தட்டவும் — உடனடியாக அறை எண் மற்றும் வரிசை நேரத்துடன் டோக்கன் சீட்டு கிடைக்கும்.`
            : `Getting an OPD token takes 3 simple steps: 1) Select your medical department (General Medicine, Paediatrics, Orthopaedics, or Gynaecology). 2) Enter patient full name, age, and 10-digit phone number. 3) Confirm to generate your digital OPD slip with your token number, room number, and live queue tracker.`;

      return {
        question: userLabel,
        text: regText,
        actionType: 'register'
      };
    }

    if (intentKey === 'wheelchair_lift') {
      const liftText =
        lang === 'hi'
          ? `बिना सीढ़ी (व्हीलचेयर और बुज़ुर्गों के अनुकूल) रास्ता: मुख्य प्रवेश द्वार से सीधा केंद्रीय गलियारा पकड़ें। ऊपर की मंज़िलों के ओपीडी कमरों तक जाने के लिए केंद्रीय रैंप (Central Ramp) या रोगी लिफ्ट (Patient Lift) उपलब्ध है। हमारे नक्शे में 'सीढ़ियों से बचें' हमेशा चालू रहता है।`
          : lang === 'ta'
            ? `படிக்கட்டுகள் இல்லாத (சக்கர நாற்காலி மற்றும் முதியோர்) வழி: பிரதான நுழைவாயிலிலிருந்து நேராக மத்திய நடைபாதை வழியாகச் செல்லவும். மேல் தள ஓபிடி அறைகளுக்குச் செல்ல மத்திய சாய்வுதளம் (Ramp) மற்றும் நோயாளி லிப்ட் (Patient Lift) உள்ளன.`
            : `Step-Free Wheelchair & Senior Citizen Access: Enter via the Main Entrance barrier-free ramp. To reach First and Second Floor OPD rooms, use the Central Patient Lift or the gentle-slope Central Ramp located past the Registration Lobby. In our Floor Map, 'Avoid Stairs' mode is enabled by default.`;

      return {
        question: userLabel,
        text: liftText,
        actionType: 'navigate',
        destNodeId: liveSlipInfo?.destNodeId || 'room_204_med'
      };
    }

    if (intentKey === 'lost_token') {
      const recoverText =
        lang === 'hi'
          ? `यदि आपकी पर्ची खो गई है या आप दूसरे फ़ोन पर हैं, तो 'मेरी बारी (My Turn)' टैब खोलें। वहाँ अपना टोकन नंबर (जैसे GEN-001) या पंजीकृत 10-अंकीय मोबाइल नंबर दर्ज करके अपनी पर्ची और लाइव कतार स्थिति तुरंत वापस पाएं।`
          : lang === 'ta'
            ? `உங்கள் டோக்கன் சீட்டு தொலைந்துவிட்டால் அல்லது வேறு சாதனத்தில் பார்க்க விரும்பினால், 'என் முறை (My Turn)' பக்கத்தைத் திறந்து உங்கள் டோக்கன் எண் (எ.கா. GEN-001) அல்லது பதிவு செய்யப்பட்ட தொலைபேசி எண்ணை உள்ளிட்டு உடனடியாகப் பார்க்கலாம்.`
            : `You can recover your OPD slip anytime! Open the 'My Turn' tab and enter either your Token Code (e.g., GEN-001) or the 10-digit Phone Number used during registration to reload your digital slip and live queue countdown.`;

      return {
        question: userLabel,
        text: recoverText,
        actionType: 'my-turn'
      };
    }

    if (intentKey === 'emergency_help') {
      const emergText =
        lang === 'hi'
          ? `आपातकालीन स्थिति (तेज़ सीने में दर्द, सांस लेने में तकलीफ, गंभीर चोट या बेहोशी) में ओपीडी कतार में प्रतीक्षा न करें! तुरंत भूतल पर 'आपातकालीन कक्ष 1 (Emergency Casualty - मुख्य द्वार के बाईं ओर)' में जाएं या 108 / 112 पर कॉल करें।`
          : lang === 'ta'
            ? `அவசர மருத்துவ உதவிக்கு (நெஞ்சு வலி, மூச்சுத் திணறல், பலத்த காயம்) ஓபிடி வரிசையில் காத்திருக்க வேண்டாம்! உடனடியாக தரை தளத்தில் உள்ள 'அவசர சிகிச்சை அறை 1 (Emergency Room 1)'-க்குச் செல்லவும் அல்லது 108 / 112-ஐ அழைக்கவும்.`
            : `For medical emergencies (chest pain, breathing difficulty, severe bleeding, high fever in infants, or unconsciousness), DO NOT wait in the OPD queue. Proceed directly to Emergency Casualty Room 1 on the Ground Floor (Left Wing near Main Gate) for 24x7 immediate triage.`;

      return {
        question: userLabel,
        text: emergText,
        actionType: 'emergency'
      };
    }

    if (typeof intentKey === 'string' && intentKey.startsWith('dept:')) {
      const targetSlug = intentKey.replace('dept:', '');
      const sourceList =
        Array.isArray(boardItems) && boardItems.length > 0 ? boardItems : departments;
      const matchedDept = Array.isArray(sourceList)
        ? sourceList.find((d) => d.slug === targetSlug)
        : null;

      const fallbackDeptMeta = {
        'general-medicine': {
          name_en: 'General Medicine',
          name_hi: 'सामान्य चिकित्सा',
          name_ta: 'பொது மருத்துவம்',
          room_label: 'Room 204',
          floor_number: 1,
          doctor_name_en: 'Dr. R. K. Sharma',
          destination_node_id: 'room_204_med'
        },
        paediatrics: {
          name_en: 'Paediatrics (Child Care)',
          name_hi: 'बाल रोग विभाग',
          name_ta: 'குழந்தைகள் நலப் பிரிவு',
          room_label: 'Room 208',
          floor_number: 1,
          doctor_name_en: 'Dr. Anjali Verma',
          destination_node_id: 'room_208_paed'
        },
        orthopaedics: {
          name_en: 'Orthopaedics (Bone & Joint)',
          name_hi: 'हड्डी एवं जोड़ रोग विभाग',
          name_ta: 'எலும்பியல் பிரிவு',
          room_label: 'Room 212',
          floor_number: 1,
          doctor_name_en: 'Dr. S. Iyer',
          destination_node_id: 'room_212_ortho'
        },
        gynaecology: {
          name_en: 'Gynaecology & Obstetrics',
          name_hi: 'स्त्री एवं प्रसूति रोग विभाग',
          name_ta: 'மகளிர் மற்றும் மகப்பேறு பிரிவு',
          room_label: 'Room 305',
          floor_number: 2,
          doctor_name_en: 'Dr. Meera Nair',
          destination_node_id: 'room_305_gyn'
        }
      }[targetSlug] || {
        name_en: 'General Medicine',
        room_label: 'Room 204',
        floor_number: 1,
        doctor_name_en: 'Duty Medical Officer',
        destination_node_id: 'room_204_med'
      };

      const deptSource = matchedDept || fallbackDeptMeta;
      const loc = getLocalizedDepartment(deptSource, lang, t);
      const deptTitle = loc.name || deptSource.name_en || fallbackDeptMeta.name_en;
      const room = deptSource.room_label || fallbackDeptMeta.room_label;
      const floorNum = deptSource.floor_number ?? fallbackDeptMeta.floor_number;
      const floorLabel =
        (t?.floors && t.floors[floorNum]) || `Floor ${floorNum}`;
      const doctor = loc.doctor || deptSource.doctor_name_en || fallbackDeptMeta.doctor_name_en;
      const waiting = typeof deptSource.waitingCount === 'number' ? deptSource.waitingCount : 0;
      const waitMins =
        typeof deptSource.estimatedWaitMinutes === 'number'
          ? deptSource.estimatedWaitMinutes
          : waiting * 7;
      const destNodeId =
        deptSource.destination_node_id || fallbackDeptMeta.destination_node_id;

      const deptReply =
        lang === 'hi'
          ? `${deptTitle} परामर्श ${room} (${floorLabel}) में उपलब्ध है। डॉक्टर: ${doctor}। वर्तमान में ${waiting} मरीज़ कतार में हैं (अनुमानित प्रतीक्षा समय: ~${waitMins} मिनट)। आप नीचे दिए गए बटन से सीधा रास्ता देख सकते हैं या टोकन बुक कर सकते हैं।`
          : lang === 'ta'
            ? `${deptTitle} ஆலோசனை ${room} (${floorLabel})-இல் நடைபெறுகிறது. மருத்துவர்: ${doctor}. தற்போது ${waiting} நோயாளிகள் காத்திருக்கின்றனர் (தோராயமான நேரம்: ~${waitMins} நிமிடங்கள்). கீழே உள்ள பொத்தானை அழுத்தி வழியைப் பார்க்கலாம் அல்லது டோக்கன் பெறலாம்.`
            : `${deptTitle} is located at ${room} on ${floorLabel} (Doctor: ${doctor}). Live queue status: ${waiting} patient(s) waiting (~${waitMins} mins estimated wait). Use the buttons below to view the step-free route on the Floor Map or register for a token.`;

      return {
        question: userLabel,
        text: deptReply,
        actionType: 'navigate',
        secondaryActionType: 'register',
        destNodeId
      };
    }

    if (intentKey === 'pharmacy_lab') {
      const pharmText =
        lang === 'hi'
          ? `निःशुल्क सरकारी फार्मेसी (दवा काउंटर) और सैंपल कलेक्शन भूतल (Ground Floor) पर मुख्य पंजीकरण हॉल के दाईं ओर स्थित हैं। डॉक्टर से परामर्श पूरा होने के बाद अपनी ओपीडी पर्ची दिखाकर वहां से निःशुल्क दवाइयां प्राप्त करें।`
          : lang === 'ta'
            ? `இலவச அரசு மருந்தகம் (Pharmacy) மற்றும் பரிசோதனை மையம் தரை தளத்தில் (Ground Floor) பிரதான பதிவு அறைக்கு அருகில் உள்ளன. மருத்துவர் ஆலோசனை முடிந்ததும் உங்கள் ஓபிடி சீட்டைக் காட்டி இலவச மருந்துகளைப் பெற்றுக்கொள்ளலாம்.`
            : `The Free Government Pharmacy (Medicine Dispensary) and Diagnostic Sample Collection Counter are located on the Ground Floor right next to the Registration Lobby. After your doctor consultation is marked COMPLETED, show your OPD slip at the Pharmacy counter to collect prescribed medicines free of cost.`;

      return {
        question: userLabel,
        text: pharmText,
        actionType: 'navigate',
        secondaryActionType: liveSlipInfo ? 'slip' : 'register',
        destNodeId: 'pharmacy_counter'
      };
    }

    if (intentKey === 'timings_fees_docs') {
      const infoText =
        lang === 'hi'
          ? `अस्पताल ओपीडी समय और शुल्क: ओपीडी पंजीकरण सोमवार से शनिवार सुबह 8:00 बजे से दोपहर 2:00 बजे तक खुला रहता है (आपातकालीन सेवा 24x7 खुली है)। सरकारी अस्पताल में ओपीडी टोकन और परामर्श निःशुल्क है। पंजीकरण के लिए केवल मरीज़ का नाम, आयु और 10-अंकीय मोबाइल नंबर पर्याप्त है।`
          : lang === 'ta'
            ? `மருத்துவமனை ஓபிடி நேரம் மற்றும் கட்டணம்: ஓபிடி பதிவு திங்கள் முதல் சனி வரை காலை 8:00 மணி முதல் மதியம் 2:00 மணி வரை செயல்படும் (அவசர சிகிச்சை 24x7). அரசு மருத்துவமனையில் ஓபிடி டோக்கன் மற்றும் ஆலோசனை முற்றிலும் இலவசம். பெயர், வயது மற்றும் மொபைல் எண் மட்டுமே போதுமானது.`
            : `Hospital Timings, Fees & Documents: OPD Registration & Consultations run Monday to Saturday, 8:00 AM – 2:00 PM IST (Emergency Casualty Room 1 is open 24x7). OPD registration and doctor consultations are Free of Cost. You only need the patient's Name, Age, and a 10-digit Mobile Number to generate a token (bringing an ID/previous reports is helpful but not mandatory for queue registration).`;

      return {
        question: userLabel,
        text: infoText,
        actionType: 'register',
        secondaryActionType: 'my-turn'
      };
    }

    if (intentKey === 'facilities_amenities') {
      const facText =
        lang === 'hi'
          ? `रोगी सुविधाएं: स्वच्छ पेयजल और दिव्यांग-अनुकूल शौचालय (Accessible Washrooms) भूतल और पहली मंज़िल पर केंद्रीय लिफ्ट के पास उपलब्ध हैं। व्हीलचेयर सहायता मुख्य प्रवेश द्वार (Main Entrance) के पास रिसेप्शन डेस्क पर निःशुल्क उपलब्ध है।`
          : lang === 'ta'
            ? `நோயாளி வசதிகள்: சுத்தமான குடிநீர் மற்றும் மாற்றுத்திறனாளிகளுக்கான கழிப்பறைகள் தரை மற்றும் முதல் தளத்தில் மத்திய லிப்ட் அருகே உள்ளன. பிரதான நுழைவாயில் அருகே சக்கர நாற்காலி (Wheelchair) வசதி இலவசமாகக் கிடைக்கும்.`
            : `Patient Facilities: Drinking water stations and accessible washrooms/restrooms are available on every floor near the Central Lift lobby. Free wheelchairs and stretcher assistance are stationed at the Ground Floor Main Entrance Help Desk.`;

      return {
        question: userLabel,
        text: facText,
        actionType: 'navigate',
        destNodeId: 'registration_desk'
      };
    }

    if (intentKey === 'kiosk_voice_help') {
      const voiceText =
        lang === 'hi'
          ? `आवाज़ और भाषा सुविधा: आप ऊपर भाषा बटन से हिंदी, तमिल या अंग्रेज़ी चुन सकते हैं। पंजीकरण फॉर्म में 'बोलकर भरें (Voice Registration)' बटन दबाकर अपना नाम और आयु बोलकर भी टोकन बना सकते हैं, और हर उत्तर को 'सुनें' बटन दबाकर आवाज़ में सुन सकते हैं।`
          : lang === 'ta'
            ? `குரல் மற்றும் மொழி உதவி: மேல் பட்டியில் தமிழ், இந்தி அல்லது ஆங்கிலம் மொழியைத் தேர்ந்தெடுக்கலாம். பதிவு படிவத்தில் குரல் வழிப் பதிவு (Voice Registration) மூலம் பேசியே டோக்கன் பெறலாம், மேலும் பதில்களை ஒலி வடிவில் கேட்கலாம்.`
            : `Voice, Language & Kiosk Features: You can switch between English, Hindi (हिंदी), and Tamil (தமிழ்) anytime from the top bar. During registration, use Voice-Assisted Registration to speak patient details hands-free, or toggle 'Auto-Voice: ON' above so I read every answer aloud.`;

      return {
        question: userLabel,
        text: voiceText,
        actionType: 'register'
      };
    }

    if (intentKey === 'greeting') {
      const greetText =
        lang === 'hi'
          ? `नमस्ते! मैं ओपीडी साथी सहायक हूँ। मैं आपकी इन कामों में तुरंत मदद कर सकता हूँ: 1) आपके टोकन की बारी आने का लाइव समय, 2) ओपीडी कमरे और मंज़िल का रास्ता, 3) बुखार, हड्डी, बच्चों या महिला रोग के लिए सही डॉक्टर/विभाग, 4) नया टोकन पंजीकरण और फार्मेसी जानकारी। कृपया नीचे कोई विकल्प चुनें या अपना सवाल लिखें।`
          : lang === 'ta'
            ? `வணக்கம்! நான் ஓபிடி சாத்தி உதவியாளர். நான் உங்களுக்கு உதவக்கூடியவை: 1) உங்கள் டோக்கன் முறை வரும் நேரம், 2) ஓபிடி அறை மற்றும் தளத்திற்கான வழி, 3) அறிகுறிகளுக்கான சரியான மருத்துவப் பிரிவு, 4) புதிய டோக்கன் பதிவு மற்றும் மருந்தக விவரம். கீழே உள்ள கேள்வியைத் தட்டவும் அல்லது தட்டச்சு செய்யவும்.`
            : `Namaste! I am your OPD Saathi Assistant. Here is what I can help you with right away: 1) Live wait time & queue position for your token, 2) Step-free directions to any OPD room or floor, 3) Which department/doctor to visit for symptoms (fever, bone/joint pain, child care, maternity), and 4) Token registration, timings, or pharmacy location.`;

      return {
        question: userLabel,
        text: greetText,
        actionType: liveSlipInfo ? 'my-turn' : 'register',
        secondaryActionType: 'navigate'
      };
    }

    if (intentKey === 'gratitude') {
      const thankText =
        lang === 'hi'
          ? `आपका स्वागत है! हम आपके उत्तम स्वास्थ्य की कामना करते हैं। यदि आपको कतार के समय या कमरे के रास्ते के बारे में कुछ और पूछना हो, तो बेझिझक पूछें।`
          : lang === 'ta'
            ? `மிக்க மகிழ்ச்சி! நீங்கள் விரைவில் குணமடைய வாழ்த்துகிறோம். வரிசை நேரம் அல்லது அறை வழி குறித்து வேறு ஏதேனும் உதவி தேவைப்பட்டால் கேளுங்கள்.`
            : `You're most welcome! Wishing you a smooth consultation and speedy recovery. Feel free to ask anytime if you need your live turn countdown or floor directions.`;

      return {
        question: userLabel,
        text: thankText,
        actionType: liveSlipInfo ? 'my-turn' : 'register'
      };
    }

    if (intentKey === 'gibberish' || intentKey === 'unrecognized') {
      const clarifyText =
        lang === 'hi'
          ? `क्षमा करें, मैं आपका यह संदेश समझ नहीं पाया ("${userLabel.slice(0, 32)}")। कृपया स्पष्ट शब्दों में पूछें या नीचे दिए गए सामान्य प्रश्नों में से एक चुनें — जैसे: "मेरी बारी में कितना समय है?", "कमरा 204 कहाँ है?", "बुखार के डॉक्टर", या "नया टोकन कैसे बनाएं?"।`
          : lang === 'ta'
            ? `மன்னிக்கவும், நீங்கள் தட்டச்சு செய்ததை ("${userLabel.slice(0, 32)}") என்னால் புரிந்துகொள்ள முடியவில்லை. தயவுசெய்து தெளிவான கேள்வியைக் கேட்கவும் அல்லது கீழே உள்ள தலைப்புகளில் ஒன்றைத் தேர்ந்தெடுக்கவும் — எ.கா: "என் முறைக்கு எவ்வளவு நேரம் ஆகும்?", "எனது அறை எங்கே?", அல்லது "புதிய டோக்கன் பதிவு".`
            : `I'm sorry, I couldn't understand "${userLabel.slice(0, 32)}". Please type a clear question about hospital OPD services or tap one of the quick topics — for example: "How much time for my turn?", "Where is Room 204?", "Which doctor for fever or bone pain?", "Pharmacy location", or "How to register?".`;

      return {
        question: userLabel,
        text: clarifyText,
        actionType: liveSlipInfo ? 'my-turn' : 'register',
        secondaryActionType: 'navigate',
        showSuggestionPills: true
      };
    }

    return buildBotResponse('unrecognized', userLabel);
  };

  // Match free-text query deterministically to one of the intents, rejecting gibberish/unrecognized inputs
  const resolveIntentFromText = (rawQuery) => {
    const q = String(rawQuery || '').toLowerCase().trim();

    // 1. Reject gibberish, random consonant smashes, or pure symbol/number strings first
    if (isGibberishOrInvalidInput(q)) {
      return 'gibberish';
    }

    // 2. High-priority Emergency triage check
    if (
      /emergency|urgent|casualty|trauma|accident|chest\s*pain|heart\s*attack|stroke|unconscious|faint|bleeding|blood|breath|suffocat|seizure|poison|burn|ambulance|\b108\b|\b112\b|आपातकाल|इमरजेंसी|गंभीर|सीने|सांस|खून|बेहोश|एम्बुलेंस|அவசர|நெஞ்சு|மூச்சு|ரத்தம்|ஆம்புலன்ஸ்/.test(
        q
      )
    ) {
      return 'emergency_help';
    }

    // 3. Specific Medical Department / Symptom / Doctor / Room queries
    if (
      /pa?ediatric|child|children|baby|infant|kid|newborn|toddl|vaccin|immuniz|verma|room\s*208|\b208\b|\bped\b|बाल रोग|बच्चा|बच्चे|बच्चों|शिशु|टीका|वर्मा|குழந்தை|தடுப்பூசி/.test(
        q
      )
    ) {
      return 'dept:paediatrics';
    }
    if (
      /ortho|bone|joint|fracture|knee|back\s*pain|spine|shoulder|neck\s*pain|sprain|arthritis|plaster|ligament|iyer|room\s*212|\b212\b|\bort\b|हड्डी|अस्थि|जोड़|फ्रैक्चर|घुटना|कमर|गर्दन|प्लास्टर|अय्यर|எலும்பியல்|எலும்பு|மூட்டு|முதுகு/.test(
        q
      )
    ) {
      return 'dept:orthopaedics';
    }
    if (
      /gyn|obstetric|pregnan|maternity|women|lady\s*doctor|female\s*doctor|antenatal|period|menstrua|pcod|pcos|delivery|nair|room\s*305|\b305\b|स्त्री|प्रसूति|गर्भवती|गर्भावस्था|महिला|लेडी|नायर|மகளிர்|கர்ப்பிணி|பிரசவம்/.test(
        q
      )
    ) {
      return 'dept:gynaecology';
    }
    if (
      /general\s*medicine|physician|internal\s*medicine|fever|cold|cough|flu|viral|infection|headache|weakness|dizziness|bp|blood\s*pressure|sugar|diabetes|thyroid|stomach|acidity|vomit|diarrhea|sharma|room\s*204|\b204\b|सामान्य चिकित्सा|बुखार|खांसी|जुकाम|सिरदर्द|शुगर|बीपी|पेट| उल्टी|शर्मा|பொது மருத்துவம்|காய்ச்சல்|இருமல்|சளி|தலைவலி|சர்க்கரை/.test(
        q
      )
    ) {
      return 'dept:general-medicine';
    }

    // 4. Wheelchair / Step-Free / Lift / Accessibility queries
    if (
      /wheelchair|lift|elevator|ramp|stair|step[\s-]*free|accessible|handicap|disabled|disability|elderly|senior|old\s*age|stretcher|सीढ़ी|सीढ़ियों|लिफ्ट|व्हीलचेयर|रैंप|बुजुर्ग|बुज़ुर्ग|दिव्यांग|லிப்ட்|சக்கர|படிக்கட்டு|முதியோர்/.test(
        q
      )
    ) {
      return 'wheelchair_lift';
    }

    // 5. Pharmacy / Medicine / Lab / X-Ray queries
    if (
      /pharmacy|medicine|chemist|drug|dispensary|prescription|tablet|pill|syrup|capsule|blood\s*test|lab|pathology|xray|x-ray|scan|ultrasound|ecg|ekg|दवाई|दवा|फार्मेसी|मेडिकल|जांच|लैब|एक्स-रे|மருந்தகம்|மருந்து|பரிசோதனை|எக்ஸ்ரே/.test(
        q
      )
    ) {
      return 'pharmacy_lab';
    }

    // 6. Hospital Timings, Fees, Cost, Documents / Aadhaar queries
    if (
      /timing|hours|open|close|closing|opening|schedule|sunday|holiday|morning|afternoon|evening|fee|fees|charge|cost|price|free|payment|money|cash|upi|aadhaar|aadhar|id\s*card|document|paper|bring|carry|समय|कब खुलता|बजे|छुट्टी|फीस|पैसा|निःशुल्क|मुफ्त|आधार|दस्तावेज|कागज|நேரம்|கட்டணம்|இலவசம்|ஆதார்|ஆவணம்/.test(
        q
      )
    ) {
      return 'timings_fees_docs';
    }

    // 7. Hospital Facilities (Washroom, Water, Parking, Canteen)
    if (
      /toilet|washroom|restroom|bathroom|loo|water|drinking|canteen|food|tea|parking|vehicle| शौचालय|बाथरूम|टॉयलेट|पानी|कैंटीन|पार्किंग|கழிப்பறை|தண்ணீர்|பார்க்கிங்/.test(
        q
      )
    ) {
      return 'facilities_amenities';
    }

    // 8. Kiosk, Voice Registration, Language, Dark Mode
    if (
      /kiosk|self[\s-]*service|touch\s*screen|voice|microphone|mic|speak|audio|sound|language|hindi|tamil|english|translate|dark\s*mode|theme|कियोस्क|आवाज़|माइक|बोलकर|भाषा|हिंदी|तमिल|கியோஸ்க்|குரல்|மைக்|மொழி|தமிழ்/.test(
        q
      )
    ) {
      return 'kiosk_voice_help';
    }

    // 9. Lost / Recover / Lookup Token by Phone or Code
    if (
      /lost|recover|forgot|forget|missing|old\s*token|old\s*slip|other\s*phone|another\s*device|lookup|search\s*token|find\s*token|mobile\s*number|phone\s*number|खो|पुरानी पर्ची|भूल|दूसरा फोन|मोबाइल|टोकन खोजें|தொலைந்து|மறந்து|பழைய சீட்டு|மொபைல்/.test(
        q
      )
    ) {
      return 'lost_token';
    }

    // 10. How to Register / Book New Token
    if (
      /register|registration|new\s*token|get\s*token|take\s*token|book|booking|appointment|apply|create\s*token|generate\s*token|how\s*to\s*get|form|पंजीकरण|रजिस्टर|नया टोकन|पर्ची कैसे|टोकन कैसे|अपॉइंटमेंट|பதிவு|புதிய|டோக்கன் பெறுவது/.test(
        q
      )
    ) {
      return 'how_to_register';
    }

    // 11. All Departments Live Wait Board
    if (
      /all\s*dept|all\s*opd|all\s*queue|every\s*dept|shortest|fastest|least\s*crowd|less\s*rush|department|queue\s*board|live\s*board|सभी विभाग|सारे विभाग|प्रतीक्षा|सबसे कम भीड़|அனைத்து/.test(
        q
      )
    ) {
      return 'all_departments_wait';
    }

    // 12. Room Route, Map, Floor, Directions
    if (
      /where|room|floor|map|direction|route|way|reach|navigate|location|building|wing|corridor|counter|doctor|कमरा|कक्ष|कहाँ|रास्ता|मंज़िल|नक्शा|दिशा|डॉक्टर|काउंटर|அறை|எங்கே|வழி|தளம்|வரைபடம்|மருத்துவர்/.test(
        q
      )
    ) {
      return 'my_room_route';
    }

    // 13. Turn Time, Queue Position, Waiting Status, or Specific Token Code
    if (
      /turn|wait|time|long|minute|hour|queue|status|position|ahead|line|serving|called|when|how\s*much|my\s*token|my\s*slip|my\s*number|\b(opd[-\s]?)?(gen|ped|ort|gyn)[-\s]?\d+\b|बारी|समय|कितना|कब|कतार|लाइन|टोकन|पर्ची|नंबर|முறை|நேரம்|எவ்வளவு|வரிசை|டோக்கன்|சீட்டு/.test(
        q
      )
    ) {
      return 'turn_time';
    }

    // 14. Greetings & Capabilities
    if (
      /\b(hi+|hello+|hey+|hlw|hlo|namaste|namaskar|vanakkam|good\s*morning|good\s*afternoon|good\s*evening|help|assist|support|start|who\s*are\s*you|what\s*can\s*you\s*do)\b|नमस्ते|नमस्कार|हेलो|हाय|मदद|सहायता|வணக்கம்|உதவி/.test(
        q
      )
    ) {
      return 'greeting';
    }

    // 15. Gratitude / Closing
    if (
      /\b(thank|thanks|thank\s*you|thx|ty|shukriya|dhanyavad|dhanyawad|ok|okay|fine|great|good|nice)\b|धन्यवाद|शुक्रिया|ठीक है|अच्छा|நன்றி|சரி/.test(
        q
      )
    ) {
      return 'gratitude';
    }

    // 16. Unrecognized query — never blindly answer with turn_time
    return 'unrecognized';
  };

  const handleAskIntent = (intentKey, customQuestionLabel) => {
    const label = customQuestionLabel || copy.chips.turnTime;
    const response = buildBotResponse(intentKey, label);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: response.question
    };
    const botMsg = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: response.text,
      actionType: response.actionType,
      secondaryActionType: response.secondaryActionType,
      destNodeId: response.destNodeId,
      showSuggestionPills: Boolean(response.showSuggestionPills)
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setShowMobileTopics(false);

    if (autoSpeak) {
      speakTextAloud(response.text, lang);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const matchedIntent = resolveIntentFromText(trimmed);
    setInputText('');
    handleAskIntent(matchedIntent, trimmed);
  };

  const handleResetChat = () => {
    stopAllSpeech();
    setMessages([initialGreetingMessage]);
    setShowMobileTopics(false);
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (next && messages.length > 0) {
      const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
      if (lastBot) {
        speakTextAloud(lastBot.text, lang);
      }
    } else {
      stopAllSpeech();
    }
  };

  const handleTriggerAction = (actionType, destNodeId) => {
    stopAllSpeech();
    if (actionType === 'my-turn' && onNavigate) {
      onNavigate('my-turn');
      setIsOpen(false);
    } else if (actionType === 'slip' && onNavigate) {
      onNavigate('slip');
      setIsOpen(false);
    } else if (actionType === 'register' && onNavigate) {
      onNavigate('register');
      setIsOpen(false);
    } else if (actionType === 'navigate') {
      if (onOpenDirections) {
        onOpenDirections({
          fromNodeId: 'registration_desk',
          toNodeId: destNodeId || liveSlipInfo?.destNodeId || 'room_204_med',
          avoidStairs: true
        });
      } else if (onNavigate) {
        onNavigate('navigate');
      }
      setIsOpen(false);
    } else if (actionType === 'emergency' && onOpenEmergency) {
      onOpenEmergency();
      setIsOpen(false);
    }
  };

  const renderActionButton = (actionType, destNodeId, isSecondary = false) => {
    if (!actionType) return null;

    let label = copy.actions.openMyTurn;
    let IconComp = Clock;

    if (actionType === 'slip') {
      label = copy.actions.openMySlip;
      IconComp = FileText;
    } else if (actionType === 'navigate') {
      label = copy.actions.openFloorMap;
      IconComp = Navigation;
    } else if (actionType === 'register') {
      label = copy.actions.openRegister;
      IconComp = ArrowRight;
    } else if (actionType === 'emergency') {
      label = copy.actions.openEmergency;
      IconComp = AlertTriangle;
    }

    return (
      <button
        type="button"
        onClick={() => handleTriggerAction(actionType, destNodeId)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-extrabold transition-all duration-100 active:scale-[0.97] ${
          actionType === 'emergency'
            ? 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
            : isSecondary
              ? 'bg-subtle text-brand-primary border-2 border-border-strong hover:bg-brand-tealSoft'
              : 'bg-brand-teal text-white hover:bg-brand-tealHover shadow-sm'
        }`}
      >
        <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Floating Circular Launcher Button: Bottom-Right on Mobile so it never blocks content, Right-Middle on Desktop */}
      <div className="fixed right-3 bottom-4 sm:right-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-40 flex flex-col items-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="patient-chatbot-launcher"
          aria-expanded={isOpen}
          aria-label={copy.launcherAria}
          title={copy.headerTitle}
          className={`group relative flex flex-col items-center justify-center w-14 h-14 sm:w-[74px] sm:h-[74px] rounded-full border-2 transition-all duration-150 active:scale-[0.96] shadow-elevated ${
            isOpen
              ? 'bg-brand-primary text-white border-[#E59838]'
              : 'bg-brand-teal text-white border-[#FFFDF9] hover:bg-brand-tealHover hover:scale-[1.04]'
          }`}
        >
          {/* Live Active Slip Wait Badge */}
          {liveSlipInfo && !isOpen && (
            <span
              className="absolute -top-1.5 -left-1.5 flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-[#1E1915] text-[10px] sm:text-[11px] font-black tracking-tight border-2 border-[#FFFDF9] shadow-sm"
              aria-hidden="true"
            >
              ~{liveSlipInfo.estWaitMins}m
            </span>
          )}

          <MessageSquare className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-extrabold leading-none mt-1 sm:mt-1.5 tracking-tight">
            {copy.launcherLabel}
          </span>
        </button>
      </div>

      {/* Dynamic Viewport-Sized Assistant Modal with Background Scroll Lock */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-1.5 sm:p-4 md:p-6 bg-[#1E1915]/65 backdrop-blur-sm overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopAllSpeech();
              setIsOpen(false);
            }
          }}
        >
          <aside
            data-testid="patient-chatbot-panel"
            role="dialog"
            aria-modal="true"
            aria-label={copy.headerTitle}
            className="w-full sm:w-[94vw] max-w-[1140px] h-[92dvh] sm:h-[86dvh] max-h-[840px] flex flex-col rounded-2xl sm:rounded-3xl bg-surface border-2 border-brand-primary shadow-elevated overflow-hidden"
          >
            {/* 1. Compact Mobile / Spacious Desktop Header */}
            <header className="shrink-0 bg-brand-primary text-white px-3.5 py-2.5 sm:px-6 sm:py-4 border-b-2 border-[#E59838]/40 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-teal flex items-center justify-center border border-[#FFFDF9]/30 shadow-sm shrink-0">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-sm sm:text-lg md:text-xl font-extrabold text-white truncate"
                    style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}
                  >
                    {copy.headerTitle}
                  </h2>
                  <p className="hidden sm:block text-xs sm:text-sm font-medium text-amber-200/95 mt-0.5 truncate">
                    {copy.headerSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                {/* Auto-Speak Voice Toggle */}
                <button
                  type="button"
                  onClick={handleToggleAutoSpeak}
                  data-testid="chatbot-auto-voice-btn"
                  aria-pressed={autoSpeak}
                  title={autoSpeak ? copy.autoVoiceOn : copy.autoVoiceOff}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-extrabold border transition-all duration-100 active:scale-[0.97] ${
                    autoSpeak
                      ? 'bg-amber-500 text-[#1E1915] border-amber-300 shadow-sm'
                      : 'bg-[#120E0C]/70 text-white border-white/25 hover:bg-[#120E0C]'
                  }`}
                >
                  {autoSpeak ? (
                    <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="hidden md:inline">
                    {autoSpeak ? copy.autoVoiceOn : copy.autoVoiceOff}
                  </span>
                </button>

                {/* Reset Chat */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#120E0C]/70 hover:bg-[#120E0C] text-white border border-white/20 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition-transform duration-100 active:scale-[0.97]"
                  title={copy.clearChat}
                >
                  <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden md:inline">{copy.clearChat}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    stopAllSpeech();
                    setIsOpen(false);
                  }}
                  data-testid="chatbot-close-btn"
                  aria-label={copy.closeAria}
                  className="inline-flex items-center gap-1 rounded-xl bg-red-700 hover:bg-red-800 text-white border border-white/20 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold transition-transform duration-100 active:scale-[0.97]"
                >
                  <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{copy.closeBtnText}</span>
                </button>
              </div>
            </header>

            {/* 2. Responsive Body: Compact Top Strip on Mobile/Tablet (<lg) | 2-Column Split on Desktop (lg+) */}
            <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
              {/* LEFT SIDEBAR ON DESKTOP / COMPACT COLLAPSIBLE STRIP ON MOBILE */}
              <div className="shrink-0 lg:col-span-5 flex flex-col lg:min-h-0 bg-subtle border-b lg:border-b-0 lg:border-r border-border-default lg:overflow-y-auto overscroll-contain px-3 py-2.5 sm:p-5 space-y-2.5 lg:space-y-5">
                {/* Mobile Compact Status & Topics Toggle Row (Visible only below lg) */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  {liveSlipInfo ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1 bg-surface border border-brand-primary/25 rounded-xl px-2.5 py-1.5 shadow-sm">
                      <span className="font-mono text-sm font-black text-brand-primary shrink-0">
                        {liveSlipInfo.tokenCode}
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary truncate">
                        {liveSlipInfo.deptName} • {liveSlipInfo.roomLabel}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black shrink-0">
                        ~{liveSlipInfo.estWaitMins}m
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 min-w-0 flex-1 bg-surface border border-border-strong rounded-xl px-2.5 py-1.5">
                      <span className="text-xs font-extrabold text-brand-primary truncate">
                        {copy.noActiveTokenTitle}
                      </span>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            stopAllSpeech();
                            onNavigate('register');
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-teal text-white px-2.5 py-1 text-[11px] font-extrabold shrink-0"
                        >
                          <span>{copy.actions.openRegister}</span>
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMobileTopics((prev) => !prev)}
                    aria-expanded={showMobileTopics}
                    className="inline-flex items-center gap-1 rounded-xl bg-surface border-2 border-border-strong px-2.5 py-1.5 text-xs font-extrabold text-brand-primary shrink-0 shadow-sm active:scale-[0.98]"
                  >
                    <span>{showMobileTopics ? copy.mobileTopicsHide : copy.mobileTopicsShow}</span>
                    {showMobileTopics ? (
                      <ChevronUp className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Horizontal Single-Row Quick Chips on Mobile when Drawer is Collapsed */}
                {!showMobileTopics && (
                  <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                    <button
                      type="button"
                      onClick={() => handleAskIntent('turn_time', copy.chips.turnTime)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-surface text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 shadow-sm active:scale-[0.98]"
                    >
                      <Clock className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                      <span>{copy.chips.turnTime}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskIntent('my_room_route', copy.chips.myRoomRoute)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-surface text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 shadow-sm active:scale-[0.98]"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand-teal shrink-0" aria-hidden="true" />
                      <span>{copy.chips.myRoomRoute}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskIntent('all_departments_wait', copy.chips.allDeptWait)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-surface text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 active:scale-[0.98]"
                    >
                      <span>{copy.chips.allDeptWait}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskIntent('how_to_register', copy.chips.howToRegister)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-surface text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 active:scale-[0.98]"
                    >
                      <span>{copy.chips.howToRegister}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskIntent('emergency_help', copy.chips.emergencyHelp)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 text-red-900 border border-red-300 px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 active:scale-[0.98]"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" aria-hidden="true" />
                      <span>{copy.chips.emergencyHelp}</span>
                    </button>
                  </div>
                )}

                {/* Desktop Active Token Card (Always visible on lg+) */}
                <div className="hidden lg:block">
                  {liveSlipInfo ? (
                    <div className="rounded-2xl bg-surface border-2 border-brand-primary/20 p-4 space-y-3 shadow-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary">
                          {copy.activeTokenLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black">
                          <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                          ~{liveSlipInfo.estWaitMins} min ({liveSlipInfo.peopleAhead} ahead)
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-3 pt-1">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-brand-primary tracking-tight">
                          {liveSlipInfo.tokenCode}
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-ink-primary text-right">
                          {liveSlipInfo.deptName} • {liveSlipInfo.roomLabel}
                        </span>
                      </div>

                      {/* Saved Slip Switcher if multiple tokens exist */}
                      {Array.isArray(savedSlips) && savedSlips.length > 1 && onSelectSavedSlip && (
                        <div className="pt-2 border-t border-border-subtle flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-ink-secondary">
                            {copy.switchSlipLabel}
                          </span>
                          {savedSlips.map((entry) => {
                            const code =
                              entry.publicCode || entry.ticket?.publicCode || entry.ticket?.tokenCode;
                            const idOrCode = entry.ticketId || entry.ticket?.id || code;
                            if (!code) return null;
                            const isCurrent = liveSlipInfo.tokenCode === code;
                            return (
                              <button
                                key={idOrCode}
                                type="button"
                                onClick={() => onSelectSavedSlip(idOrCode)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold border transition-transform duration-100 active:scale-[0.97] ${
                                  isCurrent
                                    ? 'bg-brand-teal text-white border-brand-teal'
                                    : 'bg-canvas text-ink-secondary border-border-default hover:text-brand-primary'
                                }`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface border border-border-strong p-4 space-y-3 shadow-sm">
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-brand-primary">
                          {copy.noActiveTokenTitle}
                        </h3>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {copy.noActiveTokenDesc}
                        </p>
                      </div>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            stopAllSpeech();
                            onNavigate('register');
                            setIsOpen(false);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal text-white px-4 py-2.5 text-xs sm:text-sm font-extrabold hover:bg-brand-tealHover transition-transform duration-100 active:scale-[0.98]"
                        >
                          <span>{copy.actions.openRegister}</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Common Questions Full List (Always visible on lg+, toggleable on mobile) */}
                <div
                  className={`${
                    showMobileTopics
                      ? 'block max-h-[34dvh] overflow-y-auto pr-1'
                      : 'hidden'
                  } lg:block lg:max-h-none space-y-2`}
                >
                  <h3 className="hidden lg:block text-xs font-extrabold uppercase tracking-wider text-ink-secondary px-1">
                    {copy.quickPromptsHeading}
                  </h3>

                  <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleAskIntent('turn_time', copy.chips.turnTime)}
                      data-testid="chatbot-chip-turn-time"
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border-2 border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left shadow-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.turnTime}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('my_room_route', copy.chips.myRoomRoute)}
                      data-testid="chatbot-chip-room-route"
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border-2 border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left shadow-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.myRoomRoute}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('all_departments_wait', copy.chips.allDeptWait)}
                      data-testid="chatbot-chip-all-wait"
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.allDeptWait}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('how_to_register', copy.chips.howToRegister)}
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.howToRegister}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('wheelchair_lift', copy.chips.stepFreeLift)}
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Accessibility className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.stepFreeLift}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('lost_token', copy.chips.recoverToken)}
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.recoverToken}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('emergency_help', copy.chips.emergencyHelp)}
                      className="w-full inline-flex items-center justify-between gap-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-900 border-2 border-red-300 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span className="inline-flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                        <span>{copy.chips.emergencyHelp}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT MAIN COLUMN (7 Columns on Desktop, Full Remaining Height on Mobile) */}
              <div className="flex-1 lg:col-span-7 flex flex-col min-h-0 bg-canvas overflow-hidden">
                {/* Conversation Messages Scroll Container */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-3.5 sm:space-y-5">
                  {messages.map((msg) => {
                    if (msg.sender === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[88%] sm:max-w-[82%] rounded-2xl rounded-tr-sm bg-brand-primary text-white px-3.5 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-base font-bold leading-relaxed shadow-sm break-words">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="w-full rounded-2xl rounded-tl-sm bg-surface border-2 border-border-strong p-3.5 sm:p-5 shadow-card space-y-3 sm:space-y-4">
                          <p
                            className="text-sm sm:text-base md:text-lg font-semibold text-ink-primary break-words"
                            style={{ lineHeight: 1.55 }}
                          >
                            {msg.text}
                          </p>

                          {/* Quick Suggested Topic Pills when input was unrecognized or gibberish */}
                          {msg.showSuggestionPills && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleAskIntent('turn_time', copy.chips.turnTime)}
                                className="inline-flex items-center gap-1 rounded-lg bg-subtle hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-extrabold transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                                <span>{copy.chips.turnTime}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAskIntent('my_room_route', copy.chips.myRoomRoute)}
                                className="inline-flex items-center gap-1 rounded-lg bg-subtle hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-extrabold transition-colors"
                              >
                                <MapPin className="w-3.5 h-3.5 text-brand-teal" aria-hidden="true" />
                                <span>{copy.chips.myRoomRoute}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAskIntent('all_departments_wait', copy.chips.allDeptWait)}
                                className="inline-flex items-center gap-1 rounded-lg bg-subtle hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-2.5 py-1.5 text-xs font-bold transition-colors"
                              >
                                <span>{copy.chips.allDeptWait}</span>
                              </button>
                            </div>
                          )}

                          {/* Voice Readout + Quick Navigation Actions for every bot reply */}
                          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-2.5 sm:pt-3.5 border-t border-border-subtle">
                            <VoiceListenButton
                              lang={lang}
                              text={msg.text}
                              testId={`chatbot-voice-${msg.id}`}
                              className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm"
                            />

                            <div className="flex flex-wrap items-center gap-2">
                              {renderActionButton(msg.actionType, msg.destNodeId, false)}
                              {msg.secondaryActionType &&
                                renderActionButton(msg.secondaryActionType, msg.destNodeId, true)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Pinned Bottom Question Input Bar (Compact on Mobile, Spacious on Desktop) */}
                <form
                  onSubmit={handleFormSubmit}
                  className="shrink-0 bg-surface px-3 py-2.5 sm:px-6 sm:py-4 border-t-2 border-border-default flex items-center gap-2 sm:gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={copy.inputPlaceholder}
                    aria-label={copy.inputPlaceholder}
                    data-testid="chatbot-input"
                    className="flex-1 min-w-0 min-h-[44px] sm:min-h-[50px] rounded-xl border-2 border-border-strong bg-canvas px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-semibold text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-brand-teal"
                  />
                  <button
                    type="submit"
                    data-testid="chatbot-send-btn"
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[50px] rounded-xl bg-brand-teal hover:bg-brand-tealHover text-white px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-base font-extrabold shrink-0 transition-all duration-100 active:scale-[0.97] shadow-sm"
                  >
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{copy.sendBtn}</span>
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
