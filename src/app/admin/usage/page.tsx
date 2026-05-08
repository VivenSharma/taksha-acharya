'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Aggregate {
  totalCalls: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalTtsChars: number;
  errors: number;
}

interface RecentCall {
  ts: string;
  service: 'chat' | 'quiz' | 'tts';
  model: string;
  status: 'ok' | 'error' | 'timeout';
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  chars?: number;
  lang?: string;
  moduleId?: string;
  hasImage?: boolean;
  costUsd: number;
  errorMessage?: string;
}

interface UsageResponse {
  available: boolean;
  source?: 'supabase' | 'file' | 'none';
  message?: string;
  summary: Aggregate;
  byService: Record<string, Aggregate>;
  byModel: Record<string, Aggregate>;
  byDay: Record<string, Aggregate>;
  byLang: Record<string, Aggregate>;
  recent?: RecentCall[];
  totalCount: number;
}

const usd = (n: number) => `$${n.toFixed(4)}`;
const compactUsd = (n: number) =>
  n < 0.01 ? `$${n.toFixed(4)}` : n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
const num = (n: number) => n.toLocaleString();

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/usage', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <Card tone="cream" padding="lg">
        <p className="text-terra text-sm">Failed to load usage data: {err}</p>
      </Card>
    );
  }

  if (!data.available) {
    return (
      <div>
        <Header source={data.source} onRefresh={load} />
        <Card tone="cream" padding="lg">
          <p className="text-sm text-ink">{data.message}</p>
        </Card>
      </div>
    );
  }

  const days = Object.keys(data.byDay).sort();
  const services = Object.entries(data.byService);
  const models = Object.entries(data.byModel);
  const langs = Object.entries(data.byLang);

  return (
    <div>
      <Header source={data.source} onRefresh={load} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon="chart"
          label="Total calls"
          value={num(data.summary.totalCalls)}
        />
        <StatCard
          icon="rupee"
          label="Cost (est.)"
          value={compactUsd(data.summary.totalCostUsd)}
          subtle="USD"
        />
        <StatCard
          icon="arrowL"
          label="Input tokens"
          value={num(data.summary.totalInputTokens)}
          subtle={`cached: ${num(data.summary.totalCachedInputTokens)}`}
        />
        <StatCard
          icon="arrowR"
          label="Output tokens"
          value={num(data.summary.totalOutputTokens)}
          subtle={`tts chars: ${num(data.summary.totalTtsChars)}`}
        />
      </div>

      {data.summary.errors > 0 && (
        <div className="bg-terra/10 border border-terra/30 text-terra rounded-lg px-4 py-2.5 text-xs mb-5 flex items-center gap-2">
          <Icon name="flame" size={14} />
          {data.summary.errors} call{data.summary.errors === 1 ? '' : 's'} failed / timed out.
        </div>
      )}

      <Section title="By service">
        <DataTable
          cols={['Service', 'Calls', 'Cost', 'In', 'Out', 'Cached', 'TTS chars', 'Err']}
          rows={services.map(([k, v]) => [
            k,
            num(v.totalCalls),
            compactUsd(v.totalCostUsd),
            num(v.totalInputTokens),
            num(v.totalOutputTokens),
            num(v.totalCachedInputTokens),
            num(v.totalTtsChars),
            String(v.errors),
          ])}
        />
      </Section>

      <Section title="By model">
        <DataTable
          cols={['Model', 'Calls', 'Cost', 'In', 'Out', 'Cached']}
          rows={models.map(([k, v]) => [
            k,
            num(v.totalCalls),
            compactUsd(v.totalCostUsd),
            num(v.totalInputTokens),
            num(v.totalOutputTokens),
            num(v.totalCachedInputTokens),
          ])}
        />
      </Section>

      <Section title="By language">
        <DataTable
          cols={['Lang', 'Calls', 'Cost']}
          rows={langs.map(([k, v]) => [k, num(v.totalCalls), compactUsd(v.totalCostUsd)])}
        />
      </Section>

      <Section title="Per-day breakdown">
        <DataTable
          cols={['Day', 'Calls', 'Cost', 'In', 'Out']}
          rows={days.map((d) => {
            const v = data.byDay[d];
            return [
              d,
              num(v.totalCalls),
              compactUsd(v.totalCostUsd),
              num(v.totalInputTokens),
              num(v.totalOutputTokens),
            ];
          })}
        />
      </Section>

      <Section title={`Recent calls (${data.recent?.length || 0} of ${data.totalCount})`}>
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Time</th>
                  <th className="text-left px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Service</th>
                  <th className="text-left px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Model</th>
                  <th className="text-left px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Lang</th>
                  <th className="text-right px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">In</th>
                  <th className="text-right px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Out</th>
                  <th className="text-right px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Cached</th>
                  <th className="text-right px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Chars</th>
                  <th className="text-right px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Dur</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Cost</th>
                  <th className="text-left px-2 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.recent || []).map((c, i) => (
                  <tr key={i} className="border-t border-line hover:bg-cream/60">
                    <td className="px-3 py-1.5 font-mono text-[10.5px] text-ink-soft">
                      {new Date(c.ts).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-ink">{c.service}</td>
                    <td className="px-2 py-1.5 font-mono text-[10.5px] text-muted">{c.model}</td>
                    <td className="px-2 py-1.5 text-ink">{c.lang || '—'}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-ink-soft">{c.inputTokens ? num(c.inputTokens) : '—'}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-ink-soft">{c.outputTokens ? num(c.outputTokens) : '—'}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-ink-soft">{c.cachedInputTokens ? num(c.cachedInputTokens) : '—'}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-ink-soft">{c.chars ? num(c.chars) : '—'}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-muted">{c.durationMs}ms</td>
                    <td className="text-right px-3 py-1.5 font-mono text-ink">{usd(c.costUsd)}</td>
                    <td className="px-2 py-1.5">
                      <Tag
                        tone={c.status === 'ok' ? 'forest' : c.status === 'timeout' ? 'gold' : 'terra'}
                        filled
                      >
                        {c.status}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <p className="text-[10.5px] text-muted italic mt-6">
        Costs are estimates from published provider rates. For billing truth, check Anthropic + Google Cloud consoles.
      </p>
    </div>
  );
}

