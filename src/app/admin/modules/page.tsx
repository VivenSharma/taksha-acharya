'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { Module } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/components/ui/Icon';

interface ModuleWithCounts extends Module {
  sectionCount: number;
  contentCount: number;
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.modules()
      .then((r) => setModules(r.modules))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = modules.reduce<Record<string, ModuleWithCounts[]>>((acc, mod) => {
    if (!acc[mod.group_key]) acc[mod.group_key] = [];
    acc[mod.group_key].push(mod);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Content</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Modules</h1>
        <p className="text-sm text-muted mt-1">
          {modules.length} total · click a row to edit sections + content.
        </p>
      </div>

      {Object.entries(grouped).map(([groupKey, mods]) => (
        <section key={groupKey} className="mb-6">
          <Tag tone="muted" className="block mb-2">
            {mods[0]?.group_label_en || groupKey}
          </Tag>
          <Card tone="surface" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-line">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Module</th>
                    <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Sections</th>
                    <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Content</th>
                    <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Hours</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {mods.map((mod) => {
                    const hasContent = mod.contentCount >= mod.sectionCount * 3;
                    return (
                      <tr key={mod.id} className="border-t border-line hover:bg-cream/60 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/admin/modules/${mod.id}`} className="block">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-forest shrink-0">
                                <Icon name="book" size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-ink truncate">{mod.title_en}</p>
                                <p className="font-mono text-[10.5px] text-muted">{mod.id}</p>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="text-center px-2">
                          <Tag tone={mod.sectionCount > 0 ? 'forest' : 'terra'} filled>
                            {mod.sectionCount}
                          </Tag>
                        </td>
                        <td className="text-center px-2">
                          <Tag tone={hasContent ? 'forest' : 'terra'} filled>
                            {mod.contentCount} / {mod.sectionCount * 3}
                          </Tag>
                        </td>
                        <td className="text-center px-2 font-mono text-[11.5px] text-muted">
                          {mod.theory_hours + mod.practical_hours}h
                        </td>
                        <td className="px-2 text-right">
                          <Link
                            href={`/admin/modules/${mod.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                          >
                            Edit
                            <Icon name="arrowR" size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      ))}
    </div>
  );
}
