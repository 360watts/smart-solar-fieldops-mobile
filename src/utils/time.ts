const IST_OFFSET_MINUTES = 5 * 60 + 30;

/**
 * UTC ISO string for midnight of today in IST.
 * e.g. on 2026-03-25 IST → "2026-03-24T18:30:00.000Z"
 * Matches the web app — required for DynamoDB range queries (UTC ISO storage).
 */
export function startOfTodayISTIso(now: Date = new Date()): string {
  const dateStr = toISTDateString(now);  // "YYYY-MM-DD" in IST
  return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
}

/** N days ago from now, returned as ISO string */
export function daysAgoISTIso(days: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export function fmtTimeIST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Full date + time in IST for lists (e.g. "10 Mar 2025, 2:30 PM IST"). */
export function fmtDateTimeIST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

/** Short date for grouping (e.g. "10 Mar"). */
export function fmtDateShortIST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });
}

/** "YYYY-MM-DD" string for today in IST, for use as an API query param. */
export function toISTDateString(now: Date = new Date()): string {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const istMs = utcMs + IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(istMs);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


/** Alias for fmtTimeIST — time only in IST (e.g. "02:30 PM"). */
export function formatISTTime(iso: string): string {
  return fmtTimeIST(iso);
}

/** Human-friendly relative time (e.g. "3 min ago", "2 hr ago", "just now"). */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
