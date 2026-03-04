import type { Metadata } from 'next';
import './globals.css';
import { CountryProvider } from '@/context/CountryContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthInit } from '@/components/auth/AuthInit';

export const metadata: Metadata = {
  title: 'GlobalPay - International Payroll System',
  description: 'Streamline your international workforce management. Specialized payroll processing for Japan and Myanmar with full compliance and high security.',
  keywords: ['payroll', 'international payroll', 'Japan payroll', 'Myanmar payroll', 'HR management', 'compliance'],
  authors: [{ name: 'GlobalPay Enterprise' }],
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
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
