import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP & PDV Dark Neon - Manu',
  description: 'Sistema mobile-first de PDV, Crediário, Custos e Estoque com Ficha Técnica',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark bg-black text-slate-100">
      <body className="min-h-screen bg-black text-slate-100 antialiased selection:bg-emerald-500 selection:text-black overscroll-none pb-20">
        {children}
      </body>
    </html>
  );
}
