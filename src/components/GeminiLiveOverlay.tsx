"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { api, ApiError } from "@/lib/api-client";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

type LiveState = "connecting" | "idle" | "recording" | "speaking" | "error";

interface Props {
  open: boolean;
  mode: "ask" | "apply";
  lang: Lang;
  moduleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onTurnComplete?: (turn: { userText: string; modelText: string }) => void;
}

const copy = {
  bn: { hold: "ধরে বলো", listen: "শুনছি...", speak: "অর্জুন বলছে...", connect: "জোড়া লাগছে...", close: "বন্ধ" },
  hi: { hold: "दबाकर बोलो", listen: "सुन रहा हूँ...", speak: "अर्जुन बोल रहा है...", connect: "जुड़ रहा है...", close: "बंद" },
  en: { hold: "Hold to talk", listen: "Listening...", speak: "Taksha is speaking...", connect: "Connecting...", close: "Close" },
} as const;

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function downsampleToPcm16(input: Float32Array, inputRate: number, outputRate = 16000) {
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const out = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] || 0));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

function pcm24kToAudioBuffer(ctx: AudioContext, b64: string) {
  const bytes = base64ToBytes(b64);
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const buffer = ctx.createBuffer(1, pcm.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;
  return buffer;
}

export default function GeminiLiveOverlay({
  open,
  mode,
  lang,
  moduleId,
  title,
  subtitle,
  onClose,
  onTurnComplete,
}: Props) {
  const c = copy[lang];
  const [state, setState] = useState<LiveState>("connecting");
  const [error, setError] = useState("");
  const [statusDetail, setStatusDetail] = useState("");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const inputTextRef = useRef("");
  const outputTextRef = useRef("");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playingRef = useRef<Promise<void>>(Promise.resolve());
  const audioQueueLen = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const recordingRef = useRef(false);
  const setupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void connect(cancelled);
    return () => {
      cancelled = true;
      stopRecording();
      closeSocket();
      clearSetupTimer();
      void audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, lang, moduleId]);

  async function connect(cancelled: boolean) {
    setState("connecting");
    setError("");
    setStatusDetail("Minting live token");
    try {
      const token = await api.ai.geminiLiveToken({ mode, moduleId, lang });
      if (cancelled) return;
      setStatusDetail("Opening live socket");
      const ws = new WebSocket(token.websocketUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatusDetail("Live socket open, waiting for setup");
        console.info("[GeminiLive] socket open", { model: token.model });
        ws.send(JSON.stringify({ setup: token.setup }));
        clearSetupTimer();
        setupTimerRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN && state === "connecting") {
            console.warn("[GeminiLive] setupComplete timeout; allowing mic because socket is open");
            setStatusDetail("Socket is open");
            setState("idle");
          }
        }, 8000);
      };
      ws.onmessage = (event) => {
        void handleMessage(event.data).catch((err) => {
          console.warn("[GeminiLive] message handling failed", err);
        });
      };
      ws.onerror = (event) => {
        console.error("[GeminiLive] socket error", event);
        setError("Gemini Live connection failed");
        setState("error");
      };
      ws.onclose = (event) => {
        clearSetupTimer();
        console.warn("[GeminiLive] socket closed", { code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (!cancelled && state === "connecting") {
          setError(`Gemini Live socket closed before setup (${event.code || "no code"})`);
          setState("error");
        }
      };
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not start voice session");
      setState("error");
    }
  }

  function closeSocket() {
    clearSetupTimer();
    try { wsRef.current?.close(); } catch { /* ignore */ }
    wsRef.current = null;
  }

  function clearSetupTimer() {
    if (setupTimerRef.current) clearTimeout(setupTimerRef.current);
    setupTimerRef.current = null;
  }

  async function handleMessage(data: unknown) {
    const raw =
      typeof data === "string"
        ? data
        : data instanceof Blob
          ? await data.text()
          : data instanceof ArrayBuffer
            ? new TextDecoder().decode(data)
            : "";
    if (!raw) {
      console.warn("[GeminiLive] empty message", data);
      return;
    }
    let msg: {
      setupComplete?: unknown;
      serverContent?: {
        interrupted?: boolean;
        turnComplete?: boolean;
        inputTranscription?: { text?: string };
        outputTranscription?: { text?: string };
        modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> };
      };
    };
    try { msg = JSON.parse(raw); } catch {
      console.warn("[GeminiLive] non-json message", raw.slice(0, 160));
      return;
    }
    console.info("[GeminiLive] message", msg);
    if ("setupComplete" in msg) {
      clearSetupTimer();
      setStatusDetail("");
      setState("idle");
      return;
    }
    const sc = msg.serverContent;
    if (!sc) return;
    if (sc.interrupted) {
      stopPlayback();
      setState(recordingRef.current ? "recording" : "idle");
    }
    const input = sc.inputTranscription?.text;
    if (input) {
      inputTextRef.current = (inputTextRef.current + " " + input).trim();
      setInputText(inputTextRef.current);
    }
    const output = sc.outputTranscription?.text;
    if (output) {
      outputTextRef.current = (outputTextRef.current + " " + output).trim();
      setOutputText(outputTextRef.current);
    }
    const parts = sc.modelTurn?.parts || [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (data) enqueueAudio(data);
    }
    if (sc.turnComplete) {
      const userText = inputTextRef.current.trim();
      const modelText = outputTextRef.current.trim();
      if (userText || modelText) onTurnComplete?.({ userText, modelText });
      inputTextRef.current = "";
      outputTextRef.current = "";
      setInputText("");
      setOutputText("");
      if (!recordingRef.current) setState("idle");
    }
  }

  function stopPlayback() {
    audioQueueLen.current = 0;
    playingRef.current = Promise.resolve();
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    activeSourcesRef.current.clear();
  }

  function enqueueAudio(b64: string) {
    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;
    audioQueueLen.current++;
    setState("speaking");
    playingRef.current = playingRef.current.then(() => new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      activeSourcesRef.current.add(source);
      source.buffer = pcm24kToAudioBuffer(ctx, b64);
      source.connect(ctx.destination);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        audioQueueLen.current--;
        if (audioQueueLen.current <= 0 && !recordingRef.current) setState("idle");
        resolve();
      };
      source.start();
    })).catch(() => undefined);
  }

  async function startRecording() {
    if (state === "connecting") return;
    if (recordingRef.current) return;
    stopPlayback();
    setError("");
    setInputText("");
    setOutputText("");
    inputTextRef.current = "";
    outputTextRef.current = "";
    recordingRef.current = true;
    setState("recording");
    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;
    await ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    sourceRef.current = source;
    processorRef.current = processor;
    processor.onaudioprocess = (ev) => {
      if (!recordingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
      const pcm = downsampleToPcm16(ev.inputBuffer.getChannelData(0), ctx.sampleRate);
      wsRef.current.send(JSON.stringify({
        realtimeInput: {
          audio: { data: bytesToBase64(pcm), mimeType: "audio/pcm;rate=16000" },
        },
      }));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  }

  function stopRecording() {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      }
    } catch { /* ignore */ }
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setState("idle");
  }

  if (!open) return null;
  const label =
    state === "connecting" ? c.connect :
    state === "recording" ? c.listen :
    state === "speaking" ? c.speak :
    c.hold;

  return (
    <div className="fixed inset-0 z-[10000] bg-forest-deep text-cream flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold">
            Gemini Live
          </p>
          <h2 className="font-serif italic text-xl truncate">{title}</h2>
          {subtitle ? <p className="text-xs text-cream/70 truncate">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => { stopRecording(); closeSocket(); onClose(); }}
          className="w-10 h-10 rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center"
          aria-label={c.close}
          title={c.close}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center">
        <Avatar size={72} useImage className="mb-8" />
        <button
          type="button"
          disabled={state === "connecting"}
          onPointerDown={(e) => { e.preventDefault(); void startRecording().catch((err) => { setError(String(err)); setState("error"); }); }}
          onPointerUp={(e) => { e.preventDefault(); stopRecording(); }}
          onPointerCancel={stopRecording}
          onPointerLeave={() => { if (recordingRef.current) stopRecording(); }}
          className={`w-36 h-36 rounded-full flex items-center justify-center border transition-transform active:scale-95 disabled:opacity-60 ${
            state === "recording"
              ? "bg-terra border-terra mic-pulse shadow-2xl"
              : state === "speaking"
              ? "bg-gold text-forest border-gold shadow-2xl"
              : "bg-cream text-forest border-cream shadow-2xl"
          }`}
        >
          <Icon name="mic" size={54} strokeWidth={2} />
        </button>
        <p className="font-serif italic text-2xl mt-8">{label}</p>
        {error ? <p className="mt-5 text-sm text-gold max-w-sm">{error}</p> : null}
        {statusDetail && !error ? <p className="mt-3 text-xs text-cream/50 max-w-sm">{statusDetail}</p> : null}
        {inputText ? <p className="mt-7 max-w-md text-sm text-cream/80 leading-relaxed">&ldquo;{inputText}&rdquo;</p> : null}
        {outputText ? <p className="mt-4 max-w-md text-sm text-cream/70 leading-relaxed">{outputText}</p> : null}
      </div>
    </div>
  );
}
