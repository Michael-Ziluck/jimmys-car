import { loadEnvConfig } from "@next/env";
import type { DiscordMessage } from "@/types";
import { fetchDiscordMessages } from "./discord-messages";

const SPOTIFY_URL =
  /https?:\/\/(?:open\.spotify\.com\/(?:track|album|playlist|episode)\/[^\s<>]+|spotify\.link\/[^\s<>]+)/i;
const SPOTIFY_URLS =
  /https?:\/\/(?:open\.spotify\.com\/(?:track|album|playlist|episode)\/[^\s<>]+|spotify\.link\/[^\s<>]+)/gi;
const SWAP_LANGUAGE = /\b(?:swap|for)\b/i;

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function messageText(message: DiscordMessage) {
  return [
    message.content,
    ...(message.embeds ?? []).flatMap((embed) => [
      embed.url,
      embed.title,
      embed.description,
    ]),
    ...(message.attachments ?? []).map((attachment) => attachment.url),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function inSlice<T>(items: T[], index: number, slices: number) {
  const start = Math.floor((items.length * index) / slices);
  const end = Math.floor((items.length * (index + 1)) / slices);
  return items.slice(start, end);
}

async function main() {
  loadEnvConfig(process.cwd());
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");

  const messages = await fetchDiscordMessages(
    token,
    "JimmyCarDiscordInspector/0.1",
    true,
  );
  const candidates = messages.filter((message) => {
    return (
      SWAP_LANGUAGE.test(message.content) &&
      SPOTIFY_URL.test(messageText(message))
    );
  });
  const candidateIds = new Set(candidates.map((message) => message.id));

  console.log(
    `Read ${messages.length} messages from ${messages[0]?.timestamp ?? "(empty)"} through ${messages.at(-1)?.timestamp ?? "(empty)"}.`,
  );
  console.log(
    `Found ${candidates.length} messages containing both swap/for language and a Spotify URL.\n`,
  );

  for (let index: number = 0; index < 5; index += 1) {
    const slice = inSlice(messages, index, 5);
    const matches = slice.filter((message) => candidateIds.has(message.id));
    console.log(
      `=== Slice ${index + 1}: ${slice[0]?.timestamp ?? "(empty)"} to ${slice.at(-1)?.timestamp ?? "(empty)"} (${matches.length} candidates) ===`,
    );
    for (const message of matches.slice(0, 12)) {
      const text = messageText(message);
      const spotifyLinks = text.match(SPOTIFY_URLS) ?? [];
      console.log(
        JSON.stringify({
          id: message.id,
          timestamp: message.timestamp,
          author: message.author?.username ?? "unknown",
          spotifyLinks,
          text: compact(text).slice(0, 500),
        }),
      );
    }
    if (matches.length > 12)
      console.log(
        `… ${matches.length - 12} additional candidates in this slice.`,
      );
    console.log("");
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
