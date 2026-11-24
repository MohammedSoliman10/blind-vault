# Blind Vault UI: Hermes-style redesign

Frontend only. Nothing in `lib/`, `programs/`, `tests/` or the API routes changed.

## Run it
    npm install --legacy-peer-deps      # adds @fontsource/ibm-plex-mono
    npm run dev

## Tokens (app/globals.css, tailwind.config.ts)
- Blue #2531FF (page), White #FFFFFF (text/paper), Onahau #BFF0FF (accent)
- Alert Red #C8102E: error / halted / breached only. Always a red fill with White text and a
  White hairline, or red text on White/Onahau. Never red text on Blue (1.5:1).
- Hairlines and secondary text are White at fixed opacities. Text never goes below 82% White.
- Headings Bluu Next, body Excon, labels/buttons/data IBM Plex Mono (Hermes uses a mono; the
  brand guide has none, so this is the one added face).
- Square corners everywhere (`borderRadius` is 0 except `rounded-full` for status dots).

## Components
- `ui/Button` (primary, accent, outline, danger, ink, ink-outline, ghost), `ui/Chip`,
  `ui/Panel`, `ui/Segmented`
- `ConnectWalletButton`: Uiverse button, markup verbatim; CSS is `.connect-wallet` in globals.css
- `Header` (top bar + nav), `PageHero`, `JudgeWalkthrough` (audit strip), `KpiStrip`,
  `TerminalBlock`, `SiteFooter`, `art/Plate` + `art/Band`
- `nav.ts` replaces `Sidebar.tsx` (NavView type + nav items)

## Artwork
Original, procedural banknote-style guilloche. Regenerate or tweak with:
    node scripts/generate-art.mjs
Output: `public/art/*.svg`. The `-sm` plates are thicker-line variants for compact heroes.

## Removed (replaced)
`Sidebar.tsx`, `ui/SpotlightCard`, `ui/FuzzyBullfrogButton`, `ui/GlowActionButton`,
`ui/GlassSegmentedRadio`. Unused files left untouched: `Aurora`, `BorderBeam`,
`SolanaBreakpointNode`, `XRayPanel`, `NewsTrigger`, `ProofTape`, `AttackGauntlet`.
