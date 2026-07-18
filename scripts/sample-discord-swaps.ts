import { loadEnvConfig } from "@next/env";

type DiscordMessage = {
  id: string;
  content: string;
  timestamp: string;
  author?: { username?: string };
  attachments?: Array<{ url?: string }>;
  embeds?: Array<{ url?: string; description?: string; title?: string }>;
};

const CHANNEL_ID: string = "846835164159541298";
const DISCORD_API: string = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`;
const SPOTIFY_URL: RegExp = /https?:\/\/(?:open\.spotify\.com\/(?:track|album|playlist|episode)\/[^\s<>]+|spotify\.link\/[^\s<>]+)/i;
const SPOTIFY_URLS: RegExp = /https?:\/\/(?:open\.spotify\.com\/(?:track|album|playlist|episode)\/[^\s<>]+|spotify\.link\/[^\s<>]+)/gi;
const SWAP_LANGUAGE: RegExp = /\b(?:swap|for)\b/i;

function compact(value: string) : string {
  return value.replace(/\s+/g, " ").trim();
}

function messageText(message: DiscordMessage) : string {
  return [
    message.content,
    ...(message.embeds ?? []).flatMap((embed) => [embed.url, embed.title, embed.description]),
    ...(message.attachments ?? []).map((attachment) => attachment.url),
  ].filter((value): value is string => Boolean(value)).join("\n");
}

function wait(milliseconds: number) : Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getDiscordPage(url: URL, token: string) : Promise<Response> {
  while (true) {
    const response: Response = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "JimmyCarDiscordInspector/0.1",
      },
    });
    if (response.status !== 429) return response;

    const limit: { retry_after?: number; } = await response.json() as { retry_after?: number };
    await wait(Math.ceil((limit.retry_after ?? 1) * 1000) + 100);
  }
}

async function fetchMessages(token: string) : Promise<DiscordMessage[]> {
  const messages: DiscordMessage[] = [];
  let before: string | undefined;

  do {
    const url: URL = new URL(DISCORD_API);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const response: Response = await getDiscordPage(url, token);
    if (!response.ok) throw new Error(`Discord returned ${response.status}: ${await response.text()}`);

    const page: DiscordMessage[] = await response.json() as DiscordMessage[];
    messages.push(...page);
    before = page.at(-1)?.id;
    if (page.length < 100) break;
  } while (before);

  return messages.reverse();
}

function inSlice<T>(items: T[], index: number, slices: number) : T[] {
  const start: number = Math.floor((items.length * index) / slices);
  const end: number = Math.floor((items.length * (index + 1)) / slices);
  return items.slice(start, end);
}

async function main() : Promise<void> {
  loadEnvConfig(process.cwd());
  const token: string | undefined = process.env["DISCORD_BOT_TOKEN"];
  if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");

  const messages: DiscordMessage[] = await fetchMessages(token);
  const candidates: DiscordMessage[] = messages.filter((message) => {
    return SWAP_LANGUAGE.test(message.content) && SPOTIFY_URL.test(messageText(message));
  });

  console.log(`Read ${messages.length} messages from ${messages[0]?.timestamp ?? "(empty)"} through ${messages.at(-1)?.timestamp ?? "(empty)"}.`);
  console.log(`Found ${candidates.length} messages containing both swap/for language and a Spotify URL.\n`);

  for (let index: number = 0; index < 5; index += 1) {
    const slice: DiscordMessage[] = inSlice(messages, index, 5);
    const matches: DiscordMessage[] = slice.filter((message) => candidates.includes(message));
    console.log(`=== Slice ${index + 1}: ${slice[0]?.timestamp ?? "(empty)"} to ${slice.at(-1)?.timestamp ?? "(empty)"} (${matches.length} candidates) ===`);
    for (const message of matches.slice(0, 12)) {
      const text: string = messageText(message);
      const spotifyLinks: [] | RegExpMatchArray = text.match(SPOTIFY_URLS) ?? [];
      console.log(JSON.stringify({
        id: message.id,
        timestamp: message.timestamp,
        author: message.author?.username ?? "unknown",
        spotifyLinks,
        text: compact(text).slice(0, 500),
      }));
    }
    if (matches.length > 12) console.log(`… ${matches.length - 12} additional candidates in this slice.`);
    console.log("");
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
