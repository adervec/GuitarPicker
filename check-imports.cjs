// Static validator: ensure every named/default import resolves to a real export.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "src");
const files = [];
(function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const f = path.join(d, n);
    if (fs.statSync(f).isDirectory()) walk(f);
    else if (f.endsWith(".js")) files.push(f);
  }
})(ROOT);

function exportsOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const named = new Set();
  let hasDefault = false;
  // export function/const/let/var/class NAME
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) named.add(m[1]);
  // export { a, b as c }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) named.add(name);
    }
  }
  if (/export\s+default/.test(src)) hasDefault = true;
  return { named, hasDefault };
}

const cache = new Map();
const get = (f) => { if (!cache.has(f)) cache.set(f, exportsOf(f)); return cache.get(f); };

let problems = 0;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const importRe = /import\s+([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src))) {
    const clause = m[1].trim();
    const spec = m[2];
    if (!spec.startsWith(".")) continue; // skip bare/builtin
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) { console.log(`MISSING FILE: ${rel(file)} imports ${spec}`); problems++; continue; }
    const ex = get(target);

    // default import: leading identifier before { or *
    const defMatch = clause.match(/^([A-Za-z0-9_$]+)\s*(?:,|$)/);
    if (defMatch && !clause.startsWith("{") && !clause.startsWith("*")) {
      if (!ex.hasDefault) { console.log(`NO DEFAULT EXPORT: ${rel(file)} imports default from ${spec}`); problems++; }
    }
    // named imports
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        if (!ex.named.has(name)) { console.log(`MISSING EXPORT: ${rel(file)} imports { ${name} } from ${spec} (not exported)`); problems++; }
      }
    }
  }
}
function rel(f) { return path.relative(__dirname, f); }
console.log(problems ? `\n${problems} import problem(s) found.` : "All imports resolve correctly.");
process.exit(problems ? 1 : 0);
