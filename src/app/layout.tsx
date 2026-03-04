
import type { Metadata } from 'next';
import './globals.css';
import { CountryProvider } from '@/context/CountryContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthInit } from '@/components/auth/AuthInit';

/**
 * Metadata for GlobalPay - International Payroll System.
 * Includes Open Graph tags for high-quality social media previews on platforms like Viber and Facebook.
 */
export const metadata: Metadata = {
  title: 'GlobalPay - International Payroll System',
  description: 'Streamline your international workforce management. Specialized payroll processing for Japan and Myanmar with full compliance.',
  keywords: ['payroll', 'international payroll', 'Japan payroll', 'Myanmar payroll', 'HR management'],
  authors: [{ name: 'GlobalPay Enterprise' }],
  metadataBase: new URL('https://globalpay-app.vercel.app'), // Replace with your actual production URL
  openGraph: {
    title: 'GlobalPay: Expert International Payroll Solutions',
    description: 'Manage your global team with ease. Automated payslip generation and compliance for Japan (JPY) and Myanmar (MMK).',
    url: 'https://globalpay-app.vercel.app',
    siteName: 'GlobalPay',
    images: [
      {
        url: 'https://picsum.photos/seed/payroll/1200/630', // High-quality JPG/PNG representation
        width: 1200,
        height: 630,
        alt: 'GlobalPay International Payroll Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlobalPay - International Payroll System',
    description: 'Efficient payroll management for cross-border teams.',
    images: ['https://picsum.photos/seed/payroll/1200/630'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: 'https://picsum.photos/seed/shield/32/32', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: 'https://picsum.photos/seed/shield/180/180', sizes: '180x180', type: 'image/png' }
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
