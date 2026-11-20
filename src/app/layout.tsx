import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Gateway & Multi-Provider Chatbot',
  description: 'Enterprise AI Gateway with multi-provider automatic failover, API key rotation & usage analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-zinc-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}

