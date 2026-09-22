"use client";

import * as React from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Send, ThumbsUp, Repeat2, Share2, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPreviewProps {
  platform: "instagram" | "twitter" | "linkedin" | "newsletter";
  caption: string;
  headline?: string;
  callToAction?: string;
  imageUrl?: string;
  accountName?: string;
  hashtags?: string[];
}

/**
 * PlatformPreview — renders a realistic mockup of how the campaign post
 * would look on the selected platform (Instagram / Twitter / LinkedIn / Newsletter).
 * Helps campaigners visualize the final output before publishing.
 */
export function PlatformPreview({
  platform,
  caption,
  headline,
  callToAction,
  imageUrl,
  accountName = "impactlens",
  hashtags = [],
}: PlatformPreviewProps) {
  const displayName = accountName.replace(/^@?/, "@");
  const displayCaption = hashtags.length > 0 ? `${caption}\n\n${hashtags.join(" ")}` : caption;

  if (platform === "instagram") {
    return <InstagramPreview caption={displayCaption} imageUrl={imageUrl} account={displayName} />;
  }
  if (platform === "twitter") {
    return <TwitterPreview caption={displayCaption} imageUrl={imageUrl} account={displayName} />;
  }
  if (platform === "linkedin") {
    return <LinkedInPreview caption={caption} headline={headline} callToAction={callToAction} imageUrl={imageUrl} account={displayName} />;
  }
  return <NewsletterPreview caption={caption} headline={headline} callToAction={callToAction} imageUrl={imageUrl} />;
}

