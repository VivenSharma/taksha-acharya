'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { Lang } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon, type IconName } from '@/components/ui/Icon';

export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang } = useStore();

  function enter(selectedLang: Lang) {
    setLang(selectedLang);
    router.push('/learn');
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top utility bar — back to Home */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 bg-cream/10 hover:bg-cream/20 text-cream border border-cream/30 backdrop-blur rounded-full px-3 py-1.5 text-[11px] font-mono tracking-[0.18em] uppercase transition-colors"
        >
          <Icon name="arrowL" size={12} />
          {lang === 'bn' ? 'হোম' : lang === 'hi' ? 'होम' : 'Home'}
        </Link>
      </div>

      {/* HERO */}
      <div className="bg-forest-deep text-cream px-6 pt-12 pb-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none">
          <div className="absolute top-6 left-10 text-6xl">🌱</div>
          <div className="absolute top-24 right-14 text-4xl">🥬</div>
          <div className="absolute bottom-10 left-20 text-5xl">🌾</div>
          <div className="absolute bottom-6 right-10 text-3xl">💧</div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <Avatar size={92} useImage />
          <h1 className="font-serif italic text-4xl lg:text-5xl mt-5 leading-tight">Taksha Acharya</h1>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold mt-3">
            Taksha Workshop · Internal · v1.1
          </p>
          <p className="text-cream/70 text-sm mt-3 max-w-md">
            Craft &amp; Service training playbook · Bengali, Hindi, English
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 lg:px-6 -mt-8 relative z-10 mx-auto w-full max-w-md lg:max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Who is Taksha */}
          <Card tone="cream" padding="lg" className="shadow-sm lg:col-span-2">
            <Tag tone="forest" filled className="mb-3">
              {lang === 'bn' ? 'অর্জুন কে' : lang === 'hi' ? 'अर्जुन कौन' : 'Who is Taksha'}
            </Tag>
            <p className="font-serif text-[15px] lg:text-[17px] leading-[1.65] text-ink">
              {lang === 'bn' ? (
                <>আমি <em>অর্জুন</em> — Taksha Workshop-র বিক্রয় ও পরিষেবা দলের জন্য তোমার প্রশিক্ষক। তুমি যদি Workshop-র সেলস বা সার্ভিস দলে যোগ দিয়েছো — অথবা OmniDEL প্ল্যাটফর্মে — এই প্লেবুক তোমার প্রথম সপ্তাহের সঙ্গী।</>
              ) : lang === 'hi' ? (
                <>मैं <em>अर्जुन</em> — Taksha Workshop की सेल्स और सर्विस टीम के लिए तुम्हारा ट्रेनर। अगर तुम Workshop की सेल्स या सर्विस टीम में जुड़े हो — या OmniDEL प्लेटफ़ॉर्म पर — यह प्लेबुक तुम्हारे पहले हफ़्ते का साथी है।</>
              ) : (
                <>I am <em>Taksha</em> — your trainer for the Taksha Workshop Craft &amp; Service team. If you have joined the Taksha Workshop Carpentry team — or the broader OmniDEL platform — this playbook is your week-one companion.</>
              )}
            </p>
          </Card>

          {/* North Star */}
          <Card tone="paper" padding="lg" className="shadow-sm">
            <div className="text-center mb-4">
              <Tag tone="gold" filled>
                {lang === 'bn' ? '৩ মাসের লক্ষ্য' : lang === 'hi' ? '३ महीने का लक्ष्य' : 'Our 3-Month Objective'}
              </Tag>
              <h2 className="font-serif italic text-2xl lg:text-3xl text-forest mt-3">
                {lang === 'bn' ? '₹১.০৮৫ কোটি' : lang === 'hi' ? '₹1.085 करोड़' : '₹1.085 Crore'}
              </h2>
              <p className="text-[11px] text-muted mt-1">
                {lang === 'bn' ? 'চারটি সংখ্যা — ঘুম থেকে উঠেও বলতে পারবে' : lang === 'hi' ? 'चार संख्या — नींद से उठकर भी बता पाओ' : 'Four numbers — recite them from sleep'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <TargetCard num="100" label="TMIL" sub={lang === 'bn' ? 'বাণিজ্যিক · ₹৩০ লাখ' : lang === 'hi' ? 'कमर्शियल · ₹30 लाख' : 'Commercial · ₹30L'} />
              <TargetCard num="100" label="Balconies" sub={lang === 'bn' ? 'আবাসিক · ₹৬ লাখ' : lang === 'hi' ? 'आवासीय · ₹6 लाख' : 'Residential · ₹6L'} />
              <TargetCard num="10" label="Projects" sub={lang === 'bn' ? 'এককালীন · ₹৫০ লাখ' : lang === 'hi' ? 'एकमुश्त · ₹50 लाख' : 'One-time · ₹50L'} />
              <TargetCard num="₹25K" label={lang === 'bn' ? 'প্রতিদিন' : lang === 'hi' ? 'रोज़' : '/day'} sub={lang === 'bn' ? 'খুচরা · ₹২২.৫ লাখ' : lang === 'hi' ? 'रिटेल · ₹22.5 लाख' : 'Retail · ₹22.5L'} />
            </div>
          </Card>

          {/* 4 tabs explained */}
          <Card tone="paper" padding="lg" className="shadow-sm">
            <div className="text-center mb-4">
              <Tag tone="forest" filled>
                {lang === 'bn' ? 'কীভাবে ব্যবহার' : lang === 'hi' ? 'कैसे इस्तेमाल' : 'How to Use This App'}
              </Tag>
              <h2 className="font-serif italic text-2xl text-forest mt-3">
                {lang === 'bn' ? '৪টি ট্যাব' : lang === 'hi' ? '4 टैब' : 'Four Tabs'}
              </h2>
            </div>
            <div className="space-y-2">
              <TabExplain icon="home"
                name={lang === 'bn' ? 'হোম (Home)' : lang === 'hi' ? 'होम (Home)' : 'Home'}
                desc={lang === 'bn' ? 'এই পাতা — ভিশন, লক্ষ্য, ৭ দিনের যাত্রা' : lang === 'hi' ? 'यह पेज — विज़न, लक्ष्य, 7 दिन की यात्रा' : 'This page — vision, targets, 7-day journey'} />
              <TabExplain icon="book"
                name={lang === 'bn' ? 'কোচ (Coach)' : lang === 'hi' ? 'कोच (Coach)' : 'Coach'}
                desc={lang === 'bn' ? '২১টি মডিউল + ৫টি অরিয়েন্টেশন ভিডিও' : lang === 'hi' ? '21 मॉड्यूल + 5 ओरिएंटेशन वीडियो' : '21 modules + 5 orientation videos'} />
              <TabExplain icon="chat"
                name={lang === 'bn' ? 'জিজ্ঞেস করো (Ask)' : lang === 'hi' ? 'पूछो (Ask)' : 'Ask'}
                desc={lang === 'bn' ? 'অর্জুনকে কথা বলো · MCQ পরীক্ষা · মাঠের প্রয়োগ' : lang === 'hi' ? 'अर्जुन से बातें · MCQ परीक्षा · मैदान अभ्यास' : 'Chat with Taksha · MCQ quiz · Field debrief'} />
              <TabExplain icon="chart"
                name={lang === 'bn' ? 'আমার (Me)' : lang === 'hi' ? 'मेरा (Me)' : 'Me'}
                desc={lang === 'bn' ? 'অগ্রগতি · ব্যাজ · সেটিংস' : lang === 'hi' ? 'प्रगति · बैज · सेटिंग्स' : 'Progress · Badges · Settings'} />
            </div>
          </Card>

          {/* 7-day journey */}
          <Card tone="paper" padding="lg" className="shadow-sm">
            <div className="text-center mb-4">
              <Tag tone="terra" filled>
                {lang === 'bn' ? 'প্রথম সপ্তাহ' : lang === 'hi' ? 'पहला हफ़्ता' : 'Your First Week'}
              </Tag>
              <h2 className="font-serif italic text-2xl text-forest mt-3">
                {lang === 'bn' ? '৭ দিনে প্রস্তুত' : lang === 'hi' ? '7 दिनों में तैयार' : 'Ready in 7 Days'}
              </h2>
            </div>
            <ol className="space-y-2.5 border-l border-line pl-4">
              <DayStep n={1} task={lang === 'bn' ? '৫টি ভিডিও দেখো · M00 Welcome + M01 North Star' : lang === 'hi' ? '5 वीडियो देखो · M00 Welcome + M01 North Star' : 'Watch all 5 videos · M00 Welcome + M01 North Star'} />
              <DayStep n={2} task={lang === 'bn' ? 'M02 আমরা কারা → M05 মূল্য নির্ধারণ' : lang === 'hi' ? 'M02 हम कौन हैं → M05 प्राइसिंग' : 'M02 Who We Are → M05 Pricing Playbook'} />
              <DayStep n={3} task={lang === 'bn' ? 'M06 Workshop.AI → M09 কেস স্টাডি' : lang === 'hi' ? 'M06 Workshop.AI → M09 केस स्टडी' : 'M06 Workshop.AI → M09 Case Studies'} />
              <DayStep n={4} task={lang === 'bn' ? 'M10 রক্ষণাবেক্ষণ → M14 আপত্তি সামলানো' : lang === 'hi' ? 'M10 रखरखाव → M14 आपत्ति सँभालना' : 'M10 Maintenance → M14 Objection Handling'} />
              <DayStep n={5} task={lang === 'bn' ? 'M15 ভিডিও → M20 প্রথম সপ্তাহের চেকলিস্ট' : lang === 'hi' ? 'M15 वीडियो → M20 पहले हफ़्ते की चेकलिस्ट' : 'M15 Video recap → M20 First-Week Checklist'} />
              <DayStep n={6} task={lang === 'bn' ? 'Ram-এর সেলস কলে উপস্থিত · একটি Workshop ভ্রমণ' : lang === 'hi' ? 'Ram की सेल्स कॉल · एक Workshop देखने जाओ' : "Sit in on a Ram craft call · Visit a live Workshop"} />
              <DayStep n={7} task={lang === 'bn' ? 'মক PET তৈরি · Ram + Reena রিভিউ' : lang === 'hi' ? 'मॉक PET · Ram + Reena के साथ review' : 'Draft a mock PET · Review with Ram + Reena'} />
            </ol>
            <p className="text-[10px] text-muted text-center mt-4">
              {lang === 'bn' ? 'আটকে গেলে, Ask-এ গিয়ে অর্জুনকে জিজ্ঞেস করো — ২৪×৭।' : lang === 'hi' ? 'कहीं अटक जाओ तो Ask में अर्जुन से पूछो — 24×7।' : "If you're stuck anywhere, go to the Ask tab and ask Taksha — 24×7."}
            </p>
          </Card>

          {/* CTA */}
          <Card tone="forest" padding="lg" className="shadow-md lg:col-span-2">
            <div className="text-center mb-4">
              <Tag tone="cream" className="text-gold-soft">
                {lang === 'bn' ? 'শুরু করতে প্রস্তুত?' : lang === 'hi' ? 'शुरू करने को तैयार?' : 'Ready to Start?'}
              </Tag>
              <h2 className="font-serif italic text-3xl mt-3">
                {lang === 'bn' ? 'তোমার ভাষা বাছো' : lang === 'hi' ? 'अपनी भाषा चुनो' : 'Choose Your Language'}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto">
              <button
                onClick={() => enter('bn')}
                className="bg-cream text-forest hover:bg-sage rounded-xl py-4 px-3 font-semibold transition-colors active:scale-[0.98]"
              >
                <span className="block text-lg">বাংলা</span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-muted block mt-0.5">Bengali</span>
              </button>
              <button
                onClick={() => enter('hi')}
                className="bg-cream/0 text-cream border border-cream/40 hover:bg-cream/10 rounded-xl py-4 px-3 font-semibold transition-colors active:scale-[0.98]"
              >
                <span className="block text-lg">हिन्दी</span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-cream/60 block mt-0.5">Hindi</span>
              </button>
              <button
                onClick={() => enter('en')}
                className="bg-cream/0 text-cream border border-cream/40 hover:bg-cream/10 rounded-xl py-4 px-3 font-semibold transition-colors active:scale-[0.98]"
              >
                <span className="block text-lg">English</span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-cream/60 block mt-0.5">English</span>
              </button>
            </div>

            {/* Privacy notice — shown before first interaction so the learner
                knows conversations are logged */}
            <div className="mt-5 max-w-2xl mx-auto flex items-start gap-2 text-cream/80 text-[11.5px] leading-snug">
              <Icon name="bell" size={14} className="mt-0.5 shrink-0 text-gold" />
              <p>
                <span className="block mb-1">
                  {lang === 'bn'
                    ? 'তোমার প্রশ্ন ও উত্তর Taksha Workshop দলের মানোন্নয়নের জন্য সংরক্ষণ করা হয়। কোনো ব্যক্তিগত তথ্য লিখো না।'
                    : lang === 'hi'
                    ? 'तुम्हारे सवाल और जवाब Taksha Workshop टीम की समीक्षा के लिए संग्रहीत होते हैं। कोई निजी जानकारी मत लिखो।'
                    : 'Your questions and answers are stored for Taksha Workshop team review. Please do not enter any personal information.'}
                </span>
              </p>
            </div>
          </Card>
        </div>

        {/* Cert footer */}
        <div className="my-8 text-center">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted">
            NatureLink Education Network · 21 modules · trilingual · internal
          </p>
          <p className="font-serif italic text-sm text-forest mt-2">
            100 TMIL · 100 Balconies · 10 Projects · ₹25K/day = ₹1.085 Cr
          </p>
        </div>
      </div>

      {/* Floating CTA on mobile only — also a button for users who don't see it via tab */}
      <div className="lg:hidden h-4" />
    </div>
  );
}

function TargetCard({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <div className="bg-cream rounded-xl p-3 border border-line text-center">
      <div className="font-serif italic text-2xl text-forest leading-none">{num}</div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-gold mt-1.5">{label}</div>
      <div className="text-[9px] text-muted mt-1 leading-tight">{sub}</div>
    </div>
  );
}

function TabExplain({ icon, name, desc }: { icon: IconName; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-cream transition-colors">
      <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
        <Icon name={icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-forest">{name}</div>
        <div className="text-[11px] text-muted leading-snug mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function DayStep({ n, task }: { n: number; task: string }) {
  return (
    <li className="relative">
      <div className="absolute -left-[22px] top-1 w-4 h-4 rounded-full bg-gold-soft border-2 border-paper flex items-center justify-center">
        <span className="font-mono text-[8px] font-bold text-forest-deep">{n}</span>
      </div>
      <div className="text-[12.5px] text-ink leading-snug">{task}</div>
    </li>
  );
}
