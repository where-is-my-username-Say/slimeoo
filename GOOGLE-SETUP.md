# Slimoo — Google sign-in and saves

The supplied **Web application** client is configured in `wrangler.jsonc`:

`821860457326-607rr7imo5ofj88j44n05d40r5sn5k66.apps.googleusercontent.com`

Registered main origin: **https://slimeoo-plum.vercel.app**. The game is branded **Slimoo**; the existing hostname, Worker namespace and old save keys are retained so renaming does not discard progress.

## Publish the matching backend and frontend

1. In this folder, run `npm.cmd ci`.
2. Sign into the Cloudflare account that owns `slimeoo-multiplayer`: `npx.cmd wrangler login`.
3. Run `npm.cmd run deploy`. Keep `GAME_ROOM`, `GameRoom` and the original SQLite migration. Do not create a replacement namespace; the original saves live in it.
4. Publish this same version through the connected Vercel project. `vercel.json` builds `dist` and proxies `/api/auth/*` to the existing Worker. That keeps the HttpOnly login cookie first-party. The WebSocket uses a short-lived, single-use ticket instead of putting credentials in its URL.
5. Visit the main website and choose **Continue with Google**, then enter the world. Try another device with the same Google account: it should load the same level, gear, items and quests. One active connection per character is enforced.

The JavaScript callback flow needs the **public client ID only**. The downloaded OAuth JSON and its client secret are **not** needed by the game and are not included in the distribution. The existing registered JavaScript origin is correct; a new redirect URL is not needed for this popup callback flow.

## Guest progress and linking

- Guest progress still saves on the server after actions and rewards. **Settings → Save now** writes an explicit checkpoint; the HUD confirms server-acknowledged saves.
- Signing into a new Google account links an existing unlinked guest character in place, keeping its data and reward receipts.
- If the Google account already has a character, that character loads. A different guest save on the device is kept separately rather than overwritten or merged.
- After linking, the old guest recovery key cannot bypass Google sign-in. Signing out preserves the Google character and starts a separate guest when necessary.
- Google access is bound to the verified stable account subject, not the email address. JWT signature, audience, issuer, expiry and nonce are checked server-side. Session cookies are HttpOnly, SameSite=Lax and Secure on HTTPS; logout revokes the session and outstanding login tickets.

## Local play and save location

Double-click **START-SLIMOO.cmd**, or use `npm.cmd run dev`.

On this D: drive, local saves now live in **D:\SlimooData**. Existing `.wrangler/state` data is copied there once, before the server starts. Later source copies use the same folder; an existing save directory is never overwritten by the migration. Set `SLIMOO_SAVE_DIR` to choose another location. Stop the previous server before starting a new copy.

Guest play works at `http://127.0.0.1:8787` and the printed LAN address. Your current Google client registers only the main HTTPS website, so local pages explain that Google sign-in belongs to that origin instead of trying an unauthorized popup. For local Google testing, add the exact localhost origin in Google Cloud and to `GOOGLE_ORIGINS` in the Worker configuration; restart the local server afterward. Raw HTTP LAN addresses should use guest mode or a registered HTTPS origin.

Code packages contain no player database, OAuth secret JSON or active login cookies. Keep `D:\SlimooData` private and back it up separately while the local server is stopped.

## Verification and limits

`npm.cmd test` covers signed-token checks, nonce replay, linking and save preservation, cross-device ticket redemption, session expiry/logout, guest-key protection, checkpoint idempotency and local save migration, alongside the RPG tests. Tests use generated signing keys and injected identities; they do not pretend to complete a real user's Google consent.

Live publication still requires Cloudflare account authorization. Setting up a Google OAuth client does not grant deployment access to Cloudflare or Vercel.

Official references: [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference).