function InstagramPreview({ caption, imageUrl, account }: { caption: string; imageUrl?: string; account: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="size-8 shrink-0 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5">
          <div className="size-full rounded-full bg-white p-0.5">
            <div className="size-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-600" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-stone-900">{account}</p>
          <p className="text-[10px] text-stone-400">Original audio</p>
        </div>
        <MoreHorizontal className="size-4 text-stone-400" />
      </div>
      {/* Image */}
      {imageUrl && (
        <div className="aspect-square w-full overflow-hidden bg-stone-100">
          <img src={imageUrl} alt="Campaign" className="h-full w-full object-cover" />
        </div>
      )}
      {/* Actions */}
      <div className="flex items-center gap-4 px-3 pt-2">
        <Heart className="size-5 text-stone-700" />
        <MessageCircle className="size-5 text-stone-700" />
        <Send className="size-5 text-stone-700" />
        <Bookmark className="ml-auto size-5 text-stone-700" />
      </div>
      {/* Likes */}
      <div className="px-3 pt-1.5">
        <p className="text-xs font-semibold text-stone-900">2,847 likes</p>
      </div>
      {/* Caption */}
      <div className="px-3 pb-3 pt-1">
        <p className="whitespace-pre-wrap text-xs text-stone-800">
          <span className="font-semibold">{account}</span>{" "}
          {caption.split("\n").map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </p>
        <p className="mt-1 text-[10px] uppercase text-stone-400">2 hours ago</p>
      </div>
    </div>
  );
}

function TwitterPreview({ caption, imageUrl, account }: { caption: string; imageUrl?: string; account: string }) {
  const truncated = caption.length > 280 ? caption.slice(0, 277) + "…" : caption;
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex gap-2.5">
        <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-stone-700 to-stone-900" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-bold text-stone-900">ImpactLens</p>
            <svg className="size-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.872 2.578 13.534 2 12.09 2c-2.21 0-3.998 1.79-3.998 4 0 .35.04.69.116 1.01C5.79 7.31 4 9.83 4 12.79c0 3.49 2.79 6.32 6.24 6.32.16 0 .32-.01.47-.02.65 1.02 1.79 1.7 3.09 1.7 1.99 0 3.62-1.55 3.75-3.51 1.64-.73 2.79-2.37 2.79-4.28 0-.16-.01-.31-.02-.47.69-.34 1.18-.97 1.18-1.78z"/></svg>
            <span className="text-xs text-stone-500">@{account.replace("@","")}</span>
            <span className="text-xs text-stone-400">· 2h</span>
            <MoreHorizontal className="ml-auto size-4 text-stone-400" />
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{truncated}</p>
          {imageUrl && (
            <div className="mt-2 overflow-hidden rounded-xl border border-stone-200">
              <img src={imageUrl} alt="Campaign" className="aspect-video w-full object-cover" />
            </div>
          )}
          <div className="mt-2.5 flex items-center justify-between text-stone-400">
            <span className="flex items-center gap-1 text-xs"><MessageCircle className="size-3.5" /> 47</span>
            <span className="flex items-center gap-1 text-xs"><Repeat2 className="size-3.5" /> 128</span>
            <span className="flex items-center gap-1 text-xs"><Heart className="size-3.5" /> 892</span>
            <span className="flex items-center gap-1 text-xs"><Bookmark className="size-3.5" /></span>
            <Share2 className="size-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ caption, headline, callToAction, imageUrl, account }: { caption: string; headline?: string; callToAction?: string; imageUrl?: string; account: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="p-3">
        <div className="flex gap-2.5">
          <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 p-0.5">
            <div className="size-full rounded-full bg-white p-1.5">
              <svg viewBox="0 0 24 24" fill="#0A66C2" className="size-full"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3v9zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-900">ImpactLens</p>
            <p className="text-[11px] text-stone-500">{account.replace("@","")} · 2nd</p>
            <p className="flex items-center gap-1 text-[11px] text-stone-400">
              <Globe2 className="size-2.5" /> 2h ·
            </p>
          </div>
          <MoreHorizontal className="size-4 text-stone-400" />
        </div>
      </div>
      {headline && (
        <div className="px-3">
          <p className="text-sm font-bold leading-snug text-stone-900">{headline}</p>
        </div>
      )}
      <div className="px-3 py-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {caption.length > 300 ? caption.slice(0, 297) + "…" : caption}
        </p>
      </div>
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-stone-100">
          <img src={imageUrl} alt="Campaign" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <ThumbsUp className="size-2" />
          </span>
          <span className="text-[11px] text-stone-500">342</span>
        </div>
        <div className="flex gap-3 text-[11px] text-stone-500">
          <span>18 comments</span>
          <span>4 shares</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-stone-100 px-2 py-1.5">
        {[
          { icon: <ThumbsUp className="size-3.5" />, label: "Like" },
          { icon: <MessageCircle className="size-3.5" />, label: "Comment" },
          { icon: <Repeat2 className="size-3.5" />, label: "Repost" },
          { icon: <Send className="size-3.5" />, label: "Send" },
        ].map((a) => (
          <button key={a.label} className="flex items-center justify-center gap-1 rounded py-1.5 text-[11px] font-medium text-stone-500 transition hover:bg-stone-100">
            {a.icon}
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>
      {callToAction && (
        <div className="border-t border-stone-100 bg-stone-50 p-2.5 text-center">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
            {callToAction.slice(0, 80)}
          </span>
        </div>
      )}
    </div>
  );
}

function NewsletterPreview({ caption, headline, callToAction, imageUrl }: { caption: string; headline?: string; callToAction?: string; imageUrl?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Newsletter header bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-white">
        <p className="text-[10px] uppercase tracking-widest opacity-80">ImpactLens Weekly</p>
        <p className="text-sm font-bold">{headline ?? "Impact Update"}</p>
      </div>
      <div className="p-4">
        {imageUrl && (
          <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-stone-100">
            <img src={imageUrl} alt="Campaign" className="h-full w-full object-cover" />
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{caption}</p>
        {callToAction && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
              {callToAction}
            </span>
          </div>
        )}
        <div className="mt-4 border-t border-stone-100 pt-3 text-center">
          <p className="text-[10px] text-stone-400">You're receiving this because you support ImpactLens initiatives.</p>
          <p className="mt-0.5 text-[10px] text-stone-300">Unsubscribe · Update preferences</p>
        </div>
      </div>
    </div>
  );
}
