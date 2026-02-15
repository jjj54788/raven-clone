'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, getToken, getUser, setUser, subscribeUserChanged } from '@/lib/api';
import { buildProfileStoreFromApi, getProfileUserKey, saveProfileStore } from '@/lib/profile';

type ApiErrorShape = { statusCode?: number; message?: string | string[] };

function readApiErrorMessage(data: unknown): string | null {
  const d = data as ApiErrorShape | null;
  if (!d?.statusCode) return null;
  const msg = d.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return 'Request failed';
}

export function useAuth() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const syncUser = () => {
      const user = getUser();
      if (user) setUserName(user.name);
    };
    syncUser();
    setAuthReady(true);

    let cancelled = false;
    const syncRemote = async () => {
      try {
        const res = await getMe();
        const err = readApiErrorMessage(res);
        if (cancelled || err) return;
        if ((res as any)?.id) {
          setUser(res as any);
          setUserName((res as any)?.name || 'User');
          const key = getProfileUserKey(res as any);
          const store = buildProfileStoreFromApi(res as any);
          saveProfileStore(key, store);
        }
      } catch {
        // ignore network errors
      }
    };

    syncRemote();

    const unsubscribe = subscribeUserChanged(syncUser);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'raven_user') syncUser();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, [router]);

  return { userName, authReady };
}
