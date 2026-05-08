'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { t } from '@/lib/i18n/labels';
import { getTitle } from '@/lib/types';
import { syncProgress, trackEvent } from '@/lib/learner-sync';
import type { Section, Content } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModuleSelector } from '@/components/shell/Selectors';

export default function LearnPage() {
  const router = useRouter();
  const { selectedModuleId, lang, modules, progress, updateProgress, setModule } = useStore();
  const [sections, setSections] = useState<(Section & { content?: Content | null })[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentModule = modules.find((m) => m.id === selectedModuleId);
  const moduleProgress = progress[selectedModuleId];

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      setLoading(true);
      try {
        const secs = await api.content.sections(selectedModuleId, lang);
        if (!cancelled) setSections(secs);
      } catch (err) {
        console.error('Failed to load sections:', err);
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (selectedModuleId) loadSections();
    return () => { cancelled = true; };
  }, [selectedModuleId, lang]);

  const isSectionComplete = (sectionId: string) =>
    moduleProgress?.sections_completed?.includes(sectionId) ?? false;

  const toggleSectionComplete = (sectionId: string) => {
    const current = moduleProgress?.sections_completed || [];
    const updated = current.includes(sectionId)
      ? current.filter((id: string) => id !== sectionId)
      : [...current, sectionId];

    const isComplete = sections.length > 0 && updated.length === sections.length;
    updateProgress(selectedModuleId, {
      sections_completed: updated,
      completed: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    });

    syncProgress(selectedModuleId, updated, isComplete);
    trackEvent('section_complete', selectedModuleId, { sectionId, total: sections.length, done: updated.length });
  };

  // Empty state — show an inline module picker front-and-centre so mobile
  // users don't have to open the hamburger drawer just to pick one.
  if (!currentModule) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-forest mb-4">
          <Icon name="book" size={24} />
        </div>
        <h2 className="font-serif italic text-2xl text-ink leading-tight">
          {lang === 'bn'
            ? 'প্রথমে একটি মডিউল বাছো'
            : lang === 'hi'
            ? 'पहले एक मॉड्यूल चुनो'
            : 'Pick a module to begin'}
        </h2>
        <p className="text-sm text-muted mt-2 mb-6">
          {lang === 'bn'
            ? 'নিচের তালিকা থেকে শুরু করতে একটি মডিউল নির্বাচন করো।'
            : lang === 'hi'
            ? 'नीचे की सूची से शुरू करने के लिए एक मॉड्यूल चुनो।'
            : 'Choose any module from the list below to get started.'}
        </p>
        <div className="w-full">
          <ModuleSelector variant="full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-5">
      {/* Mobile-only inline module switcher so phones don't need the drawer */}
      <div className="lg:hidden mb-3 flex items-center gap-2">
        <Tag tone="muted" className="shrink-0">
          {t('selectModule', lang)}
        </Tag>
        <div className="flex-1 min-w-0">
          <ModuleSelector variant="full" />
        </div>
      </div>

      {/* Module header */}
      <Card tone="cream" padding="lg" className="mb-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
            <Icon name="book" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <Tag tone="forest" className="mb-2">{selectedModuleId}</Tag>
            <h1 className="font-serif italic text-2xl lg:text-3xl text-ink leading-tight">
              {getTitle(currentModule, lang)}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Tag tone="muted">
                {currentModule.theory_hours}h {t('theoryHours', lang)}
              </Tag>
              <Tag tone="muted">
                {currentModule.practical_hours}h {t('practicalHours', lang)}
              </Tag>
              {moduleProgress?.completed && (
                <Tag tone="forest" filled>
                  ✓ {t('completed', lang)}
                </Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Sections */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sections.length > 0 ? (
        (() => {
          const allSectionsComplete = sections.every((s) => isSectionComplete(s.id));
          const orderedModules = [...modules].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          );
          const currentIdx = orderedModules.findIndex((m) => m.id === selectedModuleId);
          const nextModule = currentIdx >= 0 ? orderedModules[currentIdx + 1] : undefined;

          function goToNextModule() {
            if (!nextModule) return;
            setModule(nextModule.id);
            trackEvent('module_next', nextModule.id, { from: selectedModuleId });
            // stay on /learn with the new module loaded
            setExpandedSection(null);
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }

          function goToQuiz() {
            trackEvent('quiz_from_learn', selectedModuleId);
            router.push('/quiz');
          }

          return (
            <>
        <div>
          <Tag tone="muted" className="px-1 mb-3 block">{t('sections', lang)}</Tag>
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const complete = isSectionComplete(section.id);
              const expanded = expandedSection === section.id;
              return (
                <Card key={section.id} tone="surface" padding="none" className="overflow-hidden">
                  <button
                    onClick={() => {
                      const opening = !expanded;
                      setExpandedSection(opening ? section.id : null);
                      if (opening) trackEvent('section_expand', selectedModuleId, { sectionId: section.id });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-cream transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                      complete ? 'bg-forest text-cream' : 'bg-sage text-forest'
                    }`}>
                      {complete ? <Icon name="check" size={14} strokeWidth={2.5} /> : idx + 1}
                    </span>
                    <span className="flex-1 text-[13.5px] font-medium text-ink">
                      {getTitle(section, lang)}
                    </span>
                    {section.estimated_hours ? (
                      <Tag tone="muted">{section.estimated_hours}h</Tag>
                    ) : null}
                    <Icon
                      name="chevD"
                      size={16}
                      className={`text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-line">
                      {section.content?.body ? (
                        <div className="font-serif text-[15px] leading-[1.7] text-ink mt-4 whitespace-pre-line">
                          {section.content.body}
                        </div>
                      ) : (
                        <p className="font-serif italic text-sm text-muted mt-4">
                          {lang === 'bn' ? 'বিষয়বস্তু শীঘ্রই আসছে...' : lang === 'hi' ? 'विषय जल्द आ रहा है...' : 'Content coming soon...'}
                        </p>
                      )}
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant={complete ? 'secondary' : 'primary'}
                          icon={complete ? 'check' : undefined}
                          onClick={() => toggleSectionComplete(section.id)}
                        >
                          {complete ? t('completed', lang) : t('markComplete', lang)}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

            {/* Completion CTA — shown when every section is done */}
            {allSectionsComplete && (
              <Card tone="sage" padding="lg" className="mt-5 border-sage-deep/60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-forest text-cream flex items-center justify-center shrink-0">
                    <Icon name="check" size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Tag tone="forest" filled>
                      {lang === 'bn' ? 'মডিউল সম্পন্ন' : lang === 'hi' ? 'मॉड्यूल पूरा' : 'Module complete'}
                    </Tag>
                    <h3 className="font-serif italic text-xl text-ink mt-2 leading-tight">
                      {lang === 'bn'
                        ? 'দারুণ! এরপর কী করবে?'
                        : lang === 'hi'
                        ? 'बहुत बढ़िया! अब क्या करोगे?'
                        : 'Nicely done — what next?'}
                    </h3>
                    <p className="text-[12.5px] text-muted mt-1">
                      {lang === 'bn'
                        ? 'পরীক্ষা দিয়ে যাচাই করো, অথবা পরের মডিউলে এগোও।'
                        : lang === 'hi'
                        ? 'क्विज़ से खुद को परखो, या अगले मॉड्यूल पर जाओ।'
                        : 'Test yourself with a quiz, or move on to the next module.'}
                    </p>

                    {/* Buttons live inside the text column so they align with
                        the tag/heading/copy above them, not the icon gutter. */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button variant="primary" size="sm" icon="quiz" onClick={goToQuiz}>
                        {lang === 'bn' ? 'পরীক্ষা দাও' : lang === 'hi' ? 'क्विज़ दो' : 'Try quiz'}
                      </Button>
                      {nextModule ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          iconRight="arrowR"
                          onClick={goToNextModule}
                        >
                          {getTitle(nextModule, lang).slice(0, 24)}
                          {getTitle(nextModule, lang).length > 24 ? '…' : ''}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon="sparkle"
                          onClick={() => router.push('/progress')}
                        >
                          {lang === 'bn'
                            ? 'অগ্রগতি দেখো'
                            : lang === 'hi'
                            ? 'प्रगति देखो'
                            : 'View progress'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
            </>
          );
        })()
      ) : (
        <EmptyState
          icon="book"
          title={
            lang === 'bn'
              ? 'এই মডিউলের বিষয়বস্তু এখনও যোগ করা হয়নি'
              : lang === 'hi'
              ? 'इस मॉड्यूल का विषय अभी नहीं जुड़ा'
              : 'No content for this module yet'
          }
          description={
            lang === 'bn'
              ? 'অন্য মডিউল বাছো, অথবা Ask ট্যাবে গিয়ে অর্জুনকে এই বিষয়ে প্রশ্ন করো।'
              : lang === 'hi'
              ? 'दूसरा मॉड्यूल चुनो, या Ask टैब में अर्जुन से इस विषय पर सवाल करो।'
              : 'Pick another module, or head to the Ask tab and ask Taksha about this topic directly.'
          }
        />
      )}
    </div>
  );
}
