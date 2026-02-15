'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  adminAddAllowlistEmail,
  adminDeleteAllowlistEmail,
  adminGetAuthSettings,
  adminListAllowlistEmails,
  adminListUsers,
  adminSetInviteOnly,
  adminSetUserAdmin,
  getUser,
} from '@/lib/api';

type ApiErrorShape = { statusCode?: number; message?: string | string[] };

type AllowlistEmail = {
  id: string;
  email: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  provider: string;
  credits: number;
  isAdmin: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

function readApiErrorMessage(data: unknown): string | null {
  const d = data as ApiErrorShape | null;
  if (!d?.statusCode) return null;
  const msg = d.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return 'Request failed';
}

export default function AdminPage() {
  const { authReady } = useAuth();
  const { t } = useLanguage();
  const me = useMemo(() => getUser(), []);
  const meId = me?.id || null;

  const [inviteOnly, setInviteOnly] = useState<boolean | null>(null);
  const [inviteOnlySource, setInviteOnlySource] = useState<string | null>(null);
  const [allowlist, setAllowlist] = useState<AllowlistEmail[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowlistSorted = useMemo(() => {
    return [...allowlist].sort((a, b) => a.email.localeCompare(b.email));
  }, [allowlist]);

  const usersFiltered = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) => u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q))
      : users;

    return [...filtered].sort((a, b) => {
      const adminDelta = Number(b.isAdmin) - Number(a.isAdmin);
      if (adminDelta !== 0) return adminDelta;
      return a.email.localeCompare(b.email);
    });
  }, [users, userQuery]);

  const loadAll = async () => {
    setError('');
    setLoading(true);
    try {
      const settings = await adminGetAuthSettings();
      const settingsErr = readApiErrorMessage(settings);
      if (settingsErr) {
        setError(settingsErr);
        return;
      }
      setInviteOnly(typeof (settings as any)?.inviteOnly === 'boolean' ? (settings as any).inviteOnly : false);
      setInviteOnlySource((settings as any)?.inviteOnlySource || null);

      const list = await adminListAllowlistEmails();
      const listErr = readApiErrorMessage(list);
      if (listErr) {
        setError(listErr);
        return;
      }
      setAllowlist((list as any) || []);

      const usersRes = await adminListUsers();
      const usersErr = readApiErrorMessage(usersRes);
      if (usersErr) {
        setError(usersErr);
        return;
      }
      setUsers((usersRes as any) || []);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const handleToggleInviteOnly = async (next: boolean) => {
    setError('');
    setLoading(true);
    try {
      const res = await adminSetInviteOnly(next);
      const errMsg = readApiErrorMessage(res);
      if (errMsg) {
        setError(errMsg);
        return;
      }
      setInviteOnly(next);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const e = email.trim();
    if (!e) return;
    setError('');
    setLoading(true);
    try {
      const res = await adminAddAllowlistEmail(e, note.trim() || undefined);
      const errMsg = readApiErrorMessage(res);
      if (errMsg) {
        setError(errMsg);
        return;
      }
      setEmail('');
      setNote('');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await adminDeleteAllowlistEmail(id);
      const errMsg = readApiErrorMessage(res);
      if (errMsg) {
        setError(errMsg);
        return;
      }
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUserAdmin = async (user: AdminUser, nextIsAdmin: boolean) => {
    if (user.isAdmin && !nextIsAdmin) {
      const confirmed = window.confirm(t('admin.confirmDemote').replace('{email}', user.email));
      if (!confirmed) return;
    }

    setError('');
    setUpdatingUserId(user.id);
    try {
      const res = await adminSetUserAdmin(user.id, nextIsAdmin);
      const errMsg = readApiErrorMessage(res);
      if (errMsg) {
        setError(errMsg);
        return;
      }
      const updated = res as any;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">{t('admin.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t('admin.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">{t('admin.subtitle')}</p>
            </div>
            <button
              onClick={loadAll}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('admin.refresh')}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-gray-900">{t('admin.inviteOnly')}</div>
              <div className="text-xs text-gray-500">
                {t('admin.inviteOnlyHint').replace('{source}', inviteOnlySource || '-')}
              </div>
            </div>
            <button
              onClick={() => handleToggleInviteOnly(!inviteOnly)}
              disabled={loading || inviteOnly === null}
              className={[
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                inviteOnly ? 'bg-purple-600' : 'bg-gray-300',
                loading || inviteOnly === null ? 'opacity-50' : '',
              ].join(' ')}
              aria-label={t('admin.inviteOnly')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                  inviteOnly ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.allowlist')}</h2>
            <div className="text-sm text-gray-500">
              {t('admin.allowlistCount').replace('{count}', String(allowlist.length))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('admin.emailPlaceholder')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('admin.notePlaceholder')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !email.trim()}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-purple-300"
            >
              {t('admin.add')}
            </button>
          </div>

          <div className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {allowlistSorted.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">{t('admin.allowlistEmpty')}</div>
            ) : (
              allowlistSorted.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">{it.email}</div>
                    {it.note ? (
                      <div className="truncate text-xs text-gray-500">{it.note}</div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleDelete(it.id)}
                    disabled={loading}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t('admin.delete')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('admin.users')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('admin.usersSubtitle')}</p>
            </div>
            <div className="text-sm text-gray-500">
              {t('admin.userCount').replace('{count}', String(users.length))}
            </div>
          </div>

          <div className="mt-4">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={t('admin.userSearchPlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <div className="divide-y divide-gray-100">
              {usersFiltered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">{t('admin.usersEmpty')}</div>
              ) : (
                usersFiltered.map((u) => {
                  const roleValue = u.isAdmin ? 'admin' : 'user';
                  const disabled = loading || updatingUserId === u.id;
                  return (
                    <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {u.name || u.email}
                          </div>
                          {u.id === meId ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                              {t('admin.you')}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {u.email} · {t('admin.provider')}: {u.provider} · {t('admin.credits')}: {u.credits}
                        </div>
                      </div>

                      <select
                        value={roleValue}
                        disabled={disabled}
                        onChange={(e) => handleSetUserAdmin(u, e.target.value === 'admin')}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                        aria-label={t('admin.role')}
                      >
                        <option value="user">{t('admin.roleUser')}</option>
                        <option value="admin">{t('admin.roleAdmin')}</option>
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
