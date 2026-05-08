'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Stats {
  modules: number;
  sections: number;
  contentRows: number;
  videos: number;
  learners: number;
  quizAttempts: number;
}

interface StatDef {
  key: keyof Stats;
  label: string;
  icon: IconName;
  target?: number;
}

const STATS: StatDef[] = [
  { key: 'modules',      label: 'Modules',       icon: 'book',    target: 38 },
  { key: 'sections',     label: 'Sections',      icon: 'stack',   target: 180 },
  { key: 'contentRows',  label: 'Content rows',  icon: 'pencil',  target: 540 },
  { key: 'videos',       label: 'Videos',        icon: 'play',    target: 38 },
  { key: 'learners',     label: 'Learners',      icon: 'user' },
  { key: 'quizAttempts', label: 'Quiz attempts', icon: 'quiz' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Overview</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Dashboard</h1>
        <p className="text-sm text-muted mt-1">A snapshot of content, learners, and activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {STATS.map((s) => (
          <StatCard
            key={s.key}
            icon={s.icon}
            label={s.label}
            value={stats[s.key]}
            target={s.target}
          />
        ))}
      </div>

      {/* Coverage */}
      <section className="mb-4">
        <Tag tone="muted" className="block mb-3">Content coverage</Tag>
        <Card tone="surface" padding="lg" className="space-y-4">
          <CoverageBar label="Modules"        current={stats.modules}     target={38}  />
          <CoverageBar label="Sections"       current={stats.sections}    target={180} hint="~180 target" />
          <CoverageBar label="Content rows"   current={stats.contentRows} target={540} hint="~540 target" />
          <CoverageBar label="Videos"         current={stats.videos}      target={38} />
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon, label, value, target,
}: { icon: IconName; label: string; value: number; target?: number }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <Card tone="surface" padding="md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
          <Icon name={icon} size={16} />
        </div>
        <Tag tone="muted">{label}</Tag>
      </div>
      <p className="font-serif italic text-4xl text-forest leading-none mt-3">
        {value.toLocaleString()}
        {target && (
          <span className="text-lg text-muted not-italic font-mono ml-1">
            / {target}
          </span>
        )}
      </p>
      {pct !== null && (
        <div className="mt-3 h-1 bg-sage rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 80 ? 'bg-forest' : pct >= 50 ? 'bg-gold' : 'bg-terra'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Card>
  );
}

function CoverageBar({
  label, current, target, hint,
}: { label: string; current: number; target: number; hint?: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const tone = pct >= 80 ? 'bg-forest' : pct >= 50 ? 'bg-gold' : 'bg-terra';
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 mb-1.5">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="font-mono text-[11px] text-muted">
          {current}/{target}
          <span className="text-ink ml-2">{pct}%</span>
          {hint && <span className="text-muted/60 ml-2">· {hint}</span>}
        </span>
      </div>
      <div className="h-1.5 bg-sage rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
