'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api, ApiError } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { formatIndianPhone, normalizeIndianPhone } from '@/lib/phone';
import type { Lang } from '@/lib/types';

/**
 * Two-step phone + OTP gate. Replaces the old PIN gate.
 *
 * Pilot mode: the OTP is always 123456 and is shown as a hint on the OTP
 * screen. The security gate is really the phone allow-list on the server —
 * local demo mode accepts any valid Indian mobile number.
 */

type Step = 'phone' | 'otp';

export default function PhoneGate({ children }: { children: React.ReactNode }) {
  const { learnerId, userPhone, setUser, clearUser, setLang, lang } = useStore();
  // `checking` is the initial session probe — until it resolves we render a
  // blank splash so we don't flash the login form for already-signed-in users.
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>('phone');

  const [phoneInput, setPhoneInput] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otpInputs = useRef<Array<HTMLInputElement | null>>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // On mount, re-validate the server session cookie. If the cookie is valid,
  // zustand may or may not already have the user (first page load after a
  // reload wipes the in-memory store) — hydrate it from /me if needed.
  useEffect(() => {
    let cancelled = false;
    async function probe() {
      if (learnerId && userPhone) {
        // Trust the persisted store on a warm reload. The cookie is still
        // validated on every API call, so staleness can't escalate access.
        setChecking(false);
        return;
      }
      try {
        const me = await api.phoneAuth.me();
        if (cancelled) return;
        if (me) {
          setUser({
            learnerId: me.id,
            phone: me.phone,
            name: me.name,
            role: me.role,
            isAdmin: me.isAdmin,
          });
          if (me.preferredLang && ['bn', 'hi', 'en'].includes(me.preferredLang)) {
            setLang(me.preferredLang as Lang);
          }
        } else {
          // Server says no valid session — purge any stale identity that
          // localStorage might be persisting. Prevents fire-and-forget
          // calls (events, init, sync) from being rejected 401 before the
          // user has logged in fresh.
          clearUser();
        }
      } catch {
        /* treat any error as signed-out — keep the phone form visible */
        clearUser();
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    probe();
    return () => { cancelled = true; };
    // Intentionally run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (learnerId && userPhone) return <>{children}</>;

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const normalized = normalizeIndianPhone(phoneInput);
    if (!normalized) {
      setErr('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.phoneAuth.requestOtp(normalized);
      setNormalizedPhone(normalized);
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      // Focus the first OTP box on the next tick.
      setTimeout(() => otpInputs.current[0]?.focus(), 50);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) return;
    setSubmitting(true);
    setErr('');
    try {
      const me = await api.phoneAuth.verifyOtp(normalizedPhone, otp);
      setUser({
        learnerId: me.id,
        phone: me.phone,
        name: me.name,
        role: me.role,
        isAdmin: me.isAdmin,
      });
      if (me.preferredLang && ['bn', 'hi', 'en'].includes(me.preferredLang)) {
        setLang(me.preferredLang as Lang);
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not verify. Try again.');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputs.current[0]?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  }

  function setOtpDigitAt(idx: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) otpInputs.current[idx + 1]?.focus();
    // Auto-submit when all 6 filled (trigger after React flushes state).
    if (v && idx === 5) {
      setTimeout(() => {
        const full = otpDigits.slice();
        full[idx] = v;
        if (full.every((d) => d.length === 1)) submitOtp();
      }, 0);
    }
  }

  function onOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpInputs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpInputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpInputs.current[idx + 1]?.focus();
    if (e.key === 'Enter') submitOtp();
  }

  function onOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    text.split('').forEach((c, i) => { next[i] = c; });
    setOtpDigits(next);
    otpInputs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) setTimeout(() => submitOtp(), 0);
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-forest-deep p-6">
      <div className="w-full max-w-sm bg-paper rounded-[18px] p-7 border border-line shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <Avatar size={64} useImage />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold mt-4">
            Taksha Acharya
          </p>
          <h1 className="font-serif italic text-3xl text-ink mt-1">Taksha Acharya</h1>
          <p className="text-xs text-muted mt-1">Master the craft. Build with confidence.</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={submitPhone}>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted text-center mb-3">
              Sign in with phone
            </p>

            <label className="block">
              <span className="sr-only">Mobile number</span>
              <div className="flex items-stretch bg-cream border border-line rounded-xl overflow-hidden focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20">
                <span className="px-3 flex items-center font-mono text-sm text-muted border-r border-line">
                  +91
                </span>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9 ]*"
                  maxLength={15}
                  autoFocus
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="90628 39387"
                  className="flex-1 bg-transparent px-3 py-3 font-mono text-[15px] text-ink placeholder:text-muted focus:outline-none"
                  aria-label="Mobile number"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting || !phoneInput.trim()}
              className="w-full mt-4 py-3 bg-forest text-cream font-semibold rounded-xl text-sm hover:bg-forest-deep disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending…' : 'Send OTP'}
            </button>

            {err && (
              <p className="text-terra text-xs text-center mt-3 font-medium">{err}</p>
            )}

            <p className="mt-6 text-center font-mono text-[9px] tracking-[0.22em] uppercase text-muted">
              v1 · {lang.toUpperCase()} · April 2026
            </p>
          </form>
        ) : (
          <form onSubmit={submitOtp}>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted text-center mb-1">
              Enter OTP
            </p>
            <p className="text-xs text-ink text-center mb-4">
              Sent to <span className="font-mono">{formatIndianPhone(normalizedPhone)}</span>
            </p>

            <div className="flex justify-center gap-2 mb-3">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputs.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setOtpDigitAt(i, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(i, e)}
                  onPaste={onOtpPaste}
                  aria-label={`OTP digit ${i + 1}`}
                  className="w-11 h-12 lg:w-12 lg:h-14 bg-cream border border-line rounded-xl font-mono text-2xl text-ink text-center focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
              ))}
            </div>

            <p className="text-[11px] text-muted text-center mb-4">
              For the pilot, use OTP <span className="font-mono font-semibold text-forest">123456</span>
            </p>

            <button
              type="submit"
              disabled={submitting || otpDigits.some((d) => !d)}
              className="w-full py-3 bg-forest text-cream font-semibold rounded-xl text-sm hover:bg-forest-deep disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Verifying…' : 'Verify & enter'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setErr(''); }}
              className="w-full mt-2 py-2 text-muted hover:text-ink text-xs"
            >
              ← Use a different number
            </button>

            {err && (
              <p className="text-terra text-xs text-center mt-3 font-medium">{err}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
