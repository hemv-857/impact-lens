"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Mark } from "@/components/impactlens/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [invite, setInvite] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, orgName, inviteCode: invite }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Sign up failed");
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error);

      router.push("/");
      router.refresh();
    } catch (err) {
      toast({
        title: mode === "signup" ? "Sign up failed" : "Sign in failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-stone-50 text-stone-900 lg:grid-cols-2">
      {/* The work itself, not a pattern: one verified field photo */}
      <aside className="relative isolate hidden overflow-hidden bg-[#14110e] text-white lg:block">
        { }
        <img src="/field-media/mangrove_restore.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#14110e] via-[#14110e]/30 to-[#14110e]/60" />
        <div className="flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-base font-semibold tracking-tight">ImpactLens</span>
          </Link>
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Every field photo is <span className="text-[#f39d66]">evidence of impact.</span>
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 lg:hidden">
          <Mark />
          <span className="text-base font-semibold tracking-tight">ImpactLens</span>
        </Link>
      <div className="m-auto w-full max-w-sm py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create a workspace"}
        </h1>

        <div>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm text-stone-600">
                  Your name
                </Label>
                <Input
                  className="h-11 rounded-lg"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Okafor"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-stone-600">
                Email
              </Label>
              <Input
                  className="h-11 rounded-lg"
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.org"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-stone-600">
                Password
              </Label>
              <Input
                  className="h-11 rounded-lg"
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="org" className="text-sm text-stone-600">
                  Organization
                  <span className="ml-1.5 font-normal text-stone-400">
                    new name creates one, existing name joins with an invite code
                  </span>
                </Label>
                <Input
                  className="h-11 rounded-lg"
                  id="org"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="GreenShoots Foundation"
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="invite" className="text-sm text-stone-600">
                  Invite code
                  <span className="ml-1.5 font-normal text-stone-400">
                    only needed to join an existing workspace
                  </span>
                </Label>
                <Input
                  className="h-11 rounded-lg"
                  id="invite"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="e.g. k3n7q2xm"
                  autoComplete="off"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-sm text-stone-500">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-emerald-700 hover:underline hover:underline-offset-4"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
      </main>
    </div>
  );
}
