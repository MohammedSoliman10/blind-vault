# Blind Vault Constitution

## Core Principles

### I. Strict $0 / Zero-Card Policy
- **Zero Financial Barrier**: Every tool, API, service, and infrastructure dependency MUST be 100% free with zero credit card requirements and zero manual KYB verification.
- **Strictly Prohibited Services**: Developers and agents MUST NEVER use, integrate, or suggest Phala Cloud, Nito Confidential Compute, MoneyGram Ramps SDK, LI.FI Core/Composer, Helius Historical Accounts API, or paid OpenAI API endpoints.
- **Sanctioned Free Alternatives**: Use MagicBlock Private Ephemeral Rollup (PER) on Devnet (Intel TDX TEE), free public Devnet RPCs / standard free Helius tier, rule-based or free Gemini tier signals, Circle devnet USDC faucet, and free public Vercel/Supabase tiers.
- **Rationale**: Eliminates financial risk, third-party payment roadblocks, and regional card rejection hurdles, ensuring full development independence from Cairo or any restricted region.

### II. Solana-Only & Open-Source Integrity
- **Single-Chain Focus**: All on-chain program execution MUST run strictly on Solana Devnet (or Mainnet if zero cost permits). Non-Solana chains (e.g., EVM, L2s) are strictly prohibited and cause immediate hackathon disqualification.
- **Open-Source Compliance**: The repository MUST be MIT-licensed, maintain atomic-commit hygiene with clean git history, and enforce zero hardcoded private keys or secrets.
- **Hackathon Transparency**: Maintain a dedicated `BUILD_LOG.md` that strictly demarcates pre-hackathon scaffolding and research (Nov 20–26, 2026) from official hackathon weekend commits (Nov 27–28, 2026), complying fully with Dev3Pack eligibility and code-reuse rules.
- **Rationale**: Meets mandatory Dev3Pack hackathon judging rubrics, prevents intellectual property ambiguity, and maintains transparent provenance.

### III. Custody & Security Invariants (Solana L1 Anchor)
- **Delegation Boundary**: ONLY the `SealedStrategy` PDA MAY be delegated to MagicBlock Intel TDX Private Ephemeral Rollups (PER). `VaultState`, SPL token custody, and risk limits/caps MUST permanently reside on Solana L1.
- **Unconditional Depositor Exit Rights**: Depositor withdrawals MUST always remain open and executable by the depositor position owner, even when the vault is paused, emergency-halted, or breaker-tripped. No operator, strategist, or enclave failure may lock depositor funds.
- **Enclave Execution Verification**: L1 trade execution (`execute_bounded_trade`) MUST verify enclave-committed orders via Magic Actions and strictly authenticate injected escrow signers.
- **Relayer Safeguards**: The Devnet fee-payer relayer MUST enforce strict program-ID allowlisting and per-IP rate limits to prevent gas drainage and denial-of-service abuse.
- **Rationale**: Guarantees sovereign depositor custody, eliminates rug-pull vectors, and prevents enclave or relayer compromise from impacting underlying assets.

### IV. Demo & Scope Discipline ("No Wallet Wall Before the Wow")
- **Zero-Friction Onboarding**: The demo application MUST boot directly into a working zero-wallet Guest Session capable of executing real Devnet transactions in under 10 seconds without requiring Phantom, Solflare, or a manual faucet step.
- **Tiered Scope Enforcement**: Tier 1 Core (L1 vault, TEE sealed strategy, "Try to Rug It" arena, guest session, explorer proof tape) MUST be 100% completed, tested, and polished end-to-end before touching any Tier 2 stretch features (ERC-8004 Agent Registry badges, x402 monetization gates, or Seeker Connect).
- **Interactive Proof Gauntlet**: The user interface MUST feature an interactive "Try to Rug It" arena demonstrating real on-chain rejections (unauthorized operator withdraw, oversized swap, daily loss breaker) alongside live Solana Devnet Explorer proof links.
- **Demo Video Limit**: The final demo video MUST remain strictly under 3:00 minutes (target 2:30–2:45) showcasing real product workflows rather than slide pitch decks.
- **Rationale**: Hackathon judges evaluate working software and live UX; onboarding friction kills judge engagement within the first 30 seconds.

