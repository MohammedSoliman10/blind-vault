# Blind Vault - Build Log

## Pre-Hackathon Scaffolding (Nov 20–26, 2026)
- Initialized repository architecture, constitution, and task specifications.
- Verified toolchain compatibility: Anchor 1.1.2, Solana CLI 3.1.10, Node 24.
- Established Anchor workspace and Next.js 15 scaffolding.
- Implemented Anchor 1.0 core program (`programs/blind_vault`) with 4 PDAs and 8 instructions.
- Verified 8/8 LiteSVM on-chain exploit proof tests (`tests/blind_vault.spec.ts`).
- Deployed `blind_vault` to Solana Devnet:
  - Program ID: [`6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N`](https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet)
  - Deploy Tx: [`5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy`](https://explorer.solana.com/tx/5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy?cluster=devnet)
- Verified live Intel TDX PER attestation and ACL gating on MagicBlock TEE (`https://devnet-tee.magicblock.app`, Validator `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`):
  - Hardware quote attestation verified (`verifyTeeRpcIntegrity`).
  - Account read access strictly gated via enclave hardware ACL (authorized with JWT authToken, denied/withheld without token or with outsider token).
- Generated typed `@solana/kit` TypeScript client in `lib/solana/generated/index.ts` via Codama (`scripts/generate-client.ts`).

## Official Weekend Commits (Nov 27–28, 2026)
- (Reserved for hackathon build session)
