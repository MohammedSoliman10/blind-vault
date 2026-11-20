# Tasks: Blind Vault Tier 1 Core Arena

**Input**: Design documents from `specs/001-tier1-core-arena/`  
**Prerequisites**: [plan.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/plan.md), [spec.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/spec.md), [research.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/research.md), [data-model.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/data-model.md), [contracts/](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/contracts)  
**Host Toolchain**: `anchor-cli 1.1.2`, `solana-cli 3.1.10 (Agave)`, `rustc 1.99.0`, `node v24.20.0`, `npm 11.19.0` (Do not use `pnpm`).

---

## Phase 1: Setup & Compliance Scaffolding

**Goal**: Establish repository licensing, hackathon compliance tracking, Anchor 1.0 workspace, and Next.js 15 app structure.

- [X] T001 Create open-source MIT license file in `LICENSE`
- [X] T002 [P] Create repository `.gitignore` covering Rust target, Node modules, Next.js build, and `.env*.local` in `.gitignore`
- [X] T003 [P] Create `BUILD_LOG.md` establishing transparent separation of pre-hackathon work (Nov 20–26, 2026) from official hackathon weekend commits (Nov 27–28, 2026) in `BUILD_LOG.md`
- [X] T004 Initialize Anchor 1.0 workspace with program crate `programs/blind_vault` pinned to `anchor-lang = "1.1.2"` (matching verified `anchor-cli 1.1.2`) and `ephemeral-rollups-sdk = { version = "0.17.3", features = ["anchor", "access-control"] }` in `programs/blind_vault/Cargo.toml` and `Anchor.toml`, verifying `ephemeral-rollups-sdk` compatibility with `anchor-lang = "1.1.2"` via `cargo check` before proceeding to Phase 2
- [X] T005 [P] Initialize Next.js 15 App Router frontend using `npm` with Tailwind CSS and TypeScript in `package.json`, `tsconfig.json`, and `postcss.config.mjs`

### Phase 1 Verification Command
```bash
cargo --version && solana --version && anchor --version && node --version && npm --version && ls -la LICENSE .gitignore BUILD_LOG.md programs/blind_vault/Cargo.toml package.json
```

---

## Phase 2: Anchor Core & LiteSVM Exploit Proofs

**Goal**: Implement the complete on-chain smart contract with all 4 PDAs and 8 instructions, and prove every exploit rejection path using LiteSVM tests before Devnet deployment.

- [X] T006 [P] [US2] Define custom error codes (`VaultIsHalted`, `ExceedsMaxPositionCap`, `UnapprovedMint`, `DailyDrawdownHalted`, `InvalidTradeNonce`, `UnauthorizedDepositor`, `InsufficientShares`, `AclAccessDenied`) in `programs/blind_vault/src/errors.rs`
- [X] T007 [P] [US2] Implement state account structs (`VaultState`, `DepositorPosition`, `DemoSwapPool`, `SealedStrategy`) with exact byte sizes and deterministic PDA seeds in `programs/blind_vault/src/state.rs`
- [X] T008 [US1] [US2] Implement `initialize_vault`, `deposit`, and `withdraw` instructions with depositor-only ownership constraint (`has_one = owner`) in `programs/blind_vault/src/lib.rs`
- [X] T009 [US2] Implement MagicBlock PER delegation and enclave sealing instructions (`delegate_strategy`, `init_and_seal_strategy`, `undelegate_strategy`) using untyped account info and `CpiContext::new` with explicit `Pubkey` in `programs/blind_vault/src/lib.rs`
- [X] T010 [US4] Implement `evaluate_signal_private` instruction inside the enclave with `#[commit]` attribute to commit pending trade order and SHA-256 signal hash back to L1 in `programs/blind_vault/src/lib.rs`
- [X] T011 [US2] Implement `execute_bounded_trade` (L1 Risk Firewall enforcing 20% max trade cap, token allowlist, sequential nonce, and 24h rolling loss breaker) and `simulate_market_move` (deterministic -6% drawdown trigger) in `programs/blind_vault/src/lib.rs`
- [X] T012 [P] [US2] Build in-process LiteSVM test harness configuring clock manipulation, fee-payers, and demo mints in `tests/blind_vault.spec.ts`
- [X] T013 [US2] Implement LiteSVM test cases proving: (1) valid vault lifecycle, (2) Attack 1 unauthorized strategy peek rejection, (3) Attack 2 operator withdrawal rejection, (4) Attack 3 oversized swap (>20%) and unapproved token rejection, (5) Attack 4 -6% drawdown tripping `DailyDrawdownHalted`, and (6) Emergency Depositor Exit returning 100% of remaining funds during halt in `tests/blind_vault.spec.ts`

### Phase 2 Verification Command
```bash
cargo build-sbf && npm test
```

---

## Phase 3: Devnet Deploy, MagicBlock PER ACL Gate & Codama Client

**Goal**: Deploy the program to Solana Devnet, verify live Intel TDX PER connectivity and ACL gating from Cairo, and generate typed client bindings.

- [ ] T014 Build and deploy `blind_vault` to Solana Devnet using `anchor program deploy --provider.cluster devnet` and save deployed Program ID to `Anchor.toml`
- [ ] T015 Create live Devnet Day-1 connectivity script `scripts/gate-tee-connectivity.ts` verifying `verifyTeeRpcIntegrity("https://devnet-tee.magicblock.app")`, delegating `SealedStrategy` to validator `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`, and proving `getAccountInfo` succeeds with `authToken` and throws `Access Denied` without it in `scripts/gate-tee-connectivity.ts`
- [ ] T016 [P] Configure Codama IDL client generation targeting `@solana/kit` and output TypeScript bindings in `lib/solana/generated/index.ts` via `scripts/generate-client.ts`

