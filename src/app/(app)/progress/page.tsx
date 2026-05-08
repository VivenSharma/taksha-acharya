'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n/labels';
import { getTitle } from '@/lib/types';
import type { Lang } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ModuleSelector } from '@/components/shell/Selectors';

export default function ProgressPage() {
  const {
    lang, setLang, modules, progress, quizAttempts, earnedBadges,
    selectedModuleId, voiceEnabled, toggleVoice,
  } = useStore();
  const [view, setView] = useState<'overall' | 'module'>('overall');

  const completedModules = Object.values(progress).filter((p) => p.completed).length;
  const totalModules = modules.length || 38;
  const totalQuizzes = quizAttempts.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(quizAttempts.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / totalQuizzes)
    : 0;

  const moduleProgress = progress[selectedModuleId];
  const moduleQuizzes = quizAttempts.filter((q) => q.module_id === selectedModuleId);
  const currentModule = modules.find((m) => m.id === selectedModuleId);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-5">
      {/* Header */}
      <div className="mb-5">
        <Tag tone="muted">
          {lang === 'bn' ? 'তোমার প্রোফাইল' : lang === 'hi' ? 'तुम्हारा प्रोफ़ाइल' : 'Your profile'}
        </Tag>
        <h1 className="font-serif italic text-3xl text-forest mt-2">
          {lang === 'bn' ? 'আমার অগ্রগতি' : lang === 'hi' ? 'मेरी प्रगति' : 'My progress'}
        </h1>
      </div>

      {/* View toggle */}
      <div className="mb-5">
        <SegmentedControl
          activeKey={view}
          onChange={(k) => setView(k as 'overall' | 'module')}
          items={[
            { key: 'overall', label: t('overall', lang) },
            { key: 'module', label: lang === 'bn' ? 'এই মডিউল' : lang === 'hi' ? 'यह मॉड्यूल' : 'This module' },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {view === 'overall' ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  icon="book"
                  label={t('modulesCompleted', lang)}
                  value={`${completedModules}`}
                  sub={`/ ${totalModules}`}
                  pct={Math.round((completedModules / totalModules) * 100)}
                />
                <StatCard
                  icon="quiz"
                  label={t('quizzesTaken', lang)}
                  value={String(totalQuizzes)}
                />
                <StatCard
                  icon="target"
                  label={t('avgScore', lang)}
                  value={totalQuizzes > 0 ? `${avgScore}%` : '—'}
                />
                <StatCard
                  icon="sparkle"
                  label={t('badgesEarned', lang)}
                  value={String(earnedBadges.length)}
                />
              </div>

              {/* Module list */}
              <section>
                <Tag tone="muted" className="mb-3 block">{t('modulesCompleted', lang)}</Tag>
                <div className="grid sm:grid-cols-2 gap-2">
                  {modules.map((mod) => {
                    const p = progress[mod.id];
                    const done = p?.completed ?? false;
                    return (
                      <div
                        key={mod.id}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[12.5px] transition-colors ${
                          done
                            ? 'bg-sage border-sage-deep text-forest'
                            : 'bg-surface border-line text-ink hover:bg-cream'
                        }`}
                      >
                        <Icon name="book" size={14} className={`shrink-0 ${done ? 'text-forest' : 'text-muted'}`} />
                        <span className="flex-1 truncate">{getTitle(mod, lang)}</span>
                        {done && <Icon name="check" size={14} strokeWidth={2.5} className="text-forest shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Badges */}
              {earnedBadges.length > 0 && (
                <section>
                  <Tag tone="muted" className="mb-3 block">{t('badgesEarned', lang)}</Tag>
                  <div className="flex flex-wrap gap-3">
                    {earnedBadges.map((b, i) => (
                      <div key={i} className="w-14 h-14 rounded-full bg-gold-soft border-2 border-gold flex items-center justify-center">
                        <Icon name="leaf" size={22} className="text-forest-deep" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {/* Module summary */}
              <Card tone="cream" padding="lg">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
                    <Icon name="book" size={20} />
                  </div>
                  <div className="flex-1">
                    <Tag tone="forest" className="mb-1">{selectedModuleId}</Tag>
                    <h3 className="font-serif italic text-xl text-ink leading-tight">
                      {currentModule ? getTitle(currentModule, lang) : ''}
                    </h3>
                    <p className="text-xs text-muted mt-2">
                      {moduleProgress?.sections_completed?.length || 0} {t('sections', lang).toLowerCase()} {t('completed', lang).toLowerCase()}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Quiz history */}
              {moduleQuizzes.length > 0 ? (
                <section>
                  <Tag tone="muted" className="mb-3 block">{t('quizzesTaken', lang)}</Tag>
                  <div className="space-y-2">
                    {moduleQuizzes.map((q, i) => {
                      const passed = q.score / q.total >= 0.7;
                      return (
                        <Card key={q.id || i} tone="surface" padding="sm" className="flex items-center gap-3">
                          <Icon name="quiz" size={18} className="text-muted" />
                          <span className="flex-1 text-xs text-muted">
                            {new Date(q.created_at).toLocaleDateString()}
                          </span>
                          <span className={`font-mono font-bold text-sm ${passed ? 'text-forest' : 'text-terra'}`}>
                            {q.score}/{q.total}
                          </span>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <Card tone="surface" padding="md">
                  <p className="text-xs text-muted italic font-serif">
                    {lang === 'bn' ? 'এখনও কোনো পরীক্ষা দেওয়া হয়নি।' : lang === 'hi' ? 'अभी कोई परीक्षा नहीं दी।' : 'No quizzes taken yet.'}
                  </p>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Settings rail */}
        <aside className="lg:col-span-1">
          <Card tone="cream" padding="lg">
            <Tag tone="muted" className="mb-4 block">
              {lang === 'bn' ? 'সেটিংস' : lang === 'hi' ? 'सेटिंग्स' : 'Settings'}
            </Tag>

            {/* Language */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-ink-soft block mb-2">
                {t('language', lang)}
              </label>
              <SegmentedControl
                activeKey={lang}
                onChange={(k) => setLang(k as Lang)}
                items={[
                  { key: 'bn', label: 'বাংলা' },
                  { key: 'hi', label: 'हिन्दी' },
                  { key: 'en', label: 'EN' },
                ]}
                size="sm"
              />
            </div>

            {/* Default module */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-ink-soft block mb-2">
                {t('selectModule', lang)}
              </label>
              <ModuleSelector variant="full" />
            </div>

            {/* Voice toggle */}
            <div>
              <label className="text-[11px] font-semibold text-ink-soft block mb-2">
                {t('voiceOn', lang)}
              </label>
              <button
                type="button"
                onClick={toggleVoice}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors ${
                  voiceEnabled
                    ? 'border-forest bg-sage text-forest'
                    : 'border-line bg-surface text-ink'
                }`}
                aria-pressed={voiceEnabled}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon name={voiceEnabled ? 'speaker' : 'speakerOff'} size={16} />
                  {voiceEnabled ? 'On' : 'Off'}
                </span>
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    voiceEnabled ? 'bg-forest' : 'bg-line'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-cream shadow transform transition-transform ${
                      voiceEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, pct,
}: { icon: IconName; label: string; value: string; sub?: string; pct?: number }) {
  return (
    <Card tone="surface" padding="md">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={16} className="text-gold" />
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">{label}</p>
      </div>
      <p className="font-serif italic text-3xl text-forest leading-none mt-2">
        {value}
        {sub && <span className="text-base text-muted not-italic font-mono ml-0.5">{sub}</span>}
      </p>
      {pct !== undefined && (
        <div className="mt-3 h-1 bg-sage rounded-full overflow-hidden">
          <div className="h-full bg-forest rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </Card>
  );
}
