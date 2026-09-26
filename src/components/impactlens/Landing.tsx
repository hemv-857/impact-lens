import Link from "next/link";
import {
  Leaf,
  Images,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Footer } from "@/components/impactlens/Footer";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI evidence analysis",
    body: "Upload photos and video from the field. Captions, tags, objects, mood and confidence scores are generated automatically.",
  },
  {
    icon: Images,
    title: "Before / after comparison",
    body: "Pair captures across time and score visual impact so progress is evidence, not a claim.",
  },
  {
    icon: FileText,
    title: "Reports & campaigns",
    body: "Generate impact summaries, campaign copy and platform-ready content from your verified media library.",
  },
  {
    icon: Search,
    title: "Semantic search",
    body: "Ask in plain language and get ranked hits with scores and reasons across every asset you own.",
  },
];

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
              <Leaf className="size-4" />
            </span>
            <span className="text-lg font-semibold">ImpactLens</span>
          </div>
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Leaf className="size-3" /> AI-powered impact &amp; sustainability media
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Turn field media into{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              evidence of impact
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
            ImpactLens organizes your photos and video, analyzes them with AI,
            and turns them into before/after comparisons, reports and campaign
            content — stored on a global CDN with a full evidence chain.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/auth"
              className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-stone-200 bg-white p-5 text-left"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <f.icon className="size-5" />
                </span>
                <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
