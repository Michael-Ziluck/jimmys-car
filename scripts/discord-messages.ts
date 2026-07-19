import type { DiscordMessage, DiscordRateLimitResponse } from "@/types";

const DISCORD_CHANNEL_ID = "846835164159541298";
const messagesUrl = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`;

function pause(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getDiscordPage(url: URL, token: string, userAgent: string) {
  while (true) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": userAgent,
      },
    });
    if (response.status !== 429) return response;

    const { retry_after: retryAfter = 1 } =
      (await response.json()) as DiscordRateLimitResponse;
    await pause(Math.ceil(retryAfter * 1_000) + 100);
  }
}

export async function fetchDiscordMessages(
  token: string,
  userAgent: string,
  chronological = false,
) {
  const messages: DiscordMessage[] = [];
  let before: string | undefined;

  do {
    const url = new URL(messagesUrl);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const response = await getDiscordPage(url, token, userAgent);
    if (!response.ok) {
      throw new Error(
        `Discord returned ${response.status}: ${await response.text()}`,
      );
    }

    const page = (await response.json()) as DiscordMessage[];
    messages.push(...page);
    before = page.at(-1)?.id;
    if (page.length < 100) break;
  } while (before);

  return chronological ? messages.reverse() : messages;
}
