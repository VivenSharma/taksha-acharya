"use client";
// Wrapper around the browser Web Speech API (SpeechRecognition).
// TAP-TO-RECORD model: start → "listening..." → stop → final text appears.
// No live streaming. Auto-restarts on pause so it keeps listening until
// the user explicitly presses Stop.

import { useCallback, useRef, useState } from "react";

interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SREvent extends Event {
  results: ArrayLike<SRResult>;
  resultIndex: number;
}

interface SRErrorEvent extends Event {
  error: string;
}

interface SRInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SREvent) => void) | null;
  onerror: ((ev: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type Lang = "bn" | "hi" | "en";

const LANG_TO_SR: Record<Lang, string> = {
  bn: "bn-IN",
  hi: "hi-IN",
  en: "en-IN",
};

function getSRConstructor(): (new () => SRInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => SRInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SRInstance }).webkitSpeechRecognition ||
    null
  );
}

export function useVoiceRecognition(lang: Lang = "bn") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  const collectedRef = useRef("");
  // This flag tracks whether the USER pressed stop.
  // If false, onend was triggered by a speech pause → auto-restart.
  const userStoppedRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;

  const supported = typeof window !== "undefined" ? !!getSRConstructor() : null;

  const startRecognition = useCallback(() => {
    const Ctor = getSRConstructor();
    if (!Ctor) return;

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = LANG_TO_SR[langRef.current] || "bn-IN";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          collectedRef.current += r[0].transcript + " ";
        }
      }
    };

    rec.onerror = (ev) => {
      // "no-speech" and "aborted" are normal — browser timed out or we stopped it
      if (ev.error === "no-speech" || ev.error === "aborted") {
        // If user hasn't pressed stop, restart
        if (!userStoppedRef.current) {
          try { rec.start(); } catch { /* ignore */ }
        }
        return;
      }
      setError(ev.error || "recognition error");
      setListening(false);
    };

    rec.onend = () => {
      if (userStoppedRef.current) {
        // User pressed stop — deliver the final text
        const final = collectedRef.current.trim();
        if (final) setTranscript(final);
        setListening(false);
      } else {
        // Browser auto-stopped (pause in speech) — restart immediately
        try {
          rec.start();
        } catch {
          // Can't restart — deliver what we have
          const final = collectedRef.current.trim();
          if (final) setTranscript(final);
          setListening(false);
        }
      }
    };

    try {
      rec.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "start failed");
    }
  }, []);

  const start = useCallback(() => {
    userStoppedRef.current = false;
    collectedRef.current = "";
    setTranscript("");
    setError(null);
    setListening(true);
    startRecognition();
  }, [startRecognition]);

  const stop = useCallback(() => {
    // Mark that the user explicitly stopped
    userStoppedRef.current = true;
    try {
      recRef.current?.stop();
    } catch {}
    // onend will fire → sees userStoppedRef = true → delivers text + sets listening = false
  }, []);

  const reset = useCallback(() => {
    userStoppedRef.current = true;
    try {
      recRef.current?.abort();
    } catch {}
    collectedRef.current = "";
    setTranscript("");
    setError(null);
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset, setTranscript };
}
