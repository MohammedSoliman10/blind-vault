# Feature Specification: Blind Vault Tier 1 Core Arena

**Feature Branch**: `001-tier1-core-arena`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "First check `/mnt/e/obsidian.md/SOLLY/Dev3pack Hackathon` for any extra product notes or constraints so nothing conflicts, then write the Tier 1 MVP product specification for Blind Vault."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Wallet Instant Guest Session (Priority: P1)

A new user visits the application for the first time and is immediately dropped into a fully interactive, funded session without any onboarding barrier. The session displays an active guest identity pre-loaded with demo trading funds and pre-configured network fee sponsorship, allowing immediate interaction with the protocol. An unobtrusive option to switch to an external personal wallet remains accessible at all times without interrupting the experience.

**Why this priority**: Eliminates the "wallet wall" and friction that drives 80%+ of hackathon judges and retail users away before experiencing the core product value. Establishes the foundational sandbox required for all downstream interactions.

**Independent Test**: Can be tested by opening the application in a clean, private browser window with zero wallet extensions installed and verifying that an active guest session with 1,000 Demo USDC and sponsored status is visible and interactive within 10 seconds.

**Acceptance Scenarios**:

1. **Given** a user with no browser wallet extension visits the app URL, **When** the page loads, **Then** an active Guest Session is automatically provisioned within 10 seconds showing a 1,000 Demo USDC balance and sponsored transaction status.
2. **Given** an active Guest Session, **When** the user inspects the header bar, **Then** an optional "Connect Wallet" button is visibly positioned adjacent to the Guest Session badge without blocking or obscuring any UI functions.
3. **Given** an existing Guest Session, **When** the user reloads the browser, **Then** the existing session identity and remaining demo balance persist seamlessly without requiring re-initialization.

---

### User Story 2 - "Try to Rug It" Adversarial Attack Gauntlet (Priority: P1)

A user tests the protocol's security claims by actively attempting four distinct malicious actions via high-visibility interactive attack buttons. Each attack executes a real adversarial on-chain attempt that the protocol rejects with a clear human-readable error reason, while proving that legitimate depositor capital remains fully recoverable even during an emergency shutdown.

**Why this priority**: Represents the core "wow moment" of the product ("One User, One Pain, One Moment"). Proves in under 30 seconds that secret trading logic cannot be stolen and operator rug-pulls are mathematically impossible on-chain.

**Independent Test**: Can be tested by clicking each of the four attack buttons in succession and verifying that every exploit triggers an on-chain rejection with decoded error feedback in under 10 seconds, and that emergency depositor withdrawal succeeds when the vault is halted.

**Acceptance Scenarios**:

1. **Given** an active vault, **When** the user triggers "Attack 1: Peek Secret Strategy", **Then** the hardware enclave rejects the unauthorized read and displays an Access Denied message while keeping secret threshold parameters hidden.
2. **Given** an active vault with depositor funds, **When** the user triggers "Attack 2: Operator Attempts Depositor Withdrawal", **Then** the protocol rejects the transaction on-chain because the caller is not the authenticated owner of the deposit position.
3. **Given** an active vault with a 20% max trade cap and target token allowlist, **When** the user triggers "Attack 3: Oversized / Unapproved Swap", **Then** the protocol rejects the transaction on-chain citing position cap violation and unapproved token violation.
4. **Given** an active vault with a 5% rolling daily loss limit, **When** the user triggers "Attack 4: Crash Market -6% to Trip Daily Loss Breaker", **Then** the pool drawdown triggers the circuit breaker, transitions the vault status to Halted, and blocks further trade executions.
5. **Given** a vault in Halted status, **When** the user clicks "Emergency Depositor Exit", **Then** 100% of the user's remaining deposit balance is returned immediately to their session wallet.

---

### User Story 3 - Public-vs-Enclave Transparency X-Ray (Priority: P2)

A depositor inspects the dual architecture of the vault through a side-by-side comparison panel. One side illustrates the private hardware enclave housing the proprietary strategy logic; the other side displays the public, immutably enforced risk limits and custody state.

**Why this priority**: Builds institutional and retail trust by clearly separating what is private (competitive edge/alpha) from what is public (risk guardrails, custody safety, TVL, and circuit breaker status).

