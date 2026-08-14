// =====================================================================
// FRP Adaptive Engine — update-pack pipeline (WBS CA3, A1-2.1)
// ---------------------------------------------------------------------
// The catalog, UI flow maps and patch tables are DATA. This module
// defines the schema an external update pack must satisfy before the
// team merges it — the continuous-update pipeline in one gate:
// edit data → validate with zod → run test:adaptive → ship.
// Honesty invariants are schema-level (e.g. evidenceWeight ≥ 100 is
// reserved for the official-recovery node — nobody can commit a
// "certain" exploit through the pipeline).
// =====================================================================

import { z } from "zod";
import type { UpdatePackValidation } from "./types.ts";

const stepSchema = z.object({
  kind: z.enum(["adb_cmd", "manual", "boot_mode", "flash", "verify"]),
  label: z.string().min(1),
  detail: z.string().min(1),
  command: z.string().min(1).optional(),
});

export const ExploitUpdateSchema = z.object({
  packVersion: z.literal(1),
  kind: z.literal("exploits"),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_]+$/, "lowercase snake id"),
        name: z.string().min(3),
        klass: z.enum(["adb_flags", "adb_packages", "setup_screen", "test_mode", "chipset_bootrom", "chipset_bootloader", "official"]),
        layer: z.enum(["app", "os", "server", "bootloader", "bootrom", "hardware"]),
        risk: z.enum(["none", "low", "medium", "high"]),
        persistence: z.enum(["none", "flags_only", "package_changes", "firmware_flash"]),
        evidenceWeight: z.number().int().min(0).max(100),
        fallbackTo: z.array(z.string()),
        steps: z.array(stepSchema).min(1),
        evidence: z.array(z.string()).min(1),
        benchmark: z.string().min(1),
      }),
    )
    .min(1),
}).superRefine((pack, ctx) => {
  const ids = new Set(pack.entries.map((e) => e.id));
  for (const e of pack.entries) {
    if (e.klass !== "official" && e.evidenceWeight >= 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `entry ${e.id}: evidenceWeight 100 is reserved for the official-recovery node (honesty invariant)`,
        path: ["entries", e.id],
      });
    }
    for (const f of e.fallbackTo) {
      if (!ids.has(f)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `entry ${e.id}: fallbackTo '${f}' does not exist in this pack`,
          path: ["entries", e.id],
        });
      }
    }
  }
});

export const UiFlowUpdateSchema = z.object({
  packVersion: z.literal(1),
  kind: z.literal("ui_flows"),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flows: z
    .array(
      z.object({
        brand: z.enum(["samsung", "google", "xiaomi", "oppo", "vivo", "transsion", "huawei", "motorola", "other"]),
        label: z.string().min(3),
        path: z.array(z.string()).min(2),
        samples: z.array(z.object({ dump: z.string().min(10), expected: z.string().min(2) })).min(1),
        note: z.string().min(3),
      }),
    )
    .min(1),
});

export const PatchUpdateSchema = z.object({
  packVersion: z.literal(1),
  kind: z.literal("patches"),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lanes: z
    .array(
      z.object({
        chipset: z.enum(["Exynos", "Qualcomm", "MediaTek", "Spreadtrum", "Kirin", "Unknown"]),
        lane: z.string().min(3),
        touches: z.array(z.string()).max(2, "minimal-touch law: at most 2 partitions"),
        commands: z
          .array(z.object({ line: z.string().min(1), write: z.boolean() }))
          .min(1),
        benchmark: z.string().min(1),
      }),
    )
    .min(1),
}).superRefine((pack, ctx) => {
  for (const l of pack.lanes) {
    if (l.commands.some((c) => c.write && /vbmeta/.test(c.line))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `lane ${l.lane}: vbmeta WRITE commands are forbidden (AVB physics — unsigned vbmeta changes are detected at boot)`,
        path: ["lanes", l.lane],
      });
    }
  }
});

/**
 * Validate an unknown update-pack payload by its `kind` discriminant.
 * Returns structured errors the UI/CI can render.
 */
export function validateUpdatePack(payload: unknown): UpdatePackValidation {
  if (typeof payload !== "object" || payload === null || !("kind" in payload)) {
    return { ok: false, kind: null, errors: ["Payload is not an object or has no `kind`."], summary: "Rejected: no kind." };
  }
  const kind = (payload as { kind?: unknown }).kind;
  if (kind === "exploits") {
    const r = ExploitUpdateSchema.safeParse(payload);
    return {
      ok: r.success,
      kind: "exploits",
      errors: r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      summary: r.success
        ? `Valid exploit pack — ${(payload as unknown as { entries: unknown[] }).entries.length} entries. Merge → run test:adaptive → ship.`
        : "Rejected by schema (see errors).",
    };
  }
  if (kind === "ui_flows") {
    const r = UiFlowUpdateSchema.safeParse(payload);
    return {
      ok: r.success,
      kind: "ui_flows",
      errors: r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      summary: r.success
        ? `Valid UI-flow pack — ${(payload as unknown as { flows: unknown[] }).flows.length} flows. Merge → run test:adaptive → ship.`
        : "Rejected by schema (see errors).",
    };
  }
  if (kind === "patches") {
    const r = PatchUpdateSchema.safeParse(payload);
    return {
      ok: r.success,
      kind: "patches",
      errors: r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      summary: r.success
        ? `Valid patch pack — ${(payload as unknown as { lanes: unknown[] }).lanes.length} lanes. Bench verification mandatory before merge.`
        : "Rejected by schema (see errors).",
    };
  }
  return { ok: false, kind: null, errors: [`Unknown kind '${String(kind)}' (exploits | ui_flows | patches).`], summary: "Rejected." };
}
