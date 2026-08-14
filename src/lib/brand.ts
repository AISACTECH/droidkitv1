// =====================================================================
// Paralock brand — single source for name, developer, contact.
// =====================================================================

export const BRAND = {
  name: "Paralock",
  slug: "paralock",
  tagline: "The free, honest Android + repair toolkit",
  developer: "Isaac Real",
  email: "isaacreal2026@gmail.com",
  publisher: "Isaac Real",
  version: "1.1.0",
  edition: "Isaac Real Edition",
  icon128: "/paralock-icon-128.png",
  icon: "/paralock-icon.png",
  wordmark: "/paralock-wordmark.png",
  repoUrl: "https://github.com/AISACTECH/droidkitv1",
  issuesUrl: "https://github.com/AISACTECH/droidkitv1/issues",
} as const

export const brandLine = `${BRAND.name} v${BRAND.version} · ${BRAND.developer}`
