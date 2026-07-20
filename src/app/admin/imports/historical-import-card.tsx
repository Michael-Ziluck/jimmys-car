"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  DatabaseZap,
  RefreshCw,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  HistoricalImportResult,
  HistoricalImportStreamEvent,
} from "@/types";

type ImportStatus = "idle" | "running" | "success" | "error";

function eventBadge(event: HistoricalImportStreamEvent) {
  if (event.type === "error") return "Stopped";
  if (event.type === "complete" || event.level === "success") return "Done";
  if (event.level === "warning") return "Note";
  return `${event.progress}%`;
}

export function HistoricalImportCard() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<HistoricalImportResult | null>(null);
  const [events, setEvents] = useState<HistoricalImportStreamEvent[]>([]);
  const [showLog, setShowLog] = useState(true);

  const receiveEvent = (event: HistoricalImportStreamEvent) => {
    setEvents((current) => [event, ...current]);
    setProgress(event.progress);
    setMessage(event.message);
    if (event.type === "complete") {
      setResult(event.result);
      setStatus("success");
    } else if (event.type === "error") {
      setStatus("error");
    }
  };

  const startImport = async () => {
    let latestProgress: number = 0;
    setStatus("running");
    setProgress(0);
    setMessage("Starting the historical sheet re-import…");
    setResult(null);
    setEvents([]);
    setShowLog(true);

    try {
      const response: Response = await fetch("/api/admin/imports/historical", {
        method: "POST",
      });
      if (!response.ok) {
        const body: { error?: string } | null = (await response
          .json()
          .catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The import request returned ${response.status}.`);
      }
      if (!response.body) {
        throw new Error("The import started, but its progress stream was unavailable.");
      }

      const reader: ReadableStreamDefaultReader<Uint8Array> =
        response.body.getReader();
      const decoder: TextDecoder = new TextDecoder();
      let buffer: string = "";
      let receivedFinalEvent: boolean = false;

      while (true) {
        const { done, value }: ReadableStreamReadResult<Uint8Array> =
          await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines: string[] = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event: HistoricalImportStreamEvent = JSON.parse(
            line,
          ) as HistoricalImportStreamEvent;
          latestProgress = event.progress;
          receiveEvent(event);
          if (event.type === "complete" || event.type === "error") {
            receivedFinalEvent = true;
          }
        }
        if (done) break;
      }

      if (!receivedFinalEvent) {
        throw new Error(
          "The progress connection closed before the import reported a result. Check the Vercel function log before retrying.",
        );
      }
    } catch (error: unknown) {
      const errorMessage: string =
        error instanceof Error
          ? error.message
          : "The import could not be started.";
      const errorEvent: HistoricalImportStreamEvent = {
        type: "error",
        progress: latestProgress,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };
      receiveEvent(errorEvent);
    }
  };

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpen(false);
    void startImport();
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <DatabaseZap className="mb-2 text-amber-700" aria-hidden="true" />
        <CardTitle>Historical Google Sheets</CardTitle>
        <CardDescription>
          Download every configured legacy workbook again and rebuild the
          canonical song appearances and leaderboard ledger.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {status === "idle" ? (
          <p className="text-sm text-stone-600">
            Existing confirmed Spotify links are preserved. The latest live
            worksheet is validated before database appearances are replaced.
          </p>
        ) : (
          <section className="flex flex-col gap-3" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {status === "running" ? (
                  <RefreshCw
                    className="animate-spin text-amber-700"
                    aria-hidden="true"
                  />
                ) : status === "success" ? (
                  <CheckCircle2 className="text-emerald-700" aria-hidden="true" />
                ) : (
                  <AlertCircle className="text-destructive" aria-hidden="true" />
                )}
                <h3 className="font-medium text-stone-950">
                  {status === "running"
                    ? "Re-import in progress"
                    : status === "success"
                      ? "Re-import complete"
                      : "Re-import stopped"}
                </h3>
              </div>
              <span className="font-mono text-sm font-semibold text-stone-700">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`Historical sheet import ${progress}% complete`}
            />
            <p className="text-sm text-stone-600">{message}</p>
          </section>
        )}

        {status === "error" ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>The import did not finish</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              { label: "Snapshots", value: result.sourceSnapshots },
              { label: "People", value: result.participants },
              { label: "Titles", value: result.titleRecords },
              { label: "Placements", value: result.tierPlacements },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-stone-50 p-3">
                <dt className="text-stone-500">{item.label}</dt>
                <dd className="mt-1 font-mono text-base font-semibold text-stone-950">
                  {item.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {events.length ? (
          <section className="rounded-xl border border-stone-200 bg-stone-50/70">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "w-full justify-between",
                showLog ? "rounded-t-xl rounded-b-none" : "rounded-xl",
              )}
              onClick={() => setShowLog((current) => !current)}
              aria-expanded={showLog}
            >
              Activity log
              {showLog ? (
                <ChevronUp data-icon="inline-end" />
              ) : (
                <ChevronDown data-icon="inline-end" />
              )}
            </Button>
            {showLog ? (
              <ScrollArea className="h-64 border-t border-stone-200">
                <ol className="flex flex-col gap-3 p-4">
                  {events.map((event, index) => (
                    <li
                      key={`${event.timestamp}-${index}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm"
                    >
                      <CircleDot
                        className={
                          event.type === "error"
                            ? "mt-0.5 text-destructive"
                            : event.type === "complete" ||
                                event.level === "success"
                              ? "mt-0.5 text-emerald-700"
                              : event.level === "warning"
                                ? "mt-0.5 text-amber-700"
                                : "mt-0.5 text-stone-400"
                        }
                        aria-hidden="true"
                      />
                      <span className="text-stone-700">{event.message}</span>
                      <Badge variant="outline" className="font-mono">
                        {eventBadge(event)}
                      </Badge>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            ) : null}
          </section>
        ) : null}
      </CardContent>
      <CardFooter>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={status === "running"}>
              <RefreshCw data-icon="inline-start" />
              {status === "running" ? "Re-import running" : "Re-import sheets"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Re-import all historical sheets?</DialogTitle>
              <DialogDescription>
                This downloads each configured workbook and replaces imported
                edition placements with the latest source data. Progress will
                remain visible on this page after the import starts.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitImport}>
              <DialogFooter>
                <Button type="submit">Start re-import</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
