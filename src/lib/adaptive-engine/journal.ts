// =====================================================================
// FRP Adaptive Engine — session journal (T8)
// ---------------------------------------------------------------------
// Success/failure logging for the calibration loop (brief: "Maintain
// detailed logs of success/failure cases to refine exploit
// reliability"). Mirrors the throttled-persistence pattern of
// src/lib/logger.ts: in-memory buffer + flush at most once per second.
// Storage is injectable so the module runs under node (tests) without
// window/localStorage.
// =====================================================================

import type { JournalEntry, JournalKind } from "./types.ts";

export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "droidkit:adaptive-journal";
const MAX_ENTRIES = 400;
const FLUSH_EVERY_MS = 1000;

/** Best-effort browser localStorage; falls back to in-memory. */
export function defaultStorage(): KVStorage {
  const memory = new Map<string, string>();
  if (typeof localStorage !== "undefined") {
    return {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          memory.set(k, v);
        }
      },
    };
  }
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
  };
}

export class AdaptiveJournal {
  private entries: JournalEntry[] = [];
  private dirty = false;
  private lastFlush = 0;
  private storage: KVStorage;

  constructor(storage: KVStorage = defaultStorage()) {
    this.storage = storage;
    this.load();
  }

  private load(): void {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw) as JournalEntry[];
    } catch {
      this.entries = [];
    }
  }

  /** Append an entry; persistence is throttled to once per second. */
  append(
    kind: JournalKind,
    fingerprintKey: string,
    text: string,
    meta?: Record<string, string | number | boolean>,
  ): JournalEntry {
    const entry: JournalEntry = { ts: new Date().toISOString(), kind, fingerprintKey, text };
    if (meta) entry.meta = meta;
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    this.dirty = true;
    this.flush(false);
    return entry;
  }

  private flush(force: boolean): void {
    const now = Date.now();
    if (!this.dirty) return;
    if (!force && now - this.lastFlush < FLUSH_EVERY_MS) return;
    this.lastFlush = now;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
      this.dirty = false;
    } catch {
      // Storage full/unavailable — keep the in-memory buffer.
    }
  }

  /** Force an immediate flush (called on export/close). */
  persistNow(): void {
    this.flush(true);
  }

  forFingerprint(key: string): JournalEntry[] {
    return this.entries.filter((e) => e.fingerprintKey === key);
  }

  recent(limit = 50): JournalEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  exportJson(): string {
    this.persistNow();
    return JSON.stringify({ exportedAt: new Date().toISOString(), entries: this.entries }, null, 2);
  }

  clear(): void {
    this.entries = [];
    this.dirty = true;
    this.persistNow();
  }
}

/** Stable fingerprint key for journal grouping. */
export function fingerprintKey(fp: { brandRaw: string; modelCode: string }): string {
  return `${fp.brandRaw.trim().toLowerCase()}::${fp.modelCode.trim().toLowerCase()}`;
}
