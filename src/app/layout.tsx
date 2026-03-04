
import type { Metadata } from 'next';
import './globals.css';
import { CountryProvider } from '@/context/CountryContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthInit } from '@/components/auth/AuthInit';

/**
 * Metadata for GlobalPay - International Payroll System.
 * Enhanced with high-quality Open Graph (OG) tags for Viber, Facebook, and other social media platforms.
 * Uses a branding image that represents the 'Shield' logo identity.
 */
export const metadata: Metadata = {
  title: 'GlobalPay - International Payroll System',
  description: 'Streamline your international workforce management. Specialized payroll processing for Japan and Myanmar with full compliance and high security.',
  keywords: ['payroll', 'international payroll', 'Japan payroll', 'Myanmar payroll', 'HR management', 'compliance'],
  authors: [{ name: 'GlobalPay Enterprise' }],
  metadataBase: new URL('https://globalpay-app.vercel.app'),
  openGraph: {
    title: 'GlobalPay: Expert International Payroll Solutions',
    description: 'Manage your global team with ease. Automated payslip generation and compliance for Japan (JPY) and Myanmar (MMK). Secure and reliable.',
    url: 'https://globalpay-app.vercel.app',
    siteName: 'GlobalPay Enterprise',
    images: [
      {
        url: 'https://picsum.photos/seed/shield-branding/1200/630',
        width: 1200,
        height: 630,
        alt: 'GlobalPay International Payroll Security Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlobalPay - International Payroll System',
    description: 'Secure and efficient payroll management for Japan and Myanmar.',
    images: ['https://picsum.photos/seed/shield-branding/1200/630'],
  },
  icons: {
    icon: [
      { url: 'https://picsum.photos/seed/shield-logo/32/32', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' }
    ],
    shortcut: 'https://picsum.photos/seed/shield-logo/32/32',
    apple: [
      { url: 'https://picsum.photos/seed/shield-logo/180/180', sizes: '180x180', type: 'image/png' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Additional support for legacy social crawlers */}
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <FirebaseClientProvider>
          <CountryProvider>
            <AuthInit />
            {children}
            <Toaster />
          </CountryProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
