'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';

const PIN_KEY = 'taksha-gate-unlocked';
// PIN intentionally simple — this is internal team training, not public app.
// Server-side auth lands in v1.1 with phone-based login.
const CORRECT_PIN = '123456';

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(PIN_KEY);
      setUnlocked(v === '1');
    } catch {
      setUnlocked(false);
    }
  }, []);

  if (unlocked === null) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (unlocked) return <>{children}</>;

  function setDigitAt(idx: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const pin = digits.join('');
    if (pin.trim() === CORRECT_PIN) {
      try { sessionStorage.setItem(PIN_KEY, '1'); } catch {}
      setErr('');
      setUnlocked(true);
    } else {
      setErr('Incorrect PIN. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-forest-deep p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-paper rounded-[18px] p-7 border border-line shadow-2xl"
      >
        <div className="flex flex-col items-center mb-6">
          <Avatar size={64} useImage />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold mt-4">
            Taksha Workshop
          </p>
          <h1 className="font-serif italic text-3xl text-ink mt-1">Taksha Acharya</h1>
          <p className="text-xs text-muted mt-1">Craft &amp; Service · Internal</p>
        </div>

        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted text-center mb-3">
          Enter access PIN
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => setDigitAt(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              autoFocus={i === 0}
              aria-label={`PIN digit ${i + 1}`}
              className="w-11 h-12 lg:w-12 lg:h-14 bg-cream border border-line rounded-xl font-mono text-2xl text-ink text-center focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          ))}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-forest text-cream font-semibold rounded-xl text-sm hover:bg-forest-deep transition-colors"
        >
          Enter Playbook
        </button>

        {err && (
          <p className="text-terra text-xs text-center mt-3 font-medium">{err}</p>
        )}

        <p className="mt-6 text-center font-mono text-[9px] tracking-[0.22em] uppercase text-muted">
          v1 · April 2026
        </p>
      </form>
    </div>
  );
}
