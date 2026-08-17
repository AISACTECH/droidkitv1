# Observed FRP Evidence Contract

`npm run benchmark` is the production benchmark. It reads only JSON records in
`docs/bench/observed/` and refuses to rank a product until a matrix cell has at
least three independent, authorized physical-device outcomes.

## Eligible evidence

- Physical owned donor or customer-authorized device.
- Exact tool version, model, chipset, Android version and security patch.
- Build fingerprint stored as SHA-256, not in plaintext.
- A fresh observation after a real reboot.
- Success only when the boot identity changed and the fresh FRP state is
  `Inactive`.
- Failure records are mandatory and count in the denominator.

## Ineligible evidence

Virtual donors, browser mocks, routing/evidence bands, source-code branches,
command acceptance, progress bars, external-tool checklists, synthetic agents,
vendor marketing claims and records without ownership authorization.

## Record shape

```json
{
  "schemaVersion": 1,
  "evidenceKind": "physical-device",
  "tool": "Paralock",
  "toolVersion": "1.1.0",
  "deviceId": "shop-anonymous-unit-id",
  "brand": "vendor",
  "model": "exact model code",
  "chipset": "exact chipset",
  "androidVersion": "15",
  "securityPatch": "YYYY-MM-DD",
  "buildFingerprintHash": "64 lowercase hex characters",
  "ownershipAttested": true,
  "donorOrCustomerAuthorized": true,
  "operationClass": "authorized-service-route",
  "result": "verified_after_reboot | failed_after_reboot | pending | refused",
  "bootChanged": true,
  "frpStateAfter": "Active | Inactive | Unknown",
  "observedAt": "ISO-8601 timestamp",
  "evidenceHash": "64 lowercase hex characters"
}
```

Do not commit serial numbers, IMEIs, account names, customer names, receipts,
photos or raw build fingerprints. The evidence hash identifies one independent
record and prevents duplicate submissions from increasing the denominator.
