"use client";

import * as React from "react";
import { CalendarClock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateSchedule,
  useDeleteSchedule,
  useSchedules,
  useUpdateSchedule,
} from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/format";

const INTERVALS: { value: string; label: string }[] = [
  { value: "1", label: "Every day" },
  { value: "7", label: "Every week" },
  { value: "30", label: "Every month" },
];

interface ReportSchedulesProps {
  projectId?: string;
  type: string;
  tone: string;
  audience: string;
}

export function ReportSchedules({ projectId, type, tone, audience }: ReportSchedulesProps) {
  const schedulesQ = useSchedules();
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const { toast } = useToast();
  const [days, setDays] = React.useState("7");
  const [email, setEmail] = React.useState("");

  const onSchedule = async () => {
    try {
      await create.mutateAsync({
        type,
        tone,
        projectId,
        audience: audience.trim() || undefined,
        everyDays: parseInt(days, 10),
        emailTo: email.trim() || undefined,
      });
      toast({
        title: "Report scheduled",
        description: `Runs every ${days} day${days === "1" ? "" : "s"}${email.trim() ? ` · emails ${email.trim()}` : ""}`,
      });
    } catch (e) {
      toast({
        title: "Could not schedule",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onToggle = (id: string, active: boolean) =>
    update.mutate(
      { id, active },
      {
        onError: (e) =>
          toast({
            title: "Update failed",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
          }),
      }
    );

  const onDelete = (id: string) =>
    remove.mutate(id, {
      onError: (e) =>
        toast({
          title: "Delete failed",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        }),
    });

  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
        <CalendarClock className="size-3.5" />
        Recurring delivery
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVALS.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email recipient (optional)"
          className="h-8 flex-1 text-xs"
          type="email"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onSchedule}
        disabled={create.isPending}
        className="w-full border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
      >
        {create.isPending && <Loader2 className="size-3.5 animate-spin" />}
        Schedule this report
      </Button>

      {schedulesQ.data && schedulesQ.data.length > 0 && (
        <ul className="space-y-1.5">
          {schedulesQ.data.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded border border-stone-200 bg-white px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-stone-700">
                  {s.name || `${s.type} · every ${s.everyDays}d`}
                </p>
                <p className="truncate text-[10px] text-stone-400">
                  {s.emailTo ?? "no email"} · {s.lastRunAt ? `last ${timeAgo(s.lastRunAt)}` : "never run"}
                </p>
              </div>
              <Switch
                checked={s.active}
                onCheckedChange={(v) => onToggle(s.id, v)}
                aria-label="Toggle schedule"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-stone-400 hover:text-red-600"
                onClick={() => onDelete(s.id)}
                aria-label="Delete schedule"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
