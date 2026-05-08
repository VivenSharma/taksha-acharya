/**
 * Streaming sentence splitter for Bangla / Hindi / English.
 *
 * Call with the running buffer of text received from the chat stream so far.
 * Returns any sentences whose combined length is >= minLen (so we don't fire a
 * TTS request for "ভাই!" on its own) plus the leftover buffer to keep
 * accumulating into.
 *
 * Terminator chars: । (danda — bn/hi), ., ?, !, and newline. A terminator only
 * counts when followed by whitespace or end-of-buffer, so decimals like "2.5"
 * don't split mid-number.
 */
export function splitIntoSpeakable(
  buffer: string,
  minLen = 20,
): { ready: string[]; leftover: string } {
  const terminators: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c !== "।" && c !== "?" && c !== "!" && c !== "." && c !== "\n") continue;
    const next = buffer[i + 1];
    if (
      next !== undefined &&
      next !== " " &&
      next !== "\n" &&
      next !== "\t" &&
      next !== "\r"
    ) continue;
    terminators.push(i);
  }

  const ready: string[] = [];
  let start = 0;
  let accumulator = "";
  let lastCut = 0;

  for (const t of terminators) {
    const chunk = buffer.slice(start, t + 1).trim();
    if (chunk) accumulator = accumulator ? accumulator + " " + chunk : chunk;
    start = t + 1;
    if (accumulator.length >= minLen) {
      ready.push(accumulator);
      accumulator = "";
      lastCut = start;
    }
  }

  return { ready, leftover: buffer.slice(lastCut) };
}
