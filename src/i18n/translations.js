export const TRANSLATIONS = {
  en: {
    skipLink: 'Skip to main content',
    emergencyBtn: 'Emergency Help',
    emergencySub: 'Casualty Rm 101 · 108 / 112',
    brandTitle: 'OPD Saathi',
    brandSubtitle: 'Smart Hospital Queue, Token Slip & Barrier-Free Navigation',
    langToggle: 'हिन्दी (HI)',
    langName: 'English',
    assistedOn: 'Large Text: ON',
    assistedOff: 'Large Text: OFF',
    kioskToggleBtn: 'TV Kiosk Mode',
    kioskExitBtn: 'Exit Kiosk Mode',
    kioskDarkToggle: 'Dark Display Theme',
    kioskLightToggle: 'Light Display Theme',
    kioskTitle: 'PUBLIC OPD WAITING ROOM DISPLAY',
    kioskSubtitle: 'Live Department Token Status · No Personal Patient Data Displayed',
    kioskStaleWarning: 'Connection Interrupted — Showing Last Verified Queue Snapshot',
    departments: {
      GEN: {
        name: 'General Medicine',
        doctor: 'Dr. A. K. Verma (Senior Physician)',
        landmark: 'Floor 2, East Wing — First door on the left past Waiting Area B'
      },
      ORT: {
        name: 'Orthopaedics & Bone Care',
        doctor: 'Dr. S. Nair (Orthopaedic Specialist)',
        landmark: 'Floor 3, North Corridor — Directly opposite Main Lift exit'
      },
      PED: {
        name: 'Paediatrics (Child Health)',
        doctor: 'Dr. Mehta / Dr. R. Sharma',
        landmark: 'Floor 2, West Wing — Colourful wall mural corridor'
      },
      EYE: {
        name: 'Ophthalmology (Eye OPD)',
        doctor: 'Dr. P. Kulkarni (Ophthalmologist)',
        landmark: 'Opposite Eye Chart Display, Floor 3 Right Wing'
      },
      ENT: {
        name: 'ENT & Eye Care (Ophthalmology)',
        doctor: 'Dr. P. Kulkarni (Ophthalmology & ENT)',
        landmark: 'Floor 3, South Wing — End of bright yellow tactile guide line'
      }
    },
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
      step2: '2. Patient Details & Accessibility',
      step3: '3. Confirm & Generate Slip',
      selectDeptPrompt: 'Tap the department you need to visit today:',
      patientSectionTitle: 'Patient Identity Details (Protected)',
      patientSectionSubtitle:
        'Used to issue your OPD slip and prevent accidental duplicate tokens in the same department today. Do not enter symptoms or medical history.',
      patientNameLabel: 'Patient Full Name *',
      patientNamePlaceholder: 'e.g. Ramesh Kumar',
      phoneLabel: '10-Digit Mobile Number *',
      phonePlaceholder: 'e.g. 9876543210',
      phoneUnverifiedNote:
        'Unverified self-reported mobile number (no SMS OTP required). Never shown on public queue boards.',
      ageLabel: 'Age (Years) *',
      agePlaceholder: 'e.g. 58',
      genderLabel: 'Gender (Optional)',
      genderFemale: 'Female',
      genderMale: 'Male',
      genderOther: 'Other',
      genderDecline: 'Prefer not to say',
      regNoLabel: 'Existing Hospital Registration / UHID Number (Optional)',
      regNoPlaceholder: 'e.g. UHID-2025-88412',
      regNoHint: 'Helpful for Follow-Up visits if you have an old OPD card.',
      visitTypeLabel: 'Type of Visit',
      avoidStairsLabel: 'Avoid Stairs (Use Lift & Ramp Only)',
      avoidStairsHint:
        'Recommended for senior citizens, wheelchair users, pregnant women, and patients with walking difficulty.',
      validationNameRequired: 'Please enter the patient’s full name (at least 2 characters).',
      validationPhoneInvalid: 'Please enter a valid 10-digit Indian mobile number (starting with 6–9).',
      validationAgeInvalid: 'Please enter a valid patient age between 0 and 120 years.',
      summaryHeading: 'Registration Summary',
      patientLabel: 'Patient',
      mobileLabel: 'Mobile (Protected)',
      ageGenderLabel: 'Age / Gender',
      deptLabel: 'Department',
      doctorLabel: 'Doctor',
      roomLabel: 'Room & Floor',
      landmarkLabel: 'Landmark',
      routePrefLabel: 'Accessibility Route',
      submitBtn: 'Confirm & Get OPD Token',
      submittingBtn: 'Generating Token…',
      retryNotice:
        'A pending registration request was found. Retrying safely with the same request ID so no duplicate token is created.',
      duplicateTitle: 'Active OPD Token Already Exists Today',
      duplicateDesc:
        'This patient already has an active token in this department today. To keep the queue fair, a duplicate token was not created. You can open your existing slip below:',
      duplicateOpenBtn: 'Open Existing Slip',
      duplicateChangeDeptBtn: 'Register for a Different Department',
      backBtn: 'Back',
      nextBtn: 'Continue',
      voiceGuideTitle: 'Voice Registration Assistant',
      voiceReadStepBtn: 'Read Step Instructions Aloud',
      voiceReadPrivateConfirmBtn: 'Read Summary Aloud (Includes My Details)',
      voiceStopBtn: 'Stop Voice',
      voicePrivacyHint: 'Private patient details are never spoken automatically unless you press the summary button.',
      voiceUnavailable: 'Browser speech synthesis is unavailable on this device. Visual guidance remains active.'
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
      patientSummaryTitle: 'Registered Patient Summary (Device-Protected)',
      unverifiedPhoneBadge: 'Unverified (self-entered)',
      routeAvoidStairs: 'Avoid Stairs (Lift / Ramp Only)',
      routeStandard: 'Shortest Route (Stairs OK)',
      privacyNote:
        'Privacy Protected: Your name and mobile number are hidden from public token lookups and public queue boards.',
      qrTitle: 'Scan on Any Phone to Check Live Turn',
      qrCaption: 'Contains only your public token code (no private credentials).',
      readAloudBtn: 'Read Slip Aloud',
      stopReadingBtn: 'Stop Audio',
      printBtn: 'Print Slip',
      trackTurnBtn: 'Open Live My Turn Tracker',
      directionsBtn: 'View Step-by-Step Directions',
      newRegBtn: 'Register Another Patient / Department',
      cancelTokenBtn: 'Cancel Active Token',
      cancellingTokenBtn: 'Cancelling…',
      mySlipsSwitcherTitle: 'Saved OPD Slips on This Device',
      mySlipsCountLabel: 'Saved Slips',
      mySlipsActiveTag: 'Active',
      mySlipsCompletedTag: 'Completed',
      mySlipsInactiveTag: 'Closed',
      removeFromDeviceBtn: 'Remove from Device',
      printRouteHeading: 'Step-by-Step Route from Ground Floor Registration Desk',
      recoveryNote:
        'Tip: Write down or screenshot your token code (e.g. OPD-GEN-001). You can always look up live queue status on the My Turn tab even if browser history is cleared.'
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
      emptyRegisterBtn: 'Register New OPD Token',
      soundEnabledBtn: 'Sound Alerts: ON',
      soundMutedBtn: 'Sound Alerts: Muted',
      soundTestBtn: 'Test Chime',
      soundFallbackNote: 'Visual banner alerts stay active even when sound is muted or unavailable.'
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
      seconds: 'sec',
      schematicBadge: 'Illustrative Schematic Map — Not to Architectural Scale',
      schematicHint: 'Tap any room or facility on the floor map to inspect it or set it as your Start / Destination.',
      floorTabPrefix: 'Floor',
      legendStart: 'Start Point',
      legendDest: 'Destination',
      legendLift: 'Patient Lift (Accessible)',
      legendStairs: 'Staircase',
      legendActiveRoute: 'Highlighted Route',
      legendNextSegment: 'Current / Next Step',
      setAsStartBtn: 'Set as Start',
      setAsDestBtn: 'Set as Destination',
      voicePanelTitle: 'Voice-Guided Step-by-Step Navigation',
      voicePlayAllBtn: 'Play Route',
      voicePauseBtn: 'Stop Speech',
      voiceRepeatStepBtn: 'Repeat Current Step',
      voiceNextStepBtn: 'Next Step',
      voicePrevStepBtn: 'Previous Step',
      voiceActiveStepLabel: 'Active Step'
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
      resolveBtn: 'Mark Resolved',
      soundOnBtn: 'Urgent Chime: ON',
      soundMutedBtn: 'Urgent Chime: Muted',
      searchPlaceholder: 'Search by token code (e.g. OPD-GEN-001)…',
      clearSearchBtn: 'Clear Search',
      filterAll: 'All Tickets',
      filterWaiting: 'Waiting',
      filterActive: 'Called / Active',
      filterCompleted: 'Completed',
      filterNoShow: 'No-Show',
      filterCancelled: 'Cancelled',
      confirmActionTitle: 'Confirm Status Change',
      confirmYesBtn: 'Confirm Action',
      confirmCancelBtn: 'Keep Current Status'
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
    brandSubtitle: 'अस्पताल ओपीडी टोकन, लाइव कतार व सुगम रास्ता',
    langToggle: 'English (EN)',
    langName: 'हिन्दी',
    assistedOn: 'बड़े अक्षर: चालू',
    assistedOff: 'बड़े अक्षर: बंद',
    kioskToggleBtn: 'टीवी कियोस्क मोड',
    kioskExitBtn: 'कियोस्क मोड बंद करें',
    kioskDarkToggle: 'डार्क डिस्प्ले थीम',
    kioskLightToggle: 'लाइट डिस्प्ले थीम',
    kioskTitle: 'सार्वजनिक ओपीडी प्रतीक्षा कक्ष डिस्प्ले',
    kioskSubtitle: 'लाइव विभाग टोकन स्थिति · कोई निजी जानकारी प्रदर्शित नहीं है',
    kioskStaleWarning: 'कनेक्शन बाधित — अंतिम सत्यापित कतार स्थिति दिखाई जा रही है',
    departments: {
      GEN: {
        name: 'सामान्य चिकित्सा (General Medicine)',
        doctor: 'डॉ. ए. के. वर्मा (वरिष्ठ चिकित्सक)',
        landmark: 'तल 2, पूर्वी विंग — प्रतीक्षा क्षेत्र B के बाद बाईं ओर पहला दरवाजा'
      },
      ORT: {
        name: 'हड्डी एवं जोड़ रोग (Orthopaedics)',
        doctor: 'डॉ. एस. नायर (हड्डी रोग विशेषज्ञ)',
        landmark: 'तल 3, उत्तरी गलियारा — मुख्य लिफ्ट के ठीक सामने'
      },
      PED: {
        name: 'बाल रोग विभाग (Paediatrics)',
        doctor: 'डॉ. मेहता / डॉ. आर. शर्मा',
        landmark: 'तल 2, पश्चिमी विंग — रंगीन चित्रकारी वाला गलियारा'
      },
      EYE: {
        name: 'नेत्र रोग विभाग (आँखों का ओपीडी)',
        doctor: 'डॉ. पी. कुलकर्णी (नेत्र रोग विशेषज्ञ)',
        landmark: 'आई चार्ट बोर्ड के सामने, तल 3 दायाँ विंग'
      },
      ENT: {
        name: 'नेत्र एवं ईएनटी विभाग (Eye & ENT)',
        doctor: 'डॉ. पी. कुलकर्णी (नेत्र एवं ईएनटी विशेषज्ञ)',
        landmark: 'तल 3, दक्षिणी विंग — पीली स्पर्श पट्टी के अंत में'
      }
    },
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
      step2: '2. मरीज का विवरण और लिफ्ट विकल्प',
      step3: '3. पुष्टि करें और पर्ची लें',
      selectDeptPrompt: 'आज आप किस विभाग में दिखाना चाहते हैं?',
      patientSectionTitle: 'मरीज की पहचान का विवरण (सुरक्षित)',
      patientSectionSubtitle:
        'यह विवरण आपकी ओपीडी पर्ची बनाने और एक ही विभाग में गलती से दोहरे (डुप्लीकेट) टोकन बनने से रोकने के लिए है। कृपया यहाँ बीमारी के लक्षण न लिखें।',
      patientNameLabel: 'मरीज का पूरा नाम *',
      patientNamePlaceholder: 'उदा. रमेश कुमार',
      phoneLabel: '10 अंकों का मोबाइल नंबर *',
      phonePlaceholder: 'उदा. 9876543210',
      phoneUnverifiedNote:
        'स्व-घोषित मोबाइल नंबर (किसी SMS OTP की आवश्यकता नहीं)। सार्वजनिक बोर्ड पर कभी प्रदर्शित नहीं किया जाता।',
      ageLabel: 'आयु (वर्षों में) *',
      agePlaceholder: 'उदा. 58',
      genderLabel: 'लिंग (वैकल्पिक)',
      genderFemale: 'महिला (Female)',
      genderMale: 'पुरुष (Male)',
      genderOther: 'अन्य (Other)',
      genderDecline: 'बताना नहीं चाहते',
      regNoLabel: 'पुराना अस्पताल पंजीकरण / UHID नंबर (वैकल्पिक)',
      regNoPlaceholder: 'उदा. UHID-2025-88412',
      regNoHint: 'यदि आप दोबारा दिखाने (Follow-Up) आए हैं और पुराना कार्ड है तो दर्ज करें।',
      visitTypeLabel: 'दिखाने का प्रकार',
      avoidStairsLabel: 'सीढ़ियों से बचें (केवल लिफ्ट और रैंप का रास्ता दिखाएं)',
      avoidStairsHint:
        'वरिष्ठ नागरिकों, व्हीलचेयर उपयोगकर्ताओं, गर्भवती महिलाओं और चलने में कठिनाई वाले मरीजों के लिए उपयुक्त।',
      validationNameRequired: 'कृपया मरीज का पूरा नाम दर्ज करें (कम से कम 2 अक्षर)।',
      validationPhoneInvalid: 'कृपया सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें (6–9 से शुरू)।',
      validationAgeInvalid: 'कृपया 0 से 120 वर्ष के बीच सही आयु दर्ज करें।',
      summaryHeading: 'पंजीकरण विवरण की जांच करें',
      patientLabel: 'मरीज का नाम',
      mobileLabel: 'मोबाइल (सुरक्षित)',
      ageGenderLabel: 'आयु / लिंग',
      deptLabel: 'विभाग',
      doctorLabel: 'डॉक्टर',
      roomLabel: 'कमरा और तल',
      landmarkLabel: 'पहचान चिह्न (Landmark)',
      routePrefLabel: 'रास्ते की प्राथमिकता',
      submitBtn: 'पुष्टि करें और ओपीडी टोकन लें',
      submittingBtn: 'टोकन बन रहा है…',
      retryNotice:
        'पिछला अनुरोध अधूरा मिला। बिना डुप्लीकेट टोकन बनाए उसी अनुरोध आईडी से सुरक्षित रूप से प्रयास किया जा रहा है।',
      duplicateTitle: 'आज इस विभाग में सक्रिय टोकन पहले से मौजूद है',
      duplicateDesc:
        'इस मरीज का आज इसी विभाग में एक सक्रिय टोकन पहले से बना हुआ है। कतार को निष्पक्ष रखने के लिए नया डुप्लीकेट टोकन नहीं बनाया गया। आप अपनी मौजूदा पर्ची नीचे खोल सकते हैं:',
      duplicateOpenBtn: 'मौजूदा पर्ची खोलें',
      duplicateChangeDeptBtn: 'किसी अन्य विभाग के लिए पंजीकरण करें',
      backBtn: 'पीछे जाएं',
      nextBtn: 'आगे बढ़ें',
      voiceGuideTitle: 'आवाज़ पंजीकरण सहायक',
      voiceReadStepBtn: 'इस चरण के निर्देश सुनें',
      voiceReadPrivateConfirmBtn: 'पंजीकरण सारांश सुनें (निजी विवरण सहित)',
      voiceStopBtn: 'आवाज़ रोकें',
      voicePrivacyHint: 'आपकी गोपनीयता के लिए मरीज का नाम और मोबाइल नंबर अपने आप नहीं बोला जाता।',
      voiceUnavailable: 'इस ब्राउज़र में आवाज़ सुविधा उपलब्ध नहीं है। लिखित निर्देश सक्रिय हैं।'
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
      patientSummaryTitle: 'पंजीकृत मरीज का विवरण (डिवाइस पर सुरक्षित)',
      unverifiedPhoneBadge: 'असत्यापित (स्व-घोषित मोबाइल)',
      routeAvoidStairs: 'केवल लिफ्ट और रैंप (No Stairs)',
      routeStandard: 'सामान्य मार्ग (Standard Route)',
      privacyNote:
        'गोपनीयता सुरक्षित: आपका नाम और मोबाइल नंबर सार्वजनिक टोकन खोज और कतार बोर्ड से छुपाए गए हैं।',
      qrTitle: 'किसी भी फोन से बारी देखने के लिए QR स्कैन करें',
      qrCaption: 'इसमें केवल आपका सार्वजनिक टोकन कोड है (कोई गुप्त कुंजी नहीं)।',
      readAloudBtn: 'पर्ची बोलकर सुनाएं',
      stopReadingBtn: 'आवाज़ रोकें',
      printBtn: 'पर्ची प्रिंट करें',
      trackTurnBtn: 'लाइव बारी (My Turn) देखें',
      directionsBtn: 'कमरे तक जाने का रास्ता देखें',
      newRegBtn: 'अन्य मरीज / विभाग का पंजीकरण करें',
      cancelTokenBtn: 'सक्रिय टोकन रद्द करें',
      cancellingTokenBtn: 'रद्द हो रहा है…',
      mySlipsSwitcherTitle: 'इस फ़ोन पर सहेजी गई ओपीडी पर्चियां',
      mySlipsCountLabel: 'सहेजी गई पर्चियां',
      mySlipsActiveTag: 'सक्रिय (Active)',
      mySlipsCompletedTag: 'पूर्ण (Completed)',
      mySlipsInactiveTag: 'बंद (Closed)',
      removeFromDeviceBtn: 'डिवाइस से हटाएं',
      printRouteHeading: 'भूतल पंजीकरण काउंटर से कमरे तक जाने का रास्ता',
      recoveryNote:
        'सुझाव: अपना टोकन कोड (जैसे OPD-GEN-001) लिख लें या स्क्रीनशॉट लें। ब्राउज़र हिस्ट्री मिट जाने पर भी आप "मेरी बारी" टैब में कोड डालकर स्थिति देख सकते हैं।'
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
      emptyRegisterBtn: 'नया ओपीडी टोकन लें',
      soundEnabledBtn: 'ध्वनि अलर्ट: चालू',
      soundMutedBtn: 'ध्वनि अलर्ट: बंद (Muted)',
      soundTestBtn: 'ध्वनि जांचें',
      soundFallbackNote: 'ध्वनि बंद होने पर भी स्क्रीन पर बड़ा अलर्ट बैनर हमेशा दिखाई देगा।'
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
      seconds: 'सेकंड',
      schematicBadge: 'प्रतीकात्मक मानचित्र (Schematic Map) — वास्तविक भवन के पैमाने पर नहीं',
      schematicHint: 'किसी भी कक्ष पर टैप करके उसे शुरुआती स्थान या गंतव्य चुनें।',
      floorTabPrefix: 'तल',
      legendStart: 'शुरुआती स्थान',
      legendDest: 'गंतव्य कक्ष',
      legendLift: 'मरीज लिफ्ट (सुगम)',
      legendStairs: 'सीढ़ियाँ',
      legendActiveRoute: 'चयनित मार्ग',
      legendNextSegment: 'वर्तमान / अगला कदम',
      setAsStartBtn: 'यहाँ से शुरू करें',
      setAsDestBtn: 'यहाँ जाना है',
      voicePanelTitle: 'आवाज़ द्वारा चरण-दर-चरण रास्ता मार्गदर्शन',
      voicePlayAllBtn: 'पूरा रास्ता सुनें',
      voicePauseBtn: 'आवाज़ रोकें',
      voiceRepeatStepBtn: 'वर्तमान कदम दोहराएं',
      voiceNextStepBtn: 'अगला कदम',
      voicePrevStepBtn: 'पिछला कदम',
      voiceActiveStepLabel: 'सक्रिय कदम'
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
      resolveBtn: 'समाधान पूर्ण (Resolve)',
      soundOnBtn: 'आपातकालीन घंटी: चालू',
      soundMutedBtn: 'आपातकालीन घंटी: बंद',
      searchPlaceholder: 'टोकन कोड से खोजें (जैसे OPD-GEN-001)…',
      clearSearchBtn: 'खोज साफ़ करें',
      filterAll: 'सभी टोकन',
      filterWaiting: 'प्रतीक्षा में',
      filterActive: 'सक्रिय / बुलाए गए',
      filterCompleted: 'पूर्ण (Completed)',
      filterNoShow: 'अनुपस्थित (No-Show)',
      filterCancelled: 'रद्द (Cancelled)',
      confirmActionTitle: 'कार्रवाई की पुष्टि करें',
      confirmYesBtn: 'हाँ, पुष्टि करें',
      confirmCancelBtn: 'वापस जाएं'
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
  },
  ta: {
    skipLink: 'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்',
    emergencyBtn: 'அவசர உதவி',
    emergencySub: 'அவசர சிகிச்சை அறை 101 · 108 / 112',
    brandTitle: 'ஓபிடி சாத்தி (OPD Saathi)',
    brandSubtitle: 'மருத்துவமனை ஓபிடி டோக்கன் & நேரடி வழிகாட்டி',
    langToggle: 'English (EN)',
    langName: 'தமிழ்',
    assistedOn: 'பெரிய எழுத்து: ஆன்',
    assistedOff: 'பெரிய எழுத்து: ஆஃப்',
    kioskToggleBtn: 'டிவி கியோஸ்க் திரை',
    kioskExitBtn: 'கியோஸ்க் திரையை மூடு',
    kioskDarkToggle: 'இருண்ட தீம் (Dark)',
    kioskLightToggle: 'வெளிச்ச தீம் (Light)',
    kioskTitle: 'பொது ஓபிடி காத்திருப்போர் தகவல் பலகை',
    kioskSubtitle: 'நேரடி டோக்கன் நிலை · நோயாளியின் தனிப்பட்ட தகவல்கள் காட்டப்படமாட்டாது',
    kioskStaleWarning: 'இணைய இணைப்பு துண்டிக்கப்பட்டது — கடைசியாக சேமிக்கப்பட்ட நிலை காட்டப்படுகிறது',
    departments: {
      GEN: {
        name: 'பொது மருத்துவம் (General Medicine)',
        doctor: 'டாக்டர் ஏ. கே. வர்மா (முதுநிலை மருத்துவர்)',
        landmark: 'தளம் 2, கிழக்கு பிரிவு — காத்திருப்போர் பகுதி B தாண்டி இடதுபுறம் முதல் அறை'
      },
      ORT: {
        name: 'எலும்பு மற்றும் மூட்டு சிகிச்சை (Orthopaedics)',
        doctor: 'டாக்டர் எஸ். நாயர் (எலும்பு சிகிச்சை நிபுணர்)',
        landmark: 'தளம் 3, வடக்கு நடைபாதை — பிரதான லிஃப்ட் வாசலுக்கு நேர் எதிரே'
      },
      PED: {
        name: 'குழந்தைகள் நலப் பிரிவு (Paediatrics)',
        doctor: 'டாக்டர் மேத்தா / டாக்டர் ஆர். சர்மா',
        landmark: 'தளம் 2, மேற்கு பிரிவு — வண்ண ஓவியங்கள் உள்ள நடைபாதை'
      },
      EYE: {
        name: 'கண் சிகிச்சைப் பிரிவு (Ophthalmology)',
        doctor: 'டாக்டர் பி. குல்கர்னி (கண் சிகிச்சை நிபுணர்)',
        landmark: 'கண் பரிசோதனை பலகைக்கு எதிரில், தளம் 3 வலது பிரிவு'
      },
      ENT: {
        name: 'கண் மற்றும் காது-மூக்கு-தொண்டை (Eye & ENT)',
        doctor: 'டாக்டர் பி. குல்கர்னி (கண் மற்றும் ENT நிபுணர்)',
        landmark: 'தளம் 3, தெற்கு பிரிவு — மஞ்சள் வழிகாட்டி கோட்டின் முடிவில்'
      }
    },
    nav: {
      home: 'முகப்பு',
      register: 'டோக்கன் பெறுக',
      slip: 'எனது சீட்டு',
      myTurn: 'எனது முறை',
      navigate: 'வழி தேடுக',
      staff: 'பணியாளர்'
    },
    conn: {
      live: 'நேரடி தகவல் செயலில் உள்ளது',
      reconnecting: 'மீண்டும் இணைகிறது…',
      offline: 'ஆஃப்லைன் — சேமிக்கப்பட்ட நிலை'
    },
    statuses: {
      WAITING: 'வரிசையில் காத்திருப்பு (Waiting)',
      CALLED: 'அழைக்கப்பட்டது — உடனே அறைக்குச் செல்லவும்',
      IN_CONSULTATION: 'மருத்துவர் ஆலோசனையில் உள்ளார்',
      COMPLETED: 'பரிசோதனை முடிந்தது',
      NO_SHOW: 'வரவில்லை (No-Show)',
      CANCELLED: 'டோக்கன் ரத்து செய்யப்பட்டது'
    },
    doctorStatuses: {
      AVAILABLE: 'மருத்துவர் உள்ளார் (சரியான நேரத்தில்)',
      DELAYED: 'மருத்துவர் சற்று தாமதம்',
      ON_BREAK: 'மருத்துவர் சிறிய இடைவேளையில் உள்ளார்',
      UNAVAILABLE: 'மருத்துவர் தற்போது இல்லை'
    },
    visitTypes: {
      FIRST_VISIT: 'முதல் வருகை (புதிய ஓபிடி பதிவு)',
      FOLLOW_UP: 'தொடர் சிகிச்சை (Follow-Up)'
    },
    floors: {
      1: 'தளம் 1 (தரை தளம் / Ground Floor)',
      2: 'தளம் 2 (முதல் தளம் / First Floor)',
      3: 'தளம் 3 (இரண்டாம் தளம் / Second Floor)'
    },
    home: {
      heroTitle: 'எளிமையான ஓபிடி டோக்கன், நேரடி வரிசை மற்றும் வழிகாட்டி',
      heroDesc:
        'ஒரு நிமிடத்தில் ஓபிடி டோக்கன் பெறுங்கள், லிஃப்ட் மற்றும் சாய்வுதள வழிகாட்டுதலுடன் டிஜிட்டல் சீட்டைப் பெறுங்கள், உங்கள் அலைபேசியிலேயே வரிசையைக் கண்காணியுங்கள்.',
      ctaRegister: 'ஓபிடி டோக்கன் பெறுக',
      ctaMyTurn: 'எனது முறையைப் பார்க்க',
      ctaRoute: 'மருத்துவமனை வரைபடம் & வழி',
      ctaStaff: 'பணியாளர் வரிசை தளம்',
      activeSlipBanner: 'இந்த சாதனத்தில் உங்கள் செயலில் உள்ள ஓபிடி சீட்டு உள்ளது:',
      viewActiveSlip: 'எனது டிஜிட்டல் சீட்டைத் திறக்கவும்',
      boardTitle: 'நேரடி ஓபிடி காத்திருப்போர் பலகை (இன்று)',
      boardRefresh: 'புதுப்பிக்கவும்',
      nowServing: 'தற்போதைய எண்',
      waitingCount: 'காத்திருப்போர்',
      estWait: 'தோராய நேரம்',
      noActiveToken: 'அழைக்கவில்லை',
      mins: 'நிமிடம்',
      registerHere: 'டோக்கன் பெறுக',
      emptyQueueBadge: 'அமைப்பு தயாராக உள்ளது',
      emptyQueueTitle: 'தற்போது யாரும் காத்திருக்கவில்லை — உடனடி முறை உள்ளது',
      emptyQueueDesc:
        'அனைத்து ஓபிடி ஆலோசனை அறைகளும் திறந்துள்ளன. உங்கள் துறையில் முதல் டோக்கனைப் பெற கீழே பதிவு செய்யவும்.',
      emptyQueueCta: 'முதல் ஓபிடி டோக்கனைப் பதிவு செய்க',
      deptOpenImmediate: '0 காத்திருப்பு · உடனடி முறை'
    },
    register: {
      title: 'வெளிநோயாளி (OPD) டோக்கன் பதிவு',
      subtitle: 'உங்கள் துறை டோக்கனைப் பெற 3 எளிய படிகளை முடிக்கவும்.',
      step1: '1. ஓபிடி துறையைத் தேர்ந்தெடுக்கவும்',
      step2: '2. நோயாளி விவரம் & லிஃப்ட் விருப்பம்',
      step3: '3. உறுதிப்படுத்தி சீட்டுப் பெறுக',
      selectDeptPrompt: 'இன்று நீங்கள் பார்க்க வேண்டிய துறையைத் தேர்ந்தெடுக்கவும்:',
      patientSectionTitle: 'நோயாளி அடையாள விவரங்கள் (பாதுகாக்கப்பட்டவை)',
      patientSectionSubtitle:
        'உங்கள் ஓபிடி சீட்டை வழங்கவும், ஒரே நாளில் ஒரே துறையில் இருமுறை டோக்கன் உருவாவதைத் தடுக்கவும் மட்டுமே இது பயன்படுகிறது. நோய் அறிகுறிகளை உள்ளிட வேண்டாம்.',
      patientNameLabel: 'நோயாளியின் முழுப் பெயர் *',
      patientNamePlaceholder: 'எ.கா. ரமேஷ் குமார்',
      phoneLabel: '10 இலக்க கைபேசி எண் *',
      phonePlaceholder: 'எ.கா. 9876543210',
      phoneUnverifiedNote:
        'சுயமாக அளிக்கப்பட்ட எண் (OTP தேவையில்லை). பொதுத் திரையில் ஒருபோதும் காட்டப்படாது.',
      ageLabel: 'வயது (ஆண்டுகளில்) *',
      agePlaceholder: 'எ.கா. 58',
      genderLabel: 'பாலினம் (விருப்பத்தேர்வு)',
      genderFemale: 'பெண் (Female)',
      genderMale: 'ஆண் (Male)',
      genderOther: 'மற்றவை (Other)',
      genderDecline: 'குறிப்பிட விரும்பவில்லை',
      regNoLabel: 'பழைய மருத்துவமனை பதிவு / UHID எண் (விருப்பத்தேர்வு)',
      regNoPlaceholder: 'எ.கா. UHID-2025-88412',
      regNoHint: 'தொடர் சிகிச்சைக்கு (Follow-Up) பழைய அட்டை இருந்தால் உள்ளிடவும்.',
      visitTypeLabel: 'வருகையின் வகை',
      avoidStairsLabel: 'படிக்கட்டுகளைத் தவிர்க்கவும் (லிஃப்ட் & சாய்வுதளம் மட்டும்)',
      avoidStairsHint:
        'மூத்த குடிமக்கள், சக்கர நாற்காலி பயனர்கள், கர்ப்பிணிப் பெண்கள் மற்றும் நடக்க சிரமப்படுபவர்களுக்குப் பரிந்துரைக்கப்படுகிறது.',
      validationNameRequired: 'நோயாளியின் முழுப் பெயரை உள்ளிடவும் (குறைந்தது 2 எழுத்துக்கள்).',
      validationPhoneInvalid: 'சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும் (6–9 இல் தொடங்க வேண்டும்).',
      validationAgeInvalid: '0 முதல் 120 வயதுக்குள் சரியான வயதை உள்ளிடவும்.',
      summaryHeading: 'பதிவு சுருக்கத்தைச் சரிபார்க்கவும்',
      patientLabel: 'நோயாளி பெயர்',
      mobileLabel: 'கைபேசி (பாதுகாக்கப்பட்டது)',
      ageGenderLabel: 'வயது / பாலினம்',
      deptLabel: 'துறை',
      doctorLabel: 'மருத்துவர்',
      roomLabel: 'அறை மற்றும் தளம்',
      landmarkLabel: 'அடையாளம் (Landmark)',
      routePrefLabel: 'வழி முன்னுரிமை',
      submitBtn: 'உறுதிப்படுத்தி ஓபிடி டோக்கன் பெறுக',
      submittingBtn: 'டோக்கன் உருவாக்கப்படுகிறது…',
      retryNotice:
        'முந்தைய கோரிக்கை நிலுவையில் உள்ளது. இரட்டை டோக்கன் உருவாகாமல் பாதுகாப்பாக மீண்டும் முயற்சிக்கப்படுகிறது.',
      duplicateTitle: 'இன்று இந்தத் துறையில் செயலில் உள்ள டோக்கன் ஏற்கனவே உள்ளது',
      duplicateDesc:
        'இந்த நோயாளிக்கு இன்று இதே துறையில் ஏற்கனவே டோக்கன் உள்ளது. வரிசையை நியாயமாக வைத்திருக்க புதிய டோக்கன் உருவாக்கப்படவில்லை. உங்கள் சீட்டை கீழே திறக்கலாம்:',
      duplicateOpenBtn: 'ஏற்கனவே உள்ள சீட்டைத் திறக்கவும்',
      duplicateChangeDeptBtn: 'வேறு துறைக்குப் பதிவு செய்யவும்',
      backBtn: 'பின்னால்',
      nextBtn: 'தொடரவும்',
      voiceGuideTitle: 'குரல் வழிகாட்டி உதவி',
      voiceReadStepBtn: 'இந்தப் படியின் வழிமுறைகளைக் கேட்க',
      voiceReadPrivateConfirmBtn: 'பதிவு சுருக்கத்தைக் கேட்க (தனிப்பட்ட விவரங்களுடன்)',
      voiceStopBtn: 'குரலை நிறுத்து',
      voicePrivacyHint: 'உங்கள் பாதுகாப்பிற்காக தனிப்பட்ட விவரங்கள் தாமாக வாசிக்கப்படமாட்டாது.',
      voiceUnavailable: 'இந்த சாதனத்தில் குரல் வசதி இல்லை. எழுத்து வழிகாட்டுதல் செயலில் உள்ளது.'
    },
    slip: {
      title: 'டிஜிட்டல் ஓபிடி டோக்கன் சீட்டு',
      noSlipTitle: 'இந்த சாதனத்தில் செயலில் உள்ள சீட்டு எதுவும் இல்லை',
      noSlipDesc:
        'புதிய ஓபிடி டோக்கன் பதிவு செய்யவும் அல்லது "எனது முறை" பகுதியில் டோக்கன் எண்ணை உள்ளிட்டு பார்க்கவும்.',
      goRegister: 'புதிய டோக்கன் பெறுக',
      goLookup: 'டோக்கன் எண் மூலம் தேடுக',
      tokenLabel: 'ஓபிடி டோக்கன் எண்',
      recoveredBadge: 'பாதுகாப்பாக மீட்கப்பட்டது (இரட்டை டோக்கன் இல்லை)',
      statusLabel: 'தற்போதைய நிலை',
      peopleAhead: 'உங்களுக்கு முன் காத்திருப்பவர்கள்',
      nowServing: 'துறையில் தற்போது நடைபெறும் எண்',
      estWaitLabel: 'தோராயமான காத்திருப்பு நேரம்',
      etaDisclaimer:
        'குறிப்பு: இது சராசரி ஆலோசனை நேரத்தை அடிப்படையாகக் கொண்ட கணிப்பு மட்டுமே. அவசர சிகிச்சை காரணமாக நேரம் மாறலாம்.',
      etaUnavailable: 'மருத்துவர் தற்போது இல்லை — கவுண்டர் 1–3 (உதவி மையம்) அணுகவும்.',
      deptAndDoctor: 'துறை மற்றும் மருத்துவர்',
      destinationRoom: 'செல்ல வேண்டிய அறை & அடையாளம்',
      patientSummaryTitle: 'பதிவு செய்யப்பட்ட நோயாளி விவரம் (பாதுகாக்கப்பட்டது)',
      unverifiedPhoneBadge: 'சரிபார்க்கப்படாத எண்',
      routeAvoidStairs: 'லிஃப்ட் & சாய்வுதளம் மட்டும் (படிக்கட்டுகள் இல்லை)',
      routeStandard: 'குறுகிய வழி (படிக்கட்டுகள் உட்பட)',
      privacyNote:
        'தனியுரிமை பாதுகாப்பு: உங்கள் பெயர் மற்றும் கைபேசி எண் பொதுத் திரைகளில் காட்டப்படமாட்டாது.',
      qrTitle: 'நேரடி வரிசையை அறிய QR குறியீட்டை ஸ்கேன் செய்யவும்',
      qrCaption: 'இதில் உங்கள் பொது டோக்கன் எண் மட்டுமே உள்ளது.',
      readAloudBtn: 'சீட்டை சத்தமாக வாசிக்கவும்',
      stopReadingBtn: 'ஒலியை நிறுத்து',
      printBtn: 'சீட்டை அச்சிடுக (Print)',
      trackTurnBtn: 'நேரடி வரிசையைப் பார்க்க (My Turn)',
      directionsBtn: 'அறைக்குச் செல்லும் வழியைப் பார்க்க',
      newRegBtn: 'மற்றொரு நோயாளி / துறைக்குப் பதிவு செய்க',
      cancelTokenBtn: 'டோக்கனை ரத்து செய்',
      cancellingTokenBtn: 'ரத்து செய்யப்படுகிறது…',
      mySlipsSwitcherTitle: 'இந்த சாதனத்தில் சேமிக்கப்பட்ட ஓபிடி சீட்டுகள்',
      mySlipsCountLabel: 'சேமிக்கப்பட்ட சீட்டுகள்',
      mySlipsActiveTag: 'செயலில்',
      mySlipsCompletedTag: 'முடிந்தது',
      mySlipsInactiveTag: 'மூடப்பட்டது',
      removeFromDeviceBtn: 'சீட்டை நீக்கு',
      printRouteHeading: 'தரை தளம் பதிவு கவுண்டரில் இருந்து அறைக்குச் செல்லும் வழி',
      recoveryNote:
        'குறிப்பு: உங்கள் டோக்கன் எண்ணை (எ.கா. OPD-GEN-001) குறித்து வைத்துக்கொள்ளவும்.'
    },
    myTurn: {
      title: 'எனது முறை — நேரடி வரிசை கண்காணிப்பு',
      subtitle:
        'எந்த சாதனத்திலிருந்தும் நேரடி வரிசை நிலையை அறிய ஓபிடி டோக்கன் எண்ணை (எ.கா. OPD-GEN-001) உள்ளிடவும்.',
      inputLabel: 'ஓபிடி டோக்கன் எண்ணை உள்ளிடவும்',
      inputPlaceholder: 'எ.கா. OPD-GEN-001',
      searchBtn: 'முறையைப் பார்க்க',
      useSavedBtn: 'சேமிக்கப்பட்ட டோக்கனைத் திற',
      lastUpdated: 'கடைசியாக சரிபார்க்கப்பட்ட நேரம்:',
      alertCalledTitle: 'உங்கள் முறை வந்துவிட்டது!',
      alertCalledDesc: 'தயவுசெய்து கீழே குறிப்பிடப்பட்டுள்ள ஆலோசனை அறைக்கு உடனடியாகச் செல்லவும்.',
      alertNearTitle: 'தயாராக இருங்கள் — உங்கள் முறை நெருங்குகிறது!',
      alertNearDesc:
        'உங்களுக்கு முன் 3 அல்லது அதற்கும் குறைவான நோயாளிகளே உள்ளனர். காத்திருப்போர் பகுதிக்கு அருகில் செல்லவும்.',
      requeuedNote: 'வரிசையின் இறுதியில் மீண்டும் சேர்க்கப்பட்ட எண்ணிக்கை:',
      emptyTitle: 'இன்னும் எந்த ஓபிடி டோக்கனும் தேர்ந்தெடுக்கப்படவில்லை',
      emptyDesc:
        'நேரடி வரிசை நிலையை அறிய மேலே உங்கள் டோக்கன் எண்ணை (எ.கா. OPD-GEN-001) உள்ளிடவும் அல்லது புதிய டோக்கன் பெறவும்.',
      emptyRegisterBtn: 'புதிய ஓபிடி டோக்கன் பெறுக',
      soundEnabledBtn: 'ஒலி எச்சரிக்கை: ஆன்',
      soundMutedBtn: 'ஒலி எச்சரிக்கை: மியூட் (Muted)',
      soundTestBtn: 'ஒலியைச் சோதிக்க',
      soundFallbackNote: 'ஒலி நிறுத்தப்பட்டிருந்தாலும் திரையில் காட்சி எச்சரிக்கை எப்போதும் தோன்றும்.'
    },
    navigate: {
      title: 'மருத்துவமனை உள் வழிகாட்டி (3 தளங்கள்)',
      subtitle:
        'பதிவு கவுண்டர், ஓபிடி அறைகள், ஆய்வகம், மருந்தகம் மற்றும் அவசர சிகிச்சை பிரிவுக்கான படிப்படியான வழிகாட்டுதல்.',
      fromLabel: 'தொடங்கும் இடம் (நீங்கள் இப்போது எங்கே இருக்கிறீர்கள்?)',
      toLabel: 'செல்ல வேண்டிய இடம் (எங்கே செல்ல வேண்டும்?)',
      avoidStairsToggle: 'படிக்கட்டுகளைத் தவிர்க்கவும் — லிஃப்ட் & சாய்வுதளம் மட்டும்',
      stairsAllowedNote: 'குறுகிய வழி காட்டப்படுகிறது (படிக்கட்டுகள் இருக்கலாம்).',
      liftOnlyNote: 'தடையற்ற வழி செயலில் உள்ளது: படிக்கட்டுகள் தவிர்க்கப்பட்டு லிஃப்ட் மற்றும் சாய்வுதளம் மட்டுமே பயன்படுத்தப்படுகிறது.',
      distanceLabel: 'மொத்த தூரம்',
      walkTimeLabel: 'நடை நேரம்',
      floorsLabel: 'தளங்கள்',
      readRouteBtn: 'வழியை சத்தமாக வாசிக்கவும்',
      meters: 'மீட்டர்',
      seconds: 'விநாடி',
      schematicBadge: 'விளக்க வரைபடம் (Schematic Map) — கட்டிட அளவுகோல் அல்ல',
      schematicHint: 'வரைபடத்தில் உள்ள எந்த அறையையும் தொட்டு தொடங்கும் இடம் அல்லது செல்ல வேண்டிய இடமாக மாற்றலாம்.',
      floorTabPrefix: 'தளம்',
      legendStart: 'தொடங்கும் இடம்',
      legendDest: 'சேருமிடம்',
      legendLift: 'நோயாளி லிஃப்ட்',
      legendStairs: 'படிக்கட்டுகள்',
      legendActiveRoute: 'தேர்ந்தெடுக்கப்பட்ட வழி',
      legendNextSegment: 'தற்போதைய / அடுத்த படி',
      setAsStartBtn: 'இங்கிருந்து தொடங்கு',
      setAsDestBtn: 'இங்கே செல்ல வேண்டும்',
      voicePanelTitle: 'குரல் வழி படிப்படியான வழிகாட்டி',
      voicePlayAllBtn: 'வழியைக் கேட்க',
      voicePauseBtn: 'ஒலியை நிறுத்து',
      voiceRepeatStepBtn: 'தற்போதைய படியை மீண்டும் கூறு',
      voiceNextStepBtn: 'அடுத்த படி',
      voicePrevStepBtn: 'முந்தைய படி',
      voiceActiveStepLabel: 'தற்போதைய படி'
    },
    staff: {
      title: 'ஓபிடி பணியாளர் வரிசை மற்றும் கட்டுப்பாட்டு மையம்',
      subtitle: 'நோயாளிகளை அழைக்க, நிலையை மாற்ற மற்றும் அவசர உதவி கோரிக்கைகளை ஏற்க அங்கீகரிக்கப்பட்ட தளம்.',
      loginTitle: 'பணியாளர் PIN சரிபார்ப்பு',
      loginDesc: 'வரிசைக் கட்டுப்பாடுகளைத் திறக்க மருத்துவமனை பணியாளர் PIN எண்ணை உள்ளிடவும்.',
      demoHint: 'அங்கீகரிக்கப்பட்ட மருத்துவமனை பணியாளர்களுக்கு மட்டும்.',
      pinLabel: 'பணியாளர் PIN',
      loginBtn: 'பணியாளர் தளத்தைத் திற',
      logoutBtn: 'வெளியேறு / பூட்டு',
      selectDept: 'துறை வரிசையை நிர்வகிக்கவும்',
      callNextBtn: 'அடுத்த நோயாளியை அழைக்கவும் (Call Next)',
      activeCardTitle: 'தற்போதைய நோயாளி (அழைக்கப்பட்டவர் / ஆலோசனையில்)',
      noActivePatient: 'தற்போது எந்த நோயாளியும் அழைக்கப்படவில்லை.',
      startConsultBtn: 'ஆலோசனை தொடங்கு',
      completeBtn: 'பரிசோதனை முடிவு',
      noShowBtn: 'வரவில்லை (No-Show)',
      cancelBtn: 'டோக்கன் ரத்து',
      requeueBtn: 'வரிசையின் இறுதியில் சேர்க்க (Requeue Tail)',
      waitingHeading: 'காத்திருப்போர் வரிசை',
      historyHeading: 'இன்று முடிந்தவை / வராதவர் / ரத்து செய்யப்பட்டவை',
      doctorStatusHeading: 'மருத்துவர் இருப்பு மற்றும் தாமத அறிவிப்பு',
      delayMinsLabel: 'தாமதம் (நிமிடங்கள்)',
      saveDocStatusBtn: 'மருத்துவர் நிலையைப் புதுப்பி',
      urgentHeading: 'அவசர மற்றும் நோயாளி உதவி கோரிக்கைகள் (மனித ஆய்வு தேவை)',
      urgentEmpty: 'திறந்த உதவி கோரிக்கைகள் எதுவும் இல்லை.',
      ackBtn: 'ஏற்றுக்கொள் (Acknowledge)',
      resolveBtn: 'தீர்க்கப்பட்டது (Resolve)',
      soundOnBtn: 'அவசர ஒலி: ஆன்',
      soundMutedBtn: 'அவசர ஒலி: மியூட்',
      searchPlaceholder: 'டோக்கன் எண் மூலம் தேடுக (எ.கா. OPD-GEN-001)…',
      clearSearchBtn: 'தேடலை அழி',
      filterAll: 'அனைத்தும்',
      filterWaiting: 'காத்திருப்போர்',
      filterActive: 'அழைக்கப்பட்டவர்',
      filterCompleted: 'முடிந்தவை',
      filterNoShow: 'வராதவர் (No-Show)',
      filterCancelled: 'ரத்து செய்யப்பட்டவை',
      confirmActionTitle: 'செயலை உறுதிப்படுத்தவும்',
      confirmYesBtn: 'ஆம், உறுதிப்படுத்து',
      confirmCancelBtn: 'வேண்டாம்'
    },
    emergency: {
      modalTitle: 'மருத்துவ அவசரநிலை மற்றும் உடனடி உதவி',
      warningBanner:
        'நெஞ்சு வலி, மூச்சுத் திணறல், அதிக இரத்தப்போக்கு, மயக்கம் அல்லது பக்கவாத அறிகுறிகள் இருந்தால் ஓபிடி வரிசையில் காத்திருக்க வேண்டாம்.',
      casualtyDirection:
        'உடனடியாக தளம் 1 (தரை தளம்) இல் உள்ள அறை 101 — அவசர சிகிச்சை பிரிவுக்குச் (பிரதான நுழைவாயில் அருகில்) செல்லவும்.',
      disclaimer:
        'முக்கிய அறிவிப்பு: கீழே உதவி கோருவது உதவி மையத்திற்கு தகவல் அனுப்பும். இது மருத்துவ வரிசையை தானாக மாற்றாது.',
      call108: '108 ஆம்புலன்ஸ் அழைக்க',
      call112: '112 அவசர எண்ணை அழைக்க',
      routeToEmergencyBtn: 'அவசர சிகிச்சை அறைக்கு (101) வழி காட்டு',
      requestHelpHeading: 'உங்கள் இடத்திற்கு மருத்துவமனை பணியாளர் உதவியை அழைக்கவும்',
      locationLabel: 'நீங்கள் இப்போது எங்கே இருக்கிறீர்கள்?',
      requestTypeLabel: 'எந்த வகையான உதவி தேவை?',
      typeUrgent: 'உடனடி செவிலியர் / மருத்துவ ஆய்வு தேவை',
      typeMobility: 'சக்கர நாற்காலி / நடக்க உதவி / கவுண்டர் உதவி',
      sendHelpBtn: 'பணியாளர் உதவியைக் கோரவும்',
      sendingHelpBtn: 'அனுப்பப்படுகிறது…',
      helpSentTitle: 'பணியாளர் உதவி மையத்திற்கு தகவல் அனுப்பப்பட்டது',
      helpSentDesc:
        'உங்கள் இருப்பிடம் பதிவு மற்றும் உதவி மையத்திற்கு அறிவிக்கப்பட்டுள்ளது. அறிகுறி தீவிரமடைந்தால் உடனே அறை 101 க்குச் செல்லவும்.',
      closeBtn: 'மூடுக'
    }
  }
};