### Phase 3 Verification Command
```bash
npx ts-node scripts/gate-tee-connectivity.ts
```

---

## Phase 4: Backend Relayer, Firecrawl/Gemini Signal & Supabase

**Goal**: Implement the serverless backend infrastructure for gasless guest transactions, news sentiment scoring, and real-time event logging.

- [ ] T017 [P] Create Supabase Postgres migration establishing `scraped_signals` (with 15-minute expiration) and `arena_events` tables with Realtime publication in `supabase/migrations/001_initial_schema.sql`
- [ ] T018 [US1] Implement `/api/sponsor-tx` route enforcing `blind_vault` Program ID allowlist, per-IP rate limiting (10 req/min), fee-payer co-signing via Devnet Sponsor Keypair, and initial 1,000 Demo-USDC airdrop in `app/api/sponsor-tx/route.ts`
- [ ] T019 [US4] Implement `/api/signal` route integrating 15-minute Supabase cache lookup, Firecrawl `/v1/scrape` in Markdown mode, Google AI Studio `gemini-3.8-flash` 0–100 catalyst scoring with Groq free-tier 429 fallback, and SHA-256 hash generation in `app/api/signal/route.ts`
- [ ] T020 [P] Implement `/api/keepalive` route executing a lightweight heartbeat query to prevent the free-tier Supabase database from entering the 7-day inactivity pause in `app/api/keepalive/route.ts`, create the lightweight API verification test script in `tests/api.spec.ts`, and wire the `"test:api"` script in `package.json`

### Phase 4 Verification Command
```bash
npm run test:api
```

---

## Phase 5: Unified Arena UI (Single-Page Security Terminal)

**Goal**: Assemble the single-page dark precision risk-console UI, integrating zero-wallet guest onboarding, X-Ray view, attack gauntlet, news trigger, and live proof tape.

- [ ] T021 [P] [US1] Implement browser ephemeral keypair generation (`generateKeyPairSigner()`) and `localStorage` session state management in `lib/solana/guest-wallet.ts`
- [ ] T022 [P] [US5] Implement Supabase Realtime client and WebSocket subscription handler for `arena_events` and live Presence in `lib/supabase/realtime.ts`
- [ ] T023 [US1] Build `Header.tsx` displaying the active Guest Session status badge (1,000 Demo USDC, Gas Sponsored) with an unobtrusive "Connect Wallet" button in `components/Header.tsx`
- [ ] T024 [US3] Build `XRayPanel.tsx` rendering the split-screen view: Private Enclave (Intel TDX sealed badge, "Peek Secret Strategy" trigger) vs. Public Vault (live balance, 20% cap, allowlist, 5% loss ceiling, Active/Halted pill) in `components/XRayPanel.tsx`
- [ ] T025 [US2] Build `AttackGauntlet.tsx` featuring 4 red attack buttons ("Peek Secret Strategy", "Operator Attempts Depositor Withdrawal", "Swap 90% Into Unapproved Token", "Crash Market -6% to Trip Loss Breaker") and the "Emergency Depositor Exit" recovery button in `components/AttackGauntlet.tsx`
- [ ] T026 [US4] Build `NewsTrigger.tsx` providing a news article URL input with 1-click sample URLs, catalyst score visualization (0–100 gauge), and trigger trade button in `components/NewsTrigger.tsx`
- [ ] T027 [US5] Build `ProofTape.tsx` docked at the bottom of the arena, displaying a streaming ledger of transactions with timestamps, badges, decoded error reasons, and clickable Solana Explorer (`?cluster=devnet`) links in `components/ProofTape.tsx`
- [ ] T028 Integrate components into the unified terminal layout in `app/page.tsx` and verify clean build via `npm run build`

### Phase 5 Verification Command
```bash
npm run build
```

---

## Phase 6: Verification & Hackathon Submission Polish

**Goal**: Conduct the final end-to-end judge walkthrough in a fresh browser session, produce submission assets, and finalize documentation.

- [ ] T029 Execute the 30-second judge walkthrough in a clean incognito window: boot guest session (`<10s`), fire attack gauntlet, trigger news signal, verify emergency exit, and confirm live explorer links on all transactions
- [ ] T030 Create comprehensive root `README.md` with product one-liner, architecture diagram, 3-minute video link placeholder, clickable Devnet explorer addresses, sponsor integration code-path table, and pre-build disclosure in `README.md`
- [ ] T031 Update `BUILD_LOG.md` recording all pre-hackathon scaffolding commits (Nov 20–26) and preparing clean weekend commit logs in `BUILD_LOG.md`

### Phase 6 Verification Command
```bash
git status --short && npm run lint && npm run test
```

---

## Dependencies & Execution Order

```
Phase 1: Setup & Compliance Scaffolding
   │
   ▼
Phase 2: Anchor Core & LiteSVM Exploit Proofs (BLOCKING GATE)
   │
   ▼
Phase 3: Devnet Deploy, MagicBlock PER ACL Gate & Codama Client
   │
   ▼
Phase 4: Backend Relayer, Firecrawl/Gemini Signal & Supabase
   │
   ▼
Phase 5: Unified Arena UI (Single-Page Security Terminal)
   │
   ▼
Phase 6: Verification & Hackathon Submission Polish
```

### Parallel Opportunities per Phase
- **Phase 1**: T002, T003, and T005 can execute in parallel after T001.
- **Phase 2**: T006, T007, and T012 can run in parallel; T008, T009, T010, T011 build incrementally into `lib.rs`; T013 verifies all together.
- **Phase 3**: T016 can run in parallel with T015 after T014 deployment.
- **Phase 4**: T017 and T020 can run in parallel with T018 and T019.
- **Phase 5**: T021 and T022 can run in parallel with component scaffolding (T023–T027).
