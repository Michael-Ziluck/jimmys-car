# Jimmy's Car

## Local Spotify setup

1. Copy `.env.example` to `.env.local`.
2. Create a Spotify app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
3. Add `http://127.0.0.1:3000/api/auth/spotify/callback` to the app's Redirect URIs.
4. Copy the app's client ID and client secret to `.env.local`.
5. Run `npm run dev`, then open `http://127.0.0.1:3000/spotify`.

The Spotify button always begins sign-in at `127.0.0.1:3000`, matching Spotify's required local callback host even if you are browsing the app at `localhost:3000`.

The first connection only requests basic profile access and does not retain Spotify tokens or modify any playlists.

## Local Swagger UI

Open `http://127.0.0.1:3000/spotify-swagger.html`. It reads the Spotify client ID and secret from the local server and prepopulates Swagger UI's OAuth dialog. Its token exchange is proxied through the local app because Spotify blocks Swagger UI's browser-side exchange via CORS. The local proxy permits cross-origin requests temporarily, and the schema points explicitly to the `127.0.0.1` proxy rather than Spotify's API host. This intentionally exposes the secret to a browser visitor, so use it only locally and rotate the secret before deploying. Add `http://127.0.0.1:3000/oauth2-redirect.html` to the Spotify app's Redirect URIs.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
