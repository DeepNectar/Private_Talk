import React, { useEffect, useState } from 'react';

export interface Elapsed {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

/** Parse a stored date string ("YYYY-MM-DD", ISO, or Firestore Timestamp-ish) into epoch ms. */
export function parseDateMs(date: unknown): number | null {
  if (date == null || date === '') return null;
  // Firestore Timestamp objects expose toDate()
  const anyDate = date as any;
  if (typeof anyDate?.toDate === 'function') {
    const t = anyDate.toDate().getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof anyDate === 'number') return Number.isFinite(anyDate) ? anyDate : null;
  if (typeof anyDate !== 'string') return null;
  // "YYYY-MM-DD" would otherwise be parsed as UTC midnight — force local time.
  const s = /^\d{4}-\d{2}-\d{2}$/.test(anyDate) ? `${anyDate}T00:00:00` : anyDate;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Ticking live elapsed-time counter (days / hours / minutes / seconds) since `since`. */
export function useElapsed(since: number | null): Elapsed | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Always tick so the seconds stay live even when `since` changes between renders.
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!since) return null;
  const diffMs = Math.max(0, now - since);
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

const UNITS: [keyof Omit<Elapsed, 'totalSeconds'>, string][] = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Min'],
  ['seconds', 'Sec'],
];

export default function LiveCounter({
  since,
  label = 'Together for',
  compact = false,
}: {
  since: number | null; // epoch ms of the relationship start
  label?: string;
  compact?: boolean;
}) {
  const e = useElapsed(since);

  if (!e) {
    return (
      <p className="text-[10px] text-gray-400 px-1 py-1">
        Set your first date in Memories to see a live day/hour/min/sec counter.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-bold text-rose-600">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        {e.days}d {pad(e.hours)}:{pad(e.minutes)}:{pad(e.seconds)}
      </div>
    );
  }

  return (
    <div className="bg-white/80 rounded-2xl border border-pink-100 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        {label} <span className="font-semibold text-rose-500">live</span>
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        {UNITS.map(([k, name]) => (
          <div key={k} className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl py-2 border border-pink-100">
            <p className="font-mono tabular-nums text-lg sm:text-2xl font-bold text-rose-600 leading-none">
              {String(e[k]).padStart(k === 'days' ? 1 : 2, '0')}
            </p>
            <p className="text-[9px] text-gray-500 mt-1">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
