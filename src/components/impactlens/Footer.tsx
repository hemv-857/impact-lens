import { Mark } from "@/components/impactlens/Header";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <Mark className="size-5" />
          ImpactLens
        </span>
        <span>Demo platform. Sample field media may be AI-generated; not affiliated with any real NGO.</span>
      </div>
    </footer>
  );
}
