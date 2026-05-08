"use client";

/**
 * Sequentially plays audio Blobs as they arrive. Each blob is awaited then
 * played to completion before the next one starts. You can enqueue Promise<Blob>
 * (a pending TTS fetch) — the queue awaits each promise so slow/fast chunks
 * still play strictly in the order they were enqueued.
 *
 * Call `stop()` to cancel pending chunks and halt playback (e.g. when the user
 * sends a new message while the previous reply is still speaking).
 */
export class AudioQueue {
  private queue: Array<Promise<Blob | null>> = [];
  private running = false;
  private cancelled = false;
  private currentUrl: string | null = null;
  private onStateChange?: (speaking: boolean) => void;

  constructor(
    private audio: HTMLAudioElement,
    opts?: { onStateChange?: (speaking: boolean) => void },
  ) {
    this.onStateChange = opts?.onStateChange;
  }

  enqueue(blobPromise: Promise<Blob | null>) {
    if (this.cancelled) return;
    this.queue.push(blobPromise);
    if (!this.running) this.run();
  }

  private async run() {
    this.running = true;
    this.onStateChange?.(true);
    while (this.queue.length > 0 && !this.cancelled) {
      const p = this.queue.shift()!;
      try {
        const blob = await p;
        if (!blob || this.cancelled) continue;
        await this.playBlob(blob);
      } catch {
        /* skip broken chunk, continue with next */
      }
    }
    this.running = false;
    if (!this.cancelled) this.onStateChange?.(false);
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      this.currentUrl = url;
      this.audio.src = url;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (this.currentUrl === url) this.currentUrl = null;
        this.audio.onended = null;
        this.audio.onerror = null;
        resolve();
      };
      this.audio.onended = cleanup;
      this.audio.onerror = cleanup;
      this.audio.play().catch(cleanup);
    });
  }

  /** Stop playback and drop all pending chunks. */
  stop() {
    this.cancelled = true;
    this.queue = [];
    try {
      this.audio.pause();
    } catch { /* ignore */ }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.running = false;
    this.onStateChange?.(false);
  }
}