const SLUG_TO_DEPT_CODE = {
  'general-medicine': 'GEN',
  paediatrics: 'PED',
  orthopaedics: 'ORT',
  ophthalmology: 'EYE',
  ent: 'ENT'
};

const NODE_TO_DEPT_CODE = {
  room_204_med: 'GEN',
  room_208_ped: 'PED',
  room_302_ort: 'ORT',
  room_305_eye: 'EYE'
};

export function resolveDepartmentCode(dept) {
  if (!dept) return null;
  const direct =
    dept.tokenPrefix ||
    dept.token_prefix ||
    dept.code ||
    dept.departmentCode ||
    null;
  if (direct && typeof direct === 'string') {
    return direct.trim().toUpperCase();
  }
  const slug = dept.slug || dept.departmentSlug;
  if (slug && SLUG_TO_DEPT_CODE[slug]) {
    return SLUG_TO_DEPT_CODE[slug];
  }
  const nodeId = dept.destinationNodeId || dept.destination_node_id;
  if (nodeId && NODE_TO_DEPT_CODE[nodeId]) {
    return NODE_TO_DEPT_CODE[nodeId];
  }
  const tokenNumber = dept.tokenNumber || dept.token_number;
  if (typeof tokenNumber === 'string') {
    const match = tokenNumber.match(/^OPD-([A-Z]+)-/i);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

export function getLocalizedDepartment(dept, lang = 'en', t = null) {
  if (!dept) {
    return { code: null, name: '', doctor: '', landmark: '' };
  }
  const dict = t || TRANSLATIONS[lang] || TRANSLATIONS.en;
  const code = resolveDepartmentCode(dept);
  const deptEntry = (code && dict?.departments?.[code]) || null;

  if (lang === 'ta') {
    return {
      code,
      name:
        dept.name_ta ||
        dept.departmentName_ta ||
        deptEntry?.name ||
        dept.name_en ||
        dept.departmentName ||
        dept.name ||
        '',
      doctor:
        dept.doctor_name_ta ||
        dept.doctorName_ta ||
        deptEntry?.doctor ||
        dept.doctor_name ||
        dept.doctorName ||
        dept.doctor ||
        '',
      landmark:
        dept.landmark_ta ||
        deptEntry?.landmark ||
        dept.landmark_en ||
        dept.landmark ||
        ''
    };
  }

  if (lang === 'hi') {
    return {
      code,
      name:
        dept.name_hi ||
        dept.departmentName_hi ||
        deptEntry?.name ||
        dept.name_en ||
        dept.departmentName ||
        dept.name ||
        '',
      doctor:
        dept.doctor_name_hi ||
        dept.doctorName_hi ||
        deptEntry?.doctor ||
        dept.doctor_name ||
        dept.doctorName ||
        dept.doctor ||
        '',
      landmark:
        dept.landmark_hi ||
        deptEntry?.landmark ||
        dept.landmark_en ||
        dept.landmark ||
        ''
    };
  }

  return {
    code,
    name:
      dept.name_en ||
      dept.departmentName ||
      deptEntry?.name ||
      dept.name ||
      '',
    doctor:
      dept.doctor_name_en ||
      dept.doctor_name ||
      dept.doctorName ||
      deptEntry?.doctor ||
      dept.doctor ||
      '',
    landmark:
      dept.landmark_en ||
      deptEntry?.landmark ||
      dept.landmark ||
      ''
  };
}
