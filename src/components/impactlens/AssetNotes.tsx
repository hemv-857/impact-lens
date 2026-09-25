"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trash2, Send, Loader2, Pencil, Check, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/format";

/**
 * AssetNotes — collaborative notes/annotations panel for a single asset.
 * Renders inside the AssetDrawer. Users can add, edit, and delete notes.
 */
export function AssetNotes({ assetId }: { assetId: string }) {
  const notesQ = useNotes(assetId);
  const createMut = useCreateNote();
  const updateMut = useUpdateNote();
  const delMut = useDeleteNote();
  const { toast } = useToast();

  const [body, setBody] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState("");

  const onCreate = async () => {
    if (!body.trim()) {
      toast({ title: "Note can't be empty", variant: "destructive" });
      return;
    }
    try {
      await createMut.mutateAsync({
        assetId,
        body: body.trim(),
        author: author.trim() || undefined,
      });
      setBody("");
      toast({ title: "Note added" });
    } catch (e) {
      toast({
        title: "Failed to add note",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onStartEdit = (id: string, currentBody: string) => {
    setEditingId(id);
    setEditBody(currentBody);
  };

  const onSaveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editingId, body: editBody.trim(), assetId });
      setEditingId(null);
      setEditBody("");
      toast({ title: "Note updated" });
    } catch (e) {
      toast({
        title: "Failed to update note",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await delMut.mutateAsync({ id, assetId });
      toast({ title: "Note deleted" });
    } catch (e) {
      toast({
        title: "Failed to delete note",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const notes = notesQ.data ?? [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <MessageSquare className="size-4 text-emerald-600" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Notes & annotations
        </h4>
        {notes.length > 0 && (
          <Badge variant="secondary" className="ml-auto bg-emerald-50 text-emerald-700 text-[10px]">
            {notes.length}
          </Badge>
        )}
      </div>

      {/* Add note form */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/50 p-3">
        <Textarea
          placeholder="Add a note, observation, or annotation for this asset…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[60px] resize-none bg-white text-sm"
          maxLength={2000}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <User className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Your name (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="h-8 pl-7 text-xs"
              maxLength={100}
            />
          </div>
          <Button
            onClick={onCreate}
            disabled={createMut.isPending || !body.trim()}
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {createMut.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Add
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {notesQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-100" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="py-3 text-center text-xs text-stone-400">
          No notes yet. Add the first annotation above.
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {notes.map((note) => (
              <motion.li
                key={note.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="rounded-lg border border-stone-200 bg-white p-2.5"
              >
                {editingId === note.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="min-h-[50px] resize-none text-sm"
                      maxLength={2000}
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                      >
                        <X className="size-3" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
                        onClick={onSaveEdit}
                        disabled={updateMut.isPending || !editBody.trim()}
                      >
                        <Check className="size-3" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <p className="whitespace-pre-wrap text-sm text-stone-700">{note.body}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                        {note.author && (
                          <Badge variant="outline" className="bg-stone-50 px-1.5 py-0 text-[9px] text-stone-500">
                            {note.author}
                          </Badge>
                        )}
                        <span>{timeAgo(note.createdAt)}</span>
                        {note.updatedAt !== note.createdAt && (
                          <span className="italic">· edited</span>
                        )}
                      </div>
                      <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => onStartEdit(note.id, note.body)}
                          className="rounded p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          aria-label="Edit note"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => onDelete(note.id)}
                          disabled={delMut.isPending}
                          className="rounded p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete note"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
