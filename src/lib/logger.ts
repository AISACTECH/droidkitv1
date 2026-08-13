/**
 * Paralock Production Logger
 * Structured logging with levels, safe for production stripping
 * Supports: debug in dev, warn/error in prod, telemetry-ready
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  scope: string;
  msg: string;
  meta?: unknown;
}

const isDev = import.meta.env.DEV;

const STORAGE_KEY = "paralock:logs";
const MAX_ENTRIES = 500;

class Logger {
  private scope: string;
  private buffer: LogEntry[] = [];
  // audit fix (2026-08-12): persist() ran on EVERY entry — the screen-mirror
  // logger writes 1-3 lines/sec (frame log), serializing up to 500 entries
  // to localStorage each time. Throttle to one flush per second; `clear()`
  // stays immediate. In-memory buffer (getRecent) is unaffected.
  private dirty = false;
  private lastFlush = 0;
  private static readonly FLUSH_EVERY_MS = 1000;

  constructor(scope: string) {
    this.scope = scope;
    this.loadBuffer();
  }

  private loadBuffer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.buffer = JSON.parse(raw).slice(-MAX_ENTRIES);
    } catch {
      this.buffer = [];
    }
  }

  private flush() {
    try {
      if (this.buffer.length > MAX_ENTRIES) {
        this.buffer = this.buffer.slice(-MAX_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
      this.dirty = false;
      this.lastFlush = Date.now();
    } catch {
      // ignore quota
    }
  }

  private persist(immediate = false) {
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer = this.buffer.slice(-MAX_ENTRIES);
    }
    if (!immediate && this.dirty && Date.now() - this.lastFlush < Logger.FLUSH_EVERY_MS) return;
    this.flush();
  }

  private emit(level: LogLevel, msg: string, meta?: unknown) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      scope: this.scope,
      msg,
      meta,
    };
    this.buffer.push(entry);
    this.dirty = true;
    this.persist();

    if (!isDev && level === "debug") return;

    const prefix = `[${entry.scope}]`;
    switch (level) {
      case "debug":
        console.debug(prefix, msg, meta ?? "");
        break;
      case "info":
        console.info(prefix, msg, meta ?? "");
        break;
      case "warn":
        console.warn(prefix, msg, meta ?? "");
        break;
      case "error":
        console.error(prefix, msg, meta ?? "");
        break;
    }
  }

  debug(msg: string, meta?: unknown) {
    this.emit("debug", msg, meta);
  }
  info(msg: string, meta?: unknown) {
    this.emit("info", msg, meta);
  }
  warn(msg: string, meta?: unknown) {
    this.emit("warn", msg, meta);
  }
  error(msg: string, meta?: unknown) {
    this.emit("error", msg, meta);
  }

  getRecent(level?: LogLevel, limit = 100): LogEntry[] {
    let filtered = this.buffer;
    if (level) filtered = filtered.filter((e) => e.level === level);
    return filtered.slice(-limit).reverse();
  }

  clear() {
    this.buffer = [];
    this.dirty = true;
    this.persist(true);
  }

  child(childScope: string) {
    return new Logger(`${this.scope}:${childScope}`);
  }
}

export const createLogger = (scope: string) => new Logger(scope);

export const appLogger = createLogger("App");
export const deviceLogger = createLogger("Devices");
export const frpLogger = createLogger("FRP");
export const fileLogger = createLogger("Files");
export const adbLogger = createLogger("ADB");
