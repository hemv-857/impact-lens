import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImpactLens — AI-Powered Impact & Sustainability Media Platform",
  description:
    "Ingest field media, let AI extract intelligence, organize by project, compare before/after, generate impact reports & campaign content, and semantically search your library.",
  keywords: [
    "ImpactLens",
    "sustainability",
    "NGO",
    "AI media intelligence",
    "impact reporting",
    "OpenAI-compatible AI",
    "Next.js",
  ],
  authors: [{ name: "ImpactLens" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ImpactLens",
    description: "AI-Powered Impact & Sustainability Media Platform",
    siteName: "ImpactLens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ImpactLens",
    description: "AI-Powered Impact & Sustainability Media Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-50 text-stone-900`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
