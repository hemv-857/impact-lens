import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer } from "@/components/impactlens/Footer";
import { Mark } from "@/components/impactlens/Header";
import { EvidenceMark } from "@/components/impactlens/EvidenceMark";

// Same world as the app: warm near-black, a field photo carrying the first
// viewport, one ember accent, and a real record as the proof of what it makes.

const STEPS = [
  ["Ingest", "Photos, video and links from the field, filed by project."],
  ["Analyze", "AI writes the caption, tags and a confidence figure."],
  ["Verify", "A person confirms what is true. Nothing else is citable."],
  ["Report", "Donor reports and campaigns cite verified assets only."],
] as const;

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <main className="flex-1">
        {/* Claim, action, and one real record */}
        <section className="relative isolate overflow-hidden bg-[#14110e] text-white">
          <img
            src="/field-media/wind_farm.jpg"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#14110e] via-[#14110e]/80 to-[#14110e]/20" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#14110e] via-transparent to-[#14110e]/40" />

          <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
            <span className="flex items-center gap-2.5">
              <Mark />
              <span className="text-base font-semibold tracking-tight">ImpactLens</span>
            </span>
            <Link href="/auth" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              Sign in
            </Link>
          </header>

          <div className="mx-auto grid max-w-7xl items-end gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-12 lg:px-10 lg:pb-24 lg:pt-28">
            <div className="lg:col-span-7">
              <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Every field photo is <span className="text-[#f39d66]">evidence of impact.</span>
              </h1>
              <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-white/75">
                ImpactLens numbers, analyzes and verifies your field media, then drafts donor reports that cite it.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#ef8a4a] px-6 text-sm font-semibold text-[#1c0f06] transition-colors hover:bg-[#f79b5f]"
                >
                  Get started <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/auth"
                  className="inline-flex h-12 items-center rounded-lg border border-white/25 bg-white/5 px-6 text-sm font-semibold transition-colors hover:bg-white/15"
                >
                  Sign in
                </Link>
              </div>
            </div>

            {/* The thing the product makes: a verified, numbered record */}
            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1714]/90 lg:col-span-5">
              <img
                src="/field-media/reforest_after.jpg"
                alt="Hillside reforestation, saplings established on a burn scar"
                width={1800}
                height={1200}
                className="aspect-[16/10] w-full object-cover"
              />
              <figcaption className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] text-white/55">A·6L7M0D</span>
                    <p className="mt-1 text-lg font-semibold tracking-tight">Hillside reforestation, after</p>
                    <p className="text-sm text-white/60">Hillside Reforestation Initiative · Kenya</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-2xl font-semibold tabular-nums tracking-tight">
                    92%
                    <EvidenceMark state="verified" className="size-5 text-[#ef8a4a]" />
                  </span>
                </div>
                <p className="mt-4 flex flex-wrap gap-1.5">
                  {["reforestation", "saplings", "hillside", "restoration"].map((t) => (
                    <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/75">
                      {t}
                    </span>
                  ))}
                </p>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* From field to donor */}
        <section aria-labelledby="how-h" className="border-b border-stone-200">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
            <h2 id="how-h" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              From the field to the donor, in four steps.
            </h2>
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([title, body]) => (
                <li key={title} className="border-t-2 border-stone-200 pt-5 first:border-emerald-600">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-stone-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Proof: verified records, each with its identity and figure */}
        <section aria-labelledby="proof-h">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="proof-h" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Progress you can cite.
              </h2>
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline hover:underline-offset-4"
              >
                Open your register <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Frame src="/field-media/garden_after.jpg" alt="Raised community garden beds on a reclaimed city lot" title="Urban garden, after" id="A·FNDSFF" pct="93%" />
              <Frame src="/field-media/solar_install.jpg" alt="Crew installing a community solar array" title="Community solar install" id="A·A4L467" pct="96%" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Frame({ src, alt, title, id, pct }: { src: string; alt: string; title: string; id: string; pct: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <img src={src} alt={alt} loading="lazy" className="aspect-[3/2] w-full object-cover" />
      <figcaption className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{title}</span>
          <span className="font-mono text-[11px] text-stone-500">{id}</span>
        </span>
        <span className="flex items-center gap-2 text-lg font-semibold tabular-nums">
          {pct}
          <EvidenceMark state="verified" className="size-5" />
        </span>
      </figcaption>
    </figure>
  );
}
