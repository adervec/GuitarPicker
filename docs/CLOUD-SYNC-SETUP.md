# Cloud sync setup (Google Drive)

GuitarPicker can sync your **songs, history, progress, and unlocks** to a hidden,
app-private folder in *your own* Google Drive (`appDataFolder`). It is **opt-in and
off by default** — with no client ID configured the app runs 100% locally with no
network and no accounts.

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
Edit [`src/cloud/config.js`](../src/cloud/config.js):

```js
export const GOOGLE_CLIENT_ID = "xxxx.apps.googleusercontent.com";
// And list every origin you serve from (must match the Authorized JavaScript origins above):
export const OAUTH_ORIGINS = ["https://yourname.github.io"];
```

`OAUTH_ORIGINS` is a second, app-side gate: sign-in is refused on any origin not in the
list (localhost is always allowed for dev), so a fork of this repo redeployed elsewhere
can't borrow your committed client ID. Keep it in sync with the provider's origins.

Reload, open **Settings → Account & Sync (cloud) → Sign in with Google**, approve
the `drive.appdata` access, and your data syncs. Sign out anytime.

## Notes
- **The client ID is not a secret** — it's safe to commit. Security comes from the
  Authorized-origins allowlist, so keep that list tight.
- **Going past test users:** `drive.appdata` is a *sensitive* scope. Apps in
  "Testing" are limited to your added test users; to open it to everyone you must
  **publish** the consent screen (Google may require app verification).
- **Merge model:** content (songs, history, progress, unlocks) is **unioned** across
  devices so nothing is lost; the **coin balance** is last-write-wins by timestamp.
  Device settings (mic/output, theme) deliberately do **not** sync.
- **Conflict safety:** sync = pull → merge locally → push merged, so two devices
  editing offline converge without clobbering each other's songs/progress.
