// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Imports global styles (including Tailwind)

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Event Finder AI",
  description: "Create and Search events with an AI Chatbot in RD and beyond!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full"> {/* Ensures full height */}
      <body className={`${inter.className} h-full bg-white text-black`}> {/* Ensures full height */}
        {/* 'main' is now implicit in page.tsx, but ensure children fill the height */}
        {children}
      </body>
    </html>
  );
}