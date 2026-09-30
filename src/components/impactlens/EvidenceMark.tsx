import { cn } from "@/lib/utils";

export type EvidenceState = "verified" | "analyzed" | "pending";

export function evidenceState(a: { verified?: boolean | null; analyzedAt?: string | null }): EvidenceState {
  return a.verified ? "verified" : a.analyzedAt ? "analyzed" : "pending";
}

const LABEL: Record<EvidenceState, string> = {
  verified: "Verified",
  analyzed: "Analyzed, not verified",
  pending: "Awaiting analysis",
};

/** Evidence state drawn as a mark, never colour alone:
 *  verified = filled stamp with tick, analyzed = open ring, pending = dashed ring. */
export function EvidenceMark({ state, className }: { state: EvidenceState; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={LABEL[state]}
      className={cn(
        "size-4 shrink-0",
        state === "verified" ? "text-emerald-600" : "text-stone-500",
        className
      )}
    >
      <title>{LABEL[state]}</title>
      {state === "verified" ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.8 8.2l2.1 2.1 4.3-4.6" fill="none" className="stroke-white dark:stroke-[#1c0f06]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle
          cx="8"
          cy="8"
          r="6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray={state === "pending" ? "2.2 2.2" : undefined}
        />
      )}
    </svg>
  );
}
