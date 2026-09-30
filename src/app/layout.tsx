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
THESIS: a dark field register where the evidence leads: the org's own verified photos carry the first viewport, and the next item to review gets the most space. Refuses the icon-KPI-card dashboard.
OWN-WORLD: warm near-black ground (#14110e), tonal panels a step up (#1b1714) with hairline edges, bone text, one ember accent (#ef8a4a, near-black text on it) for commit actions, selection and the verified stamp. Public Sans, mono only for accession numbers. Light theme derived from the same tokens.
STORY: open, read one sentence of state, verify the featured asset, then move to projects or draft a report from verified evidence.
FIRST VIEWPORT: Home: left rail nav with review count; photo hero with the state sentence and four totals; below, an 8/12 review panel led by a large featured asset with Verify, and a 4/12 aside of projects (verified share) and latest reports. Add media is the one ember button in the top bar.
FORM: Field Register (dark), brief-pinned by the user's reference; supersedes seed a4e4674a.
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
        className={`${publicSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
