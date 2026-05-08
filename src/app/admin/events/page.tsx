'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';

interface Row {
  id: string;
  learner_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

function EventsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const learnerId = params.get('learnerId') || '';
  const eventType = params.get('eventType') || '';

  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [distinctTypes, setDistinctTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Row | null>(null);

  useEffect(() => {
    setLoading(true);
    api.admin.events({ page, learnerId: learnerId || undefined, eventType: eventType || undefined })
      .then((r) => {
        setRows(r.rows);
        setTotalCount(r.totalCount);
        setPageSize(r.pageSize);
        setDistinctTypes(r.distinctTypes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, learnerId, eventType]);

  function updateFilter(key: 'learnerId' | 'eventType', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(0);
    router.replace(`/admin/events?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Observability</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Events</h1>
        <p className="text-sm text-muted mt-1">
          {totalCount === 0 ? 'No events recorded yet.' : `${totalCount} total · newest first`}
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
        <select
          value={eventType}
          onChange={(e) => updateFilter('eventType', e.target.value)}
          className="border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-forest/30"
        >
          <option value="">All event types</option>
          {distinctTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {(learnerId || eventType) && (
          <Button variant="ghost" size="sm" onClick={() => router.replace('/admin/events')}>
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
          icon="wave"
          title="No events match"
          description="Try clearing the filters or wait for learner activity."
        />
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">When</th>
                  <th className="text-left  px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Event</th>
                  <th className="text-left  px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Learner</th>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Data</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setActive(row)}
                    className="border-t border-line hover:bg-cream/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2 font-mono text-[11px] text-muted whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <Tag tone="cream" filled>{row.event_type}</Tag>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-muted">
                      {row.learner_id ? row.learner_id.slice(0, 10) + '…' : 'anon'}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-ink max-w-md truncate">
                      {row.event_data ? JSON.stringify(row.event_data) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right">
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
        subtitle={active ? new Date(active.created_at).toLocaleString() : undefined}
        title={active?.event_type}
      >
        {active && (
          <div className="space-y-4">
            <div>
              <Tag tone="muted" className="block mb-1">Learner</Tag>
              <p className="font-mono text-[12px] text-ink break-all">
                {active.learner_id || 'anon'}
              </p>
            </div>
            <div>
              <Tag tone="muted" className="block mb-1">Event data</Tag>
              <pre className="bg-cream rounded-lg border border-line p-3 text-[12px] font-mono text-ink whitespace-pre-wrap break-all">
                {active.event_data ? JSON.stringify(active.event_data, null, 2) : '—'}
              </pre>
            </div>
            <div className="pt-3 border-t border-line font-mono text-[11px] text-muted break-all">
              ID: {active.id}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>}>
      <EventsInner />
    </Suspense>
  );
}
