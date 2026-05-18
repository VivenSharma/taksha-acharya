'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, getSessionEmail } from '@/lib/admin-auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Icon, type IconName } from '@/components/ui/Icon';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { href: '/admin',            label: 'Dashboard', icon: 'chart' },
  { href: '/admin/modules',    label: 'Modules',   icon: 'book' },
  { href: '/admin/learners',   label: 'Learners',  icon: 'user' },
  { href: '/admin/progress',   label: 'Progress',  icon: 'target' },
  { href: '/admin/quizzes',    label: 'Quizzes',   icon: 'quiz' },
  { href: '/admin/chat-logs',  label: 'Chat logs', icon: 'chat' },
  { href: '/admin/apply-logs', label: 'Apply logs', icon: 'hand' },
  { href: '/admin/events',     label: 'Events',    icon: 'wave' },
  { href: '/admin/usage',      label: 'AI Usage',  icon: 'sparkle' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    getSessionEmail().then((e) => {
      if (cancelled) return;
      setEmail(e);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setSubmitting(true);
    try {
      const r = await signIn(loginEmail, loginPassword);
      setEmail(r.email);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await signOut();
    setEmail(null);
  }

  // ============= LOADING =============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-paper">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ============= LOGIN =============
  if (!email) {
    return (
      <div className="min-h-screen bg-forest-deep flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-paper rounded-[18px] p-7 border border-line shadow-2xl"
        >
          <div className="flex flex-col items-center mb-6">
            <Avatar size={56} useImage />
            <Tag tone="gold" className="mt-4">Taksha Workshop · Admin</Tag>
            <h1 className="font-serif italic text-3xl text-ink mt-2 leading-tight">Sign in</h1>
            <p className="text-xs text-muted mt-1 text-center">
              Content manager for Taksha Acharya.
            </p>
          </div>

          {loginError && (
            <div className="bg-terra/10 border border-terra/30 text-terra text-xs rounded-lg px-3 py-2 mb-4">
              {loginError}
            </div>
          )}

          <label className="block mb-3">
            <Tag tone="muted" className="block mb-1.5">Email</Tag>
            <input
              type="email"
              placeholder="acharyataksha@acharya.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full bg-cream border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest placeholder:text-muted"
              required
              autoFocus
            />
          </label>
          <label className="block mb-5">
            <Tag tone="muted" className="block mb-1.5">Password</Tag>
            <input
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-cream border border-line rounded-xl px-3 py-2.5 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest placeholder:text-muted"
              required
            />
          </label>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            iconRight="arrowR"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Signing in…' : 'Enter dashboard'}
          </Button>

          <p className="mt-6 text-center font-mono text-[9px] tracking-[0.22em] uppercase text-muted">
            v1 · April 2026
          </p>
        </form>
      </div>
    );
  }

  // ============= AUTHENTICATED SHELL =============
  return (
    <div className="flex h-screen bg-paper">
      {/* Sidebar */}
      <aside className="w-60 bg-forest-deep text-cream flex flex-col shrink-0 border-r border-forest-deep">
        <div className="px-5 py-5 border-b border-cream/10">
          <div className="flex items-center gap-2.5">
            <Avatar size={34} useImage />
            <div className="min-w-0">
              <div className="font-serif italic text-lg leading-tight">Taksha</div>
              <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-gold">
                Admin Console
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-cream/60 mt-3 truncate" title={email}>
            {email}
          </p>
        </div>

        <nav className="flex-1 py-3 px-2">
          <Tag tone="muted" className="!text-cream/40 px-3 mb-2 block">Navigate</Tag>
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-cream text-forest font-semibold'
                        : 'text-cream/80 hover:bg-cream/10 hover:text-cream'
                    }`}
                  >
                    <Icon name={icon} size={16} strokeWidth={active ? 2 : 1.75} />
                    <span className="flex-1">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-3 border-t border-cream/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors"
          >
            <Icon name="arrowL" size={14} />
            View Learner App
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-cream/70 hover:text-terra hover:bg-cream/10 transition-colors"
          >
            <Icon name="close" size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-paper">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
