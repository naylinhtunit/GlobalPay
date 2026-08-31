'use client';

import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

function normalizePathname(pathname: string) {
  const withoutIndex = pathname.replace(/\/index\.html$/, '');
  const withoutTrailingSlash = withoutIndex.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

export function AuthInit() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) return;

    const isNative = typeof window !== "undefined" && ((window as any).Capacitor?.isNativePlatform?.() || (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__ || (navigator as any).userAgent?.includes("Electron"));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentPath = normalizePathname(pathname);
      const isPublicLanding = currentPath === "/";

      if (!user && currentPath !== "/login" && (isNative || !isPublicLanding)) {
        router.replace("/login");
      } else if (user && (currentPath === "/login" || (isNative && isPublicLanding))) {
        router.replace("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  return null;
}
