// Zero-dependency static server (Node). Alternative to serve.ps1.
//   node serve.mjs            -> http://localhost:8080
//   node serve.mjs 9000       -> http://localhost:9000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".ico": "image/x-icon",
  ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
  if (!rel) rel = "index.html";
  const full = path.join(ROOT, rel);
  if (!path.resolve(full).startsWith(path.resolve(ROOT))) { res.writeHead(403).end("Forbidden"); return; }
  fs.stat(full, (err, st) => {
    const file = st && st.isDirectory() ? path.join(full, "index.html") : full;
    fs.readFile(file, (e, buf) => {
      if (e) { res.writeHead(404, { "Content-Type": "text/plain" }).end("404 Not Found: " + rel); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(buf);
    });
  });
}).listen(PORT, () => {
  console.log(`\n  GuitarPicker running at  http://localhost:${PORT}\n  Serving ${ROOT}\n  Ctrl+C to stop.\n`);
});
