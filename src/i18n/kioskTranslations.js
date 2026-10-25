import {
  TRANSLATIONS,
  getLocalizedDepartment,
  resolveDepartmentCode
} from './translations.js';

export const KIOSK_TRANSLATIONS = {
  en: {
    badge: 'GOVERNMENT HOSPITAL SELF-SERVICE TERMINAL',
    welcomeTitle: 'Welcome to OPD Saathi',
    welcomeSubtitle:
      'Touch the screen to choose your language and register independently for your Outpatient (OPD) consultation token.',
    selectLanguageHeading: '1. Select Your Preferred Language',
    selectLanguageHint:
      'Your selected language will be used across all steps and on your printed OPD token slip.',
    startRegistrationBtn: 'Start OPD Registration',
    startRegistrationSub: 'New Visit or Follow-Up Token · Takes under 60 seconds',
    checkExistingTokenBtn: 'Check Existing Token Status',
    checkExistingTokenSub: 'Look up your live queue position using your OPD token code',
    quickStepsTitle: 'How Self-Service Registration Works',
    quickStep1Title: '1. Choose Department',
    quickStep1Desc: 'Select the clinic, doctor, and floor you need today.',
    quickStep2Title: '2. Enter Patient Details',
    quickStep2Desc: 'Enter patient name, 10-digit mobile number, and age.',
    quickStep3Title: '3. Confirm & Print Slip',
    quickStep3Desc: 'Get your confirmed OPD token number, room directions, and QR slip.',
    privacyGuaranteeBanner:
      'Shared Kiosk Privacy Guarantee: Your personal details are never saved permanently on this terminal and are automatically cleared when you finish or after inactivity.',
    browserKioskLimitNote:
      'Browser Kiosk Notice: This web terminal automatically clears session memory on completion or idle timeout. Physical OS-level screen locking is managed by hospital terminal hardware.',
    fullscreenEnterBtn: 'Fullscreen Kiosk',
    fullscreenExitBtn: 'Exit Fullscreen',
    fullscreenUnsupportedNote:
      'Fullscreen mode is not supported by this browser window; standard touch layout remains active.',
    staffExitBtn: 'Staff Exit',
    staffExitModalTitle: 'Authorised Staff Kiosk Exit',
    staffExitModalDesc:
      'Enter the hospital staff PIN to exit Self-Service Kiosk Mode and return to the full application.',
    staffPinPlaceholder: 'Enter Staff PIN',
    staffVerifyAndExitBtn: 'Verify PIN & Exit Kiosk',
    staffCancelBtn: 'Stay in Kiosk Mode',
    staffInvalidPinError: 'Incorrect staff PIN. Only authorised hospital staff can exit kiosk mode.',
    sessionResetBanner:
      'Previous session cleared for patient privacy. Ready for the next patient.',
    inactivityTimerLabel: 'Auto-Reset Timer',
    inactivityWarningTitle: 'Are You Still Using the Kiosk?',
    inactivityWarningDesc:
      'To protect your privacy on this shared hospital terminal, this screen will automatically reset and clear your entered details in:',
    continueSessionBtn: 'Continue My Session',
    resetNowBtn: 'Clear & Start Over Now',
    stepProgressLabel: 'Registration Progress',
    step1Short: '1. Department',
    step2Short: '2. Patient Details',
    step3Short: '3. Confirm & Slip',
    step1Heading: 'Step 1: Select OPD Department',
    step1Instruction:
      'Touch a department card below to select it, then tap Continue.',
    selectedBadge: 'Selected Department',
    tapToSelectBadge: 'Tap to Select',
    continueWithDeptBtn: 'Continue with Selected Department',
    backToWelcomeBtn: 'Back to Welcome Screen',
    step2Heading: 'Step 2: Enter Patient Details',
    step2Instruction:
      'Please enter the patient’s basic details below. All fields marked with * are required.',
    step3Heading: 'Step 3: Review & Confirm Registration',
    step3Instruction:
      'Please check your details below before generating your official OPD token slip.',
    confirmAndGenerateBtn: 'Confirm & Generate OPD Slip',
    generatingTokenBtn: 'Generating Confirmed OPD Token…',
    editDetailsBtn: 'Back to Edit Details',
    confirmedSlipHeading: 'OPD Registration Confirmed!',
    confirmedSlipSub:
      'Please print your slip or note down your token number before finishing your session.',
    kioskPatientNameLabel: 'Registered Patient Name (Current Session Only)',
    queuePositionLabel: 'Patients Ahead in Queue',
    approxWaitLabel: 'Approximate Waiting Time',
    printSlipBtn: 'Print OPD Slip',
    printedSuccessNote:
      'Print dialog opened. Once you collect your slip, tap Finish & Clear Screen below.',
    finishSessionBtn: 'Finish & Clear Screen (Next Patient)',
    startNewRegBtn: 'Register Another Patient',
    lookupHeading: 'Check Existing OPD Token Status',
    lookupSubtitle:
      'Enter your token code (for example, OPD-GEN-001) to view live queue status and room directions.',
    lookupInputPlaceholder: 'e.g. OPD-GEN-001',
    lookupSearchBtn: 'Check Token Status',
    lookupSearchingBtn: 'Checking Queue…',
    lookupClearBtn: 'Back to Welcome Screen',
    emergencyRouteBannerTitle: 'Immediate Route to Room 101 — Emergency / Casualty',
    emergencyRouteBannerSub:
      'Ground Floor (Floor 1), directly beside Main Entrance & Ramp. Proceed immediately without waiting in queue.',
    closeEmergencyRouteBtn: 'Close Emergency Route'
  },
  hi: {
    badge: 'सरकारी अस्पताल स्वयं-सेवा कियोस्क टर्मिनल',
    welcomeTitle: 'ओपीडी साथी (OPD Saathi) में आपका स्वागत है',
    welcomeSubtitle:
      'अपनी भाषा चुनने और स्वयं ओपीडी (OPD) परामर्श टोकन पंजीकृत करने के लिए स्क्रीन को छुएं।',
    selectLanguageHeading: '1. अपनी पसंदीदा भाषा चुनें',
    selectLanguageHint:
      'चयनित भाषा सभी चरणों और आपकी प्रिंट की गई ओपीडी टोकन पर्ची पर उपयोग की जाएगी।',
    startRegistrationBtn: 'ओपीडी पंजीकरण शुरू करें',
    startRegistrationSub: 'नया परामर्श या फॉलो-अप टोकन · 60 सेकंड से कम समय',
    checkExistingTokenBtn: 'मौजूदा टोकन स्थिति जांचें',
    checkExistingTokenSub: 'अपने ओपीडी टोकन कोड से लाइव कतार स्थिति देखें',
    quickStepsTitle: 'स्वयं-सेवा पंजीकरण कैसे काम करता है',
    quickStep1Title: '1. विभाग चुनें',
    quickStep1Desc: 'आज जिस विभाग, डॉक्टर और मंजिल पर जाना है उसे चुनें।',
    quickStep2Title: '2. मरीज का विवरण भरें',
    quickStep2Desc: 'मरीज का नाम, 10-अंकीय मोबाइल नंबर और आयु दर्ज करें।',
    quickStep3Title: '3. पुष्टि करें और पर्ची प्रिंट करें',
    quickStep3Desc: 'अपना पक्का ओपीडी टोकन नंबर, कमरे का रास्ता और QR पर्ची प्राप्त करें।',
    privacyGuaranteeBanner:
      'साझा कियोस्क गोपनीयता गारंटी: आपकी निजी जानकारी इस मशीन पर स्थायी रूप से सेव नहीं की जाती है और सत्र समाप्त होने या निष्क्रिय रहने पर स्वतः मिटा दी जाती है।',
    browserKioskLimitNote:
      'ब्राउज़र कियोस्क सूचना: यह वेब टर्मिनल सत्र समाप्त होने या निष्क्रियता पर निजी डेटा स्वतः साफ़ करता है। ऑपरेटिंग-सिस्टम स्क्रीन लॉक अस्पताल के हार्डवेयर द्वारा नियंत्रित होता है।',
    fullscreenEnterBtn: 'फुलस्क्रीन कियोस्क',
    fullscreenExitBtn: 'फुलस्क्रीन बंद करें',
    fullscreenUnsupportedNote:
      'इस ब्राउज़र विंडो में फुलस्क्रीन उपलब्ध नहीं है; सामान्य टच लेआउट सक्रिय है।',
    staffExitBtn: 'स्टाफ निकास (Staff Exit)',
    staffExitModalTitle: 'अधिकृत स्टाफ कियोस्क निकास',
    staffExitModalDesc:
      'स्वयं-सेवा कियोस्क मोड से बाहर निकलने के लिए अस्पताल स्टाफ पिन (PIN) दर्ज करें।',
    staffPinPlaceholder: 'स्टाफ पिन दर्ज करें',
    staffVerifyAndExitBtn: 'पिन सत्यापित करें और बाहर निकलें',
    staffCancelBtn: 'कियोस्क मोड में रहें',
    staffInvalidPinError: 'गलत स्टाफ पिन। केवल अधिकृत अस्पताल स्टाफ ही कियोस्क मोड बंद कर सकते हैं।',
    sessionResetBanner:
      'मरीज की गोपनीयता के लिए पिछला सत्र साफ़ कर दिया गया है। अगले मरीज के लिए तैयार।',
    inactivityTimerLabel: 'ऑटो-रीसेट टाइमर',
    inactivityWarningTitle: 'क्या आप अभी भी कियोस्क का उपयोग कर रहे हैं?',
    inactivityWarningDesc:
      'इस साझा अस्पताल मशीन पर आपकी गोपनीयता की रक्षा के लिए, यह स्क्रीन स्वचालित रूप से रीसेट हो जाएगी और आपका विवरण मिटा देगी:',
    continueSessionBtn: 'मेरा सत्र जारी रखें',
    resetNowBtn: 'अभी साफ़ करें और नया शुरू करें',
    stepProgressLabel: 'पंजीकरण प्रगति',
    step1Short: '1. विभाग चुनें',
    step2Short: '2. मरीज विवरण',
    step3Short: '3. पुष्टि व पर्ची',
    step1Heading: 'चरण 1: ओपीडी विभाग चुनें',
    step1Instruction:
      'नीचे दिए गए किसी विभाग कार्ड को छूकर चुनें, फिर आगे बढ़ें (Continue) दबाएं।',
    selectedBadge: 'चयनित विभाग',
    tapToSelectBadge: 'चुनने के लिए छुएं',
    continueWithDeptBtn: 'चयनित विभाग के साथ आगे बढ़ें',
    backToWelcomeBtn: 'स्वागत स्क्रीन पर वापस जाएं',
    step2Heading: 'चरण 2: मरीज का विवरण दर्ज करें',
    step2Instruction:
      'कृपया नीचे मरीज की बुनियादी जानकारी भरें। * चिह्नित सभी फ़ील्ड आवश्यक हैं।',
    step3Heading: 'चरण 3: विवरण जांचें और पुष्टि करें',
    step3Instruction:
      'अपनी आधिकारिक ओपीडी टोकन पर्ची बनाने से पहले कृपया नीचे दिए गए विवरण की जांच करें।',
    confirmAndGenerateBtn: 'पुष्टि करें और ओपीडी पर्ची बनाएं',
    generatingTokenBtn: 'पक्का ओपीडी टोकन बनाया जा रहा है…',
    editDetailsBtn: 'विवरण बदलने के लिए पीछे जाएं',
    confirmedSlipHeading: 'ओपीडी पंजीकरण सफल रहा!',
    confirmedSlipSub:
      'कृपया सत्र समाप्त करने से पहले अपनी पर्ची प्रिंट करें या अपना टोकन नंबर नोट कर लें।',
    kioskPatientNameLabel: 'पंजीकृत मरीज का नाम (केवल वर्तमान सत्र)',
    queuePositionLabel: 'कतार में आपसे आगे मरीज',
    approxWaitLabel: 'अनुमानित प्रतीक्षा समय',
    printSlipBtn: 'ओपीडी पर्ची प्रिंट करें',
    printedSuccessNote:
      'प्रिंट विंडो खुल गई है। पर्ची लेने के बाद नीचे "समाप्त करें और स्क्रीन साफ़ करें" दबाएं।',
    finishSessionBtn: 'समाप्त करें और स्क्रीन साफ़ करें (अगला मरीज)',
    startNewRegBtn: 'दूसरे मरीज का पंजीकरण करें',
    lookupHeading: 'मौजूदा ओपीडी टोकन स्थिति जांचें',
    lookupSubtitle:
      'लाइव कतार स्थिति और कमरे का रास्ता देखने के लिए अपना टोकन कोड (जैसे OPD-GEN-001) दर्ज करें।',
    lookupInputPlaceholder: 'उदा. OPD-GEN-001',
    lookupSearchBtn: 'टोकन स्थिति देखें',
    lookupSearchingBtn: 'कतार जांची जा रही है…',
    lookupClearBtn: 'स्वागत स्क्रीन पर वापस जाएं',
    emergencyRouteBannerTitle: 'कमरा 101 — आपातकालीन / कैजुअल्टी का तत्काल रास्ता',
    emergencyRouteBannerSub:
      'भूतल (Floor 1), मुख्य प्रवेश द्वार और रैंप के ठीक बगल में। कतार में प्रतीक्षा किए बिना तुरंत जाएं।',
    closeEmergencyRouteBtn: 'आपातकालीन रास्ता बंद करें'
  },
  ta: {
    badge: 'அரசு மருத்துவமனை சுய-சேவை கியோஸ்க் முனையம்',
    welcomeTitle: 'ஓபிடி சாத்தி (OPD Saathi)-க்கு வரவேற்கிறோம்',
    welcomeSubtitle:
      'உங்கள் மொழியைத் தேர்ந்தெடுத்து, வெளிநோயாளர் (OPD) டோக்கனை நீங்களே பதிவு செய்ய திரையைத் தொடவும்.',
    selectLanguageHeading: '1. உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
    selectLanguageHint:
      'தேர்ந்தெடுக்கப்பட்ட மொழி அனைத்துப் படிகளிலும் அச்சிடப்படும் ஓபிடி டோக்கன் சீட்டிலும் பயன்படுத்தப்படும்.',
    startRegistrationBtn: 'ஓபிடி பதிவைத் தொடங்குக',
    startRegistrationSub: 'புதிய வருகை அல்லது தொடர் சிகிச்சை டோக்கன் · 60 விநாடிகளுக்குள்',
    checkExistingTokenBtn: 'ஏற்கனவே உள்ள டோக்கன் நிலையைப் பார்க்க',
    checkExistingTokenSub: 'உங்கள் ஓபிடி டோக்கன் எண்ணைக் கொண்டு நேரடி வரிசை நிலையை அறியவும்',
    quickStepsTitle: 'சுய-சேவை பதிவு எவ்வாறு செயல்படுகிறது',
    quickStep1Title: '1. துறையைத் தேர்ந்தெடுக்கவும்',
    quickStep1Desc: 'இன்று நீங்கள் செல்ல வேண்டிய பிரிவு, மருத்துவர் மற்றும் தளத்தைத் தேர்வு செய்யவும்.',
    quickStep2Title: '2. நோயாளி விவரங்களை உள்ளிடவும்',
    quickStep2Desc: 'நோயாளியின் பெயர், 10 இலக்க மொபைல் எண் மற்றும் வயதை உள்ளிடவும்.',
    quickStep3Title: '3. உறுதிப்படுத்தி சீட்டை அச்சிடுக',
    quickStep3Desc: 'உங்கள் உறுதியான ஓபிடி டோக்கன் எண், அறை வழிகாட்டுதல் மற்றும் QR சீட்டைப் பெறுங்கள்.',
    privacyGuaranteeBanner:
      'பகிர்ந்த கியோஸ்க் தனியுரிமை உத்தரவாதம்: உங்கள் தனிப்பட்ட விவரங்கள் இந்த இயந்திரத்தில் நிரந்தரமாகச் சேமிக்கப்படாது; நீங்கள் முடித்தவுடன் அல்லது செயல்படாத நேரத்திற்குப் பிறகு தானாகவே அழிக்கப்படும்.',
    browserKioskLimitNote:
      'உலாவி கியோஸ்க் குறிப்பு: இந்த வலை முனையம் அமர்வு முடிந்ததும் அல்லது செயல்படாதபோது தனிப்பட்ட தரவைத் தானாக அழிக்கும். கணினி திரைப் பூட்டு மருத்துவமனை வன்பொருளால் நிர்வகிக்கப்படுகிறது.',
    fullscreenEnterBtn: 'முழுத்திரை கியோஸ்க்',
    fullscreenExitBtn: 'முழுத்திரையிலிருந்து வெளியேறு',
    fullscreenUnsupportedNote:
      'இந்த உலாவி சாளரத்தில் முழுத்திரை ஆதரிக்கப்படவில்லை; நிலையான தொடுதிரை வடிவமைப்பு செயலில் உள்ளது.',
    staffExitBtn: 'பணியாளர் வெளியேற்றம் (Staff Exit)',
    staffExitModalTitle: 'அங்கீகரிக்கப்பட்ட பணியாளர் கியோஸ்க் வெளியேற்றம்',
    staffExitModalDesc:
      'சுய-சேவை கியோஸ்க் முறையிலிருந்து வெளியேற மருத்துவமனை பணியாளர் PIN எண்ணை உள்ளிடவும்.',
    staffPinPlaceholder: 'பணியாளர் PIN உள்ளிடவும்',
    staffVerifyAndExitBtn: 'PIN சரிபார்த்து வெளியேறுக',
    staffCancelBtn: 'கியோஸ்க் முறையில் தொடரவும்',
    staffInvalidPinError:
      'தவறான பணியாளர் PIN. அங்கீகரிக்கப்பட்ட மருத்துவமனை பணியாளர்கள் மட்டுமே கியோஸ்கிலிருந்து வெளியேற முடியும்.',
    sessionResetBanner:
      'நோயாளியின் தனியுரிமைக்காக முந்தைய அமர்வு அழிக்கப்பட்டது. அடுத்த நோயாளிக்குத் தயார்.',
    inactivityTimerLabel: 'தானியங்கி மீட்டமைப்பு நேரம்',
    inactivityWarningTitle: 'நீங்கள் இன்னும் கியோஸ்க்கைப் பயன்படுத்துகிறீர்களா?',
    inactivityWarningDesc:
      'இந்தப் பகிர்ந்த மருத்துவமனை முனையத்தில் உங்கள் தனியுரிமையைப் பாதுகாக்க, இந்தத் திரை தானாகவே மீட்டமைக்கப்பட்டு உங்கள் விவரங்கள் அழிக்கப்படும் நேரம்:',
    continueSessionBtn: 'எனது அமர்வைத் தொடரவும்',
    resetNowBtn: 'இப்போதே அழித்து புதிதாகத் தொடங்கு',
    stepProgressLabel: 'பதிவு முன்னேற்றம்',
    step1Short: '1. துறை தேர்வு',
    step2Short: '2. நோயாளி விவரம்',
    step3Short: '3. உறுதிப்படுத்தல் & சீட்டு',
    step1Heading: 'படி 1: ஓபிடி துறையைத் தேர்ந்தெடுக்கவும்',
    step1Instruction:
      'கீழே உள்ள துறை அட்டையைத் தொட்டுத் தேர்ந்தெடுத்து, பின்னர் தொடரவும் (Continue) என்பதை அழுத்தவும்.',
    selectedBadge: 'தேர்ந்தெடுக்கப்பட்ட துறை',
    tapToSelectBadge: 'தேர்ந்தெடுக்க தொடவும்',
    continueWithDeptBtn: 'தேர்ந்தெடுத்த துறையுடன் தொடரவும்',
    backToWelcomeBtn: 'வரவேற்புத் திரைக்குத் திரும்பு',
    step2Heading: 'படி 2: நோயாளி விவரங்களை உள்ளிடவும்',
    step2Instruction:
      'கீழே நோயாளியின் அடிப்படை விவரங்களை உள்ளிடவும். * குறியிடப்பட்ட அனைத்து விவரங்களும் அவசியம்.',
    step3Heading: 'படி 3: விவரங்களைச் சரிபார்த்து உறுதிப்படுத்தவும்',
    step3Instruction:
      'உங்கள் அதிகாரப்பூர்வ ஓபிடி டோக்கன் சீட்டை உருவாக்கும் முன் கீழே உள்ள விவரங்களைச் சரிபார்க்கவும்.',
    confirmAndGenerateBtn: 'உறுதிப்படுத்தி ஓபிடி சீட்டை உருவாக்குக',
    generatingTokenBtn: 'உறுதியான ஓபிடி டோக்கன் உருவாக்கப்படுகிறது…',
    editDetailsBtn: 'விவரங்களைத் திருத்த பின்செல்லவும்',
    confirmedSlipHeading: 'ஓபிடி பதிவு உறுதி செய்யப்பட்டது!',
    confirmedSlipSub:
      'உங்கள் அமர்வை முடிக்கும் முன் சீட்டை அச்சிடவும் அல்லது டோக்கன் எண்ணைக் குறித்துக் கொள்ளவும்.',
    kioskPatientNameLabel: 'பதிவு செய்யப்பட்ட நோயாளி பெயர் (தற்போதைய அமர்வு மட்டும்)',
    queuePositionLabel: 'வரிசையில் உங்களுக்கு முன் காத்திருப்பவர்கள்',
    approxWaitLabel: 'தோராயமான காத்திருப்பு நேரம்',
    printSlipBtn: 'ஓபிடி சீட்டை அச்சிடுக',
    printedSuccessNote:
      'அச்சு சாளரம் திறக்கப்பட்டது. சீட்டைப் பெற்ற பிறகு கீழே உள்ள "முடித்து திரையை அழிக்கவும்" என்பதைத் தொடவும்.',
    finishSessionBtn: 'முடித்து திரையை அழிக்கவும் (அடுத்த நோயாளி)',
    startNewRegBtn: 'மற்றொரு நோயாளியைப் பதிவு செய்க',
    lookupHeading: 'ஏற்கனவே உள்ள ஓபிடி டோக்கன் நிலையைப் பார்க்க',
    lookupSubtitle:
      'நேரடி வரிசை நிலை மற்றும் அறை வழிகாட்டுதலைப் பார்க்க உங்கள் டோக்கன் எண்ணை (எ.கா. OPD-GEN-001) உள்ளிடவும்.',
    lookupInputPlaceholder: 'எ.கா. OPD-GEN-001',
    lookupSearchBtn: 'டோக்கன் நிலையைப் பார்க்க',
    lookupSearchingBtn: 'வரிசை சரிபார்க்கப்படுகிறது…',
    lookupClearBtn: 'வரவேற்புத் திரைக்குத் திரும்பு',
    emergencyRouteBannerTitle: 'அறை 101 — அவசர சிகிச்சைப் பிரிவுக்கு உடனடி வழி',
    emergencyRouteBannerSub:
      'தரைத்தளம் (Floor 1), பிரதான நுழைவாயில் மற்றும் சாய்வுதளத்திற்கு அருகில். வரிசையில் காத்திருக்காமல் உடனடியாகச் செல்லவும்.',
    closeEmergencyRouteBtn: 'அவசர வழியை மூடுக'
  }
};

export function getKioskTranslations(lang = 'en') {
  const normalizedLang = ['en', 'hi', 'ta'].includes(lang) ? lang : 'en';
  const base = TRANSLATIONS[normalizedLang] || TRANSLATIONS.en;
  const kiosk = KIOSK_TRANSLATIONS[normalizedLang] || KIOSK_TRANSLATIONS.en;
  return {
    ...base,
    kiosk
  };
}

export { TRANSLATIONS, getLocalizedDepartment, resolveDepartmentCode };
