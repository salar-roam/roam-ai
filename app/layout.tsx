// app/layout.tsx
// app/layout.tsx
import '../styles/globals.css'; // Add `../` to go up one directory then into `styles`
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

// ... rest of your layout.tsx code

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Roam AI',
  description: 'Your intelligent event assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}