'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { getTitle } from '@/lib/types';
import { syncApplyLog, trackEvent } from '@/lib/learner-sync';
import { api, ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import GeminiLiveOverlay from '@/components/GeminiLiveOverlay';

type ApplyState = 'prompt' | 'composer' | 'recording' | 'conversation' | 'thinking' | 'finalizing' | 'result';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  photo?: string;
}

interface ApplyResult {
  summary: string;
  score: number;
  feedback: string;
  nextStep: string;
}

const prompts = {
  bn: {
    title: 'মাঠে প্রয়োগ',
    subtitle: 'আজ তুমি যা শিখেছো, মাঠে কী করেছো?',
    instruction: 'কোন ক্লায়েন্টের সাথে দেখা করেছো, কী দর চেয়েছো, কোন আপত্তি সামলেছো — বলো, লেখো বা ছবি তোলো।',
    speakBtn: 'বলো',
    writeBtn: 'লেখো',
    cameraBtn: 'ছবি',
    speakDesc: 'ভয়েস রেকর্ড',
    writeDesc: 'টাইপ করো',
    cameraDesc: 'আজকের কাজের ছবি',
    placeholder: 'আজ মাঠে আমি...',
    placeholderAdd: 'আরও বিস্তারিত যোগ করো...',
    send: 'পাঠাও',
    submitProgress: 'সম্পূর্ণ জমা দাও',
    cancel: 'বাতিল',
    thinking: 'অর্জুন ভাবছে...',
    finalizing: 'অর্জুন মূল্যায়ন করছে...',
    speaking: 'অর্জুন বলছে...',
    score: 'প্রয়োগ স্কোর',
    feedback: 'অর্জুনের মূল্যায়ন',
    nextStep: 'পরবর্তী পদক্ষেপ',
    again: 'নতুন রিপোর্ট',
    listening: 'বলো... আমি শুনছি',
    stop: 'থামাও',
    youReported: 'তুমি যা বলেছো',
    examplesLabel: 'উদাহরণ',
    addPhoto: 'ছবি যোগ করো',
    retakePhoto: 'ছবি বদলাও',
    removePhoto: 'সরাও',
    photoAttached: 'ছবি সংযুক্ত',
    recordVoice: 'ভয়েস রেকর্ড',
    compressing: 'ছবি প্রসেস হচ্ছে...',
    imageTooBig: 'ছবি খুব বড়।',
    emptySend: 'ছবি, ভয়েস বা টেক্সট যোগ করো।',
    finishNote: 'যখন সব বলা হয়ে যাবে, "সম্পূর্ণ জমা দাও" চাপো — অর্জুন স্কোর দেবে।',
    examples: [
      'আজ Uniworld-এ একটি duplex-এ site visit করেছি — Silver/Gold কোট পাঠাবো ১০ দিনের মধ্যে',
      'আজ একটি অফিসে ১২০ গাছের রক্ষণাবেক্ষণের প্রস্তাব দিয়েছি — ১২,০০০/মাস TMIL ধাঁচে',
      'আজ RD-তে walk-in ক্লায়েন্টকে Workshop Ankita দেখিয়েছি, ছবি তুলে AI render পাঠিয়েছি',
    ],
  },
  hi: {
    title: 'मैदान में अभ्यास',
    subtitle: 'आज तुमने जो सीखा, मैदान में क्या किया?',
    instruction: 'किस क्लाइंट से मिले, क्या रेट माँगा, कौन सी आपत्ति सँभाली — बताओ, लिखो या फ़ोटो लो।',
    speakBtn: 'बोलो',
    writeBtn: 'लिखो',
    cameraBtn: 'फ़ोटो',
    speakDesc: 'आवाज़ रिकॉर्ड',
    writeDesc: 'टाइप करो',
    cameraDesc: 'आज के काम की तस्वीर',
    placeholder: 'आज मैदान में मैंने...',
    placeholderAdd: 'और विवरण जोड़ो...',
    send: 'भेजो',
    submitProgress: 'पूरी प्रगति जमा करो',
    cancel: 'रद्द',
    thinking: 'अर्जुन सोच रहा है...',
    finalizing: 'अर्जुन मूल्यांकन कर रहा है...',
    speaking: 'अर्जुन बोल रहा है...',
    score: 'अभ्यास स्कोर',
    feedback: 'अर्जुन का मूल्यांकन',
    nextStep: 'अगला क़दम',
    again: 'नई रिपोर्ट',
    listening: 'बोलो... मैं सुन रहा हूँ',
    stop: 'रोको',
    youReported: 'तुमने जो बताया',
    examplesLabel: 'उदाहरण',
    addPhoto: 'फ़ोटो जोड़ो',
    retakePhoto: 'फ़ोटो बदलो',
    removePhoto: 'हटाओ',
    photoAttached: 'फ़ोटो जुड़ी',
    recordVoice: 'आवाज़ रिकॉर्ड',
    compressing: 'तस्वीर प्रोसेस हो रही है...',
    imageTooBig: 'तस्वीर बहुत बड़ी है।',
    emptySend: 'तस्वीर, आवाज़ या टेक्स्ट जोड़ो।',
    finishNote: 'जब सब बता दो, "पूरी प्रगति जमा करो" दबाओ — अर्जुन स्कोर देगा।',
    examples: [
      'आज Uniworld में एक duplex का site visit किया — १० दिन में Silver/Gold कोट भेजूँगा',
      'आज एक ऑफिस को १२० पौधों का maintenance का प्रस्ताव दिया — ₹१२,०००/माह TMIL pattern',
      'आज RD में walk-in ग्राहक को Workshop Ankita दिखाया, फोटो से AI render बनाकर भेजा',
    ],
  },
  en: {
    title: 'Field Application',
    subtitle: 'What did you do in the field today?',
    instruction: 'Which client, what you quoted, which objection you handled — speak, write, or upload a photo.',
    speakBtn: 'Speak',
    writeBtn: 'Write',
    cameraBtn: 'Photo',
    speakDesc: 'Voice record',
    writeDesc: 'Type it out',
    cameraDesc: "Today's work photo",
    placeholder: 'Today in the field I...',
    placeholderAdd: 'Add more details...',
    send: 'Send',
    submitProgress: 'Submit progress',
    cancel: 'Cancel',
    thinking: 'Taksha is checking the work...',
    finalizing: 'Taksha is reviewing your practice...',
    speaking: 'Taksha is speaking...',
    score: 'Application Score',
    feedback: "Taksha's Workshop Feedback",
    nextStep: 'Next Step',
    again: 'New report',
    listening: 'Speak... I am listening',
    stop: 'Stop',
    youReported: 'What you reported',
    examplesLabel: 'Examples',
    addPhoto: 'Add photo',
    retakePhoto: 'Replace photo',
    removePhoto: 'Remove',
    photoAttached: 'Photo attached',
    recordVoice: 'Voice record',
    compressing: 'Processing image…',
    imageTooBig: 'Image too large.',
    emptySend: 'Add a photo, voice, or text.',
    finishNote: 'When you\'ve said everything, tap "Submit progress" — Taksha will give a score.',
    examples: [
      'Today I did a site visit to a Uniworld duplex — sending Silver/Gold quote within 10 days',
      'Today I proposed a 120-plant office maintenance contract — ₹12,000/month on the TMIL pattern',
      'Today I showed a walk-in client at RD the Workshop Ankita app, generated an AI render from their photo',
    ],
  },
};

