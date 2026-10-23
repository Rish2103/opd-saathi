export const TRANSLATIONS = {
  en: {
    skipLink: 'Skip to main content',
    emergencyBtn: 'Emergency Help',
    emergencySub: 'Casualty Rm 101 · 108 / 112',
    brandTitle: 'OPD Saathi',
    brandSubtitle: 'Smart Hospital Queue, Token Slip & Barrier-Free Navigation',
    langToggle: 'हिन्दी (HI)',
    assistedOn: 'Large Text: ON',
    assistedOff: 'Large Text: OFF',
    nav: {
      home: 'Home',
      register: 'Get OPD Token',
      slip: 'My Slip',
      myTurn: 'My Turn',
      navigate: 'Find Route',
      staff: 'Staff Desk'
    },
    conn: {
      live: 'Live Updates Active',
      reconnecting: 'Reconnecting…',
      offline: 'Offline — Showing Last Saved State'
    },
    statuses: {
      WAITING: 'Waiting in Queue',
      CALLED: 'Called — Proceed to Room Now',
      IN_CONSULTATION: 'In Consultation with Doctor',
      COMPLETED: 'Consultation Completed',
      NO_SHOW: 'Marked Absent (No-Show)',
      CANCELLED: 'Ticket Cancelled'
    },
    doctorStatuses: {
      AVAILABLE: 'Doctor Available (On Time)',
      DELAYED: 'Doctor Delayed',
      ON_BREAK: 'Doctor on Short Break',
      UNAVAILABLE: 'Doctor Currently Unavailable'
    },
    visitTypes: {
      FIRST_VISIT: 'First Visit (New OPD Registration)',
      FOLLOW_UP: 'Follow-Up Visit (Repeat Checkup)'
    },
    floors: {
      1: 'Floor 1 (Ground Floor)',
      2: 'Floor 2 (First Floor)',
      3: 'Floor 3 (Second Floor)'
    },
    home: {
      heroTitle: 'Calm, Clear Outpatient Queue & Directions',
      heroDesc:
        'Register for your OPD token in under a minute, get a printable digital slip with step-by-step lift or stair directions, and track your live turn from any phone.',
      ctaRegister: 'Register for OPD Token',
      ctaMyTurn: 'Check My Turn by Code',
      ctaRoute: 'Hospital Map & Directions',
      ctaStaff: 'Staff Queue Controls',
      activeSlipBanner: 'You have an active OPD slip on this device:',
      viewActiveSlip: 'Open My Digital Slip',
      boardTitle: 'Live OPD Waiting Room Board (Today)',
      boardRefresh: 'Refresh Board',
      nowServing: 'Now Serving',
      waitingCount: 'Waiting',
      estWait: 'Est. Wait',
      noActiveToken: 'None Called Yet',
      mins: 'min',
      registerHere: 'Select Department',
      emptyQueueBadge: 'System Live & Ready',
      emptyQueueTitle: 'No Patients Currently Waiting — Immediate Turn Available',
      emptyQueueDesc:
        'All OPD consultation rooms are open and ready. Register a new token below to be first in line for your department.',
      emptyQueueCta: 'Register First OPD Token',
      deptOpenImmediate: '0 Waiting · Open for immediate turn'
    },
    register: {
      title: 'Outpatient (OPD) Token Registration',
      subtitle: 'Complete 3 simple steps to receive your sequential department token.',
      step1: '1. Choose OPD Department',
      step2: '2. Visit Type & Accessibility',
      step3: '3. Confirm & Generate Slip',
      selectDeptPrompt: 'Tap the department you need to visit today:',
      visitTypeLabel: 'Type of Visit',
      avoidStairsLabel: 'Avoid Stairs (Use Lift & Ramp Only)',
      avoidStairsHint:
        'Recommended for senior citizens, wheelchair users, pregnant women, and patients with walking difficulty.',
      summaryHeading: 'Registration Summary',
      deptLabel: 'Department',
      doctorLabel: 'Doctor',
      roomLabel: 'Room & Floor',
      landmarkLabel: 'Landmark',
      submitBtn: 'Confirm & Get OPD Token',
      submittingBtn: 'Generating Token…',
      retryNotice:
        'A pending registration request was found. Retrying safely with the same request ID so no duplicate token is created.',
      backBtn: 'Back',
      nextBtn: 'Continue'
    },
    slip: {
      title: 'Digital OPD Token Slip',
      noSlipTitle: 'No Active Slip on This Device',
      noSlipDesc:
        'Register for a new OPD token or look up an existing token code on the My Turn tab.',
      goRegister: 'Register New Token',
      goLookup: 'Look Up by Token Code',
      tokenLabel: 'OPD TOKEN NUMBER',
      recoveredBadge: 'Recovered Safely (No Duplicate Created)',
      statusLabel: 'Current Status',
      peopleAhead: 'Patients Waiting Ahead of You',
      nowServing: 'Currently Serving in Department',
      estWaitLabel: 'Estimated Wait Time (Approximate)',
      etaDisclaimer:
        'Note: Wait time is an estimate based on average consultation duration and may change if emergency cases require attention.',
      etaUnavailable: 'Doctor unavailable — please check with Counter 1–3 (Help Desk).',
      deptAndDoctor: 'Department & Doctor',
      destinationRoom: 'Destination Room & Landmark',
      qrTitle: 'Scan on Any Phone to Check Live Turn',
      qrCaption: 'Contains only your public token code (no private credentials).',
      readAloudBtn: 'Read Slip Aloud',
      stopReadingBtn: 'Stop Audio',
      printBtn: 'Print Slip',
      trackTurnBtn: 'Open Live My Turn Tracker',
      directionsBtn: 'View Step-by-Step Directions',
      newRegBtn: 'Register Another Patient'
    },
    myTurn: {
      title: 'My Turn — Live Queue Tracker',
      subtitle:
        'Enter any OPD token code (e.g. OPD-GEN-001) to check real-time queue position from any device.',
      inputLabel: 'Enter OPD Token Code',
      inputPlaceholder: 'e.g. OPD-GEN-001',
      searchBtn: 'Check Turn',
      useSavedBtn: 'Load My Saved Token',
      lastUpdated: 'Last verified at',
      alertCalledTitle: 'IT IS YOUR TURN NOW!',
      alertCalledDesc: 'Please proceed immediately to the consultation room shown below.',
      alertNearTitle: 'GET READY — YOUR TURN IS APPROACHING!',
      alertNearDesc:
        '3 or fewer patients are ahead of you. Please move towards the department waiting area.',
      requeuedNote: 'Requeued to tail count:',
      emptyTitle: 'No OPD Token Loaded Yet',
      emptyDesc:
        'Enter an OPD token code above (for example, OPD-GEN-001) to check real-time queue status from any device, or register a new token.',
      emptyRegisterBtn: 'Register New OPD Token'
    },
    navigate: {
      title: 'Indoor Hospital Directions (3 Floors)',
      subtitle:
        'Step-by-step landmark directions between Registration, OPD Rooms, Labs, Pharmacy, and Emergency.',
      fromLabel: 'Starting Location (Where You Are Now)',
      toLabel: 'Destination Location (Where You Need to Go)',
      avoidStairsToggle: 'Avoid Stairs — Use Lift & Ramp Only',
      stairsAllowedNote: 'Using shortest path (includes stairs where faster).',
      liftOnlyNote: 'Barrier-free route active: all stairs excluded; using ramps and lifts only.',
      distanceLabel: 'Total Distance',
      walkTimeLabel: 'Est. Walk Time',
      floorsLabel: 'Floors Traversed',
      readRouteBtn: 'Read Directions Aloud',
      meters: 'meters',
      seconds: 'sec'
    },
    staff: {
      title: 'OPD Staff Queue & Triage Desk',
      subtitle: 'Authorised staff controls for calling patients, managing status, and acknowledging urgent help requests.',
      loginTitle: 'Staff PIN Authentication',
      loginDesc: 'Enter the hospital staff PIN to unlock queue mutation controls.',
      demoHint: 'Authorised hospital staff only. Enter the server-configured staff PIN.',
      pinLabel: 'Staff PIN',
      loginBtn: 'Unlock Staff Desk',
      logoutBtn: 'Lock / Sign Out',
      selectDept: 'Manage Department Queue',
      callNextBtn: 'Call Next Waiting Patient',
      activeCardTitle: 'Currently Active Patient (Called / In Consultation)',
      noActivePatient: 'No patient is currently Called or In Consultation.',
      startConsultBtn: 'Start Consultation',
      completeBtn: 'Complete Visit',
      noShowBtn: 'Mark No-Show',
      cancelBtn: 'Cancel Ticket',
      requeueBtn: 'Requeue to Tail',
      waitingHeading: 'Waiting Queue (Ordered by Sort Order)',
      historyHeading: 'Recent Completed / No-Show / Cancelled Today',
      doctorStatusHeading: 'Doctor Availability & Delay Broadcast',
      delayMinsLabel: 'Delay (mins)',
      saveDocStatusBtn: 'Update Doctor Status',
      urgentHeading: 'Pre-Registration & Patient Help Requests (Human Assessment Required)',
      urgentEmpty: 'No open urgent or staff help requests.',
      ackBtn: 'Acknowledge',
      resolveBtn: 'Mark Resolved'
    },
    emergency: {
      modalTitle: 'Medical Emergency & Immediate Help',
      warningBanner:
        'If the patient has chest pain, severe breathing difficulty, heavy bleeding, unconsciousness, or stroke symptoms, DO NOT wait in the OPD queue.',
      casualtyDirection:
        'Go immediately to Room 101 — Emergency / Casualty on Floor 1 (Ground Floor), right next to the Main Entrance.',
      disclaimer:
        'Important Safety Notice: Requesting staff help below alerts the Help Desk for human assessment. It does NOT automatically reorder the medical queue or replace physical emergency triage.',
      call108: 'Call 108 Ambulance',
      call112: 'Call 112 Emergency',
      routeToEmergencyBtn: 'Show Route to Emergency (Room 101)',
      requestHelpHeading: 'Alert Hospital Staff to Your Location (Works Before Registration)',
      locationLabel: 'Where are you right now?',
      requestTypeLabel: 'Type of Assistance Needed',
      typeUrgent: 'Urgent Medical Triage Assessment Needed',
      typeMobility: 'Wheelchair / Mobility / Counter Assistance',
      sendHelpBtn: 'Request Staff Help Now',
      sendingHelpBtn: 'Sending Alert…',
      helpSentTitle: 'Staff Alert Sent for Human Assessment',
      helpSentDesc:
        'The Registration & Triage Desk has been notified of your location. If symptoms worsen, proceed directly to Room 101 (Ground Floor Casualty).',
      closeBtn: 'Close Window'
    }
  },
  hi: {
    skipLink: 'मुख्य सामग्री पर जाएं',
    emergencyBtn: 'आपातकालीन सहायता',
    emergencySub: 'कैजुअल्टी कमरा 101 · 108 / 112',
    brandTitle: 'ओपीडी साथी (OPD Saathi)',
    brandSubtitle: 'सरकारी अस्पताल ओपीडी टोकन, कतार और सुगम रास्ता मार्गदर्शक',
    langToggle: 'English (EN)',
    assistedOn: 'बड़े अक्षर: चालू',
    assistedOff: 'बड़े अक्षर: बंद',
    nav: {
      home: 'मुख्य पृष्ठ',
      register: 'टोकन लें',
      slip: 'मेरी पर्ची',
      myTurn: 'मेरी बारी',
      navigate: 'रास्ता खोजें',
      staff: 'स्टाफ डेस्क'
    },
    conn: {
      live: 'लाइव अपडेट चालू है',
      reconnecting: 'पुनः जुड़ रहा है…',
      offline: 'ऑफ़लाइन — अंतिम सहेजी गई स्थिति'
    },
    statuses: {
      WAITING: 'कतार में प्रतीक्षा (Waiting)',
      CALLED: 'बुलाया गया — तुरंत कमरे में जाएं',
      IN_CONSULTATION: 'डॉक्टर से परामर्श जारी',
      COMPLETED: 'परामर्श पूर्ण हुआ',
      NO_SHOW: 'अनुपस्थित (No-Show)',
      CANCELLED: 'टोकन रद्द किया गया'
    },
    doctorStatuses: {
      AVAILABLE: 'डॉक्टर उपलब्ध हैं (समय पर)',
      DELAYED: 'डॉक्टर थोड़े विलंब से हैं',
      ON_BREAK: 'डॉक्टर अल्प विराम पर हैं',
      UNAVAILABLE: 'डॉक्टर अभी अनुपलब्ध हैं'
    },
    visitTypes: {
      FIRST_VISIT: 'पहली बार दिखाना है (नया पंजीकरण)',
      FOLLOW_UP: 'फॉलो-अप (दोबारा जांच)'
    },
    floors: {
      1: 'तल 1 (भूतल / Ground Floor)',
      2: 'तल 2 (प्रथम तल / First Floor)',
      3: 'तल 3 (द्वितीय तल / Second Floor)'
    },
    home: {
      heroTitle: 'सरल ओपीडी टोकन, लाइव कतार और आसान रास्ता',
      heroDesc:
        'एक मिनट में अपना ओपीडी टोकन प्राप्त करें, लिफ्ट/रैंप के निर्देशों के साथ डिजिटल पर्ची देखें, और किसी भी फोन से अपनी बारी ट्रैक करें।',
      ctaRegister: 'नया ओपीडी टोकन लें',
      ctaMyTurn: 'टोकन नंबर से बारी देखें',
      ctaRoute: 'अस्पताल का रास्ता खोजें',
      ctaStaff: 'स्टाफ कतार नियंत्रण',
      activeSlipBanner: 'इस फ़ोन पर आपकी सक्रिय ओपीडी पर्ची मौजूद है:',
      viewActiveSlip: 'मेरी डिजिटल पर्ची खोलें',
      boardTitle: 'लाइव ओपीडी प्रतीक्षा बोर्ड (आज की स्थिति)',
      boardRefresh: 'ताज़ा करें',
      nowServing: 'अभी बुलाया गया',
      waitingCount: 'प्रतीक्षा में',
      estWait: 'अनुमानित समय',
      noActiveToken: 'कोई कॉल नहीं',
      mins: 'मिनट',
      registerHere: 'विभाग चुनें',
      emptyQueueBadge: 'सिस्टम चालू और तैयार है',
      emptyQueueTitle: 'अभी किसी भी विभाग में कतार नहीं है — तुरंत बारी उपलब्ध है',
      emptyQueueDesc:
        'सभी ओपीडी परामर्श कक्ष खुले हैं। अपने विभाग में सबसे पहले नंबर पाने के लिए नीचे नया टोकन पंजीकृत करें।',
      emptyQueueCta: 'पहला ओपीडी टोकन लें',
      deptOpenImmediate: '0 प्रतीक्षा · तुरंत नंबर उपलब्ध'
    },
    register: {
      title: 'ओपीडी (OPD) टोकन पंजीकरण',
      subtitle: 'अपना टोकन नंबर प्राप्त करने के लिए 3 आसान चरण पूरे करें।',
      step1: '1. ओपीडी विभाग चुनें',
      step2: '2. विज़िट प्रकार और लिफ्ट विकल्प',
      step3: '3. पुष्टि करें और पर्ची लें',
      selectDeptPrompt: 'आज आप किस विभाग में दिखाना चाहते हैं?',
      visitTypeLabel: 'दिखाने का प्रकार',
      avoidStairsLabel: 'सीढ़ियों से बचें (केवल लिफ्ट और रैंप का रास्ता दिखाएं)',
      avoidStairsHint:
        'वरिष्ठ नागरिकों, व्हीलचेयर उपयोगकर्ताओं, गर्भवती महिलाओं और चलने में कठिनाई वाले मरीजों के लिए उपयुक्त।',
      summaryHeading: 'पंजीकरण विवरण की जांच करें',
      deptLabel: 'विभाग',
      doctorLabel: 'डॉक्टर',
      roomLabel: 'कमरा और तल',
      landmarkLabel: 'पहचान चिह्न (Landmark)',
      submitBtn: 'पुष्टि करें और ओपीडी टोकन लें',
      submittingBtn: 'टोकन बन रहा है…',
      retryNotice:
        'पिछला अनुरोध अधूरा मिला। बिना डुप्लीकेट टोकन बनाए उसी अनुरोध आईडी से सुरक्षित रूप से प्रयास किया जा रहा है।',
      backBtn: 'पीछे जाएं',
      nextBtn: 'आगे बढ़ें'
    },
    slip: {
      title: 'डिजिटल ओपीडी टोकन पर्ची',
      noSlipTitle: 'इस डिवाइस पर कोई सक्रिय पर्ची नहीं है',
      noSlipDesc:
        'नया ओपीडी टोकन पंजीकृत करें या "मेरी बारी" टैब में टोकन कोड डालकर स्थिति देखें।',
      goRegister: 'नया टोकन लें',
      goLookup: 'टोकन कोड से खोजें',
      tokenLabel: 'ओपीडी टोकन संख्या',
      recoveredBadge: 'सुरक्षित रूप से प्राप्त (कोई डुप्लीकेट नहीं बना)',
      statusLabel: 'वर्तमान स्थिति',
      peopleAhead: 'आपसे आगे प्रतीक्षा कर रहे मरीज',
      nowServing: 'विभाग में अभी चल रहा टोकन',
      estWaitLabel: 'अनुमानित प्रतीक्षा समय (लगभग)',
      etaDisclaimer:
        'नोट: यह समय केवल औसत परामर्श पर आधारित अनुमान है। गंभीर मरीजों की जांच के कारण इसमें बदलाव हो सकता है।',
      etaUnavailable: 'डॉक्टर अभी अनुपलब्ध हैं — कृपया काउंटर 1–3 (सहायता केंद्र) से संपर्क करें।',
      deptAndDoctor: 'विभाग और डॉक्टर',
      destinationRoom: 'कमरा नंबर और पहचान चिह्न',
      qrTitle: 'किसी भी फोन से बारी देखने के लिए QR स्कैन करें',
      qrCaption: 'इसमें केवल आपका सार्वजनिक टोकन कोड है (कोई गुप्त कुंजी नहीं)।',
      readAloudBtn: 'पर्ची बोलकर सुनाएं',
      stopReadingBtn: 'आवाज़ रोकें',
      printBtn: 'पर्ची प्रिंट करें',
      trackTurnBtn: 'लाइव बारी (My Turn) देखें',
      directionsBtn: 'कमरे तक जाने का रास्ता देखें',
      newRegBtn: 'अन्य मरीज का पंजीकरण करें'
    },
    myTurn: {
      title: 'मेरी बारी — लाइव कतार ट्रैकर',
      subtitle:
        'किसी भी फोन से वास्तविक समय में कतार की स्थिति जानने के लिए ओपीडी टोकन कोड (जैसे OPD-GEN-001) दर्ज करें।',
      inputLabel: 'ओपीडी टोकन कोड दर्ज करें',
      inputPlaceholder: 'उदा. OPD-GEN-001',
      searchBtn: 'बारी देखें',
      useSavedBtn: 'मेरा सहेजा गया टोकन खोलें',
      lastUpdated: 'अंतिम अपडेट समय:',
      alertCalledTitle: 'आपकी बारी आ गई है!',
      alertCalledDesc: 'कृपया तुरंत नीचे दिए गए ओपीडी परामर्श कक्ष में जाएं।',
      alertNearTitle: 'तैयार रहें — आपकी बारी आने वाली है!',
      alertNearDesc:
        'आपसे आगे केवल 3 या उससे कम मरीज हैं। कृपया विभाग के प्रतीक्षा क्षेत्र के पास पहुंचें।',
      requeuedNote: 'पुनः कतार में जोड़े जाने की संख्या:',
      emptyTitle: 'अभी कोई ओपीडी टोकन नहीं चुना गया है',
      emptyDesc:
        'किसी भी फोन से वास्तविक समय में कतार की स्थिति देखने के लिए ऊपर टोकन कोड (जैसे OPD-GEN-001) दर्ज करें, या नया टोकन पंजीकृत करें।',
      emptyRegisterBtn: 'नया ओपीडी टोकन लें'
    },
    navigate: {
      title: 'अस्पताल के अंदर का रास्ता (3 तल)',
      subtitle:
        'पंजीकरण काउंटर, ओपीडी कक्ष, पैथोलॉजी लैब, फार्मेसी और आपातकालीन कक्ष के बीच चरण-दर-चरण दिशा-निर्देश।',
      fromLabel: 'शुरुआती स्थान (अभी आप कहाँ हैं?)',
      toLabel: 'गंतव्य स्थान (आपको कहाँ जाना है?)',
      avoidStairsToggle: 'सीढ़ियों से बचें — केवल लिफ्ट और रैंप का उपयोग करें',
      stairsAllowedNote: 'सबसे छोटा रास्ता दिखाया जा रहा है (इसमें सीढ़ियाँ शामिल हो सकती हैं)।',
      liftOnlyNote: 'सुगम मार्ग सक्रिय: सीढ़ियाँ हटा दी गई हैं; केवल रैंप और लिफ्ट का उपयोग।',
      distanceLabel: 'कुल दूरी',
      walkTimeLabel: 'चलने का समय',
      floorsLabel: 'तल (Floors)',
      readRouteBtn: 'रास्ता बोलकर सुनाएं',
      meters: 'मीटर',
      seconds: 'सेकंड'
    },
    staff: {
      title: 'ओपीडी स्टाफ कतार और ट्रायज नियंत्रण कक्ष',
      subtitle: 'मरीजों को बुलाने, स्थिति बदलने और आपातकालीन सहायता अनुरोधों की जांच के लिए अधिकृत स्टाफ पैनल।',
      loginTitle: 'स्टाफ पिन (PIN) प्रमाणीकरण',
      loginDesc: 'कतार नियंत्रण अनलॉक करने के लिए स्टाफ पिन दर्ज करें।',
      demoHint: 'केवल अधिकृत अस्पताल स्टाफ के लिए। सर्वर पर निर्धारित स्टाफ पिन दर्ज करें।',
      pinLabel: 'स्टाफ पिन (PIN)',
      loginBtn: 'स्टाफ डेस्क खोलें',
      logoutBtn: 'लॉग आउट / लॉक करें',
      selectDept: 'विभाग की कतार चुनें',
      callNextBtn: 'अगले मरीज को बुलाएं (Call Next)',
      activeCardTitle: 'वर्तमान सक्रिय मरीज (बुलाया गया / परामर्श में)',
      noActivePatient: 'अभी कोई भी मरीज सक्रिय (Called / In Consultation) नहीं है।',
      startConsultBtn: 'परामर्श शुरू करें',
      completeBtn: 'परामर्श पूर्ण करें',
      noShowBtn: 'अनुपस्थित (No-Show)',
      cancelBtn: 'टोकन रद्द करें',
      requeueBtn: 'कतार के अंत में पुनः जोड़ें (Requeue Tail)',
      waitingHeading: 'प्रतीक्षा कतार (क्रम अनुसार)',
      historyHeading: 'आज के पूर्ण / अनुपस्थित / रद्द टोकन',
      doctorStatusHeading: 'डॉक्टर उपलब्धता और विलंब स्थिति',
      delayMinsLabel: 'विलंब (मिनट)',
      saveDocStatusBtn: 'डॉक्टर स्थिति अपडेट करें',
      urgentHeading: 'आपातकालीन और स्टाफ सहायता अनुरोध (मानवीय जांच आवश्यक)',
      urgentEmpty: 'कोई खुला सहायता अनुरोध नहीं है।',
      ackBtn: 'संज्ञान लें (Acknowledge)',
      resolveBtn: 'समाधान पूर्ण (Resolve)'
    },
    emergency: {
      modalTitle: 'आपातकालीन चिकित्सा और तत्काल सहायता',
      warningBanner:
        'यदि मरीज को सीने में तेज दर्द, सांस लेने में तकलीफ, अत्यधिक रक्तस्राव, बेहोशी या लकवे के लक्षण हैं, तो ओपीडी कतार में प्रतीक्षा न करें।',
      casualtyDirection:
        'तुरंत तल 1 (भूतल) पर कमरा 101 — आपातकालीन / कैजुअल्टी कक्ष (मुख्य प्रवेश द्वार के दाईं ओर) में जाएं।',
      disclaimer:
        'महत्वपूर्ण सुरक्षा सूचना: नीचे सहायता का अनुरोध करने से सहायता केंद्र को मानवीय जांच के लिए सूचना मिलती है। यह स्वचालित रूप से कतार का क्रम नहीं बदलता और न ही डॉक्टर की जांच का विकल्प है।',
      call108: '108 एम्बुलेंस कॉल करें',
      call112: '112 आपातकालीन कॉल',
      routeToEmergencyBtn: 'आपातकालीन कक्ष (कमरा 101) का रास्ता देखें',
      requestHelpHeading: 'अपने स्थान पर अस्पताल स्टाफ की सहायता बुलाएं (बिना पंजीकरण भी उपलब्ध)',
      locationLabel: 'अभी आप अस्पताल में कहाँ हैं?',
      requestTypeLabel: 'किस प्रकार की सहायता चाहिए?',
      typeUrgent: 'तत्काल नर्स / ट्रायज जांच की आवश्यकता',
      typeMobility: 'व्हीलचेयर / चलने में सहायता / काउंटर मदद',
      sendHelpBtn: 'स्टाफ सहायता अनुरोध भेजें',
      sendingHelpBtn: 'सूचना भेजी जा रही है…',
      helpSentTitle: 'मानवीय जांच के लिए स्टाफ को सूचना भेज दी गई है',
      helpSentDesc:
        'पंजीकरण और ट्रायज डेस्क को आपके स्थान की सूचना मिल गई है। यदि तबीयत अधिक खराब हो, तो तुरंत कमरा 101 (कैजुअल्टी) में जाएं।',
      closeBtn: 'विंडो बंद करें'
    }
  }
};
