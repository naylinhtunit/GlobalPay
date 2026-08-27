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

    const isNative = typeof window !== "undefined" && ((window as any).Capacitor?.isNativePlatform?.() || (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__ || (navigator as any).userAgent?.includes("Electron"));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Landing "/" is public on web — do not force login
      const isPublicLanding = pathname === "/";
      if (!user && pathname !== "/login" && !isPublicLanding) {
        // In native apps, landing is hidden — redirect "/" to /login
        if (isNative && pathname === "/") {
          router.push("/login");
        } else if (!isPublicLanding) {
          router.push("/login");
        }
      } else if (user && pathname === "/login") {
        router.push("/dashboard");
      } else if (user && isPublicLanding && !isNative) {
        // Keep authenticated web users on landing until they click Login — do not auto-redirect
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  return null;
}
