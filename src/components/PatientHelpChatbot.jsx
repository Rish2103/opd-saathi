import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
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
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `Namaste! Your active token ${tokenCode} for ${deptName} (${roomLabel}) is loaded. Currently ${ahead} patient(s) are waiting ahead of you with an estimated wait time of ~${waitMins} minutes. Select any question on the left or type below.`,
    welcomeWithoutSlip:
      'Namaste! I am your OPD Saathi Assistant. Select any common question from the panel or type below to check how much time is left for your turn, find your OPD room route, or view live hospital waiting times.',
    quickPromptsHeading: 'Common Questions (Click Any Question)',
    conversationHeading: 'Assistant Answers & Voice Readout',
    inputPlaceholder: 'Type your question here, e.g. "How much time for my turn?" or "Where is my room?"...',
    sendBtn: 'Ask Assistant',
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
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `नमस्ते! आपकी सक्रिय टोकन पर्ची ${tokenCode} (${deptName}, ${roomLabel}) उपलब्ध है। अभी आपसे आगे ${ahead} मरीज़ हैं और अनुमानित प्रतीक्षा समय लगभग ~${waitMins} मिनट है। बाईं ओर से कोई भी प्रश्न चुनें या नीचे लिखें।`,
    welcomeWithoutSlip:
      'नमस्ते! मैं आपका ओपीडी साथी सहायक हूँ। आप मुझसे अपनी बारी का समय, ओपीडी कमरा खोजने का रास्ता, सभी विभागों का प्रतीक्षा समय या नया पंजीकरण करने का तरीका पूछ सकते हैं।',
    quickPromptsHeading: 'सामान्य प्रश्न (पूछने के लिए क्लिक करें)',
    conversationHeading: 'सहायक उत्तर और ध्वनि सुविधा',
    inputPlaceholder: 'यहाँ अपना प्रश्न लिखें, जैसे "मेरी बारी में कितना समय है?" या "मेरा कमरा कहाँ है?"...',
    sendBtn: 'अभी पूछें',
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
    headerTitle: 'ஓபிடி சாத்தி நோயாளி உதவியாளர்',
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
    welcomeWithSlip: (tokenCode, deptName, waitMins, ahead, roomLabel) =>
      `வணக்கம்! உங்கள் டோக்கன் ${tokenCode} (${deptName}, ${roomLabel}) தயாராக உள்ளது. உங்களுக்கு முன் ${ahead} நோயாளிகள் உள்ளனர், தோராயமான காத்திருப்பு நேரம் ~${waitMins} நிமிடங்கள். கேள்வியைத் தேர்ந்தெடுக்கவும்.`,
    welcomeWithoutSlip:
      'வணக்கம்! நான் உங்கள் ஓபிடி சாத்தி உதவியாளர். உங்கள் முறை வர எவ்வளவு நேரம் ஆகும், உங்கள் அறை எங்கே உள்ளது அல்லது வரிசை நிலவரம் குறித்து என்னிடம் கேட்கலாம்.',
    quickPromptsHeading: 'பொதுவான கேள்விகள் (தட்டவும்)',
    conversationHeading: 'பதில்கள் மற்றும் குரல் உதவி',
    inputPlaceholder: 'உங்கள் கேள்வியை உள்ளிடவும் எ.கா. "என் முறைக்கு எவ்வளவு நேரம் ஆகும்?"...',
    sendBtn: 'கேளுங்கள்',
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

    return buildBotResponse('turn_time', userLabel);
  };

  // Match free-text query deterministically to one of the intents
  const resolveIntentFromText = (rawQuery) => {
    const q = String(rawQuery || '').toLowerCase().trim();
    if (
      /emergency|urgent|casualty|chest|bleeding|ambulance|108|आपातकाल|इमरजेंसी|அவசர/.test(q)
    ) {
      return 'emergency_help';
    }
    if (
      /wheelchair|lift|elevator|ramp|stair|elderly|senior|सीढ़ी|लिफ्ट|व्हीलचेयर|रैंप|லிப்ட்|சக்கர/.test(
        q
      )
    ) {
      return 'wheelchair_lift';
    }
    if (
      /where|room|floor|map|direction|route|way|reach|doctor|कमरा|कहाँ|रास्ता|मंज़िल|नक्शा|डॉक्टर|அறை|எங்கே|வழி|வரைபடம்/.test(
        q
      )
    ) {
      return 'my_room_route';
    }
    if (
      /all dept|all opd|shortest|department|queue board|सभी विभाग|प्रतीक्षा|அனைத்து/.test(q)
    ) {
      return 'all_departments_wait';
    }
    if (
      /register|new token|book|appointment|form|पंजीकरण|नया टोकन|पर्ची कैसे|பதிவு|புதிய/.test(
        q
      )
    ) {
      return 'how_to_register';
    }
    if (/lost|recover|forgot|phone|find token|खो|पुरानी पर्ची|தொலைந்து/.test(q)) {
      return 'lost_token';
    }
    return 'turn_time';
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
      destNodeId: response.destNodeId
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);

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
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all duration-100 active:scale-[0.97] ${
          actionType === 'emergency'
            ? 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
            : isSecondary
              ? 'bg-subtle text-brand-primary border-2 border-border-strong hover:bg-brand-tealSoft'
              : 'bg-brand-teal text-white hover:bg-brand-tealHover shadow-sm'
        }`}
      >
        <IconComp className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Floating Circular Launcher Button on Right-Middle of Screen */}
      <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="patient-chatbot-launcher"
          aria-expanded={isOpen}
          aria-label={copy.launcherAria}
          title={copy.headerTitle}
          className={`group relative flex flex-col items-center justify-center w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full border-2 transition-all duration-150 active:scale-[0.96] shadow-elevated ${
            isOpen
              ? 'bg-brand-primary text-white border-[#E59838]'
              : 'bg-brand-teal text-white border-[#FFFDF9] hover:bg-brand-tealHover hover:scale-[1.04]'
          }`}
        >
          {/* Live Active Slip Wait Badge */}
          {liveSlipInfo && !isOpen && (
            <span
              className="absolute -top-1.5 -left-1.5 flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500 text-[#1E1915] text-[11px] font-black tracking-tight border-2 border-[#FFFDF9] shadow-sm"
              aria-hidden="true"
            >
              ~{liveSlipInfo.estWaitMins}m
            </span>
          )}

          <MessageSquare className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-extrabold leading-none mt-1.5 tracking-tight">
            {copy.launcherLabel}
          </span>
        </button>
      </div>

      {/* 85-90% Viewport Centered Assistant Modal with Background Scroll Lock */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#1E1915]/65 backdrop-blur-sm overscroll-contain"
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
            className="w-[95vw] max-w-[1160px] h-[88vh] max-h-[840px] flex flex-col rounded-3xl bg-surface border-2 border-brand-primary shadow-elevated overflow-hidden"
          >
            {/* 1. Full-Width Command Header (Never Truncates) */}
            <header className="shrink-0 bg-brand-primary text-white px-5 py-4 sm:px-7 sm:py-5 border-b-2 border-[#E59838]/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-teal flex items-center justify-center border border-[#FFFDF9]/30 shadow-sm shrink-0">
                  <HelpCircle className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-lg sm:text-xl font-extrabold text-white"
                    style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
                  >
                    {copy.headerTitle}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-amber-200/95 mt-0.5">
                    {copy.headerSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Auto-Speak Voice Toggle */}
                <button
                  type="button"
                  onClick={handleToggleAutoSpeak}
                  data-testid="chatbot-auto-voice-btn"
                  aria-pressed={autoSpeak}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold border transition-all duration-100 active:scale-[0.97] ${
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
                  <span>{autoSpeak ? copy.autoVoiceOn : copy.autoVoiceOff}</span>
                </button>

                {/* Reset Chat */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#120E0C]/70 hover:bg-[#120E0C] text-white border border-white/20 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-transform duration-100 active:scale-[0.97]"
                  title={copy.clearChat}
                >
                  <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{copy.clearChat}</span>
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white border border-white/20 px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-transform duration-100 active:scale-[0.97]"
                >
                  <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{copy.closeBtnText}</span>
                </button>
              </div>
            </header>

            {/* 2. Main 2-Column Split Body (Left: Slip Status + Common Questions | Right: Conversation + Input) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* LEFT SIDEBAR (5 Columns on Desktop): Active Slip Card + All Common Questions */}
              <div className="lg:col-span-5 flex flex-col min-h-0 bg-subtle border-b lg:border-b-0 lg:border-r border-border-default overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 max-h-[38vh] lg:max-h-none">
                {/* Active Token Card */}
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
                          const code = entry.publicCode || entry.ticket?.publicCode || entry.ticket?.tokenCode;
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

                {/* Common Questions List */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary px-1">
                    {copy.quickPromptsHeading}
                  </h3>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAskIntent('turn_time', copy.chips.turnTime)}
                      data-testid="chatbot-chip-turn-time"
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border-2 border-border-strong px-4 py-3 text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left shadow-sm"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.turnTime}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('my_room_route', copy.chips.myRoomRoute)}
                      data-testid="chatbot-chip-room-route"
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border-2 border-border-strong px-4 py-3 text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left shadow-sm"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.myRoomRoute}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('all_departments_wait', copy.chips.allDeptWait)}
                      data-testid="chatbot-chip-all-wait"
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-4 py-3 text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.allDeptWait}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('how_to_register', copy.chips.howToRegister)}
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-4 py-3 text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.howToRegister}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('wheelchair_lift', copy.chips.stepFreeLift)}
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-4 py-3 text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Accessibility className="w-4 h-4 text-brand-teal shrink-0" aria-hidden="true" />
                        <span>{copy.chips.stepFreeLift}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('lost_token', copy.chips.recoverToken)}
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-surface hover:bg-brand-tealSoft text-brand-primary border border-border-strong px-4 py-3 text-sm font-bold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span>{copy.chips.recoverToken}</span>
                      <ArrowRight className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAskIntent('emergency_help', copy.chips.emergencyHelp)}
                      className="w-full inline-flex items-center justify-between gap-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-900 border-2 border-red-300 px-4 py-3 text-sm font-extrabold transition-all duration-100 active:scale-[0.98] text-left"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                        <span>{copy.chips.emergencyHelp}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT MAIN COLUMN (7 Columns on Desktop): Spacious Conversation + Pinned Bottom Input */}
              <div className="lg:col-span-7 flex flex-col min-h-0 bg-canvas overflow-hidden">
                {/* Conversation Messages Scroll Container */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-5">
                  {messages.map((msg) => {
                    if (msg.sender === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-primary text-white px-5 py-3.5 text-sm sm:text-base font-bold leading-relaxed shadow-sm">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="w-full rounded-2xl rounded-tl-sm bg-surface border-2 border-border-strong p-5 sm:p-6 shadow-card space-y-4">
                          <p
                            className="text-base sm:text-lg font-semibold text-ink-primary"
                            style={{ lineHeight: 1.6 }}
                          >
                            {msg.text}
                          </p>

                          {/* Voice Readout + Quick Navigation Actions for every bot reply */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-border-subtle">
                            <VoiceListenButton
                              lang={lang}
                              text={msg.text}
                              testId={`chatbot-voice-${msg.id}`}
                              className="px-4 py-2.5 text-xs sm:text-sm"
                            />

                            <div className="flex flex-wrap items-center gap-2.5">
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

                {/* Pinned Bottom Question Input Bar (Always 100% Visible) */}
                <form
                  onSubmit={handleFormSubmit}
                  className="shrink-0 bg-surface px-5 py-4 sm:px-7 sm:py-5 border-t-2 border-border-default flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={copy.inputPlaceholder}
                    aria-label={copy.inputPlaceholder}
                    data-testid="chatbot-input"
                    className="flex-1 min-w-0 min-h-[52px] rounded-xl border-2 border-border-strong bg-canvas px-4 py-3 text-sm sm:text-base font-semibold text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-brand-teal"
                  />
                  <button
                    type="submit"
                    data-testid="chatbot-send-btn"
                    className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-brand-teal hover:bg-brand-tealHover text-white px-6 py-3 text-sm sm:text-base font-extrabold shrink-0 transition-all duration-100 active:scale-[0.97] shadow-sm"
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
