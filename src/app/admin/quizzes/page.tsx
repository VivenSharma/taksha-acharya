'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

interface QuizRow {
  id: string;
  learnerId: string;
  learnerName: string | null;
  learnerPhone: string | null;
  moduleId: string | null;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
}

function QuizzesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const learnerId = params.get('learnerId') || '';
  const moduleId = params.get('moduleId') || '';
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.admin.quizResults({ page, learnerId: learnerId || undefined, moduleId: moduleId || undefined })
      .then((r) => { setRows(r.rows); setTotalCount(r.totalCount); setPageSize(r.pageSize); })
      .finally(() => setLoading(false));
  }, [page, learnerId, moduleId]);

  function updateFilter(key: 'learnerId' | 'moduleId', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setPage(0);
    router.replace(`/admin/quizzes?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Assessment</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Quiz Results</h1>
        <p className="text-sm text-muted mt-1">{totalCount} attempts · newest first</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input defaultValue={learnerId} onBlur={(e) => updateFilter('learnerId', e.target.value.trim())} className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper" placeholder="Filter by learner UUID" />
        <input defaultValue={moduleId} onBlur={(e) => updateFilter('moduleId', e.target.value.trim())} className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper" placeholder="Filter by module slug" />
        {(learnerId || moduleId) && <Button variant="ghost" size="sm" onClick={() => router.replace('/admin/quizzes')}>Clear</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Learner</th>
                  <th className="text-left px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Module</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Score</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Taken</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-cream/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{r.learnerName || 'Unknown'}</p>
                      <p className="font-mono text-[11px] text-muted">{r.learnerPhone || r.learnerId.slice(0, 12)}</p>
                    </td>
                    <td className="px-2 py-3"><Tag tone="muted">{r.moduleId || 'Unknown'}</Tag></td>
                    <td className="text-center px-2 py-3">
                      <Tag tone={r.percent >= 70 ? 'forest' : 'terra'} filled>{r.score}/{r.total} · {r.percent}%</Tag>
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-[11px] text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No quiz attempts match.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted font-mono">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon="arrowL" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" iconRight="arrowR" disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminQuizzesPage() {
  return <Suspense fallback={null}><QuizzesInner /></Suspense>;
}