const MAX_IMAGE_DIM = 1024;
const JPEG_QUALITY = 0.85;

export default function ApplyPage() {
  const { lang, selectedModuleId, modules, voiceEnabled } = useStore();

  const [state, setState] = useState<ApplyState>('prompt');
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const p = prompts[lang];
  const currentModule = modules.find((m) => m.id === selectedModuleId);

  // Auto-scroll the thread on new turns
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length, state]);

  // Auto-grow the textarea up to a cap as the user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input, state]);

  // Stop any playing audio on unmount
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) { try { a.pause(); } catch { /* ignore */ } }
    };
  }, []);

  function resetAll() {
    stopAudio();
    setState('prompt');
    setHistory([]);
    setInput('');
    setPhoto(null);
    setResult(null);
    setError(null);
  }

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;
    try { a.pause(); a.src = ''; } catch { /* ignore */ }
    setSpeaking(false);
  }

  function enterMode(mode: 'speak' | 'write' | 'camera') {
    setState('composer');
    setError(null);
    if (mode === 'camera') setTimeout(() => fileInputRef.current?.click(), 0);
    else if (mode === 'speak') setVoiceOpen(true);
    else setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setPhoto(dataUrl);
    } catch (err) {
      console.error('image error:', err);
      setError(p.imageTooBig);
    } finally {
      setPhotoBusy(false);
    }
  }

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('decode'));
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('canvas'));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function composePromptHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return history.map((t) => ({ role: t.role, content: t.content }));
  }

  async function playTakshaReply(text: string) {
    if (!voiceEnabled || !text) return;
    try {
      setSpeaking(true);
      const blob = await api.ai.tts(text, lang);
      const url = URL.createObjectURL(blob);
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current;
      a.src = url;
      a.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      a.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await a.play().catch(() => { setSpeaking(false); });
    } catch {
      setSpeaking(false);
    }
  }

  async function sendTurn() {
    const text = input.trim();
    if (!text && !photo) {
      setError(p.emptySend);
      return;
    }
    setError(null);
    stopAudio();

    // Add user turn
    const userTurn: Turn = { role: 'user', content: text || '(photo)', photo: photo || undefined };
    const newHistory = [...history, userTurn];
    setHistory(newHistory);

    // Clear composer for next input
    const sentText = text;
    const sentPhoto = photo;
    setInput('');
    setPhoto(null);
    setState('thinking');

    const moduleLine = currentModule ? `${selectedModuleId} (${getTitle(currentModule, lang)})` : selectedModuleId;
    const turnCount = newHistory.filter((t) => t.role === 'user').length;
    const coachPrompt = `FIELD COACHING CONVERSATION.

The learner is studying module: ${moduleLine}. They are reporting what they did in the field today. You are a warm, brief coach — NOT an interrogator.

Rules (strict):
- Keep reply to 1 short sentence. 2 only if absolutely necessary.
- Acknowledge what they said, then ONE of: a brief tip, a quick affirmation, or (only if something essential is missing) ONE short clarifying question.
- Most turns should NOT contain a question. Default to a short acknowledgment + small tip or encouragement.
- NEVER ask more than one question in a single reply. NEVER ask back-to-back questions across turns.
- This is turn ${turnCount}. After turn 2, avoid asking questions entirely unless the learner clearly invited one — just affirm briefly so they feel heard, and let them decide when to Submit progress.
- DO NOT score yet — evaluation happens only when the learner taps "Submit progress".
- Plain prose, no lists, no markdown, no emojis.
- Respond in the learner's language.

Latest user turn: "${sentText || '(submitted a photo — give a one-sentence observation, no question)'}"`;

    try {
      const { reply } = await api.ai.chat({
        message: coachPrompt,
        history: composePromptHistory().slice(-8), // keep context small
        moduleId: selectedModuleId,
        lang,
        image: sentPhoto || undefined,
      });

      const assistantTurn: Turn = { role: 'assistant', content: reply };
      setHistory((h) => [...h, assistantTurn]);
      setState('conversation');
      playTakshaReply(reply);
      trackEvent('apply_turn', selectedModuleId, { hasPhoto: !!sentPhoto, hasText: !!sentText });
    } catch (err) {
      console.error(err);
      setState('conversation');
      setError(err instanceof ApiError ? errorCopy(err, lang) : errorCopy(err, lang));
    }
  }

  function handleLiveTurn(turn: { userText: string; modelText: string }) {
    if (!turn.userText && !turn.modelText) return;
    const additions: Turn[] = [];
    if (turn.userText) additions.push({ role: 'user', content: turn.userText });
    if (turn.modelText) additions.push({ role: 'assistant', content: turn.modelText });
    const nextHistory = [...history, ...additions];
    setHistory(nextHistory);
    setState('conversation');
    trackEvent('apply_voice_turn', selectedModuleId, { live: true, hasText: !!turn.userText });

    const scoreMatch = turn.modelText.match(/(\d{1,2})\s*(?:\/|out of|में से|এর মধ্যে)\s*10/i);
    if (!scoreMatch) return;
    const score = Math.max(1, Math.min(10, parseInt(scoreMatch[1], 10)));
    const parsed: ApplyResult = {
      summary: turn.userText.slice(0, 120) || turn.modelText.slice(0, 120),
      score,
      feedback: turn.modelText,
      nextStep: lang === 'bn' ? 'পরের কথোপকথনে পরের পদক্ষেপ জানাও।' : lang === 'hi' ? 'अगली बातचीत में अगला कदम बताओ।' : 'Share the next field step in the next conversation.',
    };
    setResult(parsed);
    setState('result');
    const userText = nextHistory.filter((t) => t.role === 'user').map((t) => t.content).join(' | ');
    const hasAnyPhoto = nextHistory.some((t) => t.role === 'user' && !!t.photo);
    syncApplyLog(selectedModuleId, userText, parsed.score, parsed.feedback, parsed.nextStep, hasAnyPhoto);
    trackEvent('apply_voice_submit', selectedModuleId, {
      score: parsed.score,
      turns: nextHistory.length,
      hasPhoto: hasAnyPhoto,
      live: true,
    });
  }

  async function submitProgress() {
    if (history.length === 0) return;
    stopAudio();
    setState('finalizing');
    setError(null);

    const moduleLine = currentModule ? `${selectedModuleId} (${getTitle(currentModule, lang)})` : selectedModuleId;
    const finalPrompt = `FIELD APPLICATION FINAL EVALUATION.

The learner has reported their field work for module ${moduleLine} across the conversation above. They have just tapped "Submit progress" to finalise. Evaluate the WHOLE conversation.

Respond ONLY in this JSON format, no other text:
{
  "summary": "one-line summary of what they did",
  "score": <number 1-10>,
  "feedback": "2-3 sentences of specific feedback — reference what they said and any photo content. Encouraging but honest.",
  "nextStep": "one specific actionable next step for tomorrow"
}

Score guide: 1-3 = incorrect procedure, 4-6 = correct direction but missing steps, 7-8 = good with minor gaps, 9-10 = textbook-perfect.

Write all four fields in the learner's language.`;

    // Pass the whole history as context (capped) so the LLM has the full thread.
    try {
      const { reply } = await api.ai.chat({
        message: finalPrompt,
        history: composePromptHistory().slice(-20),
        moduleId: selectedModuleId,
        lang,
      });

      let parsed: ApplyResult | null = null;
      try {
        const m = reply.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : null;
      } catch {
        parsed = null;
      }

      if (!parsed) {
        parsed = {
          summary: history.find((t) => t.role === 'user')?.content.slice(0, 80) || '(report)',
          score: 6,
          feedback: reply,
          nextStep: lang === 'bn' ? 'কাল আরেকটু বিস্তারিত বলো।' : lang === 'hi' ? 'कल और विस्तार से बताओ।' : 'Add more detail tomorrow.',
        };
      }

      setResult(parsed);
      setState('result');

      // Persist — combine all user turns into one "input" string
      const userText = history.filter((t) => t.role === 'user').map((t) => t.content).join(' | ');
      const hasAnyPhoto = history.some((t) => t.role === 'user' && !!t.photo);
      syncApplyLog(selectedModuleId, userText, parsed.score, parsed.feedback, parsed.nextStep, hasAnyPhoto);
      trackEvent('apply_submit', selectedModuleId, {
        score: parsed.score,
        turns: history.length,
        hasPhoto: hasAnyPhoto,
      });

      // Play the feedback aloud if voice is enabled
      playTakshaReply(`${parsed.summary}. ${parsed.feedback} ${parsed.nextStep}`);
    } catch (err) {
      setState('conversation');
      setError(err instanceof ApiError ? errorCopy(err, lang) : errorCopy(err, lang));
    }
  }

  // Hidden file input available in all composer/conversation states
  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  // ============= PROMPT =============
  if (state === 'prompt') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-md lg:max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {hiddenFileInput}
          <div className="text-center mb-6">
            <Tag tone="muted">{selectedModuleId} · DEBRIEF</Tag>
            <h1 className="font-serif italic text-3xl text-forest mt-3">{p.title}</h1>
            {currentModule && (
              <p className="text-xs text-muted mt-1">{getTitle(currentModule, lang)}</p>
            )}
            <p className="font-serif text-[15px] text-ink mt-4 leading-relaxed">{p.subtitle}</p>
            <p className="text-xs text-muted mt-2">{p.instruction}</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 lg:gap-3 mb-8">
            <ModeTile icon="mic" label={p.speakBtn} sub={p.speakDesc} onClick={() => enterMode('speak')} />
            <ModeTile icon="pencil" label={p.writeBtn} sub={p.writeDesc} onClick={() => enterMode('write')} />
            <ModeTile icon="cam" label={p.cameraBtn} sub={p.cameraDesc} onClick={() => enterMode('camera')} />
          </div>

          <div>
            <Tag tone="muted" className="block text-center mb-3">{p.examplesLabel}</Tag>
            <div className="space-y-2">
              {p.examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(ex); setState('composer'); }}
                  className="w-full text-left text-[12.5px] bg-cream hover:bg-sage text-ink rounded-xl px-4 py-3 transition-colors border border-line italic font-serif leading-relaxed"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= RECORDING =============
  if (state === 'recording') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-terra flex items-center justify-center mic-pulse mb-6 shadow-lg">
          <Icon name="mic" size={42} color="var(--color-cream)" strokeWidth={2} />
        </div>
        <p className="font-serif italic text-base text-ink">{p.listening}</p>
        {input && (
          <p className="font-serif italic text-sm text-muted mt-4 max-w-xs text-center leading-relaxed">
            &ldquo;{input}&rdquo;
          </p>
        )}
        <button
          onClick={() => setState(history.length > 0 ? 'conversation' : 'composer')}
          className="mt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-forest underline"
        >
          {p.stop}
        </button>
      </div>
    );
  }

  // ============= RESULT =============
  if (state === 'result' && result) {
    const scoreTone: 'forest' | 'gold' | 'terra' = result.score >= 7 ? 'forest' : result.score >= 4 ? 'gold' : 'terra';
    const scoreCardTone: 'sage' | 'cream' = result.score >= 7 ? 'sage' : 'cream';
    const firstPhoto = history.find((t) => t.role === 'user' && t.photo)?.photo;

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-md lg:max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <div className="grid lg:grid-cols-2 gap-4">
          <Card tone={scoreCardTone} padding="lg" className="text-center">
            <Tag tone="muted">{p.score}</Tag>
            <p className="font-serif italic text-7xl text-forest leading-none mt-3">
              {result.score}
              <span className="text-3xl text-muted font-mono not-italic">/10</span>
            </p>
            <p className="font-serif text-sm text-ink mt-3 leading-relaxed">{result.summary}</p>
            <Tag tone={scoreTone} filled className="mt-3">
              {result.score >= 7 ? 'STRONG' : result.score >= 4 ? 'OK' : 'NEEDS WORK'}
            </Tag>
          </Card>

          <Card tone="surface" padding="lg">
            <Tag tone="muted">{p.youReported}</Tag>
            {firstPhoto && (
              <div className="mt-2 mb-3 rounded-lg overflow-hidden border border-line">
                <Image
                  src={firstPhoto}
                  alt="Submitted"
                  width={600}
                  height={400}
                  unoptimized
                  className="w-full h-auto max-h-40 object-cover"
                />
              </div>
            )}
            <div className="space-y-1.5 mt-2">
              {history.filter((t) => t.role === 'user').map((t, i) => (
                <p key={i} className="font-serif text-[13.5px] text-ink leading-relaxed italic">
                  &ldquo;{t.content}&rdquo;
                </p>
              ))}
            </div>
          </Card>

          <Card tone="surface" padding="lg">
            <Tag tone="forest">{p.feedback}</Tag>
            <p className="font-serif text-[14.5px] text-ink mt-2 leading-[1.65]">{result.feedback}</p>
          </Card>

          <Card tone="cream" padding="lg">
            <Tag tone="forest">{p.nextStep}</Tag>
            <p className="font-serif text-[14.5px] text-ink mt-2 leading-[1.65]">{result.nextStep}</p>
          </Card>

          <div className="lg:col-span-2 mt-2">
            <Button variant="primary" fullWidth size="lg" icon="mic" onClick={resetAll}>
              {p.again}
            </Button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= COMPOSER / CONVERSATION / THINKING / FINALIZING =============
  const isBusy = state === 'thinking' || state === 'finalizing';
  const composerHidden = isBusy || speaking;
  const placeholder = history.length > 0 ? p.placeholderAdd : p.placeholder;
  const busyLabel = state === 'thinking' ? p.thinking : state === 'finalizing' ? p.finalizing : speaking ? p.speaking : '';

  const emptyHint = (() => {
    if (history.length > 0) return null;
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted">
        <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-forest mb-4">
          <Icon name="hand" size={22} />
        </div>
        <p className="font-serif italic text-[15px] text-ink max-w-xs">
          {lang === 'bn'
            ? 'তোমার আজকের কাজের কথা বলো — ছবি, ভয়েস বা টেক্সটে।'
            : lang === 'hi'
            ? 'आज के काम के बारे में बताओ — फ़ोटो, आवाज़ या टेक्स्ट में।'
            : 'Tell Taksha what you practiced today — photo, voice, or text.'}
        </p>
        <p className="text-[11px] text-muted mt-3 max-w-xs italic">
          {lang === 'bn'
            ? `উদাহরণ: "${p.examples[0]}"`
            : lang === 'hi'
            ? `उदाहरण: "${p.examples[0]}"`
            : `e.g. "${p.examples[0]}"`}
        </p>
      </div>
    );
  })();

  return (
    <div className="h-full flex flex-col max-w-md lg:max-w-3xl mx-auto w-full px-4 lg:px-6">
      {hiddenFileInput}

      {/* Header (sticky at top of flex column) */}
      <div className="shrink-0 flex items-center justify-between py-3 border-b border-line">
        <div className="min-w-0">
          <Tag tone="muted">{p.title.toUpperCase()}</Tag>
          {currentModule && (
            <p className="text-xs text-muted mt-1 truncate">{getTitle(currentModule, lang)}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={resetAll}>{p.cancel}</Button>
      </div>

      {/* Thread (scrolls) */}
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar py-3">
        {history.length === 0 ? emptyHint : (
          <div className="space-y-3">
            {history.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {turn.role === 'assistant' && (
                  <Avatar size={28} useImage className="mr-2 mt-0.5" />
                )}
                <div
                  className={`max-w-[82%] rounded-2xl text-[14px] leading-[1.55] ${
                    turn.role === 'user'
                      ? 'bg-forest text-cream rounded-br-sm'
                      : 'bg-surface text-ink border border-line rounded-bl-sm shadow-sm'
                  }`}
                >
                  {turn.photo && turn.role === 'user' && (
                    <div className="rounded-2xl rounded-br-sm overflow-hidden">
                      <Image
                        src={turn.photo}
                        alt="Attached"
                        width={600}
                        height={400}
                        unoptimized
                        className="w-full h-auto max-h-44 object-cover"
                      />
                    </div>
                  )}
                  {turn.content && turn.content !== '(photo)' && (
                    <p className="px-3.5 py-2.5 whitespace-pre-wrap">{turn.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing dots only while AI is generating (NOT while speaking back) */}
            {isBusy && (
              <div className="flex justify-start items-end">
                <Avatar size={28} useImage className="mr-2" />
                <div className="bg-surface border border-line rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-forest rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-forest rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-forest rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      {/* Pinned footer — either busy bar (thinking/speaking) OR the composer */}
      <div className="shrink-0 border-t border-line pt-3 pb-3">
        {composerHidden ? (
          // Compact status bar while Taksha is thinking/speaking. Composer hides.
          <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-full bg-cream border border-line">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-forest truncate">
                {busyLabel}
              </span>
            </div>
            {speaking && (
              <button
                type="button"
                onClick={stopAudio}
                className="shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase text-muted hover:text-ink underline"
              >
                {p.stop}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Photo preview */}
            {photo ? (
              <div className="relative rounded-xl overflow-hidden border border-line bg-ink mb-2.5">
                <Image
                  src={photo}
                  alt="Attached"
                  width={800}
                  height={600}
                  unoptimized
                  className="w-full h-auto max-h-60 object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-cream/95 text-ink text-[11px] font-semibold px-2.5 py-1 rounded-full border border-line"
                  >
                    {p.retakePhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="bg-terra/95 text-cream text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  >
                    {p.removePhoto}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Helper hint */}
            {state === 'conversation' && history.length >= 2 && (
              <p className="text-[11px] text-muted text-center mb-2 italic">{p.finishNote}</p>
            )}

            {/* Action row */}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
                aria-label={p.addPhoto}
                title={p.addPhoto}
                className="shrink-0 w-10 h-10 rounded-full bg-cream hover:bg-sage border border-line text-ink flex items-center justify-center disabled:opacity-50"
              >
                <Icon name="cam" size={18} />
              </button>
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                aria-label={p.recordVoice}
                title={p.recordVoice}
                className="shrink-0 w-10 h-10 rounded-full bg-cream hover:bg-sage border border-line text-ink flex items-center justify-center"
              >
                <Icon name="mic" size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && (input.trim() || photo)) {
                    e.preventDefault();
                    sendTurn();
                  }
                }}
                placeholder={placeholder}
                rows={1}
                className="flex-1 min-h-[44px] border border-line rounded-xl px-3 py-2.5 text-[14px] leading-snug font-serif focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest bg-surface text-ink placeholder:text-muted resize-none overflow-y-auto"
              />
              <button
                type="button"
                onClick={sendTurn}
                disabled={!input.trim() && !photo}
                aria-label={p.send}
                title={p.send}
                className="shrink-0 w-10 h-10 rounded-full bg-forest text-cream hover:bg-forest-deep flex items-center justify-center disabled:opacity-40"
              >
                <Icon name="arrowR" size={18} strokeWidth={2} />
              </button>
            </div>

            {error && (
              <p className="text-terra text-xs font-medium mt-2">{error}</p>
            )}

            {/* Submit progress — full-width, only after at least one exchange */}
            {state === 'conversation' && history.length >= 2 && (
              <div className="mt-2.5">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon="check"
                  onClick={submitProgress}
                >
                  {p.submitProgress}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <GeminiLiveOverlay
        open={voiceOpen}
        mode="apply"
        lang={lang}
        moduleId={selectedModuleId}
        title={p.title}
        subtitle={currentModule ? getTitle(currentModule, lang) : selectedModuleId}
        onClose={() => setVoiceOpen(false)}
        onTurnComplete={handleLiveTurn}
      />
    </div>
  );
}

function ModeTile({
  icon, label, sub, onClick,
}: {
  icon: 'mic' | 'pencil' | 'cam';
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-cream border-2 border-line hover:border-forest hover:bg-sage rounded-2xl py-5 px-2 text-center transition-colors active:scale-[0.98] flex flex-col items-center gap-1.5"
    >
      <div className="w-11 h-11 rounded-full bg-forest text-cream flex items-center justify-center">
        <Icon name={icon} size={22} strokeWidth={2} />
      </div>
      <span className="text-sm font-bold text-forest mt-1">{label}</span>
      <span className="text-[10px] text-muted leading-tight">{sub}</span>
    </button>
  );
}

