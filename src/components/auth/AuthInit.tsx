'use client';

import { useEffect } from 'react';
import { useAuth, initiateAnonymousSignIn } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function AuthInit() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        initiateAnonymousSignIn(auth);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return null;
}