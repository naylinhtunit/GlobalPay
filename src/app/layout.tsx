
import type { Metadata } from 'next';
import './globals.css';
import { CountryProvider } from '@/context/CountryContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthInit } from '@/components/auth/AuthInit';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { AppUpdater } from '@/components/updater/AppUpdater';
import { ThemeProvider } from '@/components/ThemeProvider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'GlobalPay - International Payroll System',
  description: 'Streamline your international workforce management. Specialized payroll processing for Japan and Myanmar with full compliance and high security.',
  keywords: ['payroll', 'international payroll', 'Japan payroll', 'Myanmar payroll', 'HR management', 'compliance'],
  authors: [{ name: 'GlobalPay Enterprise' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GlobalPay',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'GlobalPay: Expert International Payroll Solutions',
    description: 'Manage your global team with ease. Automated payslip generation and compliance for Japan (JPY) and Myanmar (MMK). Secure and reliable.',
    url: 'https://globalpay-app.vercel.app',
    siteName: 'GlobalPay Enterprise',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'GlobalPay International Payroll Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlobalPay - International Payroll System',
    description: 'Secure and efficient payroll management for Japan and Myanmar.',
    images: ['/icon.png'],
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcut: '/icon.png',
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Immediate redirect for native apps to avoid landing flash - runs before React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'&&((window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||window.__TAURI__||window.__TAURI_INTERNALS__||(navigator&&navigator.userAgent&&navigator.userAgent.includes('Capacitor')))&&(location.pathname==='/'||location.pathname==='/index.html')){location.replace('/login');}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2D2D86" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <CountryProvider>
              <AuthInit />
              {children}
              <PWAInstallPrompt />
              <AppUpdater />
              <Toaster />
            </CountryProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
        <Script id="native-redirect" strategy="beforeInteractive">
          {`if(typeof window!=='undefined'&&((window.Capacitor?.isNativePlatform?.()||window.__TAURI__||window.__TAURI_INTERNALS__||navigator.userAgent.includes('Electron'))&&(location.pathname==='/'||location.pathname==='/index.html'))location.replace('/login');`}
        </Script>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
