// One note on a five-line staff, for sight-reading drills. Notes are "diatonic
// steps": octave * 7 + letter index (C=0 … B=6), so C4 = 28, E4 = 30.
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NAT_PC = [0, 2, 4, 5, 7, 9, 11];

// bottom staff line, and the range a drill picks from (ledger lines included)
export const CLEFS = {
  treble: { bottom: 30, lo: 28, hi: 40, glyph: "𝄞" },   // E4 line; C4–A5
  bass: { bottom: 18, lo: 16, hi: 28, glyph: "𝄢" },     // G2 line; E2–C4
};

export const stepToMidi = (d) => (Math.floor(d / 7) + 1) * 12 + NAT_PC[d % 7];
export const stepName = (d) => LETTERS[d % 7] + Math.floor(d / 7);

/** Staff position of a step: 0 = bottom line, 2 = next line up, 1 = the space between. */
export const staffPos = (clef, d) => d - CLEFS[clef].bottom;

export function staffSVG(clef, d) {
  const gap = 12, top = 40, w = 220, x = 140;
  const lineY = (i) => top + (4 - i) * gap;          // i = 0 bottom line … 4 top line
  const pos = staffPos(clef, d);
  const y = lineY(0) - pos * (gap / 2);
  let out = `<svg viewBox="0 0 ${w} 140" width="${w}" role="img" aria-label="A note on the ${clef} staff">`;
  for (let i = 0; i < 5; i++) out += `<line x1="10" x2="${w - 10}" y1="${lineY(i)}" y2="${lineY(i)}" stroke="var(--text)" stroke-width="1.2"/>`;
  out += `<text x="14" y="${clef === "treble" ? lineY(0) + 10 : lineY(1) + 6}" font-size="${clef === "treble" ? 64 : 40}" fill="var(--text)">${CLEFS[clef].glyph}</text>`;
  // ledger lines below / above the staff
  for (let p = -2; p >= pos; p -= 2) out += `<line x1="${x - 16}" x2="${x + 16}" y1="${lineY(0) - p * gap / 2}" y2="${lineY(0) - p * gap / 2}" stroke="var(--text)" stroke-width="1.2"/>`;
  for (let p = 10; p <= pos; p += 2) out += `<line x1="${x - 16}" x2="${x + 16}" y1="${lineY(0) - p * gap / 2}" y2="${lineY(0) - p * gap / 2}" stroke="var(--text)" stroke-width="1.2"/>`;
  out += `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" transform="rotate(-20 ${x} ${y})" fill="var(--text)"/>`;
  return out + "</svg>";
}
