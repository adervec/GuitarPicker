# Cloud sync setup (Google Drive)

GuitarPicker can sync your **songs, history, progress, and unlocks** to a hidden,
app-private folder in *your own* Google Drive (`appDataFolder`). It is **opt-in and
off until you sign in** — the app makes no network requests, and does not even load
Google's script, until you click *Sign in with Google* in Settings.

> **On the official site you do not need this guide.** A built-in OAuth client ID
> ships with the app and works on <https://adervec.github.io> — just open
> **Settings → Account & Sync** and sign in. The ID is shared with the author's
> sibling local-first apps (Tachyread, GymTracker), which is why no setup is needed.
> It is origin-locked, so read on **only if you are running your own copy elsewhere.**

## Running your own deployment

The built-in ID is refused on any origin outside `OAUTH_ORIGINS` (both by Google and
app-side), so a fork must supply its own. Two ways:

- **No code changes:** Settings → Account & Sync → *Use your own Google OAuth client
  ID* → paste it. Stored locally, and it always overrides the built-in one.
- **In the source:** set `OAUTH_ORIGINS` (and optionally `BUILTIN_CLIENT_ID`) in
  [`src/cloud/config.js`](../src/cloud/config.js).

Follow the steps below to create the ID either way.

There is **no backend to run** and **no database to pay for**: the browser talks
directly to Google Drive using the user's own account. The app requests only the
minimal **`drive.appdata`** scope, so it can read/write *only the one sync file it
creates* — never the rest of the user's Drive.

> **Heads-up:** enabling sync makes the app load Google Identity Services from
> Google (only when a user signs in) and call the Drive API. That's the app's only
> network use. If you publish, update your privacy policy accordingly (the in-app
> About panel already discloses it).

## 1. Create a Google Cloud project
1. Go to <https://console.cloud.google.com/> and create (or pick) a project.

## 2. Enable the Drive API
1. **APIs & Services → Library → Google Drive API → Enable.**

## 3. Configure the OAuth consent screen
1. **APIs & Services → OAuth consent screen.** User type **External**.
2. Fill in app name, support email, developer contact.
3. **Scopes → Add:** `https://www.googleapis.com/auth/drive.appdata`.
4. While in **Testing**, add your Google account under **Test users**.

## 4. Create an OAuth 2.0 Client ID
1. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
2. Application type: **Web application**.
3. **Authorized JavaScript origins** — add every origin you serve from, e.g.:
   - `http://localhost:8080` (the bundled dev servers)
   - your production origin (e.g. `https://yourname.github.io`)
   *(No redirect URIs are needed — we use the GIS token model.)*
4. Copy the generated **Client ID** (looks like `xxxx.apps.googleusercontent.com`).

## 5. Drop it into the app
Either paste it into **Settings → Account & Sync → Use your own Google OAuth client
ID** (no rebuild needed), or edit [`src/cloud/config.js`](../src/cloud/config.js):

```js
export const BUILTIN_CLIENT_ID = "xxxx.apps.googleusercontent.com";
// And list every origin you serve from (must match the Authorized JavaScript origins above):
export const OAUTH_ORIGINS = ["https://yourname.github.io"];
```

`OAUTH_ORIGINS` is a second, app-side gate: sign-in is refused on any origin not in the
list (localhost is always allowed for dev), so a fork of this repo redeployed elsewhere
can't borrow the committed client ID. Keep it in sync with the provider's origins.

Reload, open **Settings → Account & Sync (cloud) → Sign in with Google**, approve
the `drive.appdata` access, and your data syncs. Sign out anytime.

## Notes
- **The client ID is not a secret** — it's safe to commit. Security comes from the
  Authorized-origins allowlist, so keep that list tight.
- **Localhost sign-in** only works if `http://localhost:<port>` is also registered as
  an Authorized JavaScript origin in the Cloud console. The app-side gate allows
  localhost, but Google's does not unless you add it — otherwise you'll see
  `origin_mismatch`.
- **The consent screen shows the Cloud project's app name**, not necessarily
  "GuitarPicker" — expected when several apps share one OAuth client.
- **`appDataFolder` is per-Google-project**, so apps sharing this client ID share one
  hidden folder. They stay separate by filename; GuitarPicker uses
  `guitarpicker-sync.json`.
- **Large libraries:** songs carry imported backing audio inline, so the payload can
  exceed Drive's 5 MB simple-upload cap. Anything over 4 MB is uploaded with the
  resumable protocol automatically.
- **Going past test users:** `drive.appdata` is a *sensitive* scope. Apps in
  "Testing" are limited to your added test users; to open it to everyone you must
  **publish** the consent screen (Google may require app verification).
- **Merge model:** content (songs, history, progress, unlocks) is **unioned** across
  devices so nothing is lost; the **coin balance** is last-write-wins by timestamp.
  Device settings (mic/output, theme) deliberately do **not** sync.
- **Conflict safety:** sync = pull → merge locally → push merged, so two devices
  editing offline converge without clobbering each other's songs/progress.
