"use client";

import * as React from "react";
import { Upload, Link2, Wand2, Loader2, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImpactStore } from "@/lib/store";
import {
  useAnalyzeMedia,
  useCreateMedia,
  useProjects,
} from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/api";
import type { MediaAsset } from "@/lib/types";

type Mode = "upload" | "url" | "generate";

export function UploadDialog() {
  const open = useImpactStore((s) => s.uploadOpen);
  const setOpen = useImpactStore((s) => s.setUploadOpen);
  const openAsset = useImpactStore((s) => s.openAsset);
  const setTab = useImpactStore((s) => s.setTab);
  const { toast } = useToast();

  const [mode, setMode] = React.useState<Mode>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState<string>("none");
  const [pairRole, setPairRole] = React.useState<"none" | "before" | "after">("none");
  const [captureDate, setCaptureDate] = React.useState("");

  const create = useCreateMedia();
  const analyze = useAnalyzeMedia();
  const projectsQ = useProjects();

  React.useEffect(() => {
    if (!open) {
      // Reset state when closed
      setFile(null);
      setFilePreview(null);
      setUrl("");
      setPrompt("");
      setTitle("");
      setProjectId("none");
      setPairRole("none");
      setCaptureDate("");
      setMode("upload");
    }
  }, [open]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const busy = create.isPending || analyze.isPending;

  const submit = async () => {
    let body: {
      url: string;
      title?: string;
      source?: string;
      projectId?: string;
      pairRole?: "before" | "after";
      captureDate?: string;
      prompt?: string;
    };

    if (mode === "upload") {
      if (!file || !filePreview) {
        toast({ title: "Choose a file first", variant: "destructive" });
        return;
      }
      body = {
        url: filePreview,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        source: "upload",
      };
    } else if (mode === "url") {
      if (!url.trim()) {
        toast({ title: "Paste an image or video URL", variant: "destructive" });
        return;
      }
      body = {
        url: url.trim(),
        title: title || undefined,
        source: "web-search",
      };
    } else {
      if (!prompt.trim()) {
        toast({ title: "Enter a generation prompt", variant: "destructive" });
        return;
      }
      // For generate mode we POST a prompt to /api/media/generate which calls
      // the backend image-generation pipeline and returns a MediaAsset.
      try {
        toast({
          title: "Generating sample image",
          description: "This uses AI image generation — 10–25 seconds.",
        });
        const asset = await fetcher<MediaAsset>("/api/media/generate", {
          method: "POST",
          body: JSON.stringify({
            prompt: prompt.trim(),
            title: title || undefined,
            projectId: projectId !== "none" ? projectId : undefined,
            pairRole: pairRole !== "none" ? pairRole : undefined,
            captureDate: captureDate || undefined,
            analyze: true,
          }),
        });
        toast({
          title: "Sample generated & analyzed",
          description: asset.aiCaption ?? "Ready in your library.",
        });
        setOpen(false);
        openAsset(asset.id);
        setTab("library");
        return;
      } catch (e) {
        toast({
          title: "Generation failed",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
        return;
      }
    }

    if (projectId !== "none") body.projectId = projectId;
    if (pairRole !== "none") body.pairRole = pairRole;
    if (captureDate) body.captureDate = captureDate;

    try {
      const asset = await create.mutateAsync(body);
      toast({
        title: "Media ingested",
        description: "Running AI analysis now…",
      });
      try {
        const updated = await analyze.mutateAsync(asset.id);
        toast({
          title: "Analysis complete",
          description: updated.aiCaption ?? "AI signals extracted.",
        });
      } catch (e) {
        toast({
          title: "Analysis failed",
          description: e instanceof Error ? e.message : "Try re-analyze later.",
          variant: "destructive",
        });
      }
      setOpen(false);
      openAsset(asset.id);
      setTab("library");
    } catch (e) {
      toast({
        title: "Ingest failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-emerald-600" />
            Analyze new media
          </DialogTitle>
          <DialogDescription>
            Upload field media, paste an image URL, or generate a sample via
            prompt. We&apos;ll extract AI intelligence automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Mode switcher */}
        <div className="grid grid-cols-3 gap-2">
          <ModeButton
            active={mode === "upload"}
            onClick={() => setMode("upload")}
            icon={<Upload className="size-4" />}
            label="Upload"
          />
          <ModeButton
            active={mode === "url"}
            onClick={() => setMode("url")}
            icon={<Link2 className="size-4" />}
            label="Paste URL"
          />
          <ModeButton
            active={mode === "generate"}
            onClick={() => setMode("generate")}
            icon={<Wand2 className="size-4" />}
            label="Generate"
          />
        </div>

        <div className="space-y-3">
          {mode === "upload" && (
            <div className="space-y-2">
              <Label>Image or video file</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska"
                  className="hidden"
                  onChange={onFileChange}
                />
                {filePreview ? (
                  file?.type.startsWith("video/") ? (
                    <video
                      src={filePreview}
                      controls
                      className="max-h-40 rounded-md"
                    />
                  ) : (
                    <img
                      src={filePreview}
                      alt="Selected file preview"
                      className="max-h-40 rounded-md object-contain"
                    />
                  )
                ) : (
                  <>
                    <ImageIcon className="mb-2 size-8 text-stone-400" />
                    <span className="text-sm font-medium text-stone-700">
                      Click to choose an image or video
                    </span>
                    <span className="text-xs text-stone-400">
                      PNG, JPG, WebP, MP4, WebM, MOV up to ~10MB
                    </span>
                  </>
                )}
              </label>
              {file && (
                <p className="text-xs text-stone-500">
                  Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          )}

          {mode === "url" && (
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/field-photo.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-stone-400">
                Direct image link. The backend will fetch and analyze it.
              </p>
            </div>
          )}

          {mode === "generate" && (
            <div className="space-y-2">
              <Label>Generation prompt</Label>
              <Textarea
                placeholder="A community tree-planting event on a deforested hillside in East Africa, golden hour, hopeful mood, documentary photo"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-stone-400">
                Calls the AI image-generation pipeline. The resulting image is
                auto-analyzed by the VLM.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Auto-generated from caption"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {projectsQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pair role</Label>
              <Select
                value={pairRole}
                onValueChange={(v) =>
                  setPairRole(v as "none" | "before" | "after")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standalone</SelectItem>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capture">Capture date</Label>
              <Input
                id="capture"
                type="date"
                value={captureDate}
                onChange={(e) => setCaptureDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {analyze.isPending ? "Analyzing…" : "Ingesting…"}
              </>
            ) : mode === "generate" ? (
              <>
                <Wand2 className="size-4" />
                Generate & analyze
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Ingest & analyze
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-md border border-emerald-500 bg-emerald-50 px-2 py-3 text-xs font-medium text-emerald-800 shadow-sm"
          : "flex flex-col items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-3 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
      }
    >
      {icon}
      {label}
    </button>
  );
}
