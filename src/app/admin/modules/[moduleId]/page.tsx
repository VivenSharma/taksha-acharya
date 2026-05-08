'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { Module, Section, Content, Lang } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface SectionWithContent extends Section {
  content: Record<Lang, Content | null>;
}

const LANG_LABEL: Record<Lang, string> = {
  bn: 'বাংলা',
  hi: 'हिन्दी',
  en: 'English',
};

export default function ModuleEditorPage() {
  const params = useParams();
  const moduleId = params.moduleId as string;

  const [mod, setMod] = useState<Module | null>(null);
  const [sections, setSections] = useState<SectionWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<Lang>('en');
  const [editBody, setEditBody] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.admin.module(moduleId);
      setMod(r.module);
      setSections(r.sections);
    } catch (err) {
      console.error(err);
      setMessage('Error: failed to load module');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect

  function startEdit(sectionId: string, lang: Lang) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    setEditingSection(sectionId);
    setEditLang(lang);
    setEditBody(section.content[lang]?.body || '');
  }

  async function saveContent() {
    if (!editingSection) return;
    setSaving(true);
    setMessage('');
    try {
      await api.admin.upsertContent(editingSection, editLang, editBody);
      setMessage('Saved.');
      setEditingSection(null);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Write failed';
      setMessage('Error: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  async function addSection() {
    try {
      await api.admin.addSection(moduleId, sections.length + 1);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Write failed';
      setMessage('Error: ' + msg);
    }
  }

  async function updateSectionTitle(sectionId: string, field: string, value: string) {
    try {
      await api.admin.updateSection(sectionId, { [field]: value });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSection(sectionId: string) {
    if (!confirm('Delete this section and all its content?')) return;
    try {
      await api.admin.deleteSection(sectionId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!mod) {
    return <p className="text-muted text-sm">Module not found.</p>;
  }

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          href="/admin/modules"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted hover:text-forest transition-colors"
        >
          <Icon name="arrowL" size={12} />
          All modules
        </Link>
        <Tag tone="muted" className="mt-3 block">{mod.id} · {mod.theory_hours + mod.practical_hours}h</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-1 leading-tight">{mod.title_en}</h1>
        <p className="text-sm text-muted mt-1">
          {sections.length} section{sections.length === 1 ? '' : 's'} · edit titles inline, tap a language pill to edit content.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div className={`text-xs px-4 py-2.5 rounded-lg mb-4 ${
          message.startsWith('Error')
            ? 'bg-terra/10 text-terra border border-terra/30'
            : 'bg-sage text-forest border border-sage-deep/30'
        }`}>
          {message}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <Card key={section.id} tone="surface" padding="none" className="overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-cream border-b border-line">
              <span className="w-7 h-7 bg-forest text-cream rounded-full text-xs flex items-center justify-center font-mono font-bold shrink-0">
                {idx + 1}
              </span>
              <input
                defaultValue={section.title_en}
                onBlur={(e) => updateSectionTitle(section.id, 'title_en', e.target.value)}
                className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-forest rounded px-1"
              />
              <Tag tone="muted" className="shrink-0">{section.estimated_hours}h</Tag>
              <button
                onClick={() => deleteSection(section.id)}
                aria-label="Delete section"
                className="text-muted hover:text-terra transition-colors shrink-0"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>

            {/* Per-language editors */}
            <div className="p-4 space-y-2.5">
              {(['en', 'hi', 'bn'] as Lang[]).map((lang) => {
                const content = section.content[lang];
                const isEditing = editingSection === section.id && editLang === lang;
                const wordCount = content?.body ? content.body.split(/\s+/).filter(Boolean).length : 0;
                const langLabel = LANG_LABEL[lang];

                return (
                  <div key={lang} className="border border-line rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-paper">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag tone={content?.body ? 'forest' : 'terra'} filled>{langLabel}</Tag>
                        <span className="font-mono text-[10px] text-muted truncate">
                          {content?.body ? `${wordCount} words` : 'empty'}
                        </span>
                      </div>
                      <button
                        onClick={() => isEditing ? setEditingSection(null) : startEdit(section.id, lang)}
                        className="text-xs font-semibold text-forest hover:underline shrink-0"
                      >
                        {isEditing ? 'Cancel' : content?.body ? 'Edit' : 'Add'}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="p-3 bg-surface">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full h-48 text-[13px] border border-line rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest font-mono resize-y bg-cream text-ink"
                          placeholder={`Write ${langLabel} content…`}
                          autoFocus
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-mono text-[10.5px] text-muted">
                            {editBody.split(/\s+/).filter(Boolean).length} words
                          </span>
                          <Button variant="primary" size="sm" onClick={saveContent} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2.5 text-[12.5px] text-ink-soft leading-relaxed max-h-24 overflow-hidden bg-surface">
                        {content?.body ? (
                          content.body.length > 300
                            ? content.body.slice(0, 300) + '…'
                            : content.body
                        ) : (
                          <span className="italic text-muted">No content yet</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Add section */}
      <button
        onClick={addSection}
        className="mt-4 w-full border-2 border-dashed border-line rounded-xl py-4 text-sm text-muted hover:text-forest hover:border-forest hover:bg-sage/40 transition-colors flex items-center justify-center gap-2"
      >
        <Icon name="plus" size={16} />
        Add section
      </button>
    </div>
  );
}
