import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/site-header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Recipe Studio",
    template: "%s · Recipe Studio",
  },
  description: "Plan and generate recipes with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-background font-sans text-foreground antialiased`}
      >
        <ClerkProvider>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
