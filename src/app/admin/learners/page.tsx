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
  isActive?: boolean;
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lang, setLang] = useState<'bn' | 'hi' | 'en'>('en');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    api.admin.learners(page)
      .then((r) => {
        setLearners(r.learners);
        setTotalCount(r.totalCount);
        setPageSize(r.pageSize);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.admin.addLearner({ name, phone, preferred_lang: lang });
      setName('');
      setPhone('');
      setMessage('User added. They can log in with their phone and OTP 123456.');
      load();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Could not add user'}`);
    }
  }

  async function toggleUser(id: string, isActive: boolean) {
    await api.admin.setLearnerActive(id, !isActive);
    load();
  }

  async function removeUser(id: string) {
    if (!confirm('Remove this user from the app? Their old logs stay for reporting.')) return;
    await api.admin.deleteLearner(id);
    load();
  }

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

      <Card tone="surface" padding="md" className="mb-5">
        <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px_auto] gap-2 items-end">
          <label>
            <Tag tone="muted" className="block mb-1.5">Name</Tag>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-cream border border-line rounded-lg px-3 py-2 text-sm" placeholder="Learner name" required />
          </label>
          <label>
            <Tag tone="muted" className="block mb-1.5">Phone</Tag>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-cream border border-line rounded-lg px-3 py-2 text-sm font-mono" placeholder="9876543210" required />
          </label>
          <label>
            <Tag tone="muted" className="block mb-1.5">Lang</Tag>
            <select value={lang} onChange={(e) => setLang(e.target.value as 'bn' | 'hi' | 'en')} className="w-full bg-cream border border-line rounded-lg px-3 py-2 text-sm">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="bn">Bengali</option>
            </select>
          </label>
          <Button type="submit" icon="plus">Add user</Button>
        </form>
        {message && <p className={`mt-3 text-xs ${message.startsWith('Error') ? 'text-terra' : 'text-forest'}`}>{message}</p>}
      </Card>

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
                  <th className="text-center px-2 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Status</th>
                  <th className="text-right px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">Last seen</th>
                  <th className="px-2 py-2.5" />
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
                    <td className="text-center px-2">
                      <Tag tone={l.isActive === false ? 'terra' : 'forest'} filled>
                        {l.isActive === false ? 'Off' : 'Active'}
                      </Tag>
                    </td>
                    <td className="text-right px-4 font-mono text-[11px] text-muted">
                      {l.last_seen ? new Date(l.last_seen).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => location.href = `/admin/progress?learnerId=${l.id}`}>Progress</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleUser(l.id, l.isActive !== false)}>{l.isActive === false ? 'Enable' : 'Disable'}</Button>
                        <Button variant="danger" size="sm" icon="trash" onClick={() => removeUser(l.id)} />
                      </div>
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
