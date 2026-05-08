'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';

interface Conversation {
  key: string;
  learnerId: string | null;
  moduleId: string | null;
  lang: string | null;
  messageCount: number;
  firstAt: string;
  lastAt: string;
  latestUserMessage: string | null;
  latestAiResponse: string | null;
}

interface Message {
  id: string;
  learner_id: string | null;
  module_id: string | null;
  lang: string | null;
  user_message: string | null;
  ai_response: string | null;
  response_time_ms: number | null;
  created_at: string;
}

function langLabel(l: string | null): string {
  if (l === 'bn') return 'বাং';
  if (l === 'hi') return 'हि';
  if (l === 'en') return 'EN';
  return '—';
}

function ChatLogsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const learnerIdFilter = params.get('learnerId') || '';
  const moduleIdFilter = params.get('moduleId') || '';

  const [rows, setRows] = useState<Conversation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Detail drawer
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.admin.chatConversations({
      page,
      learnerId: learnerIdFilter || undefined,
      moduleId: moduleIdFilter || undefined,
    })
      .then((r) => {
        setRows(r.rows);
        setTotalCount(r.totalCount);
        setPageSize(r.pageSize);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, learnerIdFilter, moduleIdFilter]);

  async function openConversation(c: Conversation) {
    setActive(c);
    setMessages(null);
    if (!c.learnerId) return;
    setDetailLoading(true);
    try {
      const r = await api.admin.chatConversation({
        learnerId: c.learnerId,
        moduleId: c.moduleId ?? undefined,
        lang: c.lang ?? undefined,
      });
      setMessages(r.messages);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function updateFilter(key: 'learnerId' | 'moduleId', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(0);
    router.replace(`/admin/chat-logs?${next.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Tag tone="muted">Observability</Tag>
        <h1 className="font-serif italic text-4xl text-forest mt-2">Chat logs</h1>
        <p className="text-sm text-muted mt-1">
          {totalCount === 0 ? 'No conversations yet.' : `${totalCount} conversations · grouped by learner + module`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="Filter by learner UUID…"
          defaultValue={learnerIdFilter}
          onBlur={(e) => updateFilter('learnerId', e.target.value.trim())}
          className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        <input
          type="text"
          placeholder="Filter by module, e.g. M01-intro"
          defaultValue={moduleIdFilter}
          onBlur={(e) => updateFilter('moduleId', e.target.value.trim())}
          className="flex-1 min-w-[220px] border border-line rounded-full px-4 py-1.5 text-xs font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        {(learnerIdFilter || moduleIdFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace('/admin/chat-logs')}
          >
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
          icon="chat"
          title="No conversations match"
          description="Try clearing the filters or wait for learner activity."
        />
      ) : (
        <Card tone="surface" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-line">
                <tr>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Learner</th>
                  <th className="text-left  px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Module</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Lang</th>
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Messages</th>
                  <th className="text-left  px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Latest</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Last active</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.key}
                    onClick={() => openConversation(c)}
                    className="border-t border-line hover:bg-cream/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted">
                      {c.learnerId ? c.learnerId.slice(0, 10) + '…' : 'anon'}
                    </td>
                    <td className="px-2 py-2.5">
                      <Tag tone="muted">{c.moduleId || '—'}</Tag>
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <Tag tone="cream" filled>{langLabel(c.lang)}</Tag>
                    </td>
                    <td className="text-center px-2 py-2.5 font-mono text-[13px] text-forest font-semibold">
                      {c.messageCount}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-[13px] text-ink truncate">
                        {c.latestUserMessage || '(empty)'}
                      </p>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-[11px] text-muted whitespace-nowrap">
                      {new Date(c.lastAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconRight="arrowR"
                        onClick={(e) => { e.stopPropagation(); openConversation(c); }}
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

      {/* Detail drawer — full conversation thread */}
      <Drawer
        open={!!active}
        onClose={() => { setActive(null); setMessages(null); }}
        subtitle={active ? `${active.moduleId} · ${langLabel(active.lang)} · ${active.messageCount} messages` : undefined}
        title="Conversation"
      >
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 space-y-1">
              <p className="font-mono text-[11px] text-muted break-all">
                {active?.learnerId}
              </p>
              {active && (
                <p className="text-[11px] text-muted">
                  First: {new Date(active.firstAt).toLocaleString()} ·
                  Last: {new Date(active.lastAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {(messages || []).map((m) => (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex justify-end">
                    <div className="bg-forest text-cream rounded-2xl rounded-br-sm px-3.5 py-2 text-[13.5px] max-w-[85%]">
                      {m.user_message}
                    </div>
                  </div>
                  <div className="flex justify-start items-end">
                    <Avatar size={24} useImage className="mr-2" />
                    <div className="bg-surface text-ink border border-line rounded-2xl rounded-bl-sm px-3.5 py-2 text-[13.5px] max-w-[85%] font-serif leading-relaxed">
                      {m.ai_response}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted text-right font-mono">
                    {new Date(m.created_at).toLocaleString()}
                    {m.response_time_ms ? ` · ${m.response_time_ms}ms` : ''}
                  </p>
                </div>
              ))}
              {messages && messages.length === 0 && (
                <p className="text-sm text-muted italic">No messages in this conversation.</p>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminChatLogsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatLogsInner />
    </Suspense>
  );
}
