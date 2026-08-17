# Security Policy

## Supported version

Only the latest tagged release is supported. Source snapshots and browser mock
mode are development artifacts, not signed production releases.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could cause unintended
device writes, cross-device targeting, command injection, unsafe partition
selection, authorization bypass, credential exposure or update/signing abuse.

Email the maintainer listed in `package.json` with:

- affected commit/version and host OS;
- the smallest safe reproduction using a donor or mock device;
- expected versus observed behavior;
- whether a write reached a physical device;
- suggested mitigation, if known.

Do not include customer identities, IMEIs, serial numbers, account credentials,
raw build fingerprints or device backups. Use hashes and anonymous donor IDs.

## Safety invariants

A security fix must preserve these invariants:

1. Mutating FRP/reset/Knox/fastboot operations require a Rust-issued, expiring,
   one-use permit bound to the exact serial, model and operation.
2. Read-only discovery never silently escalates to a write.
3. Only explicit FRP partition names may enter the fastboot erase command.
4. Command acceptance is not removal success. Reboot and a fresh state scan are
   required before a service record may be closed.
5. Knox Guard, lender/finance locks, attestation bypass and identity alteration
   are outside the supported product scope.
6. Browser mocks, virtual donors and simulations never enter production success
   rates.

## Release integrity

A release is production-labelled only after frontend tests, Rust tests, the
cross-platform native build matrix and installer-signing/notarization checks are
green. Unsigned validation artifacts must remain clearly marked as such.
