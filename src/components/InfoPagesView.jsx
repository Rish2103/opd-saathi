import React, { useState } from 'react';
import BrandLogo from './BrandLogo.jsx';

/**
 * Sanitizes raw error strings so raw JSON payloads, HTML error pages, or parser stack traces
 * are never exposed directly to patients or staff in the UI.
 */
export function sanitizeUiErrorMessage(
  rawInput,
  fallback = 'We could not complete this request right now. Please try again or visit the OPD Help Desk.'
) {
  if (!rawInput) return fallback;
  const text = String(rawInput).trim();
  if (!text) return fallback;

  // Detect raw JSON objects/arrays or JSON parser messages
  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']')) ||
    /Unexpected token|JSON\.parse|SyntaxError|ECONNREFUSED|ETIMEDOUT|Failed to fetch|NetworkError/i.test(
      text
    ) ||
    text.startsWith('<!DOCTYPE') ||
    text.startsWith('<html')
  ) {
    try {
      const parsed = JSON.parse(text);
      const extracted =
        parsed?.error?.message || parsed?.message || parsed?.error;
      if (typeof extracted === 'string' && !extracted.startsWith('{')) {
        return extracted;
      }
    } catch {
      // Not valid JSON or unparseable; return clean clinical fallback
    }
    return fallback;
  }

  return text;
}

/**
 * Unique, descriptive page titles per view and language.
 */
export function getUniquePageTitle(view, lang = 'en') {
  const titles = {
    en: {
      home: 'Live Waiting Room & Queue Board | OPD Saathi',
      register: 'New Patient OPD Registration | OPD Saathi',
      slip: 'Digital OPD Token Slip | OPD Saathi',
      'my-turn': 'Live Turn Status & Queue Tracker | OPD Saathi',
      navigate: 'Step-Free Indoor Hospital Map (3 Floors) | OPD Saathi',
      staff: 'Staff Queue & Triage Desk | OPD Saathi',
      kiosk: 'Self-Service Patient Kiosk Terminal | OPD Saathi',
      about: 'About Public Hospital Digital Companion | OPD Saathi',
      faq: 'Frequently Asked Questions (FAQ) | OPD Saathi',
      privacy: 'Patient Privacy & Data Policy | OPD Saathi',
      terms: 'Terms of Use & Clinical Disclaimer | OPD Saathi',
      'thank-you': 'Registration Complete | OPD Saathi',
      'not-found': 'Page Not Found (404) | OPD Saathi'
    },
    hi: {
      home: 'लाइव प्रतीक्षालय और कतार बोर्ड | OPD Saathi',
      register: 'नया मरीज ओपीडी पंजीकरण | OPD Saathi',
      slip: 'डिजिटल ओपीडी टोकन पर्ची | OPD Saathi',
      'my-turn': 'मेरी बारी और लाइव कतार स्थिति | OPD Saathi',
      navigate: 'अस्पताल के अंदर रास्ता (3 मंजिलें) | OPD Saathi',
      staff: 'स्टाफ कतार और ट्रायज डेस्क | OPD Saathi',
      kiosk: 'स्वयं-सेवा मरीज कियोस्क टर्मिनल | OPD Saathi',
      about: 'ओपीडी साथी के बारे में | OPD Saathi',
      faq: 'अक्सर पूछे जाने वाले प्रश्न (FAQ) | OPD Saathi',
      privacy: 'मरीज गोपनीयता नीति | OPD Saathi',
      terms: 'उपयोग की शर्तें और चिकित्सा अस्वीकरण | OPD Saathi',
      'thank-you': 'पंजीकरण पूर्ण - धन्यवाद | OPD Saathi',
      'not-found': 'पृष्ठ नहीं मिला (404) | OPD Saathi'
    },
    ta: {
      home: 'நேரடி காத்திருப்பு அறை மற்றும் வரிசைப் பலகை | OPD Saathi',
      register: 'புதிய நோயாளி ஓபிடி பதிவு | OPD Saathi',
      slip: 'டிஜிட்டல் ஓபிடி டோக்கன் சீட்டு | OPD Saathi',
      'my-turn': 'என் முறை மற்றும் நேரடி வரிசை நிலை | OPD Saathi',
      navigate: 'மருத்துவமனை உள் வழிகாட்டி (3 தளங்கள்) | OPD Saathi',
      staff: 'பணியாளர் வரிசை மற்றும் கட்டுப்பாட்டு மையம் | OPD Saathi',
      kiosk: 'சுய-சேவை நோயாளி கியோஸ்க் முனையம் | OPD Saathi',
      about: 'ஓபிடி சாத்தி பற்றி | OPD Saathi',
      faq: 'அடிக்கடி கேட்கப்படும் கேள்விகள் (FAQ) | OPD Saathi',
      privacy: 'நோயாளி தனியுரிமைக் கொள்கை | OPD Saathi',
      terms: 'பயன்பாட்டு விதிமுறைகள் | OPD Saathi',
      'thank-you': 'பதிவு முடிந்தது - நன்றி | OPD Saathi',
      'not-found': 'பக்கம் கிடைக்கவில்லை (404) | OPD Saathi'
    }
  };

  const dict = titles[lang] || titles.en;
  return dict[view] || dict.home;
}

