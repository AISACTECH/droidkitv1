# 💻 Laptop/PC password — the counter card

0. **FIRST, the 2-minute save-the-drive check** (any admin session): run
   `manage-bde -status C:`. If it says Protection On → get the 48-digit
   BitLocker key from account.microsoft.com/devices/recoverykey BEFORE
   anything else. Skipping this = unreadable laptop.
1. **Email address on the sign-in screen?** = Microsoft account → only
   account.live.com/password/reset works (any browser). No local tool can.
2. **Plain username?** = local account → ascending routes:
   a. Another admin login works? → admin terminal → `net user` →
      `net user NAME *`
   b. "Reset password" link after one wrong try? → answer the 3 questions.
   c. Rescue USB day: build Hiren's BootCD PE (or Ubuntu live + chntpw) —
      exact steps + per-brand boot keys are in **Rescue Lab 🛠️ → PC Password**.
      Local accounts Win7–11: this route is deterministic.
3. **Just want the machine, don't need the account?** Lock screen →
   Shift+Restart → Troubleshoot → **Reset this PC** (keep-my-files path
   removes passwords, keeps documents).
4. **Work/school laptop?** Only their IT. It re-locks anyway (server-side).
5. Saved browser passwords of the old account die on outside edits —
   say it first (consent card).