### V. Verification Discipline & Evidence-First Engineering
- **Grounding Before Mutation**: Always inspect crate versions, configuration files, and caller code before applying modifications; stay strictly within declared scope boundaries.
- **Negative Testing & Exploit Coverage**: Prove every smart contract exploit rejection path (unauthorized withdrawal, position cap breach, unallowed token mint, daily loss breach, replayed nonce) using LiteSVM test suites BEFORE deploying to Solana Devnet.
- **Unverifiable Claim Flagging**: Explicitly document and flag any unverified endpoint, simulated component (such as local AMM pools), or runtime assumption rather than assuming correctness.
- **Gravitas Compliance**: Never retry failed approaches without diagnostic adjustments; require passing post-mutation verification before claiming task completion.
- **Rationale**: Solana smart contracts and enclave delegation involve high-stakes state transitions; verification prevents regressions and proves exploit resistance.

### VI. Obsidian Knowledge Base Sync (`Dev3pack Hackathon` Memory)
- **Live Project Memory**: The user's Obsidian vault — specifically the `Dev3pack Hackathon` folder located at `/mnt/e/obsidian.md/SOLLY/Dev3pack Hackathon` — serves as the live architectural reference, decision log, and hackathon project memory.
- **Decision Gating**: Consult relevant notes inside `Dev3pack Hackathon` before making architectural, sponsor-integration, or submission decisions; surface useful details or conflicts back to the user proactively.
- **Knowledge Sync**: Keep key hackathon notes, architectural changes, and milestone decisions synchronized with the vault when requested. If access to the vault or folder is unavailable, stop and request the path or connection rather than hallucinating vault state.
- **Rationale**: Preserves continuous context, avoids duplicate research, prevents discarded decisions from resurfacing, and maintains seamless alignment between human strategy and agent execution.

## Technical Architecture & Operational Constraints

- **On-Chain Framework**: Solana Anchor (1.0.x / 0.32.x as pinned by dependencies).
- **Enclave SDK Pin**: Pin `ephemeral-rollups-sdk = { version = "0.17.3", features = ["anchor", "access-control"] }` to match the devnet TEE validator (`MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`) rather than unpinned 0.20 which targets devnet-us.
- **TEE Authentication**: Ingress requires `verifyTeeRpcIntegrity` followed by `getAuthToken` session acquisition.
- **Testing Runtime**: Fast local contract verification using LiteSVM for instant transaction simulation and exploit rejection asserts.
- **Frontend Stack**: Next.js / Tailwind CSS with guest keypair generation and sponsored transaction relayer (`/api/sponsor-tx`).

## Hackathon Quality Gates & Milestone Execution

1. **Gate 1 (Day-1 Connectivity)**: TEE RPC integrity verification, counter delegation cycle, and Magic Action verification from the Cairo workstation. If failed, trigger the FairSwap Arena fallback.
2. **Gate 2 (L1 Smart Contract & Exploits)**: Anchor program compilation, LiteSVM test suite green on all exploit vectors, Devnet deployment.
3. **Gate 3 (Relayer & Guest Wallet)**: Ephemeral guest keypair generator, gas sponsoring relayer with allowlist and rate limiting.
4. **Gate 4 (Interactive UI & Arena)**: "Try to Rug It" arena, enclave X-ray view, strategy builder, live proof tape.
5. **Gate 5 (Hardening & Submission)**: 20 incognito stress-runs, clean `BUILD_LOG.md`, MIT license, under-3-minute video recording, and dashboard submission.

## Governance

- **Constitution Supremacy**: This constitution supersedes all other informal practices, habits, or documentation. All code reviews, plans, and architectural decisions must comply with these core principles.
- **Amendment Procedure**: Any change to these principles requires updating `.specify/memory/constitution.md` with an updated version, ratification/amendment date, and explicit sync impact documentation.
- **Versioning Policy**:
  - **MAJOR**: Incompatible principle removals or security boundary relaxations.
  - **MINOR**: Addition of new principles, architecture constraints, or workflow quality gates.
  - **PATCH**: Clarifications, wording refinements, and typo fixes.
- **Compliance Gating**: Every implementation task must verify adherence to the $0 policy, L1 custody invariants, LiteSVM test requirements, and Obsidian knowledge base synchronization.

**Version**: 1.0.1 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
