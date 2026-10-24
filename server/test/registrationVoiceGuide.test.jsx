import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from '../../src/App.jsx';
import RegistrationVoiceGuide, {
  REGISTRATION_SPEECH_LANG_MAP,
  REGISTRATION_VOICE_SCRIPTS,
  REGISTRATION_VOICE_UI,
  createRegistrationVoiceController,
  getRegistrationStepSpeech,
  resolveRegistrationSpeechVoice
} from '../../src/components/RegistrationVoiceGuide.jsx';

describe('Phase 2.2 — Voice-Assisted Patient Registration', () => {
  let originalWindow;
  let mockUtterances;
  let mockCancel;
  let mockSpeak;
  let mockGetVoices;
  let voicesChangedListeners;
  let availableVoices;

  function installMockSpeechEnvironment(voices = []) {
    availableVoices = voices;
    mockUtterances = [];
    voicesChangedListeners = [];

    mockCancel = vi.fn();
    mockSpeak = vi.fn((utterance) => {
      mockUtterances.push(utterance);
    });
    mockGetVoices = vi.fn(() => availableVoices);

    class MockSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.voice = null;
        this.rate = 1;
        this.onend = null;
        this.onerror = null;
      }
    }

    const mockSpeechSynthesis = {
      cancel: mockCancel,
      speak: mockSpeak,
      getVoices: mockGetVoices,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'voiceschanged') {
          voicesChangedListeners.push(handler);
        }
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (event === 'voiceschanged') {
          voicesChangedListeners = voicesChangedListeners.filter((h) => h !== handler);
        }
      })
    };

    globalThis.window = {
      ...(originalWindow || {}),
      speechSynthesis: mockSpeechSynthesis,
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance
    };
  }

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
    vi.restoreAllMocks();
  });

  it('1. renders the registration voice-guide control across all 3 steps of the registration flow', () => {
    installMockSpeechEnvironment([
      { name: 'English India', lang: 'en-IN', default: true }
    ]);

    for (const step of [1, 2, 3]) {
      const html = renderToStaticMarkup(
        <App
          disableSockets={true}
          initialView="register"
          initialRegStep={step}
          initialLang="en"
        />
      );
      expect(html).toContain('data-testid="registration-voice-guide"');
      expect(html).toContain(`data-reg-step="${step}"`);
      expect(html).toContain('data-speech-lang="en-IN"');
      expect(html).toContain('data-testid="reg-voice-play-btn"');
      expect(html).toContain('data-testid="reg-voice-replay-btn"');
      expect(html).toContain('data-testid="reg-voice-stop-btn"');
      expect(html).toContain('Listen to instructions');
      expect(html).toContain(`Step ${step} of 3 Audio Guide`);
    }
  });

  it('2. selects matching instructions and BCP-47 speech language codes (en-IN, hi-IN, ta-IN) for en, hi, and ta', () => {
    expect(REGISTRATION_SPEECH_LANG_MAP).toEqual({
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN'
    });

    const enStep1 = getRegistrationStepSpeech(1, 'en');
    expect(enStep1.speechLang).toBe('en-IN');
    expect(enStep1.text).toContain('Step 1 of 3: Choose OPD Department');

    const hiStep2 = getRegistrationStepSpeech(2, 'hi');
    expect(hiStep2.speechLang).toBe('hi-IN');
    expect(hiStep2.text).toContain('चरण 2');

    const taStep3 = getRegistrationStepSpeech(3, 'ta');
    expect(taStep3.speechLang).toBe('ta-IN');
    expect(taStep3.text).toContain('படி 3');

    installMockSpeechEnvironment([
      { name: 'Hindi India', lang: 'hi-IN', default: false },
      { name: 'Tamil India', lang: 'ta-IN', default: false }
    ]);

    const hiHtml = renderToStaticMarkup(
      <RegistrationVoiceGuide lang="hi" regStep={2} />
    );
    expect(hiHtml).toContain('data-speech-lang="hi-IN"');
    expect(hiHtml).toContain(REGISTRATION_VOICE_UI.hi.playBtn);

    const taHtml = renderToStaticMarkup(
      <RegistrationVoiceGuide lang="ta" regStep={3} />
    );
    expect(taHtml).toContain('data-speech-lang="ta-IN"');
    expect(taHtml).toContain(REGISTRATION_VOICE_UI.ta.playBtn);
  });

  it('3. starts speech with the matching voice and language when Play is pressed', () => {
    const enVoice = { name: 'Google English India', lang: 'en-IN', default: true };
    installMockSpeechEnvironment([enVoice]);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 1
    });

    const started = controller.play();
    expect(started).toBe(true);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockUtterances).toHaveLength(1);
    expect(mockUtterances[0].lang).toBe('en-IN');
    expect(mockUtterances[0].voice).toEqual(enVoice);
    expect(mockUtterances[0].text).toBe(REGISTRATION_VOICE_SCRIPTS.en[1]);
    expect(controller.getState().isSpeaking).toBe(true);

    // Completing the utterance resets isSpeaking to false
    mockUtterances[0].onend();
    expect(controller.getState().isSpeaking).toBe(false);
  });

  it('4. cancels current speech immediately when Stop is pressed', () => {
    installMockSpeechEnvironment([
      { name: 'English India', lang: 'en-IN', default: true }
    ]);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 2
    });

    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);

    controller.stop();
    expect(mockCancel).toHaveBeenCalledTimes(2); // 1 before play + 1 on stop
    expect(controller.getState().isSpeaking).toBe(false);
  });

  it('5. cancels prior speech and restarts cleanly without overlapping utterances when Replay is pressed', () => {
    installMockSpeechEnvironment([
      { name: 'English India', lang: 'en-IN', default: true }
    ]);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 1
    });

    controller.play();
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const firstUtterance = mockUtterances[0];

    controller.replay();
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenCalledTimes(2);
    expect(mockUtterances).toHaveLength(2);
    expect(mockUtterances[1].text).toBe(REGISTRATION_VOICE_SCRIPTS.en[1]);
    expect(controller.getState().isSpeaking).toBe(true);

    // Stale onend from the first cancelled utterance must not prematurely clear speaking state of the second utterance
    firstUtterance.onend();
    expect(controller.getState().isSpeaking).toBe(true);

    mockUtterances[1].onend();
    expect(controller.getState().isSpeaking).toBe(false);
  });

  it('6. stops prior speech immediately when the registration step changes (1 -> 2 -> 3)', () => {
    installMockSpeechEnvironment([
      { name: 'English India', lang: 'en-IN', default: true }
    ]);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 1
    });

    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);

    // Move Step 1 -> Step 2
    controller.setStep(2);
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().regStep).toBe(2);
    expect(controller.getState().text).toBe(REGISTRATION_VOICE_SCRIPTS.en[2]);
    expect(mockCancel).toHaveBeenCalledTimes(2);

    // Play on Step 2, then move Step 2 -> Step 3
    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);
    expect(mockUtterances[1].text).toBe(REGISTRATION_VOICE_SCRIPTS.en[2]);

    controller.setStep(3);
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().regStep).toBe(3);
    expect(controller.getState().text).toBe(REGISTRATION_VOICE_SCRIPTS.en[3]);
    expect(mockCancel).toHaveBeenCalledTimes(4);
  });

  it('7. stops prior speech immediately when the language changes and selects the new language instructions', () => {
    const voices = [
      { name: 'English India', lang: 'en-IN', default: true },
      { name: 'Hindi India', lang: 'hi-IN', default: false },
      { name: 'Tamil India', lang: 'ta-IN', default: false }
    ];
    installMockSpeechEnvironment(voices);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 2
    });

    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);
    expect(mockUtterances[0].lang).toBe('en-IN');

    // Switch language en -> hi while speaking
    controller.setLang('hi');
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().lang).toBe('hi');
    expect(controller.getState().speechLang).toBe('hi-IN');
    expect(controller.getState().text).toBe(REGISTRATION_VOICE_SCRIPTS.hi[2]);
    expect(mockCancel).toHaveBeenCalledTimes(2);

    controller.play();
    expect(mockUtterances[1].lang).toBe('hi-IN');
    expect(mockUtterances[1].text).toBe(REGISTRATION_VOICE_SCRIPTS.hi[2]);

    // Switch language hi -> ta while speaking
    controller.setLang('ta');
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().lang).toBe('ta');
    expect(controller.getState().speechLang).toBe('ta-IN');
    expect(controller.getState().text).toBe(REGISTRATION_VOICE_SCRIPTS.ta[2]);

    controller.play();
    expect(mockUtterances[2].lang).toBe('ta-IN');
    expect(mockUtterances[2].text).toBe(REGISTRATION_VOICE_SCRIPTS.ta[2]);
  });

  it('8. displays an honest fallback message when speechSynthesis is unavailable without breaking registration', () => {
    // Remove speechSynthesis from window
    globalThis.window = {};

    const cap = resolveRegistrationSpeechVoice('en');
    expect(cap.supported).toBe(false);

    const controller = createRegistrationVoiceController({
      initialLang: 'en',
      initialStep: 1
    });
    const started = controller.play();
    expect(started).toBe(false);
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().statusMessage).toBe(
      REGISTRATION_VOICE_UI.en.unavailableMsg
    );

    // Verify rendered fallback message and intact registration UI across en, hi, and ta
    for (const lang of ['en', 'hi', 'ta']) {
      const html = renderToStaticMarkup(
        <App
          disableSockets={true}
          initialView="register"
          initialRegStep={2}
          initialLang={lang}
        />
      );
      expect(html).toContain('data-testid="registration-voice-guide"');
      expect(html).toContain('data-testid="reg-voice-fallback-msg"');
      expect(html).toContain(REGISTRATION_VOICE_UI[lang].unavailableMsg);
      // Registration inputs remain completely functional
      expect(html).toContain('data-testid="reg-patient-name-input"');
      expect(html).toContain('data-testid="reg-phone-input"');
      expect(html).toContain('data-testid="reg-age-input"');
    }
  });

  it('9. handles asynchronous voice availability (voiceschanged), missing locale voice fallback, utterance errors (onerror), and unmount cleanup gracefully', () => {
    // Initially empty voice list (simulating browser before voiceschanged fires)
    installMockSpeechEnvironment([]);

    const controller = createRegistrationVoiceController({
      initialLang: 'ta',
      initialStep: 1
    });
    const detach = controller.attachVoicesChangedListener();
    expect(controller.getState().voiceCapability.voicesCount).toBe(0);

    // Populate voices asynchronously and fire voiceschanged
    const taVoice = { name: 'Valluvar Tamil', lang: 'ta-IN', default: false };
    availableVoices = [taVoice];
    voicesChangedListeners.forEach((fn) => fn());

    expect(controller.getState().voiceCapability.voicesCount).toBe(1);
    expect(controller.getState().voiceCapability.voice).toEqual(taVoice);

    // Start speech and simulate utterance error
    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);
    mockUtterances[0].onerror(new Event('error'));
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().statusMessage).toBe(
      REGISTRATION_VOICE_UI.ta.errorMsg
    );

    // When only a non-matching default voice is installed, falls back gracefully with notice
    availableVoices = [{ name: 'System Default', lang: 'en-US', default: true }];
    controller.play();
    expect(controller.getState().isSpeaking).toBe(true);
    expect(controller.getState().statusMessage).toBe(
      REGISTRATION_VOICE_UI.ta.fallbackVoiceNotice
    );

    // Disposing / unmounting cancels active speech and removes listener
    detach();
    controller.dispose();
    expect(controller.getState().isSpeaking).toBe(false);
  });

  it('10. never speaks patient names, phone numbers, ages, UHIDs, or token codes on any step (strict privacy enforcement)', () => {
    installMockSpeechEnvironment([
      { name: 'English India', lang: 'en-IN', default: true },
      { name: 'Hindi India', lang: 'hi-IN', default: false },
      { name: 'Tamil India', lang: 'ta-IN', default: false }
    ]);

    const syntheticSensitiveMarkers = [
      'Ramesh Kumar',
      'Sita Devi',
      '9876543210',
      '******3210',
      'UHID-',
      'OPD-GEN-',
      'OPD-ORT-',
      'OPD-PED-',
      'OPD-EYE-'
    ];

    for (const lang of ['en', 'hi', 'ta']) {
      const controller = createRegistrationVoiceController({
        initialLang: lang,
        initialStep: 1
      });

      for (const step of [1, 2, 3]) {
        controller.setStep(step);
        controller.play();
        const spokenText = mockUtterances[mockUtterances.length - 1].text;
        expect(spokenText.length).toBeGreaterThan(40);

        for (const forbidden of syntheticSensitiveMarkers) {
          expect(spokenText).not.toContain(forbidden);
        }
        // Ensure no 10-digit phone numbers or token codes appear in any script
        expect(spokenText).not.toMatch(/\b[6-9]\d{9}\b/);
        expect(spokenText).not.toMatch(/OPD-[A-Z]{3}-\d{3}/);
      }
    }
  });
});
