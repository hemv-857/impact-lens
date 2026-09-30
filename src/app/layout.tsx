import type { Metadata } from "next";
import { Public_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/app/providers";

// Public Sans: a civic workhorse face, built for forms and registers.
const publicSans = Public_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImpactLens",
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

const CONTRACT = `<!--
THESIS: every field photo is an accessioned piece of evidence: numbered, provenanced, verified, citable. Refuses the KPI-card dashboard.
OWN-WORLD: accession register. Cool archival neutrals, ink #16201c, archive-box blue-grey, one commit colour (field green #1f6b4a). Ruled ledger rows, mono accession numbers, tabular figures, state as marks (stamp tick / ring / dashed ring).
STORY: open, see what awaits review, verify or analyze, move to projects or draft a report from verified evidence.
FIRST VIEWPORT: Home: five-figure tally strip; left 8/12 review queue as ledger rows (thumb, title, A-number, confidence, mark, action); right 4/12 active projects and latest reports. Add media is the one green button in the header.
FORM: Accession Register, candidate 7 of 7, seed a4e4674a.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.variable} ${geistMono.variable} antialiased bg-stone-50 text-stone-900`}
      >
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
