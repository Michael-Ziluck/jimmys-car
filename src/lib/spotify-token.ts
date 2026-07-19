import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { CipherGCM, DecipherGCM } from "node:crypto";

import type { SpotifyTokenResponse } from "@/types";

const spotifyAccountsUrl: string = "https://accounts.spotify.com";
const encryptionVersion: string = "v1";

function getSpotifyClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId: string | undefined = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret: string | undefined = process.env["SPOTIFY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("Spotify client credentials are not configured.");
  }
  return { clientId, clientSecret };
}

function getEncryptionKey(): Buffer {
  const { clientSecret } = getSpotifyClientCredentials();
  return createHash("sha256")
    .update(`jimmys-car:spotify-refresh-token:${clientSecret}`)
    .digest();
}

export function encryptSpotifyRefreshToken(refreshToken: string): string {
  const iv: Buffer = randomBytes(12);
  const cipher: CipherGCM = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv,
  );
  const ciphertext: Buffer = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);
  const authenticationTag: Buffer = cipher.getAuthTag();
  return [
    encryptionVersion,
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSpotifyRefreshToken(value: string): string {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(".");
  if (
    version !== encryptionVersion ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra
  ) {
    throw new Error("The stored Spotify refresh token has an invalid format.");
  }

  const decipher: DecipherGCM = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function refreshSpotifyUserToken(
  refreshToken: string,
): Promise<SpotifyTokenResponse | null> {
  const { clientId, clientSecret } = getSpotifyClientCredentials();
  const credentials: string = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");
  const response: Response = await fetch(`${spotifyAccountsUrl}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json();
}
