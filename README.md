# Blind Vault (Solana Liquid Risk Engine)

> **A hedge fund you can verify, not see.**
> Private AI trading strategies running inside an Intel TDX confidential enclave, guarded by an immutable on-chain risk firewall on Solana L1.

---

### 🌐 Links & Deployments
- **Live Demo App:** [https://blind-vault-main.vercel.app](https://blind-vault-main.vercel.app) *(Deployment Link / Demo)*
- **Solana Devnet Program ID:** [`6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N`](https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet)
- **Program Deployment Transaction:** [`5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy`](https://explorer.solana.com/tx/5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy?cluster=devnet)
- **MagicBlock TEE Ephemeral Validator:** `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo` (`https://devnet-tee.magicblock.app`)
- **Sealed Strategy PDA:** `3JcaKPWwKaRbVYAY178bk42qfqrkKSY2aWu6Y9gwmwG2`
- **Intel TDX PER Permissioned Account:** [`AAQunvudNxbpcLUz2rbTuV3Z6Ga7PQbni3Q7n6xW275A`](https://explorer.solana.com/address/AAQunvudNxbpcLUz2rbTuV3Z6Ga7PQbni3Q7n6xW275A?cluster=devnet)

---

## 1. Problem Statement & Architecture

### The Dilemma
1. **Public On-Chain AI Funds Fail:** If trading strategies, signals, or model weights are deployed directly on public smart contracts, MEV bots and copy-traders frontrun and steal the alpha immediately.
2. **Off-Chain Hedge Funds Require Blind Trust:** If strategies are kept private off-chain, fund managers can rug, embezzle, or gamble depositor funds without bounds, leaving depositors with zero guarantees.

### The Solution: Confidential AI + Immutable L1 Firewall
Blind Vault decouples **alpha execution** from **custody & risk limits**:
- **Intel TDX Confidential Enclave (MagicBlock PER):** The proprietary AI strategy, model weights, and real-time catalyst signals remain completely confidential. Hardware-level memory encryption and remote attestation prevent anyone (even node operators) from inspecting strategy parameters.
- **Solana L1 Risk Firewall:** The Anchor program on Solana L1 holds the funds and enforces mathematical risk invariants. No matter what the off-chain or enclave AI decides, L1 will reject any trade that violates:
  - **Max single-position concentration caps** (e.g., max 20% allocation).
  - **Approved asset allowlists** (preventing rug-pull swaps into unapproved tokens).
  - **Drawdown circuit breakers** (freezing trading when drawdown thresholds are breached).
  - **Unconditional depositor emergency exit** (users can withdraw at any time directly on L1).

```mermaid
flowchart TD
    subgraph Depositors["User & Depositors"]
        User["Depositor Wallet"]
        Guest["Guest Onboarding / Faucet"]
    end

    subgraph ConfidentialEnclave["Confidential Compute (Intel TDX / MagicBlock TEE)"]
        Scraper["Market Catalyst Scraper (Firecrawl)"]
        LLM["AI Signal Reasoning (Gemini Flash / Qwen)"]
        SealedPDA["SealedStrategy PDA (Hardware Memory Encrypted)"]
        Attestation["Intel TDX Remote Attestation & Hardware ACL"]
    end

    subgraph SolanaL1["Solana L1 Main Contract (6pDC...DD5N)"]
        VaultState["VaultState PDA"]
        QuoteVault["Quote Token Vault (USDC)"]
        TargetVault["Target Token Vault"]
        Firewall{"L1 Risk Firewall Invariants"}
        AuditLog["Proof Ledger (On-Chain Audit Trail)"]
    end

    User -->|1. Deposit USDC / Mint Shares| QuoteVault
    Scraper -->|2. Scrape News & Catalysts| LLM
    LLM -->|3. Evaluate Signal & Generate Order| SealedPDA
    Attestation -->|Hardware ACL Protection (401 on Unauthorized Peek)| SealedPDA
    SealedPDA -->|4. Propose Bounded Trade + Signal Hash| Firewall
    Firewall -->|Check 1: Position Cap <= 20%| TargetVault
    Firewall -->|Check 2: Target Mint Allowlisted?| TargetVault
    Firewall -->|Check 3: Circuit Breaker Normal?| TargetVault
    Firewall -->|Check 4: Signal Hash Match| AuditLog
    User -->|Emergency Exit: withdraw (Direct L1 Call)| QuoteVault
```

---

## 2. Transparent "Before vs. During Hackathon" Disclosure

In accordance with hackathon submission guidelines, all pre-existing scaffolding versus code built during the hackathon session is documented below:

| Component | Status | Details |
| :--- | :--- | :--- |
| **Anchor Program Core (`programs/blind_vault`)** | Before | Initial program structure with 4 PDAs (`VaultState`, `DepositorPosition`, `SealedStrategy`, `quote_vault`), 8 instructions, and 8/8 LiteSVM unit tests. Deployed to Devnet at `6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N`. |
| **Frontend Framework Scaffolding** | Before | Next.js 15, TailwindCSS skeleton, initial UI layouts, and basic `@solana/wallet-adapter` provider. |
| **Real Devnet Transaction Pipeline** | **During** | Complete overhaul of `lib/solana/arena-actions.ts`: eliminated client-side mocks, connected Anchor IDL client, built real atomic Devnet transactions (Deposit, Withdraw, Bounded Trade, Emergency Exit) signed via gasless sponsor relayer. |
| **Live On-Chain Hydration** | **During** | Live RPC queries for `VaultState`, `DepositorPosition`, and token accounts. Dynamic NAV calculation and real-time USDC vs. Target Token allocation bars. |
| **Interactive Attack Lab (L1 Autopsy)** | **During** | Built live Devnet transaction simulation engine (`simulateTransaction`) to generate real Anchor error rollbacks (`ExceedsMaxPositionCap`, `UnauthorizedDepositor`, `DailyDrawdownHalted` / `VaultIsHalted`) with raw Solana validator logs. |
| **Prompt-Injected Rogue AI Probe** | **During** | Added adversarial test probe simulating a prompt-injected LLM attempting a 95% unapproved swap; proves automated rejection on Solana L1. |
| **Intel TDX Live Attestation & Proof API** | **During** | Integrated live MagicBlock TEE queries targeting `SealedStrategy` PDA; built `/api/tee-status` verifying Intel TDX hardware attestation and demonstrating hardware ACL 401 withholding without enclave credentials. |
| **Signal Scraping & Cryptographic Audit** | **During** | Implemented live Firecrawl scraping + Gemini Flash / Groq LLM scoring in `app/api/signal/route.ts` with on-chain SHA-256 hash matching and real-time Proof Ledger streaming with direct Solana Explorer links. |

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js 20+ (v22 or v24 recommended)
- Rust & Solana CLI (v1.18+ or v2.0+ for program builds)
- Anchor CLI (`0.30.1` or `1.1.2`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/MohammedSoliman10/blind-vault.git
cd blind-vault
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your keys:
```bash
cp .env.example .env.local
```
Key variables:
- `NEXT_PUBLIC_SOLANA_RPC_URL`: Solana Devnet RPC endpoint
- `NEXT_PUBLIC_PROGRAM_ID`: `6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N`
- `NEXT_PUBLIC_MAGICBLOCK_TEE_RPC_URL`: `https://devnet-tee.magicblock.app`
- `SPONSOR_KEYPAIR_SECRET`: Base58 private key for the guest relayer and demo USDC faucet
- `GEMINI_API_KEY`: Google AI Studio API key for market catalyst reasoning
- `GROQ_API_KEY`: Groq API key for failover catalyst scoring
- `FIRECRAWL_API_KEY`: Firecrawl API key for clean markdown news scraping

---

## 4. Verification Gates & Test Suite

Verify all aspects of the architecture using the built-in test harness:

```bash
# 1. Run LiteSVM On-Chain Exploit Proof Tests (8/8 passing)
npm test

# 2. Run API Routes & Endpoint Verification (Signal, Relayer, TEE status)
npm run test:api

# 3. Verify Live Intel TDX PER Attestation & Hardware ACL Gating
npm run gate:tee

# 4. Production Next.js Build Check
npm run build
```

---

## 5. Path to Mainnet Roadmap

Blind Vault is engineered from day one for institutional Solana deployment. The path from Devnet proof-of-concept to production Mainnet comprises:

1. **Jupiter v6 CPI Routing:**
   - Transition from the test DEX pool to live on-chain Jupiter DEX aggregator routing via Anchor CPIs.
   - Enforce maximum slippage and maximum position caps atomically inside the swap instruction.
2. **Decentralized Oracles (Pyth & Switchboard):**
   - Integrate Pyth Network real-time price feeds for high-fidelity mark-to-market NAV pricing.
   - Implement Switchboard on-demand price triggers to automate circuit breaker activations trustlessly.
3. **Permissionless Multi-Vault Factory:**
   - Deploy a factory contract allowing quantitative fund managers to spin up dedicated vaults with customizable risk bounds (drawdown tolerance, allowed mint lists, management fee tiers).
   - Provide managers with private Intel TDX / AMD SEV execution environments while investors retain L1 sovereign withdrawal rights.
4. **Institutional TEE Delegation:**
   - Support multi-enclave consensus across heterogeneous hardware (Intel TDX + AMD SEV-SNP) via MagicBlock Ephemeral Rollups to eliminate single-hardware dependency.

---

## 6. License
MIT License. Open-source for the Solana ecosystem.
