// Calendar days are the player's LOCAL day. Never take a day from
// toISOString() or parse a bare "YYYY-MM-DD" with new Date(str): both are UTC,
// so evening practice west of Greenwich would land on tomorrow.
const pad = (n) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of a Date or timestamp, in local time. */
export function localDay(d = new Date()) {
  d = new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight that starts a stored "YYYY-MM-DD" day. */
export const dayStart = (key) => new Date(key + "T00:00:00");

/** The local calendar day before a "YYYY-MM-DD" key (DST-safe: steps by date, not by 24h). */
export function dayBefore(key) {
  const d = dayStart(key);
  d.setDate(d.getDate() - 1);
  return localDay(d);
}