**Independent Test**: Can be tested by inspecting the X-Ray panel on page load and verifying that all public risk parameters match the live on-chain configuration and that private enclave parameters remain concealed.

**Acceptance Scenarios**:

1. **Given** an initialized vault, **When** viewing the Public Vault Panel, **Then** the user sees live total vault value, a 20% single-trade position cap, an allowlisted target token list, a 5% rolling 24-hour loss threshold, and current status (Active vs. Halted).
2. **Given** the Private Enclave Panel, **When** the user views the strategy status, **Then** the panel confirms the strategy is hardware-sealed and conceals the underlying numeric trigger rules.
3. **Given** the Private Enclave Panel, **When** the user clicks "Peek Secret Strategy", **Then** an explicit unauthorized hardware inspection call is dispatched and reports back an access rejection.

---

### User Story 4 - Live News-to-Bounded-Trade Execution (Priority: P2)

A user provides a market news article URL (or selects a pre-configured sample URL) to trigger an automated trading evaluation. The system evaluates the article content, generates a sentiment catalyst score, evaluates it inside the private enclave against the secret strategy rules, and executes a risk-bounded trade that respects the public 20% position cap. The execution state is immediately broadcast to all active arena viewers.

**Why this priority**: Demonstrates the real-world utility of the vault beyond defense—proving that an automated, enclave-hosted trading strategy can evaluate external catalysts and execute safe, bounded trades without human intervention.

**Independent Test**: Can be tested by clicking a 1-click sample news URL, triggering evaluation, and verifying that a catalyst score is calculated, an enclave evaluation runs, a trade executing under the 20% cap completes, and the live status updates across the arena in real time.

**Acceptance Scenarios**:

1. **Given** an active vault and a valid news URL (or 1-click sample), **When** the user triggers the signal run, **Then** the system extracts article content and computes a 0–100 catalyst score.
2. **Given** a computed catalyst score, **When** evaluated against the sealed strategy inside the enclave, **Then** an order is generated without exposing the internal threshold calculation.
3. **Given** an approved enclave trade order, **When** the trade executes on-chain, **Then** the transaction size strictly adheres to the 20% maximum single-trade cap.
4. **Given** a completed trade, **When** finalized on-chain, **Then** all connected arena viewers receive real-time telemetry updates reflecting the updated vault balance and trade details.

---

### User Story 5 - Persistent Real-Time On-Chain Proof Tape (Priority: P3)

All user interactions, legitimate trades, and rejected attack attempts stream into a docked, real-time proof tape at the bottom of the arena. Each entry displays an exact timestamp, an action badge, a human-readable outcome or decoded on-chain error message, and a direct link to inspect the transaction on the public block explorer.

**Why this priority**: Provides undeniable, transparent cryptographic proof that the demonstration is running against live distributed ledger infrastructure rather than simulating results with client-side UI animations.

**Independent Test**: Can be tested by triggering any action (attack or trade) and verifying that a corresponding record appears in the proof tape within 2 seconds of completion with an active, valid public explorer link.

**Acceptance Scenarios**:

1. **Given** any executed attack attempt or trade, **When** the on-chain transaction completes or reverts, **Then** a new record is prepended to the docked proof tape within 2 seconds.
2. **Given** a blocked attack transaction, **When** viewed on the proof tape, **Then** the record displays the decoded protocol error reason (e.g., unauthorized signer, position cap exceeded, circuit breaker tripped) rather than an obscure hexadecimal error code.
3. **Given** any tape entry, **When** the user clicks the explorer link, **Then** the transaction opens in a new browser tab pointing to the public Devnet block explorer showing the matching transaction hash.

---

### Edge Cases

