"use client";

import * as React from "react";

/**
 * AnimatedCounter — smoothly counts from 0 to `value` over `duration` ms.
 * Re-runs when `value` changes. Renders the formatted value via `format`.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect reduced motion
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    if (!ref.current) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = value;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOut(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = format ? format(display) : Math.round(display).toString();
  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
