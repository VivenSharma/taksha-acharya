// Taksha Acharya — seed generator
// Reads the canonical playbook + hand-crafted trilingual spine modules
// Emits supabase/seed-taksha-content.sql
//
// Usage: node scripts/generate-taksha-seed.js
//
// v1 approach:
//   - M00 Welcome + M01 North Star: hand-crafted trilingual (THE spine, memorise-worthy)
//   - M02-M20: English content extracted from playbook + bn/hi STUBS (flagged status: review)
//   - Ram + Reena edit bn/hi translations before v1.1 promote-to-production
//   - Script is idempotent: re-run regenerates the SQL
//
// Translation strategy (v1.1 roadmap):
//   - Add Claude Haiku batch-translate pass that reads English content, writes bn/hi
//   - Cache translations in supabase/translations/ so regens are cheap

const fs = require('fs');
const path = require('path');

// ============================================================
// HELPERS
// ============================================================
const sqlEscape = (s) => (s ?? '').toString().replace(/'/g, "''");
const q = (s) => `'${sqlEscape(s)}'`;

// ============================================================
// MODULE REGISTRY (20 modules — 2 spine + 19 playbook sections)
// ============================================================
const MODULES = [
  { id: 'M00-welcome',           icon: '🙏', group_key: 'foundation',
    title: { en: 'Welcome from Master Trainer',          bn: 'Master Trainer-র তরফে স্বাগতম',           hi: 'Master Trainer की ओर से स्वागत' },
    group_label: { en: 'Foundation', bn: 'মূল', hi: 'आधार' } },
  { id: 'M01-north-star',        icon: '⭐', group_key: 'foundation',
    title: { en: 'The 3-Month North Star',              bn: '৩ মাসের চারটি লক্ষ্য',                   hi: '3 महीने के चार लक्ष्य' } },
  { id: 'M02-who-we-are',        icon: '🏛️', group_key: 'foundation',
    title: { en: 'Who We Are',                          bn: 'আমরা কারা',                              hi: 'हम कौन हैं' } },
  { id: 'M03-what-we-sell',      icon: '📦', group_key: 'foundation',
    title: { en: 'What We Sell — 16-Module Catalogue',  bn: 'আমরা কী বিক্রি করি',                     hi: 'हम क्या बेचते हैं' } },
  { id: 'M04-club-ecosystem',    icon: '🌿', group_key: 'ecosystem',
    title: { en: 'The Club Ecosystem',                  bn: 'ক্লাব ইকোসিস্টেম',                       hi: 'क्लब इकोसिस्टम' },
    group_label: { en: 'Ecosystem', bn: 'ইকোসিস্টেম', hi: 'इकोसिस्टम' } },
  { id: 'M05-pricing-playbook',  icon: '💰', group_key: 'craft',
    title: { en: 'Pricing Playbook',                    bn: 'মূল্য নির্ধারণ প্লেবুক',                  hi: 'प्राइसिंग प्लेबुक' },
    group_label: { en: 'Craft', bn: 'বিক্রয়', hi: 'सेल्स' } },
  { id: 'M06-vatika-ai',         icon: '🤖', group_key: 'craft',
    title: { en: 'Workshop.AI',                           bn: 'Workshop.AI',                              hi: 'Workshop.AI' } },
  { id: 'M07-proposal-writing',  icon: '📝', group_key: 'craft',
    title: { en: 'Proposal Writing',                    bn: 'প্রস্তাব লেখা',                          hi: 'प्रस्ताव लिखना' } },
  { id: 'M08-craft-cycle',       icon: '🔁', group_key: 'craft',
    title: { en: 'The Craft Cycle',                     bn: 'বিক্রয় চক্র',                            hi: 'सेल्स साइकल' } },
  { id: 'M09-case-studies',      icon: '📚', group_key: 'craft',
    title: { en: 'Case Studies — 9 Exemplars',          bn: 'কেস স্টাডি — ৯টি উদাহরণ',                hi: 'केस स्टडीज़ — 9 उदाहरण' } },
  { id: 'M10-maintenance',       icon: '🔧', group_key: 'operations',
    title: { en: 'Maintenance Offering',                bn: 'রক্ষণাবেক্ষণ পরিষেবা',                   hi: 'रखरखाव ऑफरिंग' },
    group_label: { en: 'Operations', bn: 'পরিষেবা', hi: 'ऑपरेशंस' } },
  { id: 'M11-master-franchisee', icon: '🏢', group_key: 'ecosystem',
    title: { en: 'Master Franchisee Opportunity',       bn: 'মাস্টার ফ্র্যাঞ্চাইজি সুযোগ',             hi: 'मास्टर फ्रेंचाइज़ी अवसर' } },
  { id: 'M12-behtar-life-shop',  icon: '🛍️', group_key: 'ecosystem',
    title: { en: 'Behtar Life Shop Retail',             bn: 'Behtar Life Shop খুচরা',                 hi: 'Behtar Life Shop रिटेल' } },
  { id: 'M13-channel-partners',  icon: '🤝', group_key: 'ecosystem',
    title: { en: 'Channel Partners — Parichalak & Sanchalak', bn: 'চ্যানেল পার্টনার — পরিচালক ও সঞ্চালক', hi: 'चैनल पार्टनर — परिचालक और संचालक' } },
  { id: 'M14-objection-handling',icon: '🛡️', group_key: 'craft',
    title: { en: 'Objection Handling',                  bn: 'আপত্তি সামলানো',                         hi: 'आपत्ति सँभालना' } },
  { id: 'M15-video-library',     icon: '🎬', group_key: 'resources',
    title: { en: 'Video Orientation Library',           bn: 'ভিডিও লাইব্রেরি',                         hi: 'वीडियो लाइब्रेरी' },
    group_label: { en: 'Resources', bn: 'সংস্থান', hi: 'संसाधन' } },
  { id: 'M16-ops-handover',      icon: '📋', group_key: 'operations',
    title: { en: 'Operations & Handover',               bn: 'অপারেশন ও হস্তান্তর',                     hi: 'ऑपरेशंस और हैंडओवर' } },
  { id: 'M17-faq',               icon: '❓', group_key: 'resources',
    title: { en: 'FAQ',                                 bn: 'প্রশ্নোত্তর',                             hi: 'अक्सर पूछे जाने वाले सवाल' } },
  { id: 'M18-pitch-sequence',    icon: '🎯', group_key: 'craft',
    title: { en: 'The Pitch Sequence — 6 Steps',        bn: 'পিচ সিকোয়েন্স — ৬ ধাপ',                 hi: 'पिच सीक्वेंस — 6 कदम' } },
  { id: 'M19-meeting-playbook',  icon: '💼', group_key: 'craft',
    title: { en: 'Meeting Playbook — Minute-by-Minute', bn: 'মিটিং প্লেবুক — মিনিটে মিনিটে',         hi: 'मीटिंग प्लेबुक — मिनट-दर-मिनट' } },
  { id: 'M20-first-week',        icon: '✅', group_key: 'resources',
    title: { en: 'First-Week Checklist',                bn: 'প্রথম সপ্তাহের চেকলিস্ট',                hi: 'पहले हफ्ते की चेकलिस्ट' } },
];

// ============================================================
// HAND-CRAFTED TRILINGUAL CONTENT — M00 Welcome
// ============================================================
const M00_SECTIONS = [
  {
    title: { en: 'Welcome to the Workshop Family', bn: 'Workshop পরিবারে স্বাগতম', hi: 'Workshop परिवार में स्वागत' },
    content: {
      en: `Welcome to the Taksha Workshop Carpentry Skill team. You are joining a thirty-year practice — not a job, not a company, a practice. Master Trainer has recorded a short welcome for you, which will appear here soon. Until then, this trainer — Taksha — will walk you through everything you need to know to start selling Workshops and serving our clients.\n\nA Workshop is not a garden we install. It is a sanctuary the neighbourhood comes together to learn, grow, and live better. Your job is to sell that sanctuary, then serve it every month.`,
      bn: `Taksha Workshop বিক্রয় ও পরিষেবা দলে স্বাগতম। তুমি একটি চাকরি নয়, একটি কোম্পানি নয় — একটি তিন দশকের অনুশীলনে যোগ দিচ্ছো। Master Trainer তোমার জন্য একটি সংক্ষিপ্ত স্বাগত বার্তা রেকর্ড করবেন, যা শীঘ্রই এখানে দেখা যাবে। ততক্ষণ পর্যন্ত, তোমার প্রশিক্ষক অর্জুন তোমাকে Workshop বিক্রি করতে এবং আমাদের ক্লায়েন্টদের পরিষেবা দিতে যা যা জানা দরকার, সবকিছু বলবে।\n\nWorkshop আমরা যে বাগান বানাই, সেটা নয়। এটা একটি অভয়ারণ্য যেখানে প্রতিবেশীরা একসাথে শেখে, বাড়ে এবং ভালোভাবে বাঁচে। তোমার কাজ হলো সেই অভয়ারণ্য বিক্রি করা, তারপর প্রতি মাসে পরিষেবা দেওয়া।`,
      hi: `Taksha Workshop सेल्स और सर्विस टीम में स्वागत है। तुम नौकरी में नहीं, कंपनी में नहीं — तीस साल के एक अभ्यास में जुड़ रहे हो। Master Trainer जल्द ही तुम्हारे लिए एक छोटा स्वागत संदेश रिकॉर्ड करेंगे, जो यहाँ दिखेगा। तब तक अर्जुन — तुम्हारा ट्रेनर — तुम्हें Workshop बेचने और हमारे ग्राहकों की सेवा करने के लिए सब कुछ समझाएगा।\n\nWorkshop वह बाग़ नहीं जो हम लगाते हैं। यह वह पवित्र स्थान है जहाँ पड़ोसी मिलकर सीखते, बढ़ते और बेहतर जीते हैं। तुम्हारा काम है वह स्थान बेचना, फिर हर महीने उसकी सेवा करना।`,
    },
  },
  {
    title: { en: 'Video from Master Trainer (coming soon)', bn: 'Master Trainer-র ভিডিও (শীঘ্রই আসছে)', hi: 'Master Trainer का वीडियो (जल्द आएगा)' },
    content: {
      en: `Master Trainer will record a dedicated welcome video explaining our 3-month North Star, what it means to be part of Taksha, and how you should think about your role as a Carpentry Skill team member. Until it is recorded, watch the 5 Taksha Workshop orientation videos in M15 — Video Library.`,
      bn: `Master Trainer একটি বিশেষ স্বাগত ভিডিও রেকর্ড করবেন যেখানে তিনি আমাদের ৩ মাসের উত্তরলক্ষ্য, Taksha-এর অংশ হওয়া মানে কী, এবং একজন বিক্রয় ও পরিষেবা সদস্য হিসেবে তোমার ভূমিকা সম্পর্কে বলবেন। যতক্ষণ তা রেকর্ড না হয়, M15-এ ৫টি Taksha Workshop ওরিয়েন্টেশন ভিডিও দেখো।`,
      hi: `Master Trainer एक खास स्वागत वीडियो रिकॉर्ड करेंगे जिसमें वे हमारे 3-महीने के लक्ष्य, Taksha का हिस्सा होने का क्या अर्थ है, और सेल्स और सर्विस टीम के सदस्य के रूप में तुम्हारी भूमिका के बारे में बताएँगे। जब तक वह रिकॉर्ड नहीं होता, M15 वीडियो लाइब्रेरी में पाँच Taksha Workshop ओरिएंटेशन वीडियो देखो।`,
    },
  },
];

// ============================================================
// HAND-CRAFTED TRILINGUAL CONTENT — M01 North Star
// ============================================================
const M01_SECTIONS = [
  {
    title: { en: 'The Binding Objective — ₹1.085 Crore in 3 Months', bn: 'বাঁধনের লক্ষ্য — ৩ মাসে ₹১.০৮৫ কোটি', hi: 'बाँधनेवाला लक्ष्य — 3 महीनों में ₹1.085 करोड़' },
    content: {
      en: `Four phrases every member of the team must memorise. At any moment — woken from sleep, asked on a bus, quizzed by Master Trainer — you must be able to recite them. These four targets are the ONE thing that ties the whole team's work together.\n\n1. 100 TMIL — 100 commercial maintenance contracts. ₹30 lakh.\n2. 100 Balconies — 100 residential maintenance contracts. ₹6 lakh.\n3. 10 Projects — one-time project bookings. ₹50 lakh.\n4. ₹25,000/day daily practice — retail walk-ins. ₹22.5 lakh.\n\nTotal: ₹1.085 crore over three months. Every craft call, every site visit, every proposal you write must move at least one of these four numbers. If it does not, ask why you are doing it.`,
      bn: `দলের প্রত্যেক সদস্যকে মুখস্থ করতে হবে চারটি বাক্যাংশ। যে কোনো মুহূর্তে — ঘুম থেকে উঠে, বাসে কেউ জিজ্ঞেস করলে, Master Trainer পরীক্ষা করলে — তুমি বলতে পারবে। এই চারটি লক্ষ্য পুরো দলের কাজকে একসাথে বাঁধে।\n\n১. ১০০ TMIL — ১০০টি বাণিজ্যিক রক্ষণাবেক্ষণ চুক্তি। ₹৩০ লাখ।\n২. ১০০ Balconies — ১০০টি আবাসিক রক্ষণাবেক্ষণ চুক্তি। ₹৬ লাখ।\n৩. ১০ Projects — এককালীন প্রকল্প বুকিং। ₹৫০ লাখ।\n৪. দৈনিক ₹২৫,০০০ বিক্রি — খুচরা walk-in। ₹২২.৫ লাখ।\n\nমোট: ৩ মাসে ₹১.০৮৫ কোটি। তোমার প্রতিটি সেলস কল, প্রতিটি সাইট ভিজিট, প্রতিটি প্রস্তাব — এই চারটি সংখ্যার কমপক্ষে একটিকে এগিয়ে নিয়ে যেতে হবে। না হলে, কেন করছো তা নিজেকে জিজ্ঞেস করো।`,
      hi: `टीम के हर सदस्य को चार बातें याद करनी हैं। किसी भी पल — नींद से उठाकर, बस में किसी के पूछने पर, Master Trainer की परीक्षा में — तुम बता पाओ। ये चार लक्ष्य पूरी टीम के काम को एक साथ बाँधते हैं।\n\n1. 100 TMIL — 100 व्यावसायिक रखरखाव अनुबंध। ₹30 लाख।\n2. 100 Balconies — 100 आवासीय रखरखाव अनुबंध। ₹6 लाख।\n3. 10 Projects — एकमुश्त प्रोजेक्ट बुकिंग। ₹50 लाख।\n4. रोज़ ₹25,000 बिक्री — रिटेल walk-in। ₹22.5 लाख।\n\nकुल: 3 महीनों में ₹1.085 करोड़। तुम्हारी हर सेल्स कॉल, हर साइट विज़िट, हर प्रस्ताव — इन चार संख्याओं में से कम से कम एक को आगे बढ़ाना चाहिए। अगर नहीं, तो खुद से पूछो क्यों कर रहे हो।`,
    },
  },
  {
    title: { en: '1 — 100 TMIL (commercial maintenance)', bn: '১ — ১০০ TMIL (বাণিজ্যিক রক্ষণাবেক্ষণ)', hi: '1 — 100 TMIL (व्यावसायिक रखरखाव)' },
    content: {
      en: `100 commercial maintenance contracts in offices, shops, hospitals, schools — indoor, TMIL-pattern.\n\n"TMIL" here is a PATTERN NAME, not a specific client. TMIL the client (Mumbai, 120 plants for ₹12,000/month across 19+ months) is the archetype. The gardener visits on a routine — daily, thrice-weekly, whatever the scope requires. Average contract size: ₹10,000/month.\n\n100 contracts × ₹10,000/month = ₹10 lakh/month = ₹30 lakh in 3 months.`,
      bn: `অফিস, দোকান, হাসপাতাল, স্কুলে ১০০টি বাণিজ্যিক রক্ষণাবেক্ষণ চুক্তি — ভিতরে, TMIL-ধাঁচের।\n\nএখানে "TMIL" একটি প্যাটার্ন নাম, নির্দিষ্ট ক্লায়েন্ট নয়। TMIL ক্লায়েন্ট (মুম্বাই, ১২০ গাছ ১৯+ মাস ধরে ₹১২,০০০/মাসে) হলো মূল উদাহরণ। মালি একটি রুটিনে যায় — দৈনিক, সপ্তাহে তিনবার, যা স্কোপ অনুযায়ী। গড় চুক্তির আকার: ₹১০,০০০/মাস।\n\n১০০ চুক্তি × ₹১০,০০০/মাস = ₹১০ লাখ/মাস = ৩ মাসে ₹৩০ লাখ।`,
      hi: `ऑफिस, दुकान, अस्पताल, स्कूल में 100 व्यावसायिक रखरखाव अनुबंध — इनडोर, TMIL-पैटर्न।\n\nयहाँ "TMIL" एक पैटर्न नाम है, कोई विशिष्ट ग्राहक नहीं। TMIL ग्राहक (मुंबई, 120 पौधे 19+ महीनों से ₹12,000/माह) मूल उदाहरण है। माली एक नियमित रूटीन पर जाता है — रोज़, हफ्ते में तीन बार, स्कोप के अनुसार। औसत अनुबंध आकार: ₹10,000/माह।\n\n100 अनुबंध × ₹10,000/माह = ₹10 लाख/माह = 3 महीनों में ₹30 लाख।`,
    },
  },
  {
    title: { en: '2 — 100 Balconies (residential maintenance)', bn: '২ — ১০০ Balconies (আবাসিক রক্ষণাবেক্ষণ)', hi: '2 — 100 Balconies (आवासीय रखरखाव)' },
    content: {
      en: `100 residential maintenance contracts — balconies, living rooms, terraces, entrances, apartment-scale. The name is "Balconies" but it covers any residential space, not just balconies.\n\nAverage ticket: ₹2,000/month (the band is ₹1,500 floor for minimal sites like Dr Kochgaway, up to ₹26,000 ceiling for premium like Mishra Ji. Average sits at ₹2,000 across a diverse residential book).\n\n100 contracts × ₹2,000/month = ₹2 lakh/month = ₹6 lakh in 3 months.`,
      bn: `১০০টি আবাসিক রক্ষণাবেক্ষণ চুক্তি — বারান্দা, বসার ঘর, ছাদ, প্রবেশদ্বার, অ্যাপার্টমেন্ট-স্কেল। নাম "Balconies" কিন্তু যেকোনো আবাসিক স্থান অন্তর্ভুক্ত।\n\nগড় টিকিট: ₹২,০০০/মাস (ব্যান্ড ₹১,৫০০ নূন্যতম থেকে ₹২৬,০০০ প্রিমিয়াম মিশ্রা জি পর্যন্ত। গড় ₹২,০০০)।\n\n১০০ চুক্তি × ₹২,০০০/মাস = ₹২ লাখ/মাস = ৩ মাসে ₹৬ লাখ।`,
      hi: `100 आवासीय रखरखाव अनुबंध — बालकनी, बैठक, छत, प्रवेश, अपार्टमेंट-स्केल। नाम "Balconies" है पर कोई भी आवासीय जगह शामिल है।\n\nऔसत टिकट: ₹2,000/माह (बैंड ₹1,500 न्यूनतम से ₹26,000 प्रीमियम मिश्रा जी तक। औसत ₹2,000)।\n\n100 अनुबंध × ₹2,000/माह = ₹2 लाख/माह = 3 महीनों में ₹6 लाख।`,
    },
  },
  {
    title: { en: '3 — 10 Projects (one-time)', bn: '৩ — ১০ Projects (এককালীন)', hi: '3 — 10 Projects (एकमुश्त)' },
    content: {
      en: `10 one-time project bookings at Anugrahita-scale or Jhunjhunwala-scale. Could be for a commercial client adding a biophilic feature on top of maintenance, could be a residential project like a duplex install, could be a new Workshop opening.\n\nAverage ticket: ₹5 lakh. (Range ₹79K Sourabh Thakur → ₹8L Jhunjhunwala. Arc of ₹5 lakh is what we book for typical sizable residential or commercial projects.)\n\n10 projects × ₹5 lakh = ₹50 lakh in bookings over 3 months.`,
      bn: `১০টি এককালীন প্রকল্প বুকিং, অনুগৃহীতা-স্কেল বা ঝুনঝুনওয়ালা-স্কেল। বাণিজ্যিক ক্লায়েন্ট রক্ষণাবেক্ষণের উপরে বায়োফিলিক ফিচার যোগ করতে পারে, আবাসিক duplex ইনস্টল বা একটি নতুন Workshop খোলা।\n\nগড় টিকিট: ₹৫ লাখ। (পরিসীমা ₹৭৯K Sourabh Thakur → ₹৮L Jhunjhunwala। গড় আমাদের সাধারণ আবাসিক/বাণিজ্যিক প্রকল্পের জন্য ₹৫ লাখ।)\n\n১০ প্রকল্প × ₹৫ লাখ = ৩ মাসে ₹৫০ লাখ বুকিং।`,
      hi: `10 एकमुश्त प्रोजेक्ट बुकिंग, अनुगृहिता-स्केल या झुनझुनवाला-स्केल। व्यावसायिक ग्राहक रखरखाव के ऊपर बायोफिलिक फ़ीचर जोड़ सकता है, आवासीय duplex इंस्टॉल, या नई Workshop खोलना।\n\nऔसत टिकट: ₹5 लाख। (रेंज ₹79K Sourabh Thakur → ₹8L Jhunjhunwala। हमारे सामान्य आवासीय/व्यावसायिक प्रोजेक्ट के लिए औसत ₹5 लाख।)\n\n10 प्रोजेक्ट × ₹5 लाख = 3 महीनों में ₹50 लाख बुकिंग।`,
    },
  },
  {
    title: { en: '4 — ₹25,000/day daily practice (retail walk-ins from C2 + RD + DM)', bn: '৪ — দৈনিক ₹২৫,০০০ খুচরা বিক্রি (C2 + RD + DM)', hi: '4 — रोज़ ₹25,000 रिटेल बिक्री (C2 + RD + DM)' },
    content: {
      en: `Daily retail walk-in craft from our three retail Workshops. ₹25,000 per day average.\n\nC2 = Cascade 2 Uniworld Workshop.\nRD = Rosedale Workshop.\nDM = Downtown Mall Workshop (new).\nNV = Hazaratullah Nursery — backend feed only, NOT direct revenue. NV supplies plants to the three retail Workshops.\n\n₹25,000/day × 30 = ₹7.5 lakh/month = ₹22.5 lakh in 3 months.\n\nFor these to hit target, each retail Workshop needs three things — adequate inventory, trained craft staff, and the systems + collaterals to empower them.`,
      bn: `আমাদের তিনটি রিটেল Workshop-র দৈনিক খুচরা walk-in বিক্রি। গড়ে দিনে ₹২৫,০০০।\n\nC2 = Cascade 2 Uniworld Workshop।\nRD = Rosedale Workshop।\nDM = Downtown Mall Workshop (নতুন)।\nNV = Hazaratullah Nursery — শুধু ব্যাকএন্ড সরবরাহ, সরাসরি রাজস্ব নয়।\n\n₹২৫,০০০/দিন × ৩০ = ₹৭.৫ লাখ/মাস = ৩ মাসে ₹২২.৫ লাখ।\n\nলক্ষ্য পূরণের জন্য, প্রতিটি রিটেল Workshop-র তিনটি জিনিস লাগবে — পর্যাপ্ত ইনভেন্টরি, প্রশিক্ষিত সেলস স্টাফ, এবং তাদের ক্ষমতায়নের সিস্টেম + কোল্যাটেরাল।`,
      hi: `हमारी तीन रिटेल Workshop-s की रोज़ की walk-in रिटेल बिक्री। औसत ₹25,000 रोज़।\n\nC2 = Cascade 2 Uniworld Workshop।\nRD = Rosedale Workshop।\nDM = Downtown Mall Workshop (नई)।\nNV = Hazaratullah Nursery — केवल बैकएंड फ़ीड, सीधी आय नहीं।\n\n₹25,000/दिन × 30 = ₹7.5 लाख/माह = 3 महीनों में ₹22.5 लाख।\n\nलक्ष्य हिट करने के लिए, हर रिटेल Workshop को तीन चीज़ें चाहिए — पर्याप्त इन्वेंटरी, प्रशिक्षित सेल्स स्टाफ, और उन्हें सशक्त करने के सिस्टम + कोलैटरल।`,
    },
  },
];

// ============================================================
// ENGLISH CONTENT MAP for M02-M20 (condensed from playbook)
// For v1, bn + hi are STUBS with lang='en' body mirrored so app renders.
// v1.1: Claude Haiku batch translates, Reena human-edits.
// ============================================================
const EN_STUB = (text) => text;
const PLACEHOLDER = (lang, text) => ({
  en: text,
  bn: `[Bengali translation pending Ram + Reena review] ${text}`,
  hi: `[Hindi translation pending Ram + Reena review] ${text}`,
});

const M_CONTENT = {
  'M02-who-we-are': [
    { title: { en: 'Entity, team, and mission', bn: 'সত্তা, দল এবং লক্ষ্য', hi: 'कानूनी इकाई, टीम, और मिशन' },
      content: PLACEHOLDER('en', `Taksha Workshop is the biophilic design business arm of Taksha for the 21st Century (KY21C). Legal entity: NatureLink Education Network Private Limited (CIN U74999WB2011PTC167244). Website www.plantlibrary.net. Instagram @karmyogvatika.\n\nThree decades of institutional backbone in Kolkata. A growing national network of Workshops — Kolkata, Patna, Newtown, Rosedale, IIT Kharagpur, and the Million Workshops franchise expansion into West Bengal.\n\nThe business has four layers: product (modular gardens), service (installations + maintenance), network (club membership + franchise), and platform (Workshop.AI digital demand engine).`) },
    { title: { en: 'The team you hand off to', bn: 'তুমি যাদের কাছে হস্তান্তর করবে', hi: 'जिन्हें तुम हैंडओवर करोगे' },
      content: PLACEHOLDER('en', `Master Trainer (Shri Sourabh J. Sarkar) — Founder. Mention in institutional pitches for credibility.\nShrimati Reena J. Sarkar — Co-Founder & Operations, +91 98300 24611, reenajs@ky21c.org. She signs service agreements.\nShri Ram Badrinathan — Co-Founder & Product/Tech, +91 91677 19898, ram@ky21c.org. Primary craft contact on large proposals.\nShri Koushik Sarkar — Chief Business Officer, ex-CEO Saint-Gobain. Joins institutional partner calls.\nSmt. Panna Dhar — Head of Operations. Ops hand-off point.`) },
    { title: { en: 'Core values + four well-being pillars', bn: 'মূল মূল্যবোধ + চারটি স্বাস্থ্য স্তম্ভ', hi: 'मूल मूल्य + चार स्वास्थ्य स्तंभ' },
      content: PLACEHOLDER('en', `Sanskrit anchor — प्रज्ञा कौशल साधना (Wisdom Skill Practice).\nValues: Nature (Prakriti), Learning (Shiksha), Community (Samudaya), Consciousness (Chetna), Service (Seva).\nFour well-being pillars (memorise — institutional pitches): Health · Wealth · Nature · Culture.\nA Taksha Workshop is the single integrated place where urban communities access all four.`) },
  ],
  'M03-what-we-sell': [
    { title: { en: 'The 16-module pricing catalogue (canonical)', bn: '১৬-মডিউল মূল্য তালিকা', hi: '16-मॉड्यूल प्राइस कैटलॉग' },
      content: PLACEHOLDER('en', `16 proprietary SKUs. 4 tiers each: No Light · +Light · +Plants · +Plants & Light.\nSample flagships:\nVertical Z Module 12/9/6: ₹5,200 / 5,600 / 6,200 / 6,779 (18 plants)\nPine Box 6": ₹600 / 1,200 / 800 / 1,400 (3 plants)\nVertical Two Connector Z: ₹10,500 / 12,400 / 13,500 (33 plants)\nParapet 20 Bamboo (railing): ₹8,450 / 10,300 / 14,349 / 16,200 (38 plants)\nWall Vertical Pine Mat: ₹5,150 / 7,500 / 6,050 / 8,400 (9 plants)\n\nQuoting rules: for proposals above ₹50K, quote TWO tiers (Silver/Gold). Default to +Plants. Lighting is the upsell — bundle inside Comfort/Gold, never as extra.`) },
    { title: { en: '6 formats Micro → Mega', bn: '৬টি ফরম্যাট Micro → Mega', hi: '6 फ़ॉर्मेट Micro → Mega' },
      content: PLACEHOLDER('en', `Micro 100 sqft (build ₹39K, monthly revenue ₹16K)\nMini 250 sqft (₹57K, ₹28K/mo)\nSmall 600 sqft (₹97K, ₹41K/mo)\nMedium 1200 sqft (₹1.7L, ₹87K/mo)\nLarge 3000 sqft (₹3.5L, ₹1.46L/mo)\nMega 7000 sqft (₹6.4L, ₹2.5L/mo)`) },
    { title: { en: 'Plant library + Greenri + Harshdeep', bn: 'প্ল্যান্ট লাইব্রেরি + Greenri + Harshdeep', hi: 'प्लांट लाइब्रेरी + Greenri + Harshdeep' },
      content: PLACEHOLDER('en', `150+ species, Kolkata-climate-optimised. 15-day replacement guarantee + 30-day post-install care.\n\nGreenri (premium): 158 units, 45% margin. Harshdeep Hortico (ISO, 25-year Public Ltd): Aura ₹16,319–₹63,496 · Urn ₹15,045–₹37,553 · Coral ₹7,705–₹23,356.`) },
  ],
  'M04-club-ecosystem': [
    { title: { en: 'Three membership tiers', bn: 'তিনটি সদস্যপদ স্তর', hi: 'तीन सदस्यता स्तर' },
      content: PLACEHOLDER('en', `Family Membership (households) — home transformation + Academy + Plant Library + Green Gifts.\nInstitutional Membership (schools, universities, corporates, societies, hospitals) — campus Workshop + stakeholder programming + CSR reporting + exhibit pavilions.\nBusiness Membership (entrepreneurs) — Master Franchisee ₹69L + 5% royalty.`) },
    { title: { en: 'Adopt-a-Garden + GreenTelligence (Q.Rius + OmniDEL)', bn: 'Adopt-a-Garden + GreenTelligence', hi: 'Adopt-a-Garden + GreenTelligence' },
      content: PLACEHOLDER('en', `Adopt-a-Garden: Taksha identifies unused spaces (rooftops, terraces, parks), runs fully-managed kitchen gardens, members sponsor seasonally, harvest-share. Pitch this at Month 3 of maintenance contracts — adds ₹25K–₹75K/season.\n\nGreenTelligence: Q.Rius smart stickers + OmniDEL app. Point phone at planter → ML identifies plant + question + guide → fetches curated answer. Plants become digital libraries.\n\nPlant Library: retail counter inside every Workshop (plants ₹150–800, Green Gifts, reference).\nBehtar Life Academy: tech-enabled learning inside the Workshop. Funded by donations + product revenue, NOT course fees.`) },
  ],
  'M05-pricing-playbook': [
    { title: { en: 'Installation pricing bands', bn: 'ইনস্টলেশন মূল্যের ব্যান্ড', hi: 'इंस्टॉलेशन प्राइसिंग बैंड्स' },
      content: PLACEHOLDER('en', `Small residential 50-300 sqft: ₹50-300/sqft.\nMedium residential 300-1000 sqft: ₹150-600/sqft (Urvashi ₹2.61L at ₹340/sqft).\nDuplex modular 1000+ sqft: ₹100-200/sqft (Dipika Heights ₹96K-1.35L tiered).\nFlagship residential: ₹8L (Jhunjhunwala 17 zones).\nCommercial entrance: ~₹2.6L (Manish Kochar).\nBiophilic studio setup: ₹50L+ (SNU).\nRecurring studio ops: ₹24-50L/year (SNU).\nBiophilic cabin 3-tier (Walia): Economy ₹3.5L / Comfort ₹11L / Luxury ₹22L.\nFranchise venture: ₹2Cr (Sumiran).`) },
    { title: { en: 'Maintenance pricing rules (memorise)', bn: 'রক্ষণাবেক্ষণ মূল্যের নিয়ম', hi: 'रखरखाव के नियम' },
      content: PLACEHOLDER('en', `Office anchor: ₹100/plant/month (TMIL 120 plants × ₹100 = ₹12K/mo, 19+ months straight).\nHNW residential: 1.5-2× office = ₹160-200/plant/month.\nPremium ceiling: Mishra Ji ₹26,000/mo.\nInstitutional campus: ₹25,000+/mo (CII SNCEL 9 months flat).\nFloor: Dr Kochgaway ₹1,500/mo.\n\nUpsell: Month 3 quote biophilic arch (₹40-50K, CII SNCEL precedent ₹47,780). Month 6 quote landscaping (₹1.5-2L). Year 1 pitch Adopt-a-Garden.`) },
  ],
  'M06-vatika-ai': [
    { title: { en: 'Three products, one platform', bn: 'তিনটি পণ্য, একটি প্ল্যাটফর্ম', hi: 'तीन प्रोडक्ट, एक प्लेटफ़ॉर्म' },
      content: PLACEHOLDER('en', `Workshop Studio (vatika-studio.vercel.app) — full AI design platform. Upload photo → pick budget → AI render with real products → quotation → WhatsApp order.\nWorkshop Ankita (vatika-ankita.vercel.app) — client-facing visualiser for Meta ad traffic, Kolkata-first.\nWorkshop Ankit (planned) — next iteration.\n\nStack: Next.js 16 + Gemini 2.0 Flash + Replicate Flux fallback + Supabase. 61 planters (15 Taksha + 46 Ugaoo), 13 plant species, 3 budget tiers.`) },
    { title: { en: 'The delivery-timeline slider IS the business model', bn: 'Delivery-timeline slider-ই ব্যবসার মডেল', hi: 'Delivery-timeline slider ही बिज़नेस मॉडल है' },
      content: PLACEHOLDER('en', `Every day a customer waits eliminates one retail intermediary.\nT1 Express 1-2d: 0% off, platform fee 36%. Traditional retail.\nT4 Factory 30d: 30% off customer, platform fee 23%. Retailer+warehouse+distributor gone.\nT5 Manufacturer Direct 45+d: 50% off customer, fee 9.1%. All 4 intermediaries eliminated.\n\nThe math: ₹50K MRP → manufacturer traditional ₹7,500 (15%). Workshop T4 ₹35K → manufacturer ₹12,000 (34%). Manufacturer earns 60% MORE at 30% discount to customer.\n\nSeed round ₹4.5Cr at ₹22.5Cr post-money, 20% dilution. Kolkata thesis: 6.32% rental yield (highest in India), 40-60K target premium apartments.`) },
  ],
  'M07-proposal-writing': [
    { title: { en: 'Gamma + Canva workflow', bn: 'Gamma + Canva কর্মপ্রবাহ', hi: 'Gamma + Canva वर्कफ़्लो' },
      content: PLACEHOLDER('en', `1. Brief PPT — locked text + placeholder images.\n2. Upload to Gamma with master prompt → beautiful layout.\n3. Export PDF.\n4. Import to Canva.\n5. Magic Grab — swap AI art for real product images (Brand Assets/, Plants/, Modules/).\n6. Export final PDF + PPT.`) },
    { title: { en: 'PET + commercial terms (50/40/10)', bn: 'PET + বাণিজ্যিক শর্তাবলী', hi: 'PET + कमर्शियल शर्तें' },
      content: PLACEHOLDER('en', `Price Estimate Table (every proposal, every time):\n1. Scope · 2. Bill of Materials · 3. Plant Schedule · 4. Planter Schedule · 5. Installation Plan · 6. Post-Installation Support (30-day) · 7. T&C.\n\n50% advance on confirmation. 40% before dispatch. 10% on install. 30-day validity.\nICICI A/c 000605501516 · IFSC ICIC0000006.\n\nNon-standard splits observed (both approved by Ram): Dipika 60/40, Urvashi 50/25/25. Check with Ram before agreeing.`) },
  ],
  'M08-craft-cycle': [
    { title: { en: 'Three cycles by channel', bn: 'চ্যানেল অনুযায়ী তিনটি চক্র', hi: 'चैनल के अनुसार तीन साइकल' },
      content: PLACEHOLDER('en', `Residential 2-3 months: lead → 7d site visit → 14d PET → Silver/Gold tier → 50% advance → install 3-7d small / 2-3 weeks duplex → 30-day support.\n\nInstitutional 4-6 months: lead → first meeting (Master Trainer + Ram) → stakeholder mapping → concept + IIT KGP proof → 2-4 iterations → UNLOCK MOVE = visit IIT KGP Research Park → quotation.\n\nFranchise 6-12 months: entrepreneur conversation → founder's essay (Sumiran template) → mutual diligence → LLP + capital → PoC event → scaling.`) },
    { title: { en: 'The BharatBuild pattern (7 iterations)', bn: 'BharatBuild প্যাটার্ন', hi: 'BharatBuild पैटर्न' },
      content: PLACEHOLDER('en', `BharatBuild ran 7 proposal iterations over 3 months. Don't panic on revision 3, 4, 5. Iteration = buying signal. Each version: preserve what they said yes to, surgically address the objection, show revision log, hold the price floor (pull a tier, never cut a rate).`) },
  ],
  'M09-case-studies': [
    { title: { en: 'Nine exemplar deals', bn: 'নয়টি উদাহরণ চুক্তি', hi: 'नौ उदाहरण सौदे' },
      content: PLACEHOLDER('en', `1. Jhunjhunwala ₹8L won — Atmosphere Topsia duplex, 63 planters × 17 zones. Flagship residential.\n2. Urvashi Arora ₹2.61L won — Downtown 3, 768 sqft, 50/25/25 payment, 5-week close. Cleanest deal.\n3. Dipika Heights ₹96K-1.35L won — Silver/Gold tiered template.\n4. Sister Nivedita University ₹24-50L/yr pending — recurring institutional.\n5. Sumiran Foundation MP ₹2Cr pending — franchise venture, 6 formats, 300 Phase-2.\n6. IIT KGP Museum of the Future Pavilion — Sept 2025 Durga Puja pilot, 100,000+ visitors + 3M social impressions in ONE week. Oct 2025 proposal to make permanent.\n7. Walia Ergo Tower — Biophilic River (Gangotri→Ganga Sagar narrative) + Cabin 3-tier ₹3.5L-22L + Trellis ₹4.85L.\n8. Mishra Ji ₹26,000/month — premium maintenance ceiling, ongoing since Oct 2024.\n9. Army Institute of Management Newtown — football field renovation multi-phase infrastructure project. Proves we do field-scale work.`) },
  ],
  'M10-maintenance': [
    { title: { en: 'The maintenance product (4 tiers)', bn: 'রক্ষণাবেক্ষণ পণ্য (৪ স্তর)', hi: 'रखरखाव प्रोडक्ट (4 स्तर)' },
      content: PLACEHOLDER('en', `Tier 1 Small <₹5K/mo: site upkeep, minimal plants, monthly visit (Dr Kochgaway ₹1,500).\nTier 2 Office ₹5-15K/mo: 100-150 plants, rotation, monthly visit (TMIL ₹12,000 = 120 plants at ₹100/plant/mo).\nTier 3 HNW Residential ₹15-26K/mo: weekly visits, styling, replacements (Karnani ₹16K, Mishra Ji ₹26K).\nTier 4 Institutional ₹25K+/mo: multi-zone campus (CII SNCEL ₹25K flat 9 months).`) },
    { title: { en: 'Upsell playbook (every retainer is a lead)', bn: 'আপসেল প্লেবুক', hi: 'अपसेल प्लेबुक' },
      content: PLACEHOLDER('en', `Month 3: biophilic arch/feature install ₹40-50K one-time (CII SNCEL precedent ₹47,780 on top of ₹25K/mo retainer).\nMonth 6: landscaping project ₹1.5-2L (CII SNCEL 4-month project ₹1.8L, 50% advance).\nMonth 12: expand scope — add plants, zones, other buildings.\nYear 1: pitch Adopt-a-Garden as next seasonal commitment.\n\nMonthly billing, Net 15. Invoice format KYV_YYYY_SEQUENCE. 2 missed months → pause service, escalate to Panna.`) },
  ],
  'M11-master-franchisee': [
    { title: { en: '6-format unit ladder', bn: '৬-ফরম্যাট ইউনিট সিঁড়ি', hi: '6-फ़ॉर्मेट यूनिट सीढ़ी' },
      content: PLACEHOLDER('en', `Single-unit economics (from CashFlow9MthMasterFranchisee.xlsx):\nMicro 100sqft: build ₹39,164 · monthly ops ₹12,744 · monthly revenue ₹16,433 · break-even 29mo.\nMini 250sqft: ₹56,968 · ₹20,652 · ₹28,650 · 24mo.\nSmall 600sqft: ₹96,599 · ₹31,728 · ₹41,356 · 28mo.\nMedium 1,200sqft: ₹1.71L · ₹49,146 · ₹87,053 · 24mo.\nLarge 3,000sqft: ₹3.46L · ₹78,436 · ₹1.46L · 28mo.\nMega 7,000sqft: ₹6.44L · ₹1.28L · ₹2.53L · 1-2 years.`) },
    { title: { en: 'Master Franchisee economics (geography-level)', bn: 'মাস্টার ফ্র্যাঞ্চাইজি অর্থনীতি', hi: 'मास्टर फ्रेंचाइज़ी अर्थशास्त्र' },
      content: PLACEHOLDER('en', `₹69 lakh one-time upfront per geography.\n5% recurring royalty on franchisee unit craft + setup fees.\nGeography-exclusive territory rights.\n6-unit demo network cumulative ₹1.35Cr.\nY1 annual network revenue ₹1.85Cr.\n5-year network target: 268 units per geography.\n5-year MF cumulative profit ₹3.15+ Cr.\n300+ livelihoods per geography.\nAvg franchisee break-even 24-29 months.\n\nFlagship precedent: Sumiran Ecological Foundation, Barkheda MP. Reena's founder essay is the vision template.\n\nMF calls go to Ram + Master Trainer + Koushik.`) },
  ],
  'M12-behtar-life-shop': [
    { title: { en: 'Cowpathy — cow-based wellness', bn: 'Cowpathy — গো-ভিত্তিক সুস্থতা', hi: 'Cowpathy — गाय आधारित सेहत' },
      content: PLACEHOLDER('en', `Natural Ayurvedic personal care from cow-milk derivatives. Soaps (multi-variant), shampoos, face & body cosmetics, seasonal specials. Bundle ~₹3,000. Integration order ~₹9,103 baseline.`) },
    { title: { en: 'Deshaj — Bengal artisanal (22 SKUs)', bn: 'Deshaj — বাংলার হস্তশিল্প', hi: 'Deshaj — बंगाल का हस्तशिल्प' },
      content: PLACEHOLDER('en', `Honeys: Sundarban, Eucalyptus, Litchi, Mustard, Neem, Tulsi, Multi-Floral — 500g ₹419 / 250g ₹229. Ghee 350g ₹450 / 150g ₹180. Spices: Turmeric 200g ₹110 / 100g ₹45. Red Chilli 200g ₹190 / 100g ₹80. Cumin 200g ₹149. Coriander 200g ~₹140. Soaps (in production): Neem+Turmeric+Clove, Charcoal+Neem+Basil, Aloe+Moringa, Cucumber+Honey — 75g ₹130-145.`) },
    { title: { en: 'The craft move inside Behtar Life Shop', bn: 'দোকানে বিক্রয়ের কৌশল', hi: 'दुकान में सेल्स की चाल' },
      content: PLACEHOLDER('en', `Every walk-in is a multi-product conversation:\nEntry via plant or gift → upsell to module → nudge to membership → capture for Adopt-a-Garden.\nA single family visit can touch ₹500 retail + ₹25,000 module + ₹5,000 annual membership = the Workshop compounding at scale.`) },
  ],
  'M13-channel-partners': [
    { title: { en: 'Parichalak & Sanchalak', bn: 'পরিচালক ও সঞ্চালক', hi: 'परिचालक और संचालक' },
      content: PLACEHOLDER('en', `Parichalak = lead partner (owns client relationship).\nSanchalak = sub-partner feeding leads into Parichalak (shares from Parichalak's commission, negotiated privately).\n\nCompensation: ₹8-12K fixed per sale + 1-1.5% variable.\n₹1L sale → ~9% · ₹5L → ~3.4% · ₹25L → ~1.7% · ₹1Cr → ~1.5%.\nRange: 5.29-15.50%.\n\nIdeal recruits: architects, interior designers, landscape contractors, hospitality consultants, real-estate brokers, event managers.\n\nOnboarding: NDA → playbook access → first lead with Ram co-pitching → first close → commission 30d after full client payment.`) },
  ],
  'M14-objection-handling': [
    { title: { en: 'Top 8 objections + scripts', bn: 'শীর্ষ ৮টি আপত্তি', hi: 'शीर्ष 8 आपत्तियाँ' },
      content: PLACEHOLDER('en', `"Too expensive" → pull out a lower tier. "Silver gives 70% sanctuary for 55% cost." (Dipika precedent.)\n"Nursery is cheaper" → "You can. But no 15-day replacement, no 30-day support, no Harshdeep planters, no install team. We are not in the plant business. We are in the sanctuary business."\n"Show me what you've built" → match scale. Residential → Jhunjhunwala or Dipika. Institutional → IIT KGP or AIM. Franchise → Sumiran.\n"I need to think" → "Of course. PET + Silver/Gold in 10 min. Site visit next week."\n"Spouse/board needs to approve" → ask who. Offer 20-min direct call or site visit.\n"Plants will die" → "30-day support. Post that, ₹[tier from M10]. TMIL = 120 plants healthy 19 months straight."\n"Timeline too long" → "Let me overlap phases. Revised schedule tomorrow."\n"60/40 instead of 50/40/10" → "Dipika did 60/40. Let me confirm with Reena, 24 hours." NEVER on the spot.`) },
    { title: { en: 'Words that kill deals', bn: 'ডিল হারানোর শব্দ', hi: 'डील खोने वाले शब्द' },
      content: PLACEHOLDER('en', `"Budget option" → say "Silver tier".\n"Cheap" → say "entry-level".\n"Luxury" → say "bespoke".\n"Deal/discount" → say "seasonal offer".\n"We'll try" → say "we will".\n"I think so" → say "I will confirm by [date]".`) },
  ],
  'M15-video-library': [
    { title: { en: 'How to use the 5 videos', bn: '৫টি ভিডিও কীভাবে ব্যবহার করবে', hi: '5 वीडियो का उपयोग' },
      content: PLACEHOLDER('en', `Week 1 Day 1: watch all 5 in order, one sitting (~45-60 min).\nBefore your first client pitch: re-watch Videos 1 and 2.\nBefore your first site visit: re-watch Video 3 (critical segment from 5:24).\nBefore your first PET: re-watch Video 5 (critical segment from 0:28).\nVideo 1 is also embedded in M00 Welcome for first-encounter context.`) },
  ],
  'M16-ops-handover': [
    { title: { en: '8-phase install process (58-day residential)', bn: '৮-ধাপ ইনস্টল প্রক্রিয়া', hi: '8-चरण इंस्टॉल प्रक्रिया' },
      content: PLACEHOLDER('en', `Day 0 Site visit + measurement (Craft + designer).\nDay 1-14 Concept + PET (Craft + Gamma/Canva). 50% advance trigger.\nDay 14-21 Procurement (Panna + team). Greenri + Harshdeep + local orders.\nDay 21-22 Site prep.\nDay 23-28 Install (team 2-4 people). Residential 3-5d · Duplex 1 week · Institutional 2-3 weeks.\nDay 28 Handover (Craft + Panna). 40% paid, walkthrough, care manual.\nDay 29-58 30-day support. 2 visits, photo documentation.\nDay 58 Final 10% + maintenance contract pitch.`) },
    { title: { en: 'Care manual + quality commitments', bn: 'যত্ন নির্দেশিকা', hi: 'देखभाल गाइड' },
      content: PLACEHOLDER('en', `Given to every client at handover:\n- Plant schedule · watering schedule · light requirements\n- Pest/disease early signs\n- Panna's 30-day contact\n- Maintenance tier proposal\n- QR to plantlibrary.net\n\nCommitments: all plants certified nurseries · planters inspected before dispatch · trained team only · 15-day replacement guarantee · 30-day post-install care · photo documentation every time.\n\nEscalation: Field issue → Maintenance lead → Panna (48h+) → Reena (client escalating) → Ram (commercial dispute ₹1L+).`) },
  ],
  'M17-faq': [
    { title: { en: 'Q1. What does Taksha Workshop do?', bn: 'প্র১: Taksha Workshop কী করে?', hi: 'सवाल 1: Taksha Workshop क्या करती है?' },
      content: PLACEHOLDER('en', `We create biophilic living sanctuaries — modular gardens, green walls, planters, plants, complete installations — for homes, offices, institutions. We run the Workshop as a club with membership tiers, a retail counter (Behtar Life Shop), an Academy, and a smart-planter GreenTelligence layer. We also maintain installations monthly.`) },
    { title: { en: 'Q2-Q8 quick reference', bn: 'Q2-Q8 দ্রুত রেফারেন্স', hi: 'Q2-Q8 क्विक रेफ़रेंस' },
      content: PLACEHOLDER('en', `Q2 Legal entity? NatureLink Education Network Pvt Ltd, CIN U74999WB2011PTC167244, ICICI A/c 000605501516 IFSC ICIC0000006.\nQ3 Install duration? Small residential 3-5d, duplex 1-2 weeks, institutional 2-4 weeks. End-to-end 3-4 weeks from 50% advance.\nQ4 Plants die? 15-day replacement. 30-day post-install care. Then maintenance tier from M10.\nQ5 Show me examples? Institutional: visit IIT KGP Research Park + AIM football field. Residential: Atmosphere Topsia / Heights 802 / Downtown 3.\nQ6 vs nursery? Nurseries sell plants. We sell sanctuaries + ecosystems + clubs + Workshop.AI.\nQ7 Payment? 50/40/10 standard. 30-day validity. Non-standard case-by-case.\nQ8 Partner? Parichalak (5.29-15.50% commission, no upfront) or Master Franchisee (₹69L upfront + 5% royalty, whole geography).`) },
  ],
  'M18-pitch-sequence': [
    { title: { en: 'The 6 steps of any first client pitch', bn: 'প্রথম ক্লায়েন্ট পিচের ৬ ধাপ', hi: 'पहली क्लाइंट पिच के 6 कदम' },
      content: PLACEHOLDER('en', `1. Who we are — Taksha Workshop, biophilic arm of KY21C, NatureLink Education Network, 30 years of practice, 7 active Workshops.\n2. What we do for them specifically — tailor to THEIR space: duplex, office, campus. 16 SKUs, 150+ species, proprietary modules.\n3. Show a precedent — match scale. Residential → Jhunjhunwala/Dipika. Institutional → IIT KGP/AIM. Franchise → Sumiran.\n4. The numbers — quote the band, not the final price. "For your scope, ₹2-4L band. Silver + Gold in 10 days." Commit to a date.\n5. The process — 50/40/10, 30-day validity, 3-4 week install, 15-day replacement, 30-day support.\n6. Ask for the site visit — close on a CALENDAR commitment, never on the call. "Tuesday 11am, 45 minutes, no fee."`) },
  ],
  'M19-meeting-playbook': [
    { title: { en: 'Pre-call checklist + 30-minute flow', bn: 'কল-পূর্ব চেকলিস্ট', hi: 'कॉल से पहले की चेकलिस्ट' },
      content: PLACEHOLDER('en', `Pre-call: this app open. M05 Pricing + M09 Case Studies tabbed. Proposals Registry filtered to likely scope. Site photos if sent. Panna's number on standby. Ram's number on standby.\n\n0-3 min Opening: "30 min. I walk you through what we do, show precedents, answer anything. By the end we schedule a site visit."\n3-8 min Who we are.\n8-14 min What we'd do for them — tailor.\n14-20 min Show 1-2 precedents. Match scale.\n20-25 min Numbers + process.\n25-28 min Their questions — stop talking. Answer with number or fact.\n28-30 min Close on calendar. Tuesday 11am.\n\nAfter call (same day): calendar invite, playbook link if institutional/franchise, log conversation, alert Panna for site visit window.`) },
  ],
  'M20-first-week': [
    { title: { en: 'Your first 7 days at Taksha Workshop', bn: 'Taksha Workshop-র প্রথম ৭ দিন', hi: 'Taksha Workshop के पहले 7 दिन' },
      content: PLACEHOLDER('en', `☐ Read every module on this app cover to cover (3-4 hours). Bookmark M05 Pricing, M09 Case Studies, M14 Objection Handling.\n☐ Read vault pages: vatika-business-overview, vatika-product-catalog, brand-identity, proposal-standards, gamma-canva-workflow, vatika-studio, vatika-ai-investor, vatika-iitkgp-research-park.\n☐ Watch all 5 videos in M15.\n☐ Visit one live Taksha Workshop — Atmosphere Topsia, Rosedale, IIT KGP Studio, or AIM campus.\n☐ Shadow Panna on a site visit or install day.\n☐ Sit in on one Ram craft call (listen only).\n☐ Play with Workshop Ankita (vatika-ankita.vercel.app) — upload a photo, generate a render.\n☐ Draft your first PET for a mock brief. Ram reviews.\n☐ Walk the Harshdeep 2025-26 catalogue + Greenri inventory with Panna. Know the top 20 SKUs.\n☐ Memorise: banking, commercial terms, 5 brand words (sanctuary, transform, nurture, bespoke, biophilic), 4 pillars (Health/Wealth/Nature/Culture), the 4 North Star numbers.\n\nEnd-of-week-1 check-in with Ram + Reena. First 30-60-90 day goals set.`) },
  ],
};

// ============================================================
// VIDEOS — 5 Taksha Workshop explainers (all mapped to M15)
// ============================================================
const VIDEOS = [
  { youtube_id: '6s7zI_W0sko',      module_id: 'M15-video-library', start_seconds: 0,
    title: { en: 'Taksha Workshop Explainer 1', bn: 'Taksha Workshop ব্যাখ্যা ১', hi: 'Taksha Workshop परिचय 1' } },
  { youtube_id: 'VVheqkr97wI',      module_id: 'M15-video-library', start_seconds: 0,
    title: { en: 'Taksha Workshop Explainer 2', bn: 'Taksha Workshop ব্যাখ্যা ২', hi: 'Taksha Workshop परिचय 2' } },
  { youtube_id: '-NHfMxGTd1c',      module_id: 'M15-video-library', start_seconds: 324,
    title: { en: 'Taksha Workshop Explainer 3 (starts 5:24)', bn: 'Taksha Workshop ব্যাখ্যা ৩ (৫:২৪ থেকে)', hi: 'Taksha Workshop परिचय 3 (5:24 से)' } },
  { youtube_id: 'R4JtntEFOjY',      module_id: 'M15-video-library', start_seconds: 0,
    title: { en: 'Taksha Workshop Explainer 4', bn: 'Taksha Workshop ব্যাখ্যা ৪', hi: 'Taksha Workshop परिचय 4' } },
  { youtube_id: 'YfX-aeVlKLA',      module_id: 'M15-video-library', start_seconds: 28,
    title: { en: 'Taksha Workshop Explainer 5 (starts 0:28)', bn: 'Taksha Workshop ব্যাখ্যা ৫ (০:২৮ থেকে)', hi: 'Taksha Workshop परिचय 5 (0:28 से)' } },
  // Video 1 is also featured in M00 Welcome
  { youtube_id: '6s7zI_W0sko',      module_id: 'M00-welcome', start_seconds: 0,
    title: { en: 'Featured welcome video', bn: 'স্বাগত ভিডিও', hi: 'स्वागत वीडियो' } },
];

// ============================================================
// SQL EMIT
// ============================================================
function emit() {
  const lines = [];
  lines.push('-- Taksha Acharya v1 — seed content (generated)');
  lines.push('-- Regenerate: node scripts/generate-taksha-seed.js');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('-- Idempotent: wipe before seeding');
  lines.push('TRUNCATE taksha_videos, taksha_content, taksha_sections, taksha_modules CASCADE;');
  lines.push('');

  // Modules
  lines.push('-- MODULES');
  MODULES.forEach((m, i) => {
    const gl = m.group_label || { en: m.group_key, bn: m.group_key, hi: m.group_key };
    lines.push(`INSERT INTO taksha_modules (id, title_bn, title_hi, title_en, icon, sort_order, group_key, group_label_bn, group_label_hi, group_label_en) VALUES (${q(m.id)}, ${q(m.title.bn)}, ${q(m.title.hi)}, ${q(m.title.en)}, ${q(m.icon)}, ${i}, ${q(m.group_key)}, ${q(gl.bn)}, ${q(gl.hi)}, ${q(gl.en)});`);
  });
  lines.push('');

  // Build a unified list: {module_id, sections: [{title, content: {en,bn,hi}}]}
  const byModule = {};
  byModule['M00-welcome']     = M00_SECTIONS;
  byModule['M01-north-star']  = M01_SECTIONS;
  Object.entries(M_CONTENT).forEach(([mid, secs]) => { byModule[mid] = secs; });

  // Fill missing modules with a short placeholder so every module renders something
  MODULES.forEach(m => {
    if (!byModule[m.id]) {
      byModule[m.id] = [{
        title: { en: 'Content coming soon', bn: 'শীঘ্রই আসছে', hi: 'जल्द आ रहा है' },
        content: PLACEHOLDER('en', `Content for this module is being drafted. Check back shortly, or ask Taksha directly on the Ask tab.`),
      }];
    }
  });

  // Sections
  lines.push('-- SECTIONS + CONTENT');
  lines.push('DO $$');
  lines.push('DECLARE sec_id UUID;');
  lines.push('BEGIN');
  MODULES.forEach(m => {
    const secs = byModule[m.id];
    secs.forEach((s, si) => {
      lines.push(`  INSERT INTO taksha_sections (module_id, title_bn, title_hi, title_en, sort_order) VALUES (${q(m.id)}, ${q(s.title.bn)}, ${q(s.title.hi)}, ${q(s.title.en)}, ${si}) RETURNING id INTO sec_id;`);
      // content per lang
      ['bn','hi','en'].forEach(lang => {
        const body = s.content[lang] ?? '';
        const status = (lang === 'en') ? 'published' : (body.startsWith('[') ? 'review' : 'published');
        lines.push(`  INSERT INTO taksha_content (section_id, lang, body, status) VALUES (sec_id, ${q(lang)}, ${q(body)}, ${q(status)});`);
      });
    });
  });
  lines.push('END $$;');
  lines.push('');

  // Videos
  lines.push('-- VIDEOS');
  VIDEOS.forEach((v, i) => {
    lines.push(`INSERT INTO taksha_videos (youtube_id, module_id, title_bn, title_hi, title_en, start_seconds, sort_order) VALUES (${q(v.youtube_id)}, ${q(v.module_id)}, ${q(v.title.bn)}, ${q(v.title.hi)}, ${q(v.title.en)}, ${v.start_seconds}, ${i});`);
  });
  lines.push('');

  lines.push('-- Done.');
  return lines.join('\n');
}

// ============================================================
// RUN
// ============================================================
const outPath = path.join(__dirname, '..', 'supabase', 'seed-taksha-content.sql');
fs.writeFileSync(outPath, emit());
console.log(`Wrote ${outPath}`);
console.log(`Modules: ${MODULES.length}`);
let sectionCount = 0;
let contentCount = 0;
MODULES.forEach(m => {
  const secs = (m.id === 'M00-welcome') ? M00_SECTIONS : (m.id === 'M01-north-star') ? M01_SECTIONS : (M_CONTENT[m.id] || [{}]);
  sectionCount += secs.length;
  contentCount += secs.length * 3;
});
console.log(`Sections: ${sectionCount}`);
console.log(`Content rows (bn/hi/en): ${contentCount}`);
console.log(`Videos: ${VIDEOS.length}`);
