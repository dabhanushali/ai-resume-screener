import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navbar';
import { UploadProvider } from '@/components/upload-context';
import UploadWidget from '@/components/upload-widget';

export const metadata: Metadata = {
  title: 'Enacton Recruit - Resume Screening',
  description: 'Resume screening and hiring requirement management for HR teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col antialiased">
        <UploadProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
            {children}
          </main>
          <UploadWidget />
        </UploadProvider>
      </body>
    </html>
  );
}
