'use client';

import { useEffect, useMemo, useState } from 'react';
import { getUser, subscribeUserChanged } from '@/lib/api';
import {
  getProfileUserKey,
  loadProfileStore,
  resolveChatBubbleClasses,
  subscribeProfileChanged,
} from '@/lib/profile';

export function useChatAppearance() {
  const [settings, setSettings] = useState(() => {
    const user = getUser();
    return loadProfileStore(getProfileUserKey(user)).settings;
  });

  useEffect(() => {
    const sync = () => {
      const user = getUser();
      setSettings(loadProfileStore(getProfileUserKey(user)).settings);
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

  return useMemo(() => resolveChatBubbleClasses(settings), [settings]);
}
