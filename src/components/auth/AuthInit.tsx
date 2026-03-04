
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

export function AuthInit() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Redirect to login if not authenticated and not on the login page
      if (!user && pathname !== "/login") {
        router.push("/login");
      } 
      // Redirect to home if authenticated and on the login page
      else if (user && pathname === "/login") {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  return null;
}
