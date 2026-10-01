import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, IBM_Plex_Sans_Thai } from 'next/font/google';
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const bai = Bai_Jamjuree({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-bai',
  display: 'swap',
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "TCAS Tracker",
  description: "ติดตามการยื่นสมัคร Portfolio ไม่ให้พลาดกำหนดการ",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f4f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1120' },
  ],
};

// ตั้งธีมก่อนหน้าเว็บวาด เพื่อไม่ให้จอกระพริบขาวตอนเปิดในโหมดมืด
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${bai.variable} ${plexThai.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{ bottom: 88 }}
          toastOptions={{
            style: {
              fontSize: 14,
              fontFamily: 'var(--font-plex-thai)',
              borderRadius: 12,
              background: 'var(--text)',
              color: 'var(--bg)',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary: 'var(--highlight)', secondary: 'var(--text)' } },
          }}
        />
      </body>
    </html>
  );
}
