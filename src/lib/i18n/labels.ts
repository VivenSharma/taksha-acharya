import type { Lang } from '../types';

const labels = {
  // App name
  appName: { bn: 'অর্জুন আচার্য', hi: 'अर्जुन आचार्य', en: 'Taksha Acharya' },

  // Tab names
  learn: { bn: 'শেখো', hi: 'सीखो', en: 'Learn' },
  ask: { bn: 'জিজ্ঞেস করো', hi: 'पूछो', en: 'Ask' },
  quiz: { bn: 'পরীক্ষা', hi: 'परीक्षा', en: 'Quiz' },
  video: { bn: 'ভিডিও', hi: 'वीडियो', en: 'Video' },
  apply: { bn: 'প্রয়োগ', hi: 'अभ्यास', en: 'Apply' },
  progress: { bn: 'অগ্রগতি', hi: 'प्रगति', en: 'Progress' },

  // 7-tab navigation labels
  home: { bn: 'হোম', hi: 'होम', en: 'Home' },
  coach: { bn: 'কোচ', hi: 'कोच', en: 'Coach' },
  me: { bn: 'আমার', hi: 'मेरा', en: 'Me' },
  report: { bn: 'রিপোর্ট', hi: 'रिपोर्ट', en: 'Report' },

  // Menu / hamburger label — native words, not transliteration
  privacyNotice: {
    bn: 'তোমার প্রশ্ন ও উত্তর Taksha Workshop দলের মানোন্নয়নের জন্য সংরক্ষণ করা হয়। কোনো ব্যক্তিগত তথ্য লিখো না।',
    hi: 'तुम्हारे सवाल और जवाब Taksha Workshop टीम की समीक्षा के लिए संग्रहीत होते हैं। कोई निजी जानकारी मत लिखो।',
    en: 'Your questions and answers are stored for Taksha Workshop team review. Please do not enter any personal information.',
  },
  menu: { bn: 'বিকল্প', hi: 'विकल्प', en: 'Menu' },
  tapForMenu: {
    bn: 'এখানে চাপুন — ভাষা, পাঠ, সব বিকল্প এখানে',
    hi: 'यहाँ दबाएँ — भाषा, पाठ, सब विकल्प यहाँ',
    en: 'Tap here — language, modules, all options',
  },
  gotIt: { bn: 'বুঝেছি', hi: 'समझ गया', en: 'Got it' },

  // Tab icons
  learnIcon: { bn: '📖', hi: '📖', en: '📖' },
  askIcon: { bn: '💬', hi: '💬', en: '💬' },
  quizIcon: { bn: '📝', hi: '📝', en: '📝' },
  videoIcon: { bn: '🎬', hi: '🎬', en: '🎬' },
  applyIcon: { bn: '🌾', hi: '🌾', en: '🌾' },
  progressIcon: { bn: '📊', hi: '📊', en: '📊' },

  // Header
  selectModule: { bn: 'মডিউল নির্বাচন', hi: 'मॉड्यूल चुनें', en: 'Select Module' },
  language: { bn: 'ভাষা', hi: 'भाषा', en: 'Language' },

  // Learn tab
  sections: { bn: 'বিষয়সমূহ', hi: 'विषय', en: 'Sections' },
  theoryHours: { bn: 'তত্ত্ব', hi: 'सिद्धांत', en: 'Theory' },
  practicalHours: { bn: 'ব্যবহারিক', hi: 'प्रायोगिक', en: 'Practical' },
  hours: { bn: 'ঘণ্টা', hi: 'घंटे', en: 'hours' },
  markComplete: { bn: 'পড়া হয়ে গেছে', hi: 'पढ़ लिया', en: 'Mark Complete' },
  completed: { bn: 'সম্পন্ন', hi: 'पूर्ण', en: 'Completed' },
  outcomes: { bn: 'শিক্ষার ফলাফল', hi: 'सीखने के परिणाम', en: 'Learning Outcomes' },

  // Ask tab
  typeMessage: { bn: 'তোমার প্রশ্ন লেখো...', hi: 'अपना सवाल लिखो...', en: 'Type your question...' },
  send: { bn: 'পাঠাও', hi: 'भेजो', en: 'Send' },
  listening: { bn: 'শুনছি...', hi: 'सुन रहा हूँ...', en: 'Listening...' },
  thinking: { bn: 'ভাবছি...', hi: 'सोच रहा हूँ...', en: 'Thinking...' },
  speaking: { bn: 'বলছি...', hi: 'बोल रहा हूँ...', en: 'Speaking...' },
  voiceOn: { bn: 'কথা বলে উত্তর', hi: 'बोलकर जवाब', en: 'Voice reply' },

  // Quiz tab
  startQuiz: { bn: 'পরীক্ষা শুরু করো', hi: 'परीक्षा शुरू करो', en: 'Start Quiz' },
  question: { bn: 'প্রশ্ন', hi: 'प्रश्न', en: 'Question' },
  of: { bn: '/', hi: '/', en: 'of' },
  score: { bn: 'স্কোর', hi: 'स्कोर', en: 'Score' },
  correct: { bn: 'সঠিক!', hi: 'सही!', en: 'Correct!' },
  incorrect: { bn: 'ভুল', hi: 'गलत', en: 'Incorrect' },
  next: { bn: 'পরবর্তী', hi: 'अगला', en: 'Next' },
  retake: { bn: 'আবার দাও', hi: 'फिर से दो', en: 'Retake' },
  quizResult: { bn: 'ফলাফল', hi: 'परिणाम', en: 'Result' },

  // Video tab
  noVideos: { bn: 'এই মডিউলে কোনো ভিডিও নেই', hi: 'इस मॉड्यूल में कोई वीडियो नहीं', en: 'No videos for this module' },
  watchVideo: { bn: 'দেখো', hi: 'देखो', en: 'Watch' },

  // Progress tab
  overall: { bn: 'সামগ্রিক', hi: 'समग्र', en: 'Overall' },
  modulesCompleted: { bn: 'মডিউল সম্পন্ন', hi: 'मॉड्यूल पूरे', en: 'Modules Completed' },
  quizzesTaken: { bn: 'পরীক্ষা দেওয়া হয়েছে', hi: 'परीक्षा दी गई', en: 'Quizzes Taken' },
  badgesEarned: { bn: 'ব্যাজ অর্জিত', hi: 'बैज अर्जित', en: 'Badges Earned' },
  avgScore: { bn: 'গড় স্কোর', hi: 'औसत स्कोर', en: 'Avg Score' },

  // Apply tab
  comingSoon: { bn: 'শীঘ্রই আসছে', hi: 'जल्द आ रहा है', en: 'Coming Soon' },
  applyDesc: { bn: 'এখানে তুমি শেখা জ্ঞান মাঠে কীভাবে প্রয়োগ করছো তা রেকর্ড করবে', hi: 'यहाँ तुम सीखे गए ज्ञान को खेत में कैसे लागू कर रहे हो वो रिकॉर्ड करोगे', en: 'Record how you are applying what you learned in the field' },

  // Quick actions for Ask tab — Workshop Carpentry Skill scenarios
  quickActions: {
    bn: [
      { label: '৩ মাসের লক্ষ্য?', message: 'আমাদের ৩ মাসের চারটি লক্ষ্য কী?' },
      { label: '১০০ TMIL কী?', message: '১০০ TMIL বলতে কী বোঝায় এবং কীভাবে অর্জন করবো?' },
      { label: 'মূল্য ব্যাখ্যা', message: 'আবাসিক ক্লায়েন্টকে মডিউল মূল্য কীভাবে ব্যাখ্যা করবো?' },
      { label: 'আপত্তি সামলাও', message: '"এটি খুব ব্যয়বহুল" — এই আপত্তি কীভাবে সামলাবো?' },
      { label: 'রক্ষণাবেক্ষণ মূল্য', message: 'অফিস রক্ষণাবেক্ষণ চুক্তির জন্য কত দাম চাইবো?' },
    ],
    hi: [
      { label: '३ महीने का लक्ष्य?', message: 'हमारे ३ महीने के चार लक्ष्य क्या हैं?' },
      { label: '१०० TMIL क्या?', message: '१०० TMIL का मतलब क्या है और कैसे पाएँगे?' },
      { label: 'कीमत समझाओ', message: 'आवासीय ग्राहक को मॉड्यूल की कीमत कैसे समझाऊँ?' },
      { label: 'आपत्ति सँभालो', message: '"यह बहुत महँगा है" — इस आपत्ति को कैसे सँभालें?' },
      { label: 'रखरखाव कीमत', message: 'ऑफिस रखरखाव के लिए कितनी कीमत माँगें?' },
    ],
    en: [
      { label: '3-month target?', message: 'What are our four 3-month targets?' },
      { label: 'What is 100 TMIL?', message: 'What does "100 TMIL" mean and how do we get there?' },
      { label: 'Explain pricing', message: 'How do I explain module pricing to a residential client?' },
      { label: 'Too expensive objection', message: 'How do I handle the "it is too expensive" objection?' },
      { label: 'Maintenance pricing', message: 'How much do I quote for an office maintenance contract?' },
    ],
  },

  // Language names (for dropdown)
  langNames: { bn: 'বাংলা', hi: 'हिन्दी', en: 'English' },

  // Module groups
  compulsory: { bn: 'বাধ্যতামূলক', hi: 'अनिवार्य', en: 'Compulsory' },
  elective: { bn: 'ঐচ্ছিক', hi: 'वैकल्पिक', en: 'Elective' },
} as const;

export function t(key: keyof typeof labels, lang: Lang): string {
  const val = labels[key];
  if (typeof val === 'object' && lang in val) {
    return (val as Record<Lang, string>)[lang];
  }
  return String(val);
}

export function getQuickActions(lang: Lang) {
  return labels.quickActions[lang];
}

export default labels;
