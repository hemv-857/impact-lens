import Link from "next/link";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
        <Leaf className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold text-stone-900">404 — page not found</h1>
      <p className="max-w-sm text-sm text-stone-500">
        This route doesn’t exist, or you don’t have access to it. Your media
        library, projects and reports live behind the overview.
      </p>
      <Button asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