/**
 * 5 Essential Patient & Hospital FAQs (Trilingual support).
 */
export const HOSPITAL_FAQS = {
  en: [
    {
      id: 'faq-1',
      question: 'How do I generate an OPD token without standing in the registration counter queue?',
      answer:
        'Select "Register for OPD" on the home screen or use the hospital Self-Service Kiosk (/kiosk). Choose your department (General Medicine, Paediatrics, Orthopaedics, or Ophthalmology), enter basic patient details, and confirm to receive an official sequential token code immediately.'
    },
    {
      id: 'faq-2',
      question: 'Does pressing Emergency Help automatically move my OPD token to the front of the doctor queue?',
      answer:
        'No. Requesting Staff Help alerts the Ground Floor Help Desk for human clinical assessment or wheelchair assistance. It never reorders the outpatient queue automatically. For chest pain, severe bleeding, or breathing difficulty, proceed directly to Room 101 (Emergency / Casualty) or call 108 / 112.'
    },
    {
      id: 'faq-3',
      question: 'How do I find a step-free lift or ramp route to upper-floor OPD rooms?',
      answer:
        'Keep the "Avoid Stairs" option enabled during registration or inside the Indoor Directions view. The 3-floor pathfinder automatically routes you via the Main Entrance Ramp and Central Patient Lift, avoiding all staircases.'
    },
    {
      id: 'faq-4',
      question: 'What happens if I close the browser tab or use a shared hospital kiosk?',
      answer:
        'On your personal phone, active tokens are saved locally on your device so you can reopen them anytime under "OPD Slip". On the shared hospital kiosk (/kiosk), the screen automatically clears personal details after printing or inactivity while keeping your server-side appointment active. You can always check your live status on any screen using your public token code (for example, OPD-GEN-001).'
    },
    {
      id: 'faq-5',
      question: 'Is my personal mobile number or identity exposed on the public waiting room board?',
      answer:
        'Never. Public waiting room displays and QR lookup links only expose your department token code (such as OPD-GEN-001), queue position, and room number. Your name and masked phone number are protected by a private session capability token.'
    }
  ],
  hi: [
    {
      id: 'faq-1',
      question: 'पंजीकरण काउंटर की लाइन में लगे बिना मैं ओपीडी टोकन कैसे प्राप्त कर सकता हूँ?',
      answer:
        'होम स्क्रीन पर "ओपीडी पंजीकरण" चुनें या अस्पताल के स्वयं-सेवा कियोस्क (/kiosk) का उपयोग करें। अपना विभाग चुनें, मरीज का नाम, मोबाइल नंबर और आयु दर्ज करें, और तुरंत अपना आधिकारिक ओपीडी टोकन प्राप्त करें।'
    },
    {
      id: 'faq-2',
      question: 'क्या आपातकालीन सहायता (Emergency Help) दबाने से मेरा टोकन अपने आप कतार में आगे बढ़ जाता है?',
      answer:
        'नहीं। स्टाफ सहायता का अनुरोध करने पर सहायता केंद्र को मानवीय मूल्यांकन या व्हीलचेयर मदद के लिए सूचना मिलती है, इससे मेडिकल कतार अपने आप नहीं बदलती। गंभीर आपात स्थिति में तुरंत कमरा 101 (आपातकालीन कक्ष) जाएँ या 108 / 112 पर कॉल करें।'
    },
    {
      id: 'faq-3',
      question: 'ऊपरी मंजिल के ओपीडी कमरों तक बिना सीढ़ियों (लिफ्ट और रैंप) वाला रास्ता कैसे देखें?',
      answer:
        'पंजीकरण के समय या "अस्पताल का रास्ता" अनुभाग में "सीढ़ियों से बचें (लिफ्ट/रैंप)" विकल्प चालू रखें। यह आपको मुख्य प्रवेश रैंप और मुख्य मरीज लिफ्ट के माध्यम से ही रास्ता दिखाएगा।'
    },
    {
      id: 'faq-4',
      question: 'यदि ब्राउज़र बंद हो जाए या मैं साझा कियोस्क का उपयोग करूँ तो मेरी पर्ची का क्या होगा?',
      answer:
        'आपके निजी फोन पर आपकी पर्ची सुरक्षित रहती है। साझा कियोस्क (/kiosk) पर आपकी गोपनीयता के लिए स्क्रीन स्वतः साफ़ हो जाती है, लेकिन अस्पताल के सर्वर पर आपका अपॉइंटमेंट सक्रिय रहता है। आप अपने टोकन कोड (जैसे OPD-GEN-001) से कभी भी अपनी बारी देख सकते हैं।'
    },
    {
      id: 'faq-5',
      question: 'क्या सार्वजनिक प्रतीक्षालय बोर्ड पर मेरा नाम या मोबाइल नंबर दिखाई देता है?',
      answer:
        'बिल्कुल नहीं। सार्वजनिक बोर्ड और क्यूआर कोड में केवल टोकन नंबर (जैसे OPD-GEN-001), कतार की स्थिति और कमरा नंबर दिखाया जाता है। मरीज की व्यक्तिगत जानकारी पूरी तरह सुरक्षित रहती है।'
    }
  ],
  ta: [
    {
      id: 'faq-1',
      question: 'பதிவு கவுண்டர் வரிசையில் நிற்காமல் ஓபிடி (OPD) டோக்கனைப் பெறுவது எப்படி?',
      answer:
        'முகப்புத் திரையில் "ஓபிடி பதிவு" என்பதைத் தேர்ந்தெடுக்கவும் அல்லது மருத்துவமனை சுய-சேவை கியோஸ்க்கை (/kiosk) பயன்படுத்தவும். துறையைத் தேர்ந்தெடுத்து, நோயாளியின் அடிப்படை விவரங்களை உள்ளிட்டு உடனடியாக அதிகாரப்பூர்வ டோக்கன் எண்ணைப் பெறலாம்.'
    },
    {
      id: 'faq-2',
      question: 'அவசர உதவி (Emergency Help) கோருவது எனது டோக்கனை வரிசையில் முன்னால் நகர்த்திவிடுமா?',
      answer:
        'இல்லை. பணியாளர் உதவியைக் கோருவது உதவி மையத்திற்குத் தகவல் அளிக்கும்; அது மருத்துவ வரிசையைத் தானாக மாற்றாது. தீவிர அவசரநிலைக்கு உடனடியாக அறை 101 (அவசர சிகிச்சைப் பிரிவு) செல்லவும் அல்லது 108 / 112 ஐ அழைக்கவும்.'
    },
    {
      id: 'faq-3',
      question: 'படிக்கட்டுகள் இல்லாமல் லிஃப்ட் மற்றும் சாய்வுதளம் வழியாக மருத்துவர் அறைக்குச் செல்வது எப்படி?',
      answer:
        'பதிவு செய்யும்போதும் "உள் வழிகாட்டி" பக்கத்திலும் "படிக்கட்டுகளைத் தவிர்க்கவும்" என்பதைத் தேர்வு செய்யவும். இது பிரதான சாய்வுதளம் மற்றும் நோயாளி லிஃப்ட் வழியாக மட்டுமே வழிகாட்டும்.'
    },
    {
      id: 'faq-4',
      question: 'பகிர்ந்த கியோஸ்க் திரையை மூடினால் எனது ஓபிடி பதிவு ரத்து செய்யப்படுமா?',
      answer:
        'இல்லை. கியோஸ்க் அமர்வு முடிந்ததும் அடுத்த நோயாளியின் தனியுரிமைக்காகத் திரை மட்டுமே அழிக்கப்படும்; உங்கள் மருத்துவமனை டோக்கன் தொடர்ந்து செயலில் இருக்கும். உங்கள் டோக்கன் எண்ணை (எ.கா. OPD-GEN-001) உள்ளிட்டு எப்போது வேண்டுமானாலும் நிலையை அறியலாம்.'
    },
    {
      id: 'faq-5',
      question: 'பொதுக் காத்திருப்புப் பலகையில் எனது பெயர் அல்லது கைபேசி எண் தெரியுமா?',
      answer:
        'ஒருபோதும் தெரியாது. பொதுப் பலகை மற்றும் QR குறியீட்டில் டோக்கன் எண் (எ.கா. OPD-GEN-001), வரிசை நிலை மற்றும் அறை எண் மட்டுமே காட்டப்படும்.'
    }
  ]
};