function Header({ source, onRefresh }: { source?: 'supabase' | 'file' | 'none'; onRefresh: () => void }) {
  return (
    <div className="flex items-end justify-between mb-6 gap-4">
      <div>
        <Tag tone="muted">Metrics</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">AI Usage</h1>
        {source && (
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-1">
            source: {source}
            {source === 'supabase' ? ' · taksha_ai_usage' : source === 'file' ? ' · logs/ai/calls.jsonl' : ''}
          </p>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-forest hover:underline"
      >
        Refresh →
      </button>
    </div>
  );
}

function StatCard({
  icon, label, value, subtle,
}: { icon: IconName; label: string; value: string; subtle?: string }) {
  return (
    <Card tone="surface" padding="md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
          <Icon name={icon} size={14} />
        </div>
        <Tag tone="muted">{label}</Tag>
      </div>
      <p className="font-serif italic text-3xl text-forest leading-none mt-3">{value}</p>
      {subtle && <p className="font-mono text-[10.5px] text-muted mt-2">{subtle}</p>}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <Tag tone="muted" className="block mb-2.5">{title}</Tag>
      {children}
    </section>
  );
}

function DataTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <Card tone="surface" padding="none" className="overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-cream border-b border-line">
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                className={`${i === 0 ? 'text-left' : 'text-right'} px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-3 py-4 text-center text-muted italic">
                No data yet
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-line hover:bg-cream/60">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-1.5 ${
                      j === 0
                        ? 'text-left font-mono text-[11px] text-ink'
                        : 'text-right font-mono text-ink-soft'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
