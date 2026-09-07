import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans_Thai, IBM_Plex_Mono } from 'next/font/google';
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-thai',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "TCAS Tracker",
  description: "ติดตามการยื่นสมัคร Portfolio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={`${fraunces.variable} ${ibmPlexSansThai.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { fontSize: 14, fontFamily: 'var(--font-ibm-plex-sans-thai)', borderRadius: 10, background: '#1c1c1c', color: '#fff' } }} />
      </body>
    </html>
  );
}
