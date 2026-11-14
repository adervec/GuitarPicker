// Page wiring that used to be inline <script>s; a file, so the CSP needs no 'unsafe-inline' for scripts.
// Tapping the account picture (font.js <app-account>) opens the sync settings.
document.addEventListener("app-account-click", () => { location.hash = "#/settings"; });
// PWA: enables install + offline; skipped on file:// where SW is unavailable
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js");
