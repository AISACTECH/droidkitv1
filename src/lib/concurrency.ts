// =====================================================================
// Parallel primitives — bounded concurrency, deterministic by contract
// ---------------------------------------------------------------------
// The app's "works in parallel" backbone for the frontend/scripts world.
// Every function here is PURE with respect to results: given the same
// inputs (and the same async outcomes), the OUTPUT is byte-identical to
// running the same work sequentially — parallelism only changes WHEN the
// work happens, never WHAT it produces. That contract is enforced by
// `npm run test:concurrency` (scripts/verify-concurrency.mts).
//
// Conventions:
//   * Order is always preserved (results[i] corresponds to items[i]).
//   * Concurrency is always bounded (limit) — no unbounded fan-out.
//   * mapWithConcurrencySettled isolates failures: one rejected item
//     never cancels its siblings and every item still runs to completion.
// =====================================================================

/** Outcome of one item under mapWithConcurrencySettled. */
export type SettledItem<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

/** Clamp a raw limit to a sane positive integer (1 → any, default 4). */
export function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 4;
  return Math.floor(limit);
}

/**
 * Map an array with a bounded number of concurrent workers, preserving
 * input order. Rejects if any mapper rejects (fail-fast), matching the
 * semantics of `Promise.all(items.map(mapper))` — but with a cap on how
 * many mappers run at once.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const safeLimit = normalizeLimit(limit);
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  };

  const workers = Array.from(
    { length: Math.min(safeLimit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Run a list of async factories with a concurrency cap, preserving order.
 * Factories are zero-argument functions so that work is only *scheduled*
 * when a worker slot is free — the parallelAll analogue of Promise.all.
 */
export async function parallelAll<T>(
  factories: ReadonlyArray<() => Promise<T>>,
  limit = 4,
): Promise<T[]> {
  return mapWithConcurrency(factories, limit, (factory) => factory());
}

/**
 * Same as mapWithConcurrency, but failures are isolated: every item is
 * processed to completion and the result array carries per-item
 * fulfilled/rejected outcomes (index-aligned, order preserved). Use this
 * when one failing item must not take down the whole batch (e.g. scanning
 * a list of devices where some are unreachable).
 */
export async function mapWithConcurrencySettled<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<Array<SettledItem<R>>> {
  const safeLimit = normalizeLimit(limit);
  if (items.length === 0) return [];
  const results = new Array<SettledItem<R>>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        const value = await mapper(items[index], index);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(safeLimit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Narrow type guard — is this value a thenable? */
export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}
