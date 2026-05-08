import type { Lang } from "./types";

/**
 * Turn a thrown fetch error into user-friendly copy in the learner's language.
 * Distinguishes the common cases so the message actually helps — e.g. tells a
 * rate-limited user to wait instead of smashing retry and making it worse.
 */
export function errorCopy(err: unknown, lang: Lang): string {
  const status = (err as { status?: number })?.status;

  if (status === 429) {
    return lang === "bn"
      ? "একটু ধীরে — ১০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করো।"
      : lang === "hi"
      ? "ज़रा धीरे — 10 सेकंड रुककर फिर कोशिश करो।"
      : "Too many requests — wait about 10 seconds and try again.";
  }

  if (status === 504) {
    return lang === "bn"
      ? "উত্তর দিতে অনেক সময় লাগছে — ছোটো প্রশ্ন পাঠাও।"
      : lang === "hi"
      ? "जवाब देने में ज़्यादा समय लग रहा — छोटा सवाल भेजो।"
      : "Took too long — try a shorter question.";
  }

  if (status === 413) {
    return lang === "bn"
      ? "ছবি/ডেটা খুব বড়। ছোটো করে আবার পাঠাও।"
      : lang === "hi"
      ? "तस्वीर/डेटा बहुत बड़ा है। छोटा करके फिर भेजो।"
      : "Image or data too large — try a smaller one.";
  }

  if (status === 502 || status === 503) {
    return lang === "bn"
      ? "সার্ভিসে সমস্যা — কয়েক সেকেন্ড পরে আবার চেষ্টা করো।"
      : lang === "hi"
      ? "सेवा में दिक़्क़त — कुछ सेकंड बाद फिर कोशिश करो।"
      : "Service error — try again in a moment.";
  }

  if (status === 401 || status === 403) {
    return lang === "bn"
      ? "অনুমতি নেই — আবার সাইন-ইন করো।"
      : lang === "hi"
      ? "अनुमति नहीं — फिर से साइन-इन करो।"
      : "Not authorized — please sign in again.";
  }

  // Generic / offline
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return lang === "bn"
      ? "ইন্টারনেট নেই — সংযোগ চেক করো।"
      : lang === "hi"
      ? "इंटरनेट नहीं — कनेक्शन देखो।"
      : "You're offline — check your connection.";
  }

  return lang === "bn"
    ? "কোনো সমস্যা হয়েছে — আবার চেষ্টা করো।"
    : lang === "hi"
    ? "कुछ दिक़्क़त हुई — फिर कोशिश करो।"
    : "Something went wrong — please try again.";
}
