// Regenerates docs/INSTRUMENTS.md from src/music/instrument-guide.js.
// Run after editing the guide: node gen-docs.mjs   (npm test verifies sync)
import { writeFileSync } from "node:fs";
import { buildInstrumentsMarkdown } from "./src/music/instrument-guide.js";
writeFileSync("docs/INSTRUMENTS.md", buildInstrumentsMarkdown() + "\n");
console.log("docs/INSTRUMENTS.md written.");
