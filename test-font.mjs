// House font standard: the page loads the shared font.js, the base font follows --app-font,
// and Settings offers the picker. (Static check; the DOM shim cannot compute styles.)
import { readFileSync } from "node:fs";
import assert from "node:assert";
assert.match(readFileSync("index.html", "utf8"), /<script src="https:\/\/adervec\.github\.io\/font\.js"><\/script>/);
assert.match(readFileSync("styles/themes.css", "utf8"), /--font:\s*var\(--app-font,/);
assert.match(readFileSync("src/views/settings.js", "utf8"), /app-font-picker/);
console.log("font standard OK");
