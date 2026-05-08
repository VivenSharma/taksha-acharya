'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface LearnerRow {
  id: string;
  device_id: string;
  name: string | null;
  phone: string | null;
  preferred_lang: string;
  created_at: string;
  last_seen: string;
  progressCount: number;
  quizCount: number;
  avgScore: number;
}

export default function AdminLearnersPage() {
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setLoading(true);
    api.admin.learners(page)
      .then((r) => {
        setLearners(r.learners);
        setTotalCount(r.totalCount);
        setPageSize(r.pageSize);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Tag tone="muted">People</Tag>
          <h1 className="font-serif italic text-4xl text-forest mt-2">Learners</h1>
          <p className="text-sm text-muted mt-1">
            {totalCount === 0 ? 'No learners yet.' : `${totalCount} total · ordered by last seen`}
          </p>
        </div>
      </div>

      {learners.length === 0 ? (
        <Card tone="cream" padding="lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
              <Icon name="user" size={18} />
            </div>
            <p className="text-sm text-ink">
              Learners will appear here as they open the app.
            </p>
          </div>
        </Card>
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Learner</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Lang</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Modules</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Quizzes</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Avg</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l) => (
                  <tr key={l.id} className="border-t border-line hover:bg-cream/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{l.name || 'Anonymous'}</p>
                      <p className="text-[11px] text-muted font-mono">
                        {l.phone || (l.device_id ? l.device_id.slice(0, 14) + '…' : '—')}
                      </p>
                    </td>
                    <td className="text-center px-2">
                      <Tag tone="cream" filled>
                        {l.preferred_lang === 'bn' ? 'বাং' : l.preferred_lang === 'hi' ? 'हि' : 'EN'}
                      </Tag>
                    </td>
                    <td className="text-center px-2 font-mono text-[13px] text-forest font-semibold">
                      {l.progressCount}
                    </td>
                    <td className="text-center px-2 font-mono text-[13px] text-ink">
                      {l.quizCount}
                    </td>
                    <td className="text-center px-2">
                      {l.quizCount > 0 ? (
                        <Tag tone={l.avgScore >= 70 ? 'forest' : 'terra'} filled>
                          {l.avgScore}%
                        </Tag>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-right px-4 font-mono text-[11px] text-muted">
                      {new Date(l.last_seen).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
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
            <Button
              variant="secondary"
              size="sm"
              icon="arrowL"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconRight="arrowR"
              disabled={(page + 1) * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