- **Session Continuity on Browser Refresh**: When a user refreshes the page or reopens the browser tab, the guest session credentials and local demo token balance MUST persist from local storage without generating duplicate accounts.
- **Relayer Rate-Limit or Gas Depletion**: If a burst of rapid attacks triggers the relayer's per-IP rate limit or if the relayer's gas reserves fall below transaction thresholds, the UI MUST display a clear explanatory toast notice rather than a silent failure or broken state.
- **Unreachable or Broken News URL**: If a user submits a malformed, unreachable, or heavily paywalled news article URL, the system MUST gracefully report an extraction failure and prompt the user to use the 1-click verified sample URL.
- **Test Market Liquidity Imbalance**: If successive demo trades alter the test AMM pool pricing significantly, the trade execution engine MUST calculate slippage bounds accurately and protect vault funds from unbounded execution loss.
- **Temporary Hardware Enclave Latency**: If the hardware enclave RPC endpoint experiences latency during signal evaluation, the UI MUST display an active "Evaluating Inside Hardware Enclave" spinner and timeout gracefully after 15 seconds if unacknowledged.
- **Attempted Trade While Vault is Halted**: If a user attempts to execute a trade while the vault circuit breaker is active (`is_halted = true`), the transaction MUST revert on-chain before token transfer, preserving all remaining assets for depositor withdrawal.

## Requirements *(mandatory)*

### Functional Requirements

#### Zero-Wallet Guest Provisioning
- **FR-001**: System MUST automatically generate an ephemeral guest identity upon initial application load if no active session exists.
- **FR-002**: System MUST credit each new guest session with 1,000 Demo USDC for interactive vault testing.
- **FR-003**: System MUST route all guest session transactions through an automated fee-payer relayer with zero cost to the user.
- **FR-004**: System MUST provide an optional, non-blocking wallet connection interface allowing users to connect their external personal browser wallet.

#### Dual Architecture X-Ray Panel
- **FR-005**: System MUST render a side-by-side X-Ray interface displaying the Private Enclave state and the Public Vault state concurrently.
- **FR-006**: System MUST hide all private strategy parameters (numeric buy/sell catalyst thresholds, signal weights) within the Private Enclave panel.
- **FR-007**: System MUST display live public vault parameters: current balance, 20% single-trade position cap, approved token allowlist, rolling 24-hour 5% loss breaker threshold, and Active/Halted operational status.

#### Adversarial Attack Gauntlet
- **FR-008**: System MUST provide four dedicated, interactive attack controls ("Attack 1: Peek Secret Strategy", "Attack 2: Operator Attempts Depositor Withdrawal", "Attack 3: Oversized / Unapproved Swap", "Attack 4: Crash Market -6% to Trip Daily Loss Breaker").
- **FR-009**: System MUST execute Attack 1 against the enclave access control layer and return an authenticated Access Denied error.
- **FR-010**: System MUST enforce on-chain that only the authenticated depositor owner of a deposit position can execute withdrawals, causing Attack 2 to revert on-chain.
- **FR-011**: System MUST enforce on-chain that trades exceeding 20% of vault funds or involving unapproved token mints revert immediately, causing Attack 3 to revert on-chain.
- **FR-012**: System MUST track rolling 24-hour net asset drawdown on-chain and automatically halt the vault when cumulative losses reach or exceed 5%, causing Attack 4 to transition vault status to Halted.
- **FR-013**: System MUST permit depositors to withdraw 100% of their proportional remaining assets via "Emergency Depositor Exit" regardless of whether the vault is Active or Halted.

#### News Catalyst Signal & Bounded Trade
- **FR-014**: System MUST allow users to submit a market news article URL or select a verified 1-click sample article.
- **FR-015**: System MUST extract article text and compute a standardized 0–100 catalyst sentiment score.
- **FR-016**: System MUST evaluate the catalyst score privately within the hardware enclave against the sealed thresholds and emit an execution order only when thresholds are satisfied.
- **FR-017**: System MUST validate that all enclave-generated trade orders respect the 20% single-trade position cap prior to on-chain execution.
- **FR-018**: System MUST broadcast real-time telemetry updates (vault balance, trade size, execution timestamp) to all connected arena viewers immediately following on-chain finalization.

#### Real-Time On-Chain Proof Tape
- **FR-019**: System MUST display a docked real-time proof tape at the bottom of the interface recording all transactions.
- **FR-020**: System MUST format every tape entry with an ISO timestamp, action category, success/failure indicator, decoded error reason for failed transactions, and a clickable public block explorer URL.
- **FR-021**: System MUST maintain the proof tape state across session actions without requiring page reloads.

