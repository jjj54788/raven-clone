'use client';

import { useEffect } from 'react';
import { getUser, subscribeUserChanged } from '@/lib/api';
import {
  getProfileUserKey,
  loadProfileStore,
  subscribeProfileChanged,
} from '@/lib/profile';

const THEME_CLASS = 'dark';

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle(THEME_CLASS, isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => {
      const user = getUser();
      const store = loadProfileStore(getProfileUserKey(user));
      applyTheme(!!store.settings.darkMode);
    };

    sync();
    const unsubscribeProfile = subscribeProfileChanged(sync);
    const unsubscribeUser = subscribeUserChanged(sync);
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key.startsWith('raven_profile_v1') || event.key === 'raven_user') {
        sync();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsubscribeProfile();
      unsubscribeUser();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <>{children}</>;
}
