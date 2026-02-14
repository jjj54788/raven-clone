'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';

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
    const user = getUser();
    if (user) setUserName(user.name);
    setAuthReady(true);
  }, [router]);

  return { userName, authReady };
}