#### Scope Boundaries & Exclusions (Tier 1 Enforced)
- **FR-022**: System MUST NOT include user registration forms, password authentication, or KYC/KYB identity collection.
- **FR-023**: System MUST NOT include multi-vault discovery marketplaces, competitive leaderboards, or historical charting packages in Tier 1.
- **FR-024**: System MUST NOT integrate fiat payment ramps, credit card processors, or subscription billing systems.
- **FR-025**: System MUST NOT require Tier 2 stretch dependencies (ERC-8004 registry badges, x402 payment walls, or native mobile wrappers) for core Tier 1 completion.

### Key Entities

- **Guest Session**: Represents an ephemeral, browser-generated cryptographic identity equipped with a public address, a 1,000 Demo USDC allocation, and session state persistence in browser storage.
- **Vault State**: Represents the on-chain custody record on Solana L1 storing total assets under management, the designated strategy operator address, hard risk caps (20% max trade cap, allowlisted token mints), the 24-hour loss tracker, and the operational status flag (`is_halted`).
- **Depositor Position**: Represents a depositor's cryptographic share balance locked within the vault, immutably bound to the depositor's public key as the sole authority permitted to withdraw principal or emergency funds.
- **Sealed Strategy**: Represents the private trading algorithm parameters (buy/sell catalyst score trigger levels, execution bounds) delegated to and isolated within a secure hardware enclave, inaccessible to external inspect calls.
- **Attack Attempt**: Represents an adversarial transaction fired by a user against the protocol, containing the targeted exploit type, transaction payload, submitted timestamp, resulting on-chain error code, and explorer transaction signature.
- **News Catalyst Event**: Represents an evaluated external market event, containing the source article URL, extracted key terms, computed 0–100 catalyst score, enclave evaluation decision, and associated trade execution hash.
- **Proof Tape Record**: Represents a structured ledger event containing the event identifier, timestamp, action title, status verdict (Success vs. Blocked), human-readable error rationale, and public block explorer deep link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Instant Onboarding**: New users reach a fully funded, interactive guest session in under 10 seconds from page launch.
- **SC-002**: **Core Moment Turnaround**: A first-time user can complete the end-to-end core moment (boot guest session, trigger an attack button, and view the on-chain rejection) in under 30 seconds total elapsed time.
- **SC-003**: **Adversarial Rejection Speed**: All four attack gauntlet transactions resolve on-chain and display decoded error feedback in under 10 seconds from button click.
- **SC-004**: **Absolute Exploit Rejection Rate**: 100% of simulated attacks (unauthorized strategy peeks, operator theft, oversized swaps, unapproved tokens) are rejected by the protocol.
- **SC-005**: **Guaranteed Depositor Recovery**: 100% of emergency depositor withdrawal requests succeed immediately when triggered on a halted vault, returning all remaining depositor funds.
- **SC-006**: **News-to-Trade Pipeline Latency**: The complete automated signal pipeline (URL ingestion, score generation, enclave evaluation, and on-chain swap) completes in under 15 seconds.
- **SC-007**: **Risk Cap Enforcement**: 100% of executed trades strictly remain at or below the 20% maximum single-trade position cap with zero exceptions.
- **SC-008**: **Real-Time Telemetry Synchronization**: Proof tape entries and vault state updates propagate to all open browser sessions within 2 seconds of on-chain confirmation.

## Assumptions

- **Target User Profile**: Retail crypto traders, DeFi participants, and hackathon judges testing the product on desktop or mobile web browsers.
- **Network Environment**: All on-chain transactions operate on Solana Devnet utilizing sponsored fee relaying for zero user gas cost.
- **Test Market Liquidity**: Market trades execute against a pre-deployed constant-product demo swap pool with initialized Devnet liquidity pairs.
- **Zero-Cost Constraint**: All backend components, AI scoring models, RPC endpoints, and hosting operate exclusively within free-tier, zero-credit-card developer offerings as governed by the project constitution.
- **Scope Phasing**: Advanced features including multi-vault management, ERC-8004 trust badges, x402 paywalls, and mobile app store builds are intentionally deferred to Tier 2 and do not gate Tier 1 delivery.
