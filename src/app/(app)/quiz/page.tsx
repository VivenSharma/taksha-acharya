'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n/labels';
import { getTitle } from '@/lib/types';
import { syncQuizAttempt, trackEvent } from '@/lib/learner-sync';
import { errorCopy } from '@/lib/error-copy';
import type { QuizQuestion } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type QuizState = 'ready' | 'loading' | 'active' | 'result';

export default function QuizPage() {
  const { selectedModuleId, lang, modules, progress, addQuizAttempt } = useStore();
  const [state, setState] = useState<QuizState>('ready');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentModule = modules.find((m) => m.id === selectedModuleId);

  async function startQuiz() {
    setState('loading');
    setError(null);

    // Collect every module the learner has marked complete so far.
    // The quiz API uses this to draw cross-module connections where relevant.
    const completedModuleIds = Object.entries(progress)
      .filter(([, p]) => p?.completed)
      .map(([id]) => id)
      .filter((id) => id !== selectedModuleId);

    trackEvent('quiz_start', selectedModuleId, { lang, completedCount: completedModuleIds.length });
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: selectedModuleId,
          lang,
          completedModuleIds,
          learnerId: useStore.getState().learnerId,
        }),
      });
      if (!res.ok) {
        const e: Error & { status?: number } = new Error(`Quiz API error: ${res.status}`);
        e.status = res.status;
        throw e;
      }
      const data = await res.json();
      const qs = data.questions;
      if (
        Array.isArray(qs) &&
        qs.length >= 1 &&
        qs.every(
          (q: QuizQuestion) =>
            typeof q.q === 'string' &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 &&
            q.correct < q.options.length
        )
      ) {
        setQuestions(qs);
        setCurrentIdx(0);
        setScore(0);
        setSelected(null);
        setShowAnswer(false);
        setState('active');
      } else {
        throw new Error('Invalid quiz format');
      }
    } catch (err) {
      console.error('Quiz error:', err);
      setError(errorCopy(err, lang));
      setState('ready');
    }
  }

  function handleSelect(optIdx: number) {
    if (showAnswer) return;
    setSelected(optIdx);
    setShowAnswer(true);
    if (optIdx === questions[currentIdx].correct) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowAnswer(false);
    } else {
      addQuizAttempt({
        id: crypto.randomUUID(),
        learner_id: '',
        module_id: selectedModuleId,
        score,
        total: questions.length,
        questions,
        created_at: new Date().toISOString(),
      });
      syncQuizAttempt(selectedModuleId, score, questions.length, questions);
      trackEvent('quiz_complete', selectedModuleId, { score, total: questions.length });
      setState('result');
    }
  }

  if (state === 'ready') {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 max-w-md mx-auto">
        <Icon name="quiz" size={48} className="text-forest mb-4" />
        <Tag tone="muted" className="mb-2">{selectedModuleId}</Tag>
        {currentModule && (
          <p className="font-serif italic text-xl text-ink text-center mb-2">
            {getTitle(currentModule, lang)}
          </p>
        )}
        <p className="text-sm text-muted text-center mb-6">
          5 multiple-choice · ~3 min
        </p>
        {error && (
          <Card tone="cream" padding="sm" className="mb-4 border-terra/30">
            <p className="text-xs text-terra">{error}</p>
          </Card>
        )}
        <Button variant="primary" size="lg" onClick={startQuiz} icon="sparkle">
          {t('startQuiz', lang)}
        </Button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted">{t('thinking', lang)}</p>
      </div>
    );
  }

  if (state === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 max-w-md mx-auto">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-sage text-forest' : 'bg-terra/10 text-terra'}`}>
          <Icon name={passed ? 'sparkle' : 'flame'} size={40} />
        </div>
        <Tag tone="muted" className="mb-2">{t('quizResult', lang)}</Tag>
        <p className="font-serif italic text-6xl text-forest leading-none">
          {score}<span className="text-3xl text-muted">/{questions.length}</span>
        </p>
        <Tag tone={passed ? 'forest' : 'terra'} filled className="mt-4">
          {pct}%
        </Tag>
        <div className="mt-6">
          <Button variant="primary" onClick={startQuiz}>
            {t('retake', lang)}
          </Button>
        </div>
      </div>
    );
  }

  // Active quiz
  const q = questions[currentIdx];
  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-5">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-5">
        <Tag tone="muted">
          {t('question', lang)} {currentIdx + 1} / {questions.length}
        </Tag>
        <div className="flex-1 h-1 bg-sage rounded-full overflow-hidden">
          <div
            className="h-full bg-forest rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] font-semibold text-forest">
          {score}/{currentIdx + (showAnswer ? 1 : 0)}
        </span>
      </div>

      {/* Question */}
      <Card tone="surface" padding="lg" className="mb-4">
        <p className="font-serif text-[16px] leading-[1.5] text-ink">{q.q}</p>
      </Card>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {q.options.map((opt, i) => {
          let cls = 'bg-cream border-line text-ink hover:border-forest';
          if (showAnswer) {
            if (i === q.correct) cls = 'bg-sage border-forest text-forest font-semibold';
            else if (i === selected) cls = 'bg-terra/10 border-terra text-terra';
            else cls = 'bg-paper border-line text-muted';
          } else if (i === selected) {
            cls = 'bg-forest/10 border-forest text-forest';
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={showAnswer}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-colors ${cls}`}
            >
              <span className="font-mono font-bold mr-3 text-[12px]">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswer && (
        <Card tone="sage" padding="md" className="mb-4">
          <Tag tone={selected === q.correct ? 'forest' : 'terra'} className="mb-1.5">
            {selected === q.correct ? t('correct', lang) : t('incorrect', lang)}
          </Tag>
          <p className="text-sm text-ink leading-relaxed">{q.explanation}</p>
        </Card>
      )}

      {showAnswer && (
        <Button variant="primary" size="lg" fullWidth onClick={handleNext} iconRight="arrowR">
          {currentIdx < questions.length - 1 ? t('next', lang) : t('quizResult', lang)}
        </Button>
      )}
    </div>
  );
}
