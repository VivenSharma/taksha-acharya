'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { Avatar } from '@/components/ui/Avatar';

interface Row {
  id: string;
  learner_id: string;
  module_id: string;
  log_type: string;
  data: {
    input?: string;
    score?: number;
    feedback?: string;
    nextStep?: string;
    hasPhoto?: boolean;
  } | null;
  created_at: string;
}

function scoreTone(score?: number): 'forest' | 'gold' | 'terra' {
  if (score === undefined) return 'gold';
  if (score >= 7) return 'forest';
  if (score >= 4) return 'gold';
  return 'terra';
}

function ApplyLogsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const learnerId = params.get('learnerId') || '';
  const moduleId = params.get('moduleId') || '';

  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Row | null>(null);

  useEffect(() => {
    setLoading(true);
    api.admin.applyLogs({ page, learnerId: learnerId || undefined, moduleId: moduleId || undefined })
      .then((r) => {
        setRows(r.rows);
        setTotalCount(r.totalCount);
        setPageSize(r.pageSize);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, learnerId, moduleId]);

  function updateFilter(key: 'learnerId' | 'moduleId', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(0);
    router.replace(`/admin/apply-logs?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Observability</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Apply logs</h1>
        <p className="text-sm text-muted mt-1">
          {totalCount === 0 ? 'No field submissions yet.' : `${totalCount} total · newest first`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="Filter by learner UUID…"
          defaultValue={learnerId}
          onBlur={(e) => updateFilter('learnerId', e.target.value.trim())}
          className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        <input
          type="text"
          placeholder="Filter by module, e.g. M01-intro"
          defaultValue={moduleId}
          onBlur={(e) => updateFilter('moduleId', e.target.value.trim())}
          className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        {(learnerId || moduleId) && (
          <Button variant="ghost" size="sm" onClick={() => router.replace('/admin/apply-logs')}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="hand"
          title="No submissions match"
          description="Try clearing the filters or wait for learners to submit field reports."
        />
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Score</th>
                  <th className="text-left  px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Module</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Photo</th>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Learner</th>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Report</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">When</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const d = row.data || {};
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setActive(row)}
                      className="border-t border-line hover:bg-cream/60 transition-colors cursor-pointer"
                    >
                      <td className="text-center px-2 py-2.5">
                        <Tag tone={scoreTone(d.score)} filled>
                          {d.score !== undefined ? `${d.score}/10` : '—'}
                        </Tag>
                      </td>
                      <td className="px-2 py-2.5">
                        <Tag tone="muted">{row.module_id}</Tag>
                      </td>
                      <td className="text-center px-2 py-2.5">
                        {d.hasPhoto ? (
                          <Icon name="cam" size={14} className="inline text-gold" />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted">
                        {row.learner_id.slice(0, 10) + '…'}
                      </td>
                      <td className="px-4 py-2.5 max-w-sm">
                        <p className="text-[13px] text-ink truncate">{d.input || '(no text)'}</p>
                      </td>
                      <td className="text-right px-4 py-2.5 font-mono text-[11px] text-muted whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconRight="arrowR"
                          onClick={(e) => { e.stopPropagation(); setActive(row); }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted font-mono">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon="arrowL" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" iconRight="arrowR" disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        subtitle={active ? `${active.module_id} · ${new Date(active.created_at).toLocaleString()}` : undefined}
        title="Field submission"
      >
        {active && (() => {
          const d = active.data || {};
          return (
            <>
              {/* Header meta — learner, score, photo flag */}
              <div className="mb-4 space-y-2">
                <p className="font-mono text-[11px] text-muted break-all">
                  {active.learner_id}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={scoreTone(d.score)} filled>
                    {d.score !== undefined ? `${d.score} / 10` : 'No score'}
                  </Tag>
                  {d.hasPhoto && (
                    <Tag tone="gold" filled>
                      <Icon name="cam" size={11} className="mr-1" />photo attached
                    </Tag>
                  )}
                  <Tag tone="muted">{active.log_type}</Tag>
                </div>
              </div>

              {/* Chat-style thread: learner on the right, Taksha on the left.
                  Matches the visual pattern used by /admin/chat-logs so both
                  review UIs feel consistent. */}
              <div className="space-y-3">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="bg-forest text-cream rounded-2xl rounded-br-sm px-3.5 py-2 text-[13.5px] max-w-[85%] whitespace-pre-wrap">
                    {d.input || '(no text — photo-only submission)'}
                  </div>
                </div>

                {/* Taksha: feedback */}
                {d.feedback && (
                  <div className="flex justify-start items-end">
                    <Avatar size={24} useImage className="mr-2" />
                    <div className="bg-surface text-ink border border-line rounded-2xl rounded-bl-sm px-3.5 py-2 text-[13.5px] max-w-[85%] font-serif leading-relaxed whitespace-pre-wrap">
                      {d.feedback}
                    </div>
                  </div>
                )}

                {/* Taksha: next step as its own bubble — labelled subtly on top */}
                {d.nextStep && (
                  <div className="flex justify-start items-end">
                    <Avatar size={24} useImage className="mr-2" />
                    <div className="bg-sage text-ink border border-sage-deep/40 rounded-2xl rounded-bl-sm px-3.5 py-2 text-[13.5px] max-w-[85%] font-serif leading-relaxed whitespace-pre-wrap">
                      <span className="block font-mono text-[9px] tracking-[0.18em] uppercase text-forest mb-1">
                        Next step
                      </span>
                      {d.nextStep}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted text-right font-mono pt-1">
                  {new Date(active.created_at).toLocaleString()}
                </p>
              </div>

              {d.hasPhoto && (
                <p className="mt-4 text-[11px] text-muted italic">
                  Note: the photo was sent to the AI for evaluation but isn&apos;t stored — enable photo persistence to review it here.
                </p>
              )}
            </>
          );
        })()}
      </Drawer>
    </div>
  );
}

export default function AdminApplyLogsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>}>
      <ApplyLogsInner />
    </Suspense>
  );
}