export function FaqSection({ lang = 'en', standalone = false, onNavigate }) {
  const faqs = HOSPITAL_FAQS[lang] || HOSPITAL_FAQS.en;
  const [openIndex, setOpenIndex] = useState(0);

  const sectionHeading =
    lang === 'hi'
      ? 'अक्सर पूछे जाने वाले प्रश्न (5 मुख्य प्रश्न)'
      : lang === 'ta'
        ? 'அடிக்கடி கேட்கப்படும் கேள்விகள் (5 முக்கிய வினாக்கள்)'
        : 'Frequently Asked Questions';

  const sectionSub =
    lang === 'hi'
      ? 'ओपीडी पंजीकरण, लाइव कतार, लिफ्ट/रैंप नेविगेशन और गोपनीयता से जुड़ी महत्वपूर्ण जानकारी।'
      : lang === 'ta'
        ? 'ஓபிடி பதிவு, நேரடி வரிசை, லிஃப்ட் வழிகாட்டி மற்றும் தனியுரிமை குறித்த தெளிவான பதில்கள்.'
        : 'Clear answers regarding token generation, queue rules, step-free access, and patient privacy.';

  return (
    <section
      id="faq-section"
      data-testid="faq-section"
      aria-labelledby="faq-heading"
      className="card-surface p-5 sm:p-7 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="space-y-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal">
            {lang === 'hi'
              ? 'मरीज सहायता मार्गदर्शिका'
              : lang === 'ta'
                ? 'நோயாளி வழிகாட்டி'
                : 'PATIENT SUPPORT GUIDE'}
          </span>
          <h2
            id="faq-heading"
            className="text-xl sm:text-2xl font-extrabold text-ink-primary"
          >
            {sectionHeading}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-2xl">
            {sectionSub}
          </p>
        </div>

        {standalone && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="btn-secondary text-xs sm:text-sm"
          >
            <span>
              {lang === 'hi'
                ? 'होम पर वापस जाएँ'
                : lang === 'ta'
                  ? 'முகப்புக்குத் திரும்பு'
                  : 'Back to Home'}
            </span>
          </button>
        )}
      </div>

      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-canvas overflow-hidden">
        {faqs.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.id} data-testid={`faq-item-${idx + 1}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx + 1}`}
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="touch-target w-full px-4 sm:px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-subtle/60 transition-colors"
              >
                <span className="font-bold text-sm sm:text-base text-ink-primary leading-snug">
                  <span className="font-token text-xs font-extrabold text-brand-teal mr-2.5">
                    0{idx + 1}
                  </span>
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="w-7 h-7 rounded-lg border border-border-strong bg-surface text-brand-primary font-token font-extrabold text-sm inline-flex items-center justify-center shrink-0"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  id={`faq-panel-${idx + 1}`}
                  className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-ink-secondary leading-relaxed border-t border-border-subtle/60 bg-surface"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Institutional About Page (Item 19).
 */
export function AboutPageView({ lang = 'en', onNavigate }) {
  return (
    <section
      data-testid="about-page-view"
      aria-labelledby="about-page-heading"
      className="card-surface p-5 sm:p-8 space-y-6"
    >
      <div className="border-b border-border-subtle pb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal">
            PUBLIC HEALTHCARE INFRASTRUCTURE
          </span>
          <h1
            id="about-page-heading"
            className="text-2xl sm:text-3xl font-extrabold text-ink-primary"
          >
            About OPD Saathi
          </h1>
          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
            OPD Saathi is a public-hospital outpatient queue management and step-free indoor wayfinding system built to reduce crowding at registration counters and make hospital navigation clear for patients, elders, and families.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="btn-secondary text-xs sm:text-sm"
        >
          <span>Return to Home</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-canvas border border-border-subtle space-y-2">
          <div className="font-token text-xs font-extrabold uppercase text-brand-teal">
            01 · TRANSPARENT QUEUE MANAGEMENT
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-ink-primary">
            Real-Time Outpatient Token Tracking
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Patients receive a deterministic, sequential department token (such as OPD-GEN-001) and can monitor live waiting counts, doctor availability, and turn alerts without standing in corridor lines.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-canvas border border-border-subtle space-y-2">
          <div className="font-token text-xs font-extrabold uppercase text-brand-teal">
            02 · BARRIER-FREE HOSPITAL ACCESS
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-ink-primary">
            3-Floor Step-Free Lift &amp; Ramp Routing
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Every slip includes landmark-based directions across Ground, First, and Second floors, defaulting to step-free ramps and patient elevators for wheelchair users and senior citizens.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-canvas border border-border-subtle space-y-2">
          <div className="font-token text-xs font-extrabold uppercase text-brand-teal">
            03 · TRILINGUAL SELF-SERVICE KIOSK
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-ink-primary">
            Dedicated Touchscreen Terminal (/kiosk)
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Walk-in patients without smartphones can independently register in English, Hindi, or Tamil at the hospital entrance kiosk, print their token slip, and have their session automatically cleared for privacy.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-canvas border border-border-subtle space-y-2">
          <div className="font-token text-xs font-extrabold uppercase text-brand-teal">
            04 · CLINICAL SAFETY FIRST
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-ink-primary">
            Pre-Registration Emergency Help &amp; Triage
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Emergency assistance (108, 112, Room 101 Casualty routing, and Help Desk staff alerts) is permanently accessible on every screen without requiring prior registration.
          </p>
        </div>
      </div>

      <FaqSection lang={lang} standalone={false} />
    </section>
  );
}

/**
 * Privacy Policy Page (Items 3 & 9).
 */
export function PrivacyPolicyView({ onNavigate }) {
  return (
    <section
      data-testid="privacy-policy-view"
      aria-labelledby="privacy-heading"
      className="card-surface p-5 sm:p-8 space-y-6"
    >
      <div className="border-b border-border-subtle pb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal">
            DATA PROTECTION &amp; PATIENT PRIVACY
          </span>
          <h1
            id="privacy-heading"
            className="text-2xl sm:text-3xl font-extrabold text-ink-primary"
          >
            Patient Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Effective for all OPD Saathi web, mobile, and self-service kiosk sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="btn-secondary text-xs sm:text-sm"
        >
          <span>Return to Home</span>
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-ink-secondary leading-relaxed">
        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            1. Minimal Clinical Data Collection
          </h2>
          <p>
            OPD Saathi collects only the minimum fields required to issue an outpatient queue token: Patient Full Name, 10-digit Mobile Number, Age, optional Gender, Visit Type, optional Hospital Registration Number (UHID), and step-free route preference.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            2. Public Queue Board &amp; QR Code Redaction
          </h2>
          <p>
            Public waiting room boards, public lookup APIs, and printed QR codes expose only the non-sensitive token code (e.g., <code className="font-token font-bold text-brand-primary">OPD-GEN-001</code>) and queue position. Patient names, capability tokens, and full phone numbers are never embedded in public QR payloads.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            3. Personal Device vs. Shared Kiosk Storage
          </h2>
          <p>
            When used on a personal smartphone, your active OPD slip reference is stored locally in your browser so you can track your turn even if you refresh the page. You can remove saved slips from your device at any time. In Self-Service Kiosk Mode (<code className="font-token font-bold text-brand-primary">/kiosk</code>), personal details are never stored in <code className="font-token">localStorage</code> and are wiped automatically on session completion or inactivity timeout.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            4. Zero Third-Party Advertising or Analytics Trackers
          </h2>
          <p>
            OPD Saathi does not sell, rent, or share patient registration data with advertisers or external analytics networks. All session credentials and staff authentication secrets remain strictly on the hospital server.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Terms & Conditions Page (Items 4 & 9).
 */
export function TermsPageView({ onNavigate, onOpenEmergency }) {
  return (
    <section
      data-testid="terms-page-view"
      aria-labelledby="terms-heading"
      className="card-surface p-5 sm:p-8 space-y-6"
    >
      <div className="border-b border-border-subtle pb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal">
            HOSPITAL SERVICE TERMS &amp; SAFETY RULES
          </span>
          <h1
            id="terms-heading"
            className="text-2xl sm:text-3xl font-extrabold text-ink-primary"
          >
            Terms of Use &amp; Clinical Disclaimer
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Operational guidelines for patients and hospital visitors using OPD Saathi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="btn-secondary text-xs sm:text-sm"
        >
          <span>Return to Home</span>
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-ink-secondary leading-relaxed">
        <div className="p-4 sm:p-5 rounded-xl bg-red-50/70 border border-status-emergency/40 space-y-2">
          <h2 className="font-extrabold text-base text-status-emergency">
            1. Medical Emergency &amp; Non-Diagnostic Triage Notice
          </h2>
          <p className="text-ink-primary">
            OPD Saathi is an outpatient queue and indoor navigation utility, not a medical diagnosis or automated emergency triage system. If a patient experiences chest pain, severe trauma, stroke symptoms, or difficulty breathing, proceed immediately to <strong>Room 101 (Emergency / Casualty, Ground Floor)</strong> or call <strong>108 / 112</strong>.
          </p>
          {onOpenEmergency && (
            <button
              type="button"
              onClick={onOpenEmergency}
              className="btn-danger text-xs sm:text-sm mt-1"
            >
              <span>Open Emergency Help Now</span>
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            2. Single Active Token Per Department Per Day
          </h2>
          <p>
            To keep wait times fair for all citizens, each patient may hold one active waiting token per OPD department on a given hospital queue date (IST). Duplicate submissions automatically reopen your existing active token.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            3. Estimated Wait Times &amp; Clinical Priority
          </h2>
          <p>
            Displayed waiting times are approximate estimates based on average consultation durations. Hospital doctors and nursing staff retain full authority to adjust consultation order for clinical emergencies or medical necessity.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-canvas border border-border-subtle space-y-1.5">
          <h2 className="font-extrabold text-base text-ink-primary">
            4. Self-Entered Mobile Numbers
          </h2>
          <p>
            Mobile numbers entered during registration are recorded for hospital queue identification and duplicate prevention without requiring SMS OTP barriers for patients without active SIM cards.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Thank You / Registration Completion Page (Item 16).
 */
export function ThankYouPageView({ activeSlip, onNavigate }) {
  return (
    <section
      data-testid="thank-you-page-view"
      aria-labelledby="thank-you-heading"
      className="card-surface p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-5"
    >
      <div className="w-12 h-12 rounded-xl bg-green-50 border border-status-serving/40 text-status-serving font-token font-extrabold text-lg inline-flex items-center justify-center mx-auto">
        OK
      </div>
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-status-serving">
          OUTPATIENT REGISTRATION CONFIRMED
        </span>
        <h1
          id="thank-you-heading"
          className="text-2xl sm:text-3xl font-extrabold text-ink-primary"
        >
          Thank You for Using OPD Saathi
        </h1>
        <p className="text-sm sm:text-base text-ink-secondary max-w-lg mx-auto">
          {activeSlip?.publicCode
            ? `Your token ${activeSlip.publicCode} is active in the hospital queue. Please proceed to the waiting area and monitor the live board for your turn.`
            : 'Your outpatient session is up to date. You can view your digital slip, check your live turn status, or follow step-free directions below.'}
        </p>
      </div>

      {activeSlip?.publicCode && (
        <div className="p-4 rounded-xl bg-canvas border border-border-strong/70 inline-block min-w-[240px]">
          <div className="text-xs font-bold uppercase text-ink-muted">
            ACTIVE TOKEN NUMBER
          </div>
          <div className="font-token text-2xl sm:text-3xl font-extrabold text-brand-primary mt-0.5">
            {activeSlip.publicCode}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('slip')}
          className="btn-primary text-xs sm:text-sm"
        >
          <span>View Digital OPD Slip</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('my-turn')}
          className="btn-teal text-xs sm:text-sm"
        >
          <span>Check Live Turn Status</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="btn-secondary text-xs sm:text-sm"
        >
          <span>Return to Home</span>
        </button>
      </div>
    </section>
  );
}

/**
 * Custom 404 Page Not Found View (Item 2).
 */
export function NotFoundPageView({ onNavigate, onOpenEmergency }) {
  return (
    <section
      data-testid="not-found-page-view"
      aria-labelledby="not-found-heading"
      className="card-surface p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-5"
    >
      <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-subtle border border-border-strong font-token text-xs font-extrabold text-brand-primary">
        HTTP 404 · ROUTE NOT FOUND
      </div>
      <div className="space-y-2">
        <h1
          id="not-found-heading"
          className="text-2xl sm:text-3xl font-extrabold text-ink-primary"
        >
          This Hospital Page Could Not Be Found
        </h1>
        <p className="text-sm sm:text-base text-ink-secondary max-w-lg mx-auto">
          The address you entered does not match an active OPD Saathi screen. Choose one of the verified hospital pathways below to continue safely.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          data-testid="not-found-home-btn"
          onClick={() => onNavigate('home')}
          className="btn-primary text-xs sm:text-sm"
        >
          <span>Go to OPD Home Board</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('register')}
          className="btn-teal text-xs sm:text-sm"
        >
          <span>Register for OPD Token</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('kiosk')}
          className="btn-secondary text-xs sm:text-sm"
        >
          <span>Open Self-Service Kiosk</span>
        </button>
        {onOpenEmergency && (
          <button
            type="button"
            onClick={onOpenEmergency}
            className="btn-danger text-xs sm:text-sm"
          >
            <span>Emergency Help</span>
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Top-level React Error Boundary so unexpected runtime faults render a clean
 * hospital service notice instead of a blank screen or raw stack trace (Item 2).
 */
export class ClinicalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-ink-primary flex items-center justify-center p-4">
          <div className="card-surface max-w-lg w-full p-6 sm:p-8 text-center space-y-4">
            <div className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-50 border border-status-next text-status-next font-token text-xs font-extrabold">
              TEMPORARY DISPLAY NOTICE
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink-primary">
              We Encountered a Display Issue
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Your hospital queue position and active OPD tokens remain safe on the server. Please reload the screen to continue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  if (typeof window !== 'undefined') {
                    window.location.assign('/');
                  }
                }}
                className="btn-primary text-xs sm:text-sm"
              >
                <span>Return to OPD Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Clean, responsive institutional footer with working navigation links,
 * clickable BrandLogo, and emergency helplines.
 */
export function ClinicalFooter({ lang = 'en', t, onNavigate, onOpenEmergency }) {
  return (
    <footer
      data-testid="clinical-footer"
      className="no-print border-t border-border-subtle bg-surface mt-12"
    >
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Column 1: Brand & Mission (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-3 min-w-0">
            <BrandLogo
              title={t?.brandTitle || 'OPD Saathi'}
              subtitle=""
              compact={false}
              onClick={() => onNavigate('home')}
            />
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-sm">
              Public hospital digital outpatient companion for transparent queue management, step-free indoor wayfinding, and trilingual self-service kiosks.
            </p>
          </div>

          {/* Column 2: Patient Pathway (3 cols on desktop) */}
          <div className="lg:col-span-2 space-y-3 min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink-primary">
              Patient Services
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-medium text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  {t?.nav?.home || 'Live Queue Board'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  {t?.nav?.register || 'OPD Registration'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('my-turn')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  {t?.nav?.myTurn || 'Track My Turn'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('navigate')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  {t?.nav?.navigate || 'Step-Free Indoor Directions'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-kiosk-link"
                  onClick={() => onNavigate('kiosk')}
                  className="hover:text-brand-primary transition-colors text-left font-bold text-brand-teal"
                >
                  Self-Service Kiosk (/kiosk)
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Information & Policies (3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-3 min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-wider text-ink-primary">
              Information &amp; Legal
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-medium text-ink-secondary">
              <li>
                <button
                  type="button"
                  data-testid="footer-about-link"
                  onClick={() => onNavigate('about')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  About OPD Saathi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-faq-link"
                  onClick={() => onNavigate('faq')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  Frequently Asked Questions (5 FAQs)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-privacy-link"
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-terms-link"
                  onClick={() => onNavigate('terms')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-thank-you-link"
                  onClick={() => onNavigate('thank-you')}
                  className="hover:text-brand-primary transition-colors text-left"
                >
                  Visit Confirmation Summary
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Emergency & Hospital Hours (3 cols on desktop) */}
          <div className="lg:col-span-3 rounded-xl border border-border-subtle bg-canvas p-4 space-y-3 min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-wider text-status-emergency">
              24x7 Casualty &amp; Helpline
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Room 101 (Ground Floor, beside Main Entrance Ramp). Ambulance: <strong className="font-token text-ink-primary">108</strong> · Emergency: <strong className="font-token text-ink-primary">112</strong>
            </p>
            {onOpenEmergency && (
              <button
                type="button"
                onClick={onOpenEmergency}
                className="btn-danger text-xs py-2 px-3.5 w-full"
              >
                <span>{t?.emergencyBtn || 'Emergency Help'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-5 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 pr-20 text-xs text-ink-muted">
          <span>
            OPD Saathi Public Hospital Outpatient System · Accessible in English, हिन्दी, and தமிழ்
          </span>
          <span>OPD Timings: Mon–Sat 08:00–16:00 IST · Casualty: 24x7</span>
        </div>
      </div>
    </footer>
  );
}
