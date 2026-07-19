import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import type {
  AppUser,
  HistoricalImportCompleteEvent,
  HistoricalImportErrorEvent,
  HistoricalImportProgressEvent,
  HistoricalImportResult,
  HistoricalImportStreamEvent,
} from "@/types";

// Next.js requires this export to retain its literal type.
// eslint-disable-next-line @typescript-eslint/prefer-as-const
export const runtime: "nodejs" = "nodejs";
export const maxDuration: number = 300;

const encoder: TextEncoder = new TextEncoder();

function streamLine(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: HistoricalImportStreamEvent,
): void {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function friendlyImportError(error: unknown, currentStep: string): string {
  if (!(error instanceof Error)) {
    return `The import stopped unexpectedly while ${currentStep.toLowerCase()}. Check the server log for technical details.`;
  }

  const message: string = error.message.trim();
  if (
    message.startsWith("The newest tier list") ||
    message.startsWith("Google Sheets could not") ||
    message.startsWith("The live ") ||
    message.startsWith("The import cannot connect")
  ) {
    return message;
  }
  if (message.toLowerCase().includes("fetch failed")) {
    return `The import lost its connection to an external service while ${currentStep.toLowerCase()}. Try again; if it repeats, check the Vercel function log for the affected service.`;
  }
  return `The import stopped unexpectedly while ${currentStep.toLowerCase()}. Some database work may already have started. Check the Vercel function log for the technical error before retrying.`;
}

export async function POST(): Promise<Response> {
  const user: AppUser | null = await getCurrentUser();
  if (user?.role !== "admin") {
    return Response.json(
      { error: "You must be an administrator to run this import." },
      { status: 403 },
    );
  }

  const stream: ReadableStream<Uint8Array> = new ReadableStream<Uint8Array>({
    start(controller) {
      let currentProgress: number = 0;
      let currentStep: string = "starting the import";
      const heartbeat: ReturnType<typeof setInterval> = setInterval(() => {
        if (controller.desiredSize !== null) {
          controller.enqueue(encoder.encode("\n"));
        }
      }, 15_000);

      const onProgress = (event: HistoricalImportProgressEvent): void => {
        currentProgress = event.progress;
        currentStep = event.message;
        streamLine(controller, event);
      };

      void (async () => {
        try {
          const { runHistoricalImport } = await import(
            "../../../../../../scripts/import-historical-sheets"
          );
          const result: HistoricalImportResult = await runHistoricalImport({
            onProgress,
          });
          revalidatePath("/songs");
          revalidatePath("/songs/history");
          revalidatePath("/leaderboard");

          const completeEvent: HistoricalImportCompleteEvent = {
            type: "complete",
            progress: 100,
            message: "Historical sheets were re-imported successfully.",
            result,
            timestamp: new Date().toISOString(),
          };
          streamLine(controller, completeEvent);
        } catch (error: unknown) {
          console.error("Historical sheet import failed:", error);
          const errorEvent: HistoricalImportErrorEvent = {
            type: "error",
            progress: currentProgress,
            message: friendlyImportError(error, currentStep),
            timestamp: new Date().toISOString(),
          };
          streamLine(controller, errorEvent);
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
