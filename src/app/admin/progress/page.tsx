'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

interface ProgressRow {
  id: string;
  learnerId: string;
  learnerName: string | null;
  learnerPhone: string | null;
  moduleId: string | null;
  moduleTitle: string;
  sectionsCompleted: string[];
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
}

function ProgressInner() {
  const router = useRouter();
  const params = useSearchParams();
  const learnerId = params.get('learnerId') || '';
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [moduleCount, setModuleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.admin.progress({ learnerId: learnerId || undefined })
      .then((r) => { setRows(r.rows); setModuleCount(r.moduleCount); })
      .finally(() => setLoading(false));
  }, [learnerId]);

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; done: number; touched: number; last: string }>();
    rows.forEach((r) => {
      const cur = map.get(r.learnerId) || { name: r.learnerName || 'Unknown', phone: r.learnerPhone || r.learnerId.slice(0, 12), done: 0, touched: 0, last: '' };
      cur.touched += 1;
      if (r.completed) cur.done += 1;
      if (r.updatedAt > cur.last) cur.last = r.updatedAt;
      map.set(r.learnerId, cur);
    });
    return Array.from(map.entries());
  }, [rows]);

  function setFilter(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('learnerId', value); else next.delete('learnerId');
    router.replace(`/admin/progress?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Learning</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Course Progress</h1>
        <p className="text-sm text-muted mt-1">Track completed modules and active learners.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <input defaultValue={learnerId} onBlur={(e) => setFilter(e.target.value.trim())} className="flex-1 border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper" placeholder="Filter by learner UUID" />
        {learnerId && <Button variant="ghost" size="sm" onClick={() => router.replace('/admin/progress')}>Clear</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>
      ) : learnerId ? (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Module</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Sections</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Status</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-cream/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{r.moduleTitle}</p>
                      <p className="font-mono text-[11px] text-muted">{r.moduleId}</p>
                    </td>
                    <td className="text-center px-2 font-mono text-[12px]">{r.sectionsCompleted.length}</td>
                    <td className="text-center px-2"><Tag tone={r.completed ? 'forest' : 'gold'} filled>{r.completed ? 'Complete' : 'Started'}</Tag></td>
                    <td className="text-right px-4 font-mono text-[11px] text-muted">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No progress for this learner.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream border-b border-line">
              <tr>
                <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Learner</th>
                <th className="text-center px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Completed</th>
                <th className="text-center px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Touched</th>
                <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Last update</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {summary.map(([id, s]) => (
                <tr key={id} className="border-t border-line hover:bg-cream/60">
                  <td className="px-4 py-3"><p className="font-medium text-ink">{s.name}</p><p className="font-mono text-[11px] text-muted">{s.phone}</p></td>
                  <td className="text-center px-2"><Tag tone="forest" filled>{s.done}/{moduleCount}</Tag></td>
                  <td className="text-center px-2 font-mono text-[12px]">{s.touched}</td>
                  <td className="text-right px-4 font-mono text-[11px] text-muted">{s.last ? new Date(s.last).toLocaleString() : '-'}</td>
                  <td className="px-2 text-right"><Button variant="ghost" size="sm" iconRight="arrowR" onClick={() => setFilter(id)}>View</Button></td>
                </tr>
              ))}
              {summary.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No progress recorded yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function AdminProgressPage() {
  return <Suspense fallback={null}><ProgressInner /></Suspense>;
}
